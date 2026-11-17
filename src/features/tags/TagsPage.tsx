import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  TAG_TYPES,
  TagNameTaken,
  createApprovedTag,
  deleteTag,
  fetchTags,
  mergeTag,
  renameTag,
  setTagStatus,
  setTagType,
  squash,
  tagTypeLabel,
  type TagWithUses,
} from './api'
import './tags.css'

const links = (n: number) => `${n} link${n === 1 ? '' : 's'}`

function TagRow({
  tag,
  approved,
  act,
}: {
  tag: TagWithUses
  /** Approved tags a suggestion could be merged into. */
  approved: TagWithUses[]
  act: (fn: () => Promise<void>) => void
}) {
  const suggested = tag.status === 'suggested'
  const [name, setName] = useState(tag.name)
  const [focused, setFocused] = useState(false)
  // -1: nothing picked, Enter saves the typed name.
  const [active, setActive] = useState(-1)

  const changed = name.trim() !== '' && name.trim() !== tag.name

  // Correcting a suggestion: the name box is also a type-ahead over approved
  // tags, and picking one merges the suggestion into it.
  const q = squash(name)
  const starts = (t: TagWithUses) => (squash(t.name).startsWith(q) ? 0 : 1)
  const choices =
    suggested && focused && q
      ? approved
          .filter((t) => squash(t.name).includes(q))
          .sort((a, b) => starts(a) - starts(b) || a.name.localeCompare(b.name))
          .slice(0, 8)
      : []

  const save = () =>
    act(async () => {
      try {
        await renameTag(tag.id, name)
      } catch (err) {
        if (!(err instanceof TagNameTaken)) throw err
        if (!window.confirm(`${err.message}. Merge "${tag.name}" into it?`)) {
          throw new Error('Rename cancelled')
        }
        await mergeTag(tag.id, err.other.id)
      }
    })

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && choices.length) {
      event.preventDefault()
      // Cycles through the choices and back to "none" (-1).
      const n = choices.length + 1
      const step = event.key === 'ArrowDown' ? 1 : n - 1
      setActive(((active + 1 + step) % n) - 1)
    } else if (event.key === 'Enter') {
      const choice = choices[active]
      if (choice) act(() => mergeTag(tag.id, choice.id))
      else if (changed) save()
    } else if (event.key === 'Escape') {
      setName(tag.name)
      setActive(-1)
    }
  }

  const remove = () => {
    const where = tag.uses ? ` and remove it from ${links(tag.uses)}` : ''
    if (window.confirm(`Delete the tag "${tag.name}"${where}?`)) {
      act(() => deleteTag(tag.id))
    }
  }

  return (
    <div className="tag-row">
      <div className="tag-row-preview">
        <span className={`tag ${tag.status}`}>{tag.name}</span>
      </div>
      <div className="tag-row-rename">
        <input
          type="text"
          value={name}
          maxLength={40}
          autoComplete="off"
          aria-label={`Name of tag ${tag.name}`}
          onChange={(e) => {
            setName(e.target.value)
            setActive(-1)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
        />
        {choices.length > 0 && (
          <ul className="tag-choices" role="listbox">
            {choices.map((choice, i) => (
              <li
                key={choice.id}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault()
                  act(() => mergeTag(tag.id, choice.id))
                }}
                onMouseMove={() => setActive(i)}
              >
                Merge into
                <span className="tag approved">{choice.name}</span>
                {choice.type !== 'general' && tagTypeLabel(choice.type)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" className="quiet" disabled={!changed} onClick={save}>
        Save
      </button>
      <select
        value={tag.type}
        aria-label={`Type of tag ${tag.name}`}
        onChange={(e) => act(() => setTagType(tag.id, e.target.value))}
      >
        {TAG_TYPES.map((type) => (
          <option key={type.id} value={type.id}>
            {type.label}
          </option>
        ))}
      </select>
      <span className="tag-row-uses">{links(tag.uses)}</span>
      <button
        type="button"
        className={suggested ? undefined : 'quiet'}
        onClick={() =>
          act(() => setTagStatus(tag.id, suggested ? 'approved' : 'suggested'))
        }
      >
        {suggested ? 'Approve' : 'Unapprove'}
      </button>
      <button
        type="button"
        className="quiet tag-row-delete"
        aria-label={`Delete tag ${tag.name}`}
        title={`${suggested ? 'Reject' : 'Delete'} “${tag.name}”`}
        onClick={remove}
      >
        🗑
      </button>
    </div>
  )
}

/**
 * The tags page: approve / unapprove, rename (renaming onto an existing name
 * offers a merge), change type, delete, and create approved tags directly.
 * Open to every signed-in account until there is a roles layer.
 */
export function TagsPage({ signedIn }: { signedIn: boolean }) {
  const [tags, setTags] = useState<TagWithUses[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('general')

  const refresh = useCallback(
    () =>
      fetchTags()
        .then(setTags)
        .catch((err: unknown) =>
          setError(err instanceof Error ? err.message : String(err)),
        ),
    [],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  const act = (fn: () => Promise<void>) => {
    setError(null)
    fn()
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => void refresh())
  }

  if (!signedIn) {
    return (
      <p className="tags-status">
        Sign in to manage tags. <Link to="/">Back to the library</Link>
      </p>
    )
  }

  const create = (event: FormEvent) => {
    event.preventDefault()
    act(async () => {
      await createApprovedTag(newName, newType)
      setNewName('')
    })
  }

  const suggested = tags?.filter((t) => t.status === 'suggested') ?? []
  const approved = tags?.filter((t) => t.status === 'approved') ?? []

  return (
    <div className="tags-page">
      <form className="tag-create" onSubmit={create}>
        <input
          type="text"
          value={newName}
          maxLength={40}
          autoComplete="off"
          required
          placeholder="New approved tag"
          aria-label="New tag name"
          onChange={(e) => setNewName(e.target.value)}
        />
        <select
          value={newType}
          aria-label="New tag type"
          onChange={(e) => setNewType(e.target.value)}
        >
          {TAG_TYPES.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
        <button type="submit">Create tag</button>
      </form>
      <p className="tag-error" role="alert">
        {error}
      </p>
      {tags === null ? (
        <p className="tags-status">Loading tags…</p>
      ) : (
        <>
          <h3>Suggested · awaiting approval ({suggested.length})</h3>
          {suggested.length === 0 && <p className="no-tags">Nothing waiting.</p>}
          {suggested.map((tag) => (
            // Keyed on the name too, so a rename resets the row's text box.
            <TagRow key={tag.id + tag.name} tag={tag} approved={approved} act={act} />
          ))}
          <h3>Approved ({approved.length})</h3>
          {approved.length === 0 && (
            <p className="no-tags">No approved tags yet.</p>
          )}
          {approved.map((tag) => (
            <TagRow key={tag.id + tag.name} tag={tag} approved={approved} act={act} />
          ))}
        </>
      )}
    </div>
  )
}
