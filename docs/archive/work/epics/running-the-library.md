---
type: epic
status: Not started
---

# Running the library

**What it's for.** The jobs that belong to whoever runs the place rather
than to the people using it: curating the tag vocabulary, merging
duplicate pages, approving claims, and whatever review queue eventually
sits in front of new submissions. Today every one of these is Andrew
editing rows by hand.

**Where it stands.** Nothing built. This epic exists because those jobs
had no home in the graph — they've been sitting in `docs/todo.md` under
"Administrata" since before this folder existed.

**The permission model: roles.** Decided 2026-08-11, overwriting the
earlier "no role table until a second admin exists" position. Roles are
held in the database and granted per profile, so the rules ask whether
someone holds the **admin** role rather than whether they're Andrew. Only
Robert Fedoruk holds it today; moderator is the likely second role when
the review queue gets picked up. See `decisions-log.md` § Roles & Admin
Access. [[curate-the-tag-vocabulary]] is what puts the layer in.

## Stories

- [[curate-the-tag-vocabulary]] — *Not started*

## Related

- [[README]]
