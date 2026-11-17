import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  SuggestedProfiles,
  fetchSuggestedProfiles,
  type SuggestedProfile,
} from '../profiles'
import { TagsPage } from '../tags'
import { SubmissionCard } from './SubmissionCard'
import { fetchSubmissions, type SubmissionListItem } from './api'
import './submissions.css'

// Bounties tabs that list entries still missing something. The tab is kept in
// the address (/bounties#versions). After these come Profiles (names waiting
// for approval) and Tags (managing the tag list), which aren't entry lists.
interface EntryTab {
  id: string
  label: string
  /** Still a bounty? `includeSuggested`: a suggested tag doesn't count yet. */
  isOpen: (item: SubmissionListItem, includeSuggested: boolean) => boolean
  intro: string
  /** The checkbox for counting suggested tags, on tabs that have one. */
  toggle?: { label: string; key: string }
  empty: string
  emptyStrict?: string
  /** Shown on a card worked on this visit that is no longer a bounty. */
  done: string
  /** The card carries the credits editor. */
  credits?: boolean
}

const lacksTag =
  (type: string) => (item: SubmissionListItem, includeSuggested: boolean) =>
    !item.tags.some(
      (tag) =>
        tag.type === type && (tag.status === 'approved' || !includeSuggested),
    )

const TABS: EntryTab[] = [
  {
    id: 'untagged',
    label: 'Untagged',
    isOpen: lacksTag('general'),
    intro:
      'Entries with no approved tag yet (medium and version don’t count). Tag one below; it stays here until you leave, so you can add several.',
    toggle: {
      label: 'Include entries that already have suggested tags',
      key: 'bounties.showSuggested',
    },
    empty: 'No bounties: every entry has an approved tag.',
    emptyStrict: 'No untagged entries.',
    done: 'Tagged',
  },
  {
    id: 'versions',
    label: 'Unversioned',
    isOpen: lacksTag('version'),
    intro:
      'The ideal is to capture the minimum version needed for this content to be applicable.',
    toggle: {
      label: 'Include entries that already have suggested versions',
      key: 'bounties.versions.showSuggested',
    },
    empty: 'No bounties: every entry has an approved version.',
    emptyStrict: 'No entries without a version.',
    done: 'Versioned',
  },
  {
    id: 'unattributed',
    label: 'Unattributed',
    // Any credit counts, even to a name still waiting for its profile.
    isOpen: (item) => item.creators.length === 0,
    intro:
      'Entries nobody is credited on. Add who made them below; a typed-in name counts even before its profile is approved.',
    empty: 'No bounties: every entry is credited to someone.',
    done: 'Attributed',
    credits: true,
  },
]

const PROFILES_TAB = 'profiles'
const TAGS_TAB = 'tags'

const stored = (tab: EntryTab) =>
  tab.toggle ? localStorage.getItem(tab.toggle.key) !== '0' : false

const openOn = (items: SubmissionListItem[], tab: EntryTab) =>
  items.filter((item) => tab.isOpen(item, stored(tab)))

export function BountiesPage({
  currentUserId,
  signedIn,
}: {
  currentUserId: string | null
  signedIn: boolean
}) {
  const { hash } = useLocation()
  const navigate = useNavigate()
  const onProfiles = hash === `#${PROFILES_TAB}`
  const onTags = hash === `#${TAGS_TAB}`
  const tab = TABS.find((t) => `#${t.id}` === hash) ?? TABS[0]

  const [items, setItems] = useState<SubmissionListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<SuggestedProfile[] | null>(null)
  const [profilesError, setProfilesError] = useState<string | null>(null)
  // Bumped when a setting changes, so the remembered values are read again.
  const [, setSettingsVersion] = useState(0)
  // Entries worked on since arriving on this tab. They stay listed (faded) so
  // you can add a second tag or credit; switching tabs or reloading clears it.
  const [keptIds, setKeptIds] = useState<Set<string>>(new Set())
  const [keptOn, setKeptOn] = useState(hash)
  if (keptOn !== hash) {
    setKeptOn(hash)
    setKeptIds(new Set())
  }

  // Loaded again on every tab switch: work done on one tab (approving a tag,
  // say) changes what the others list.
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
  }, [currentUserId, hash])

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
  }, [loadProfiles, hash])

  const includeSuggested = stored(tab)
  const visible = items
    ? items.filter(
        (item) => tab.isOpen(item, includeSuggested) || keptIds.has(item.id),
      )
    : []

  const change = (id: string, patch: Partial<SubmissionListItem>) => {
    setKeptIds((prev) => new Set(prev).add(id))
    setItems((prev) => prev?.map((p) => (p.id === id ? { ...p, ...patch } : p)) ?? null)
  }

  const tabButton = (id: string, label: string, selected: boolean, count?: number) => (
    <button
      key={id}
      type="button"
      role="tab"
      className="bounty-tab"
      aria-selected={selected}
      onClick={() => navigate(`/bounties#${id}`)}
    >
      {label}
      {count !== undefined && <span className="bounty-count">{count}</span>}
    </button>
  )

  return (
    <div className="bounties-page">
      <div className="bounty-tabs" role="tablist">
        {TABS.map((t) =>
          tabButton(
            t.id,
            t.label,
            !onProfiles && !onTags && t === tab,
            items ? openOn(items, t).length : undefined,
          ),
        )}
        {tabButton(PROFILES_TAB, 'Profiles', onProfiles, profiles?.length)}
        {tabButton(TAGS_TAB, 'Tags', onTags)}
      </div>
      {onTags ? (
        <TagsPage signedIn={signedIn} />
      ) : onProfiles ? (
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
          {tab.toggle && (
            <label className="bounty-toggle">
              <input
                type="checkbox"
                checked={includeSuggested}
                onChange={(e) => {
                  localStorage.setItem(tab.toggle!.key, e.target.checked ? '1' : '0')
                  setSettingsVersion((v) => v + 1)
                }}
              />{' '}
              {tab.toggle.label}
            </label>
          )}
          {error ? (
            <p className="submission-status">Couldn’t load the library: {error}</p>
          ) : items === null ? (
            <p className="submission-status">Loading the library…</p>
          ) : visible.length === 0 ? (
            <p className="submission-status">
              {includeSuggested || !tab.emptyStrict ? tab.empty : tab.emptyStrict}
            </p>
          ) : (
            <section className="submission-list" aria-label="Bounties">
              {visible.map((item) => (
                <SubmissionCard
                  key={item.id}
                  item={item}
                  currentUserId={currentUserId}
                  done={tab.isOpen(item, includeSuggested) ? undefined : tab.done}
                  onTagsChanged={(tags) => change(item.id, { tags })}
                  onCreatorsChanged={
                    tab.credits
                      ? (creators) => change(item.id, { creators })
                      : undefined
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
