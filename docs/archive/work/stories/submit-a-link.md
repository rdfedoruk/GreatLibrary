---
type: story
status: Working
epic: "[[submitting-content]]"
blocked-by:
---

# Submit a link

**What it is.** A signed-in person can open a form, paste a link, write a
short description, and add it to the library.

**Why it matters.** This is the one action that puts new content into the
library in the first place — everything else (voting, tagging, browsing)
has nothing to work with until this exists.

## Acceptance criteria

- Signed out, no submit form or button appears on the home page.
- Signed in, a "Submit content" button opens a form with a link field, a
  description field, and a tag picker.
- Submitting with a link that isn't a full `http://` or `https://` URL is
  rejected with "Enter a full link, starting with http:// or https://",
  and nothing is saved.
- Submitting with an empty (or whitespace-only) description is rejected
  with "A short description is required.", and nothing is saved.
- A valid submission is saved, the form clears and closes, and the new
  entry appears at the top of the list without a page reload.
- The submit button reads "Submitting…" and is disabled while the request
  is in flight.
- A "Cancel" button closes the form without saving, discarding whatever
  was typed.

## Notes

Every submission from this form is recorded with `source_site: 'manual'`
— there's no capture of the real source (LinkedIn, YouTube, etc.). See
the open question on [[submitting-content]].

## Related

- [[submitting-content]]
