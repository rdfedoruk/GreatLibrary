# Data Model

Status: core entities and relationships are decided, including the tagging taxonomy. Full column-level schema is not yet finalized (see Open Questions). Treat this as a strong first draft, not a final migration.

## Entities

### users
Created via Supabase Auth (Google OAuth only for v1). No password fields, no email/password flow.

### submissions
- `submitted_by` → `users.id` — fixed at submission time, never reassigned.
- `url` — the resolved, canonical URL (see browser-plugin-spec.md for per-site resolution rules)
- `description` — short, user-provided or auto-suggested (never full scraped content)
- `source_site` — which handler produced this (linkedin / youtube / sn_community / manual / generic)
- Tags — many-to-many via a join table against the tag taxonomy (see Tagging Taxonomy below)
- Creators — many-to-many via `submission_creators` (see below), not a single FK.

### content_creators
Separate from `users` — represents whoever actually made the content, independent of whether they're a platform member yet. Can be a **person** (Robert Fedoruk) or an **entity** (ServiceNow, NowBen, CJ&TheDuke) — same table, same relationships, same claim mechanics; entities are just far less likely to ever actually get claimed.

- `id`
- `display_name`
- `type` — enum: `person` / `entity`. Drives UI treatment (entity chips render distinctly from person chips) — not a behavioral fork in the schema itself.
- `linked_user_id` → `users.id`, nullable, set on successful claim. Same claim flow regardless of type.

**Revised (2026-07-18):** three fixed identity columns (`youtube_channel_id`, `linkedin_profile_url`, `sn_community_username`) didn't scale — every new platform meant another migration, and couldn't represent one creator with, say, a YouTube channel *and* a podcast *and* a Community handle. Replaced with a child table:

### creator_identities
- `id`
- `content_creator_id` → `content_creators.id`
- `platform` — youtube / linkedin / sn_community / podcast / website / etc. Open-ended — add values as new platforms come up, no schema change needed to add another identity of an existing platform type.
- `identity_value` — the channel ID / profile URL / username / domain. This is the matching key — never match on `display_name` alone (collides, changes).

One creator can hold any number of identities across any number of platforms.

### submission_creators
Who actually made a submission's content — many-to-many, since content can have co-creators (a podcast's co-hosts) or multiple attributed parties (a publisher entity *and* the person featured in it, e.g. a ServiceNow-published video featuring Robert Fedoruk).

- `submission_id` → `submissions.id`
- `content_creator_id` → `content_creators.id`

