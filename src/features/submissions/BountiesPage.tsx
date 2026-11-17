import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SubmissionCard } from './SubmissionCard'
import {
  fetchSubmissions,
  type SubmissionListItem,
  type SubmissionTag,
} from './api'
import './submissions.css'

// Bounties tabs. Each lists the entries with no approved tag among those its
// `counts` accepts. The tab is kept in the address (/bounties#versions).
// A new tab is one more row here.
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
  const tab = TABS.find((t) => `#${t.id}` === hash) ?? TABS[0]

  const [items, setItems] = useState<SubmissionListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
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
            aria-selected={t === tab}
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
      </div>
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
    </div>
  )
}
