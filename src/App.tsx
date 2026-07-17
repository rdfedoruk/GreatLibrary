import './App.css'
import { signInWithGoogle, signOut, useSession } from './lib/auth'

function App() {
  const { session, loading } = useSession()

  return (
    <main className="shell">
      <h1>The Great Library</h1>
      <p className="tagline">A curated home for ServiceNow content.</p>

      {loading ? (
        <p>Loading…</p>
      ) : session ? (
        <div className="account">
          <p>
            Signed in as{' '}
            {session.user.user_metadata.full_name ?? session.user.email}
          </p>
          <button type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => void signInWithGoogle()}>
          Sign in with Google
        </button>
      )}
    </main>
  )
}

export default App
