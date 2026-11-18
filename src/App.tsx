import { useEffect, useState } from 'react'
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
import { fetchTags, tagSlug, type Tag } from './features/tags'
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
  const [tags, setTags] = useState<Tag[] | null>(null)
  const [tagsError, setTagsError] = useState<string | null>(null)

  // The tag being filtered on lives in the address, so a filtered view can be
  // shared and the back button undoes it. Nothing on the home page offers a
  // tag — you get here by clicking one on a card.
  const tagParam = searchParams.get('tag')
  const filtering = tagParam !== null && tagParam !== ''

  // Only needed to turn the name in the address back into a tag, so it's
  // fetched only when something is being filtered.
  useEffect(() => {
    if (!filtering) return
    let cancelled = false
    fetchTags()
      .then((data) => {
        if (!cancelled) setTags(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setTagsError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [filtering])

  const activeTag = tags?.find((t) => tagSlug(t.name) === tagParam) ?? null

  // A new entry needn't carry the tag being filtered on, so drop the filter
  // rather than let the thing someone just submitted land out of sight.
  const handleSubmitted = () => {
    if (filtering) setSearchParams({}, { replace: true })
    onSubmitted()
  }

  let body
  if (filtering && tagsError) {
    body = <p className="submission-status">Couldn’t load tags: {tagsError}</p>
  } else if (filtering && tags === null) {
    // Nothing is rendered until the tag resolves — showing the list first
    // would flash the whole library on the way to a filtered view.
    body = <p className="submission-status">Loading the library…</p>
  } else if (filtering && activeTag === null) {
    body = (
      <p className="submission-status">
        Nothing here — there’s no tag called “{tagParam}”.
      </p>
    )
  } else {
    body = (
      <SubmissionList
        currentUserId={session?.user.id ?? null}
        refreshKey={refreshKey}
        filter={activeTag ? { taggedWith: activeTag.id } : undefined}
        emptyMessage={
          activeTag ? `Nothing tagged ${activeTag.name} yet.` : undefined
        }
      />
    )
  }

  return (
    <>
      {session && submitOpen && (
        <SubmitForm onSubmitted={handleSubmitted} onClose={onCloseSubmit} />
      )}
      {filtering && (
        // The only way out of a filtered feed — there's no chip bar to click
        // "All" in any more.
        <div className="feed-filter">
          <h2>Tagged {activeTag?.name ?? tagParam}</h2>
          <Link to="/">Show everything</Link>
        </div>
      )}
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
