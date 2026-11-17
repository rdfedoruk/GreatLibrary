# The Great Library (working title)

A curation database and community app for ServiceNow content — submitting, finding, tagging, rating, and discussing it. Good ServiceNow content is scattered across LinkedIn, YouTube, ServiceNow Community, and private blogs; this is the quality-filtered, well-tagged place to find it.

Built solo. Prefer the smaller, simpler option, and say what was left out rather than quietly building the bigger version.

## Who you're talking to

Andrew is the **product owner, not a full-stack developer.** He decides what gets built and why; you decide how. Deep ServiceNow expertise, limited web/front-end background.

- **No unexplained jargon.** Say what a thing does in plain words, or don't name it.
- **Frame choices as product tradeoffs:** what it costs, what it gets you, what breaks later. Don't ask him to pick between technical approaches — recommend one and say why.
- **ServiceNow analogies land.**
- **Short replies, one step at a time.** A few sentences, then wait for a response.

## Where things are written down

There are exactly three live documents. Nothing else decides anything.

- `docs/plan.md` — what is being built now, what is decided, and what is waiting on Andrew. The only place work is tracked. Keep it short; when something is finished, delete its line rather than adding a status.
- `docs/data-model.md` — what the database holds. Where it disagrees with the files in `supabase/migrations/`, the migrations are right and the doc needs fixing.
- `docs/deployment.md` — how code and database changes reach the live site.

**`docs/archive/` is history, not instructions.** It holds the old stories, epics, to-do list, decisions log and current-state write-up from before the 2026-11-16 reset. Do not read it, cite it, or treat anything in it as decided unless Andrew asks. Comments in the code that point at old `docs/...` paths mean files now in the archive.

Don't create new tracking or planning documents. If something needs recording, it goes in `docs/plan.md`.

## How it's built

- **Website:** React + TypeScript, built with Vite, hosted on Vercel at greatlibrary.theduke.digital.
- **Database and sign-in:** Supabase (Postgres). Sign-in is Google or an emailed link; no passwords.
- **Tests:** `npm test` runs the database-rule checks (Vitest) and the click-through journeys (Playwright) against a separate test database, never production.

Rules that keep one feature from breaking another:

- **Data rules live in the database**, not only in app code — uniqueness, required fields, and who may read or write what.
- **Code is organised by feature** in `src/features/<feature>/`. `src/lib/` holds only the Supabase connection and sign-in helpers. A feature uses another feature only through that feature's `index.ts`.
- **Database changes go in new numbered files** in `supabase/migrations/`. Never edit one that has already been applied.
- **No machinery for things that don't vary yet.**

## Working rules

- **Verify before saying done.** Run the tests for what you touched; write them first if there are none.
- **Check before claiming you can't.** Look for credentials already on the machine (`.env`) and try the tool before sending Andrew to a dashboard. See `docs/deployment.md`.
- **Read the code before recommending a design.**
- **Flag the high-stakes changes plainly:** database structure, sign-in, and permissions. Never bury them in a long summary.
- **Don't invent scope.** If a task needs a product decision that `docs/plan.md` doesn't cover, ask.
- **Raise a concern once, then build what was asked.**
- **"The Great Library" is a working title.** Don't bake it into anything painful to rename.
