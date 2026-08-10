# Work

Every piece of work is its own file. Files link to each other, so opening
the graph view in Obsidian shows you the shape of the project instead of
you having to hold it in your head.

## The folders

```
epics/       the big themes — things you could spend weeks on
features/    optional middle layer, only when an epic gets crowded
stories/     one buildable piece each
_templates/  copy-paste starting points
```

Start every epic by linking straight to its stories. When an epic collects
so many stories that the list stops being readable, pull the related ones
under a feature file and link the epic to that instead. Don't create
features before you need them.

## Status

Four words, no others:

- **Working** — you can use it on the live site today.
- **By hand only** — it happens, but only when Andrew edits the database.
- **Half-built** — partly there. The gap is named on the line.
- **Not started** — nothing exists.

## Adding a story

1. Copy `_templates/story.md` into `stories/` and name the file after what
   it does — `capture-who-made-this.md`, not `story-4.md`. Lowercase,
   dashes between words.
2. Fill in the properties block at the top: `status`, and `epic` pointing
   at the epic it belongs to.
3. Fill in `## Acceptance criteria` — things you could check by using the
   site, covering the happy path and the edge/error cases that matter. A
   story isn't ready to build against without these.
4. Open that epic and add the story to its `## Stories` list.

Step 4 is the one that's easy to skip. Both files have to name each other
or the link only works one way.

## Adding an epic

Copy `_templates/epic.md` into `epics/`, then add it to the list below.

## Testing

Two layers get tested, one deliberately doesn't, and a story isn't done
until both suites are green.

**1. Database rules — always tested, no exceptions.**

The rules in the migrations are what actually protect the site: one vote
per person, a URL only submitted once, entities can never log in, reads
public but writes own-row only. Every migration that adds or changes a
rule gets tests proving it both ways — the allowed thing works, the
forbidden thing is refused.

These are the tests worth having. They're cheap to write, they never
churn, and they're the only thing standing between a careless migration
and the site quietly letting anyone edit anyone's rows.

**2. Whole journeys — a short list, kept short.**

A handful of runs through a real browser, start to finish: sign in,
submit a link, vote on one, request a claim. Not one per story — one per
path that would be genuinely bad to break without noticing.

Every new journey test is a permanent maintenance cost, so the list stays
small on purpose. If a story's criteria are already covered by an
existing journey, don't add a second one.

**3. Individual screen pieces — not tested, on purpose.**

No tests for buttons, layout, styling, or single components. They change
constantly, the tests break for reasons that aren't bugs, and on a solo
project the upkeep costs more than it catches. If this turns out to be
wrong, it's easy to add later; the reverse isn't.

### Where the tests run

Against the **GreatLibraryTesting** Supabase project — same migrations,
throwaway data, nothing real in it. Same idea as a sub-prod instance:
migrations get rehearsed there before they touch the live database,
which is worth having regardless of tests.

Its URL and keys live in `.env.test`, which is gitignored and never
committed. The tests refuse to run at all if that file points at the
production project — a deliberate tripwire, since these tests create and
delete rows.

The alternative — running a copy of the database on this machine —
needs Docker Desktop installed, and it isn't. Not worth the setup.

**Applying migrations to the test project:**

```
npx supabase db push --db-url "$TEST_DB_URL" --include-all --yes
```

Two things that will waste an hour if you hit them cold:

- **A VPN will break this.** Proton VPN lets ordinary web traffic
  through but silently stalls database connections, and the error looks
  like a Supabase problem rather than a VPN one. Turn it off, push,
  turn it back on.
- **The test helpers need the classic `service_role` key**, not the
  newer `sb_secret_…` one. The new-style key is refused by the part of
  Supabase that creates test accounts, and the refusal arrives as an
  HTML error page rather than a readable message.

### What "done" means for a story

1. Every line under `## Acceptance criteria` checked by hand on the site.
2. `npm test` green — both layers.
3. A rule added to a migration has tests in the same change, not later.

If building story B breaks a test belonging to feature A, that's a real
coupling problem between the two. Fix the coupling, don't loosen the
test.

### Tools

Vitest for the database rules, Playwright for the journeys. Both are the
standard choice; neither needs a decision from you.

```
npm test         # both layers
npm run test:db  # database rules only — fast, no browser
npm run test:e2e # journeys only — starts the dev server itself
```

## Epics

- [[account-and-sign-in]] — *Working*
- [[submitting-content]] — *Working*
- [[browsing-and-voting]] — *Working*
- [[public-profiles]] — *Working*
- [[claiming-your-page]] — *Half-built*
- [[attribution-and-verification]] — *Not started*
- [[moderation-and-cleanup]] — *Half-built*
- [[keeping-content-fresh]] — *Not started*

`example-epic` and `example-story` are the original throwaway placeholders
— safe to delete now that real ones exist; left in place only because
nothing deleted them yet.

## A note on the older docs

`epics.md` has been fully migrated into this folder and deleted.
`todo.md`, `build-order.md`, and `current-state.md` are all still live and
have not been moved here. Until they are, `current-state.md` remains the
tiebreaker for what actually works today.
