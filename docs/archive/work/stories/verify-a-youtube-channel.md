---
type: story
status: Half-built
epic: "[[attribution-and-verification]]"
blocked-by:
---

# Verify a YouTube channel

**What it is.** Proof, not just an assertion, that a YouTube channel
belongs to a profile — done by signing in to that channel via Google and
having the server check with YouTube directly, rather than the person
just typing a channel name.

**Why it matters.** An unverified identity ("I say this channel is mine")
proves nothing and can't safely unlock anything, like self-attribution.
Verification is what would make identity evidence actually load-bearing
instead of purely advisory.

## Acceptance criteria

- *(Server-side half: already true.)* Given a valid Google provider token,
  the `verify-youtube` function correctly identifies the caller's YouTube
  channel, rejects the call if the token doesn't confirm a channel, and
  writes a `profile_identities` row with `verified = true` — a write only
  this function's service-role key can make.
- *(Server-side half: already true.)* If the channel is already verified
  by a different profile, the function refuses with a conflict error
  rather than allowing two profiles to both claim it.
- *(Not yet true — client half.)* Somewhere in the app, a signed-in person
  can start this flow (a "Verify your YouTube channel" action), which
  requests YouTube-scoped Google access and calls this function with the
  resulting token.
- *(Not yet true.)* Once verified, the profile page or claim page shows
  the identity as verified, visibly distinct from unverified evidence
  entries.

## Notes

The `verify-youtube` Edge Function is complete and deployed-ready. What's
missing is entirely on the client: `signInWithGoogle` in `src/lib/auth.ts`
requests no extra scopes today, and nothing in `src/features/claims/`
calls this function or asks for a YouTube-scoped token. This is why the
epic status reads "Not started" overall despite this one piece being
further along than that.

## Related

- [[attribution-and-verification]]
