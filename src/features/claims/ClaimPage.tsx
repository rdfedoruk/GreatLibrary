import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { connectYoutube } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { fetchOwnProfile, type Profile } from '../profiles'
import {
  addIdentity,
  attributeSubmission,
  fetchIdentities,
  fetchMyClaims,
  findYoutubeMatches,
  removeIdentity,
  requestClaim,
  searchUnclaimedProfiles,
  verifyYoutubeChannel,
  type Identity,
  type IdentityConflict,
  type MyClaim,
  type UnclaimedProfile,
  type YoutubeMatch,
} from './api'
import './claims.css'

// Set just before bouncing to Google so the return trip knows to finish the
// job. Without it, every later page load would re-run verification.
const PENDING_VERIFY = 'greatlibrary.pending_youtube_verify'

const PLATFORMS = ['youtube', 'linkedin', 'sn_community', 'podcast', 'website']

function YoutubeMatchChecker({
  profileId,
  identityValue,
}: {
  profileId: string
  identityValue: string
}) {
  const [matches, setMatches] = useState<YoutubeMatch[] | null>(null)
  const [checking, setChecking] = useState(false)
  const [attributed, setAttributed] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  async function handleCheck() {
    setChecking(true)
    setError(null)
    try {
      const found = await findYoutubeMatches(profileId, identityValue)
      setMatches(found)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setChecking(false)
    }
  }

  async function handleAttribute(submissionId: string) {
    try {
      await attributeSubmission(submissionId, profileId)
      setAttributed((s) => new Set(s).add(submissionId))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="match-checker">
      <button type="button" onClick={() => void handleCheck()} disabled={checking}>
        {checking ? 'Checking…' : 'Check for matching videos'}
      </button>
      {error && <p className="claim-error">{error}</p>}
      {matches && matches.length === 0 && (
        <p className="claim-hint">No unattributed videos found from this channel.</p>
      )}
      {matches && matches.length > 0 && (
        <ul className="match-results">
          {matches.map((m) => (
            <li key={m.submissionId}>
              <a href={m.url} target="_blank" rel="noopener noreferrer">
                {m.description}
              </a>
              {attributed.has(m.submissionId) ? (
                <span className="claim-status claim-status-approved">
                  attributed
                </span>
              ) : (
                <button type="button" onClick={() => void handleAttribute(m.submissionId)}>
                  Attribute to me
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

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
  const [verifyState, setVerifyState] = useState<'idle' | 'verifying' | 'done'>(
    'idle',
  )
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const verifyRan = useRef(false)

  function reload() {
    fetchIdentities(profile.id).then(setIdentities).catch(() => setIdentities([]))
  }

  useEffect(reload, [profile.id])

  // Finishes the trip back from Google: the one-time provider token rides in
  // on the session, gets handed to the server to confirm against YouTube,
  // and is never trusted on the client.
  useEffect(() => {
    if (verifyRan.current) return
    if (sessionStorage.getItem(PENDING_VERIFY) !== '1') return
    verifyRan.current = true

    void (async () => {
      setVerifyState('verifying')
      const { data } = await supabase.auth.getSession()
      const token = data.session?.provider_token
      sessionStorage.removeItem(PENDING_VERIFY)
      if (!token) {
        setVerifyState('idle')
        setVerifyError('Google didn’t hand back a token. Try connecting again.')
        return
      }
      try {
        await verifyYoutubeChannel(token)
        setVerifyState('done')
        reload()
      } catch (err) {
        setVerifyState('idle')
        setVerifyError(err instanceof Error ? err.message : String(err))
      }
    })()
  }, [profile.id])

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
        Add the channels and profiles that are yours. Only checked ones can
        pull in your content — typing something in doesn’t prove it’s yours.
      </p>

      <div className="verify-row">
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(PENDING_VERIFY, '1')
            void connectYoutube()
          }}
        >
          Connect my YouTube channel
        </button>
        <span className="claim-hint">
          Google asks you to sign in to the channel — nothing to type.
        </span>
      </div>
      {verifyState === 'verifying' && (
        <p className="claim-hint">Checking with YouTube…</p>
      )}
      {verifyState === 'done' && (
        <p className="claim-suggestion">Channel confirmed and added.</p>
      )}
      {verifyError && <p className="claim-error">{verifyError}</p>}

      {identities && identities.length > 0 && (
        <ul className="identity-list">
          {identities.map((id) => (
            <li key={id.id}>
              <div className="identity-row">
                <span className="identity-platform">{id.platform}</span>
                <span className="identity-value">{id.identity_value}</span>
                {id.verified ? (
                  <span
                    className="identity-badge identity-badge-verified"
                    title="Confirmed by the platform"
                  >
                    ✓ checked
                  </span>
                ) : (
                  <span
                    className="identity-badge"
                    title="You typed this; nothing has confirmed it"
                  >
                    not checked
                  </span>
                )}
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
              {id.platform === 'youtube' && id.verified && (
                <YoutubeMatchChecker
                  profileId={profile.id}
                  identityValue={id.identity_value}
                />
              )}
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
