import { useState } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import './App.css'
import { signInWithEmail, signInWithGoogle, signOut, useSession } from './lib/auth'
import { SubmissionList, SubmitForm } from './features/submissions'
import { ProfilePage } from './features/profiles'

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
      <button type="submit" disabled={status === 'sending'}>
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
}: {
  session: ReturnType<typeof useSession>['session']
  refreshKey: number
  onSubmitted: () => void
}) {
  return (
    <>
      {session && (
        <SubmitForm userId={session.user.id} onSubmitted={onSubmitted} />
      )}
      <SubmissionList
        currentUserId={session?.user.id ?? null}
        refreshKey={refreshKey}
      />
    </>
  )
}

function App() {
  const { session, loading } = useSession()
  const [refreshKey, setRefreshKey] = useState(0)

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
              <button type="button" onClick={() => void signOut()}>
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

      <Routes>
        <Route
          path="/"
          element={
            <Home
              session={session}
              refreshKey={refreshKey}
              onSubmitted={() => setRefreshKey((k) => k + 1)}
            />
          }
        />
        <Route
          path="/profile/:slug"
          element={<ProfilePage currentUserId={session?.user.id ?? null} />}
        />
      </Routes>
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
