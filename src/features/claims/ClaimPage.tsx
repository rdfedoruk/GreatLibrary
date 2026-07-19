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

// Claiming is manual by design (2026-07-18): a request goes to the admin,
// who approves the whole thing in one go. Identities here are *evidence for
// that human*, not something the app acts on automatically. The automated
// path (YouTube OAuth proof + content matching) is shelved, not deleted —
// see docs/todo.md § Authors and commit c69fb16.

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
  const [justAdded, setJustAdded] = useState(false)
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
    setJustAdded(false)
    const resolvedPlatform = platform === 'other' ? customPlatform.trim() : platform
    if (!resolvedPlatform || !value.trim()) return
    setStatus('saving')
    try {
      const result = await addIdentity(profile.id, resolvedPlatform, value.trim())
      if (result) {
        setConflict(result)
      } else {
        setValue('')
        setJustAdded(true)
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
      <h3>Your channels and profiles</h3>
      <p className="claim-hint">
        List where you publish. Nobody checks these automatically — they’re
        what a human looks at when reviewing your claim.
      </p>

      {identities && identities.length > 0 && (
        <ul className="identity-list">
          {identities.map((id) => (
            <li key={id.id}>
              <div className="identity-row">
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
              </div>
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
          {status === 'saving' ? 'Adding…' : 'Add'}
        </button>
        {justAdded && <span className="identity-added">Added</span>}
      </form>

      {error && <p className="claim-error">{error}</p>}

      {conflict && (
        <p className="claim-suggestion">
          That’s already listed on{' '}
          <Link to={`/profile/${conflict.profileSlug}`}>
            {conflict.profileName}
          </Link>
          {conflict.claimable ? (
            <>
              {' '}
              — a page nobody has claimed yet. If that’s you:{' '}
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
            "'s page, which someone has already claimed."
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
      <h3>Find your page</h3>
      <p className="claim-hint">
        If your work was submitted here before you joined, it may already have
        a page waiting.
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
      <h3>Your requests</h3>
      <p className="claim-hint">
        Each one is reviewed by hand. You’ll keep your account either way.
      </p>
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
