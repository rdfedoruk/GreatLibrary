import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  admin,
  anonClient,
  castMember,
  deleteTestUsers,
  seedSubmission,
  type TestUser,
} from './helpers'

// Suggest-and-approve tagging (docs/plan.md). The rules the app leans on:
//   - anyone can read tags; only signed-in accounts can write them
//   - any signed-in account can tag any entry, and — until roles exist — can
//     also approve, rename, merge and delete tags
//   - a new tag starts out suggested
//   - names are unique whatever the capitals, at most 40 characters
//   - a suggested tag nothing carries any more is removed
//   - merging moves every entry across and removes the merged tag

describe('tags', () => {
  let member: TestUser
  let stranger: TestUser
  let submissionId: string
  let videoTagId: string
  const made: string[] = []
  const unique = (label: string) => `${label} ${crypto.randomUUID().slice(0, 8)}`

  /** A tag made with fixture privileges, removed again afterwards. */
  async function seedTag(name: string, status = 'approved', type = 'general') {
    const { data, error } = await admin
      .from('tags')
      .insert({ name, status, type })
      .select('id')
      .single()
    if (error) throw error
    made.push(data.id)
    return data.id as string
  }

  beforeAll(async () => {
    member = castMember('alice')
    stranger = castMember('bob')
    submissionId = await seedSubmission(member.profileId)

    const { data, error } = await admin
      .from('tags')
      .select('id')
      .eq('name', 'Video')
      .single()
    if (error) throw error
    videoTagId = data.id
  })

  afterAll(async () => {
    await admin.from('submissions').delete().eq('id', submissionId)
    if (made.length > 0) await admin.from('tags').delete().in('id', made)
    await deleteTestUsers()
  })

  it('lets anyone read the tags', async () => {
    const { data, error } = await anonClient()
      .from('tags')
      .select('id, name, status, type')

    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThan(0)
  })

  it('refuses a signed-out visitor adding, changing or deleting a tag', async () => {
    const anon = anonClient()

    const added = await anon.from('tags').insert({ name: unique('Anon') })
    expect(added.error).not.toBeNull()

    const renamed = await anon
      .from('tags')
      .update({ name: 'Renamed' })
      .eq('id', videoTagId)
      .select()
    expect(renamed.data ?? []).toHaveLength(0)

    const deleted = await anon.from('tags').delete().eq('id', videoTagId).select()
    expect(deleted.data ?? []).toHaveLength(0)

    const { data } = await anon.from('tags').select('name').eq('id', videoTagId).single()
    expect(data?.name).toBe('Video')
  })

  it('starts a new tag out as a suggested general tag', async () => {
    const name = unique('Suggested')
    const { data, error } = await member.client
      .from('tags')
      .insert({ name })
      .select('id, status, type')
      .single()

    expect(error).toBeNull()
    made.push(data!.id)
    expect(data?.status).toBe('suggested')
    expect(data?.type).toBe('general')
  })

  it('refuses the same name twice, whatever the capitals or type', async () => {
    const { error } = await member.client
      .from('tags')
      .insert({ name: 'VIDEO', type: 'general' })

    expect(error?.code).toBe('23505')
  })

  it('refuses a blank name, a padded name, a long name and an unknown type or status', async () => {
    const attempts = [
      { name: '' },
      { name: ' padded ' },
      { name: 'x'.repeat(41) },
      { name: unique('Odd type'), type: 'module' },
      { name: unique('Odd status'), status: 'pending' },
    ]
    for (const row of attempts) {
      const { error } = await member.client.from('tags').insert(row)
      expect(error, JSON.stringify(row)).not.toBeNull()
    }
  })

  it('lets any signed-in account approve, retype and rename a tag', async () => {
    const id = await seedTag(unique('To approve'), 'suggested')
    const renamedTo = unique('Renamed')

    const { data, error } = await stranger.client
      .from('tags')
      .update({ status: 'approved', type: 'version', name: renamedTo })
      .eq('id', id)
      .select('status, type, name')
      .single()

    expect(error).toBeNull()
    expect(data).toEqual({ status: 'approved', type: 'version', name: renamedTo })
  })

  it('lets a signed-in account tag an entry that is not theirs, and untag it', async () => {
    const tagged = await stranger.client
      .from('submission_tags')
      .insert({ submission_id: submissionId, tag_id: videoTagId })
    expect(tagged.error).toBeNull()

    const again = await member.client
      .from('submission_tags')
      .insert({ submission_id: submissionId, tag_id: videoTagId })
    expect(again.error?.code).toBe('23505') // one of each tag per entry

    const untagged = await stranger.client
      .from('submission_tags')
      .delete()
      .eq('submission_id', submissionId)
      .eq('tag_id', videoTagId)
      .select()
    expect(untagged.data).toHaveLength(1)
  })

  it('refuses a signed-out visitor tagging or untagging an entry', async () => {
    await admin
      .from('submission_tags')
      .insert({ submission_id: submissionId, tag_id: videoTagId })

    const tagged = await anonClient()
      .from('submission_tags')
      .insert({ submission_id: submissionId, tag_id: videoTagId })
    expect(tagged.error).not.toBeNull()

    const untagged = await anonClient()
      .from('submission_tags')
      .delete()
      .eq('submission_id', submissionId)
      .select()
    expect(untagged.data ?? []).toHaveLength(0)

    const { data } = await anonClient()
      .from('submission_tags')
      .select('tag_id')
      .eq('submission_id', submissionId)
    expect(data).toHaveLength(1)
  })

  it('removes a suggested tag once nothing carries it, and keeps an approved one', async () => {
    const suggested = await seedTag(unique('Typo'), 'suggested')
    const approved = await seedTag(unique('Keeper'), 'approved')
    await admin.from('submission_tags').insert([
      { submission_id: submissionId, tag_id: suggested },
      { submission_id: submissionId, tag_id: approved },
    ])

    await member.client
      .from('submission_tags')
      .delete()
      .eq('submission_id', submissionId)
      .in('tag_id', [suggested, approved])

    const { data } = await anonClient()
      .from('tags')
      .select('id')
      .in('id', [suggested, approved])
    expect(data?.map((t) => t.id)).toEqual([approved])
  })

  it('takes an entry‘s tag links with it when the entry goes', async () => {
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

  it('merges one tag into another, moving every entry across', async () => {
    const from = await seedTag(unique('Java Script'), 'suggested')
    const into = await seedTag(unique('Javascript'), 'approved')
    const both = await seedSubmission(member.profileId)
    const onlyFrom = await seedSubmission(member.profileId)
    await admin.from('submission_tags').insert([
      { submission_id: both, tag_id: from },
      { submission_id: both, tag_id: into },
      { submission_id: onlyFrom, tag_id: from },
    ])

    const { error } = await member.client.rpc('merge_tag', {
      p_from: from,
      p_into: into,
    })
    expect(error).toBeNull()

    const gone = await anonClient().from('tags').select('id').eq('id', from)
    expect(gone.data).toHaveLength(0)

    const links = await anonClient()
      .from('submission_tags')
      .select('submission_id')
      .eq('tag_id', into)
    expect(links.data?.map((l) => l.submission_id).sort()).toEqual(
      [both, onlyFrom].sort(),
    )

    await admin.from('submissions').delete().in('id', [both, onlyFrom])
  })

  it('refuses a merge from a signed-out visitor, or into a tag that does not exist', async () => {
    const from = await seedTag(unique('Stays'), 'approved')

    const anon = await anonClient().rpc('merge_tag', {
      p_from: from,
      p_into: videoTagId,
    })
    expect(anon.error).not.toBeNull()

    const nowhere = await member.client.rpc('merge_tag', {
      p_from: from,
      p_into: crypto.randomUUID(),
    })
    expect(nowhere.error).not.toBeNull()

    const { data } = await anonClient().from('tags').select('id').eq('id', from)
    expect(data).toHaveLength(1)
  })

  it('lets a signed-in account delete a tag, taking it off every entry', async () => {
    const id = await seedTag(unique('Doomed'), 'approved')
    await admin
      .from('submission_tags')
      .insert({ submission_id: submissionId, tag_id: id })

    const { data } = await stranger.client.from('tags').delete().eq('id', id).select()
    expect(data).toHaveLength(1)

    const links = await anonClient()
      .from('submission_tags')
      .select('tag_id')
      .eq('tag_id', id)
    expect(links.data).toHaveLength(0)
  })
})
