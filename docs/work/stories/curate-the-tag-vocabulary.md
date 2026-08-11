---
type: story
status: Not started
epic: "[[running-the-library]]"
blocked-by:
---

# Curate the tag vocabulary

**What it is.** A page where Andrew adds a tag, fixes one, and removes
one, without opening the database. Everyone else — signed in or not —
can't reach it and is refused by the database even if they try.

**Why it matters.** The vocabulary is the thing keeping tags from
splintering into near-duplicates, and right now the only way to change it
is hand-written SQL. Two changes are already known to be coming: typos,
and ServiceNow renaming its own products (ITBM → SPM is the live
example). `tagging-taxonomy.md` deferred renaming as "a manual fix when
it actually bites" — this is that fix, built rather than scripted. It's
also the floor under a proposed-tags queue later: nowhere to promote a
proposal *to* until this exists.

## Acceptance criteria

- Signed in as Andrew, a "tags" page lists the whole vocabulary, grouped
  by dimension, with a count of how many entries carry each one.
- A new tag can be added, choosing its dimension, and shows up in the
  submit form's pickers straight away.
- A tag's name can be changed, and everything already carrying it keeps
  carrying it under the new name.
- A tag can be removed when nothing carries it.
- Removing a tag that *is* in use is refused, and says how many entries
  carry it — no silent untagging of content.
- Adding a name that already exists in that dimension is refused with a
  plain message, not a database error.
- A name that is blank, or only spaces, is refused.
- Renaming warns that any shared `?tag=` link using the old name will
  stop working, before the change is made.
- Nobody else can reach the page: signed in without the admin role, or
  signed out, it isn't linked and going to its address directly says no.
- The database refuses tag writes from anyone without the admin role,
  independently of the page — proven by tests, not by the screen hiding
  the buttons.
- Granting the role to a second account makes the page work for them too,
  with no code change.

## Notes

- **Permission model — roles, decided by Andrew 2026-08-11.** Roles live
  in the database and are granted per profile; the rules ask whether
  someone holds the **admin** role, never whether they're Robert. Only
  Robert Fedoruk holds it. The earlier no-role-table position is
  overwritten, not deferred — see `decisions-log.md` § Roles & Admin
  Access. This story is what puts the roles layer in; the tag screens are
  its first user.
- **Schema change**, to flag on review: the roles layer (a role per
  profile, granted, with room for a second role and a second person),
  plus insert/update/delete policies on `tags`, which currently refuses
  writes from everyone. `tests/db/tags.test.ts` pins the current refusal
  and will need extending, not loosening — the member-can't-write cases
  all still hold, since a member without the role is still refused.
- **Renaming is safe for content.** `submission_tags` points at a tag's
  id, never its name, so a rename can't detach anything. What it does
  break is a shared filter link, since the URL name is derived from the
  display name — see [[filter-the-list-by-tag]].
- **Deliberately not built:** a proposed-tags queue, synonyms (ITBM and
  SPM both finding the same entries), merging two tags into one, a screen
  for granting roles (granting stays a hand edit until there's a second
  person to grant to), and any role beyond **admin**. Merging in
  particular looks close to renaming and isn't — it has to move every
  entry off one tag onto another and then delete the empty one.
- **Docs to update when this lands:** `tagging-taxonomy.md` § 3 (says
  renaming is deferred), `docs/todo.md` § Administrata and § Tagging,
  `docs/current-state.md` (lists "adding or changing tags" under what's
  only possible by hand), and `decisions-log.md`.

## Related

- [[running-the-library]]
- [[tag-a-submission]] — the pickers this vocabulary feeds
- [[filter-the-list-by-tag]] — what a rename breaks