**No role field** (author / publisher / featured, etc. — considered, dropped: see removal_requests below for why it turned out unnecessary). Attribution here works like tagging: the submitter picks whichever creators they recognize, can miss someone (a co-host who doesn't get credited at first), and it's correctable later — unlike `submitted_by`, which is permanently fixed at submission time.

### claims
Tracks a user's request to link themselves to a `content_creators` record.

- `id`
- `user_id` → `users.id`
- `content_creator_id` → `content_creators.id`
- `status` — pending / approved / rejected
- Routes through the same moderation queue as submissions (see Moderation below) — no separate review system needed at current scale.

### votes
**Resolved (2026-07-17): upvote/downvote net score** (not star rating, not upvote-only). One vote per user per submission; `value` is +1 or -1, displayed as a net score. The downvote doubles as a light "wrong/outdated" quality signal alongside moderation.

### comments
- `comment_type` enum: `comment` / `suggestion` / `critique`
- Critiques may eventually carry structured sub-tags (accuracy, outdated, wrong version) rather than just freeform text — not required for v1, worth leaving room for.

### removal_requests
**Revised (2026-07-18):** two separate mechanisms, replacing the earlier "must be linked/verified to file one" rule — a single mechanism couldn't cover both a verified individual and an unclaimable entity like ServiceNow.

1. **Verified self-removal.** A creator with `linked_user_id` set (a real, claimed person) can pull content attributed to them directly. No moderation queue for this action — identity was already checked once, at claim time; re-checking it on every removal would just re-litigate a settled fact. This is also why `submission_creators` doesn't need a role field: any linked person can remove their own attributed content regardless of whether they were the "author," a "co-host," or just "featured."
2. **Open takedown request.** Anyone can file one against any `content_creators` record, claimed or not, with a required freeform reason (e.g. "I'm Ben from NowBen, please take this down"). Always goes through manual moderation, since nothing backs the identity claim. This is the realistic path for entities — nobody is likely to formally claim "ServiceNow."

- `id`
- `content_creator_id` → `content_creators.id`
- `submission_id` → `submissions.id`
- `path` — enum: `verified_self` / `open_request`. Keeps the two visually/procedurally distinct in the moderation queue, per the original design intent.
- `requested_by_user_id` → `users.id`. **Open question:** does filing an `open_request` require being logged in (any account), or fully anonymous? Not settled — see `todo.md` § Authors.
- `status` — pending / approved / rejected, for `open_request`. `verified_self` executes immediately; its row is just an audit record.
- `reason` — optional for `verified_self`, effectively required for `open_request` (there's no other basis to evaluate it on).

## Tagging Taxonomy

**Resolved for v1.** Two flat dimensions, no hierarchy, controlled vocabulary maintained directly by the admin (no governance tooling needed at current scale). Each dimension is its own `tags` table (or a single `tags` table with a `dimension` column) so the two lists don't collide in the same autocomplete. **Do not build free-text tag input** — tags are selected from the controlled list; new tags are a deliberate admin add, not user free-text.

### Dimension 1: Module / Product Area
Topic/module tags, including Career/Certification content. Granularity goes as deep as useful — a submission can carry both a broad and a specific tag (e.g. **Flow Designer** + **Flow Action** on a post about building a Flow Action).

Starter set — Core IT: ITSM, ITOM, ITBM/SPM, ITAM, CMDB/Discovery, DevOps. Platform/Dev: App Engine, Flow Designer (+ sub-tags like Flow Action), IntegrationHub, Now Assist/Agentic AI, Virtual Agent, Performance Analytics/Reporting, Platform Administration, Scripting/Server-side, UI Builder/UI Policies/Client Scripts. Business Lines: CSM, HRSD, SecOps, GRC, FSM, Source-to-Pay/Procurement. Cross-cutting: Integrations, Upgrades/Release Management, Instance Architecture/Best Practices, Career/Certification/Industry Commentary.

### Dimension 2: Medium
Strictly format, three values: **Video, Article, Podcast**. Live streams fold into Video; threads and slide decks fold into Article. Genre distinctions (tutorial vs. opinion vs. case study, etc.) are deliberately dropped, not migrated — that nuance lives in the submission's title/description, not a tag.

### Tag count
No cap per submission — unlimited tags allowed. Discipline lives in the controlled vocabulary, not a per-submission limit. **Parked for later:** if average tag count climbs, the filter/search UI will need explicit AND/OR logic — a UI concern, not a tagging-model concern.

### Deferred
- **Tag deprecation/renaming** (e.g. ITBM → SPM as ServiceNow renames products) — explicitly deferred, not forgotten. No automated versioning in v1; will be a manual/scripted fix when it's actually needed.
- **Skill Level** — considered and cut. Rarely useful in practice; not a tag or a field.

## Auth / Account Model

**Decision: Google-only sign-in for v1.**

Reasoning: target audience (ServiceNow professionals) already has Google accounts; eliminates password reset/verification/account-linking build surface; lower solo-maintenance burden; minor secondary friction against low-effort spam accounts.

Provider: Supabase Auth (bundles Google OAuth + Postgres in one service).

Revisit if: meaningful audience share is blocked from Google sign-in by corporate policy, or platform independence becomes a priority.

## Moderation

Manual at launch; communal moderation is the long-term goal, not built yet. New-user submissions and claims both route through the same manual review queue — don't build separate systems per entity type. Submission friction alone (e.g. requiring an account) is *not* sufficient anti-spam — a review queue and/or rate limits for new accounts are the intended real hedges, not yet built.
