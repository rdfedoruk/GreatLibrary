import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type ProfileType = Database['public']['Enums']['profile_type']

/**
 * A name someone typed in starts out suggested, and becomes approved when
 * someone approves it on the Profiles tab of Curation Bounties. Profiles
 * made by signing up are approved from the start.
 */
export type ProfileStatus = 'suggested' | 'approved'

export interface Profile {
  id: string
  display_name: string
  slug: string
  type: ProfileType
  status: ProfileStatus
  claimed: boolean
  created_at: string
}

// Follows a merged_into pointer one hop, so links to a retired duplicate
// page land on the surviving one. Returns null if no profile has this slug.
export async function fetchProfileBySlug(slug: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, slug, type, status, linked_user_id, merged_into, created_at')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  let row = data
  if (row.merged_into) {
    const { data: target, error: mergeError } = await supabase
      .from('profiles')
      .select('id, display_name, slug, type, status, linked_user_id, merged_into, created_at')
      .eq('id', row.merged_into)
      .maybeSingle()
    if (mergeError) throw mergeError
    if (target) row = target
  }

  return {
    id: row.id,
    display_name: row.display_name,
    slug: row.slug,
    type: row.type,
    status: row.status as ProfileStatus,
    claimed: row.linked_user_id !== null,
    created_at: row.created_at,
  }
}

export interface ProfileSearchResult {
  id: string
  display_name: string
  slug: string
  type: ProfileType
  status: ProfileStatus
}

// Type-ahead over every public identity — person or entity, claimed or not,
// since content can be made by any of them. Suggested profiles are included,
// so a second person typing the same new name reuses the suggestion rather
// than making another. Retired duplicates are hidden so a merged page can't
// be picked. `approvedOnly` is for choosing what to merge a suggestion into.
export async function searchProfiles(
  query: string,
  { approvedOnly = false }: { approvedOnly?: boolean } = {},
): Promise<ProfileSearchResult[]> {
  const q = query.trim()
  if (q.length === 0) return []

  let request = supabase
    .from('profiles')
    .select('id, display_name, slug, type, status')
    .is('merged_into', null)
    .ilike('display_name', `%${q}%`)
  if (approvedOnly) request = request.eq('status', 'approved')

  const { data, error } = await request.order('display_name').limit(8)

  if (error) throw error
  return data.map((row) => ({ ...row, status: row.status as ProfileStatus }))
}

// A page for someone who has never signed in — suggested, unclaimed, person-type, slug
// derived server-side so two people adding the same name at once can't
// collide. Goes through a database function rather than a plain insert for
// that reason; the insert permission rule still applies either way.
export async function createUnclaimedProfile(
  displayName: string,
): Promise<ProfileSearchResult> {
  const { data, error } = await supabase.rpc('create_unclaimed_profile', {
    p_display_name: displayName,
  })

  if (error) throw new Error(error.message)
  return {
    id: data.id,
    display_name: data.display_name,
    slug: data.slug,
    type: data.type,
    status: data.status as ProfileStatus,
  }
}

// The profile a signed-in user's login is attached to. Always exists once
// signed in — the signup trigger creates a born-claimed profile for every
// new auth user.
export async function fetchOwnProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, slug, type, status, linked_user_id, created_at')
    .eq('linked_user_id', userId)
    .single()

  if (error) throw error
  return {
    id: data.id,
    display_name: data.display_name,
    slug: data.slug,
    type: data.type,
    status: data.status as ProfileStatus,
    claimed: true,
    created_at: data.created_at,
  }
}

export interface SuggestedProfile {
  id: string
  display_name: string
  slug: string
  /** The entries that credit it, so whoever approves can see the context. */
  credits: { id: string; title: string; url: string }[]
}

// Every profile waiting for approval, oldest first, with what credits it.
export async function fetchSuggestedProfiles(): Promise<SuggestedProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, display_name, slug, submission_attributions ( submissions ( id, title, description, url ) )',
    )
    .eq('status', 'suggested')
    .order('created_at')

  if (error) throw new Error(error.message)
  return data.map((row) => ({
    id: row.id,
    display_name: row.display_name,
    slug: row.slug,
    credits: row.submission_attributions.flatMap((a) =>
      a.submissions
        ? [
            {
              id: a.submissions.id,
              title: a.submissions.title?.trim() || a.submissions.description,
              url: a.submissions.url,
            },
          ]
        : [],
    ),
  }))
}

// Approve, merge and delete act only on suggested profiles; the database
// refuses anything else. Open to every signed-in account until roles exist.
export async function approveProfile(id: string): Promise<void> {
  const { error } = await supabase.rpc('approve_profile', { p_id: id })
  if (error) throw new Error(error.message)
}

/** Moves every credit to `into` and deletes the suggestion. */
export async function mergeProfile(from: string, into: string): Promise<void> {
  const { error } = await supabase.rpc('merge_profile', {
    p_from: from,
    p_into: into,
  })
  if (error) throw new Error(error.message)
}

/** Deletes the suggestion and takes it off every entry that credits it. */
export async function deleteSuggestedProfile(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_suggested_profile', { p_id: id })
  if (error) throw new Error(error.message)
}

/** Renames a suggestion; its web address follows the new name. */
export async function renameSuggestedProfile(
  id: string,
  displayName: string,
): Promise<void> {
  const { error } = await supabase.rpc('rename_suggested_profile', {
    p_id: id,
    p_display_name: displayName,
  })
  if (error) throw new Error(error.message)
}
