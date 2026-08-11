import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  admin,
  anonClient,
  createTestUser,
  deleteTestUsers,
  seedSubmission,
  type TestUser,
} from './helpers'

// The tagging rules the app leans on, none of which were covered before the
// filter work went in:
//   - the vocabulary is read-only to members (docs/data-model.md: new tags are
//     a deliberate admin add)
//   - you can tag your own submission and nobody else's
//   - a tag link dies with its submission, which is what keeps the filter bar
//     from offering a tag that leads nowhere

describe('tags', () => {
  let member: TestUser
  let submissionId: string
  let videoTagId: string

  beforeAll(async () => {
    member = await createTestUser('Tagger')
    submissionId = await seedSubmission(member.profileId)

    const { data, error } = await admin
      .from('tags')
      .select('id')
      .eq('name', 'Video')
      .single()
    if (error) throw error
    videoTagId = data.id
  })

  afterAll(deleteTestUsers)

  it('lets anyone read the vocabulary', async () => {
    const { data, error } = await anonClient()
      .from('tags')
      .select('id, dimension, name')

    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThan(0)
  })

  it('refuses a member adding a tag to the vocabulary', async () => {
    const { error } = await member.client
      .from('tags')
      .insert({ dimension: 'module', name: `Invented ${crypto.randomUUID()}` })

    expect(error).not.toBeNull()
  })

  it('refuses a member renaming or deleting a tag', async () => {
    const renamed = await member.client
      .from('tags')
      .update({ name: 'Renamed' })
      .eq('id', videoTagId)
      .select()
    // No update policy exists, so this is denied rather than silently applied.
    expect(renamed.data ?? []).toHaveLength(0)

    const deleted = await member.client
      .from('tags')
      .delete()
      .eq('id', videoTagId)
      .select()
    expect(deleted.data ?? []).toHaveLength(0)

    // The row is still there and still called what it was.
    const { data } = await anonClient()
      .from('tags')
      .select('name')
      .eq('id', videoTagId)
      .single()
    expect(data?.name).toBe('Video')
  })

  it('refuses the same tag name twice in one dimension', async () => {
    const { error } = await admin
      .from('tags')
      .insert({ dimension: 'medium', name: 'Video' })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23505') // unique (dimension, name)
  })

  it('lets a member tag their own submission', async () => {
    const { error } = await member.client
      .from('submission_tags')
      .insert({ submission_id: submissionId, tag_id: videoTagId })

    expect(error).toBeNull()
  })

  it('refuses the same tag twice on one submission', async () => {
    const { error } = await member.client
      .from('submission_tags')
      .insert({ submission_id: submissionId, tag_id: videoTagId })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23505') // primary key (submission_id, tag_id)
  })

  it('refuses a member tagging someone else‘s submission', async () => {
    const stranger = await createTestUser('Stranger')

    const { error } = await stranger.client
      .from('submission_tags')
      .insert({ submission_id: submissionId, tag_id: videoTagId })

    expect(error).not.toBeNull()
  })

  it('refuses a tag from a signed-out visitor', async () => {
    const other = await seedSubmission(member.profileId)

    const { error } = await anonClient()
      .from('submission_tags')
      .insert({ submission_id: other, tag_id: videoTagId })

    expect(error).not.toBeNull()
  })

  it('lets anyone read which tags a submission carries', async () => {
    const { data, error } = await anonClient()
      .from('submission_tags')
      .select('tag_id')
      .eq('submission_id', submissionId)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('takes a submission‘s tag links with it when the submission goes', async () => {
    const doomed = await seedSubmission(member.profileId)
    await admin
      .from('submission_tags')
      .insert({ submission_id: doomed, tag_id: videoTagId })

    await admin.from('submissions').delete().eq('id', doomed)

    const { data } = await anonClient()
      .from('submission_tags')
      .select('tag_id')
      .eq('submission_id', doomed)
    expect(data).toHaveLength(0)
  })
})
