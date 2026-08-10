---
type: epic
status: Not started
---

# Attribution & verification

**What it's for.** Crediting the actual creator of a piece of content
(distinct from whoever submitted the link), and proving that credit is
real rather than just typed in by anyone.

**Where it stands.** This is schema and permissions with no front door.
The database can represent attribution, gate it behind a verified
identity, and even has a working server-side YouTube verification
function — but nothing in the app lets a person actually reach any of it.
Every "content by" section across the app (see [[public-profiles]]) is
empty as a direct consequence.

## Stories

- [[attribute-a-profile-to-a-submission]] — *Not started*
- [[verify-a-youtube-channel]] — *Half-built*
- [[self-attribute-once-verified]] — *Not started*

## Decisions this epic is waiting on

- **Does attribution get a UI at all, and if so, who can attribute whom?**
  The database already supports two different rules — a submitter
  attributing anyone to their own submission, and a verified profile
  attributing itself to *any* submission — but neither has a way to be
  triggered from the app today.
- **Is YouTube verification worth surfacing**, given the effort already
  sunk into the Edge Function, or should that function be considered
  parked/abandoned?

## Related

- [[README]]
