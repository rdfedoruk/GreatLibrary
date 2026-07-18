# The Great Library (working title)

*This is the full running decisions log/narrative. For the structured, task-specific docs Claude Code actually reads (CLAUDE.md, data-model.md, browser-plugin-spec.md, build-order.md, open-questions.md), see the rest of this handoff package.*

A curation database and community for finding, tagging, rating, and discussing ServiceNow content.

## The Problem

A massive amount of ServiceNow content is being generated across the web, but there's no curated, tagged, searchable home for it. Source-specific problems:

- **LinkedIn** — good content buried in feeds of mostly garbage; relies on algorithmic coincidence to surface anything; high volume of AI-generated trash.
- **ServiceNow Community** — incredibly difficult to search, even for content you already know you liked.
- **Private blogs/vlogs** — undiscoverable unless you already know the specific site exists.
- **YouTube** — huge variance in content quality, weak filtering.

## The Vision

A database + community app built around five pillars:

1. **Submitting** — manual submission page and/or a browser plugin.
2. **Finding** — curated, tagged content means a smaller, higher-signal search surface. Tagging is treated as a core differentiator, since none of the source platforms exploit it well.
3. **Curating** — tagging, discussions, suggestions, critiques, click-throughs.
4. **Rating** — simple upvote (decided below).
5. **Discussing** — threaded comments, with a distinct sub-type for structured suggestions/critiques.

## Decisions Made So Far

### Cold Start
Not a concern. Will be manually seeded, potentially with Claude-assisted bulk intake processing.

**Resolved:** the tagging taxonomy (see Tagging below) is now finalized, clearing this flag ahead of any bulk intake pass.

### Tagging
Confirmed as a real, unsolved challenge — deliberately called out as the main differentiator from existing sources. **Resolved** in a follow-up session (see below); no longer open.

**Resolution:** Rejected pure free-text (recreates the exact fragmentation this app exists to fix) and rejected a full hierarchy (over-engineered for solo-curator scale, where the admin already controls tag discipline directly). Landed on a **flat controlled vocabulary across two independent dimensions**, no parent/child hierarchy field needed:

1. **Module / Product Area** — topic and product-module tags, including Career/Certification. Deliberately allowed to go as deep as useful (e.g. a submission can carry both "Flow Designer" and a narrower "Flow Action" tag) — depth is fine as long as it's still a flat list per tag, not a nested tree.
2. **Medium** — strictly format: **Video, Article, Podcast**. Went through two rounds of simplification — started as a broader "Content Type" (Tutorial, Opinion, Case Study, etc.) merged with "Format" (Video, Slide Deck, Podcast, etc.), but the two overlapped too much with each other and with Module. Collapsed down to just the three format values; adjacent formats fold in (live streams → Video, threads/decks → Article). Genre/content-type nuance (tutorial vs. case study vs. opinion) is deliberately dropped, not preserved elsewhere — left to the submission's title/description instead of a tag.

**Tag count per submission:** unlimited, no cap. The discipline against fragmentation lives in the controlled vocabulary (limited tag *options*), not in limiting how many a submission can wear. Flagged for later: if average tag count climbs, the search/filter UI will need explicit AND/OR logic — a UI decision, not a tagging-model one.

**Explicitly deferred, not forgotten:**
- **Tag deprecation/renaming** — ServiceNow renames products almost every release (ITBM → SPM is the live example). No automated versioning built for v1; will be a manual/scripted fix applied when it's actually needed.
- **Skill Level** — considered as a third dimension, cut. Rarely useful in practice, not carried forward as a tag or a field.

A Claude-generated starter seed list for the Module dimension exists as a starting point for the admin to prune/extend before it becomes actual seed data in the `tags` table.

### Rating System
Star ratings rejected. Going with a simple upvote model.

**Resolved (2026-07-17): upvote/downvote net score.** Pure upvote-only was considered (more forgiving for niche content) but the downvote's value as a "this is wrong/outdated" signal won out — it doubles as a light moderation input alongside the review queue. Modeled as one vote per user per submission with a value of +1/-1.

### Content Ownership & Scraping
Browser plugin will capture **only** the URL and a short description — no full content mirroring/scraping. Deliberate choice to avoid ToS/legal gray areas with LinkedIn and YouTube, and a judgment call that platform-optimized post/description text tends to be low-quality anyway.

