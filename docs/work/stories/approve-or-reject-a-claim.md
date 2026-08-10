---
type: story
status: By hand only
epic: "[[claiming-your-page]]"
blocked-by:
---

# Approve or reject a claim

**What it is.** Reviewing a filed claim and deciding whether to grant it —
which, once granted, should link the requester's login to the target
profile.

**Why it matters.** Without this step, "request a claim" has nowhere to
go — requests can pile up in `pending` forever with no way for anyone,
including Andrew, to act on them through the app.

## Acceptance criteria

- *(Not yet true of the app — recorded here as what "Working" would mean
  once built.)* A reviewer can see pending claim requests somewhere in the
  app.
- A reviewer can approve a claim, which sets its status to `approved` and
  links the requester's account to the target profile
  (`linked_user_id`).
- A reviewer can reject a claim, which sets its status to `rejected` and
  changes nothing else about the target profile.
- The requester sees the updated status the next time they view
  [[view-your-claim-requests]].

## Notes

Today, none of this exists in the app: there's no admin role in the
schema, no admin UI, and no row-level security policy that lets anything
other than a direct database edit change a claim's `status` or set
`profiles.linked_user_id`. This is a recorded, deliberate gap (no role
table until a second admin exists) rather than an oversight — Andrew
approves claims by editing rows directly today.

## Related

- [[claiming-your-page]]
