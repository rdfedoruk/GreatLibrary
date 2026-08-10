---
type: story
status: Not started
epic: "[[attribution-and-verification]]"
blocked-by:
---

# Attribute a profile to a submission

**What it is.** A way to say "this submission's content was made by
{profile}" — separate from who submitted the link. This is what would
populate the empty "Content by" section on every profile page.

**Why it matters.** Submitting and creating are different things. Without
this, submitted-by is the only credit anyone can get, which means the
person who shares a link gets attributed instead of the person who made
the video or wrote the article.

## Acceptance criteria

- *(Not yet true of the app — recorded here as what "Working" would
  mean.)* From somewhere in the app (the submit form, the submission
  card, or the profile page), a submitter can attribute their own
  submission to one or more profiles.
- The attributed profile(s) appear in the "by {name}" segment of the
  submission card (see [[view-the-submission-list]]) and in that
  profile's "Content by" section (see
  [[show-content-attributed-to-a-profile]]).
- A submission can have more than one attributed profile (the data model
  is many-to-many).

## Notes

The database already allows this write for the *submitter* of a
submission — "submitters can attribute their own submissions" is a live
row-level security policy — but there is no button, form, or code path
anywhere in `src/` that calls it. This story is pure UI/wiring against an
existing policy, not new permission design, for the submitter case. The
separate case of a verified profile attributing *itself* to someone
else's submission is covered by [[self-attribute-once-verified]].

## Related

- [[attribution-and-verification]]
