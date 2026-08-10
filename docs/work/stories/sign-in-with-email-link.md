---
type: story
status: Working
epic: "[[account-and-sign-in]]"
blocked-by:
---

# Sign in with an email link

**What it is.** A password-free sign-in: type an email, get a magic link,
click it to be signed in. Lives next to the Google button, joined by "or".

**Why it matters.** Not everyone wants to use Google. This is the second
front door, for anyone who'd rather use email.

## Acceptance criteria

- Signed out, the masthead shows an email field and a "Continue with
  email" button alongside the Google option.
- Entering an email and submitting shows "Check {email} for a sign-in
  link." in place of the form.
- The button reads "Sending…" and is disabled while the request is in
  flight, so a second click can't fire a duplicate send.
- If the request fails, the form stays visible and shows "Something went
  wrong. Try again." rather than silently doing nothing.
- Clicking the emailed link signs the person in and returns them to the
  app, same as the Google path.

## Notes

Uses Supabase's `signInWithOtp`, redirecting back to
`window.location.origin`. No password is ever set or asked for.

## Related

- [[account-and-sign-in]]
