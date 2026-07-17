# Data Model

Status: core entities and relationships are decided, including the tagging taxonomy. Full column-level schema is not yet finalized (see Open Questions). Treat this as a strong first draft, not a final migration.

## Entities

### users
Created via Supabase Auth (Google OAuth only for v1). No password fields, no email/password flow.

### submissions
- `submitted_by` → `users.id` — fixed at submission time, never reassigned.
- `content_creator_id` → `content_creators.id` (nullable until matched)
- `url` — the resolved, canonical URL (see browser-plugin-spec.md for per-site resolution rules)
- `description` — short, user-provided or auto-suggested (never full scraped content)
- `source_site` — which handler produced this (linkedin / youtube / sn_community / manual / generic)
- Tags — many-to-many via a join table against the tag taxonomy (see Tagging Taxonomy below)

### content_creators
Separate from `users` — represents whoever actually made the content, independent of whether they're a platform member yet.

- `id`
- `display_name`
- `linked_user_id` → `users.id`, nullable, set on successful claim
- Identity signals for matching (not just free-text name): `youtube_channel_id`, `linkedin_profile_url`, `sn_community_username`. These are the matching keys — display names collide and change, so don't match on name alone.

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
Distinct from a normal critique/moderation flag. A **verified creator** (one with `linked_user_id` set) can request removal of content attributed to them. This carries more procedural weight than an ordinary community flag and should be visually/procedurally distinguished in the moderation queue rather than mixed in with routine flags.

- `id`
- `content_creator_id` → `content_creators.id` (must be linked/verified to file one)
- `submission_id` → `submissions.id`
- `status` — pending / approved / rejected
- `reason` (optional freeform)

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
