import { useEffect, useState, type KeyboardEvent } from 'react'
import { fetchTags, type Tag } from './api'
import './tags.css'

interface TagPickerProps {
  selected: string[]
  onChange: (tagIds: string[]) => void
}

function MediumChips({
  tags,
  selected,
  toggle,
}: {
  tags: Tag[]
  selected: string[]
  toggle: (id: string) => void
}) {
  return (
    <fieldset className="tag-group">
      <legend>Medium</legend>
      <div className="tag-options">
        {tags.map((tag) => {
          const active = selected.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              className={`tag-option${active ? ' selected' : ''}`}
              aria-pressed={active}
              onClick={() => toggle(tag.id)}
            >
              {tag.name}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

// Type-ahead over the controlled vocabulary only — typing something that
// isn't in the list does not create a tag (data-model.md: new tags are a
// deliberate admin add).
function TagAutocomplete({
  tags,
  selected,
  toggle,
}: {
  tags: Tag[]
  selected: string[]
  toggle: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  // Two-step delete: first Backspace on an empty field "arms" the last chip
  // (highlights it), a second Backspace removes it. Stops a stray keypress
  // from silently dropping a tag.
  const [armedTagId, setArmedTagId] = useState<string | null>(null)

  const q = query.trim().toLowerCase()
  const matches = q
    ? tags
        .filter(
          (t) => !selected.includes(t.id) && t.name.toLowerCase().includes(q),
        )
        .sort((a, b) => {
          const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1
          const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1
          return aStarts - bStarts || a.name.localeCompare(b.name)
        })
        .slice(0, 8)
    : []
  const selectedTags = tags.filter((t) => selected.includes(t.id))

  const remove = (id: string) => {
    toggle(id)
    setArmedTagId(null)
  }

  const pick = (id: string) => {
    toggle(id)
    setQuery('')
    setArmedTagId(null)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault() // keep the form from submitting mid-typing
      if (matches.length > 0) pick(matches[0].id)
      return
    }
    if (event.key === 'Backspace' && query === '' && selectedTags.length > 0) {
      const last = selectedTags[selectedTags.length - 1]
      if (armedTagId === last.id) {
        event.preventDefault()
        remove(last.id)
      } else {
        setArmedTagId(last.id) // arm; a second Backspace removes it
      }
      return
    }
    if (armedTagId) setArmedTagId(null) // any other key disarms
  }

  return (
    <fieldset className="tag-group">
      <legend>Tags</legend>
      {selectedTags.length > 0 && (
        <div className="tag-options tag-selected-row">
          {selectedTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={`tag-option selected${
                tag.id === armedTagId ? ' armed' : ''
              }`}
              title="Remove tag"
              onClick={() => remove(tag.id)}
            >
              {tag.name} ×
            </button>
          ))}
        </div>
      )}
      <div className="tag-autocomplete">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (armedTagId) setArmedTagId(null)
          }}
          onKeyDown={onKeyDown}
          placeholder="Start typing — ITSM, Flow Designer…"
          aria-label="Search tags"
        />
        {q && matches.length > 0 && (
          <ul className="tag-suggestions">
            {matches.map((tag) => (
              <li key={tag.id}>
                <button type="button" onClick={() => pick(tag.id)}>
                  {tag.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {q && matches.length === 0 && (
          <p className="tag-picker-status">
            No matching tag — new tags are added by the admin.
          </p>
        )}
      </div>
    </fieldset>
  )
}

export function TagPicker({ selected, onChange }: TagPickerProps) {
  const [tags, setTags] = useState<Tag[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchTags()
      .then((data) => {
        if (!cancelled) setTags(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <p className="tag-picker-status">Couldn’t load tags: {error}</p>
  if (tags === null) return <p className="tag-picker-status">Loading tags…</p>

  const toggle = (id: string) =>
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    )

  return (
    <div className="tag-picker">
      <MediumChips
        tags={tags.filter((t) => t.dimension === 'medium')}
        selected={selected}
        toggle={toggle}
      />
      <TagAutocomplete
        tags={tags.filter((t) => t.dimension === 'module')}
        selected={selected}
        toggle={toggle}
      />
    </div>
  )
}
