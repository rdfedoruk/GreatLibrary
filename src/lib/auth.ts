import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  return { session, loading }
}

export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
}

// Re-runs Google sign-in asking additionally for permission to read which
// YouTube channel the account owns. Returns to /claim, where the one-time
// provider token in the URL fragment is picked up and sent to the
// verify-youtube function. Same Google account = same session; the user is
// only granting an extra permission, not switching identity.
export function connectYoutube() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/youtube.readonly',
      redirectTo: `${window.location.origin}/claim`,
    },
  })
}

export function signInWithEmail(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })
}

export function signOut() {
  return supabase.auth.signOut()
}
