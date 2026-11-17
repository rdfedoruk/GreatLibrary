---
type: epic
status: Half-built
---

# Attribution & verification

**What it's for.** Crediting the actual creator of a piece of content
(distinct from whoever submitted the link), and proving that credit is
real rather than just typed in by anyone.

**Where it stands.** Crediting works; proving the credit doesn't. Since
2026-08-10 a submitter can say who made the content on their own
submission, and can create a page for a creator who has never signed in,
so the "content by" sections across the app (see [[public-profiles]]) can
finally fill up.

What's still missing is the *verification* half. Nothing in the app can
mark an identity as verified — that was parked at commit `f90b2fe` — so
the one rule that depends on it, a verified profile attributing itself to
someone else's submission, remains unreachable except by hand.

## Stories

- [[attribute-a-profile-to-a-submission]] — *Working*
- [[verify-a-youtube-channel]] — *Half-built*
- [[self-attribute-once-verified]] — *Not started*

## Decisions this epic is waiting on

- **~~Does attribution get a UI at all, and if so, who can attribute
  whom?~~** Answered 2026-08-10: yes, and the submitter is who. Credit is
  claimed on the submission's own page, and members may create unclaimed
  person pages for creators who have never signed in — accepting that
  duplicates and misspellings will need hand-merging. The verified-profile
  rule was deliberately left alone.
- **Is YouTube verification worth surfacing**, given the effort already
  sunk into the Edge Function, or should that function be considered
  parked/abandoned? This is now the only thing standing between the epic
  and *Working*.

## Related

- [[README]]
