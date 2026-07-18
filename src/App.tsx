import { useState } from 'react'
import './App.css'
import { signInWithGoogle, signOut, useSession } from './lib/auth'
import { SubmissionList, SubmitForm } from './features/submissions'

function App() {
  const { session, loading } = useSession()
  const [refreshKey, setRefreshKey] = useState(0)

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

      {session && (
        <SubmitForm
          userId={session.user.id}
          onSubmitted={() => setRefreshKey((k) => k + 1)}
        />
      )}
      <SubmissionList
        currentUserId={session?.user.id ?? null}
        refreshKey={refreshKey}
      />
    </main>
  )
}

export default App
