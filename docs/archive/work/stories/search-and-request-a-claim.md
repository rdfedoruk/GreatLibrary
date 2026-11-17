---
type: story
status: Working
epic: "[[claiming-your-page]]"
blocked-by:
---

# Search and request a claim

**What it is.** A "Find your page" search on the Claim page: type a name,
see matching unclaimed person profiles, and request a claim on the right
one directly from the results.

**Why it matters.** The other way (besides the conflict prompt) to find a
pre-existing page someone else created before you joined.

## Acceptance criteria

- Typing in the search box (after a short pause) shows unclaimed
  (`linked_user_id` empty), person-type profiles whose display name
  contains the typed text, case-insensitive.
- An empty search box shows no results.
- Each result shows the profile's name (linking to its page) and a
  "Request claim" button.
- Clicking "Request claim" files the request and disables that button
  while the request is in flight ("Requesting…").
- Requesting a claim on a profile already requested by this same person
  shows "Already requested." next to that result rather than silently
  failing.

## Notes

Search is debounced by 250ms after the last keystroke, capped at 10
results, and matches only `type = 'person'` — entity profiles never
appear here, consistent with claiming being person-only end to end.

## Related

- [[claiming-your-page]]
