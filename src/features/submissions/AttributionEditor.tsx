import { useEffect, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  createUnclaimedProfile,
  searchProfiles,
  type ProfileSearchResult,
} from '../profiles'
import { attributeProfile, removeAttribution, type ProfileRef } from './api'
import './submissions.css'

// Only the submitter sees this, so it lives on the submission's own page
// rather than the feed — the feed would be a row of edit controls nobody but
// one person can use.
export function AttributionEditor({
  submissionId,
  creators,
  onChanged,
}: {
  submissionId: string
  creators: ProfileRef[]
  onChanged: (next: ProfileRef[]) => void
}) {
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
          { id: profile.id, name: profile.display_name, slug: profile.slug },
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
            { id: profile.id, name: profile.display_name, slug: profile.slug },
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
    <section className="attribution" aria-label="Who made this">
      <h3 className="attribution-heading">Who made this?</h3>

      {creators.length > 0 ? (
        <ul className="attribution-list">
          {creators.map((creator) => (
            <li key={creator.id} className="attribution-chip">
              <Link className="profile-link" to={`/profile/${creator.slug}`}>
                {creator.name}
              </Link>
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
            </li>
          ))}
        </ul>
      ) : (
        <p className="attribution-status">
          Nobody credited yet. You submitted this, so you can say who made it.
        </p>
      )}

      <div className="attribution-search">
        <input
          type="text"
          value={query}
          disabled={busy}
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
                  Add “{trimmed}” as a new page
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      {error && <p className="attribution-error">{error}</p>}
    </section>
  )
}
