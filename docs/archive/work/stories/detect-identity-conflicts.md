---
type: story
status: Working
epic: "[[claiming-your-page]]"
blocked-by:
---

# Detect identity conflicts when adding evidence

**What it is.** When someone tries to add an identity (say, a YouTube
channel) that's already listed on a different profile, they're told about
it — and if that other profile is unclaimed, offered a one-click claim
request on it instead.

**Why it matters.** Catches the common case where someone's content was
submitted (and a page created for them) before they ever signed up — this
is how they find and claim that pre-existing page instead of building a
second, disconnected one.

## Acceptance criteria

- Adding a platform + value combination that's already listed on another
  profile does not add it to the current profile; instead it shows "That's
  already listed on {name} — …".
- If the conflicting profile is unclaimed (`linked_user_id` is empty), the
  message includes a "Request this claim" button; clicking it files a
  claim request and the message updates to "Claim requested."
- If the conflicting profile is already claimed by someone else, the
  message reads "…'s page, which someone has already claimed." with no
  action offered.
- Adding a platform + value combination nobody else has listed succeeds
  normally, as in [[add-identity-evidence]].

## Notes

The conflict lookup excludes the current profile's own rows (`.neq
('profile_id', profileId)`), so re-adding your own existing value isn't
mistaken for a conflict with yourself.

## Related

- [[claiming-your-page]]
