# To-Do

Organized by feature area (mirrors `src/features/`). Each item starts as just
a title; detail gets added under it as it firms up, or linked to where it's
already written elsewhere. **DECISION NEEDED** marks anything CLAUDE.md's
"stop and ask" rule applies to — don't build past that marker without
checking in first.

## Accounts

- **Logging in — redesign to add dedicated account creation.** DECIDED
  2026-07-18: Google-only didn't survive contact with the real user base;
  audience prefers dedicated accounts. Cost accepted (password reset, email
  verification, account-linking, breach liability all back in scope). See
  `decisions-log.md` § Auth / Account Model.
  - DECIDED 2026-07-18: hybrid, not a replacement — Google OAuth stays,
    dedicated email-based sign-in added alongside it (reference: Anthropic/
    OpenAI's own "Continue with Google / OR / email" pattern).
  - DECIDED 2026-07-18: start with magic-link/OTP (no password, avoids reset
    flows + breach liability — the thing the original decision was trying to
    avoid in the first place). Password-based sign-in can be added later as
    an additive second option if users ask for it — Supabase treats these as
    separate providers against the same accounts, not a redesign.
  - DECIDED 2026-07-18: magic-link (click-through), not OTP code entry —
    simpler UX, no code-input UI needed. Built in `src/lib/auth.ts`
    (`signInWithEmail`) and the email form in `App.tsx`.
  - Migration: not a concern — only one account exists (Robert Fedoruk), and
    he's staying on Google sign-in.
  - **Not designed yet: session length / "remember me" control.** Currently
    just Supabase Auth's default persistent session (`persistSession: true`,
    long-lived refresh token) — same for everyone, no shared-device option.
    Revisit if it matters for shared/public-computer use.
  - Cosmetic (separate, minor, only matters if Google stays): sign-in screen
    shows the raw Supabase URL, not the app's own domain. Fix needs a custom
    domain plus Supabase's paid custom-domain add-on.
- **Profile page** — BUILT (2026-07-18): `/profile/:slug` in
  `src/features/profiles/` — name, claimed ✓, entity chip, attributed
  content, submitted content. Slug decision: readable slug, changeable
  (the permanent identity is the profile id; the slug is just the name on
  the door — Andrew's challenge to "URLs are forever," accepted).
  - **Backlog: retired-slug forwarding** — when a slug changes, keep the
    old slug in a lookup table pointing at the profile id so old external
    links still land. Cheap, do it when slug *editing* gets built.
  - **Backlog: slug editing UI** — no way to change a slug in-app yet
    (admin can via SQL). Build alongside display-name editing.
  - Note: the email test account's slug is `rdfspeaks-gmail-com` (display
    name defaults to the email address for magic-link signups) — fix by
    editing display name + slug when that UI exists.
- **Avatar scraping / editing** — not designed yet. **DECISION NEEDED:** pull
  from the Google account, let users upload their own, or both?

## Authors

> **2026-07-18 — Unified Profiles redesign supersedes the terminology below.**
> `content_creators` no longer exists as a separate table: one `profiles` table
> covers members, creators, and entities; `creator_identities` is now
> `profile_identities`; `submission_creators` is now `submission_attributions`;
> new `entity_members` table (claimed people act for entities, which never log
> in); new `merged_into` column for the joined-before-claiming duplicate case.
> See `data-model.md` § The Identity Model and `decisions-log.md` § Unified
> Profiles. The items below remain valid as feature intents; read their table
> names through that mapping. Migration applied 2026-07-18
> (`20260718000003_unified_profiles.sql`) — the live schema has the new shape.

- **Content claiming** — designed, not built (Phase 4). Matched by platform
  identity keys via `creator_identities` (channel ID, profile URL — never
  display name), claim requests go through the moderation queue for manual
  approval. Full flow in `decisions-log.md` § Content Creators & Claiming.
- **Multi-platform creators** — DECIDED 2026-07-18: one creator can hold
  identities across any number of platforms (YouTube + SN Community +
  podcast, etc.) via `creator_identities`, replacing the old fixed-column
  approach. See `data-model.md` § content_creators.
- **Co-created / multi-attributed content** — DECIDED 2026-07-18: a
  submission links to multiple creators via `submission_creators`
  (many-to-many), not a single `content_creator_id`. Works like tagging —
  submitter picks whoever they recognize, can miss someone, correctable
  later. No role field (author/publisher/featured — considered, dropped,
  see `data-model.md` § removal_requests for why). See `data-model.md` §
  submission_creators.
- **Entities as creators** — DECIDED 2026-07-18: `content_creators` gets a
  `type` (person / entity), so publishers/shows (ServiceNow, NowBen,
  CJ&TheDuke) can have their own profile alongside individual people. Same
  table, same claim mechanics — entities are just unlikely to ever actually
  be claimed. UI: entity chips render in a distinct color/style from person
  chips — not built yet.
- **De-publish (verified self-removal)** — DECIDED 2026-07-18: a linked
  creator removes their own attributed content directly, no moderation gate
  (identity already checked at claim time). Small, settled.
