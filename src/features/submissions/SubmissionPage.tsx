import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CommentThread } from '../comments'
import { TagSections } from '../tags'
import { VoteControl } from '../votes'
import { AttributionEditor } from './AttributionEditor'
import {
  fetchSubmission,
  retitleSubmission,
  type ProfileRef,
  type SubmissionListItem,
  type SubmissionTag,
} from './api'
import { ago, fullDate, hostOf } from './format'
import './submissions.css'

/**
 * An entry's own page: what it is at the top, then everything the community
 * can curate about it (title, tags by type, credits), then the discussion.
 */
export function SubmissionPage({
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
      />

      <section className="curation-card" aria-label="Curation">
        <header className="curation-card-head">
          <p className="eyebrow">Community record</p>
          <h2>Curation</h2>
        </header>
        <TagSections
          submissionId={item.id}
          tags={item.tags}
          canEdit={signedIn}
          onChange={(tags: SubmissionTag[]) => update({ tags })}
        />
        <AttributionEditor
          submissionId={item.id}
          creators={item.creators}
          canEdit={signedIn}
          onChanged={(creators: ProfileRef[]) => update({ creators })}
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
}: {
  item: SubmissionListItem
  currentUserId: string | null
  onRetitled: (title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.title)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const medium = item.tags.find((t) => t.type === 'medium')

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
      {item.thumbnailUrl && (
        <img className="entry-thumb" src={item.thumbnailUrl} alt="" />
      )}
      <div className="entry-body">
        {medium && <p className="eyebrow">{medium.name}</p>}

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
          {' · added '}
          <time dateTime={item.created_at} title={fullDate(item.created_at)}>
            {ago(item.created_at)}
          </time>
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
        </div>
      </div>
    </article>
  )
}
