# Build Order

Guiding principle: the human stays the architect on high-stakes decisions (data model, permissions, auth); Claude Code runs more freely on well-scoped implementation once those decisions exist on paper.

## Phase 0 — Design decisions (not a Claude Code task)

Done outside of implementation, before schema/code is written:
- Core data model shape (see `data-model.md`)
- Tagging taxonomy structure — **resolved, see `data-model.md`**
- Permission model (who can edit/delete submissions, comments, tags, claims)

Claude Code should not invent answers to these if asked to build something that depends on them — stop and ask instead.

## Phase 1 — Foundation (Claude Code, closely supervised)

- Supabase project setup, Google OAuth wiring
- Base schema from `data-model.md`
- **Supervision level: high.** Review every diff. Auth and schema mistakes are the expensive-to-unwind kind.
- Done when: login works end-to-end, schema enforces the constraints from `data-model.md` (foreign keys, enums, not-null where it matters).

## Phase 2 — Core CRUD (Claude Code, looser supervision)

- Manual submission form (no plugin yet)
- Tag assignment UI (Module + Medium dimensions, controlled vocabulary — see `data-model.md`)
- Upvote
- Comment threads with `comment_type` enum
- **Supervision level: low.** Well-understood patterns, low blast radius, easy to catch and fix issues before real usage.

## Phase 3 — Browser plugin (Claude Code, spec-driven, test-heavy)

- Build against `browser-plugin-spec.md`
- Order: YouTube → ServiceNow Community → LinkedIn (LinkedIn last — most unresolved questions, most fiddly)
- **Supervision level: medium.** Use Playwright for automated regression tests; use Chrome extension integration for live/manual verification against real pages.
- LinkedIn handler should not be started until the "which post" targeting question is resolved (see `open-questions.md`).

## Phase 4 — Claiming & moderation (mixed supervision)

- Content creator claim flow (see `data-model.md`)
- Removal request flow for verified creators
- Review queue for new-user submissions and claims, rate limiting
- **Supervision level: medium-high** — this touches permissions and moderation logic, worth personal review even though implementation is straightforward.

## Phase 5 — Polish / nice-to-haves

- Not yet scoped — see `open-questions.md`.
- Slot in after core loop (Phases 1–3) is proven with real usage, not before.

## Cross-phase rule of thumb

Slow down and personally review: auth, permissions, data model migrations, moderation/claim/removal logic.
Move fast, trust the verify-loop: UI, CRUD forms, extraction logic, styling.
