import { supabase } from '../../lib/supabase'

export interface Identity {
  id: string
  platform: string
  identity_value: string
}

export interface IdentityConflict {
  profileId: string
  profileName: string
  profileSlug: string
  claimable: boolean // true if the conflicting profile is unclaimed
}

export interface UnclaimedProfile {
  id: string
  display_name: string
  slug: string
}

export interface MyClaim {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  profileName: string
  profileSlug: string
  created_at: string
}

export async function fetchIdentities(profileId: string): Promise<Identity[]> {
  const { data, error } = await supabase
    .from('profile_identities')
    .select('id, platform, identity_value')
    .eq('profile_id', profileId)
    .order('platform')

  if (error) throw error
  return data
}

// Adds an identity to a profile, first checking whether another profile
// already lists it. Two profiles listing the same channel is allowed at the
// database level now (unverified identities prove nothing, so they mustn't
// lock the real owner out) — but it's still worth telling the user, because
// an unclaimed page listing your channel is probably the page you're
// looking for.
export async function addIdentity(
  profileId: string,
  platform: string,
  identityValue: string,
): Promise<IdentityConflict | null> {
  const { data: existing, error: lookupError } = await supabase
    .from('profile_identities')
    .select('profile_id, profiles ( id, display_name, slug, linked_user_id )')
    .eq('platform', platform)
    .eq('identity_value', identityValue)
    .neq('profile_id', profileId)
    .limit(1)
    .maybeSingle()
  if (lookupError) throw lookupError

  if (existing?.profiles) {
    return {
      profileId: existing.profiles.id,
      profileName: existing.profiles.display_name,
      profileSlug: existing.profiles.slug,
      claimable: existing.profiles.linked_user_id === null,
    }
  }

  const { error } = await supabase
    .from('profile_identities')
    .insert({ profile_id: profileId, platform, identity_value: identityValue })
  if (error) throw new Error(error.message)
  return null
}

export async function removeIdentity(identityId: string): Promise<void> {
  const { error } = await supabase
    .from('profile_identities')
    .delete()
    .eq('id', identityId)
  if (error) throw new Error(error.message)
}

export async function searchUnclaimedProfiles(
  query: string,
): Promise<UnclaimedProfile[]> {
  if (query.trim().length === 0) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, slug')
    .eq('type', 'person')
    .is('linked_user_id', null)
    .ilike('display_name', `%${query.trim()}%`)
    .limit(10)

  if (error) throw error
  return data
}

// Throws a friendly message if this exact claim was already requested
// (unique(user_id, profile_id) on the claims table).
export async function requestClaim(
  userId: string,
  profileId: string,
): Promise<void> {
  const { error } = await supabase
    .from('claims')
    .insert({ user_id: userId, profile_id: profileId })

  if (error) {
    if (error.code === '23505') {
      throw new Error("You've already requested this page.")
    }
    throw new Error(error.message)
  }
}

export async function fetchMyClaims(userId: string): Promise<MyClaim[]> {
  const { data, error } = await supabase
    .from('claims')
    .select('id, status, created_at, profiles ( display_name, slug )')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    status: row.status,
    created_at: row.created_at,
    profileName: row.profiles!.display_name,
    profileSlug: row.profiles!.slug,
  }))
}
