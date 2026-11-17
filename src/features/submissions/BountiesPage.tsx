import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  SuggestedProfiles,
  fetchSuggestedProfiles,
  type SuggestedProfile,
} from '../profiles'
import { SubmissionCard } from './SubmissionCard'
import {
  fetchSubmissions,
  type SubmissionListItem,
  type SubmissionTag,
} from './api'
import './submissions.css'

// Bounties tabs. Each lists the entries with no approved tag among those its
// `counts` accepts. The tab is kept in the address (/bounties#versions).
// A new tab of entries is one more row here. The Profiles tab, after these,
// lists names waiting for approval instead of entries.
const TABS = [
  {
    id: 'tags',
    label: 'Tags',
    counts: (_tag: SubmissionTag) => true,
    intro:
      'Entries with no approved tag yet. Tag one below; it leaves this list once it carries an approved tag.',
    toggle: 'Include entries that already have suggested tags',
    toggleKey: 'bounties.showSuggested',
    empty: 'No bounties: every entry has an approved tag.',
    emptyStrict: 'No untagged entries.',
  },
  {
    id: 'versions',
    label: 'Applicable versions',
    counts: (tag: SubmissionTag) => tag.type === 'version',
    intro:
      'The ideal is to capture the minimum version needed for this content to be applicable.',
    toggle: 'Include entries that already have suggested versions',
    toggleKey: 'bounties.versions.showSuggested',
    empty: 'No bounties: every entry has an approved version.',
    emptyStrict: 'No entries without a version.',
  },
]
type Tab = (typeof TABS)[number]

const PROFILES_TAB = 'profiles'

/**
 * Entries still open on a tab: none of the tags it counts is approved — or,
 * with suggested ones left out, it has none of them at all.
 */
function open(items: SubmissionListItem[], tab: Tab, includeSuggested: boolean) {
  return items.filter(
    (item) =>
      !item.tags.some(
        (tag) =>
          tab.counts(tag) && (tag.status === 'approved' || !includeSuggested),
      ),
  )
}

const stored = (tab: Tab) => localStorage.getItem(tab.toggleKey) !== '0'

export function BountiesPage({ currentUserId }: { currentUserId: string | null }) {
  const { hash } = useLocation()
  const navigate = useNavigate()
  const onProfiles = hash === `#${PROFILES_TAB}`
  const tab = TABS.find((t) => `#${t.id}` === hash) ?? TABS[0]

  const [items, setItems] = useState<SubmissionListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<SuggestedProfile[] | null>(null)
  const [profilesError, setProfilesError] = useState<string | null>(null)
  // Bumped when a setting changes, so the remembered values are read again.
  const [, setSettingsVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchSubmissions(currentUserId)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [currentUserId])

  const loadProfiles = useCallback(
    () =>
      fetchSuggestedProfiles()
        .then((data) => {
          setProfiles(data)
          setProfilesError(null)
        })
        .catch((err: unknown) =>
          setProfilesError(err instanceof Error ? err.message : String(err)),
        ),
    [],
  )

  useEffect(() => {
    void loadProfiles()
  }, [loadProfiles])

  const includeSuggested = stored(tab)
  const visible = items ? open(items, tab, includeSuggested) : []

  return (
    <div className="bounties-page">
      <h2>Curation Bounties</h2>
      <div className="bounty-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className="bounty-tab"
            aria-selected={!onProfiles && t === tab}
            onClick={() => navigate(`/bounties#${t.id}`)}
          >
            {t.label}
            {items && (
              <span className="bounty-count">
                {open(items, t, stored(t)).length}
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          role="tab"
          className="bounty-tab"
          aria-selected={onProfiles}
          onClick={() => navigate(`/bounties#${PROFILES_TAB}`)}
        >
          Profiles
          {profiles && <span className="bounty-count">{profiles.length}</span>}
        </button>
      </div>
      {onProfiles ? (
        <>
          <p className="bounty-intro">
            Names typed in while crediting an entry that don’t have a profile
            yet. Approve one to make it a real profile, merge it into the
            profile it should have been, or delete it.
          </p>
          {profilesError ? (
            <p className="submission-status">
              Couldn’t load suggested profiles: {profilesError}
            </p>
          ) : profiles === null ? (
            <p className="submission-status">Loading…</p>
          ) : profiles.length === 0 ? (
            <p className="submission-status">No profiles waiting for approval.</p>
          ) : currentUserId === null ? (
            <p className="submission-status">
              {profiles.length} waiting. Sign in to approve them.
            </p>
          ) : (
            <SuggestedProfiles
              profiles={profiles}
              onChanged={() => void loadProfiles()}
            />
          )}
        </>
      ) : (
        <>
          <p className="bounty-intro">{tab.intro}</p>
          <label className="bounty-toggle">
            <input
              type="checkbox"
              checked={includeSuggested}
              onChange={(e) => {
                localStorage.setItem(tab.toggleKey, e.target.checked ? '1' : '0')
                setSettingsVersion((v) => v + 1)
              }}
            />{' '}
            {tab.toggle}
          </label>
          {error ? (
            <p className="submission-status">Couldn’t load the library: {error}</p>
          ) : items === null ? (
            <p className="submission-status">Loading the library…</p>
          ) : visible.length === 0 ? (
            <p className="submission-status">
              {includeSuggested ? tab.empty : tab.emptyStrict}
            </p>
          ) : (
            <section className="submission-list" aria-label="Bounties">
              {visible.map((item) => (
                <SubmissionCard
                  key={item.id}
                  item={item}
                  currentUserId={currentUserId}
                  onTagsChanged={(tags) =>
                    setItems(
                      (prev) =>
                        prev?.map((p) => (p.id === item.id ? { ...p, tags } : p)) ??
                        null,
                    )
                  }
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
