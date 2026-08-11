-- Attribution writes (2026-08-10) — story: attribute-a-profile-to-a-submission.
--
-- Since migration 3 the database has allowed a submitter to attribute their
-- own submission, but nothing in the app could reach it and two gaps made a
-- UI impossible:
--
--   1. Nobody could create a page for a creator who has never signed in.
--      profiles had no insert policy at all, so the only pages that existed
--      were the ones the signup trigger made. A "who made this?" picker would
--      have been picking from a list of members.
--   2. Attribution was insert-only. A mistyped credit was permanent.
--
-- Both are fixed here, deliberately narrowly.

-- ---------------------------------------------------------------------------
-- A display name has to say something
-- ---------------------------------------------------------------------------
-- Same shape as the comment-body rule in migration 8: whitespace is not a
-- name. Signup already can't produce a blank one, so no existing row moves.

alter table public.profiles
  add constraint display_name_not_blank
  check (length(btrim(display_name)) > 0);

-- ---------------------------------------------------------------------------
-- Members can create pages for people who have never signed in
-- ---------------------------------------------------------------------------
-- Narrow on purpose: person pages only, never attached to a login, never
-- born already-merged. Entity pages and merges stay hand edits, as
-- docs/current-state.md § Only possible by hand records.

create policy "members can create unclaimed person pages"
  on public.profiles for insert to authenticated
  with check (
    type = 'person'
    and linked_user_id is null
    and merged_into is null
  );

-- The slug has to be unique and is derived from the name, so the app must not
-- be the one inventing it — two people adding "Chuck Tomasi" seconds apart
-- would collide. This function does the derivation server-side. It is
-- security INVOKER, so the insert policy above still decides whether the row
-- is allowed; the function only spares the caller the slug arithmetic.

create function public.create_unclaimed_profile(p_display_name text)
returns public.profiles
language plpgsql
set search_path = ''
as $$
declare
  created public.profiles;
  name text := btrim(p_display_name);
begin
  insert into public.profiles (display_name, slug)
  values (name, public.generate_profile_slug(name))
  returning * into created;
  return created;
end;
$$;

-- ---------------------------------------------------------------------------
-- A submitter can take an attribution back off
-- ---------------------------------------------------------------------------
-- Mirrors the existing insert rule: whoever may add a credit to a submission
-- may remove one. Note this also lets a submitter remove a self-attribution
-- someone else added to their submission under the migration 6/7 rules —
-- acceptable while self-attribution has no way into the app at all, but it is
-- the thing to revisit when [[self-attribute-once-verified]] gets built.

create policy "submitters can remove attributions from their own submissions"
  on public.submission_attributions for delete
  using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id
        and s.submitted_by in
          (select id from public.profiles where linked_user_id = auth.uid())
    )
  );