**Open question:** is the short description user-written at submission time, or auto-suggested (e.g. pulled from page `<title>`/og:description) with the user able to edit? Auto-suggest-with-edit likely improves submission completion rates.

### Discussion / Review-Style Annotations
Simplified from the original "Word doc style inline review" idea. Decision: keep comments simple, but support a distinct **comment type** — comment vs. suggestion vs. critique — likely modeled as a `comment_type` enum rather than a separate system. Critiques may eventually carry structured sub-tags (e.g. accuracy, outdated, wrong version) to generate structured signal rather than freeform prose. Full inline/anchored annotation on external content (true "Word doc" style) is explicitly deferred as a stretch goal, not core scope — anchoring comments to content Claude/the app doesn't control is a hard UX/data problem.

### Moderation
Manual moderation acceptable at launch; long-term goal is communal moderation. Submission friction (e.g. account requirement) was proposed as a hedge against AI-generated spam submissions, but flagged as weak — friction doesn't meaningfully raise the cost of AI-generated submission text. More effective hedges likely: new-user submissions routed to a review queue before going live, and/or submission rate limits for new accounts. Not being built now, but should be considered in the user/submission data model so it's not a retrofit later.

### Auth / Account Model
**Decision: Google-only sign-in for v1** (no email/password).

Reasoning:
- Target audience (ServiceNow professionals) overwhelmingly already has a Google account (personal or Workspace), so it's not a real access barrier.
- Eliminates a large chunk of build/maintenance surface: no password reset flows, no email verification, no account-linking logic for "same email via two different signup paths," no password-breach liability.
- Lower solo-build burden — fewer auth paths to build and secure through Claude Code.
- Minor secondary benefit: a throwaway Google account is still more friction than a fake email/password signup, giving a small (not sufficient on its own) assist against low-effort spam accounts, complementing the moderation approach above.

**Provider recommendation:** Supabase Auth — bundles Google OAuth with a Postgres database in one service, which the app needs anyway for submissions/tags/votes/comments. Free tier is generous enough for early-stage use. Google OAuth setup requires registering the app in Google Cloud Console for a client ID/secret (~10 minutes), then wiring those into Supabase.

**Revisit if:** a meaningful share of the target audience turns out to be blocked from using "Sign in with Google" by corporate security policy, or platform independence from Google becomes a priority. Neither seems likely given the audience, but worth a gut-check later.

**Extensibility note:** choosing a provider like Supabase keeps email/password addable later as a config change rather than a redesign, if Google-only proves insufficient.

**Reopened (2026-07-18):** it didn't survive contact with the real user base — the target audience mostly doesn't want social login, and prefers dedicated account creation for the site. Andrew has accepted this as necessary added work.

**Resolved:** hybrid, not a replacement — Google OAuth stays, plus a dedicated email sign-in path, mirroring the "Continue with Google / OR / email" pattern used by Anthropic and OpenAI's own products. The email path starts as **magic-link/OTP (no password)** — this avoids the password reset flows and breach liability the original decision was trying to avoid in the first place, so most of that original reasoning still holds. Password-based sign-in stays available as a later additive option if users ask for it; Supabase treats it as a separate provider against the same accounts, not a redesign of this decision. Remaining before this is buildable: email verification approach. (Migration was a non-issue — only one account exists, Robert Fedoruk, who's staying on Google sign-in.) See `todo.md` § Accounts for the live item.

### Unified Profiles (2026-07-18 — supersedes "Content Creators & Claiming" below)

The users-vs-content_creators split (below, kept for history) solved attribution-before-membership but created a seam: Mark's page as an unclaimed creator and Mark's presence as a member were two different kinds of thing, and joining the site would have made "see Mark's stuff" feel like a different place. Redesigned in conversation 2026-07-18. The plain-English statement of the design, kept verbatim because it's the clearest expression of it:

