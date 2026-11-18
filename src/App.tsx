import { useCallback, useEffect, useState } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import './App.css'
import { signInWithEmail, signInWithGoogle, signOut, useSession } from './lib/auth'
import {
  BountiesPage,
  SubmissionList,
  SubmissionPage,
  CurationPage,
  SubmitForm,
} from './features/submissions'
import { ProfilePage } from './features/profiles'
import { fetchTags, tagSlug, type Tag, type TagWithUses } from './features/tags'
import { FeedSearch } from './features/search'
import { PrivacyPage } from './features/privacy'

function EmailSignIn() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    const { error } = await signInWithEmail(email)
    setStatus(error ? 'error' : 'sent')
  }

  if (status === 'sent') {
    return <span className="account-name">Check {email} for a sign-in link.</span>
  }

  return (
    <form className="email-signin" onSubmit={(e) => void handleSubmit(e)}>
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" className="quiet" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Continue with email'}
      </button>
      {status === 'error' && <span className="email-error">Something went wrong. Try again.</span>}
    </form>
  )
}

function Home({
  session,
  refreshKey,
  onSubmitted,
  submitOpen,
  onCloseSubmit,
}: {
  session: ReturnType<typeof useSession>['session']
  refreshKey: number
  onSubmitted: () => void
  submitOpen: boolean
  onCloseSubmit: () => void
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tags, setTags] = useState<TagWithUses[] | null>(null)
  const [tagsError, setTagsError] = useState<string | null>(null)

  // The search lives in the address — `?tag=itsm&tag=video&q=projectile` —
  // so a search can be shared and the back button undoes it.
  const tagSlugs = searchParams.getAll('tag').filter(Boolean)
  const text = searchParams.get('q') ?? ''
  const searching = tagSlugs.length > 0 || text.trim() !== ''

  // The tags are needed both for the search box's suggestions and to turn
  // the names in the address back into tags. They're fetched again when the
  // address names one not in the list — a tag suggested on a card a moment
  // ago and clicked straight away — and only then called unknown.
  const tagKey = tagSlugs.join()
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const known = (slug: string) => tags?.some((t) => tagSlug(t.name) === slug) ?? false
  const stale = tags === null || (loadedFor !== tagKey && !tagSlugs.every(known))

  useEffect(() => {
    if (!stale) return
    let cancelled = false
    fetchTags()
      .then((data) => {
        if (cancelled) return
        setTags(data)
        setLoadedFor(tagKey)
      })
      .catch((err: unknown) => {
        if (!cancelled) setTagsError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [stale, tagKey])

  const picked = tagSlugs.flatMap(
    (slug) => tags?.filter((t) => tagSlug(t.name) === slug) ?? [],
  )
  const unknown = stale ? [] : tagSlugs.filter((slug) => !known(slug))

  // Typing replaces the current address rather than adding to the history,
  // so the back button doesn't step back through every pause in typing.
  // Adding or removing a tag is a step back can undo.
  const changeSearch = useCallback(
    (nextTags: Tag[], nextText: string) => {
      const next = new URLSearchParams()
      for (const t of nextTags) next.append('tag', tagSlug(t.name))
      if (nextText.trim()) next.set('q', nextText)
      const sameTags = next.getAll('tag').join() === searchParams.getAll('tag').join()
      setSearchParams(next, { replace: sameTags })
    },
    [searchParams, setSearchParams],
  )

  // A new entry needn't match what's being searched for, so drop the search
  // rather than let the thing someone just submitted land out of sight.
  const handleSubmitted = () => {
    if (searching) setSearchParams({}, { replace: true })
    onSubmitted()
  }

  let body
  if (tagSlugs.length > 0 && tagsError) {
    body = <p className="submission-status">Couldn’t load tags: {tagsError}</p>
  } else if (tagSlugs.length > 0 && stale) {
    // Nothing is rendered until the tags resolve — showing the list first
    // would flash the whole library on the way to a narrowed view.
    body = <p className="submission-status">Loading the library…</p>
  } else if (unknown.length > 0) {
    body = (
      <p className="submission-status">
        Nothing here — there’s no tag called “{unknown[0]}”.
      </p>
    )
  } else {
    body = (
      <SubmissionList
        currentUserId={session?.user.id ?? null}
        refreshKey={refreshKey}
        filter={{ taggedWith: picked.map((t) => t.id), text }}
        emptyMessage={searching ? 'Nothing matches that search.' : undefined}
      />
    )
  }

  return (
    <>
      {session && submitOpen && (
        <SubmitForm onSubmitted={handleSubmitted} onClose={onCloseSubmit} />
      )}
      <FeedSearch
        allTags={tags?.filter((t) => t.uses > 0) ?? []}
        picked={picked}
        text={text}
        onChange={changeSearch}
      />
      {body}
    </>
  )
}

function App() {
  const { session, loading } = useSession()
  const [refreshKey, setRefreshKey] = useState(0)
  // The button is in the nav, the form on the feed; opening it from another
  // page goes to the feed first.
  const [submitOpen, setSubmitOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Leaving the feed closes the form, so it isn't waiting there on return.
  useEffect(() => {
    if (pathname !== '/') setSubmitOpen(false)
  }, [pathname])

  return (
    <main className="shell">
      <header className="masthead">
        <div>
          <h1>
            <Link className="masthead-home" to="/">
              The Great Library
            </Link>
          </h1>
          <p className="tagline">A curated home for ServiceNow content.</p>
        </div>
        <div className="account">
          {loading ? null : session ? (
            <>
              <span className="account-name">
                {session.user.user_metadata.full_name ?? session.user.email}
              </span>
              <button type="button" className="quiet" onClick={() => void signOut()}>
                Sign out
              </button>
            </>
          ) : (
            <div className="signin-options">
              <button type="button" onClick={() => void signInWithGoogle()}>
                Sign in with Google
              </button>
              <span className="signin-divider">or</span>
              <EmailSignIn />
            </div>
          )}
        </div>
      </header>

      <nav className="site-nav" aria-label="Main">
        <NavLink to="/" end onClick={() => setSubmitOpen(false)}>
          Feed
        </NavLink>
        {session && (
          <button
            type="button"
            aria-pressed={submitOpen}
            onClick={() => {
              // A second click closes it, like Cancel.
              setSubmitOpen(!submitOpen)
              navigate('/')
            }}
          >
            <svg
              className="nav-plus"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
            >
              <path
                d="M12 4v16M4 12h16"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            Submit content
          </button>
        )}
        <NavLink to="/bounties">Curation Bounties</NavLink>
      </nav>

      <Routes>
        <Route
          path="/"
          element={
            <Home
              session={session}
              refreshKey={refreshKey}
              onSubmitted={() => setRefreshKey((k) => k + 1)}
              submitOpen={submitOpen}
              onCloseSubmit={() => setSubmitOpen(false)}
            />
          }
        />
        <Route
          path="/submission/:id"
          element={<SubmissionPage currentUserId={session?.user.id ?? null} />}
        />
        <Route
          path="/submission/:id/curate"
          element={<CurationPage currentUserId={session?.user.id ?? null} />}
        />
        <Route
          path="/bounties"
          element={
            <BountiesPage
              currentUserId={session?.user.id ?? null}
              signedIn={session !== null}
            />
          }
        />
        {/* Tags moved into a Curation Bounties tab; old links still land there. */}
        <Route path="/tags" element={<Navigate to="/bounties#tags" replace />} />
        <Route
          path="/profile/:slug"
          element={<ProfilePage currentUserId={session?.user.id ?? null} />}
        />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Routes>

      <footer className="site-footer">
        <Link to="/privacy">Privacy</Link>
      </footer>
    </main>
  )
}

export default function AppWithRouter() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}
