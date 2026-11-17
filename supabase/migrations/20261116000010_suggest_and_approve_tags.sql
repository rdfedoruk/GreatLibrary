-- Tagging is replaced by the suggest-and-approve model proved out in the
-- ContentTagger proof of concept (docs/plan.md, decided 2026-11-16).
--
-- Before: a locked vocabulary in two "dimensions" (module, medium) that
-- nobody could change from the app, and you could tag only your own entry.
-- After:  anyone signed in can put a tag on any entry, and typing a name that
--         doesn't exist creates it as a *suggested* tag. Suggested tags are
--         approved, renamed, merged or deleted on the tags page.
--
-- PERMISSIONS, deliberately wide for now: every signed-in account can do
-- all of the above, including the admin actions. There is no roles layer
-- yet; when one arrives, the policies at the bottom of this file are the
-- ones to narrow.

-- ---------------------------------------------------------------------------
-- Type replaces dimension. Module stops being a kind of tag: module tags
-- become general ones, and the module tags nothing carries are removed.
-- ---------------------------------------------------------------------------
alter table public.tags add column type text;

update public.tags
set type = case when dimension = 'medium' then 'medium' else 'general' end;

delete from public.tags t
where t.dimension = 'module'
  and not exists (
    select 1 from public.submission_tags st where st.tag_id = t.id
  );

alter table public.tags
  alter column type set not null,
  alter column type set default 'general',
  add constraint tags_type_check
    check (type in ('general', 'version', 'medium'));

-- Takes unique (dimension, name) with it; names become unique across every
-- type below.
alter table public.tags drop column dimension;
drop type public.tag_dimension;

-- ---------------------------------------------------------------------------
-- Suggested or approved. Everything that already exists was put there
-- deliberately, so it starts out approved.
-- ---------------------------------------------------------------------------
alter table public.tags
  add column status text not null default 'suggested'
    constraint tags_status_check check (status in ('suggested', 'approved')),
  add column created_at timestamptz not null default now();

update public.tags set status = 'approved';

-- ---------------------------------------------------------------------------
-- Names: at most 40 characters, no stray spaces at the ends, and unique
-- whatever the capitals — "Flow designer" cannot sit beside "Flow Designer".
-- The casing someone typed is kept.
-- ---------------------------------------------------------------------------
alter table public.tags
  add constraint tags_name_check
    check (name = btrim(name) and char_length(name) between 1 and 40);

create unique index tags_name_unique on public.tags (lower(name));

-- ---------------------------------------------------------------------------
-- A suggestion nothing carries any more is not worth keeping — taking a
-- typo off the one entry that had it cleans the typo up.
-- ---------------------------------------------------------------------------
create function public.drop_unused_suggested_tag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.tags t
  where t.id = old.tag_id
    and t.status = 'suggested'
    and not exists (
      select 1 from public.submission_tags st where st.tag_id = t.id
    );
  return null;
end;
$$;

create trigger submission_tags_drop_unused_suggestion
  after delete on public.submission_tags
  for each row execute function public.drop_unused_suggested_tag();

-- ---------------------------------------------------------------------------
-- Merging: everything carrying one tag carries the other instead, and the
-- first tag is gone. One step, so an entry is never left carrying neither.
-- Runs with the caller's own permissions.
-- ---------------------------------------------------------------------------
create function public.merge_tag(p_from uuid, p_into uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_from = p_into then
    raise exception 'A tag cannot be merged into itself';
  end if;
  if not exists (select 1 from public.tags where id = p_into) then
    raise exception 'The tag to merge into does not exist';
  end if;

  insert into public.submission_tags (submission_id, tag_id)
  select st.submission_id, p_into
  from public.submission_tags st
  where st.tag_id = p_from
  on conflict do nothing;

  delete from public.tags where id = p_from;
end;
$$;

revoke execute on function public.merge_tag(uuid, uuid) from public, anon;
grant execute on function public.merge_tag(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- PERMISSIONS. Reading stays public. Every write below is open to any
-- signed-in account — see the note at the top of this file.
-- ---------------------------------------------------------------------------
drop policy "authenticated users can tag submissions" on public.submission_tags;

create policy "signed-in accounts can tag any submission"
  on public.submission_tags for insert to authenticated
  with check (true);

create policy "signed-in accounts can untag any submission"
  on public.submission_tags for delete to authenticated
  using (true);

create policy "signed-in accounts can add tags"
  on public.tags for insert to authenticated
  with check (true);

create policy "signed-in accounts can change tags"
  on public.tags for update to authenticated
  using (true) with check (true);

create policy "signed-in accounts can delete tags"
  on public.tags for delete to authenticated
  using (true);
