-- Published dates (2026-11-20): when an entry's content was published, and
-- when it was last updated where the source says so separately (GitHub's last
-- push, a blog's "modified" date). Worked out from the link when it is
-- submitted. Both are empty when the source doesn't say; nothing is guessed,
-- and created_at stays the date the entry was added to the library.
--
-- Additive: the live code before this lands ignores the new columns.
--
-- No new permissions. The submitter's existing insert right covers the new
-- columns; nobody can change them afterwards from the app.

alter table public.submissions
  add column published_on date,
  add column updated_on date;
