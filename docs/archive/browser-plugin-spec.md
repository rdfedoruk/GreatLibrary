# Browser Plugin: Per-Site Extraction Spec

The plugin uses **per-site extraction logic**, not one generic behavior — implemented via a site-handler registry (domain pattern → extraction function). Unrecognized domains fall back to a generic handler (current page URL + page title).

**Hard scope constraint: URL + short description only.** Never scrape/mirror full page content or post text. This is a deliberate legal/quality decision, not a v1 shortcut — don't expand it without being asked.

## Registry shape (illustrative)

```
{
  "linkedin.com": extractFromLinkedInPost,
  "youtube.com": extractFromYouTubePage,
  "<sn community domain>": extractFromCommunity,
  default: extractGeneric
}
```

## LinkedIn Handler

LinkedIn posts are treated as a **pointer**, not the content itself — extract the external link the post references, not the post's own URL.

- **Target:** the post currently in view/focused.
  - **Unresolved:** LinkedIn's feed is continuous scroll with no single strong "this is the one" signal like a URL provides. Two candidate approaches: (a) act on whatever post is under the cursor/most-in-viewport when the extension icon is clicked, or (b) inject a hover-triggered "submit this post" button directly into each post's UI. (b) is more reliable, more invasive to build. **Do not silently pick one — this affects the plugin's core interaction model and should be confirmed before building.**
- **Extraction:** find the external link-preview card's `href` inside the post → resolve any redirect wrapper (`lnkd.in`, `/redir/`, etc.) to the final destination URL → prefill as submission URL.
- **Multiple links found:** show a picker, don't guess.
- **No external link found** (native video, text-only post, carousel/PDF): fall back to the post's own permalink, clearly flagged in the UI as a fallback — don't submit it silently as if it were the primary target.
- **Description:** no auto-pull. Left blank for the user to write (LinkedIn post text is platform-optimized, treated as low-value).

## YouTube Handler

YouTube pages are treated as the content itself.

- **Target:** current page, assumed to be a video watch page (`/watch?v=`).
- **Extraction:** canonical video URL, stripped of tracking/session params (e.g. `si=`, playlist context). Timestamp param (`&t=`) may be intentionally preserved as an option (e.g. "the good part starts at 4:30").
- **Description:** auto-suggested from video title only (not the full description) — user edits before submit.
- **Edge case:** channel/playlist pages — detect and either disable submission or fall back to the generic handler.

## ServiceNow Community Handler

Community pages are treated as the content itself.

- **Target:** current page, assumed to be a thread/article/blog-post page.
- **Extraction:** canonical thread/article URL.
  - **Unresolved:** whether Community URLs carry session/view-state query params that need stripping for a clean permalink. Needs investigation of actual URL structure before this handler is built.
- **Description:** auto-suggested from page title/first-post snippet if reasonably accessible in the DOM; otherwise blank.
- **Edge case:** Community hosts multiple content types under one domain (threads, blog posts, articles, possibly embedded video) — may need sub-detection by URL path pattern rather than one blanket handler for the whole domain.

## Build note

Build YouTube and Community handlers first — they prove out the registry pattern with the simpler "current page is the content" case. Build LinkedIn last, once the "which post" targeting question above is resolved.
