-- Open curation (2026-11-17): the entry page becomes a place anyone signed in
-- can tidy up an entry, matching "everyone signed in is an admin for now"
-- (docs/plan.md). Two permissions widen; no tables or columns change.
--
-- Additive: the live code before this lands simply doesn't offer the edits.

-- ---------------------------------------------------------------------------
-- PERMISSIONS: any signed-in account can rename any entry.
-- ---------------------------------------------------------------------------
-- Only the title. Nobody could update an entry at all before this, and the
-- rest of the row (link, submitter, thumbnail details) stays fixed — so the
-- update right is granted for that one column rather than the whole row.
-- The existing title-or-description check still refuses a blank entry.

revoke update on public.submissions from anon, authenticated;
grant update (title) on public.submissions to authenticated;

create policy "signed-in accounts can retitle any entry"
  on public.submissions for update to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- PERMISSIONS: any signed-in account can credit, or uncredit, anyone on any
-- entry. Until now only the entry's submitter could.
-- ---------------------------------------------------------------------------
-- The older submitter-only rules stay; these sit alongside and are wider.
-- Narrow both when roles arrive.

create policy "signed-in accounts can credit any entry"
  on public.submission_attributions for insert to authenticated
  with check (true);

create policy "signed-in accounts can remove any credit"
  on public.submission_attributions for delete to authenticated
  using (true);
