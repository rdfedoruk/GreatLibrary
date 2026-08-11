---
type: story
status: Working
epic: "[[browsing-and-voting]]"
blocked-by:
---

# Filter the list by tag

**What it is.** The tags printed on an entry become the way into
everything else carrying them. Click *Flow Designer* on "Build a flow
that's triggered on a record producer" and you get a feed of every entry
tagged Flow Designer. Today those tags are applied at submission time and
printed on each card, but there is nothing to click and no way to ask the
library a question.

**Why it matters.** Tagging is currently decoration. Every submission
carries labels nobody can search by, so the home page is a single
newest-first pile that gets less useful with every entry added. This is
the story that turns the tagging work already done into the thing the
project exists for — finding content, not just listing it.

## Acceptance criteria

- Every tag shown on an entry is clickable, both in the feed and on the
  entry's own page.
- Clicking one opens a feed of every entry carrying that tag; everything
  else disappears.
- No tag is offered anywhere except on an entry that carries it — there
  is no list of the vocabulary above the feed.
- A filtered feed names the tag it is showing, and offers a way back to
  everything.
- A filtered card still shows all of its own tags, each still clickable,
  not just the one being filtered on.
- A filtered view has its own address (`/?tag=flow-designer`) that can be
  copied, shared, and reopened, and the browser's back button returns to
  the previous view.
- Opening a filtered address directly, in a fresh browser with no history,
  lands on that filtered view.
- An address naming a tag that doesn't exist shows the "nothing here"
  message rather than a broken screen or the whole unfiltered library.
- An address naming a real tag that nothing carries — reachable only by
  typing it, since nothing links to it — shows a plain message naming the
  tag, distinct from the empty-library message on a fresh install.
- Voting and Discuss still work normally from a filtered list.
- Submitting a new entry while a filter is active does not silently drop
  it out of sight without explanation.
- Profile pages, which already filter by submitter and by attributed
  creator, behave exactly as they do now.
- If the list fails to load while filtered, the existing "Couldn't load
  the library" message appears rather than a blank screen.

## Notes

- **Changed direction 2026-08-11, mid-build.** The first version put a row
  of chips for every tag in use above the feed. Andrew rejected it: the
  way in should be the tag on the entry you're already reading, not a
  vocabulary list bolted to the top of the page. The chip bar is gone, the
  chips on the cards are the entrance, and the "only tags in use are
  offered" criterion dissolved — a tag can only be clicked where it's
  already printed, so an empty feed isn't reachable by clicking at all.
- **Scope lever, Andrew's call.** Written as *one tag at a time*. Several
  tags at once (Flow Designer **and** Video) means deciding whether that
  means and-or-or, which `decisions-log.md` already parks until average
  tags per submission climbs. Starting with one keeps that parked.
- **Source-site filtering is deliberately not here.** It's the other half
  of the epic's open question and can follow the same pattern once this
  one is proven.
- **The name in the URL is derived from the tag's display name**, not
  stored — `ITBM/SPM` becomes `itbm-spm`, matched back case-insensitively.
  Decided 2026-08-11, no schema change. Five seeded tag names contain a
  slash, which is why the raw name can't be used. The accepted cost:
  renaming a tag breaks any link shared under its old name — the same
  tradeoff already taken for profile slugs. If two tags ever derive the
  same URL name, that's the signal to store a permanent one per tag
  instead.
- **Implementation trap.** `SubmissionList.tsx` names the filter's fields
  one by one in its refresh trigger rather than watching the whole filter.
  A new field added to `SubmissionFilter` that isn't added there too will
  look like it works and then quietly fail to refetch.
- **Second trap.** `fetchSubmissions` narrows by attributed creator and by
  tag in a separate lookup each, not an `!inner` join filter, so the tags
  and creators embedded in each returned row aren't narrowed to just the
  one matched on. Undo that and every filtered card shows a single tag.
- Deliberately not built: sorting (top-rated, most discussed), free-text
  search, and combining a tag filter with a profile page's filter.

## Related

- [[browsing-and-voting]]
- [[tag-a-submission]] — applies the tags this story makes useful
- [[view-the-submission-list]] — the list this filters
