import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  approveProfile,
  deleteSuggestedProfile,
  mergeProfile,
  renameSuggestedProfile,
  searchProfiles,
  type ProfileSearchResult,
  type SuggestedProfile,
} from './api'
import './profiles.css'

const entries = (n: number) => `${n} entr${n === 1 ? 'y' : 'ies'}`

function SuggestedProfileRow({
  profile,
  act,
}: {
  profile: SuggestedProfile
  act: (fn: () => Promise<void>) => void
}) {
  const [name, setName] = useState(profile.display_name)
  const renamed = name.trim() !== '' && name.trim() !== profile.display_name
  const rename = () => act(() => renameSuggestedProfile(profile.id, name))

  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<ProfileSearchResult[]>([])
  const trimmed = query.trim()

  // Debounced, as in the attribution editor: profiles are searched in the
  // database, not a list in memory.
  useEffect(() => {
    if (trimmed.length === 0) {
      setMatches([])
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      searchProfiles(trimmed, { approvedOnly: true })
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

  const remove = () => {
    const where = profile.credits.length
      ? ` and take it off ${entries(profile.credits.length)}`
      : ''
    if (window.confirm(`Delete "${profile.display_name}"${where}?`)) {
      act(() => deleteSuggestedProfile(profile.id))
    }
  }

  return (
    <li className="suggested-profile" aria-label={profile.display_name}>
      <div className="suggested-profile-head">
        <Link className="profile-chip suggested" to={`/profile/${profile.slug}`}>
          {profile.display_name}
        </Link>
        <input
          type="text"
          className="suggested-profile-name"
          value={name}
          autoComplete="off"
          aria-label={`Name of ${profile.display_name}`}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && renamed) rename()
            if (e.key === 'Escape') setName(profile.display_name)
          }}
        />
        <button type="button" className="quiet" disabled={!renamed} onClick={rename}>
          Save
        </button>
        <button type="button" onClick={() => act(() => approveProfile(profile.id))}>
          Approve
        </button>
        <div className="suggested-profile-merge">
          <input
            type="text"
            value={query}
            autoComplete="off"
            placeholder="Merge into…"
            aria-label={`Merge ${profile.display_name} into`}
            onChange={(e) => setQuery(e.target.value)}
          />
          {trimmed.length > 0 && (
            <ul className="suggested-profile-choices">
              {matches.length === 0 && <li className="none">No approved profile matches</li>}
              {matches.map((match) => (
                <li key={match.id}>
                  <button
                    type="button"
                    onClick={() => act(() => mergeProfile(profile.id, match.id))}
                  >
                    Merge into <span className="profile-chip">{match.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          className="quiet"
          aria-label={`Delete ${profile.display_name}`}
          title={`Delete “${profile.display_name}”`}
          onClick={remove}
        >
          🗑
        </button>
      </div>
      {profile.credits.length > 0 ? (
        <ul className="suggested-profile-credits">
          {profile.credits.map((credit) => (
            <li key={credit.id}>
              <Link to={`/submission/${credit.id}`}>{credit.title}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="suggested-profile-credits none">Not credited on any entry.</p>
      )}
    </li>
  )
}

/**
 * The Profiles tab of Curation Bounties: names someone typed in that don't
 * have a profile yet. Each can be approved, merged into an approved profile
 * (its credits move over), or deleted. Open to every signed-in account until
 * there is a roles layer.
 */
export function SuggestedProfiles({
  profiles,
  onChanged,
}: {
  profiles: SuggestedProfile[]
  /** Called after every change, so the list can be loaded again. */
  onChanged: () => void
}) {
  const [error, setError] = useState<string | null>(null)

  const act = (fn: () => Promise<void>) => {
    setError(null)
    fn()
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
      .finally(onChanged)
  }

  return (
    <>
      {error && (
        <p className="suggested-profile-error" role="alert">
          {error}
        </p>
      )}
      <ul className="suggested-profiles" aria-label="Suggested profiles">
        {profiles.map((profile) => (
          // Keyed on the name too, so a rename resets the row's text box.
          <SuggestedProfileRow key={profile.id + profile.display_name} profile={profile} act={act} />
        ))}
      </ul>
    </>
  )
}
