---
type: story
status: Working
epic: "[[account-and-sign-in]]"
blocked-by:
---

# Sign in with Google

**What it is.** A "Sign in with Google" button on the masthead that signs
someone in via OAuth and returns them to the app.

**Why it matters.** The lowest-friction way in for anyone who already has
a Google account — no form, no password.

## Acceptance criteria

- Signed out, the masthead shows a "Sign in with Google" button.
- Clicking it starts Google's OAuth flow and returns to the app on success.
- After signing in, the masthead shows the account's display name (from
  Google) or, if there is none, their email — plus "Claim your page" and
  "Sign out".
- Signing out returns the masthead to the signed-out state.

## Notes

Uses Supabase's `signInWithOAuth` with the `google` provider, redirecting
back to `window.location.origin`. No scopes beyond the default are
requested — this sign-in does not grant YouTube access (see
[[verify-a-youtube-channel]] for the separate flow that does).

## Related

- [[account-and-sign-in]]
