import './App.css'
import { signInWithGoogle, signOut, useSession } from './lib/auth'
import { SubmissionList } from './features/submissions'

function App() {
  const { session, loading } = useSession()

  return (
    <main className="shell">
      <header className="masthead">
        <div>
          <h1>The Great Library</h1>
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
            <button type="button" onClick={() => void signInWithGoogle()}>
              Sign in with Google
            </button>
          )}
        </div>
      </header>

      <SubmissionList />
    </main>
  )
}

export default App
