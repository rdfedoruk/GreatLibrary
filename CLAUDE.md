# The Great Library (working title)

A curation database and community app for ServiceNow content — submitting, finding, tagging, rating, and discussing it. Solves the problem that good ServiceNow content is scattered across LinkedIn, YouTube, ServiceNow Community, and private blogs with no quality-filtered, well-tagged central resource.

Built solo. Optimize for low maintenance burden over feature completeness. When in doubt, prefer the smaller/simpler option and flag the tradeoff rather than silently building the bigger version.

## Who you're talking to

Andrew is the **product owner, not a full-stack developer.** He decides what gets built and why; you decide how. Deep ServiceNow expertise, limited web/front-end background.

- **No unexplained jargon.** Terms like design tokens, CSS variables, component library, bundler, hydration, or migration mean nothing to him. Say what a thing does in plain words, or don't name it at all.
- **Frame choices as product tradeoffs**, not technical ones: what it costs, what it gets you, what breaks later. Don't ask him to arbitrate between technical approaches — recommend one and say why.
- **ServiceNow analogies land.** Reach for them when explaining an unfamiliar web concept.
- **Short replies, one step at a time.** A few sentences beats a structured multi-section summary. Wait for a response before the next step.

## Tech Stack

- **Backend/Auth/DB:** Supabase (Postgres + Auth combined)
- **Auth:** Google OAuth **plus** dedicated email sign-in (magic-link/OTP, no password) — revised 2026-07-18 after user feedback; Google-only did not survive contact with the target audience. Password-based sign-in may be added later as an additive third option, not a redesign. See `docs/decisions-log.md` § Auth / Account Model.
- **Browser plugin:** Chrome Manifest V3, per-site content scripts. See `docs/browser-plugin-spec.md`.
- **Testing:** Playwright (official Claude Code plugin) for browser/plugin flows; standard test runner for backend logic — confirm framework choice at Phase 1 setup if not already decided.

## Reference Docs — read before working in these areas

- `docs/work/README.md` — how epics, features, and stories are tracked. Read before creating or updating any work item.
- `docs/data-model.md` — schema for submissions, tags, users, votes, comments, content_creators, claims. Read before touching anything schema-related.
- `docs/browser-plugin-spec.md` — per-site extraction rules for LinkedIn, YouTube, ServiceNow Community. Read before building or modifying any site handler.
- `docs/build-order.md` — phased build plan and what supervision level each phase needs.
- `docs/open-questions.md` — unresolved design decisions. If a task touches one of these, stop and ask rather than assuming an answer.

## Architecture — keeping features independently changeable

The goal: any single feature (votes, comments, claims, etc.) can be rewritten or deleted without touching the others. Enforced by these rules:

- **Postgres is the contract between features.** Invariants live in the schema — foreign keys, enums, unique constraints (e.g. one vote per user per submission), not-nulls, and Supabase Row Level Security for permissions. Never enforce a data rule only in app code when the database can enforce it.
- **Organize by feature, not by layer.** Code lives in `src/features/<feature>/` (submissions, votes, comments, tags, claims, moderation). No generic `utils/`/`helpers/` dumping grounds. `src/lib/` holds only truly shared infrastructure: the Supabase client and auth helpers.
- **Features don't import each other's internals.** Cross-feature references go by ID (e.g. comments take a `submission_id`), or through the small public interface a feature explicitly exposes (one file per feature declaring its exported functions/components). If a change requires reaching into another feature's folder, stop — that's a design smell worth flagging.
- **The browser plugin talks to the app through exactly one channel** (a submit endpoint or prefilled submission-page URL). It never touches the database directly. Inside the plugin, site handlers stay isolated in the registry — a change to one site's extraction never touches another handler.
- **Schema changes only via numbered migration files**, applied in order, never edited after the fact.
- **Existing tests are the cross-feature regression fence.** When building feature B, a failure in feature A's tests means the seam was violated — fix the coupling, don't just patch the test.
- **No premature abstraction.** No generic entity managers, service layers, or configurability for things that don't vary yet. Feature folders + DB constraints + the narrow plugin channel *is* the architecture; anything fancier needs a reason and a flag to the user.

## Tracking Work

Work items live in `docs/work/` — one markdown file each, linked to one another so the whole thing renders as a graph in Obsidian. `docs/work/README.md` is the entry point and explains the folders, the four status words, and how to add an item. Read it before creating or editing anything in there.

- **Before building, look for the story.** If a task has a story file, read it and work to its "Done when" list. If it doesn't, ask whether to write one first — don't create epics or stories unprompted, and don't build against an imagined one.
- **Status is Andrew's call, not a side effect of committing.** When work lands, say so and propose the status change; don't silently flip a story from *Not started* to *Working*.
- **Only four status words exist:** Working, By hand only, Half-built, Not started. Don't invent a fifth.
- **Links go both ways.** A new story names its epic in the properties block, *and* gets added to that epic's `## Stories` list. One without the other is a half-made link.
- **Filenames are the IDs** — kebab-case and descriptive (`capture-who-made-this.md`). Never number them; numbering is what broke the old `epics.md`.
- **Every story needs acceptance criteria.** A checklist under `## Acceptance criteria` of things you could check by using the site — true or false, no judgment call. Cover the happy path plus the edge cases and error states that matter, not just the ideal case. A story without these isn't ready to build against; see `docs/work/_templates/story.md`.

**This folder now holds the real epic/story graph.** `docs/epics.md` has been fully migrated in and deleted. `docs/todo.md`, `docs/build-order.md`, and `docs/current-state.md` are still live and not yet migrated — keep reading them for context, and treat `docs/current-state.md` as the tiebreaker for what actually works today.

## Working Conventions

- **Verify before reporting done.** After any change, run the relevant test suite (or write tests first if none exist for the touched area) and iterate until green before saying a task is complete.
- **Data model changes are high-stakes.** Schema/migration changes, auth logic, and permission checks should be flagged clearly in your summary of changes — don't bury them in a large diff. These are the areas most likely to get close human review, so make them easy to find.
- **Don't invent scope.** If a task seems to require a design decision not covered in `docs/`, stop and ask rather than picking a reasonable-sounding default — this project has a habit of under-scoping deliberately (see build-order.md), and silently adding scope works against that.
- **Content ownership is a real constraint, not a suggestion.** The browser plugin only ever captures a URL and a short description — never full page content, never scraped post text. Don't "improve" this by pulling more data without being asked.
- **Naming:** "The Great Library" is a working title — don't hardcode it deeply into things that would be painful to rename later (package names, DB names) without flagging it.

## Build Order

See `docs/build-order.md` for the full phased plan. Short version: data model and tagging taxonomy are locked in as design decisions before implementation starts (Phase 0, not a Claude Code task) — both are now resolved, see `docs/data-model.md`. Core CRUD is the highest-confidence area to build fast. Auth, permissions, and the browser plugin's LinkedIn handler get the most scrutiny.
