import { useEffect, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  createUnclaimedProfile,
  searchProfiles,
  type ProfileSearchResult,
} from '../profiles'
import { attributeProfile, removeAttribution, type ProfileRef } from './api'
import './submissions.css'

// Who made an entry, on its own page. Everyone sees the list; anyone signed
// in can add and remove credits (migration 15).
export function CreditsSection({
  submissionId,
  creators,
  canEdit,
  onChanged,
}: {
  submissionId: string
  creators: ProfileRef[]
  canEdit: boolean
  onChanged: (next: ProfileRef[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<ProfileSearchResult[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = query.trim()

  // Debounced so a typed name isn't one request per keystroke. Tags search a
  // list already in memory; profiles can't be — there will eventually be
  // thousands, and new ones appear as people are credited.
  useEffect(() => {
    if (trimmed.length === 0) {
      setMatches([])
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      searchProfiles(trimmed)
        .then((found) => {
          if (!cancelled) setMatches(found)
        })
        .catch(() => {
          if (!cancelled) setMatches([])
        })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmed])

  const alreadyCredited = (id: string) => creators.some((c) => c.id === id)
  const suggestions = matches.filter((m) => !alreadyCredited(m.id))

  // An exact name match means "add the existing page", not "make a second one
  // with the same name" — the commonest way duplicates get created.
  const exactMatch = matches.some(
    (m) => m.display_name.toLowerCase() === trimmed.toLowerCase(),
  )

  const add = (profile: ProfileSearchResult) => {
    if (busy) return
    setBusy(true)
    setError(null)
    attributeProfile(submissionId, profile.id)
      .then(() => {
        onChanged([
          ...creators,
          {
            id: profile.id,
            name: profile.display_name,
            slug: profile.slug,
            status: profile.status,
            type: profile.type,
          },
        ])
        setQuery('')
        setMatches([])
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => setBusy(false))
  }

  const addNew = () => {
    if (busy || trimmed.length === 0) return
    setBusy(true)
    setError(null)
    createUnclaimedProfile(trimmed)
      .then((profile) =>
        attributeProfile(submissionId, profile.id).then(() => {
          onChanged([
            ...creators,
            {
              id: profile.id,
              name: profile.display_name,
              slug: profile.slug,
              status: profile.status,
              type: profile.type,
            },
          ])
          setQuery('')
          setMatches([])
        }),
      )
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => setBusy(false))
  }

  const remove = (creator: ProfileRef) => {
    if (busy) return
    setBusy(true)
    setError(null)
    removeAttribution(submissionId, creator.id)
      .then(() => onChanged(creators.filter((c) => c.id !== creator.id)))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => setBusy(false))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (suggestions.length > 0) add(suggestions[0])
    else if (!exactMatch) addNew()
  }

  return (
    <section className="curation-section" aria-label="People and organizations">
      <div className="curation-head">
        <h3>People &amp; organizations</h3>
        {canEdit && (
          <button
            type="button"
            className="curation-icon-button"
            aria-label={open ? 'Done with people and organizations' : 'Edit people and organizations'}
            aria-expanded={open}
            title={open ? 'Done' : 'Edit'}
            onClick={() => {
              setOpen(!open)
              setQuery('')
            }}
          >
            {open ? '✓' : (
              <svg viewBox="0 0 24 24" aria-hidden="true" className="action-icon">
                <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            )}
          </button>
        )}
      </div>

      {creators.length > 0 ? (
        <ul className="attribution-list">
          {creators.map((creator) => (
            <li
              key={creator.id}
              className={`attribution-chip ${creator.status} ${creator.type}`}
              title={
                creator.status === 'suggested'
                  ? 'Suggested: awaiting approval'
                  : undefined
              }
            >
              <span className="attribution-avatar" aria-hidden="true">
                {initials(creator.name)}
              </span>
              <Link className="profile-link" to={`/profile/${creator.slug}`}>
                {creator.name}
              </Link>
              {open && (
                <button
                  type="button"
                  className="attribution-remove"
                  title={`Remove ${creator.name}`}
                  aria-label={`Remove ${creator.name}`}
                  disabled={busy}
                  onClick={() => remove(creator)}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="attribution-status">Nobody credited yet.</p>
      )}

      {open && (
        <div className="attribution-search">
          <input
            type="text"
            value={query}
            disabled={busy}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search a name, or type a new one…"
            aria-label="Search for who made this"
          />
          {trimmed.length > 0 && (
            <ul className="attribution-suggestions">
              {suggestions.map((profile) => (
                <li key={profile.id}>
                  <button type="button" disabled={busy} onClick={() => add(profile)}>
                    {profile.display_name}
                    {profile.status === 'suggested' && (
                      <span className="attribution-kind"> · suggested</span>
                    )}
                    {profile.type === 'entity' && (
                      <span className="attribution-kind"> · entity</span>
                    )}
                  </button>
                </li>
              ))}
              {!exactMatch && (
                <li>
                  <button
                    type="button"
                    className="attribution-add-new"
                    disabled={busy}
                    onClick={addNew}
                  >
                    Suggest “{trimmed}” as a new profile
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {error && <p className="attribution-error">{error}</p>}
    </section>
  )
}

/** "CJ Desai" → "CD"; one word gives its first two letters. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/)
  const letters =
    words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2)
  return letters.toUpperCase()
}
