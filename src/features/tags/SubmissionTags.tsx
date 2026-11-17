import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
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
import { MEDIUM_ICONS } from './mediumIcons'
import './tags.css'

type Choice = { key: string; name: string; type?: string; tag?: Tag }

/** The type-ahead: pick an existing tag, or suggest a new one. */
export function Tagger({
  label,
  carried,
  onAdd,
  onClose,
  autoFocus = true,
  onlyType,
}: {
  label: string
  carried: Tag[]
  /** `tag` is the existing tag picked, if it was one rather than a new name. */
  onAdd: (name: string, type?: string, tag?: Tag) => void
  onClose: () => void
  autoFocus?: boolean
  /** Offer only tags of this type, and suggest new names only as this type. */
  onlyType?: string
}) {
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  // The list shows only while the box has focus, so it doesn't sit over
  // whatever is below it (in the submit form, the Submit button).
  const [focused, setFocused] = useState(autoFocus)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    fetchTags()
      .then((tags) => {
        if (!cancelled) setAllTags(tags)
      })
      .catch(() => {})
    if (autoFocus) input.current?.focus()
    return () => {
      cancelled = true
    }
  }, [autoFocus])

  const typed = query.replace(/\s+/g, ' ').trim()
  const q = typed.toLowerCase()
  const mine = new Set(carried.map((t) => t.id))
  const carriedNames = new Set(carried.map((t) => t.name.toLowerCase()))
  const starts = (t: Tag) => (t.name.toLowerCase().startsWith(q) ? 0 : 1)
  const matches = allTags
    .filter(
      (t) =>
        !mine.has(t.id) &&
        (!onlyType || t.type === onlyType) &&
        t.name.toLowerCase().includes(q),
    )
    .sort((a, b) => starts(a) - starts(b) || a.name.localeCompare(b.name))
    .slice(0, 8)
  const exact = allTags.find((t) => t.name.toLowerCase() === q)
  // A new name already picked but not yet saved isn't in allTags.
  const pickedNew = carriedNames.has(q) && !exact

  const choices: Choice[] = matches.map((t) => ({
    key: t.id,
    name: t.name,
    tag: t,
  }))
  if (q && !exact && !pickedNew) {
    // One "suggest" choice per type: a plain tag first, then e.g. a version.
    for (const type of TAG_TYPES) {
      if (onlyType && type.id !== onlyType) continue
      choices.push({ key: `new-${type.id}`, name: typed, type: type.id })
    }
  }
  // Names are unique across every type, so a name another type already
  // uses can't be suggested again here — say so rather than show nothing.
  const otherType =
    onlyType && exact && exact.type !== onlyType && !mine.has(exact.id)
      ? exact
      : null
  const current = Math.min(active, Math.max(choices.length - 1, 0))

  const pick = (choice: Choice) => {
    onAdd(choice.name, choice.type ?? choice.tag?.type, choice.tag)
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {/* On an entry an empty box lists every tag to browse; in the submit
          form (no autofocus) the list waits for typing. */}
      {focused && (q || autoFocus) && (choices.length > 0 || (exact && mine.has(exact.id)) || otherType) && (
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
          {otherType && (
            <li className="note">
              “{otherType.name}” is already a{' '}
              {tagTypeLabel(otherType.type).toLowerCase()}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}


/** How many plain tags a feed card shows before folding the rest into "+N". */
const SHOWN_ON_CARD = 2

/**
 * The tags on one entry. Each chip is a link into a feed of everything
 * sharing the tag; media show as icons. On a feed card (`compact`) only the
 * first two plain tags show, and the rest, versions included, fold into
 * "+N". Signed in, the tag button opens the type-ahead, and while it is open
 * every tag shows with an × to take it off.
 *
 * `actions` sits at the right-hand end of the tag row; the card puts votes
 * and the comment count there.
 */
export function SubmissionTags({
  submissionId,
  title,
  tags,
  canEdit,
  compact = false,
  actions,
  onChange,
}: {
  submissionId: string
  /** What the entry is called, for the button's spoken label. */
  title: string
  tags: Tag[]
  canEdit: boolean
  compact?: boolean
  actions?: ReactNode
  onChange: (tags: Tag[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
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

  const removeButton = (tag: Tag) =>
    open && (
      <button
        type="button"
        className="tag-x"
        aria-label={`Remove tag ${tag.name}`}
        title={`Remove “${tag.name}”`}
        onClick={() => remove(tag)}
      >
        ×
      </button>
    )

  const chip = (tag: Tag) => (
    <span
      key={tag.id}
      className={`tag ${tag.status}`}
      title={
        tag.status === 'suggested'
          ? 'Suggested tag, not yet approved'
          : `Approved ${tagTypeLabel(tag.type).toLowerCase()}`
      }
    >
      <Link
        className="tag-name"
        to={`/?tag=${tagSlug(tag.name)}`}
        title={`Show everything tagged ${tag.name}`}
      >
        {tag.name}
      </Link>
      {removeButton(tag)}
    </span>
  )

  const mediumChip = (tag: Tag) => {
    const icon = MEDIUM_ICONS[tag.name.toLowerCase()]
    const note = tag.status === 'suggested' ? ' (suggested)' : ''
    return (
      <span key={tag.id} className={`tag medium ${tag.status}`}>
        <Link
          className="tag-name"
          to={`/?tag=${tagSlug(tag.name)}`}
          aria-label={icon ? tag.name : undefined}
          title={`${tag.name}${note}: show everything in this medium`}
        >
          {icon ? (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="medium-icon">
              {icon}
            </svg>
          ) : (
            tag.name
          )}
        </Link>
        {removeButton(tag)}
      </span>
    )
  }

  const media = sorted.filter((t) => t.type === 'medium')
  // Plain tags first, versions after, so on a card the versions fold away.
  const others = [
    ...sorted.filter((t) => t.type === 'general'),
    ...sorted.filter((t) => t.type !== 'general' && t.type !== 'medium'),
  ]
  const showAll = !compact || expanded || open
  const shown = showAll ? others : others.slice(0, SHOWN_ON_CARD)
  const folded = others.length - shown.length

  return (
    <div className="submission-tags">
      <div className="tag-bar">
        <div className="tag-line">
          {shown.map(chip)}
          {folded > 0 && (
            <button
              type="button"
              className="tag-more"
              title={others
                .slice(SHOWN_ON_CARD)
                .map((t) => t.name)
                .join(', ')}
              aria-label={`Show ${folded} more tag${folded === 1 ? '' : 's'}`}
              onClick={() => setExpanded(true)}
            >
              +{folded}
            </button>
          )}
          {media.map(mediumChip)}
          {tags.length === 0 && <span className="no-tags">No tags yet</span>}
        </div>
        <div className="tag-actions">
          {actions}
          {canEdit && (
            <button
              type="button"
              className="tag-button"
              aria-label={`Suggest tags for ${title}`}
              aria-expanded={open}
              title="Suggest tags"
              onClick={() => setOpen(!open)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="action-icon">
                <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z" />
                <circle cx="7.5" cy="7.5" r="1.2" />
              </svg>
            </button>
          )}
        </div>
      </div>
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
