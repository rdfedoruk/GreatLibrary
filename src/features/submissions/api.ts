import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import type { VoteValue } from '../votes'
import type { Tag } from '../tags'

export type SourceSite = Database['public']['Enums']['source_site']
export type SubmissionTag = Tag

export interface ProfileRef {
  id: string
  name: string
  slug: string
}

export interface SubmissionListItem {
  id: string
  url: string
  /** What the entry is called: its title, or its description if it has none. */
  title: string
  /** The submitter's own words, when there are any beyond the title. */
  description: string
  /** Address of the thumbnail image; null for entries from before thumbnails. */
  thumbnailUrl: string | null
  source_site: SourceSite
  created_at: string
  submitter: ProfileRef
  creators: ProfileRef[]
  tags: SubmissionTag[]
  score: number
  userVote: VoteValue | null
  commentCount: number
}

export interface SubmissionFilter {
  submittedBy?: string
  attributedTo?: string
  /** A tag id. Narrows the list to submissions carrying that tag. */
  taggedWith?: string
}

export interface NewSubmission {
  url: string
  description: string
}

// Submitting goes through the site's one server-side piece (api/thumbnail.ts),
// which visits the link, works out its title and thumbnail, and creates the
// entry as the signed-in person. Tags are not part of submitting: they are
// suggested afterwards, on the entry itself, by anyone.
export async function createSubmission(input: NewSubmission): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sign in to submit a link.')

  let response: Response
  try {
    response = await fetch('/api/thumbnail', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    })
  } catch {
    throw new Error('Could not reach the site. Check your connection and try again.')
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(body?.error ?? 'Something went wrong. Try again.')
  }
}

// Credits a profile with making this submission's content — separate from
// who submitted the link. The permission rule is the database's: the
// submitter of this submission, or a profile attributing itself.
export async function attributeProfile(
  submissionId: string,
  profileId: string,
): Promise<void> {
  const { error } = await supabase
    .from('submission_attributions')
    .insert({ submission_id: submissionId, profile_id: profileId })

  if (error) {
    if (error.code === '23505') {
      throw new Error('That page is already credited on this entry.')
    }
    throw new Error(error.message)
  }
}

export async function removeAttribution(
  submissionId: string,
  profileId: string,
): Promise<void> {
  const { error } = await supabase
    .from('submission_attributions')
    .delete()
    .eq('submission_id', submissionId)
    .eq('profile_id', profileId)

  if (error) throw new Error(error.message)
}

const SELECT = `id, url, title, description, thumbnail_path, source_site, created_at,
   submitter:profiles!submissions_submitted_by_fkey ( id, display_name, slug ),
   submission_attributions ( profiles ( id, display_name, slug ) ),
   submission_tags ( tags ( id, name, status, type ) ),
   votes ( user_id, value ),
   comments ( count )`

type SubmissionRow = {
  id: string
  url: string
  title: string | null
  description: string
  thumbnail_path: string | null
  source_site: SourceSite
  created_at: string
  submitter: { id: string; display_name: string; slug: string }
  submission_attributions: {
    profiles: { id: string; display_name: string; slug: string } | null
  }[]
  submission_tags: {
    tags: { id: string; name: string; status: string; type: string } | null
  }[]
  votes: { user_id: string; value: number }[]
  comments: { count: number }[]
}

function toItem(
  row: SubmissionRow,
  currentUserId: string | null,
): SubmissionListItem {
  const own = currentUserId
    ? row.votes.find((v) => v.user_id === currentUserId)
    : undefined
  const title = row.title?.trim() || row.description
  return {
    id: row.id,
    url: row.url,
    title,
    // Not repeated when it only says what the title already says.
    description: row.description === title ? '' : row.description,
    thumbnailUrl: row.thumbnail_path
      ? supabase.storage.from('thumbnails').getPublicUrl(row.thumbnail_path).data
          .publicUrl
      : null,
    source_site: row.source_site,
    created_at: row.created_at,
    submitter: {
      id: row.submitter.id,
      name: row.submitter.display_name,
      slug: row.submitter.slug,
    },
    creators: row.submission_attributions.flatMap((a) =>
      a.profiles
        ? [
            {
              id: a.profiles.id,
              name: a.profiles.display_name,
              slug: a.profiles.slug,
            },
          ]
        : [],
    ),
    tags: row.submission_tags.flatMap((st) =>
      st.tags ? [{ ...st.tags, status: st.tags.status as Tag['status'] }] : [],
    ),
    score: row.votes.reduce((sum, v) => sum + v.value, 0),
    userVote: (own?.value as VoteValue | undefined) ?? null,
    // Only the count comes back with the list; the comments themselves
    // load on the submission's own page.
    commentCount: row.comments[0]?.count ?? 0,
  }
}

// Null when there's no submission with that id, so the page can say so
// rather than showing an error.
export async function fetchSubmission(
  id: string,
  currentUserId: string | null,
): Promise<SubmissionListItem | null> {
  const { data, error } = await supabase
    .from('submissions')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle()

  // Supabase hands back a plain object, not an Error. Thrown as-is it reaches
  // the screen as "[object Object]".
  if (error) throw new Error(error.message)
  if (data === null) return null
  return toItem(data, currentUserId)
}

// Net score is summed client-side from the embedded vote rows, and the
// current user's own vote is picked out of the same rows. Fine at current
// scale; switch to a DB view/aggregate if lists get long or hot.
export async function fetchSubmissions(
  currentUserId: string | null,
  filter: SubmissionFilter = {},
): Promise<SubmissionListItem[]> {
  let query = supabase
    .from('submissions')
    .select(SELECT)
    .order('created_at', { ascending: false })

  if (filter.submittedBy) {
    query = query.eq('submitted_by', filter.submittedBy)
  }
  // Creator and tag both live in a join table, and both are looked up
  // separately rather than as an !inner join filter — a join filter would
  // narrow the creators and tags embedded in each returned row to just the
  // one matched on, so a filtered card would show a single tag each.
  // Matching ids are intersected, so asking for both means both.
  let ids: string[] | null = null

  if (filter.attributedTo) {
    const { data: rows, error: attrError } = await supabase
      .from('submission_attributions')
      .select('submission_id')
      .eq('profile_id', filter.attributedTo)
    if (attrError) throw new Error(attrError.message)
    ids = rows.map((r) => r.submission_id)
  }

  if (filter.taggedWith) {
    const { data: rows, error: tagError } = await supabase
      .from('submission_tags')
      .select('submission_id')
      .eq('tag_id', filter.taggedWith)
    if (tagError) throw new Error(tagError.message)
    const tagged = rows.map((r) => r.submission_id)
    ids = ids === null ? tagged : ids.filter((id) => tagged.includes(id))
  }

  if (ids !== null) {
    if (ids.length === 0) return []
    query = query.in('id', ids)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)

  return data.map((row) => toItem(row, currentUserId))
}
