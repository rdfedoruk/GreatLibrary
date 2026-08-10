import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type CommentType = Database['public']['Enums']['comment_type']

export const COMMENT_TYPES: CommentType[] = ['comment', 'suggestion', 'critique']

export interface CommentItem {
  id: string
  body: string
  comment_type: CommentType
  created_at: string
  edited_at: string | null
  authorId: string
  author: { name: string; slug: string }
}

const SELECT = `id, body, comment_type, created_at, edited_at, user_id,
   author:profiles!comments_user_id_fkey ( display_name, slug )`

type CommentRow = {
  id: string
  body: string
  comment_type: CommentType
  created_at: string
  edited_at: string | null
  user_id: string
  author: { display_name: string; slug: string }
}

function toItem(row: CommentRow): CommentItem {
  return {
    id: row.id,
    body: row.body,
    comment_type: row.comment_type,
    created_at: row.created_at,
    edited_at: row.edited_at,
    authorId: row.user_id,
    author: { name: row.author.display_name, slug: row.author.slug },
  }
}

// Oldest first — a thread reads top to bottom, unlike the submission list,
// which is newest first.
export async function fetchComments(
  submissionId: string,
): Promise<CommentItem[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(SELECT)
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return data.map(toItem)
}

// The trim here matches the table's own check constraint — the database is
// the one actually enforcing it, this just saves a round-trip.
export async function postComment(
  submissionId: string,
  userId: string,
  body: string,
  commentType: CommentType,
): Promise<CommentItem> {
  const trimmed = body.trim()
  if (trimmed === '') throw new Error('A comment needs something in it.')

  const { data, error } = await supabase
    .from('comments')
    .insert({
      submission_id: submissionId,
      user_id: userId,
      body: trimmed,
      comment_type: commentType,
    })
    .select(SELECT)
    .single()

  if (error) throw new Error(error.message)

  return toItem(data)
}

// The row's own permission rule is what actually restricts this to the
// author; passing the id is not a check. edited_at is stamped by a trigger,
// so an edit can't pretend not to be one.
export async function updateComment(
  commentId: string,
  body: string,
  commentType: CommentType,
): Promise<CommentItem> {
  const trimmed = body.trim()
  if (trimmed === '') throw new Error('A comment needs something in it.')

  const { data, error } = await supabase
    .from('comments')
    .update({ body: trimmed, comment_type: commentType })
    .eq('id', commentId)
    .select(SELECT)

  if (error) throw new Error(error.message)
  // RLS refuses by matching no rows rather than erroring.
  if (data.length === 0) throw new Error('That comment isn’t yours to edit.')

  return toItem(data[0])
}

export async function deleteComment(commentId: string): Promise<void> {
  const { data, error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .select('id')

  if (error) throw new Error(error.message)
  if (data.length === 0) throw new Error('That comment isn’t yours to delete.')
}
