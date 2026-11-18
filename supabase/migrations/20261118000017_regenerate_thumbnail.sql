-- Regenerate a thumbnail (2026-11-18): on the curation page, anyone signed in
-- can replace an entry's thumbnail with a fresh card drawn from its current
-- title, and the old image is deleted. Matches "everyone signed in is an
-- admin for now" (docs/plan.md). No tables or columns change.
--
-- Additive: the live code before this lands simply doesn't offer it.

-- ---------------------------------------------------------------------------
-- PERMISSIONS: any signed-in account can change which thumbnail an entry
-- shows, and the notes on how it was made. Alongside the title (migration 15);
-- the link and submitter stay fixed. The existing "retitle any entry" policy
-- already lets any signed-in account update any row; the column grant is what
-- limits it.
-- ---------------------------------------------------------------------------
grant update (thumbnail_path, thumbnail_strategy, thumbnail_rubric, thumbnail_notes)
  on public.submissions to authenticated;

-- ---------------------------------------------------------------------------
-- PERMISSIONS: any signed-in account can delete a thumbnail image that no
-- entry is using, whoever added it. An image an entry still shows can't be
-- deleted by anyone — the entry has to be pointed at its new image first.
-- Sits alongside the older "remove their own" rule, which is now covered by
-- this one for unused images.
-- ---------------------------------------------------------------------------
create policy "signed-in accounts can remove unused thumbnails"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'thumbnails'
    and not exists (
      select 1 from public.submissions s where s.thumbnail_path = storage.objects.name
    )
  );

-- Deleting means finding the file first.
create policy "signed-in accounts can look up unused thumbnails"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'thumbnails'
    and not exists (
      select 1 from public.submissions s where s.thumbnail_path = storage.objects.name
    )
  );