- **Open takedown request** — its own line item now, not just a sub-case of
  de-publish: anyone can file one against any creator record, always
  moderator-reviewed. The realistic removal path for entities (nobody's
  likely to formally claim "ServiceNow"). Not designed yet:
  - Current `removal_requests` schema (`content_creator_id`,
    `submission_id`, `path`, `status`, freeform `reason`) is too thin for a
    real intake — needs actual questions (who are you, what's your
    relationship to this content, what's your evidence), plus somewhere to
    store the moderator's investigation/decision trail.
  - Still surfaces through the existing moderation queue, not a separate
    `src/features/` folder — stays consistent with "one queue, not a system
    per entity type" (`data-model.md` § Moderation).
  - **DECISION NEEDED:** does filing one require a logged-in account, or
    fully anonymous?
- **Stronger creator verification** — v2 idea, not needed yet. v1 is manual
  review; if that stops scaling, consider OAuth into the YouTube Data API to
  confirm channel ownership.

## Content

- **Submission form** — done (Phase 2).
- **Browser plugin submission** — not started (Phase 3). See
  `browser-plugin-spec.md`. Build order: YouTube → Community → LinkedIn.
  - **DECISION NEEDED:** LinkedIn "which post" targeting — cursor/viewport
    detection vs. an injected per-post button. Blocks the LinkedIn handler.
  - ServiceNow Community URL structure needs investigation (session/
    view-state params?) before that handler can be finalized.
  - Additional site handlers (X/Twitter, Reddit, generic blogs) — not scoped.
- **Hide until authorized** — new-user submissions held in a review queue
  before going live. Noted as a spam hedge in `decisions-log.md` §
  Moderation; not designed as schema/UI yet.
- **Comment threads** — Phase 2 item, not built yet. `comment_type` enum
  (comment / suggestion / critique).
- **Thumbnails** — should "just work" regardless of source; show the best
  available thumbnail for the content type. Different functions behind the
  scenes per source, invisible to the user.
  - YouTube: free — thumbnail URL is derivable from the video ID, no
    scraping, no schema change.
  - Other sources: **DECISION NEEDED** — needs a server-side fetch (same
    Edge Function as "Auto-fetch linked content's title" below), and pulls
    `og:image` from the page, which brushes against the content-ownership
    constraint (arguably fine, same category as the already-sanctioned
    title auto-suggest — but a call worth making explicitly, not assuming).
- **Auto-fetch linked content's title** — needs a Supabase Edge Function
  (first server code in the project — browsers block cross-origin fetches).
  **DECISION NEEDED:** does the title become a new `submissions` column, or
  just a suggestion pasted into the description? Schema change, flag it.
- **Creator attribution on manual submissions** — currently not captured.
  Superseded by the Authors § co-created content redesign: submitter picks
  creators from an autocomplete (same pattern as tag selection), can miss
  someone, correctable later. Auto-deriving a first guess from the URL
  (YouTube oEmbed gives the channel) is a nice-to-have on top of that, not
  required. The oEmbed part depends on the title-fetch edge function above.
- **DECISION NEEDED — submission description source:** user-written at
  submission time vs. auto-suggested from page metadata with edit. Leaning
  auto-suggest for completion rate, not locked in.
- **Sessions (conference talks) as a content type** — idea from
  news.jace.pro. Would need its own shape (event, date, speaker). Not scoped.
- **MVPs by year** — same source. Unclear if it's a tag, a content type, or a
  creator attribute. Not scoped.

## Tagging

- **Tag input + autocomplete** — done.
- **Tag removal by chip button only** — settled.
- **Tag hierarchy** — flag: conflicts with a locked v1 decision in
  `tagging-taxonomy.md` (flat, two dimensions, no hierarchy — explicitly
  rejected as over-engineered for solo-curator scale). Worth a conversation
  before treating this as open again, rather than just building it.
- **AND/OR tag filtering** — parked in `decisions-log.md`: only needed if
  average tag count per submission climbs. Not designed.
- **Synonyms** — new idea, not designed (e.g. "ITBM" and "SPM" meaning the
  same thing to a searcher).
- **Normalization / renaming** — ServiceNow renames products almost every
  release (ITBM → SPM is the live example). No automated versioning for v1;
  manual fix when it actually bites. See `tagging-taxonomy.md`.
- **Suggested tags** (tag proposal queue) — submitters propose freely,
  proposals sit in a holding area, an admin merges into an existing tag,
  promotes it into the vocabulary, or rejects it. **DECISION NEEDED:** shape
  of a `tag_proposals` table; also depends on the admin role below.

## Administrata

- **Admin role** — **DECISION NEEDED.** Doesn't exist yet in schema/RLS.
  Blocks: tag proposal reconciliation, claim approval, moderation queue,
  creator removal requests.
- **Moderation / review queue** — new-user submissions and claims held for
  manual review; rate limiting considered for new accounts. Not built
  (Phase 4).
- **Normalization: content attributions** — admin-side correction of
  misattributed content. Same mechanism as regular attribution now (editing
  `submission_creators`), just admin-initiated instead of submitter-initiated
  — no longer a separate design question.
- **Normalization: proposed tags** — admin side of the tag-proposal queue
  above.

## Other

- **news.jace.pro as a cold-start seed source** — ~52,000 aggregated items
  covering Community/YouTube/blogs. Check terms of service / robots.txt
  before relying on it.
