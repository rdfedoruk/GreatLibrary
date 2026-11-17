# Tagging

This is the only document that decides anything about tagging. If another
file says something different, this one is right and that one needs
fixing.

It does not list the tags themselves. The vocabulary lives in the
database, in the `tags` table, and that is the only copy of it. Writing
the list down somewhere else is how it went wrong last time.

---

## How tagging works

A tag has a **kind** and a **name**. There are two kinds today:

- **Medium** — what the thing is. Video, Article, Podcast. Nothing else.
  A livestream is a Video. A thread or a slide deck is an Article.
- **Module** — what it's about. ITSM, Flow Designer, CSM, and so on.

Anyone submitting a link picks from those lists. They cannot type in a
tag of their own — the whole point of the library is that similar
content ends up under the same word, and free typing destroys that
within a month. When someone types a word that isn't there, the form
says so and offers nothing.

There's no limit on how many tags one entry can carry, and an entry can
carry none.

Tags are flat. "Flow Designer" and "Flow Action" are two separate tags
with no relationship between them: an entry about a Flow Action carries
both, because whoever tagged it picked both. Filtering by Flow Designer
does not sweep in Flow Action entries.

Nothing lists the whole vocabulary to a reader. A tag is reachable by
clicking it on an entry that already carries it.

---

## How the vocabulary changes

This is the part that was never written down, and it's where every
argument has come from.

The vocabulary is not finished and never will be. ServiceNow renames its
own products, new products appear, and real content keeps needing words
the list doesn't have — six seed entries already need seven tags that
don't exist. So changing it has to be a normal, boring thing to do, not
an event.

**Who changes it.** Anyone holding the admin role, through a screen in
the app. Not by hand-written SQL, which is the only way today. The roles
layer is already decided — see `decisions-log.md` § Roles & Admin
Access.

**Adding a tag** is the common case and needs no ceremony: pick the
kind, type the name, it's immediately available on the submit form.

**Renaming a tag** changes the name shown everywhere. Everything already
carrying it keeps carrying it. This is what ITBM → SPM needs: the tag is
about the same thing ServiceNow now calls something else, so the entries
should follow the new name automatically.

**A rename must never break a link anyone has shared.** This is a hard
rule, not a tradeoff to weigh. It means the name in the web address
can't be worked out from the display name, the way it is today —
`/?tag=itbm-spm` currently only works because "ITBM/SPM" happens to
spell that. Instead each tag gets a permanent short name for the address,
set once when the tag is created and never changed again. Rename the tag
to "SPM" and the old shared link still lands, because the address never
depended on the display name.

The cost of that rule: after a few renames, an address can look dated
next to the name on screen. That's accepted. A link that still works and
looks stale beats a tidy link that 404s.

**Removing a tag** is only allowed when nothing carries it. If entries
carry it, removal is refused and says how many — content never gets
quietly untagged. The way to retire a tag that's in use is to rename it
to whatever the thing is called now.

**Merging two tags into one** — deliberately not built. It looks like
renaming and isn't: it has to move every entry off one tag onto another
and then delete the empty one. Ask for it when two tags actually
collide.

**Submitters proposing new tags** — deliberately not built. Today they
ask Andrew and he adds it. Build the queue when the asking becomes
annoying, not before.

---

## Where it stands

Picking tags on submit and filtering by a tag both work. Changing the
vocabulary does not: the `tags` table refuses writes from everyone,
including Andrew signed in, so the only way in is the database console.
`current-state.md` is the tiebreaker on what's running.

The two changes this document asks for that don't exist yet:

1. A permanent address-name per tag, so renames stop breaking links.
   That's a schema change plus a change to how the filter looks a tag
   up.
2. The admin screen for adding, renaming, and removing tags.

Both belong to `docs/work/stories/curate-the-tag-vocabulary.md`, which
needs its rename criterion rewritten — it currently specifies a warning
screen built around the assumption that renaming breaks links.

---

## Needs Andrew's call

**A third kind of tag, for the ServiceNow release** (Xanadu, Yokohama,
version-independent). Written up in
`docs/work/stories/tag-the-servicenow-release.md`, not scheduled. The
model doesn't block it — a third kind is a new value in a list plus a
seed of names. My recommendation: not now. It's the only unbuilt thing
that would make every existing entry look incomplete.

**Whether "no free typing" survives contact with real submitters.**
Right now a submitter who wants a word that doesn't exist hits a dead
end and has to email Andrew. That's fine at six entries. It's the first
thing that will chafe at six hundred.

---

## What this replaces

These currently state tagging decisions and should stop, once this
document is agreed:

- `docs/tagging-taxonomy.md` — replaced entirely by this file, including
  its seed list, which is in the database.
- `docs/data-model.md` § Tagging Taxonomy — should keep the table shapes
  and drop the vocabulary rules.
- `docs/decisions-log.md` § Tagging — keep the *reasoning* (why free text
  and hierarchies were rejected); drop the restatement of the rules.
- `docs/todo.md` § Tagging and § Normalization — the built items belong
  in the stories, and the rename-breaks-links line is now wrong.
- `src/features/tags/api.ts:23-36` — the comment explaining why the
  address name is derived describes a decision that's been overturned.

Nothing there is deleted until you say so.
