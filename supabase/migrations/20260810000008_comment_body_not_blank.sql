-- ---------------------------------------------------------------------------
-- comments — reject blank bodies, and let authors edit and delete their own
-- ---------------------------------------------------------------------------

-- 1. The original check was `length(trim(body)) > 0`. Postgres `trim()` with
-- no arguments strips ONLY spaces, so a body of tabs or newlines passed the
-- check and landed as a row that renders as an empty comment.
--
-- `body ~ '\S'` requires at least one non-whitespace character, which covers
-- spaces, tabs, newlines, and carriage returns alike.

alter table public.comments
  drop constraint if exists comments_body_check;

alter table public.comments
  add constraint comments_body_not_blank check (body ~ '\S');

-- 2. An edit is visible as an edit. Null means never edited.

alter table public.comments
  add column edited_at timestamptz;

-- The client is not trusted to stamp edited_at — it would simply leave it
-- null and edit invisibly. The trigger also pins the fields an edit has no
-- business changing, so "edit my comment" can't become "move my comment onto
-- a different submission" or "reassign it to someone else". Body and
-- comment_type remain editable; those are the comment.
create function public.mark_comment_edited()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.edited_at := now();
  new.submission_id := old.submission_id;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger comments_mark_edited
  before update on public.comments
  for each row execute function public.mark_comment_edited();

-- 3. Own-row edit and delete, matching how votes already work. Reads stay
-- public and inserts stay own-row-only, both unchanged.

create policy "users can edit their own comments"
  on public.comments for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users can delete their own comments"
  on public.comments for delete
  using (auth.uid() = user_id);
