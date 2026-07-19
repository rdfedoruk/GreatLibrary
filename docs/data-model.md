# Data Model

Status: core entities and relationships are decided, including the tagging taxonomy and the unified-profiles identity model (revised 2026-07-18, superseding the earlier users-vs-content_creators split). Full column-level schema is not yet finalized (see Open Questions). Treat this as a strong first draft, not a final migration.

Applied to the live schema by `supabase/migrations/20260718000003_unified_profiles.sql` (2026-07-18); `src/lib/database.types.ts` regenerated to match.

## The Identity Model (revised 2026-07-18)

**One page per public identity.** Every person or entity that appears on the site — a creator, a company, a podcast, or an ordinary member — has exactly one `profiles` row, which backs one public page with a stable URL. There is no separate "content creator" object; the profile *is* the creator record, whether or not anyone has logged in behind it.

Plain-English version of the whole design (canonical explanation lives in `decisions-log.md` § Unified Profiles):

- A page can exist before its person joins — created the first time content is attributed to them.
- Joining the site never creates a *second* public identity for someone who already has a page; claiming attaches a login to the page that already exists. Same URL, same content — the page just gains a claimed badge, an editable bio, and the owner's rights.
- Members who sign up fresh (never pre-attributed) get the same shape of page, just born already-claimed. There is only one kind of person-page on the site.
- Entities never log in. Real, claimed people are linked to them as members and act on their behalf.

### profiles
The single public-identity table. Replaces both the old `profiles` and `content_creators` tables.

- `id`
- `display_name`
- `type` — enum: `person` / `entity`. Drives UI treatment (entity chips/pages render distinctly) — not a behavioral fork in the schema, with one exception: only `person` profiles can be claimed.
- `linked_user_id` → Supabase `auth.users.id`, nullable. Set when a person claims the profile (or immediately at signup for a fresh member). **Always null for entities — permanently.** One auth user links to at most one profile.
- `merged_into` → `profiles.id`, nullable. Tombstone pointer for the duplicate-page case (see Merging below). A profile with this set is retired; anything resolving it should follow the pointer.
- `created_at`

### profile_identities
How we know which platform accounts belong to a profile. Replaces the earlier `creator_identities` name and, before that, the fixed identity columns (`youtube_channel_id`, etc.), which couldn't scale — every new platform meant a migration, and one creator can hold many identities.

- `id`
- `profile_id` → `profiles.id`
- `platform` — youtube / linkedin / sn_community / podcast / website / etc. Open-ended; new platforms are new rows, never schema changes.
- `identity_value` — the channel ID / profile URL / username / domain.

- `verified` / `verified_at` — **added 2026-07-18.** Whether the platform itself vouched for this identity.

These rows do two jobs:
1. **Attribution matching** — a submitted YouTube video's channel ID routes it to the right profile automatically. Never match on `display_name` alone (collides, changes).
2. **Claim evidence** — when someone claims a profile, these identities are what the moderator is verifying they actually control.

### Verified vs. asserted identities (2026-07-18)

Typing "this channel is mine" proves nothing — anyone can type someone else's channel and pull their content onto their own page. So identities come in two kinds:

- **Verified** — the platform confirmed it. Earns automatic attribution, and is the only kind safe to build removal rights on later.
- **Asserted** (typed) — inert. Doesn't pull in content, doesn't lock anyone out, displays as unchecked.

Rules that enforce this:
- `verified` can only be set by the `verify-youtube` Edge Function via the service role key. The user-facing insert policy has `with check (verified = false)`. A client-side check would be forgeable, and a badge that means nothing is worse than no badge.
- The unique constraint on `(platform, identity_value)` is now a **partial** index covering only verified rows. The old blanket constraint let a squatter type someone else's channel and permanently lock the real owner out of ever proving it.
- Self-attribution requires the profile to hold at least one verified identity.

**What can actually be verified** (researched 2026-07-18):

| Platform | Provable? | Content scan? |
|---|---|---|
| YouTube | Yes — Google sign-in returns the channel the account owns | Yes (oEmbed, built) |
| Podcast | Yes — Apple-style code placed in the RSS feed (not built) | Yes — one feed fetch lists every episode |
| Website | Yes — DNS record or well-known file (not built) | Yes — URLs on that domain |
| LinkedIn | **No** — sign-in returns a pairwise id and no public profile URL; reading posts needs partner-only API access | **No** |
| SN Community | Not investigated | Not investigated |

The general principle, taken from how Yelp and Apple Podcasts do it: verify **control of the asset**, checked against something already on the record — never identity of the person, and never a value the claimant typed during the claim.

### entity_members
Who can act for an entity. Entities are never claimed; instead, claimed *people* are linked to them.

- `entity_id` → `profiles.id` (type = entity)
- `person_id` → `profiles.id` (type = person)

A claimed person who is a member of an entity can act on its behalf (removal requests, bio edits). Verification stays human-scale: you verify a *person* once (their own claim), then eyeball their relationship to the entity — you never have to "verify ServiceNow." Doubles as public info: the entity page lists its members ("Hosts: CJ, TheDuke"), and each person's page lists their entities.

ServiceNow-the-company stays memberless and unclaimed forever, which is fine — takedowns on its behalf go through the open-request moderation path.

