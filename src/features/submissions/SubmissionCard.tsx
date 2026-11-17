import { useState } from 'react'
import { Link } from 'react-router-dom'
import { VoteControl } from '../votes'
import { SubmissionTags } from '../tags'
import type { SubmissionListItem, SubmissionTag } from './api'
import { ago, fullDate, hostOf } from './format'
import './submissions.css'

export function SubmissionCard({
  item,
  currentUserId,
  showDiscussLink = true,
  onTagsChanged,
}: {
  item: SubmissionListItem
  currentUserId: string | null
  // Off on the discussion page itself, where the link would point at the
  // page you're already on. Also decides whether tags fold into "+N": the
  // discussion page shows them all.
  showDiscussLink?: boolean
  // Told when someone adds or removes a tag here, for a page whose contents
  // depend on the tags (Curation Bounties).
  onTagsChanged?: (tags: SubmissionTag[]) => void
}) {
  const [tags, setTags] = useState(item.tags)

  return (
    <article className="submission-card">
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
        <p className="submission-meta">
          {item.creators.length > 0 ? (
            <span className="submission-creators">
              {item.creators.map((c, i) => (
                <span key={c.slug}>
                  {i > 0 && ', '}
                  <Link
                    className={`profile-link ${c.status}`}
                    to={`/profile/${c.slug}`}
                    title={
                      c.status === 'suggested'
                        ? 'Suggested: awaiting approval'
                        : undefined
                    }
                  >
                    {c.name}
                  </Link>
                </span>
              ))}
            </span>
          ) : (
            <span className="submission-creators none">
              Creator not yet attributed
            </span>
          )}
          {' · '}
          {hostOf(item.url)}
          {' · '}
          <time dateTime={item.created_at} title={fullDate(item.created_at)}>
            {ago(item.created_at)}
          </time>
        </p>
        {item.description && (
          <p className="submission-description">{item.description}</p>
        )}
        <SubmissionTags
          submissionId={item.id}
          title={item.title}
          tags={tags}
          canEdit={currentUserId !== null}
          compact={showDiscussLink}
          onChange={(next) => {
            setTags(next)
            onTagsChanged?.(next)
          }}
          actions={
            <>
              <VoteControl
                submissionId={item.id}
                initialScore={item.score}
                initialUserVote={item.userVote}
                currentUserId={currentUserId}
              />
              {showDiscussLink && (
                // The title leaves for the content itself, so discussion
                // needs its own way in.
                <Link
                  className="submission-discuss"
                  to={`/submission/${item.id}`}
                  aria-label={`Discuss (${item.commentCount})`}
                  title="Discuss"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="action-icon">
                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
                  </svg>
                  {item.commentCount}
                </Link>
              )}
            </>
          }
        />
      </div>
    </article>
  )
}
