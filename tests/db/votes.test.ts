import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, castMember, deleteTestUsers, seedSubmission, type TestUser } from './helpers'

// Rules under test, from docs/current-state.md:
//   "One vote per person per submission; value must be exactly +1 or −1."

describe('votes', () => {
  let voter: TestUser
  let submissionId: string

  beforeAll(async () => {
    voter = castMember('alice')
    submissionId = await seedSubmission(voter.profileId)
  })

  afterAll(deleteTestUsers)

  it('lets a signed-in member vote once', async () => {
    const { error } = await voter.client
      .from('votes')
      .insert({ submission_id: submissionId, user_id: voter.profileId, value: 1 })
    expect(error).toBeNull()
  })

  it('refuses a second vote by the same person on the same submission', async () => {
    const second = await voter.client
      .from('votes')
      .insert({ submission_id: submissionId, user_id: voter.profileId, value: -1 })

    expect(second.error).not.toBeNull()
    // 23505 = unique violation. The primary key is doing the work, not app code.
    expect(second.error?.code).toBe('23505')
  })

  it('refuses a vote value that is neither +1 nor −1', async () => {
    const other = await seedSubmission(voter.profileId)
    const { error } = await voter.client
      .from('votes')
      .insert({ submission_id: other, user_id: voter.profileId, value: 5 })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23514') // check constraint violation
  })

  it('refuses a vote cast in someone else‘s name', async () => {
    const impostor = castMember('bob')
    const other = await seedSubmission(voter.profileId)

    const { error } = await impostor.client
      .from('votes')
      .insert({ submission_id: other, user_id: voter.profileId, value: 1 })

    expect(error).not.toBeNull()
  })

  it('refuses a vote from a signed-out visitor', async () => {
    const other = await seedSubmission(voter.profileId)
    const { error } = await anonClient()
      .from('votes')
      .insert({ submission_id: other, user_id: voter.profileId, value: 1 })

    expect(error).not.toBeNull()
  })

  it('lets anyone read votes', async () => {
    const { data, error } = await anonClient()
      .from('votes')
      .select('value')
      .eq('submission_id', submissionId)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })
})
