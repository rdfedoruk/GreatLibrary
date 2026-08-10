---
type: story
status: Not started
epic: "[[moderation-and-cleanup]]"
blocked-by:
---

# Name entity members

**What it is.** A way to say "this claimed person can act for this
entity" — the thing that lets a person file a verified self-removal (or,
in future, other entity-level actions) on an organization's behalf.

**Why it matters.** Entities can never log in themselves, so without this
link, an organization's page has no one who can act for it at all.

## Acceptance criteria

- *(Not yet true of the app.)* A person with appropriate standing (e.g.
  an existing entity member, or an admin) can add a claimed person as a
  member of an entity.
- A person can be removed as a member of an entity.
- Only a `person`-type profile can be added as a member, and only an
  `entity`-type profile can be the entity — attempting otherwise is
  rejected.
- Entity membership is visible somewhere (e.g. on the entity's profile
  page) so it's not a silent, unverifiable relationship.

## Notes

The `entity_members` table and a trigger enforcing the person/entity type
constraint exist since the unified-profiles migration. There is no UI to
create, view, or remove a membership row — today it's entirely a manual
database edit, and there's no recorded decision yet about who should be
allowed to grant membership through the app (the entity itself has no
login to grant it).

## Related

- [[moderation-and-cleanup]]
