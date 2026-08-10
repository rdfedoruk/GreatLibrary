import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, createTestUser, deleteTestUsers, type TestUser } from './helpers'

// Rules under test, from docs/current-state.md:
//   "A URL can only be submitted once."
//   "Reads are public. Writes are own-row only."

describe('submissions', () => {
  let member: TestUser

  beforeAll(async () => {
    member = await createTestUser('Submitter')
  })

  afterAll(deleteTestUsers)

  it('lets a signed-in member submit a link', async () => {
    const { error } = await member.client.from('submissions').insert({
      url: `https://example.com/${crypto.randomUUID()}`,
      description: 'A genuinely useful post',
      source_site: 'manual',
      submitted_by: member.profileId,
    })
    expect(error).toBeNull()
  })

  it('refuses the same URL twice', async () => {
    const url = `https://example.com/${crypto.randomUUID()}`
    const first = await member.client.from('submissions').insert({
      url,
      description: 'First time',
      source_site: 'manual',
      submitted_by: member.profileId,
    })
    expect(first.error).toBeNull()

    const second = await member.client.from('submissions').insert({
      url,
      description: 'Same link again',
      source_site: 'manual',
      submitted_by: member.profileId,
    })
    expect(second.error?.code).toBe('23505')
  })

  it('refuses an empty description', async () => {
    const { error } = await member.client.from('submissions').insert({
      url: `https://example.com/${crypto.randomUUID()}`,
      description: '   ',
      source_site: 'manual',
      submitted_by: member.profileId,
    })
    expect(error?.code).toBe('23514')
  })

  it('refuses a submission filed under someone else‘s name', async () => {
    const other = await createTestUser('Someone Else')

    const { error } = await member.client.from('submissions').insert({
      url: `https://example.com/${crypto.randomUUID()}`,
      description: 'Pretending to be someone else',
      source_site: 'manual',
      submitted_by: other.profileId,
    })
    expect(error).not.toBeNull()
  })

  it('refuses a submission from a signed-out visitor', async () => {
    const { error } = await anonClient().from('submissions').insert({
      url: `https://example.com/${crypto.randomUUID()}`,
      description: 'Anonymous drive-by',
      source_site: 'manual',
      submitted_by: member.profileId,
    })
    expect(error).not.toBeNull()
  })

  it('lets a signed-out visitor read the library', async () => {
    const { data, error } = await anonClient().from('submissions').select('url').limit(5)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })
})
