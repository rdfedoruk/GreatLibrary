import { useState } from 'react'
import { Link } from 'react-router-dom'
import { VoteControl } from '../votes'
import { SubmissionTags } from '../tags'
import type { SubmissionListItem, SubmissionTag } from './api'
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
  onTagsChanged,
}: {
  item: SubmissionListItem
  currentUserId: string | null
  // Off on the discussion page itself, where the link would point at the
  // page you're already on.
  showDiscussLink?: boolean
  // Told when someone adds or removes a tag here, for a page whose contents
  // depend on the tags (Curation Bounties).
  onTagsChanged?: (tags: SubmissionTag[]) => void
}) {
  const [tags, setTags] = useState(item.tags)
  const date = new Date(item.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <article className="submission-card">
      <VoteControl
        submissionId={item.id}
        initialScore={item.score}
        initialUserVote={item.userVote}
        currentUserId={currentUserId}
      />
      {item.thumbnailUrl && (
        <img
          className="submission-thumb"
          src={item.thumbnailUrl}
          alt=""
          loading="lazy"
        />
      )}
      <div className="submission-body">
        <a
          className="submission-link"
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {item.title}
        </a>
        {item.description && (
          <p className="submission-description">{item.description}</p>
        )}
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
        <SubmissionTags
          submissionId={item.id}
          title={item.title}
          tags={tags}
          canEdit={currentUserId !== null}
          onChange={(next) => {
            setTags(next)
            onTagsChanged?.(next)
          }}
        />
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
