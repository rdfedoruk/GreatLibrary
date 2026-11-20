import { afterAll, describe, expect, it } from 'vitest'
import {
  admin,
  anonClient,
  castMember,
  createTestUser,
  deleteTestUsers,
  seedEntity,
  seedSubmission,
  type TestUser,
} from './helpers'

// Rules under test, from migration 13: a typed-in name starts out suggested;
// signing up makes an approved profile; any signed-in account can approve,
// merge or delete a suggested profile, and nothing else; a suggestion no
// entry credits any more deletes itself.

const unique = (name: string) => `${name} ${crypto.randomUUID().slice(0, 8)}`

async function suggest(member: TestUser, name = unique('Suggested Person')) {
  const { data, error } = await member.client.rpc('create_unclaimed_profile', {
    p_display_name: name,
  })
  if (error) throw error
  return data!.id as string
}

async function statusOf(id: string) {
  const { data } = await admin.from('profiles').select('status').eq('id', id).maybeSingle()
  return data?.status ?? null
}

async function creditsOf(id: string) {
  const { data } = await admin
    .from('submission_attributions')
    .select('submission_id')
    .eq('profile_id', id)
  return (data ?? []).map((r) => r.submission_id)
}

describe('suggested profiles', () => {
  afterAll(deleteTestUsers)

  it('makes a typed-in name a suggested profile', async () => {
    const member = castMember('alice')
    const id = await suggest(member)
    expect(await statusOf(id)).toBe('suggested')
  })

  it('makes a signed-up member’s own profile approved', async () => {
    const member = await createTestUser('Fresh Signup')
    expect(await statusOf(member.profileId)).toBe('approved')
  })

  it('refuses a member creating a profile that is already approved', async () => {
    const member = castMember('alice')
    const { error } = await member.client.from('profiles').insert({
      display_name: 'Pre-approved',
      slug: `pre-approved-${crypto.randomUUID()}`,
      status: 'approved',
    })
    expect(error).not.toBeNull()
  })

  it('lets any signed-in account approve a suggestion, but not a visitor', async () => {
    const suggester = castMember('alice')
    const approver = castMember('bob')
    const id = await suggest(suggester)

    const refused = await anonClient().rpc('approve_profile', { p_id: id })
    expect(refused.error).not.toBeNull()
    expect(await statusOf(id)).toBe('suggested')

    const { error } = await approver.client.rpc('approve_profile', { p_id: id })
    expect(error).toBeNull()
    expect(await statusOf(id)).toBe('approved')
  })

  it('deletes a suggestion and its credits, but refuses to delete an approved profile', async () => {
    const member = castMember('alice')
    const submissionId = await seedSubmission(member.profileId)
    const id = await suggest(member)
    await member.client
      .from('submission_attributions')
      .insert({ submission_id: submissionId, profile_id: id })

    const { error } = await member.client.rpc('delete_suggested_profile', { p_id: id })
    expect(error).toBeNull()
    expect(await statusOf(id)).toBeNull()
    expect(await creditsOf(id)).toHaveLength(0)

    const other = castMember('bob')
    const refused = await member.client.rpc('delete_suggested_profile', {
      p_id: other.profileId,
    })
    expect(refused.error).not.toBeNull()
    expect(await statusOf(other.profileId)).toBe('approved')
  })

  it('merges a suggestion into an approved profile, moving credits from anyone’s entries', async () => {
    const submitter = castMember('alice')
    const merger = castMember('bob')
    const first = await seedSubmission(submitter.profileId)
    const second = await seedSubmission(submitter.profileId)
    const into = await seedEntity('The Real Name')
    const from = await suggest(submitter)

    // One entry already credits the real profile too: the merge must not
    // trip over the duplicate.
    await submitter.client.from('submission_attributions').insert([
      { submission_id: first, profile_id: from },
      { submission_id: second, profile_id: from },
      { submission_id: second, profile_id: into },
    ])

    const { error } = await merger.client.rpc('merge_profile', {
      p_from: from,
      p_into: into,
    })
    expect(error).toBeNull()
    expect(await statusOf(from)).toBeNull()
    expect((await creditsOf(into)).sort()).toEqual([first, second].sort())
  })

  it('merges a suggestion into the profile of someone who has since signed up', async () => {
    const submitter = castMember('alice')
    const submissionId = await seedSubmission(submitter.profileId)
    const from = await suggest(submitter, unique('Late Joiner'))
    await submitter.client
      .from('submission_attributions')
      .insert({ submission_id: submissionId, profile_id: from })

    const joiner = await createTestUser('Late Joiner')
    const { error } = await submitter.client.rpc('merge_profile', {
      p_from: from,
      p_into: joiner.profileId,
    })
    expect(error).toBeNull()
    expect(await creditsOf(joiner.profileId)).toEqual([submissionId])
  })

  it('refuses to merge an approved profile, into a suggestion, or into itself', async () => {
    const member = castMember('alice')
    const approved = await seedEntity('Approved One')
    const suggestion = await suggest(member)
    const another = await suggest(member)

    const fromApproved = await member.client.rpc('merge_profile', {
      p_from: approved,
      p_into: member.profileId,
    })
    expect(fromApproved.error).not.toBeNull()

    const intoSuggestion = await member.client.rpc('merge_profile', {
      p_from: suggestion,
      p_into: another,
    })
    expect(intoSuggestion.error).not.toBeNull()

    const intoItself = await member.client.rpc('merge_profile', {
      p_from: suggestion,
      p_into: suggestion,
    })
    expect(intoItself.error).not.toBeNull()
    expect(await statusOf(suggestion)).toBe('suggested')
  })

  it('refuses a member un-approving their own profile', async () => {
    const member = castMember('alice')
    await member.client
      .from('profiles')
      .update({ status: 'suggested' })
      .eq('id', member.profileId)
    expect(await statusOf(member.profileId)).toBe('approved')
  })

  it('deletes a suggestion once no entry credits it, but keeps an approved profile', async () => {
    const member = castMember('alice')
    const submissionId = await seedSubmission(member.profileId)
    const typo = await suggest(member)
    const real = await seedEntity('Kept Anyway')
    await member.client.from('submission_attributions').insert([
      { submission_id: submissionId, profile_id: typo },
      { submission_id: submissionId, profile_id: real },
    ])

    await member.client
      .from('submission_attributions')
      .delete()
      .eq('submission_id', submissionId)
    expect(await statusOf(typo)).toBeNull()
    expect(await statusOf(real)).toBe('approved')
  })

  it('lets any signed-in account rename a suggestion, moving its address with it', async () => {
    const suggester = castMember('alice')
    const fixer = castMember('bob')
    const id = await suggest(suggester, unique('Chuk Tomasi'))
    const newName = unique('Chuck Tomasi')

    const { error } = await fixer.client.rpc('rename_suggested_profile', {
      p_id: id,
      p_display_name: '  ' + newName + ' ',
    })
    expect(error).toBeNull()
    const { data } = await admin.from('profiles').select('display_name, slug').eq('id', id).single()
    expect(data?.display_name).toBe(newName)
    expect(data?.slug).toMatch(/^chuck-tomasi-/)
  })

  it('keeps the address when only the capitals change', async () => {
    const member = castMember('alice')
    const name = unique('lower case name')
    const id = await suggest(member, name)
    const before = await admin.from('profiles').select('slug').eq('id', id).single()

    await member.client.rpc('rename_suggested_profile', {
      p_id: id,
      p_display_name: name.toUpperCase(),
    })
    const after = await admin.from('profiles').select('slug').eq('id', id).single()
    expect(after.data?.slug).toBe(before.data?.slug)
  })

  it('lets any signed-in account mark a suggestion as an entity, and back', async () => {
    const suggester = castMember('alice')
    const marker = castMember('bob')
    const id = await suggest(suggester, unique('Some Podcast'))
    const typeOf = async () =>
      (await admin.from('profiles').select('type').eq('id', id).single()).data?.type

    const visitor = await anonClient().rpc('set_suggested_profile_type', {
      p_id: id,
      p_type: 'entity',
    })
    expect(visitor.error).not.toBeNull()
    expect(await typeOf()).toBe('person')

    const { error } = await marker.client.rpc('set_suggested_profile_type', {
      p_id: id,
      p_type: 'entity',
    })
    expect(error).toBeNull()
    expect(await typeOf()).toBe('entity')

    await marker.client.rpc('set_suggested_profile_type', { p_id: id, p_type: 'person' })
    expect(await typeOf()).toBe('person')
  })

  it('refuses changing the type of an approved profile', async () => {
    const member = castMember('alice')
    const { error } = await member.client.rpc('set_suggested_profile_type', {
      p_id: member.profileId,
      p_type: 'entity',
    })
    expect(error).not.toBeNull()
    const { data } = await admin.from('profiles').select('type').eq('id', member.profileId).single()
    expect(data?.type).toBe('person')
  })

  it('refuses renaming an approved profile, a blank name, or a visitor renaming', async () => {
    const member = castMember('alice')
    const other = castMember('bob')
    const id = await suggest(member)

    const approved = await member.client.rpc('rename_suggested_profile', {
      p_id: other.profileId,
      p_display_name: 'Hijacked',
    })
    expect(approved.error).not.toBeNull()

    const blank = await member.client.rpc('rename_suggested_profile', {
      p_id: id,
      p_display_name: '   ',
    })
    expect(blank.error).not.toBeNull()

    const visitor = await anonClient().rpc('rename_suggested_profile', {
      p_id: id,
      p_display_name: 'Anonymous Rename',
    })
    expect(visitor.error).not.toBeNull()
  })
})
