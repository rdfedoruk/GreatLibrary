-- Initial schema for The Great Library (Phase 1).
-- Source of truth for entity shapes: docs/data-model.md.
-- RLS here is a conservative baseline only — the full permission/moderation
-- model is a Phase 0 decision still owed (see docs/build-order.md). Default is
-- deny: anything without an explicit policy below is not allowed via the API.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.source_site as enum
  ('linkedin', 'youtube', 'sn_community', 'manual', 'generic');

create type public.tag_dimension as enum ('module', 'medium');

create type public.comment_type as enum ('comment', 'suggestion', 'critique');

-- Shared by claims and removal_requests (both route through the same
-- moderation queue per docs/data-model.md).
create type public.review_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- profiles — public mirror of auth.users (Supabase Auth owns the real record)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row on signup, taking the display name from Google.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Member')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- content_creators — who made the content, independent of membership
-- ---------------------------------------------------------------------------

create table public.content_creators (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  linked_user_id uuid references public.profiles (id) on delete set null,
  -- Matching keys (display names collide and change — never match on name alone)
  youtube_channel_id text unique,
  linkedin_profile_url text unique,
  sn_community_username text unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- submissions
-- ---------------------------------------------------------------------------

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  -- Canonical resolved URL; unique so the same content can't be submitted twice
  url text not null unique,
  description text not null check (length(trim(description)) > 0),
  source_site public.source_site not null,
  submitted_by uuid not null references public.profiles (id),
  content_creator_id uuid references public.content_creators (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tags — controlled vocabulary, two flat dimensions (module / medium)
-- ---------------------------------------------------------------------------

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  dimension public.tag_dimension not null,
  name text not null,
  unique (dimension, name)
);

create table public.submission_tags (
  submission_id uuid not null references public.submissions (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (submission_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- votes — upvote/downvote net score (decided 2026-07-17), one per user per submission
-- ---------------------------------------------------------------------------

create table public.votes (
  submission_id uuid not null references public.submissions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (submission_id, user_id)
);

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  comment_type public.comment_type not null default 'comment',
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- claims — a user's request to be linked to a content_creators record
-- ---------------------------------------------------------------------------

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_creator_id uuid not null references public.content_creators (id) on delete cascade,
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (user_id, content_creator_id)
);

-- ---------------------------------------------------------------------------
-- removal_requests — verified creators only, procedurally distinct from flags
-- ---------------------------------------------------------------------------

create table public.removal_requests (
  id uuid primary key default gen_random_uuid(),
  content_creator_id uuid not null references public.content_creators (id) on delete cascade,
  submission_id uuid not null references public.submissions (id) on delete cascade,
  status public.review_status not null default 'pending',
  reason text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security — conservative baseline
--
-- Reads are public (it's a public library). Writes: users may create their own
-- rows and manage their own votes. Everything else (editing/deleting
-- submissions and comments, tag management, moderation actions) is
-- deliberately NOT granted yet — those need the Phase 0 permission model.
-- The admin can act through the dashboard/secret key, which bypasses RLS.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.content_creators enable row level security;
alter table public.submissions enable row level security;
alter table public.tags enable row level security;
alter table public.submission_tags enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;
alter table public.claims enable row level security;
alter table public.removal_requests enable row level security;

-- Public reads
create policy "profiles are publicly readable"
  on public.profiles for select using (true);
create policy "content creators are publicly readable"
  on public.content_creators for select using (true);
create policy "submissions are publicly readable"
  on public.submissions for select using (true);
create policy "tags are publicly readable"
  on public.tags for select using (true);
create policy "submission tags are publicly readable"
  on public.submission_tags for select using (true);
create policy "votes are publicly readable"
  on public.votes for select using (true);
create policy "comments are publicly readable"
  on public.comments for select using (true);

-- Claims and removal requests are visible only to the person who filed them
create policy "users can view their own claims"
  on public.claims for select
  using (auth.uid() = user_id);
create policy "verified creators can view their own removal requests"
  on public.removal_requests for select
  using (
    exists (
      select 1 from public.content_creators cc
      where cc.id = content_creator_id and cc.linked_user_id = auth.uid()
    )
  );

-- Own-row writes
create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "authenticated users can create submissions as themselves"
  on public.submissions for insert
  with check (auth.uid() = submitted_by);

create policy "authenticated users can tag submissions"
  on public.submission_tags for insert
  with check (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.submitted_by = auth.uid()
    )
  );

create policy "users can cast their own votes"
  on public.votes for insert
  with check (auth.uid() = user_id);
create policy "users can change their own votes"
  on public.votes for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can retract their own votes"
  on public.votes for delete
  using (auth.uid() = user_id);

create policy "authenticated users can comment as themselves"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "users can file their own claims"
  on public.claims for insert
  with check (auth.uid() = user_id and status = 'pending');

create policy "verified creators can file removal requests"
  on public.removal_requests for insert
  with check (
    status = 'pending'
    and exists (
      select 1 from public.content_creators cc
      where cc.id = content_creator_id and cc.linked_user_id = auth.uid()
    )
  );
