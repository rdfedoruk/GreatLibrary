---
type: story
status: Not started
epic: "[[keeping-content-fresh]]"
blocked-by:
---

# Tag the ServiceNow release

**What it is.** A third kind of tag, alongside module and medium, naming
the ServiceNow release a piece of content is about — Xanadu, Yokohama,
Zurich, and so on — plus a way to say a piece isn't tied to any release
at all. Submitters pick it the same way they pick the other tags, and
readers can filter by it.

**Why it matters.** ServiceNow content ages on a schedule. A brilliant
Vancouver walkthrough may be actively wrong three releases later, and
right now there's no way to tell without opening it. This is also the
honest version of the "outdated" flag the research suggested: a fact
about the content rather than a vote against it.

## Acceptance criteria

- The submit form shows a release picker alongside the existing module
  and medium pickers, drawing from the controlled list.
- A submission can carry more than one release tag (content covering two
  releases), and can carry none.
- Release tags show on submissions in the list, visually distinct from
  module and medium tags.
- The list can be filtered to one release, the same way it filters by the
  other tag kinds.
- The release list can't be typed into freehand — only picked from the
  controlled vocabulary, same rule as the other two dimensions.
- Existing submissions, which have no release tag, still display and
  filter correctly.
- Filtering by a release returns only submissions carrying that tag, and
  says so plainly when nothing matches.

## Notes

- **Seed list**, to be pruned by Andrew after it lands: Vancouver,
  Washington DC, Xanadu, Yokohama, Zurich, plus **Version-independent**
  for evergreen content. Claude's release-name knowledge may be stale
  past Zurich — anything newer is Andrew's to add.
- **Implementation gotcha.** `tag_dimension` is a Postgres enum. Adding a
  value and inserting rows that use it cannot happen in the same
  migration/transaction — Postgres rejects it. Two numbered migrations:
  one adds the value, the next seeds the rows.
- **Docs to update when this lands** (they currently say "two
  dimensions", resolved): `docs/tagging-taxonomy.md`,
  `docs/data-model.md` § Tagging Taxonomy, `docs/decisions-log.md`.
- Deliberately not built: inferring the release from the content or its
  publish date, warning readers that a release is old, or auto-expiring
  anything. The tag states a fact; the reader decides what it means.

## Related

- [[keeping-content-fresh]]
- [[tag-a-submission]] — the existing two-dimension tagging this extends
