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

// Adds an identity to a profile. profile_identities has a global unique
// constraint on (platform, identity_value) — the same channel/handle can't
// belong to two profiles. That collision doubles as the matching signal:
// if the insert fails because it's already attached elsewhere, we look up
// who has it and report whether it's claimable.
export async function addIdentity(
  profileId: string,
  platform: string,
  identityValue: string,
): Promise<IdentityConflict | null> {
  const { error } = await supabase
    .from('profile_identities')
    .insert({ profile_id: profileId, platform, identity_value: identityValue })

  if (!error) return null

  if (error.code === '23505') {
    const { data: owner, error: lookupError } = await supabase
      .from('profile_identities')
      .select('profiles ( id, display_name, slug, linked_user_id )')
      .eq('platform', platform)
      .eq('identity_value', identityValue)
      .single()
    if (lookupError) throw lookupError
    return {
      profileId: owner.profiles!.id,
      profileName: owner.profiles!.display_name,
      profileSlug: owner.profiles!.slug,
      claimable: owner.profiles!.linked_user_id === null,
    }
  }

  throw new Error(error.message)
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

export interface YoutubeMatch {
  submissionId: string
  description: string
  url: string
}

function normalizeUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
}

// Matches on the URL itself, not the `source_site` column — source_site
// records which *submission handler* produced the row (manual form vs. the
// not-yet-built browser plugin), not what platform the linked content is
// on. Every submission today comes through the manual form, so it's always
// 'manual' even for an obvious YouTube link; filtering on source_site would
// silently exclude every real match.
const YOUTUBE_URL = /(^|\.)youtube\.com$|(^|\.)youtu\.be$/

function isYoutubeUrl(url: string): boolean {
  try {
    return YOUTUBE_URL.test(new URL(url).hostname)
  } catch {
    return false
  }
}

// Finds already-submitted YouTube videos whose channel matches the given
// identity, that aren't already attributed to this profile. Calls
// YouTube's public oEmbed endpoint directly from the browser — it sends
// permissive CORS headers, so no server-side function is needed. Scoped to
// YouTube only: it's the one platform with a free, keyless way to resolve
// a video URL back to its channel.
export async function findYoutubeMatches(
  profileId: string,
  channelIdentityValue: string,
): Promise<YoutubeMatch[]> {
  const target = normalizeUrl(channelIdentityValue)

  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('id, url, description, submission_attributions ( profile_id )')

  if (error) throw error

  const unattributed = submissions
    .filter((s) => isYoutubeUrl(s.url))
    .filter(
      (s) => !s.submission_attributions.some((a) => a.profile_id === profileId),
    )

  const results = await Promise.all(
    unattributed.map(async (s): Promise<YoutubeMatch | null> => {
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(s.url)}&format=json`,
        )
        if (!res.ok) return null
        const json = (await res.json()) as { author_url?: string }
        if (!json.author_url) return null
        if (normalizeUrl(json.author_url) !== target) return null
        return { submissionId: s.id, description: s.description, url: s.url }
      } catch {
        return null
      }
    }),
  )

  return results.filter((r): r is YoutubeMatch => r !== null)
}

export async function attributeSubmission(
  submissionId: string,
  profileId: string,
): Promise<void> {
  const { error } = await supabase
    .from('submission_attributions')
    .insert({ submission_id: submissionId, profile_id: profileId })
  if (error) throw new Error(error.message)
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