- **Everyone gets one page.** Whether it's Mark, or ServiceNow the company, or the CJ&TheDuke podcast — each has exactly one page on the site, showing who they are and all content connected to them. The page's web address never changes.
- **A page can exist before the person joins.** The first time someone submits one of Mark's videos and attributes it to him, the site creates Mark's page right then. Mark has no idea. Visitors can browse everything attributed to him.
- **We keep a list of "how we know it's Mark's."** Behind the page is a list: this YouTube channel, this Community username, this blog. New content from that channel lands on Mark's page automatically. A new platform someday is just another line on the list — no rebuilding.
- **When Mark joins, he points at his page and says "that's me."** No magic connects his email signup to his page — a human reviews and approves. Once approved, it's still the same page — it just gains a checkmark, and Mark can edit his bio and manage his stuff.
- **If Mark joined earlier and was commenting before claiming,** he accidentally has two pages. Fixing that means folding his small member activity into the author page and retiring the duplicate. Mildly annoying, rare, reduced further by asking at signup: "are you any of these people?"
- **Companies and podcasts never log in.** Real people get connected to them instead. CJ and TheDuke each claim their own personal page, then each is listed as a host of the podcast's page; either can act on its behalf. ServiceNow-the-company sits unclaimed forever, which is fine.
- **One piece of content can point at several pages.** A podcast episode shows up on the podcast's page and on both hosts' pages.

**Slug addendum (same day):** profile pages live at `/profile/<slug>` with a readable slug generated from the display name (deduped with numeric suffixes). Andrew challenged the initial "the URL never changes, forever" framing — YouTube and LinkedIn both let you rename handles — and it didn't survive: the *permanent* thing is the internal profile id (everything in the database points at it), while the slug is just a changeable label. Renames only cost old external links, and a retired-slug forwarding table fixes even that — backlogged in `todo.md` § Accounts, to be built with slug editing.

Schema consequences (full shape in `data-model.md`): one `profiles` table replaces `profiles` + `content_creators`; `profile_identities` child table for platform identities; `entity_members` for who-acts-for-an-entity; `submission_attributions` many-to-many for attribution; `merged_into` tombstone column for the duplicate-page case; all activity (submissions, comments, votes) references profile IDs, not auth users. Entities have `linked_user_id` permanently null — claiming is person-only.

### Content Creators & Claiming
**Problem:** a submission's creator (e.g. the person who made a YouTube video or wrote a Community post) is not necessarily a member of the platform at submission time. Without a separate identity for "who made this" vs. "who submitted this," a later-joining creator has no way to be linked to content submitted about them by someone else.

**Decision: submitter and creator are separate entities.**

- **`submitted_by`** — the community member who found and posted the link. Fixed at submission time, never reassigned.
- **`content_creators`** — a standalone table representing whoever actually made the content. Exists independently of `users`, with an optional `linked_user_id` that starts null and gets set once a real account is claimed/verified. Stores identifying signals for matching, not just a free-text name: YouTube channel ID, LinkedIn profile URL, SN Community username/profile URL. Channel IDs/profile URLs are the matching key, not display names (which collide and change).

**Claim flow (v1, manual verification):**
1. New user signs up (Google OAuth).
2. User searches/matches against unclaimed `content_creators` records (ideally auto-suggested via matching their connected YouTube channel or LinkedIn profile against stored identifiers).
3. User requests a claim.
4. Claim request routes into the existing manual moderation queue — reuses infrastructure already planned for submission moderation, no new system needed at this scale. Admin (Andrew) visually confirms the match and approves.
5. On approval, `content_creators.linked_user_id` is set. All existing and future submissions pointing at that creator record display as attributed to the now-linked account retroactively — no need to touch individual submission rows.

**Deferred / v2:** stronger automated verification (e.g. OAuth into YouTube Data API to confirm channel control) if manual review doesn't scale.

**Creator removal rights:** once a creator has claimed their identity, they have the right to request removal of content attributed to them. This is a distinct action from a normal critique/moderation flag — a verified creator's removal request should carry more weight than an ordinary community flag, since it's their own work. Likely modeled as a specific request type that also routes through the moderation queue, but should be visually/procedurally distinguished from routine moderation so it isn't lost in general queue volume.

**Data model implication:** this confirms `content_creators` must exist as its own table from the start, not a text field on `submissions`. Retrofitting this after real data and duplicate name strings exist would require a manual identity-resolution/merge pass — worth avoiding by building it in now.

### news.jace.pro
An aggregated feed of ServiceNow news (~52,000 items) pulled from sources like the ServiceNow Community, YouTube, and consulting-firm blogs. Also tracks **Sessions** and **MVPs by year** — ServiceNow-ecosystem-specific structures (conference talks, annual community MVP recognition) worth considering as content types.

