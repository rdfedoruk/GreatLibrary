import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  TAG_TYPES,
  fetchTags,
  tagSlug,
  tagSubmission,
  tagTypeLabel,
  untagSubmission,
  type Tag,
} from './api'
import './tags.css'

type Choice = { key: string; name: string; type?: string; tag?: Tag }

/** The type-ahead for one entry: pick an existing tag, or suggest a new one. */
function Tagger({
  label,
  carried,
  onAdd,
  onClose,
}: {
  label: string
  carried: Tag[]
  onAdd: (name: string, type?: string) => void
  onClose: () => void
}) {
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    fetchTags()
      .then((tags) => {
        if (!cancelled) setAllTags(tags)
      })
      .catch(() => {})
    input.current?.focus()
    return () => {
      cancelled = true
    }
  }, [])

  const typed = query.replace(/\s+/g, ' ').trim()
  const q = typed.toLowerCase()
  const mine = new Set(carried.map((t) => t.id))
  const starts = (t: Tag) => (t.name.toLowerCase().startsWith(q) ? 0 : 1)
  const matches = allTags
    .filter((t) => !mine.has(t.id) && t.name.toLowerCase().includes(q))
    .sort((a, b) => starts(a) - starts(b) || a.name.localeCompare(b.name))
    .slice(0, 8)
  const exact = allTags.find((t) => t.name.toLowerCase() === q)

  const choices: Choice[] = matches.map((t) => ({
    key: t.id,
    name: t.name,
    tag: t,
  }))
  if (q && !exact) {
    // One "suggest" choice per type: a plain tag first, then e.g. a version.
    for (const type of TAG_TYPES) {
      choices.push({ key: `new-${type.id}`, name: typed, type: type.id })
    }
  }
  const current = Math.min(active, Math.max(choices.length - 1, 0))

  const pick = (choice: Choice) => {
    onAdd(choice.name, choice.type)
    setQuery('')
    setActive(0)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (choices.length) {
        const step = event.key === 'ArrowDown' ? 1 : choices.length - 1
        setActive((current + step) % choices.length)
      }
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (choices[current]) pick(choices[current])
    } else if (event.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="tagger">
      <input
        ref={input}
        type="text"
        value={query}
        maxLength={40}
        autoComplete="off"
        placeholder="Add a tag…"
        aria-label={label}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
      />
      {(choices.length > 0 || (exact && mine.has(exact.id))) && (
        <ul className="tag-choices" role="listbox">
          {choices.map((choice, i) => (
            <li
              key={choice.key}
              role="option"
              aria-selected={i === current}
              // mousedown, not click: click would fire after the input loses
              // focus, and the choice would be gone.
              onMouseDown={(e) => {
                e.preventDefault()
                pick(choice)
              }}
              onMouseMove={() => setActive(i)}
            >
              {choice.tag ? (
                <>
                  <span className={`tag ${choice.tag.status}`}>
                    {choice.tag.name}
                  </span>
                  {choice.tag.type !== 'general' &&
                    tagTypeLabel(choice.tag.type)}
                </>
              ) : (
                <>
                  Suggest new {tagTypeLabel(choice.type!).toLowerCase()}
                  <span className="tag suggested">{choice.name}</span>
                </>
              )}
            </li>
          ))}
          {exact && mine.has(exact.id) && (
            <li className="note">Already tagged “{exact.name}”</li>
          )}
        </ul>
      )}
    </div>
  )
}

/**
 * The tags on one entry. Each chip is a link into a feed of everything
 * sharing the tag. Signed in, the tag button opens the type-ahead, and while
 * it is open every chip gets an × to take it off.
 */
export function SubmissionTags({
  submissionId,
  title,
  tags,
  canEdit,
  onChange,
}: {
  submissionId: string
  /** What the entry is called, for the button's spoken label. */
  title: string
  tags: Tag[]
  canEdit: boolean
  onChange: (tags: Tag[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sorted = [...tags].sort(
    (a, b) =>
      Number(b.status === 'approved') - Number(a.status === 'approved') ||
      a.name.localeCompare(b.name),
  )

  const add = (name: string, type?: string) => {
    setError(null)
    tagSubmission(submissionId, name, type)
      .then((tag) => {
        if (!tags.some((t) => t.id === tag.id)) onChange([...tags, tag])
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
  }

  const remove = (tag: Tag) => {
    setError(null)
    untagSubmission(submissionId, tag.id)
      .then(() => onChange(tags.filter((t) => t.id !== tag.id)))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
  }

  const chip = (tag: Tag) => (
    <span
      key={tag.id}
      className={`tag ${tag.status}`}
      title={
        tag.status === 'suggested'
          ? 'Suggested tag, not yet approved'
          : 'Approved tag'
      }
    >
      <Link
        className="tag-name"
        to={`/?tag=${tagSlug(tag.name)}`}
        title={`Show everything tagged ${tag.name}`}
      >
        {tag.name}
      </Link>
      {open && (
        <button
          type="button"
          className="tag-x"
          aria-label={`Remove tag ${tag.name}`}
          title={`Remove “${tag.name}”`}
          onClick={() => remove(tag)}
        >
          ×
        </button>
      )}
    </span>
  )

  const general = sorted.filter((t) => t.type === 'general')

  return (
    <div className="submission-tags">
      <div className="tag-line">
        {general.map(chip)}
        {tags.length === 0 && <span className="no-tags">No tags yet</span>}
        {canEdit && (
          <button
            type="button"
            className="tag-button"
            aria-label={`Suggest tags for ${title}`}
            aria-expanded={open}
            title="Suggest tags"
            onClick={() => setOpen(!open)}
          >
            🏷️
          </button>
        )}
      </div>
      {/* Every other type gets its own labelled line, only when the entry
          has a tag of that type. */}
      {TAG_TYPES.filter((type) => type.id !== 'general').map((type) => {
        const ofType = sorted.filter((t) => t.type === type.id)
        return ofType.length > 0 ? (
          <div className="tag-line" key={type.id}>
            <span className="tag-type-label">{type.label}:</span>
            {ofType.map(chip)}
          </div>
        ) : null
      })}
      {open && (
        <Tagger
          label={`Add a tag to ${title}`}
          carried={tags}
          onAdd={add}
          onClose={() => setOpen(false)}
        />
      )}
      {error && (
        <p className="tag-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
