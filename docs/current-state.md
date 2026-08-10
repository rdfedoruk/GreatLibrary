# Current State

**What the app actually is on 2026-07-19**, with comments and attribution
folded in on 2026-08-10. Written by reading the migrations and `src/`,
not by reading the other docs. Where this file and another doc disagree,
this one is right — the others are being reconciled against it.

Everything below has been re-checked except where a line says otherwise;
the 2026-07-19 sweep covered seven migrations, and there are now nine.

This file describes *what exists*. It does not say why (see
`decisions-log.md`), what's next (`todo.md`), or what's undecided
(`open-questions.md`).

## What works today

Three pages, live at greatlibrary.theduke.digital:

- **`/`** — the submission list, plus a submit form when signed in.
  Filtering by tag and source. Vote arrows with a net score.
- **`/profile/:slug`** — one page per identity. Name, claimed checkmark,
  person-or-entity chip, content attributed to them, content they submitted.
  Follows a retired duplicate's pointer one hop, so links to a merged page
  still land.
- **`/claim`** — add and remove your own platform identities, search
  unclaimed pages, request a claim, see your requests' status.
- **`/submission/:id`** — one page per submission, reached by the
  Discuss (n) button on each entry in the list. The entry itself at the
  top, the discussion beneath. Signed in you can post a comment,
  suggestion or critique, and edit or delete your own; an edited comment
  is marked as edited. Signed out it reads but offers no way to post.
  If you are the one who submitted it, a **Who made this?** box sits
  between the two: search for whoever made the content, or type a name
  nobody has a page for and one is created. Credits show up in the
  entry's by-line and on that person's page, and come off again with an
  ×. Nobody else sees the box.

Sign-in is Google **or** email magic-link. Both create a profile
automatically, with a readable slug generated from the display name
(`robert-fedoruk`, then `-2`, `-3` on collision).

## The database as it stands

Eleven tables. The permission rules are ServiceNow ACLs by another name —
Postgres calls them row-level security, and they're written into the
migrations rather than app code.

| Table | Holds |
|---|---|
| `profiles` | Every public identity — person or entity, claimed or not |
| `profile_identities` | "How we know it's theirs" — one row per platform account |
| `entity_members` | Which people can act for an entity |
| `submissions` | URL (unique), description, source site, who submitted it |
| `submission_attributions` | Who *made* the content — many-to-many |
| `tags` / `submission_tags` | Flat controlled vocabulary, two dimensions |
| `votes` | One row per person per submission, +1 or −1 |
| `comments` | Body plus a comment/suggestion/critique type |
| `claims` | A person's request to attach their login to a page |
| `removal_requests` | Verified self-removal and open takedowns |

Rules the database enforces on its own, independent of any app code:

- One vote per person per submission; value must be exactly +1 or −1.
- A URL can only be submitted once.
- Entities can never log in (`linked_user_id` must stay empty for them).
- Only person-type pages can be claimed — enforced by a trigger.
- `entity_members` must point at a real entity and a real person — trigger.
- An open takedown request must carry a reason; self-removal need not.
- Only a **verified** identity locks a platform account. Unverified ones
  can collide freely, so a squatter can't permanently block the real owner.
- Reads are public. Writes are own-row only. Anything not explicitly
  granted is denied.
- A comment must contain at least one non-whitespace character, so a body
  of spaces, tabs or blank lines is refused.
- A comment can only be edited or deleted by its author. Editing stamps
  `edited_at` by trigger, so an edit can't pretend not to be one, and the
  same trigger pins the submission, author and creation time — an edit
  can't move a comment elsewhere or reassign it.
- A display name must contain at least one non-whitespace character.
- A member may create a page only for a *person* who has never signed in
  — never one attached to a login, never one born already-merged. Entity
  pages stay a hand edit.
- Credits on a submission can be added and removed by its submitter.
  Removal is deliberately as wide as adding, which means a submitter can
  also strip a self-attribution somebody else added.

## Built in the database, with no way to use it yet

These tables exist and are enforced, but nothing in the app reads or writes
them:

- **`removal_requests`** — table and permission rules exist for verified
  self-removal. No UI.
- **`entity_members`** — table and trigger exist. No UI for naming who acts
  for an entity.
- **`merged_into`** — profile pages *follow* the pointer correctly, but
  nothing can *set* it. Merging two pages is a manual database edit.

## Parked deliberately

Commit `f90b2fe` shelved automated claiming in favour of hand review. It
removed the Connect-my-YouTube-channel button, the OAuth round-trip, oEmbed
matching, the Attribute-to-me button, and the verified badges — while
keeping the `verify-youtube` Edge Function, the `verified` columns, and the
unique index, so the work is parked rather than lost. Working automation is
at commit `c69fb16`.

**The live consequence:** the permission rule added in migration 7 lets
someone attribute themselves to *another member's* submission only if they
hold a verified identity — and nothing in the app can grant verification any
more. So that path is admin-SQL-only today. Attribution by the submitter is
a working feature as of 2026-08-10; it's only self-attribution to someone
else's submission that's affected.

## Only possible by hand

There is no admin role in the schema and no admin UI. All of this is
Andrew editing rows directly:

- Approving or rejecting a claim.
- Marking an identity verified.
- Merging a duplicate page.
- Editing anyone's display name or slug (no UI exists for this at all,
  including for your own profile).
- Adding or changing tags in the controlled vocabulary.

This is a recorded decision — no role table until a second admin exists —
not an oversight.

## Blocked in the database on purpose

`removal_requests` accepts `path = 'verified_self'` but has **no insert
rule at all** for `path = 'open_request'`. Anyone filing an open takedown
is denied by the database. This is deliberate: whether filing one requires
an account is undecided, and the migration says not to add a rule without
that decision.

## Testing

Tests exist as of 2026-08-10: `npm test` runs 35 Vitest checks of the
database rules and 3 Playwright journeys. They run against the separate
GreatLibraryTesting project and refuse to start if pointed at production.
See `docs/work/README.md` § Testing for what is and isn't covered on
purpose, and `docs/deployment.md` for the traps in pushing migrations.

## Not verified

- **The claim flow has never been exercised against a real signed-in
  session.** It was built and deployed but not live-tested.
- The only account in production is Robert Fedoruk, on Google sign-in.
