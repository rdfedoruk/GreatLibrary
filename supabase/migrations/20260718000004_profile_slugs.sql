-- Profile slugs (decided 2026-07-18): every profile gets a readable URL slug.
-- The permanent identity is the id; the slug is just the changeable name on
-- the door. Retired-slug forwarding (old slugs redirect after a rename) is
-- backlogged in docs/todo.md, not built here.

create function public.slugify(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(input), '[^a-z0-9]+', '-', 'g'))
$$;

-- Smallest free slug for a display name: "robert-fedoruk", then
-- "robert-fedoruk-2", "robert-fedoruk-3", ...
create function public.generate_profile_slug(name text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  base text := coalesce(nullif(public.slugify(name), ''), 'profile');
  candidate text := base;
  n int := 1;
begin
  while exists (select 1 from public.profiles where slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end;
$$;

alter table public.profiles add column slug text unique;

-- Backfill one row at a time so the dedupe suffix logic sees earlier rows.
do $$
declare
  p record;
begin
  for p in select id, display_name from public.profiles where slug is null
           order by created_at
  loop
    update public.profiles
      set slug = public.generate_profile_slug(p.display_name)
      where id = p.id;
  end loop;
end;
$$;

alter table public.profiles alter column slug set not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  name text := coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Member');
begin
  insert into public.profiles (id, display_name, linked_user_id, slug)
  values (new.id, name, new.id, public.generate_profile_slug(name));
  return new;
end;
$$;
