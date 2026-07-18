# Submission feature — to-do list

Requested by Andrew 2026-07-17. Items here are queued, not designed — check
notes before building; some touch decisions in `data-model.md`.

## 1. YouTube thumbnails
Show the video thumbnail on submission cards when the URL is a YouTube video.

- No scraping needed: thumbnails are derivable from the video ID
  (`img.youtube.com/vi/<id>/hqdefault.jpg`). Parse the ID from the URL at
  render time — zero schema change, nothing stored, consistent with the
  "URL + description only" ownership constraint.
- Non-YouTube sites have no equivalent free lunch; card just has no image.

## 2. Auto-fetch the linked content's title
Prefill/attach the real title of the linked page.

- `data-model.md` already sanctions this ("description — user-provided or
  auto-suggested"), so no design conflict.
- Needs server-side help: browsers block cross-origin page fetches (CORS), so
  this means a Supabase Edge Function (fetch title tag / oEmbed) — first
  server code in the project. YouTube's oEmbed also returns channel name +
  URL, which feeds item 3.
- Open sub-question: is title a new column on `submissions`, or just a
  suggestion pasted into description? Schema change = high-stakes, flag it.

## 3. Content-creator identification for manual submissions
Currently NOT captured — `content_creator_id` stays empty on manual submits.

- Design (data-model.md): creators are matched by platform identity keys
  (YouTube channel ID, LinkedIn profile URL, SN Community username), never by
  display name. The browser plugin (Phase 3) is the intended source of those
  keys per site.
- For manual submissions the options are: (a) leave unmatched until an admin
  links it, (b) derive from the URL where possible (YouTube oEmbed gives the
  channel), (c) ask the submitter — weakest, free-text names collide.
- Decision needed before building; leans on item 2's edge function.

## 4. Tag input: rename + autocomplete — DONE 2026-07-17
"Module / product area" label → "Tags"; chip-cloud of all 26 replaced with a
type-ahead input (suggestions appear as you type, Enter or click to add,
selected tags shown as removable chips).

- Autocomplete matches the controlled vocabulary only — typing something new
  does NOT create a tag (locked decision in `data-model.md`: new tags are a
  deliberate admin add). Input shows a hint when nothing matches.
- Medium stayed as three visible chips.
