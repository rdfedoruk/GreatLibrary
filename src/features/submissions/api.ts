import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

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
}

// Vote score is summed client-side from the embedded rows. Fine at current
// scale; switch to a DB view/aggregate if lists get long or hot.
export async function fetchSubmissions(): Promise<SubmissionListItem[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select(
      `id, url, description, source_site, created_at,
       submitter:profiles!submissions_submitted_by_fkey ( display_name ),
       creator:content_creators ( display_name ),
       submission_tags ( tags ( id, dimension, name ) ),
       votes ( value )`,
    )
    .order('created_at', { ascending: false })

  if (error) throw error

  return data.map((row) => ({
    id: row.id,
    url: row.url,
    description: row.description,
    source_site: row.source_site,
    created_at: row.created_at,
    submitterName: row.submitter.display_name,
    creatorName: row.creator?.display_name ?? null,
    tags: row.submission_tags.flatMap((st) => st.tags ?? []),
    score: row.votes.reduce((sum, v) => sum + v.value, 0),
  }))
}
