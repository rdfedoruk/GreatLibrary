import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCapability } from '../capabilities'
import { CommentThread } from '../comments'
import { TagSections } from '../tags'
import { VoteControl } from '../votes'
import { CreditsSection } from './CreditsSection'
import {
  deleteSubmission,
  fetchSubmission,
  regenerateThumbnail,
  retitleSubmission,
  type ProfileRef,
  type SubmissionListItem,
  type SubmissionTag,
} from './api'
import { dayAgo, fullDay, hostOf } from './format'
import './submissions.css'

/**
 * An entry's own page: what it is at the top, then everything the community
 * can curate about it (title, tags by type, credits), then the discussion.
 */
export function CurationPage({
  currentUserId,
}: {
  currentUserId: string | null
}) {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<SubmissionListItem | null | 'loading'>(
    'loading',
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setItem('loading')
    fetchSubmission(id, currentUserId)
      .then((data) => {
        if (!cancelled) setItem(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [id, currentUserId])

  if (error) {
    return (
      <p className="submission-status">Couldn’t load this submission: {error}</p>
    )
  }
  if (item === 'loading') {
    return <p className="submission-status">Loading…</p>
  }
  if (item === null) {
    return (
      <p className="submission-status">
        Nothing here. <Link to="/">Back to the library</Link>
      </p>
    )
  }

  const signedIn = currentUserId !== null
  const update = (patch: Partial<SubmissionListItem>) =>
    setItem((prev) =>
      prev === null || prev === 'loading' ? prev : { ...prev, ...patch },
    )

  return (
    <div className="submission-page">
      <p className="submission-back">
        <Link to="/">← Back to the library</Link>
      </p>

      <EntryHeader
        item={item}
        currentUserId={currentUserId}
        onRetitled={(title) => update({ title })}
        onThumbnail={(thumbnailUrl) => update({ thumbnailUrl })}
      />

      <section className="curation-card" aria-label="Curation">
        <CreditsSection
          submissionId={item.id}
          creators={item.creators}
          canEdit={signedIn}
          onChanged={(creators: ProfileRef[]) => update({ creators })}
        />
        <TagSections
          submissionId={item.id}
          tags={item.tags}
          canEdit={signedIn}
          onChange={(tags: SubmissionTag[]) => update({ tags })}
        />
      </section>

      <CommentThread submissionId={item.id} currentUserId={currentUserId} />
    </div>
  )
}

function EntryHeader({
  item,
  currentUserId,
  onRetitled,
  onThumbnail,
}: {
  item: SubmissionListItem
  currentUserId: string | null
  onRetitled: (title: string) => void
  onThumbnail: (thumbnailUrl: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.title)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const canDelete = useCapability('delete_entries', currentUserId)
  const [deleting, setDeleting] = useState(false)

  const remove = () => {
    if (
      !window.confirm(
        `Delete “${item.title}” for good? Its tags, credits, votes and comments go too. This can’t be undone.`,
      )
    )
      return
    setDeleting(true)
    setError(null)
    deleteSubmission(item.id)
      .then(() => navigate('/'))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err))
        setDeleting(false)
      })
  }

  const [regenerating, setRegenerating] = useState(false)

  const regenerate = () => {
    setRegenerating(true)
    setError(null)
    regenerateThumbnail(item.id)
      .then((thumbnailUrl) => onThumbnail(thumbnailUrl))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => setRegenerating(false))
  }

  const save = (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    retitleSubmission(item.id, draft)
      .then((title) => {
        onRetitled(title)
        setEditing(false)
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => setBusy(false))
  }

  return (
    <article className="entry-header">
      {(item.thumbnailUrl || currentUserId !== null) && (
        <div className="entry-thumb-col">
          {item.thumbnailUrl && (
            <img className="entry-thumb" src={item.thumbnailUrl} alt="" />
          )}
          {currentUserId !== null && (
            <button
              type="button"
              className="quiet"
              disabled={regenerating}
              title="Draw a new thumbnail from the title above, replacing the old one"
              onClick={regenerate}
            >
              {regenerating ? 'Regenerating…' : 'Regenerate thumbnail'}
            </button>
          )}
        </div>
      )}
      <div className="entry-body">
        {editing ? (
          <form className="entry-title-form" onSubmit={save}>
            <input
              type="text"
              value={draft}
              autoFocus
              disabled={busy}
              aria-label="Title"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditing(false)
              }}
            />
            <div className="entry-title-actions">
              <button type="submit" disabled={busy || !draft.trim()}>
                Save title
              </button>
              <button
                type="button"
                className="quiet"
                disabled={busy}
                onClick={() => {
                  setEditing(false)
                  setError(null)
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="entry-title-row">
            <h1 className="entry-title">{item.title}</h1>
            {currentUserId !== null && (
              <button
                type="button"
                className="curation-icon-button"
                aria-label="Edit title"
                title="Edit title"
                onClick={() => {
                  setDraft(item.title)
                  setEditing(true)
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="action-icon">
                  <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </button>
            )}
          </div>
        )}
        {error && <p className="attribution-error">{error}</p>}

        <p className="submission-meta">
          {item.creators.length > 0 && (
            <>
              <span className="submission-creators">
                {item.creators.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 && ', '}
                    <Link className={`profile-link ${c.status}`} to={`/profile/${c.slug}`}>
                      {c.name}
                    </Link>
                  </span>
                ))}
              </span>
              {' · '}
            </>
          )}
          {hostOf(item.url)}
          {item.published_on && (
            <>
              {' · published '}
              <time className="published-date" dateTime={item.published_on} title={fullDay(item.published_on)}>
                {dayAgo(item.published_on)}
              </time>
            </>
          )}
          {item.updated_on && (
            <>
              {' · updated '}
              <time className="updated-date" dateTime={item.updated_on} title={fullDay(item.updated_on)}>
                {dayAgo(item.updated_on)}
              </time>
            </>
          )}
        </p>

        {item.description && (
          <p className="submission-description">{item.description}</p>
        )}

        <div className="entry-actions">
          <VoteControl
            submissionId={item.id}
            initialScore={item.score}
            initialUserVote={item.userVote}
            currentUserId={currentUserId}
          />
          <a
            className="entry-open"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open original ↗
          </a>
          {canDelete && (
            <button
              type="button"
              className="quiet entry-delete"
              disabled={deleting}
              onClick={remove}
            >
              {deleting ? 'Deleting…' : 'Delete entry'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
