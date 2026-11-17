---
type: epic
status: Working
---

# Submitting content

**What it's for.** The front door for adding a piece of ServiceNow content
to the library — a link, a description of why it's worth someone's time,
and tags from the controlled vocabulary.

**Where it stands.** Fully working for manually-typed links. Every
submission made through the app today is recorded as `manual` — there is
no code path yet that captures where a link actually came from (LinkedIn,
YouTube, etc.), even though the database has room for it.

## Stories

- [[submit-a-link]] — *Working*
- [[tag-a-submission]] — *Working*
- [[prevent-duplicate-urls]] — *Working*

## Decisions this epic is waiting on

- **Should submissions ever capture a real source site?** Right now
  everything is stamped `manual` regardless of what kind of link it is.
  The enum (`linkedin`, `youtube`, `sn_community`, `generic`) exists but
  nothing populates it — that's browser-extension territory, and no
  extension code exists in this repo.

## Related

- [[README]]
