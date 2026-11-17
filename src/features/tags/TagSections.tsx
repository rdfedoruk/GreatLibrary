import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MEDIUM_ICONS } from './mediumIcons'
import { Tagger } from './SubmissionTags'
import {
  TAG_TYPES,
  tagSlug,
  tagSubmission,
  tagTypeLabel,
  untagSubmission,
  type Tag,
} from './api'
import './tags.css'

/**
 * What each section on an entry's page is called. A tag type not listed
 * here still gets a section, headed by its label from TAG_TYPES.
 */
const SECTIONS: Record<string, { heading: string; hint: string; empty: string }> = {
  general: {
    heading: 'Topics',
    hint: 'What this content is about',
    empty: 'No topics yet',
  },
  medium: {
    heading: 'Medium',
    hint: 'How it is consumed',
    empty: 'Not yet identified',
  },
  version: {
    heading: 'Applicable versions',
    hint: 'Which ServiceNow releases it applies to',
    empty: 'Not yet identified',
  },
}

/**
 * An entry's tags on its own page: one section per tag type, each with its
 * own add button that only offers tags of that type. Topics run full width;
 * the other types sit side by side beneath.
 */
export function TagSections({
  submissionId,
  tags,
  canEdit,
  onChange,
}: {
  submissionId: string
  tags: Tag[]
  canEdit: boolean
  onChange: (tags: Tag[]) => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const add = (name: string, type?: string) => {
    setError(null)
    tagSubmission(submissionId, name, type)
      .then((tag) => {
        if (!tags.some((t) => t.id === tag.id)) onChange([...tags, tag])
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
  }

  const remove = (tag: Tag) => {
    setError(null)
    untagSubmission(submissionId, tag.id)
      .then(() => onChange(tags.filter((t) => t.id !== tag.id)))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
  }

  const section = (typeId: string) => {
    const words = SECTIONS[typeId] ?? {
      heading: tagTypeLabel(typeId),
      hint: '',
      empty: 'None yet',
    }
    const mine = tags
      .filter((t) => t.type === typeId)
      .sort(
        (a, b) =>
          Number(b.status === 'approved') - Number(a.status === 'approved') ||
          a.name.localeCompare(b.name),
      )
    const editing = open === typeId

    return (
      <section
        key={typeId}
        className={`tag-section tag-section-${typeId}`}
        aria-label={words.heading}
      >
        <div className="curation-head">
          <div>
            <h3>{words.heading}</h3>
            {words.hint && <p className="curation-hint">{words.hint}</p>}
          </div>
          {canEdit && (
            <button
              type="button"
              className="curation-icon-button"
              aria-label={editing ? `Done with ${words.heading}` : `Add ${words.heading}`}
              aria-expanded={editing}
              title={editing ? 'Done' : `Add ${words.heading.toLowerCase()}`}
              onClick={() => setOpen(editing ? null : typeId)}
            >
              {editing ? '✓' : '+'}
            </button>
          )}
        </div>
        <div className="tag-line">
          {mine.map((tag) => {
            const icon =
              typeId === 'medium' ? MEDIUM_ICONS[tag.name.toLowerCase()] : null
            return (
              <span
                key={tag.id}
                className={`tag ${tag.status}${typeId === 'medium' ? ' medium-labelled' : ''}`}
                title={
                  tag.status === 'suggested'
                    ? 'Suggested, not yet approved'
                    : undefined
                }
              >
                <Link
                  className="tag-name"
                  to={`/?tag=${tagSlug(tag.name)}`}
                  title={`Show everything tagged ${tag.name}`}
                >
                  {icon && (
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="medium-icon">
                      {icon}
                    </svg>
                  )}
                  {tag.name}
                </Link>
                {editing && (
                  <button
                    type="button"
                    className="tag-x"
                    aria-label={`Remove tag ${tag.name}`}
                    title={`Remove “${tag.name}”`}
                    onClick={() => remove(tag)}
                  >
                    ×
                  </button>
                )}
              </span>
            )
          })}
          {mine.length === 0 && <span className="no-tags">{words.empty}</span>}
        </div>
        {editing && (
          <Tagger
            label={`Add ${words.heading.toLowerCase()}`}
            carried={tags}
            onlyType={typeId}
            onAdd={add}
            onClose={() => setOpen(null)}
          />
        )}
      </section>
    )
  }

  // Medium first, then the rest in TAG_TYPES order.
  const others = [
    'medium',
    ...TAG_TYPES.map((t) => t.id).filter((id) => id !== 'general' && id !== 'medium'),
  ]

  return (
    <>
      {section('general')}
      <div className="tag-section-row">{others.map(section)}</div>
      {error && (
        <p className="tag-error" role="alert">
          {error}
        </p>
      )}
    </>
  )
}
