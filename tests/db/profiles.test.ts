import { afterAll, describe, expect, it } from 'vitest'
import { admin, anonClient, createTestUser, deleteTestUsers, seedEntity } from './helpers'

// Rules under test, from docs/current-state.md:
//   "Entities can never log in (linked_user_id must stay empty for them)."
//   "Only person-type pages can be claimed — enforced by a trigger."
//   "Only a verified identity locks a platform account."
//   Signup creates a profile automatically.

describe('profiles', () => {
  afterAll(deleteTestUsers)

  it('creates a profile automatically on signup', async () => {
    const member = await createTestUser('Auto Profiled')

    const { data, error } = await admin
      .from('profiles')
      .select('display_name, type, linked_user_id')
      .eq('id', member.profileId)
      .single()

    expect(error).toBeNull()
    expect(data?.display_name).toBe('Auto Profiled')
    expect(data?.type).toBe('person')
    expect(data?.linked_user_id).toBe(member.userId)
  })

  it('refuses to give an entity a login', async () => {
    const member = await createTestUser('Entity Wrangler')

    // Even with fixture privileges that bypass the permission rules, the
    // constraint holds — this one is not a permission, it is impossible.
    const { error } = await admin.from('profiles').insert({
      display_name: 'A Company',
      type: 'entity',
      slug: `entity-${crypto.randomUUID()}`,
      linked_user_id: member.userId,
    })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23514')
  })

  it('refuses a claim on an entity page', async () => {
    const member = await createTestUser('Hopeful Claimant')

    const entityId = await seedEntity('A Company That Cannot Be Claimed')

    const { error } = await member.client.from('claims').insert({
      profile_id: entityId,
      user_id: member.userId,
      status: 'pending',
    })

    expect(error).not.toBeNull()
  })

  it('lets a member add an unverified identity but never a verified one', async () => {
    const member = await createTestUser('Identity Adder')

    const allowed = await member.client.from('profile_identities').insert({
      profile_id: member.profileId,
      platform: 'youtube',
      identity_value: `channel-${crypto.randomUUID()}`,
    })
    expect(allowed.error).toBeNull()

    const refused = await member.client.from('profile_identities').insert({
      profile_id: member.profileId,
      platform: 'youtube',
      identity_value: `channel-${crypto.randomUUID()}`,
      verified: true,
    })
    expect(refused.error).not.toBeNull()
  })

  it('lets two people claim the same unverified identity, but only one verified', async () => {
    const first = await createTestUser('First Claimant')
    const second = await createTestUser('Second Claimant')
    const channel = `contested-${crypto.randomUUID()}`

    // A squatter must not be able to permanently block the real owner.
    const a = await first.client
      .from('profile_identities')
      .insert({ profile_id: first.profileId, platform: 'youtube', identity_value: channel })
    const b = await second.client
      .from('profile_identities')
      .insert({ profile_id: second.profileId, platform: 'youtube', identity_value: channel })
    expect(a.error).toBeNull()
    expect(b.error).toBeNull()

    // Verifying both, however, is refused by the unique index.
    const firstVerified = await admin
      .from('profile_identities')
      .update({ verified: true })
      .eq('profile_id', first.profileId)
      .eq('identity_value', channel)
    expect(firstVerified.error).toBeNull()

    const secondVerified = await admin
      .from('profile_identities')
      .update({ verified: true })
      .eq('profile_id', second.profileId)
      .eq('identity_value', channel)
    expect(secondVerified.error?.code).toBe('23505')
  })

  it('refuses a signed-out visitor editing anyone‘s profile', async () => {
    const member = await createTestUser('Target')

    const { data } = await anonClient()
      .from('profiles')
      .update({ display_name: 'Hacked' })
      .eq('id', member.profileId)
      .select()

    // No error, but no rows changed — the rule hides the row rather than
    // announcing it. Either way the name must be untouched.
    expect(data ?? []).toHaveLength(0)

    const { data: after } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', member.profileId)
      .single()
    expect(after?.display_name).toBe('Target')
  })
})
