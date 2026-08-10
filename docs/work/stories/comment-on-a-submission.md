---
type: story
status: Not started
epic: "[[moderation-and-cleanup]]"
blocked-by:
---

# Comment on a submission

**What it is.** A signed-in person can leave a comment on a submission,
typed as one of comment, suggestion, or critique.

**Why it matters.** Without this, submissions are a one-way feed —
nothing lets people discuss, question, or add context to what's been
shared.

## Acceptance criteria

- *(Not yet true of the app.)* A signed-in person can write and post a
  comment on a submission, choosing a type: comment, suggestion, or
  critique.
- Posted comments appear under the submission, visible to everyone
  (comments are publicly readable), showing the author, type, and body.
- Attempting to post an empty or whitespace-only comment is rejected.
- Signed out, no way to post a comment is shown, consistent with every
  other write action in the app.

## Notes

The `comments` table, its `comment_type` enum, and public-read /
own-write row-level security policies have existed since the very first
migration and have not been touched since — there is no `comments`
feature folder under `src/features/` and no UI references this table at
all.

## Related

- [[moderation-and-cleanup]]
