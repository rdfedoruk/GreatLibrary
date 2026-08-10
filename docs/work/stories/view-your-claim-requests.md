---
type: story
status: Working
epic: "[[claiming-your-page]]"
blocked-by:
---

# View your claim requests

**What it is.** A "Your requests" section on the Claim page listing every
claim this person has filed and its status — pending, approved, or
rejected.

**Why it matters.** Without this, someone who requests a claim has no way
to know whether anything happened — the request would disappear into a
black box.

## Acceptance criteria

- After filing at least one claim, a "Your requests" section appears
  listing each one: the target profile's name (linking to its page) and a
  status label of pending, approved, or rejected.
- With zero claims filed, the section does not render at all (no empty
  "Your requests" heading with nothing under it).
- Filing a new claim (from either the conflict prompt or the search
  results) updates this list without a page reload.
- The hint "Each one is reviewed by hand. You'll keep your account either
  way." is shown, so a rejection doesn't read as an account-level
  penalty.

## Notes

Only the requester can see their own claims — enforced by row-level
security (`auth.uid() = user_id`), not just by the UI not asking for
anyone else's.

## Related

- [[claiming-your-page]]
