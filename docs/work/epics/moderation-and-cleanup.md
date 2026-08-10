---
type: epic
status: Not started
---

# Moderation & cleanup

**What it's for.** The set of features that let people discuss
submissions and get content about them removed — comments, and both
paths for requesting a takedown.

**Where it stands.** Database tables and some permission rules exist from
the very first migration and have barely been touched since. No feature
folder, no component, no code path anywhere in `src/` touches any of
these. This looks like Phase 2 work that was designed at the schema level
and never picked up.

## Stories

- [[comment-on-a-submission]] — *Not started*
- [[file-a-verified-self-removal]] — *Not started*
- [[file-an-open-takedown-request]] — *Not started*
- [[name-entity-members]] — *Not started*

## Decisions this epic is waiting on

- **Does an open (non-verified) takedown request require an account?**
  The database currently has *no insert policy at all* for that path — it
  is unconditionally blocked until this is decided.
- **Is comments still wanted**, given the table has sat unused since the
  very first migration?

## Related

- [[README]]
