-- Every entry gets a title and a thumbnail, worked out from its link when it
-- is submitted (the Thumbnailer rules, docs/plan.md).
--
-- Additive: the code that is live before this lands ignores the new columns.

-- ---------------------------------------------------------------------------
-- submissions: title, and where its thumbnail is kept.
-- The three thumbnail_* text columns record how the picture was chosen, so a
-- bad result can be traced back to the rule that produced it.
-- ---------------------------------------------------------------------------
alter table public.submissions
  add column title text,
  add column thumbnail_path text,
  add column thumbnail_strategy text,
  add column thumbnail_rubric text,
  add column thumbnail_notes text;

-- A description used to be required because it was all an entry had. Now the
-- title carries that job, so the description becomes optional — but an entry
-- must still be called *something*.
alter table public.submissions
  drop constraint submissions_description_check,
  alter column description set default '',
  add constraint submissions_title_or_description_check
    check (
      length(trim(coalesce(title, ''))) > 0
      or length(trim(description)) > 0
    );

-- ---------------------------------------------------------------------------
-- Where the thumbnail images live. Anyone can view them; a file must be an
-- image and at most 5 MB.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'thumbnails',
  'thumbnails',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
);

-- PERMISSIONS: any signed-in account can add a thumbnail image, and can
-- remove one it added itself (used to tidy up when a submit fails half-way).
-- Nobody can replace an image in place.
create policy "signed-in accounts can add thumbnails"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'thumbnails');

create policy "signed-in accounts can remove their own thumbnails"
  on storage.objects for delete to authenticated
  using (bucket_id = 'thumbnails' and owner_id = (select auth.uid())::text);

-- Removing a file means finding it first, so an account must be able to look
-- up the files it added. (Viewing an image by its address needs no rule —
-- the bucket is public.)
create policy "signed-in accounts can look up their own thumbnails"
  on storage.objects for select to authenticated
  using (bucket_id = 'thumbnails' and owner_id = (select auth.uid())::text);
