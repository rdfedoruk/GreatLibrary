-- Person or entity for a suggested profile (docs/plan.md, 2026-11-17), so a
-- show, company or blog typed in while crediting an entry can be marked as an
-- entity on the Profiles tab of Curation Bounties before it is approved.
--
-- Additive: no tables or columns change. Only suggested profiles, which are
-- never attached to a login, so an entity can never end up claimed.
-- Approved profiles keep whatever type they have; changing one is a hand edit.

create function public.set_suggested_profile_type(p_id uuid, p_type public.profile_type)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to change a profile';
  end if;
  update public.profiles set type = p_type
  where id = p_id and status = 'suggested' and linked_user_id is null;
  if not found then
    raise exception 'That profile is not waiting for approval';
  end if;
end;
$$;

revoke execute on function public.set_suggested_profile_type(uuid, public.profile_type) from public, anon;
grant execute on function public.set_suggested_profile_type(uuid, public.profile_type) to authenticated;
