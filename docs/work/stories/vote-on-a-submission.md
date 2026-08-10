---
type: story
status: Working
epic: "[[browsing-and-voting]]"
blocked-by:
---

# Vote on a submission

**What it is.** Up and down arrows on every submission card. A signed-in
person can cast one vote per submission; the card shows the net score
(upvotes minus downvotes).

**Why it matters.** Voting is how quality content rises above the rest —
without it, the list is just a chronological dump with no signal of what's
actually good.

## Acceptance criteria

- Signed out, both arrows are present but disabled, with a "Sign in to
  vote" tooltip on hover.
- Signed in, clicking the up arrow when you haven't voted sets your vote
  to +1 and increases the shown score by 1; clicking the down arrow sets
  it to −1 and decreases the score by 1.
- Clicking the arrow matching your current vote retracts it — the score
  moves back by 1 and neither arrow shows as active.
- Clicking the opposite arrow while a vote is active swings the vote (and
  the score) by 2 in one action, not two.
- The score updates immediately on click, before the network request
  resolves.
- If the vote fails to save, the button and score revert to what they
  were before the click — the UI never ends up showing a vote that wasn't
  actually recorded.
- A person can hold at most one vote per submission at the database
  level, regardless of what the client does.

## Notes

The UI update is optimistic — it changes immediately, then rolls back to
the value from immediately before the failed action if the write errors.
Enforced in the database by a two-column primary key
(`submission_id, user_id`) plus a check constraint restricting the value
to exactly `-1` or `1`.

## Related

- [[browsing-and-voting]]