### Claiming
Person-only. There is **no automatic join key** between an email signup and a pre-existing page — emails won't match, names collide. The connection is always an explicit claim, manually verified:

1. User signs up (name + email, or Google).
2. Signup flow asks "are you any of these people?" — a search over unclaimed person profiles. This catches most claims at the door and avoids the merge case below.
3. Claim request routes through the same moderation queue as submissions (no separate review system at this scale). Admin verifies against `profile_identities` and approves.
4. On approval, `profiles.linked_user_id` is set. All existing and future attributed content displays as the now-claimed page retroactively — no submission rows touched.

#### claims
- `id`
- `user_id` → `auth.users.id`
- `profile_id` → `profiles.id` (must be type = person, unclaimed)
- `status` — pending / approved / rejected
- `created_at`

### Merging (the Mark-commented-first case)
If someone signs up and is active *before* claiming, they have two pages: a young member page (a few comments/votes) and an old attributed page (the heavy one, with inbound links). The fix is asymmetric, not a true merge: keep the attributed page, repoint the auth user's link to it, move the member page's few activity rows over (`UPDATE ... SET profile_id`), and set `merged_into` on the retired member page so stray links redirect.

Collision edge (e.g. he upvoted his own attributed submission from the member account, tripping one-vote-per-user): on conflict, keep one, drop the other. Rare, admin-initiated, acceptable at this scale. The signup-time "are you one of these?" prompt is the real mitigation.

## Content Entities

### submissions
- `submitted_by` → `profiles.id` — the member who found and posted the link. Fixed at submission time, never reassigned. (Note: references the profile, not the auth user — this is what lets a person's member activity and authored content live on one page.)
- `url` — the resolved, canonical URL (see browser-plugin-spec.md for per-site resolution rules)
- `description` — short, user-provided or auto-suggested (never full scraped content)
- `source_site` — which handler produced this (linkedin / youtube / sn_community / manual / generic)
- Tags — many-to-many via a join table against the tag taxonomy (see Tagging Taxonomy below)
- Attribution — many-to-many via `submission_attributions` (below), not a single FK.

### submission_attributions
Who actually made a submission's content — many-to-many (replaces the interim `submission_creators` name). Content can have co-creators (a podcast's co-hosts) or multiple attributed parties, including an entity *and* its people: one episode shows up on the podcast's page and on both hosts' pages.

- `submission_id` → `submissions.id`
- `profile_id` → `profiles.id`

**No role field** (author / publisher / featured — considered, dropped: see removal_requests below for why it turned out unnecessary). Attribution works like tagging: the submitter picks whichever profiles they recognize, can miss someone, and it's correctable later — unlike `submitted_by`, which is permanently fixed.

### votes
**Resolved (2026-07-17): upvote/downvote net score** (not star rating, not upvote-only). One vote per profile per submission; `value` is +1 or -1, displayed as a net score. The downvote doubles as a light "wrong/outdated" quality signal alongside moderation.

### comments
- `comment_type` enum: `comment` / `suggestion` / `critique`
- References `profiles.id` for the author.
- Critiques may eventually carry structured sub-tags (accuracy, outdated, wrong version) rather than just freeform text — not required for v1, worth leaving room for.

### removal_requests
Two separate mechanisms (revised 2026-07-18) — a single mechanism couldn't cover both a verified individual and an unclaimable entity like ServiceNow:

1. **Verified self-removal.** A claimed person can pull content attributed to them directly — and, via `entity_members`, content attributed to an entity they belong to. No moderation queue for this action — identity was already checked once, at claim time. This is also why `submission_attributions` doesn't need a role field: any linked person can remove their own attributed content regardless of whether they were the "author," a "co-host," or just "featured."
2. **Open takedown request.** Anyone can file one against any profile, claimed or not, with a required freeform reason ("I'm Ben from NowBen, please take this down"). Always goes through manual moderation, since nothing backs the identity claim. This is the realistic path for memberless entities.

- `id`
- `profile_id` → `profiles.id`
- `submission_id` → `submissions.id`
- `path` — enum: `verified_self` / `open_request`. Keeps the two visually/procedurally distinct in the moderation queue.
- `requested_by_user_id` → `auth.users.id`. **Open question:** does filing an `open_request` require being logged in, or fully anonymous? Not settled — see `todo.md` § Authors.
- `status` — pending / approved / rejected, for `open_request`. `verified_self` executes immediately; its row is just an audit record.
- `reason` — optional for `verified_self`, effectively required for `open_request`.

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

**Decision (revised 2026-07-18): hybrid sign-in.** Google OAuth plus a dedicated email sign-in path (magic-link, no password) — Google-only did not survive contact with the target audience. See `decisions-log.md` § Auth / Account Model for full reasoning and history.

Provider: Supabase Auth (bundles both providers + Postgres in one service). Auth users are plumbing, not public identity — the public identity is the `profiles` row an auth user links to.

Revisit if: users ask for password-based sign-in (additive, not a redesign — Supabase treats it as a separate provider against the same accounts).

## Moderation

Manual at launch; communal moderation is the long-term goal, not built yet. New-user submissions and claims both route through the same manual review queue — don't build separate systems per entity type. Submission friction alone (e.g. requiring an account) is *not* sufficient anti-spam — a review queue and/or rate limits for new accounts are the intended real hedges, not yet built.
