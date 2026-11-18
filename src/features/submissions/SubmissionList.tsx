import { useEffect, useRef, useState } from 'react'
import { SubmissionCard } from './SubmissionCard'
import {
  fetchSubmissions,
  type SubmissionFilter,
  type SubmissionListItem,
} from './api'
import './submissions.css'

/** How many entries each scroll-triggered load brings in. */
const PAGE_SIZE = 20

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
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState<string | null>(null)
  const sentinel = useRef<HTMLDivElement>(null)
  // Bumped whenever the list starts over, so a slice that arrives after the
  // filter changed is dropped instead of tacked onto the wrong list.
  const generation = useRef(0)

  // The first slice. Starts the list over whenever what it shows changes.
  useEffect(() => {
    const gen = ++generation.current
    setItems(null)
    setError(null)
    setMoreError(null)
    setHasMore(false)
    setLoadingMore(false)
    fetchSubmissions(currentUserId, filter, { offset: 0, limit: PAGE_SIZE })
      .then((data) => {
        if (gen !== generation.current) return
        setItems(data)
        setHasMore(data.length === PAGE_SIZE)
      })
      .catch((err: unknown) => {
        if (gen === generation.current) {
          setError(err instanceof Error ? err.message : String(err))
        }
      })
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

  // Each later slice, fetched when the bottom of the list comes within a
  // screen or so of view.
  useEffect(() => {
    const target = sentinel.current
    if (!target || !items || !hasMore || loadingMore || moreError) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        observer.disconnect()
        const gen = generation.current
        setLoadingMore(true)
        fetchSubmissions(currentUserId, filter, {
          offset: items.length,
          limit: PAGE_SIZE,
        })
          .then((data) => {
            if (gen !== generation.current) return
            // An entry submitted since the first slice shifts everything
            // down one, so the next slice can repeat the last entry shown.
            const seen = new Set(items.map((i) => i.id))
            setItems([...items, ...data.filter((d) => !seen.has(d.id))])
            setHasMore(data.length === PAGE_SIZE)
          })
          .catch((err: unknown) => {
            if (gen === generation.current) {
              setMoreError(err instanceof Error ? err.message : String(err))
            }
          })
          .finally(() => {
            if (gen === generation.current) setLoadingMore(false)
          })
      },
      { rootMargin: '800px 0px' },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [items, hasMore, loadingMore, moreError, currentUserId, filter])

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
    <>
      <section className="submission-list" aria-label="Submissions">
        {items.map((item) => (
          <SubmissionCard
            key={item.id}
            item={item}
            currentUserId={currentUserId}
          />
        ))}
      </section>
      <div ref={sentinel} aria-hidden="true" />
      {loadingMore && <p className="submission-status">Loading more…</p>}
      {moreError && (
        <p className="submission-status">
          Couldn’t load more: {moreError}{' '}
          <button type="button" onClick={() => setMoreError(null)}>
            Try again
          </button>
        </p>
      )}
    </>
  )
}
