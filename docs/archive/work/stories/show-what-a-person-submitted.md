---
type: story
status: Working
epic: "[[public-profiles]]"
blocked-by:
---

# Show what a person submitted

**What it is.** A second section, "Submitted by {name}", on person-type
profile pages only — the list of submissions this person personally added
to the library, regardless of who the content is about.

**Why it matters.** Separates "what this person made" from "what this
person shared," which are genuinely different things once attribution
exists as its own concept.

## Acceptance criteria

- On a `person`-type profile, a "Submitted by {name}" section appears
  below the "Content by" section, listing submissions where this profile
  is the submitter.
- On an `entity`-type profile, this section does not appear at all —
  entities never log in, so they can never be a submitter.
- If the person hasn't submitted anything, the section shows "No
  submissions yet." instead of being empty.

## Notes

The `entity`/`person` check happens in the UI (`profile.type === 'person'`
gates the section); it's also true at the database level, since entities
can never hold a `linked_user_id` and therefore can never satisfy
`submitted_by`.

## Related

- [[public-profiles]]
