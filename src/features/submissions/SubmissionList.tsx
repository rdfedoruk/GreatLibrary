import { useEffect, useState } from 'react'
import { SubmissionCard } from './SubmissionCard'
import {
  fetchSubmissions,
  type SubmissionFilter,
  type SubmissionListItem,
} from './api'
import './submissions.css'

export function SubmissionList({
  currentUserId = null,
  refreshKey = 0,
  filter,
  emptyMessage = 'The shelves are empty — the first submission will land here.',
}: {
  currentUserId?: string | null
  refreshKey?: number
  filter?: SubmissionFilter
  emptyMessage?: string
}) {
  const [items, setItems] = useState<SubmissionListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchSubmissions(currentUserId, filter)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
    // Filter fields are listed one by one because the filter object itself is
    // rebuilt on every render. A new field added to SubmissionFilter must be
    // added here too, or it will look like it works and quietly not refetch.
  }, [
    currentUserId,
    refreshKey,
    filter?.submittedBy,
    filter?.attributedTo,
    filter?.taggedWith,
  ])

  if (error) {
    return <p className="submission-status">Couldn’t load the library: {error}</p>
  }
  if (items === null) {
    return <p className="submission-status">Loading the library…</p>
  }
  if (items.length === 0) {
    return <p className="submission-status">{emptyMessage}</p>
  }
  return (
    <section className="submission-list" aria-label="Submissions">
      {items.map((item) => (
        <SubmissionCard
          key={item.id}
          item={item}
          currentUserId={currentUserId}
        />
      ))}
    </section>
  )
}
