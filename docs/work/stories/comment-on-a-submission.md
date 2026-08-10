---
type: story
status: Working
epic: "[[moderation-and-cleanup]]"
blocked-by:
---

# Comment on a submission

**What it is.** A signed-in person can leave a comment on a submission,
typed as one of comment, suggestion, or critique, and can edit or delete
their own comments afterwards.

**Why it matters.** Without this, submissions are a one-way feed —
nothing lets people discuss, question, or add context to what's been
shared.

## Acceptance criteria

**Reading**

- Every entry in the library feed carries a **Discuss (n)** button
  showing how many comments it has.
- Clicking Discuss opens a page dedicated to that piece of content,
  with the entry at the top and the discussion beneath it.
- The entry's title still goes to the content itself, not to the
  discussion — the two are separate destinations.
- Comments are visible to everyone, signed in or not, showing the
  author, the type, and the body, oldest first.
- A submission with no comments says so rather than showing an empty
  space.
- A discussion page for a submission that doesn't exist says so and
  offers a way back to the library, rather than erroring.

**Posting**

- A signed-in person can write and post a comment on a submission,
  choosing a type: comment, suggestion, or critique.
- A posted comment appears in the thread straight away and the count
  goes up by one.
- Attempting to post an empty or whitespace-only comment is rejected —
  including one made only of spaces, tabs, or blank lines.
- Signed out, no way to post a comment is shown, consistent with every
  other write action in the app.

**Editing**

- The author of a comment can change its text and its type.
- A comment that has been edited is marked as edited.
- An edit that would leave the body empty or whitespace-only is
  rejected, and the original comment is left as it was.
- Edit and delete controls appear only on your own comments.

**Deleting**

- The author of a comment can delete it; it disappears from the thread
  and the count goes down by one.
- Deleting asks for confirmation first.
- A failed edit or delete shows a plain message and leaves the comment
  on screen, rather than a broken thread.

## Notes

Each submission has its own page at `/submission/<id>`, reached by the
Discuss button — decided 2026-08-10. Threads expanding inline on the
card was tried first and rejected: an entry's title leaves for the
content itself, so there was no obvious way in to the discussion, and a
small toggle on a card isn't something you'd find.

The address uses the submission's raw id, so it looks like
`/submission/8a750c6d-…` rather than something readable. Giving
submissions a slug the way profiles have one is a schema change; worth
doing if these links ever get shared in public.

The `comments` table, its `comment_type` enum, and public-read /
own-write row-level security policies have existed since the very first
migration. Migration `20260810000008` added the rest: it replaced the
blank-body check (the original used `trim()`, which in Postgres strips
only spaces, so a comment of tabs or newlines got through), added an
`edited_at` column, and added own-row edit and delete policies.

Two rules worth knowing are enforced by the database rather than the
screen, so they can't be checked by using the site:

- `edited_at` is stamped by a trigger, not sent by the browser — an
  edit cannot pretend not to be one.
- The same trigger pins `submission_id`, `user_id`, and `created_at`,
  so an edit cannot quietly move a comment onto a different submission
  or reassign it to someone else.

Both are covered in `tests/db/comments.test.ts`.

Deliberately not built: threaded replies, and any way for anyone other
than the author to edit or remove a comment. Moderator removal is
[[file-an-open-takedown-request]]'s problem, not this one.

## Related

- [[moderation-and-cleanup]]
