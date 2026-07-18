# Open Questions

Unresolved design decisions. If a task depends on one of these, stop and ask rather than picking a default.

- **Submission description source** — user-written at submission time vs. auto-suggested from page metadata with edit. Leaning auto-suggest-with-edit for completion rate, not locked in.
- **LinkedIn "which post" targeting** — cursor/viewport-based detection vs. an injected per-post "submit this" button. Affects the plugin's core interaction model. Not decided.
- **ServiceNow Community URL structure** — needs actual investigation (session/view-state params, path structure by content type) before the Community handler can be finalized.
- **Additional per-site handlers** — beyond LinkedIn/YouTube/Community (e.g. X/Twitter, Reddit, generic blogs). Not scoped.
- **Creator verification strength** — v1 is manual review via the moderation queue. Stronger automated verification (e.g. OAuth into YouTube Data API to confirm channel ownership) is a possible v2 if manual review doesn't scale.
- **Google sign-in shows the raw Supabase URL** ("continue to vjwvswsuzhcqrkwpqodg.supabase.co") — cosmetic but unprofessional for launch. Fix requires a real domain plus Supabase's custom domain add-on (paid). Revisit when the app gets a public domain.
- **Nice-to-have features** — tracked in `todo.md`, not here (this file is for decisions blocking in-progress work).
