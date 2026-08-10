# Current State

**What the app actually is on 2026-07-19.** Written by reading the seven
migrations and `src/`, not by reading the other docs. Where this file and
another doc disagree, this one is right — the others are being reconciled
against it.

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

## Built in the database, with no way to use it yet

These tables exist and are enforced, but nothing in the app reads or writes
them:

- **`comments`** — the whole table and its comment/suggestion/critique type.
  No comments feature folder, no UI. This was Phase 2 work that never got built.
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

**The live consequence, which no doc currently records:** the permission
rule added in migration 7 lets someone attribute themselves to *another
member's* submission only if they hold a verified identity — and nothing in
the app can grant verification any more. So that path is admin-SQL-only
today. Attribution by the submitter still works normally; it's only
self-attribution to someone else's submission that's affected.

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

## Not verified

- **No tests exist.** No test runner is installed and there is no `test`
  script. `package.json` has `dev`, `build`, `lint`, `preview` only.
- **The claim flow has never been exercised against a real signed-in
  session.** It was built and deployed but not live-tested.
- The only account in production is Robert Fedoruk, on Google sign-in.
