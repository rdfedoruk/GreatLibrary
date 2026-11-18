-- Capabilities (2026-11-18): named things an account is allowed to do, granted
-- one account at a time. The first is deleting entries. Permission rules ask
-- "does this account hold capability X?" — never who the person is. Roles
-- (bundles of capabilities) come later, once there are enough to bundle; the
-- rules won't need to change when they do.
--
-- Granted to accounts, not profiles: accounts are what act on the site;
-- a profile may have no login behind it (docs/plan.md).
--
-- Additive: the live code before this lands simply doesn't offer deleting.

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

create table public.capabilities (
  name text primary key,
  description text not null
);

insert into public.capabilities (name, description) values
  ('delete_entries', 'Can delete entries, with their tags, credits, votes and comments');

create table public.capability_grants (
  user_id uuid not null references auth.users (id) on delete cascade,
  capability text not null references public.capabilities (name) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (user_id, capability)
);

-- ---------------------------------------------------------------------------
-- PERMISSIONS: anyone can read the list of capabilities; an account can see
-- only its own grants (so the site knows which buttons to show it). Nobody
-- grants through the site — grants are made directly in the database.
-- ---------------------------------------------------------------------------

alter table public.capabilities enable row level security;
alter table public.capability_grants enable row level security;

create policy "capabilities are publicly readable"
  on public.capabilities for select using (true);

create policy "accounts can see their own capabilities"
  on public.capability_grants for select to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on public.capabilities from anon, authenticated;
revoke insert, update, delete on public.capability_grants from anon, authenticated;

-- The one question every rule asks.
create function public.has_capability(wanted text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.capability_grants g
    where g.user_id = (select auth.uid()) and g.capability = wanted
  );
$$;

-- ---------------------------------------------------------------------------
-- PERMISSIONS: an account holding delete_entries can delete any entry. Its
-- tags, credits, votes and comments go with it (they already cascade). Its
-- thumbnail image is then unused, which the existing "remove unused
-- thumbnails" rule (migration 17) lets the site clean up.
-- ---------------------------------------------------------------------------

grant delete on public.submissions to authenticated;

create policy "accounts that can delete entries can delete any entry"
  on public.submissions for delete to authenticated
  using ((select public.has_capability('delete_entries')));
