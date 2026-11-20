import { afterAll, describe, expect, it } from 'vitest'
import { castMember, deleteTestUsers, seedSubmission } from './helpers'

// Rule under test, from docs/current-state.md § Blocked in the database on
// purpose: open takedowns have no insert rule at all, deliberately, until
// it's decided whether filing one needs an account. This test exists to make
// that block visible — if it ever starts passing, someone opened the door.

describe('removal requests', () => {
  afterAll(deleteTestUsers)

  it('lets a claimed person file a verified self-removal', async () => {
    const member = castMember('alice')
    const submissionId = await seedSubmission(member.profileId)

    const { error } = await member.client.from('removal_requests').insert({
      submission_id: submissionId,
      profile_id: member.profileId,
      requested_by_user_id: member.userId,
      path: 'verified_self',
      status: 'pending',
    })

    expect(error).toBeNull()
  })

  it('refuses an open takedown from anyone, by design', async () => {
    const member = castMember('alice')
    const submissionId = await seedSubmission(member.profileId)

    const { error } = await member.client.from('removal_requests').insert({
      submission_id: submissionId,
      profile_id: member.profileId,
      requested_by_user_id: member.userId,
      path: 'open_request',
      status: 'pending',
      reason: 'This is mine and I want it gone',
    })

    expect(error).not.toBeNull()
  })
})
