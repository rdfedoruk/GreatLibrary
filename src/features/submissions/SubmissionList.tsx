import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { VoteControl } from '../votes'
import {
  fetchSubmissions,
  type SubmissionFilter,
  type SubmissionListItem,
} from './api'
import './submissions.css'

const SOURCE_LABELS: Record<SubmissionListItem['source_site'], string> = {
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  sn_community: 'ServiceNow Community',
  manual: 'Manual',
  generic: 'Web',
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function SubmissionCard({
  item,
  currentUserId,
}: {
  item: SubmissionListItem
  currentUserId: string | null
}) {
  const date = new Date(item.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const medium = item.tags.filter((t) => t.dimension === 'medium')
  const modules = item.tags.filter((t) => t.dimension === 'module')

  return (
    <article className="submission-card">
      <VoteControl
        submissionId={item.id}
        initialScore={item.score}
        initialUserVote={item.userVote}
        currentUserId={currentUserId}
      />
      <div className="submission-body">
        <a
          className="submission-link"
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {item.description}
        </a>
        <p className="submission-meta">
          {hostOf(item.url)} · {SOURCE_LABELS[item.source_site]}
          {item.creators.length > 0 && (
            <>
              {' · by '}
              {item.creators.map((c, i) => (
                <span key={c.slug}>
                  {i > 0 && ', '}
                  <Link className="profile-link" to={`/profile/${c.slug}`}>
                    {c.name}
                  </Link>
                </span>
              ))}
            </>
          )}
          {' · submitted by '}
          <Link className="profile-link" to={`/profile/${item.submitter.slug}`}>
            {item.submitter.name}
          </Link>{' '}
          · {date}
        </p>
        {item.tags.length > 0 && (
          <ul className="submission-tags">
            {[...medium, ...modules].map((tag) => (
              <li
                key={tag.id}
                className={`tag tag-${tag.dimension}`}
                title={tag.dimension === 'medium' ? 'Medium' : 'Module'}
              >
                {tag.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

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
  }, [currentUserId, refreshKey, filter?.submittedBy, filter?.attributedTo])

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
