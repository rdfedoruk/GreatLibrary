import { useEffect, useState, type KeyboardEvent } from 'react'
import type { Tag } from '../tags'
import './search.css'

/** How long typing has to pause before the feed is searched. */
const TYPING_PAUSE_MS = 300

/** Lower-case letters and digits only, so "flow-designer" finds "Flow Designer". */
const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

/**
 * The feed's search box: tags picked from the suggestions sit in the box as
 * chips, and whatever is typed is searched for in titles, descriptions and the names
 * of who is credited.
 * It holds nothing itself — the feed keeps both in the page address.
 */
export function FeedSearch({
  allTags,
  picked,
  text,
  onChange,
}: {
  /** Tags worth offering — ones at least one entry carries. */
  allTags: Tag[]
  picked: Tag[]
  text: string
  /** Called with both at once, so a change to one can't undo the other. */
  onChange: (tags: Tag[], text: string) => void
}) {
  const [draft, setDraft] = useState(text)
  const [active, setActive] = useState(-1)
  const [open, setOpen] = useState(false)

  // The address changed from outside the box — Clear, or the back button.
  useEffect(() => setDraft(text), [text])

  // Searching on every keystroke would fetch for "p", "pr", "pro"…
  useEffect(() => {
    if (draft === text) return
    const timer = setTimeout(() => onChange(picked, draft), TYPING_PAUSE_MS)
    return () => clearTimeout(timer)
  }, [draft, text, picked, onChange])

  const q = squash(draft)
  const pickedIds = new Set(picked.map((t) => t.id))
  const starts = (t: Tag) => (squash(t.name).startsWith(q) ? 0 : 1)
  const matches = q
    ? allTags
        .filter((t) => !pickedIds.has(t.id) && squash(t.name).includes(q))
        .sort((a, b) => starts(a) - starts(b) || a.name.localeCompare(b.name))
        .slice(0, 6)
    : []
  const current = active < matches.length ? active : -1

  // Picking a tag swaps the typed words for the tag, since they were typed
  // to find it.
  const pick = (tag: Tag) => {
    onChange([...picked, tag], '')
    setDraft('')
    setActive(-1)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      // Steps through the tags and back round to none highlighted, where
      // Enter searches for the words as typed.
      const next = current + (event.key === 'ArrowDown' ? 1 : -1)
      setActive(next >= matches.length ? -1 : next < -1 ? matches.length - 1 : next)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (current >= 0) pick(matches[current])
      else onChange(picked, draft)
    } else if (event.key === 'Escape') {
      setOpen(false)
      setActive(-1)
    } else if (event.key === 'Backspace' && draft === '' && picked.length) {
      onChange(picked.slice(0, -1), draft)
    }
  }

  const anything = picked.length > 0 || draft.trim() !== ''

  return (
    <div className="feed-search">
      <div className="feed-search-box">
        {picked.map((tag) => (
          <span key={tag.id} className={`tag ${tag.status}`}>
            {tag.name}
            <button
              type="button"
              className="tag-x"
              aria-label={`Remove tag ${tag.name} from the search`}
              title={`Remove “${tag.name}”`}
              onClick={() =>
                onChange(
                  picked.filter((t) => t.id !== tag.id),
                  draft,
                )
              }
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          autoComplete="off"
          placeholder={picked.length ? 'Search within these tags…' : 'Search titles, descriptions and credits, or add a tag…'}
          aria-label="Search the library"
          aria-expanded={open && matches.length > 0}
          aria-controls="feed-search-tags"
          role="combobox"
          onChange={(e) => {
            setDraft(e.target.value)
            setActive(-1)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        />
        {open && matches.length > 0 && (
          <ul className="feed-search-tags" id="feed-search-tags" role="listbox" aria-label="Add a tag to the search">
            {matches.map((tag, i) => (
              <li
                key={tag.id}
                role="option"
                aria-selected={i === current}
                // mousedown, not click: click fires after the box loses focus
                // and the list is already gone.
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(tag)
                }}
                onMouseMove={() => setActive(i)}
              >
                <span className={`tag ${tag.status}`}>{tag.name}</span>
                add tag
              </li>
            ))}
          </ul>
        )}
      </div>
      {anything && (
        <button
          type="button"
          className="quiet"
          onClick={() => {
            onChange([], '')
            setDraft('')
          }}
        >
          Clear
        </button>
      )}
    </div>
  )
}
