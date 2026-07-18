import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type ProfileType = Database['public']['Enums']['profile_type']

export interface Profile {
  id: string
  display_name: string
  slug: string
  type: ProfileType
  claimed: boolean
  created_at: string
}

// Follows a merged_into pointer one hop, so links to a retired duplicate
// page land on the surviving one. Returns null if no profile has this slug.
export async function fetchProfileBySlug(slug: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, slug, type, linked_user_id, merged_into, created_at')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  let row = data
  if (row.merged_into) {
    const { data: target, error: mergeError } = await supabase
      .from('profiles')
      .select('id, display_name, slug, type, linked_user_id, merged_into, created_at')
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
    claimed: row.linked_user_id !== null,
    created_at: row.created_at,
  }
}

// The profile a signed-in user's login is attached to. Always exists once
// signed in — the signup trigger creates a born-claimed profile for every
// new auth user.
export async function fetchOwnProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, slug, type, linked_user_id, created_at')
    .eq('linked_user_id', userId)
    .single()

  if (error) throw error
  return {
    id: data.id,
    display_name: data.display_name,
    slug: data.slug,
    type: data.type,
    claimed: true,
    created_at: data.created_at,
  }
}
