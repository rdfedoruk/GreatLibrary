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

/** Line icons for the media. A medium with no icon here shows its name. */
const MEDIUM_ICONS: Record<string, ReactNode> = {
  video: (
    <>
      <path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </>
  ),
  podcast: (
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <path d="M12 18v4" />
    </>
  ),
  article: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v5h5" />
      <path d="M8 13h8M8 17h8M8 9h2" />
    </>
  ),
  repo: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="8" r="2.5" />
      <path d="M6 8.5v7M18 10.5c0 4-6 3-11 5.5" />
    </>
  ),
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
