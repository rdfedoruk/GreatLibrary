import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SubmissionList } from '../submissions'
import { fetchProfileBySlug, type Profile } from './api'
import './profiles.css'

export function ProfilePage({
  currentUserId,
}: {
  currentUserId: string | null
}) {
  const { slug } = useParams<{ slug: string }>()
  const [profile, setProfile] = useState<Profile | null | 'loading'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setProfile('loading')
    fetchProfileBySlug(slug)
      .then((p) => {
        if (!cancelled) setProfile(p)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (error) {
    return <p className="profile-status">Couldn’t load this profile: {error}</p>
  }
  if (profile === 'loading') {
    return <p className="profile-status">Loading…</p>
  }
  if (profile === null) {
    return (
      <p className="profile-status">
        No profile here. <Link to="/">Back to the library</Link>
      </p>
    )
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <h2 className="profile-name">
          {profile.display_name}
          {profile.claimed && (
            <span className="profile-claimed" title="Claimed profile">
              ✓
            </span>
          )}
        </h2>
        {profile.type === 'entity' && (
          <span className="profile-type-chip">Entity</span>
        )}
      </header>

      <section className="profile-section">
        <h3>Content by {profile.display_name}</h3>
        <SubmissionList
          currentUserId={currentUserId}
          filter={{ attributedTo: profile.id }}
          emptyMessage="Nothing attributed yet."
        />
      </section>

      {profile.type === 'person' && (
        <section className="profile-section">
          <h3>Submitted by {profile.display_name}</h3>
          <SubmissionList
            currentUserId={currentUserId}
            filter={{ submittedBy: profile.id }}
            emptyMessage="No submissions yet."
          />
        </section>
      )}
    </div>
  )
}
