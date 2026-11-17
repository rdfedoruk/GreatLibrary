-- Suggested profiles (docs/plan.md, 2026-11-17).
--
-- Before: typing a new name while crediting an entry made a real profile
--         straight away.
-- After:  it makes a *suggested* profile. Someone approves it, merges it
--         into an existing profile, or deletes it, from the Profiles tab of
--         Curation Bounties. Same shape as suggested tags (migration 10).
--
-- Profiles made by signing up are approved from the start: nobody needs to
-- vouch for a person signing up as themselves.
--
-- PERMISSIONS, deliberately wide for now: every signed-in account can
-- approve, merge and delete suggested profiles, as with tags. Approved
-- profiles cannot be deleted or merged from the app at all.

-- ---------------------------------------------------------------------------
-- Suggested or approved. Everything that exists already starts approved.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column status text not null default 'suggested'
    constraint profiles_status_check check (status in ('suggested', 'approved'));

update public.profiles set status = 'approved';

-- Signing up makes an approved profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  name text := coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Member');
begin
  insert into public.profiles (id, display_name, linked_user_id, slug, status)
  values (new.id, name, new.id, public.generate_profile_slug(name), 'approved');
  return new;
end;
$$;

-- A name typed in by a member can only ever start out suggested.
drop policy "members can create unclaimed person pages" on public.profiles;

create policy "members can suggest unclaimed person pages"
  on public.profiles for insert to authenticated
  with check (
    type = 'person'
    and linked_user_id is null
    and merged_into is null
    and status = 'suggested'
  );

-- A member editing their own profile must not be able to change its status.
drop policy "users can update their own profile" on public.profiles;

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = linked_user_id)
  with check (auth.uid() = linked_user_id and status = 'approved');

-- ---------------------------------------------------------------------------
-- A suggestion nothing credits any more is not worth keeping — taking a
-- mistyped name off the one entry that had it cleans it up.
-- ---------------------------------------------------------------------------
create function public.drop_uncredited_suggested_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.profiles p
  where p.id = old.profile_id
    and p.status = 'suggested'
    and not exists (
      select 1 from public.submission_attributions sa where sa.profile_id = p.id
    );
  return null;
end;
$$;

create trigger submission_attributions_drop_uncredited_suggestion
  after delete on public.submission_attributions
  for each row execute function public.drop_uncredited_suggested_profile();

-- ---------------------------------------------------------------------------
-- Approve, merge, delete. Each acts only on a suggested profile. They run
-- with full rights because crediting rules (submitter only) would otherwise
-- stop a merge moving someone else's credits; the checks inside are the
-- whole of the permission.
-- ---------------------------------------------------------------------------
create function public.approve_profile(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to approve a profile';
  end if;
  update public.profiles set status = 'approved'
  where id = p_id and status = 'suggested';
  if not found then
    raise exception 'That profile is not waiting for approval';
  end if;
end;
$$;

create function public.merge_profile(p_from uuid, p_into uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to merge a profile';
  end if;
  if p_from = p_into then
    raise exception 'A profile cannot be merged into itself';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_from and status = 'suggested'
  ) then
    raise exception 'Only a profile waiting for approval can be merged';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = p_into and status = 'approved' and merged_into is null
  ) then
    raise exception 'The profile to merge into does not exist';
  end if;

  insert into public.submission_attributions (submission_id, profile_id)
  select sa.submission_id, p_into
  from public.submission_attributions sa
  where sa.profile_id = p_from
  on conflict do nothing;

  -- Its own credits go with it.
  delete from public.profiles where id = p_from;
end;
$$;

create function public.delete_suggested_profile(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to delete a profile';
  end if;
  delete from public.profiles where id = p_id and status = 'suggested';
  if not found then
    raise exception 'That profile is not waiting for approval';
  end if;
end;
$$;

revoke execute on function public.approve_profile(uuid) from public, anon;
revoke execute on function public.merge_profile(uuid, uuid) from public, anon;
revoke execute on function public.delete_suggested_profile(uuid) from public, anon;
grant execute on function public.approve_profile(uuid) to authenticated;
grant execute on function public.merge_profile(uuid, uuid) to authenticated;
grant execute on function public.delete_suggested_profile(uuid) to authenticated;
