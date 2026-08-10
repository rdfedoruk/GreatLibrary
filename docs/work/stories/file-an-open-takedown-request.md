---
type: story
status: Not started
epic: "[[moderation-and-cleanup]]"
blocked-by:
---

# File an open takedown request

**What it is.** A way for anyone (not just the verified/claimed creator)
to request that a submission be removed, with a required reason —
distinct from a verified creator's own self-removal.

**Why it matters.** Covers cases the verified-self path can't: disputed
ownership, content someone else has a complaint about, or a creator who
hasn't claimed a page yet.

## Acceptance criteria

- *(Currently impossible, not just unbuilt.)* Someone can submit a
  takedown request against a submission with `path = 'open_request'` and
  a required, non-empty reason.
- The requester (if signed in) can see the status of requests they filed.

## Notes

This path is **hard-blocked at the database level today, on purpose**:
there is no insert policy at all for `path = 'open_request'` on
`removal_requests`, so any attempt is denied regardless of what the app
sends. The migration that added this table explicitly says not to add a
policy without first deciding whether filing one requires an account.
That decision has to happen before any UI work here is meaningful — the
open question is recorded on [[moderation-and-cleanup]].

## Related

- [[moderation-and-cleanup]]
