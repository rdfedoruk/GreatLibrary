---
type: story
status: Working
epic: "[[submitting-content]]"
blocked-by:
---

# Prevent duplicate URL submissions

**What it is.** The same link can only be submitted once — a second
attempt is rejected with a plain-language message instead of creating a
duplicate entry.

**Why it matters.** Without this, popular content would clutter the list
with repeats every time more than one person shares it.

## Acceptance criteria

- Submitting a URL that's already in the library is rejected with "That
  URL is already in the library." and no second row is created.
- The rejection happens whether or not the URL string is typed with
  different capitalization or trailing characters that resolve to the
  exact same stored value — enforcement is on the stored URL, not on any
  smarter "looks similar" logic.
- The error appears inline on the submit form; the form stays open with
  what was typed still in it, so the person doesn't lose their work.

## Notes

Enforced by a `unique` constraint on `submissions.url` at the database
level (Postgres error code `23505`), not by an app-side pre-check — so
it's race-proof between two people submitting the same link at once. The
app translates that specific error code into the friendly message; any
other database error surfaces as-is.

## Related

- [[submitting-content]]
