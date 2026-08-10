import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  COMMENT_TYPES,
  deleteComment,
  fetchComments,
  postComment,
  updateComment,
  type CommentItem,
  type CommentType,
} from './api'
import './comments.css'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function TypeSelect({
  value,
  disabled,
  onChange,
}: {
  value: CommentType
  disabled: boolean
  onChange: (next: CommentType) => void
}) {
  return (
    <select
      aria-label="Comment type"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as CommentType)}
    >
      {COMMENT_TYPES.map((type) => (
        <option key={type} value={type}>
          {type}
        </option>
      ))}
    </select>
  )
}

function CommentRow({
  item,
  isMine,
  onChanged,
  onRemoved,
}: {
  item: CommentItem
  isMine: boolean
  onChanged: (next: CommentItem) => void
  onRemoved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(item.body)
  const [commentType, setCommentType] = useState<CommentType>(item.comment_type)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEditing = () => {
    setBody(item.body)
    setCommentType(item.comment_type)
    setError(null)
    setEditing(true)
  }

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    if (busy || body.trim() === '') return
    setBusy(true)
    setError(null)
    updateComment(item.id, body, commentType)
      .then((next) => {
        onChanged(next)
        setEditing(false)
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => setBusy(false))
  }

  const remove = () => {
    if (busy) return
    if (!window.confirm('Delete this comment? This can’t be undone.')) return
    setBusy(true)
    setError(null)
    deleteComment(item.id)
      .then(onRemoved)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err))
        setBusy(false)
      })
  }

  return (
    <li className="comment">
      <p className="comment-meta">
        <Link className="profile-link" to={`/profile/${item.author.slug}`}>
          {item.author.name}
        </Link>
        {' · '}
        <span className={`comment-type comment-type-${item.comment_type}`}>
          {item.comment_type}
        </span>
        {' · '}
        {formatDate(item.created_at)}
        {item.edited_at !== null && (
          <span
            className="comment-edited"
            title={`Edited ${formatDate(item.edited_at)}`}
          >
            {' · edited'}
          </span>
        )}
      </p>

      {editing ? (
        <form className="comment-form" onSubmit={save}>
          <div className="comment-form-row">
            <TypeSelect
              value={commentType}
              disabled={busy}
              onChange={setCommentType}
            />
            <textarea
              aria-label="Edit your comment"
              rows={2}
              value={body}
              disabled={busy}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          {error && <p className="comment-error">{error}</p>}
          <div className="comment-form-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
            <button type="submit" disabled={busy || body.trim() === ''}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="comment-body">{item.body}</p>
          {error && <p className="comment-error">{error}</p>}
          {isMine && (
            <p className="comment-actions">
              <button type="button" disabled={busy} onClick={startEditing}>
                Edit
              </button>
              <button type="button" disabled={busy} onClick={remove}>
                Delete
              </button>
            </p>
          )}
        </>
      )}
    </li>
  )
}

export function CommentThread({
  submissionId,
  currentUserId,
}: {
  submissionId: string
  currentUserId: string | null
}) {
  const [items, setItems] = useState<CommentItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [body, setBody] = useState('')
  const [commentType, setCommentType] = useState<CommentType>('comment')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchComments(submissionId)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [submissionId])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (currentUserId === null || posting) return
    if (body.trim() === '') return

    setPosting(true)
    setError(null)
    postComment(submissionId, currentUserId, body, commentType)
      .then((created) => {
        setItems((prev) => [...(prev ?? []), created])
        setBody('')
        setCommentType('comment')
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => setPosting(false))
  }

  const replaceItem = (next: CommentItem) =>
    setItems((prev) =>
      (prev ?? []).map((c) => (c.id === next.id ? next : c)),
    )

  const dropItem = (id: string) =>
    setItems((prev) => (prev ?? []).filter((c) => c.id !== id))

  return (
    <section className="comment-thread" aria-label="Discussion">
      <h3 className="comment-heading">
        Discussion{items !== null && ` (${items.length})`}
      </h3>

      <div className="comment-panel">
        {error && <p className="comment-error">{error}</p>}

        {items === null && !error && <p className="comment-status">Loading…</p>}

        {items !== null && items.length > 0 && (
          <ul className="comment-list">
            {items.map((item) => (
              <CommentRow
                key={item.id}
                item={item}
                isMine={item.authorId === currentUserId}
                onChanged={replaceItem}
                onRemoved={() => dropItem(item.id)}
              />
            ))}
          </ul>
        )}

        {items !== null && items.length === 0 && (
          <p className="comment-status">
            {currentUserId !== null
              ? 'Nothing here yet — say the first thing.'
              : 'Nothing here yet.'}
          </p>
        )}

        {currentUserId === null && items !== null && (
          <p className="comment-status">Sign in to join the discussion.</p>
        )}

        {currentUserId !== null && (
          <form className="comment-form" onSubmit={submit}>
            <div className="comment-form-row">
              <TypeSelect
                value={commentType}
                disabled={posting}
                onChange={setCommentType}
              />
              <textarea
                aria-label="Your comment"
                placeholder="Add to the discussion…"
                rows={3}
                value={body}
                disabled={posting}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div className="comment-form-actions">
              <button type="submit" disabled={posting || body.trim() === ''}>
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
