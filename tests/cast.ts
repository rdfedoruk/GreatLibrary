import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// A small cast of test accounts, made and signed in once per test run and
// borrowed by every test that just needs "a signed-in member" or "someone
// else". The test project allows only about 30 sign-ins every 5 minutes, and
// a fresh account per test blew through that.
//
// Rules for using the cast: never grant a cast member a capability, verify an
// identity for them, or check their display name — a test that needs any of
// that makes its own fresh account instead.

export const CAST = ['alice', 'bob', 'carol'] as const
export type CastName = (typeof CAST)[number]

export type CastMember = {
  userId: string
  profileId: string
  displayName: string
  /** The signed-in session, as supabase-js stores it. */
  session: { access_token: string; refresh_token: string } & Record<string, unknown>
}

export type Cast = Record<CastName, CastMember>

export async function createCast(
  url: string,
  publishableKey: string,
  admin: SupabaseClient,
): Promise<Cast> {
  const cast = {} as Cast
  for (const name of CAST) {
    const email = `cast-${name}-${crypto.randomUUID()}@example.com`
    const password = crypto.randomUUID()
    const displayName = `Cast ${name[0].toUpperCase()}${name.slice(1)}`

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName },
    })
    if (error) throw error

    const { data: signedIn, error: signInError } = await createClient(url, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }).auth.signInWithPassword({ email, password })
    if (signInError) throw signInError

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .eq('linked_user_id', created.user.id)
      .single()
    if (profileError) throw profileError

    cast[name] = {
      userId: created.user.id,
      profileId: profile.id,
      displayName,
      session: signedIn.session as unknown as CastMember['session'],
    }
  }
  return cast
}

/** Removes the cast and everything they made. Runs once, after every test. */
export async function deleteCast(admin: SupabaseClient, cast: Cast): Promise<void> {
  const profiles = Object.values(cast).map((m) => m.profileId)
  const { data: entries } = await admin
    .from('submissions')
    .select('id, thumbnail_path')
    .in('submitted_by', profiles)
  const images = (entries ?? []).flatMap((e) => (e.thumbnail_path ? [e.thumbnail_path] : []))
  if (images.length > 0) await admin.storage.from('thumbnails').remove(images)
  await admin.from('submissions').delete().in('submitted_by', profiles)
  await admin.from('comments').delete().in('user_id', profiles)
  const gone = await admin.from('profiles').delete().in('id', profiles)
  if (gone.error) console.error(`Could not remove the test cast's profiles: ${gone.error.message}`)
  for (const m of Object.values(cast)) await admin.auth.admin.deleteUser(m.userId)
}
