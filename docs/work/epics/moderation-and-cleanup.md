---
type: epic
status: Not started
---

# Moderation & cleanup

**What it's for.** The set of features that let people discuss
submissions and get content about them removed — comments, and both
paths for requesting a takedown.

**Where it stands.** Comments have been picked up: `src/features/comments/`
exists, threads expand on each submission card, and authors can edit and
delete their own. The two removal paths have not — their tables and some
permission rules have existed since the very first migration, but no
feature folder, component, or code path anywhere in `src/` touches them.
That half was designed at the schema level and never built.

## Stories

- [[comment-on-a-submission]] — *Not started*
- [[file-a-verified-self-removal]] — *Not started*
- [[file-an-open-takedown-request]] — *Not started*
- [[name-entity-members]] — *Not started*

## Decisions this epic is waiting on

- **Does an open (non-verified) takedown request require an account?**
  The database currently has *no insert policy at all* for that path — it
  is unconditionally blocked until this is decided.

**Decided 2026-08-10:** comments are still wanted, and authors can edit
and delete their own. See [[comment-on-a-submission]].

## Related

- [[README]]
