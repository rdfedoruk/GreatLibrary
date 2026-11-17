---
type: epic
status: Working
---

# Public profiles

**What it's for.** A page per identity — person or entity — showing what
they made and what they submitted, at a stable, readable URL.

**Where it stands.** Working. The "content by" section on every profile
page was empty until 2026-08-10 because nothing in the app could create
an attribution; a submitter can now credit whoever made the content (see
[[attribution-and-verification]]), so the section fills up as people use
it.

## Stories

- [[view-a-profile-page]] — *Working*
- [[show-content-attributed-to-a-profile]] — *Working*
- [[show-what-a-person-submitted]] — *Working*
- [[follow-merged-profile-redirect]] — *Working*

## Risks

- **Login vs page — the two are separate records.** Someone's login and
  their public profile are stored as two different rows. Most of the site's
  permission rules assume they're the same row, and get away with it because
  anyone who signed up normally happens to have both sharing an id — a few
  rules do it properly, most don't. Nothing is wrong today. It goes wrong on
  the **first time two pages are merged**: that person's votes and comments
  stop counting as theirs, and nothing warns you. See
  [[follow-merged-profile-redirect]] — merging is what triggers this, and it
  must be sorted before the first real merge.

## Decisions this epic is waiting on

- Whether attribution ever gets a UI belongs to
  [[attribution-and-verification]].
- **Avatars** — pulled from the Google account, uploaded by the user, both,
  or neither. Nothing is built and nothing decided.

## Related

- [[README]]
