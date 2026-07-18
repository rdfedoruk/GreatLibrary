import { useEffect, useState } from 'react'
import { fetchSubmissions, type SubmissionListItem } from './api'
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

function SubmissionCard({ item }: { item: SubmissionListItem }) {
  const date = new Date(item.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const medium = item.tags.filter((t) => t.dimension === 'medium')
  const modules = item.tags.filter((t) => t.dimension === 'module')

  return (
    <article className="submission-card">
      <div className="submission-score" title="Net votes">
        {item.score > 0 ? `+${item.score}` : item.score}
      </div>
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
          {item.creatorName ? ` · by ${item.creatorName}` : ''} · submitted by{' '}
          {item.submitterName} · {date}
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

export function SubmissionList() {
  const [items, setItems] = useState<SubmissionListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchSubmissions()
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <p className="submission-status">Couldn’t load the library: {error}</p>
  }
  if (items === null) {
    return <p className="submission-status">Loading the library…</p>
  }
  if (items.length === 0) {
    return (
      <p className="submission-status">
        The shelves are empty — the first submission will land here.
      </p>
    )
  }
  return (
    <section className="submission-list" aria-label="Submissions">
      {items.map((item) => (
        <SubmissionCard key={item.id} item={item} />
      ))}
    </section>
  )
}
