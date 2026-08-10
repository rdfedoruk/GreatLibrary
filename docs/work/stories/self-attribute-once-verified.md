---
type: story
status: Not started
epic: "[[attribution-and-verification]]"
blocked-by: "[[verify-a-youtube-channel]]"
---

# Self-attribute once verified

**What it is.** Once a profile holds at least one verified identity, its
owner can attribute themselves to a submission someone *else* made —
claiming credit for content a different member submitted about them,
rather than only content they personally submitted.

**Why it matters.** This is the actual reason attribution and submission
are separate concepts: someone else might submit a video of yours before
you ever see it, and you should still be able to claim it as yours once
you're verified.

## Acceptance criteria

- *(Not yet true of the app.)* A profile with at least one verified
  identity can attribute itself to any submission, not just ones it
  personally submitted.
- A profile with no verified identity cannot do this — attempting it is
  refused, matching the database rule already in place.
- Once self-attributed, the submission shows this profile in its "by"
  list (see [[view-the-submission-list]]) the same as any other
  attribution.

## Notes

The row-level security policy for this already exists and already
requires a verified identity (`profiles with a verified identity can
attribute themselves`) — but since nothing can currently produce a
verified identity from the app (see [[verify-a-youtube-channel]]), this
path is unreachable regardless of whether a UI is built for it. Building
the UI without first closing that gap would ship a button that always
fails.

## Related

- [[attribution-and-verification]]
