-- Self-attribution (2026-07-18): a claimed profile owner can attribute
-- their own profile to any submission, not just ones they personally
-- submitted. This is what lets someone claim credit for content a
-- *different* member submitted about them — the actual point of separating
-- submitted_by from attribution. Consistent with the existing trust model
-- for submission_attributions (no proof required, works like tagging).

create policy "claimed profiles can attribute themselves to any submission"
  on public.submission_attributions for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.linked_user_id = auth.uid()
    )
  );
