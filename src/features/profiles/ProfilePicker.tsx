import { useEffect, useState, type KeyboardEvent } from 'react'
import { searchProfiles, type ProfileSearchResult, type ProfileStatus } from './api'
import './profiles.css'

/**
 * A profile chosen for an entry that doesn't exist yet. \`id\` is null for a
 * new name: the submit form creates it as a suggested profile only once the
 * entry has been created, so cancelling leaves nothing behind.
 */
export interface PickedProfile {
  id: string | null
  name: string
  status: ProfileStatus
}

/** Type-ahead over profiles, for crediting who made an entry being submitted. */
export function ProfilePicker({
  picked,
  onChange,
}: {
  picked: PickedProfile[]
  onChange: (next: PickedProfile[]) => void
}) {
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<ProfileSearchResult[]>([])
  const [active, setActive] = useState(0)
  const trimmed = query.replace(/\s+/g, ' ').trim()

  // Debounced: profiles are searched in the database, not a list in memory.
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

  const lower = trimmed.toLowerCase()
  const isPicked = (name: string) =>
    picked.some((p) => p.name.toLowerCase() === name.toLowerCase())

  const choices: PickedProfile[] = matches
    .filter((m) => !isPicked(m.display_name))
    .map((m) => ({ id: m.id, name: m.display_name, status: m.status }))
  // An exact match means "use that profile", not "make a second one with the
  // same name" — the commonest way duplicates get created.
  const exact = matches.some((m) => m.display_name.toLowerCase() === lower)
  if (trimmed && !exact && !isPicked(trimmed)) {
    choices.push({ id: null, name: trimmed, status: 'suggested' })
  }
  const current = Math.min(active, Math.max(choices.length - 1, 0))

  const pick = (choice: PickedProfile) => {
    onChange([...picked, choice])
    setQuery('')
    setMatches([])
    setActive(0)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (choices.length) {
        const step = event.key === 'ArrowDown' ? 1 : choices.length - 1
        setActive((current + step) % choices.length)
      }
    } else if (event.key === 'Enter') {
      // Never submits the form from here.
      event.preventDefault()
      if (choices[current]) pick(choices[current])
    } else if (event.key === 'Escape') {
      setQuery('')
    }
  }

  return (
    <div className="profile-picker">
      {picked.length > 0 && (
        <ul className="profile-picker-chips">
          {picked.map((p) => (
            <li
              key={p.id ?? `new:${p.name}`}
              className={`profile-chip ${p.status}`}
              title={p.status === 'suggested' ? 'Suggested: awaiting approval' : undefined}
            >
              {p.name}
              <button
                type="button"
                className="profile-chip-x"
                aria-label={`Remove ${p.name}`}
                onClick={() => onChange(picked.filter((x) => x !== p))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="profile-picker-search">
        <input
          type="text"
          value={query}
          autoComplete="off"
          placeholder="Who made this? Search a name, or type a new one…"
          aria-label="Attributions"
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
        />
        {choices.length > 0 && (
          <ul className="profile-picker-choices" role="listbox">
            {choices.map((choice, i) => (
              <li
                key={choice.id ?? 'new'}
                role="option"
                aria-selected={i === current}
                // mousedown, not click: click fires after the input loses focus.
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(choice)
                }}
                onMouseMove={() => setActive(i)}
              >
                {choice.id === null && 'Suggest new profile'}
                <span className={`profile-chip ${choice.status}`}>{choice.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
