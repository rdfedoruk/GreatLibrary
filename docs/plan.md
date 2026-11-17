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
- **All ContentTagger entries come across with their tags intact.** The
  two tag lists are lined up first, then merged.

## Building now, in order

1. **Suggested profiles — built, not yet live.** A name typed in that has no profile yet becomes
   a *suggested* profile: shown as an outline chip, its page says
   "awaiting approval". A new Profiles tab in Curation Bounties lists them
   with Rename, Approve, Merge into an existing profile (its credits move over,
   it is deleted), and Delete. One no entry credits any more deletes
   itself. Profiles made by signing up are approved from the start.
2. **New submit form:** Link, Attributions (search profiles, or type a new
   name), Tags. The description box goes; the title comes from the link.

## Left out on purpose

- ContentTagger's search box and filtering by several tags at once. The
  feed still filters by one tag, by clicking its chip.
- Fixing the public name of people who sign up by email link (it is
  their email address).

## Loose ends

- `docs/data-model.md` still describes claiming as a working plan.

- The claims pages are gone from the site, but the claims tables are still
  in the live database. Remove them when the database is reworked for
  tagging.
- The test database keeps every row the tests ever made (302 entries so
  far, 190 of them from a rehearsal of the ContentTagger import). Clear it out and make the tests tidy up after themselves.
