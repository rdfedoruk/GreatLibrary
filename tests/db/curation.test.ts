import { afterAll, describe, expect, it } from 'vitest'
import {
  admin,
  anonClient,
  castMember,
  deleteTestUsers,
  seedEntity,
  seedSubmission,
} from './helpers'

// Rules under test, from migration 15: anyone signed in can retitle any entry
// and credit or uncredit anyone on it. Nothing else about an entry changes.

describe('open curation', () => {
  afterAll(deleteTestUsers)

  const titleOf = async (id: string) =>
    (await admin.from('submissions').select('title').eq('id', id).single()).data
      ?.title

  it('lets any signed-in account retitle someone else’s entry', async () => {
    const owner = castMember('alice')
    const curator = castMember('bob')
    const id = await seedSubmission(owner.profileId)

    const { error } = await curator.client
      .from('submissions')
      .update({ title: 'A better title' })
      .eq('id', id)

    expect(error).toBeNull()
    expect(await titleOf(id)).toBe('A better title')
  })

  it('refuses a signed-out visitor retitling', async () => {
    const owner = castMember('alice')
    const id = await seedSubmission(owner.profileId)
    const before = await titleOf(id)

    await anonClient().from('submissions').update({ title: 'Vandalised' }).eq('id', id)

    expect(await titleOf(id)).toBe(before)
  })

  it('refuses changing anything but the title', async () => {
    const owner = castMember('alice')
    const curator = castMember('bob')
    const id = await seedSubmission(owner.profileId)

    const { error } = await curator.client
      .from('submissions')
      .update({ url: `https://example.com/${crypto.randomUUID()}` })
      .eq('id', id)

    expect(error).not.toBeNull()
  })

  it('lets any signed-in account swap the thumbnail on someone else’s entry', async () => {
    const owner = castMember('alice')
    const curator = castMember('bob')
    const id = await seedSubmission(owner.profileId)

    const { error } = await curator.client
      .from('submissions')
      .update({
        thumbnail_path: 'new.png',
        thumbnail_strategy: 'regenerated',
        thumbnail_rubric: 'r6',
        thumbnail_notes: 'drawn from the edited title',
      })
      .eq('id', id)

    expect(error).toBeNull()
    const row = await admin.from('submissions').select('thumbnail_path').eq('id', id).single()
    expect(row.data?.thumbnail_path).toBe('new.png')
  })

  it('refuses a signed-out visitor swapping the thumbnail', async () => {
    const owner = castMember('alice')
    const id = await seedSubmission(owner.profileId)

    await anonClient().from('submissions').update({ thumbnail_path: 'x.png' }).eq('id', id)

    const row = await admin.from('submissions').select('thumbnail_path').eq('id', id).single()
    expect(row.data?.thumbnail_path).toBeNull()
  })

  it('lets any signed-in account credit and uncredit on someone else’s entry', async () => {
    const owner = castMember('alice')
    const curator = castMember('bob')
    const id = await seedSubmission(owner.profileId)
    const creatorId = await seedEntity('Curated Channel')

    const added = await curator.client
      .from('submission_attributions')
      .insert({ submission_id: id, profile_id: creatorId })
    expect(added.error).toBeNull()

    await curator.client
      .from('submission_attributions')
      .delete()
      .eq('submission_id', id)
      .eq('profile_id', creatorId)

    const left = await admin
      .from('submission_attributions')
      .select('profile_id')
      .eq('submission_id', id)
    expect(left.data).toHaveLength(0)
  })
})