**Comparison to The Great Library:**

| | news.jace.pro | The Great Library |
|---|---|---|
| Core mechanism | Automated aggregation/scraping | Manual/community submission |
| Curation | None visible | Core feature — tagging, votes, comments |
| Tagging | None | Core differentiator |
| Community/discussion | None | Core feature |
| LinkedIn coverage | Not included (likely blocked by LinkedIn's anti-scraping) | Explicitly included, via browser plugin |

**Takeaways:**
- Validates the problem but doesn't solve curation — 52,000 undifferentiated items is still a wall of noise. Confirms volume isn't the bottleneck; signal is.
- Potential intake source for cold-start seeding (check terms/robots.txt before relying on it).
- Confirms LinkedIn is a genuine gap other tools skip, likely due to scraping restrictions — reinforces the case for a user-initiated browser plugin, which sidesteps that restriction via the user's own logged-in session.
- "Sessions" and "MVPs" sections suggest a possible nice-to-have: tracking notable community figures/conference content as its own content type.

## Browser Plugin: Per-Site Extraction Spec

Decision: the plugin uses **per-site extraction logic** rather than one generic behavior, since "what counts as the content" differs by site. Implemented via a site-handler registry — a domain-pattern lookup mapped to an extraction function (e.g. `{ "linkedin.com": extractFromLinkedInPost, "youtube.com": extractFromYouTubePage, "servicenow community domain": extractFromCommunity, default: extractGeneric }`). Easy to extend to new sites later without redesigning the plugin. Unrecognized domains fall back to a generic handler (current page URL + page title).

Scope reminder: plugin captures **URL + short description only** — no full content scraping/mirroring (see Content Ownership decision above).

### LinkedIn Handler
LinkedIn posts are treated as a **pointer**, not the content itself — the plugin looks for the external link the post references, not the post URL.

- **Target:** the post currently in view/focused. **Open design question:** LinkedIn's feed is continuous scroll with no single strong "this is the one" signal. Two candidate approaches: (a) act on whatever post is under the cursor/most-in-viewport when the user clicks the extension icon, or (b) inject a hover-triggered "submit this post" button directly into each post's UI. (b) is more reliable but more invasive to build. **Not yet decided.**
- **Extraction:** find the external link-preview card's `href` inside the post → resolve any redirect wrapper (e.g. `lnkd.in`, `/redir/`) to the final destination URL → prefill as the submission URL.
- **Multiple links found:** show a simple picker rather than guessing which one.
- **No external link found** (native video, text-only post, carousel/PDF): fall back to the LinkedIn post's own permalink, with a clear UI flag that this is a fallback, not the intended target — so low-quality native LinkedIn content isn't submitted silently as if it were the primary source.
- **Description:** no auto-pull — left blank for the user to write. (Per earlier decision: LinkedIn post text is platform-optimized and treated as low-value.)

### YouTube Handler
YouTube pages are treated as the content itself.

- **Target:** current page, assumed to be a video watch page (`/watch?v=`).
- **Extraction:** canonical video URL, stripped of tracking/session params (e.g. `si=`, playlist context). Timestamp param (`&t=`) may be intentionally preserved as an option, useful for "the good part starts at 4:30" submissions.
- **Description:** auto-suggested from the video title (not the full video description, per earlier decision that platform descriptions are low-value) — user edits before submit.
- **Edge case:** channel or playlist pages instead of a single video — handler should detect this isn't a watch page and either disable/gray out submission or fall back to the generic handler.

### ServiceNow Community Handler
Community pages are treated as the content itself.

- **Target:** current page, assumed to be a thread/article/blog-post page.
- **Extraction:** canonical thread/article URL. Needs verification of whether Community URLs carry session or view-state query params that should be stripped for a clean permalink.
- **Description:** auto-suggested from page title/first-post snippet if easily accessible in the DOM; otherwise left blank.
- **Edge case:** Community hosts multiple content types under one domain (forum threads, blog posts, articles, possibly embedded video). May need sub-detection by URL path pattern rather than one blanket handler for the whole domain. **Needs a look at actual Community URL structure before building.**

## Still Open / Not Yet Discussed

Design decisions blocking in-progress work now live in `open-questions.md`;
feature ideas not yet scoped live in `todo.md`. This section is kept as a
historical note, not a live list.
