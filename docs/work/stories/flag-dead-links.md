---
type: story
status: Not started
epic: "[[keeping-content-fresh]]"
blocked-by:
---

# Flag dead links

**What it is.** Once a week, the app visits every submitted link to see
whether it still answers. Links that have gone missing get marked as
dead, and the library shows them as dead instead of sending people to a
404. The same job backfills archive copies for anything missing one.

**Why it matters.** A curation site whose links don't work is worse than
no curation site — it wastes the reader's time and destroys trust in
everything else on the page. Nobody is going to notice a dead link by
hand across a growing library.

## Acceptance criteria

- Every submission's link is checked at least once a week without anyone
  doing anything.
- A link that returns "not found" or "gone" on two checks in a row is
  marked dead.
- A dead submission is visibly marked as dead in the list, and points at
  its archived copy instead of, or alongside, the broken original.
- A link that comes back to life stops being marked dead on the next
  check.
- A site that merely blocks us — refuses the request, asks for a login,
  or tells us to slow down — is **not** marked dead. LinkedIn and
  YouTube will both do this.
- A single failure never marks anything dead; it takes two consecutive
  failed checks.
- One unreachable site or one slow-to-respond page doesn't stop the rest
  of the run from finishing.
- The same run gives any submission with no archive copy another attempt
  at getting one.
- Nobody signed in as a normal member can mark a submission dead or
  alive by hand.
- If the whole job fails to run, nothing is silently marked dead — links
  keep their last known state.

## Notes

- **How it runs.** Supabase's scheduled jobs (`pg_cron`) calling an Edge
  Function, weekly. Weekly is deliberate: link rot happens over months,
  and a daily job is a daily chance to annoy the sites we depend on.
- **What "checked" means.** A `HEAD` request first, falling back to `GET`
  when a site refuses `HEAD`. Only 404 and 410 count as dead. 403, 429,
  and timeouts are "couldn't tell," which is not the same thing and must
  not be recorded as dead.
- **Schema.** `submissions` gains a link status, a last-checked
  timestamp, and a consecutive-failure count. The two-strikes rule lives
  in that counter, not in app code.
- **Politeness.** Space the requests out and identify the app in the
  user-agent string. This job hits other people's servers on our behalf;
  it should be boring to them.
- Deliberately not built: notifying the submitter, auto-removing dead
  submissions, or searching for a replacement URL. Dead links stay in
  the library, marked.

## Related

- [[keeping-content-fresh]]
- [[archive-a-link-on-submit]] — provides the copy a dead link falls back to
