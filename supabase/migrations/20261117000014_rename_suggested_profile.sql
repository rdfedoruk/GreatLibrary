-- Renaming a suggested profile (docs/plan.md, 2026-11-17), so a typo can be
-- fixed on the Profiles tab of Curation Bounties rather than only deleted or
-- merged. Approved profiles cannot be renamed this way.
--
-- The web address (slug) follows the new name. Nobody should be linking to
-- a profile that isn't approved yet, so nothing is kept for the old one.

create function public.rename_suggested_profile(p_id uuid, p_display_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  name text := btrim(p_display_name);
  current_name text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to rename a profile';
  end if;

  select display_name into current_name
  from public.profiles where id = p_id and status = 'suggested';
  if not found then
    raise exception 'That profile is not waiting for approval';
  end if;

  update public.profiles
  set display_name = name,
      -- Only a different address if the name makes one: "chuck tomasi" to
      -- "Chuck Tomasi" keeps it, rather than becoming chuck-tomasi-2.
      slug = case
        when public.slugify(name) = public.slugify(current_name) then slug
        else public.generate_profile_slug(name)
      end
  where id = p_id;
end;
$$;

revoke execute on function public.rename_suggested_profile(uuid, text) from public, anon;
grant execute on function public.rename_suggested_profile(uuid, text) to authenticated;
