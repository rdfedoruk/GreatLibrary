# Tagging Taxonomy — Starter Vocabulary (v2)

**Status:** Resolved for v1. Two flat dimensions — no hierarchy, unlimited tags per submission, controlled vocabulary maintained directly by you (no governance tooling needed at current scale).

**Model implication:** Each dimension is its own `tags` table (or a single `tags` table with a `dimension` column) so Module and Medium tags don't collide in the same autocomplete.

---

## Dimension 1: Module / Product Area

Includes topic areas as well as product modules — Career/Certification content lives here, not as a separate content type. Granularity can go as deep as useful: a submission can carry both a broad tag and a specific sub-tag (e.g. **Flow Designer** + **Flow Action** on a post about building a Flow Action).

**Core IT**
- ITSM (IT Service Management)
- ITOM (IT Operations Management)
- ITBM / SPM (Strategic Portfolio Management)
- ITAM (IT Asset Management)
- CMDB / Discovery
- DevOps

**Platform / Dev**
- App Engine (low-code app dev)
- Flow Designer
  - Flow Action *(example sub-tag — add siblings as needed: Flow Trigger, Flow Subflow, etc.)*
- IntegrationHub
- Now Assist / Agentic AI (AI Agent Studio, AI Agent Orchestrator, AI Control Tower)
- Virtual Agent
- Performance Analytics / Reporting
- Platform Administration
- Scripting / Server-side (Glide, Script Includes, Business Rules)
- UI Builder / UI Policies / Client Scripts

**Business Lines**
- CSM (Customer Service Management)
- HRSD (Human Resources Service Delivery)
- SecOps (Security Operations)
- GRC (Governance, Risk & Compliance)
- FSM (Field Service Management)
- Source-to-Pay / Procurement

**Cross-cutting**
- Integrations (general, non-IntegrationHub-specific)
- Upgrades / Release Management
- Instance Architecture / Best Practices
- Career / Certification / Industry Commentary

---

## Dimension 2: Medium

Strictly format now — genre distinctions (tutorial vs. opinion vs. case study, etc.) are dropped entirely, not migrated elsewhere. That nuance lives in the submission's title/description, not a tag. Adjacent formats collapse into the nearest of the three: live streams → Video; threads and slide decks → Article.

- Video
- Article
- Podcast

---

## Decisions locked for v1

1. **Module granularity** — as deep as useful, sub-tags allowed and encouraged (Flow Designer + Flow Action pattern).
2. **Tag count per submission** — unlimited. Discipline lives in the controlled vocabulary, not a per-submission cap. *Parked for later: if average tag count climbs, filter UI will need AND/OR logic — not a tagging decision, a UI one.*
3. **Deprecation / renaming** (e.g. ITBM → SPM) — explicitly deferred, not forgotten. No automated versioning for v1; will be a manual/scripted fix when it's actually needed. Flag this in `decisions-log.md` so it doesn't get lost before it bites.
4. **Skill Level** — cut. Rarely useful in practice; not carried forward as a tag or a field.
5. **Medium simplified to three values** — Video, Article, Podcast. Genre/content-type tags (Tutorial, Case Study, Opinion, etc.) dropped entirely rather than merged in; that distinction is left to the submission's title/description. Adjacent formats fold in: live streams → Video, threads/decks → Article.

---

## Still open

- Exact seed list per dimension is still yours to prune/extend — the above is a Claude-drafted starting point, not final.
- Autocomplete/tag-creation UX when you (or later, other submitters) want a tag that doesn't exist yet — deliberate add vs. free-text creep.
