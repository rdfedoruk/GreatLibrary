---
type: story
status: Not started
epic: "[[moderation-and-cleanup]]"
blocked-by:
---

# File a verified self-removal

**What it is.** A claimed person (or a claimed member acting for an
entity) requests that a specific submission attributed to them be
removed from the library.

**Why it matters.** Gives someone with a real, provable connection to
content a direct way to ask for it to come down, without needing to go
through an open/unverified dispute process.

## Acceptance criteria

- *(Not yet true of the app.)* A person whose profile is linked to their
  account (or who is a member of an entity that is) can file a removal
  request for a submission attributed to that profile, with `path =
  'verified_self'`.
- Filing this kind of request does not require a reason — it can be
  submitted with none.
- The requester can see the status (pending / approved / rejected) of
  removal requests they filed.
- Someone who is neither the attributed profile's owner nor an entity
  member cannot file this kind of request for that profile — enforced,
  not just hidden in the UI.

## Notes

"Verified" here means *claimed* (`linked_user_id` set), not the separate
`profile_identities.verified` flag used for YouTube — the two are
unrelated despite the similar wording. The row-level security policy for
this exact case already exists (`linked people can file verified
self-removals`) and covers both a directly-linked person and a claimed
member of an entity via `entity_members`. Nothing in `src/` calls it.

This used to be blocked on attribution existing at all — there was
nothing to request removal of "as the verified creator" until a
submission could be attributed to someone. That cleared on 2026-08-10
(see [[attribute-a-profile-to-a-submission]]), so the only thing left
between this and buildable is the UI.

## Related

- [[moderation-and-cleanup]]
