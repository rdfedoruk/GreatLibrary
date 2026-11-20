# Plan

The only place work is tracked. Finished lines get deleted, not ticked.

## Decided (2026-11-16)

- **Tagging is replaced** by ContentTagger's: anyone signed in can suggest
  a tag; an admin approves, renames, merges or deletes; tags have a type.
- **Tag types are kept.** General and Version come from ContentTagger;
  Medium (Video, Article, Podcast, Repo) stays from the live site.
- **Thumbnails use the Thumbnailer rules, version r6.** Only the rules —
  not the Thumbnailer's version history of each result.
- **Claims are stripped out.** Dealt with later.
- **Comments and voting stay.**
- **Accounts and profiles are two things.** An account is what you sign in
  with; accounts comment, tag and vote. A profile is a public page, and
  can exist for someone with no account (e.g. an author whose content
  someone else posted). An author's name on an entry links to their
  profile, which lists everything they are credited on.
- **Everyone signed in is an admin for now.** Roles come later.
- **Capabilities (2026-11-18).** Admin powers are named capabilities
  ("Can delete entries", later "Can approve tags", "Can approve
  profiles"…), granted per account. Rules check the capability, never the
  person. Roles bundle them later. First one: deleting entries, held by
  Robert only.
- **All ContentTagger entries come across with their tags intact.** The
  two tag lists are lined up first, then merged.

## Building now, in order

Nothing queued.

## Left out on purpose

- From search: searching links, typo tolerance, and
  ranking by relevance (results stay newest first). Search does a plain
  "contains" check on titles, descriptions and credited names; past many thousands of
  entries it will need a proper search index.
- Fixing the public name of people who sign up by email link (it is
  their email address).
- From the entry-page mockup, for later: roles on credits (Publisher,
  Host), curation flags (Possibly outdated, Wrong info, Deprecated),
  the "Recent curation" history, the "5 of 7 complete" / "Still needed"
  checklist, and replies under comments.
- From "Delete entry": no undo or trash bin, no record of who deleted
  what, and no screen for granting capabilities (done in the database).
- From plain letters in titles: only titles worked out at submission are
  cleaned. A title typed on the curation page and the thumbnail card keep
  whatever letters they were given.
- From "Regenerate thumbnail": it always draws a plain title card (a real
  picture the link had is lost), doesn't revisit the link, and has no undo.

- From published dates: nobody can fix a wrong or missing date by hand,
  the feed is still ordered by when entries were added (not published),
  and an entry with no known date shows none.

## Loose ends

- `docs/data-model.md` still describes claiming as a working plan.

- The claims pages are gone from the site, but the claims tables are still
  in the live database. Remove them when the database is reworked for
  tagging.
- The test database keeps every row the tests ever made (302 entries so
  far, 190 of them from a rehearsal of the ContentTagger import). Clear it out and make the tests tidy up after themselves.
