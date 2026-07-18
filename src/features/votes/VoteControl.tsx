import { useState } from 'react'
import { setVote, type VoteValue } from './api'
import './votes.css'

interface VoteControlProps {
  submissionId: string
  initialScore: number
  initialUserVote: VoteValue | null
  currentUserId: string | null
}

export function VoteControl({
  submissionId,
  initialScore,
  initialUserVote,
  currentUserId,
}: VoteControlProps) {
  const [score, setScore] = useState(initialScore)
  const [userVote, setUserVote] = useState<VoteValue | null>(initialUserVote)
  const [busy, setBusy] = useState(false)

  const signedOut = currentUserId === null

  // Clicking the vote you already hold retracts it; otherwise it becomes your
  // vote. Update optimistically, roll back if the write fails.
  const apply = (choice: VoteValue) => {
    if (signedOut || busy) return
    const nextVote: VoteValue | null = userVote === choice ? null : choice
    const prevVote = userVote
    const prevScore = score

    setUserVote(nextVote)
    setScore(prevScore + ((nextVote ?? 0) - (prevVote ?? 0)))
    setBusy(true)

    setVote(submissionId, currentUserId, nextVote)
      .catch(() => {
        setUserVote(prevVote)
        setScore(prevScore)
      })
      .finally(() => setBusy(false))
  }

  return (
    <div className="vote-control">
      <button
        type="button"
        className={`vote-btn${userVote === 1 ? ' active up' : ''}`}
        aria-label="Upvote"
        aria-pressed={userVote === 1}
        disabled={signedOut || busy}
        title={signedOut ? 'Sign in to vote' : 'Upvote'}
        onClick={() => apply(1)}
      >
        ▲
      </button>
      <span className="vote-score" title="Net votes">
        {score > 0 ? `+${score}` : score}
      </span>
      <button
        type="button"
        className={`vote-btn${userVote === -1 ? ' active down' : ''}`}
        aria-label="Downvote"
        aria-pressed={userVote === -1}
        disabled={signedOut || busy}
        title={signedOut ? 'Sign in to vote' : 'Downvote'}
        onClick={() => apply(-1)}
      >
        ▼
      </button>
    </div>
  )
}
