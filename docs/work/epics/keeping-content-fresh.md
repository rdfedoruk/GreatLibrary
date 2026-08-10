---
type: epic
status: Not started
---

# Keeping content fresh

**What it's for.** ServiceNow content goes stale two different ways, and
this epic covers both. Links die — the blog gets taken down, the video is
made private, the Community thread is archived — and the library is left
pointing at nothing. And content that still loads fine can be about a
release nobody runs any more, which the reader can't tell without opening
it.

The fix for the first is a backup copy taken the moment something is
submitted, plus a routine check that notices when the original stops
answering. The fix for the second is a third kind of tag naming the
ServiceNow release the content is about.

**Where it stands.** Nothing exists. `submissions` has a URL and no idea
whether that URL still works. Tags have two dimensions (module and
medium) and no way to say "this is a Xanadu article."

**Why now.** Archiving is the one thing here that can't be done
retroactively — a link that dies before we ever snapshot it is gone for
good. Every day without it is submissions we can't get back.

## Stories

- [[archive-a-link-on-submit]] — *Not started*
- [[flag-dead-links]] — *Not started*
- [[tag-the-servicenow-release]] — *Not started*

## Decisions already made

- **A version tag replaces the "outdated" community flag.** The research
  in `curation-community-research.md` suggested letting people vote
  content down as outdated. A tag saying which release it covers is
  better: it's a fact, not an opinion, and it's useful for filtering
  rather than just for burying things.
- **Both halves of link rot get built** (archive + dead-link check),
  decided 2026-08-09.

## Related

- [[README]]
- [[submitting-content]] — where the submit form and tagging live today
