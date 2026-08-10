import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CommentThread } from '../comments'
import { SubmissionCard } from './SubmissionCard'
import { fetchSubmission, type SubmissionListItem } from './api'
import './submissions.css'

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

  return (
    <div className="submission-page">
      <p className="submission-back">
        <Link to="/">← Back to the library</Link>
      </p>
      <SubmissionCard
        item={item}
        currentUserId={currentUserId}
        showDiscussLink={false}
      />
      <CommentThread submissionId={item.id} currentUserId={currentUserId} />
    </div>
  )
}
