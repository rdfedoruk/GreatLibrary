---
type: story
status: Working
epic: "[[account-and-sign-in]]"
blocked-by:
---

# Auto-create a profile on signup

**What it is.** The moment someone signs in for the first time, a public
profile row is created for them behind the scenes — display name and a
unique URL slug, no separate step.

**Why it matters.** Every other feature (submitting, voting, claiming)
needs a profile to attach to. Without this, sign-in would be a dead end.

## Acceptance criteria

- Signing in for the first time (Google or email) results in a row in
  `profiles` linked to that auth user, with no visible setup step.
- The display name comes from Google's `full_name` when available,
  falling back to the email, falling back to "Member".
- The profile gets a URL-safe slug generated from the display name
  (lowercase, non-alphanumerics collapsed to single dashes, no leading or
  trailing dash).
- If another profile already has that slug, the new one gets `-2`
  appended; if that's also taken, `-3`, and so on until a free slug is
  found.
- Signing in again with the same account does not create a second
  profile.

## Notes

Handled entirely by a Postgres trigger (`handle_new_user`) on
`auth.users` insert — there is no client-side signup step to fail
independently of sign-in. `linked_user_id` is set to the auth user's id on
creation, which is what marks a profile as claimed.

## Related

- [[account-and-sign-in]]
