import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.test', quiet: true })

const url = process.env.TEST_SUPABASE_URL
const publishableKey = process.env.TEST_SUPABASE_PUBLISHABLE_KEY
const secretKey = process.env.TEST_SUPABASE_SECRET_KEY

if (!url || !publishableKey || !secretKey) {
  throw new Error(
    'Missing test credentials. These tests run against the GreatLibraryTesting ' +
      'Supabase project and need TEST_SUPABASE_URL, TEST_SUPABASE_PUBLISHABLE_KEY ' +
      'and TEST_SUPABASE_SECRET_KEY in .env.test.',
  )
}

// Guard rail: these tests write and delete rows, so refuse to run against
// anything but the test project, whatever .env.test happens to say.
const PRODUCTION_REF = 'vjwvswsuzhcqrkwpqodg'
if (url.includes(PRODUCTION_REF)) {
  throw new Error('Refusing to run: .env.test points at the production project.')
}

/** Bypasses row-level security. Only ever used to arrange fixtures. */
export const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/** A signed-out visitor — the anonymous public. */
export function anonClient(): SupabaseClient {
  return createClient(url!, publishableKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type TestUser = {
  userId: string
  profileId: string
  email: string
  client: SupabaseClient
}

const createdUserIds: string[] = []

/**
 * Makes a real signed-in member: an auth user (which the signup trigger gives
 * a profile) plus a client carrying that person's session, so every query it
 * makes is subject to the same rules a real member's browser would face.
 */
export async function createTestUser(displayName = 'Test Member'): Promise<TestUser> {
  const email = `test-${crypto.randomUUID()}@example.com`
  const password = crypto.randomUUID()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: displayName },
  })
  if (error) throw error
  const userId = data.user.id
  createdUserIds.push(userId)

  const client = anonClient()
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError

  // The signup trigger creates the profile with id = auth uid.
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('linked_user_id', userId)
    .single()
  if (profileError) throw profileError

  return { userId, profileId: profile.id, email, client }
}

/** Deletes every user this run created; profiles and their rows cascade. */
export async function deleteTestUsers(): Promise<void> {
  for (const id of createdUserIds.splice(0)) {
    await admin.auth.admin.deleteUser(id)
  }
}

/** An entity page (a company, a podcast) — never able to log in. */
export async function seedEntity(displayName = 'A Company'): Promise<string> {
  const { data, error } = await admin
    .from('profiles')
    .insert({
      display_name: displayName,
      type: 'entity',
      slug: `entity-${crypto.randomUUID()}`,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

/** A submission owned by the given profile, created with fixture privileges. */
export async function seedSubmission(submittedBy: string, url?: string): Promise<string> {
  const { data, error } = await admin
    .from('submissions')
    .insert({
      url: url ?? `https://example.com/${crypto.randomUUID()}`,
      description: 'Fixture submission',
      source_site: 'manual',
      submitted_by: submittedBy,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}
