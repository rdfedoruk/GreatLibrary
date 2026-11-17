---
type: story
status: Working
epic: "[[submitting-content]]"
blocked-by:
---

# Tag a submission

**What it is.** While submitting a link, pick tags from two fixed lists —
medium (Video / Article / Podcast) and module (ITSM, Flow Designer, and
so on) — to describe what the content is and covers.

**Why it matters.** Tags are how the library stays browsable instead of
becoming an undifferentiated pile of links. A controlled vocabulary keeps
tags consistent instead of splintering into near-duplicates.

## Acceptance criteria

- The medium options render as toggle chips (Video, Article, Podcast);
  clicking one selects it, clicking again deselects it.
- The module options are searched by typing — matching tags appear as
  suggestions, ranked so names starting with the typed text come first.
- Typing text that matches no existing tag shows "No matching tag — new
  tags are added by the admin." — there is no way to create a new tag from
  this screen.
- Pressing Enter in the module search field picks the top-ranked match
  without submitting the surrounding form.
- Selected module tags appear as chips with an × to remove them; there is
  no other way to remove one (Backspace in the search field does not).
- A submission can be saved with zero tags selected.
- Tags chosen here are attached to the submission and appear on its card
  in the list, medium tags before module tags.

## Notes

Tags come from a fixed seed list — 3 medium values and roughly 25 module
values — inserted by migration and read-only from the app's perspective.
Adding a submission and tagging it are two separate database writes, not
one transaction: if tagging fails after the submission succeeds, the
error is shown as "Submitted, but tagging failed: …" and the submission
is kept, untagged.

## Related

- [[submitting-content]]
- [[filter-the-list-by-tag]] — makes the tags applied here clickable, and
  is what stops this story's output from being decoration
