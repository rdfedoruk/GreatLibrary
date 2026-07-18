import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import type { VoteValue } from '../votes'

export type SourceSite = Database['public']['Enums']['source_site']
export type TagDimension = Database['public']['Enums']['tag_dimension']

export interface SubmissionTag {
  id: string
  dimension: TagDimension
  name: string
}

export interface SubmissionListItem {
  id: string
  url: string
  description: string
  source_site: SourceSite
  created_at: string
  submitterName: string
  creatorName: string | null
  tags: SubmissionTag[]
  score: number
  userVote: VoteValue | null
}

export interface NewSubmission {
  url: string
  description: string
  tagIds: string[]
}

// Two inserts, not a transaction: if tagging fails the submission still
// lands untagged. Acceptable at current scale — an RPC can make it atomic
// if orphaned-tag reports ever show up.
export async function createSubmission(
  input: NewSubmission,
  userId: string,
): Promise<void> {
  const { data: submission, error } = await supabase
    .from('submissions')
    .insert({
      url: input.url,
      description: input.description,
      source_site: 'manual',
      submitted_by: userId,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('That URL is already in the library.')
    }
    throw new Error(error.message)
  }

  if (input.tagIds.length > 0) {
    const { error: tagError } = await supabase.from('submission_tags').insert(
      input.tagIds.map((tagId) => ({
        submission_id: submission.id,
        tag_id: tagId,
      })),
    )
    if (tagError) {
      throw new Error(
        `Submitted, but tagging failed: ${tagError.message}`,
      )
    }
  }
}

// Net score is summed client-side from the embedded vote rows, and the
// current user's own vote is picked out of the same rows. Fine at current
// scale; switch to a DB view/aggregate if lists get long or hot.
export async function fetchSubmissions(
  currentUserId: string | null,
): Promise<SubmissionListItem[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select(
      `id, url, description, source_site, created_at,
       submitter:profiles!submissions_submitted_by_fkey ( display_name ),
       creator:content_creators ( display_name ),
       submission_tags ( tags ( id, dimension, name ) ),
       votes ( user_id, value )`,
    )
    .order('created_at', { ascending: false })

  if (error) throw error

  return data.map((row) => {
    const own = currentUserId
      ? row.votes.find((v) => v.user_id === currentUserId)
      : undefined
    return {
      id: row.id,
      url: row.url,
      description: row.description,
      source_site: row.source_site,
      created_at: row.created_at,
      submitterName: row.submitter.display_name,
      creatorName: row.creator?.display_name ?? null,
      tags: row.submission_tags.flatMap((st) => st.tags ?? []),
      score: row.votes.reduce((sum, v) => sum + v.value, 0),
      userVote: (own?.value as VoteValue | undefined) ?? null,
    }
  })
}
