---
type: story
status: Working
epic: "[[claiming-your-page]]"
blocked-by:
---

# Add identity evidence to your profile

**What it is.** On the Claim page, a claimed person can list platform
accounts they say are theirs (YouTube, LinkedIn, ServiceNow Community,
podcast, website, or a custom platform name) as evidence for a human
reviewer, not as a verified fact.

**Why it matters.** Gives a claim reviewer something concrete to check
against, without requiring any automated proof up front.

## Acceptance criteria

- Signed out, visiting `/claim` shows "Sign in to claim a page." with a
  link back to the library, and none of the identity form.
- Signed in, the page lists any identities already added, each with a
  platform label, the value, and a × to remove it.
- Adding an identity requires both a platform (from the fixed list, or a
  typed custom name via "other…") and a non-empty value; submitting adds
  it to the list and shows "Added" without a page reload.
- Removing an identity via × takes it off the list immediately.
- The hint text "Nobody checks these automatically — they're what a human
  looks at when reviewing your claim." is shown, so the non-verified
  nature of this list isn't a surprise.
- These entries are always unverified — nothing on this screen can mark
  one verified.

## Notes

The platform list is `youtube, linkedin, sn_community, podcast, website`
plus a free-text "other" option. Enforced server-side as `verified =
false` on insert — a client attempting to insert `verified = true`
directly would be rejected by row-level security regardless of what the
UI sends.

## Related

- [[claiming-your-page]]
