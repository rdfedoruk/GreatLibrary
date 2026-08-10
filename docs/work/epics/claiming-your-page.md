---
type: epic
status: Half-built
---

# Claiming your page

**What it's for.** Lets someone attach their login to an existing profile
— either one that already represents them (found before they joined) or
one they're building evidence for — so they get credit for their work.

**Where it stands.** The whole self-service side works: adding evidence,
finding a page, requesting a claim, seeing your request's status. The
approval step that actually grants a claim has no interface at all — it's
a manual database edit, by design, since there's no admin role yet.

## Stories

- [[add-identity-evidence]] — *Working*
- [[detect-identity-conflicts]] — *Working*
- [[search-and-request-a-claim]] — *Working*
- [[view-your-claim-requests]] — *Working*
- [[approve-or-reject-a-claim]] — *By hand only*

## Decisions this epic is waiting on

- **Does an admin role/UI ever get built for approvals**, or does this
  stay a deliberate manual step indefinitely? Nothing in the schema
  suggests a role table is coming.
- **When someone joins and a page already exists for them, do they take
  over that page, or get a fresh one with their content repointed at it?**
  Take-over is what the current design assumes; a fresh page is simpler but
  leaves their author page and their member page separate forever. Either
  way, the [[public-profiles]] "Login vs page" risk has to be sorted first.

## Related

- [[README]]
