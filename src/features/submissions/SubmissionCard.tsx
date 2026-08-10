import { Link } from 'react-router-dom'
import { VoteControl } from '../votes'
import type { SubmissionListItem } from './api'
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

export function SubmissionCard({
  item,
  currentUserId,
  showDiscussLink = true,
}: {
  item: SubmissionListItem
  currentUserId: string | null
  // Off on the discussion page itself, where the link would point at the
  // page you're already on.
  showDiscussLink?: boolean
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
        {showDiscussLink && (
          // The title above leaves for the content itself, so discussion needs
          // its own way in.
          <Link className="submission-discuss" to={`/submission/${item.id}`}>
            Discuss ({item.commentCount})
          </Link>
        )}
      </div>
    </article>
  )
}
