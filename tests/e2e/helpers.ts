import type { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.test', quiet: true })

const url = process.env.TEST_SUPABASE_URL
const publishableKey = process.env.TEST_SUPABASE_PUBLISHABLE_KEY
const secretKey = process.env.TEST_SUPABASE_SECRET_KEY

if (!url || !publishableKey || !secretKey) {
  throw new Error(
    'Missing test credentials. The journeys run against the GreatLibraryTesting ' +
      'Supabase project and need TEST_SUPABASE_URL, TEST_SUPABASE_PUBLISHABLE_KEY ' +
      'and TEST_SUPABASE_SECRET_KEY in .env.test.',
  )
}

// Same tripwire as the database tests: these journeys sign people in and
// create rows, so refuse to run against the live project whatever .env.test
// happens to say.
const PRODUCTION_REF = 'vjwvswsuzhcqrkwpqodg'
if (url.includes(PRODUCTION_REF)) {
  throw new Error('Refusing to run: .env.test points at the production project.')
}

const projectRef = new URL(url).hostname.split('.')[0]

/** Bypasses row-level security. Only ever used to arrange and tear down. */
export const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export type SignedInMember = {
  userId: string
  profileId: string
  displayName: string
}

// Everything a spec made, so it can be taken back out again. Deleting the
// auth user is not enough on its own: since migration 3 a profile outlives
// its login (linked_user_id is "on delete set null", not cascade), and a
// submission's submitted_by has no cascade at all. Order matters —
// submissions, then profiles, then logins.
const madeSubmissions: string[] = []
const madeProfiles: string[] = []
const madeUsers: string[] = []

/**
 * Puts a real signed-in member behind the browser.
 *
 * The app only offers Google and email magic-link, neither of which a test can
 * complete, so the session is minted through the API and written into the same
 * storage slot supabase-js reads on startup. The token is issued by the test
 * project, so a dev server accidentally pointed at production would reject it
 * rather than write anything there — the session itself is the failsafe.
 */
export async function signIn(
  page: Page,
  displayName = 'Journey Member',
): Promise<SignedInMember> {
  const email = `journey-${crypto.randomUUID()}@example.com`
  const password = crypto.randomUUID()

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: displayName },
  })
  if (error) throw error
  madeUsers.push(created.user.id)

  const { data: signedIn, error: signInError } = await createClient(
    url!,
    publishableKey!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  ).auth.signInWithPassword({ email, password })
  if (signInError) throw signInError

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('linked_user_id', created.user.id)
    .single()
  if (profileError) throw profileError
  madeProfiles.push(profile.id)

  // Runs before any page script, so the app boots already signed in rather
  // than flashing the signed-out header first.
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [`sb-${projectRef}-auth-token`, JSON.stringify(signedIn.session)] as const,
  )

  return { userId: created.user.id, profileId: profile.id, displayName }
}

/** Signs the browser back out for the "what a visitor sees" half of a journey. */
export async function signOut(page: Page): Promise<void> {
  await page.addInitScript(() => window.localStorage.clear())
  await page.context().clearCookies()
}

/**
 * A person's page with no login behind it — enough to own a submission when a
 * journey only needs something in the library to look at. Cheaper and steadier
 * than minting an auth user for a read-only view.
 */
export async function seedProfile(displayName: string): Promise<string> {
  const { data, error } = await admin
    .from('profiles')
    .insert({
      display_name: displayName,
      type: 'person',
      slug: `journey-${crypto.randomUUID()}`,
    })
    .select('id')
    .single()
  if (error) throw error
  madeProfiles.push(data.id)
  return data.id
}

export async function seedSubmission(
  submittedBy: string,
  description: string,
): Promise<string> {
  const { data, error } = await admin
    .from('submissions')
    .insert({
      url: `https://example.com/${crypto.randomUUID()}`,
      description,
      source_site: 'manual',
      submitted_by: submittedBy,
    })
    .select('id')
    .single()
  if (error) throw error
  madeSubmissions.push(data.id)
  return data.id
}

/**
 * Puts a tag from the controlled vocabulary on a seeded submission. The link
 * row needs no cleanup of its own — it cascades when the submission goes.
 */
export async function tagSubmission(
  submissionId: string,
  tagName: string,
): Promise<void> {
  const { data: tag, error } = await admin
    .from('tags')
    .select('id')
    .eq('name', tagName)
    .single()
  if (error) throw error

  const { error: linkError } = await admin
    .from('submission_tags')
    .insert({ submission_id: submissionId, tag_id: tag.id })
  if (linkError) throw linkError
}

/**
 * Registers a page the *app* created mid-journey (an unclaimed creator page,
 * say) so teardown takes it with everything else. Looked up by name because
 * the browser is the only thing that knows its id.
 */
export async function trackProfileNamed(displayName: string): Promise<void> {
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('display_name', displayName)
  for (const row of data ?? []) madeProfiles.push(row.id)
}

/** Registers a submission the *app* created mid-journey, so teardown takes it. */
export async function trackSubmissionAt(url: string): Promise<void> {
  const { data } = await admin.from('submissions').select('id').eq('url', url)
  for (const row of data ?? []) madeSubmissions.push(row.id)
}

/** Removes everything this worker made. Safe to call when nothing was made. */
export async function cleanUp(): Promise<void> {
  const submissions = madeSubmissions.splice(0)
  const profiles = madeProfiles.splice(0)
  const users = madeUsers.splice(0)

  if (submissions.length > 0) {
    // An entry submitted through the form has a thumbnail image stored for
    // it; that goes too, or the test project fills up with pictures.
    const { data } = await admin
      .from('submissions')
      .select('thumbnail_path')
      .in('id', submissions)
      .not('thumbnail_path', 'is', null)
    const images = (data ?? []).map((row) => row.thumbnail_path as string)
    if (images.length > 0) await admin.storage.from('thumbnails').remove(images)
    await admin.from('submissions').delete().in('id', submissions)
  }
  if (profiles.length > 0) {
    await admin.from('profiles').delete().in('id', profiles)
  }
  for (const id of users) {
    await admin.auth.admin.deleteUser(id)
  }
}
