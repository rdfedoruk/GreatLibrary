---
type: story
status: Working
epic: "[[attribution-and-verification]]"
blocked-by:
---

# Attribute a profile to a submission

**What it is.** A way to say "this submission's content was made by
{profile}" — separate from who submitted the link. This is what would
populate the empty "Content by" section on every profile page.

**Why it matters.** Submitting and creating are different things. Without
this, submitted-by is the only credit anyone can get, which means the
person who shares a link gets attributed instead of the person who made
the video or wrote the article.

## Acceptance criteria

- On a submission's own page, the submitter — and only the submitter —
  sees a "Who made this?" box. Another member and a signed-out visitor
  see nothing there.
- Typing a name that has no page yet offers to create one, and creating
  it credits it in the same step.
- Typing a name that *does* have a page offers that page, and does not
  offer to make a second one with the same name.
- A profile already credited on this submission is not offered again.
- The attributed profile(s) appear in the "by {name}" segment of the
  submission card (see [[view-the-submission-list]]) and in that
  profile's "Content by" section (see
  [[show-content-attributed-to-a-profile]]).
- A submission can have more than one attributed profile (the data model
  is many-to-many).
- A credit can be taken back off, and disappears from both places.

## Notes

Built 2026-08-10. The submitter's write was already allowed — "submitters
can attribute their own submissions" has been a live permission rule
since migration 3 — but nothing in `src/` called it, and two gaps made a
UI impossible until migration 9 closed them:

- **No page could be created for a creator who had never signed in.**
  `profiles` had no insert rule at all, so the only pages that existed
  were the ones signup made; a picker would have offered a list of
  members. Members can now create unclaimed *person* pages. Entity pages
  and merges stay hand edits.
- **Attribution was insert-only**, so a mistyped credit was permanent.

Slugs are generated server-side by `create_unclaimed_profile()`, so two
people adding the same name at once can't collide.

The separate case of a verified profile attributing *itself* to someone
else's submission is covered by [[self-attribute-once-verified]]. Worth
knowing when that gets built: the delete rule added here lets a submitter
remove *any* attribution on their own submission, including a
self-attribution someone else added.

## Related

- [[attribution-and-verification]]
