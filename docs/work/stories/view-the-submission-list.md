---
type: story
status: Working
epic: "[[browsing-and-voting]]"
blocked-by:
---

# View the submission list

**What it is.** The home page feed: every submission, newest first, each
shown as a card with its link, description, domain, source label, tags,
who made it, who submitted it, and when.

**Why it matters.** This is the actual library — the page that makes the
whole project worth building. Everything else feeds into or branches off
this view.

## Acceptance criteria

- Submissions appear newest-first by creation time.
- Each card shows: the description as a clickable link (opens the
  original URL in a new tab), the link's domain with `www.` stripped, a
  human-readable source label (e.g. "ServiceNow Community" for
  `sn_community`), its tags (medium tags before module tags), who
  submitted it, and the submission date.
- If the content has one or more attributed creators, "by {name(s)}"
  appears before "submitted by", each name linking to that person's
  profile page; if there are none, that segment is omitted entirely.
- While loading, the page shows "Loading the library…" instead of an
  empty list.
- If the fetch fails, the page shows "Couldn't load the library: {error}"
  rather than a blank screen.
- If there are no submissions at all, the page shows "The shelves are
  empty — the first submission will land here." instead of an empty
  region.
- Submitting a new entry updates this list immediately, without a manual
  page refresh.

## Notes

Net vote score and the current viewer's own vote are computed client-side
from the full set of vote rows embedded in each submission, not from a
database aggregate. Fine at today's scale; would need to move to a
database view or aggregate if lists get long or hot.

## Related

- [[browsing-and-voting]]
