---
type: story
status: Working
epic: "[[public-profiles]]"
blocked-by:
---

# View a profile page

**What it is.** A page at `/profile/{slug}` showing an identity's name, a
claimed checkmark if someone has linked their login to it, and an entity
chip if it represents an organization rather than a person.

**Why it matters.** This is the landing page for "who made this" and
"who's behind this account" — the thing a submission's "by" link and a
claim search result both point to.

## Acceptance criteria

- Visiting `/profile/{slug}` for a real slug shows that profile's display
  name.
- A profile with a linked account shows a checkmark next to the name
  (title text "Claimed profile"); an unclaimed profile shows no checkmark.
- A profile of type `entity` shows an "Entity" chip; a `person` profile
  does not.
- Visiting a slug that matches no profile shows "No profile here." with a
  link back to the library, not a blank page or a crash.
- While the profile is loading, the page shows "Loading…".
- If the fetch fails outright, the page shows "Couldn't load this
  profile: {error}".

## Notes

`claimed` is derived, not stored directly — it's `true` whenever
`linked_user_id` is set on the profile row.

## Related

- [[public-profiles]]
