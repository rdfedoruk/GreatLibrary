---
type: story
status: Not started
epic: "[[keeping-content-fresh]]"
blocked-by:
---

# Archive a link on submit

**What it is.** When someone submits a link, the app quietly asks the
Internet Archive to save a copy of that page, and stores the address of
the saved copy alongside the submission. If the original ever disappears,
there is still something to read.

**Why it matters.** This is the only part of the link-rot problem that
can't be fixed later. Once a page is gone it's gone — you can only
archive something while it still exists. Pew found 38% of pages that
existed in 2013 were unreachable by 2023, and ServiceNow content is worse
than average: blogs get abandoned, Community threads get pruned, and
videos get set to private when someone changes jobs.

## Acceptance criteria

- Submitting a link works exactly as fast as it does today — the person
  is never left waiting on the Internet Archive.
- A minute or two after submitting, the submission has a stored archive
  address pointing at a real snapshot of that page.
- Submissions that have an archive copy show a small "archived copy" link
  next to the original.
- Submissions with no archive copy yet show nothing extra — no broken
  link, no empty label, no error.
- If the Internet Archive is down, rate-limits us, or refuses the page,
  the submission still saves normally and simply has no archive address.
- A page the Internet Archive refuses to save (paywalled, robots-blocked,
  login-required — LinkedIn is the likely one) does not produce a stored
  address that leads to an error page.
- Anything that failed to archive gets retried later rather than being
  abandoned after one attempt.
- Nobody signed in as a normal member can edit a submission's archive
  address by hand.

## Notes

- **Where the call happens.** Not from the browser — the Internet Archive
  won't accept a cross-site request from our page, and it can take 30+
  seconds to respond. This runs as a Supabase Edge Function, triggered
  after the submission row is saved, writing the result back with the
  service key.
- **Which endpoint.** `https://web.archive.org/save/<url>` needs no
  account and is the simpler start; the authenticated Save Page Now API
  is faster and gives clearer failure reasons but needs archive.org keys
  in the project secrets. Start unauthenticated, flag it if rate limits
  bite.
- **Retries are free.** The weekly job in [[flag-dead-links]] can pick up
  any submission still missing an archive address and try again, so this
  story doesn't need its own retry machinery.
- **Backfill.** Existing submissions should get archived too, through the
  same retry path — not a separate one-off script.
- Deliberately not built: choosing *when* to snapshot again, multiple
  snapshots over time, or archiving anywhere other than the Internet
  Archive.

## Related

- [[keeping-content-fresh]]
- [[flag-dead-links]] — the job that retries failures and backfills
- [[submit-a-link]] — the flow this hangs off
