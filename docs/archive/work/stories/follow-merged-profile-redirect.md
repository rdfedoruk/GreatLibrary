---
type: story
status: Working
epic: "[[public-profiles]]"
blocked-by:
---

# Follow a merged profile's redirect

**What it is.** If a profile has been retired in favor of another (a
duplicate that got merged into a surviving page), visiting its slug shows
the surviving profile's page instead of a dead end.

**Why it matters.** Old links (in submissions, in the URL bar, bookmarked)
keep working even after two duplicate pages get consolidated into one.

## Acceptance criteria

- Visiting the slug of a profile whose `merged_into` points at another
  profile shows that other profile's name, claimed status, type, and
  content — not the retired profile's own (now-orphaned) data.
- The redirect only follows one hop — if the target profile is itself
  merged into a third, that second hop is not followed.
- A profile with no `merged_into` value behaves exactly as described in
  [[view-a-profile-page]], unaffected by any of this logic.

## Notes

There is no UI anywhere that sets `merged_into` — this story is "the
retired page correctly points forward," not "an admin can merge two
pages." Merging remains a manual database edit until that's built.

Before doing a real merge, read the **Login vs page** risk in
[[public-profiles]]: the first merge is exactly what makes that latent bug
bite, so it has to be sorted first.

## Related

- [[public-profiles]]
