import { afterAll, describe, expect, it } from 'vitest'
import {
  admin,
  anonClient,
  createTestUser,
  deleteTestUsers,
  seedEntity,
  seedSubmission,
} from './helpers'

// Rules under test, from migration 3 (submitters attribute their own
// submissions) and migration 9 (members can create unclaimed person pages;
// submitters can take an attribution back off). Migration 15 widened crediting
// to anyone signed in — see curation.test.ts.

describe('attribution', () => {
  afterAll(deleteTestUsers)

  it('lets a submitter credit a profile on their own submission', async () => {
    const member = await createTestUser('Crediting Submitter')
    const submissionId = await seedSubmission(member.profileId)
    const creatorId = await seedEntity('A Channel')

    const { error } = await member.client
      .from('submission_attributions')
      .insert({ submission_id: submissionId, profile_id: creatorId })

    expect(error).toBeNull()
  })

  it('refuses a credit from a signed-out visitor', async () => {
    const member = await createTestUser('Quiet Submitter')
    const submissionId = await seedSubmission(member.profileId)
    const creatorId = await seedEntity('Unwanted Credit')

    const { error } = await anonClient()
      .from('submission_attributions')
      .insert({ submission_id: submissionId, profile_id: creatorId })

    expect(error).not.toBeNull()
  })

  it('lets a submitter take a credit back off', async () => {
    const owner = await createTestUser('Undoing Submitter')
    const submissionId = await seedSubmission(owner.profileId)
    const creatorId = await seedEntity('Mistaken Credit')

    const { error: insertError } = await owner.client
      .from('submission_attributions')
      .insert({ submission_id: submissionId, profile_id: creatorId })
    expect(insertError).toBeNull()

    await owner.client
      .from('submission_attributions')
      .delete()
      .eq('submission_id', submissionId)
      .eq('profile_id', creatorId)

    const gone = await admin
      .from('submission_attributions')
      .select('profile_id')
      .eq('submission_id', submissionId)
    expect(gone.data).toHaveLength(0)
  })

  it('refuses the same profile credited twice on one submission', async () => {
    const member = await createTestUser('Double Crediter')
    const submissionId = await seedSubmission(member.profileId)
    const creatorId = await seedEntity('Credited Once')

    const first = await member.client
      .from('submission_attributions')
      .insert({ submission_id: submissionId, profile_id: creatorId })
    expect(first.error).toBeNull()

    const second = await member.client
      .from('submission_attributions')
      .insert({ submission_id: submissionId, profile_id: creatorId })
    expect(second.error?.code).toBe('23505')
  })
})

describe('creating pages for people who have not signed in', () => {
  afterAll(deleteTestUsers)

  it('lets a member create an unclaimed person page with a generated slug', async () => {
    const member = await createTestUser('Page Creator')
    const name = `Chuck Tomasi ${crypto.randomUUID().slice(0, 8)}`

    const { data, error } = await member.client.rpc('create_unclaimed_profile', {
      p_display_name: name,
    })

    expect(error).toBeNull()
    expect(data?.display_name).toBe(name)
    expect(data?.type).toBe('person')
    expect(data?.linked_user_id).toBeNull()
    expect(data?.slug).toMatch(/^[a-z0-9-]+$/)
  })

  it('gives a second page with the same name a different slug', async () => {
    const member = await createTestUser('Duplicate Namer')
    const name = `Same Name ${crypto.randomUUID().slice(0, 8)}`

    const first = await member.client.rpc('create_unclaimed_profile', {
      p_display_name: name,
    })
    const second = await member.client.rpc('create_unclaimed_profile', {
      p_display_name: name,
    })

    expect(first.error).toBeNull()
    expect(second.error).toBeNull()
    expect(second.data?.slug).not.toBe(first.data?.slug)
  })

  it('refuses a blank name', async () => {
    const member = await createTestUser('Blank Namer')

    const { error } = await member.client.rpc('create_unclaimed_profile', {
      p_display_name: '   ',
    })

    expect(error).not.toBeNull()
  })

  it('refuses a signed-out visitor creating a page', async () => {
    const { error } = await anonClient().rpc('create_unclaimed_profile', {
      p_display_name: `Anonymous Creation ${crypto.randomUUID().slice(0, 8)}`,
    })

    expect(error).not.toBeNull()
  })

  it('refuses a page that arrives already attached to a login', async () => {
    const member = await createTestUser('Login Attacher')

    // Straight at the table, since the function never sets these — the rule
    // has to hold on its own.
    const { error } = await member.client.from('profiles').insert({
      display_name: 'Impostor',
      slug: `impostor-${crypto.randomUUID()}`,
      linked_user_id: member.userId,
    })

    expect(error).not.toBeNull()
  })

  it('refuses a member creating an entity page', async () => {
    const member = await createTestUser('Entity Creator')

    const { error } = await member.client.from('profiles').insert({
      display_name: 'A Company',
      type: 'entity',
      slug: `company-${crypto.randomUUID()}`,
    })

    expect(error).not.toBeNull()
  })
})
