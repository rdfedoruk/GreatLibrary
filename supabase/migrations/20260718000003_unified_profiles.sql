-- Unified Profiles (decided 2026-07-18) — see docs/data-model.md § The
-- Identity Model and docs/decisions-log.md § Unified Profiles.
--
-- One profiles table for every public identity (person or entity, claimed or
-- not) replaces the profiles + content_creators split. The old creator tables
-- (content_creators, claims, removal_requests) were empty in production, so
-- they are dropped and rebuilt rather than migrated.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.profile_type as enum ('person', 'entity');

create type public.removal_path as enum ('verified_self', 'open_request');

-- ---------------------------------------------------------------------------
-- profiles — from "public mirror of auth.users" to standalone public identity
-- ---------------------------------------------------------------------------

-- A profile can now exist before (or without) any auth user: id becomes its
-- own uuid rather than a borrowed auth.users id. Signup-created profiles keep
-- id = auth uid via the trigger below, so existing app code and RLS that
-- compare auth.uid() to submitted_by/user_id keep working; pre-created
-- attribution pages get random ids.
alter table public.profiles drop constraint profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();

alter table public.profiles
  add column type public.profile_type not null default 'person',
  add column linked_user_id uuid unique references auth.users (id) on delete set null,
  add column merged_into uuid references public.profiles (id);

-- Entities never log in — permanently.
alter table public.profiles
  add constraint entities_never_log_in
  check (type = 'person' or linked_user_id is null);

-- Existing rows were all signup-created mirrors of auth users.
update public.profiles set linked_user_id = id;

-- Signup now records the auth link explicitly.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, linked_user_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Member'),
    new.id
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Drop the old creator-model tables (all empty in production)
-- ---------------------------------------------------------------------------

drop table public.claims;
drop table public.removal_requests;
alter table public.submissions drop column content_creator_id;
drop table public.content_creators;

-- ---------------------------------------------------------------------------
-- profile_identities — how we know which platform accounts belong to a profile
-- ---------------------------------------------------------------------------

create table public.profile_identities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  -- Open-ended (youtube / linkedin / sn_community / podcast / website / ...):
  -- new platforms are new rows, never schema changes.
  platform text not null check (length(trim(platform)) > 0),
  identity_value text not null check (length(trim(identity_value)) > 0),
  created_at timestamptz not null default now(),
  -- The matching key — one platform identity belongs to exactly one profile.
  unique (platform, identity_value)
);

-- ---------------------------------------------------------------------------
-- entity_members — claimed people act for entities, which never log in
-- ---------------------------------------------------------------------------

create table public.entity_members (
  entity_id uuid not null references public.profiles (id) on delete cascade,
  person_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entity_id, person_id)
);

-- FKs can't express "entity_id must point at type = entity"; a trigger can.
create function public.enforce_entity_member_types()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select type from public.profiles where id = new.entity_id) <> 'entity' then
    raise exception 'entity_id must reference a profile of type entity';
  end if;
  if (select type from public.profiles where id = new.person_id) <> 'person' then
    raise exception 'person_id must reference a profile of type person';
  end if;
  return new;
end;
$$;

create trigger entity_member_types_check
  before insert or update on public.entity_members
  for each row execute function public.enforce_entity_member_types();

-- ---------------------------------------------------------------------------
-- submission_attributions — who made a submission's content (many-to-many)
-- ---------------------------------------------------------------------------

create table public.submission_attributions (
  submission_id uuid not null references public.submissions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (submission_id, profile_id)
);

-- ---------------------------------------------------------------------------
-- claims — a person's request to attach their login to an existing page
-- ---------------------------------------------------------------------------

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (user_id, profile_id)
);

-- Claiming is person-only.
create function public.enforce_claim_target_is_person()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select type from public.profiles where id = new.profile_id) <> 'person' then
    raise exception 'only person profiles can be claimed';
  end if;
  return new;
end;
$$;

create trigger claim_target_is_person_check
  before insert or update on public.claims
  for each row execute function public.enforce_claim_target_is_person();

-- ---------------------------------------------------------------------------
-- removal_requests — verified self-removal + open takedown requests
-- ---------------------------------------------------------------------------

create table public.removal_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  submission_id uuid not null references public.submissions (id) on delete cascade,
  path public.removal_path not null,
  requested_by_user_id uuid references auth.users (id) on delete set null,
  status public.review_status not null default 'pending',
  -- No other basis to evaluate an open request on.
  reason text,
  created_at timestamptz not null default now(),
  constraint open_requests_need_a_reason
    check (path = 'verified_self' or length(trim(coalesce(reason, ''))) > 0)
);

-- ---------------------------------------------------------------------------
-- Row Level Security — same conservative baseline as the initial schema:
-- public reads, own-row writes, everything else waits for the permission model.
-- ---------------------------------------------------------------------------

alter table public.profile_identities enable row level security;
alter table public.entity_members enable row level security;
alter table public.submission_attributions enable row level security;
alter table public.claims enable row level security;
alter table public.removal_requests enable row level security;

create policy "profile identities are publicly readable"
  on public.profile_identities for select using (true);
create policy "entity members are publicly readable"
  on public.entity_members for select using (true);
create policy "submission attributions are publicly readable"
  on public.submission_attributions for select using (true);

-- Profile self-edit now keys off the auth link, not id.
drop policy "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = linked_user_id) with check (auth.uid() = linked_user_id);

-- Submitters attribute their own submissions (same pattern as tagging).
create policy "submitters can attribute their own submissions"
  on public.submission_attributions for insert
  with check (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id
        and s.submitted_by in
          (select id from public.profiles where linked_user_id = auth.uid())
    )
  );

create policy "users can view their own claims"
  on public.claims for select
  using (auth.uid() = user_id);
create policy "users can file their own claims"
  on public.claims for insert
  with check (auth.uid() = user_id and status = 'pending');

create policy "users can view removal requests they filed"
  on public.removal_requests for select
  using (auth.uid() = requested_by_user_id);

-- Verified self-removal: the claimed person, or a claimed member of the
-- entity, files for content attributed to that profile.
create policy "linked people can file verified self-removals"
  on public.removal_requests for insert
  with check (
    path = 'verified_self'
    and status = 'pending'
    and auth.uid() = requested_by_user_id
    and (
      exists (
        select 1 from public.profiles p
        where p.id = profile_id and p.linked_user_id = auth.uid()
      )
      or exists (
        select 1
        from public.entity_members em
        join public.profiles member on member.id = em.person_id
        where em.entity_id = profile_id and member.linked_user_id = auth.uid()
      )
    )
  );

-- No insert policy yet for path = 'open_request': whether filing one requires
-- a logged-in account or allows anonymous is an open decision
-- (docs/todo.md § Authors). Don't add one without that decision.
