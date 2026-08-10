---
type: story
status: Working
epic: "[[public-profiles]]"
blocked-by:
---

# Show content attributed to a profile

**What it is.** A "Content by {name}" section on every profile page,
listing submissions this identity is credited as having made — as opposed
to submissions this identity happened to submit.

**Why it matters.** This is what makes a profile page mean "here's what
this person/organization made," not just "here's an account."

## Acceptance criteria

- The "Content by {name}" section appears on every profile page,
  regardless of type (person or entity).
- It lists every submission whose attributions include this profile, using
  the same card layout as the home feed (link, description, tags, votes,
  etc.).
- If nothing is attributed to this profile, the section shows "Nothing
  attributed yet." instead of being empty or missing.

## Notes

As of now there is no UI anywhere in the app that creates an attribution
row, so this section is empty for every real profile in production — the
display logic is built and correct, but has nothing to show. See
[[attribute-a-profile-to-a-submission]].

## Related

- [[public-profiles]]
