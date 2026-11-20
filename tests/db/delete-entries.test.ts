import { afterAll, describe, expect, it } from 'vitest'
import { admin, anonClient, castMember,
  createTestUser, deleteTestUsers, seedSubmission } from './helpers'

// Rules under test, from migration 18: only an account holding the
// delete_entries capability can delete an entry, and its attachments go too.

describe('deleting entries', () => {
  afterAll(deleteTestUsers)

  const exists = async (id: string) =>
    ((await admin.from('submissions').select('id').eq('id', id)).data ?? []).length > 0

  const grant = async (userId: string) => {
    const { error } = await admin
      .from('capability_grants')
      .insert({ user_id: userId, capability: 'delete_entries' })
    if (error) throw error
  }

  it('lets an account holding the capability delete someone else’s entry, comments and all', async () => {
    const owner = castMember('alice')
    const deleter = await createTestUser('Entry Deleter')
    await grant(deleter.userId)
    const id = await seedSubmission(owner.profileId)
    await admin
      .from('comments')
      .insert({ submission_id: id, user_id: owner.profileId, body: 'Nice one' })

    const { error } = await deleter.client.from('submissions').delete().eq('id', id)

    expect(error).toBeNull()
    expect(await exists(id)).toBe(false)
    const comments = await admin.from('comments').select('id').eq('submission_id', id)
    expect(comments.data ?? []).toHaveLength(0)
  })

  it('refuses an ordinary signed-in account, even the submitter', async () => {
    const owner = castMember('alice')
    const id = await seedSubmission(owner.profileId)

    await owner.client.from('submissions').delete().eq('id', id)

    expect(await exists(id)).toBe(true)
  })

  it('refuses a signed-out visitor', async () => {
    const owner = castMember('alice')
    const id = await seedSubmission(owner.profileId)

    await anonClient().from('submissions').delete().eq('id', id)

    expect(await exists(id)).toBe(true)
  })

  it('lets an account see its own capabilities but not anyone else’s', async () => {
    const holder = await createTestUser('Holder')
    const other = castMember('bob')
    await grant(holder.userId)

    const mine = await holder.client.from('capability_grants').select('capability')
    expect(mine.data).toEqual([{ capability: 'delete_entries' }])

    const theirs = await other.client.from('capability_grants').select('capability')
    expect(theirs.data).toEqual([])
  })

  it('refuses an account granting itself a capability', async () => {
    const sneaky = castMember('bob')

    const { error } = await sneaky.client
      .from('capability_grants')
      .insert({ user_id: sneaky.userId, capability: 'delete_entries' })

    expect(error).not.toBeNull()
  })
})
