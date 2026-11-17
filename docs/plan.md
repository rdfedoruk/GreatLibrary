# Plan

The only place work is tracked. Finished lines get deleted, not ticked.

## Decided (2026-11-16)

- **Tagging is replaced** by ContentTagger's: anyone signed in can suggest
  a tag; an admin approves, renames, merges or deletes; tags have a type.
- **Tag types are kept.** General and Version come from ContentTagger;
  Medium (Video, Article, Podcast) stays from the live site.
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
- **All ContentTagger entries come across with their tags intact.** The
  two tag lists are lined up first, then merged.

## Building now, in order

1. **Tagging — built, not yet live.** Works against the test database.
   Going live means applying the database change to production first,
   then merging the code. That step deletes the 25 unused Module tags and
   opens tag management to every signed-in account.
2. **Thumbnails and titles.** On submit, work out the title and thumbnail
   with the r6 rules, and show the thumbnail on the left of each entry.
   Adds one small server-side piece and image storage.
3. **Bring ContentTagger's 191 entries across**, with thumbnails and tags,
   submitted by Andrew's account, authors left blank.

## Left out of tagging on purpose

- ContentTagger's search box and filtering by several tags at once. The
  feed still filters by one tag, by clicking its chip.
- Picking tags while submitting. Tags are added afterwards, on the entry.

## Loose ends

- `docs/data-model.md` still describes claiming as a working plan.

- The claims pages are gone from the site, but the claims tables are still
  in the live database. Remove them when the database is reworked for
  tagging.
- The test database keeps every row the tests ever made (345 entries so
  far). Clear it out and make the tests tidy up after themselves.
