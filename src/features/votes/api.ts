import { supabase } from '../../lib/supabase'

export type VoteValue = 1 | -1

// Set the current user's vote on a submission; pass null to retract it.
// One row per (submission_id, user_id) is enforced by the table's primary
// key, so an upsert is the whole story for cast-or-change.
export async function setVote(
  submissionId: string,
  userId: string,
  value: VoteValue | null,
): Promise<void> {
  if (value === null) {
    const { error } = await supabase
      .from('votes')
      .delete()
      .eq('submission_id', submissionId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase
    .from('votes')
    .upsert(
      { submission_id: submissionId, user_id: userId, value },
      { onConflict: 'submission_id,user_id' },
    )
  if (error) throw new Error(error.message)
}
