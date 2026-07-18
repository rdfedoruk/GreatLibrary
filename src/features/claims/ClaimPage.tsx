import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOwnProfile, type Profile } from '../profiles'
import {
  addIdentity,
  fetchIdentities,
  fetchMyClaims,
  removeIdentity,
  requestClaim,
  searchUnclaimedProfiles,
  type Identity,
  type IdentityConflict,
  type MyClaim,
  type UnclaimedProfile,
} from './api'
import './claims.css'

const PLATFORMS = ['youtube', 'linkedin', 'sn_community', 'podcast', 'website']

function IdentitySection({
  profile,
  userId,
  onClaimRequested,
}: {
  profile: Profile
  userId: string
  onClaimRequested: () => void
}) {
  const [identities, setIdentities] = useState<Identity[] | null>(null)
  const [platform, setPlatform] = useState(PLATFORMS[0])
  const [customPlatform, setCustomPlatform] = useState('')
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<IdentityConflict | null>(null)
  const [conflictClaiming, setConflictClaiming] = useState(false)
  const [conflictRequested, setConflictRequested] = useState(false)

  function reload() {
    fetchIdentities(profile.id).then(setIdentities).catch(() => setIdentities([]))
  }

  useEffect(reload, [profile.id])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setConflict(null)
    const resolvedPlatform = platform === 'other' ? customPlatform.trim() : platform
    if (!resolvedPlatform || !value.trim()) return
    setStatus('saving')
    try {
      const result = await addIdentity(profile.id, resolvedPlatform, value.trim())
      if (result) {
        setConflict(result)
      } else {
        setValue('')
        reload()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setStatus('idle')
    }
  }

  async function handleClaimConflict() {
    if (!conflict) return
    setConflictClaiming(true)
    try {
      await requestClaim(userId, conflict.profileId)
      setConflictRequested(true)
      onClaimRequested()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setConflictClaiming(false)
    }
  }

  return (
    <section className="claim-section">
      <h3>Your identities</h3>
      <p className="claim-hint">
        Add the channels and profiles that are yours. This is what a claim
        gets checked against.
      </p>

      {identities && identities.length > 0 && (
        <ul className="identity-list">
          {identities.map((id) => (
            <li key={id.id}>
              <span className="identity-platform">{id.platform}</span>
              <span className="identity-value">{id.identity_value}</span>
              <button
                type="button"
                className="identity-remove"
                onClick={() =>
                  removeIdentity(id.id).then(reload).catch(() => reload())
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="identity-form" onSubmit={(e) => void handleAdd(e)}>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
          <option value="other">other…</option>
        </select>
        {platform === 'other' && (
          <input
            placeholder="platform name"
            value={customPlatform}
            onChange={(e) => setCustomPlatform(e.target.value)}
          />
        )}
        <input
          placeholder="channel ID / profile URL / handle"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" disabled={status === 'saving'}>
          Add
        </button>
      </form>

      {error && <p className="claim-error">{error}</p>}

      {conflict && (
        <p className="claim-suggestion">
          That identity is already on{' '}
          <Link to={`/profile/${conflict.profileSlug}`}>
            {conflict.profileName}
          </Link>
          {conflict.claimable ? (
            <>
              {' '}
              — unclaimed. Looks like it might be you.{' '}
              {conflictRequested ? (
                'Claim requested.'
              ) : (
                <button
                  type="button"
                  onClick={() => void handleClaimConflict()}
                  disabled={conflictClaiming}
                >
                  {conflictClaiming ? 'Requesting…' : 'Request this claim'}
                </button>
              )}
            </>
          ) : (
            "'s page, which is already claimed by someone else."
          )}
        </p>
      )}
    </section>
  )
}

function ClaimSearchSection({
  userId,
  onRequested,
}: {
  userId: string
  onRequested: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UnclaimedProfile[]>([])
  const [status, setStatus] = useState<Record<string, 'idle' | 'requesting' | 'error'>>(
    {},
  )

  useEffect(() => {
    const handle = setTimeout(() => {
      searchUnclaimedProfiles(query)
        .then(setResults)
        .catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(handle)
  }, [query])

  async function handleRequest(profileId: string) {
    setStatus((s) => ({ ...s, [profileId]: 'requesting' }))
    try {
      await requestClaim(userId, profileId)
      onRequested()
      setStatus((s) => ({ ...s, [profileId]: 'idle' }))
    } catch {
      setStatus((s) => ({ ...s, [profileId]: 'error' }))
    }
  }

  return (
    <section className="claim-section">
      <h3>Or search for your page</h3>
      <p className="claim-hint">
        If content was submitted about you before you joined, it may already
        have an unclaimed page.
      </p>
      <input
        className="claim-search-input"
        placeholder="Search by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length > 0 && (
        <ul className="claim-results">
          {results.map((p) => (
            <li key={p.id}>
              <Link to={`/profile/${p.slug}`}>{p.display_name}</Link>
              <button
                type="button"
                onClick={() => void handleRequest(p.id)}
                disabled={status[p.id] === 'requesting'}
              >
                {status[p.id] === 'requesting' ? 'Requesting…' : 'Request claim'}
              </button>
              {status[p.id] === 'error' && (
                <span className="claim-error">Already requested.</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function MyClaimsSection({ userId, refreshKey }: { userId: string; refreshKey: number }) {
  const [claims, setClaims] = useState<MyClaim[] | null>(null)

  useEffect(() => {
    fetchMyClaims(userId).then(setClaims).catch(() => setClaims([]))
  }, [userId, refreshKey])

  if (!claims || claims.length === 0) return null

  return (
    <section className="claim-section">
      <h3>Your claim requests</h3>
      <ul className="claim-results">
        {claims.map((c) => (
          <li key={c.id}>
            <Link to={`/profile/${c.profileSlug}`}>{c.profileName}</Link>
            <span className={`claim-status claim-status-${c.status}`}>
              {c.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ClaimPage({ userId }: { userId: string | null }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!userId) return
    fetchOwnProfile(userId).then(setProfile).catch(() => setProfile(null))
  }, [userId])

  if (!userId) {
    return (
      <p className="claim-status-msg">
        Sign in to claim a page. <Link to="/">Back to the library</Link>
      </p>
    )
  }

  if (!profile) {
    return <p className="claim-status-msg">Loading…</p>
  }

  return (
    <div className="claim-page">
      <h2>Claim your page</h2>
      <IdentitySection
        profile={profile}
        userId={userId}
        onClaimRequested={() => setRefreshKey((k) => k + 1)}
      />
      <ClaimSearchSection
        userId={userId}
        onRequested={() => setRefreshKey((k) => k + 1)}
      />
      <MyClaimsSection userId={userId} refreshKey={refreshKey} />
    </div>
  )
}
