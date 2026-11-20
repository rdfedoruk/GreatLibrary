import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  admin,
  anonClient,
  castMember,
  deleteTestUsers,
  seedSubmission,
  type TestUser,
} from './helpers'

// Rules under test:
//   "A URL can only be submitted once."
//   "Reads are public. Writes are own-row only."

describe('submissions', () => {
  let member: TestUser

  beforeAll(async () => {
    member = castMember('alice')
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

  it('refuses an entry with neither a title nor a description', async () => {
    const { error } = await member.client.from('submissions').insert({
      url: `https://example.com/${crypto.randomUUID()}`,
      description: '   ',
      source_site: 'manual',
      submitted_by: member.profileId,
    })
    expect(error?.code).toBe('23514')
  })

  it('accepts an entry with a title and no description', async () => {
    const { data, error } = await member.client
      .from('submissions')
      .insert({
        url: `https://example.com/${crypto.randomUUID()}`,
        title: 'A title worked out from the link',
        source_site: 'manual',
        submitted_by: member.profileId,
        thumbnail_path: 'somewhere.png',
      })
      .select('title, description, thumbnail_path')
      .single()
    expect(error).toBeNull()
    expect(data).toEqual({
      title: 'A title worked out from the link',
      description: '',
      thumbnail_path: 'somewhere.png',
    })
  })

  describe('thumbnail images', () => {
    // The smallest valid PNG: one transparent pixel.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    )
    const made: string[] = []

    afterAll(async () => {
      if (made.length > 0) await admin.storage.from('thumbnails').remove(made)
    })

    it('lets a signed-in member add an image, and anyone view it', async () => {
      const path = `test-${crypto.randomUUID()}.png`
      const { error } = await member.client.storage
        .from('thumbnails')
        .upload(path, png, { contentType: 'image/png' })
      expect(error).toBeNull()
      made.push(path)

      const { data } = anonClient().storage.from('thumbnails').getPublicUrl(path)
      const response = await fetch(data.publicUrl)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('image/png')
    })

    it('refuses an image from a signed-out visitor', async () => {
      const path = `test-${crypto.randomUUID()}.png`
      const { error } = await anonClient()
        .storage.from('thumbnails')
        .upload(path, png, { contentType: 'image/png' })
      expect(error).not.toBeNull()
    })

    it('refuses a file that is not an image', async () => {
      const path = `test-${crypto.randomUUID()}.html`
      const { error } = await member.client.storage
        .from('thumbnails')
        .upload(path, Buffer.from('<script>alert(1)</script>'), {
          contentType: 'text/html',
        })
      expect(error).not.toBeNull()
    })

    // Migration 17: anyone signed in may delete an image no entry uses (the
    // old one, after a regenerate), but not one an entry is showing.
    it('refuses removing someone else‘s image while an entry shows it', async () => {
      const path = `test-${crypto.randomUUID()}.png`
      await member.client.storage
        .from('thumbnails')
        .upload(path, png, { contentType: 'image/png' })
      made.push(path)
      const id = await seedSubmission(member.profileId)
      await admin.from('submissions').update({ thumbnail_path: path }).eq('id', id)
      const other = castMember('bob')

      await other.client.storage.from('thumbnails').remove([path])
      const still = await fetch(
        anonClient().storage.from('thumbnails').getPublicUrl(path).data.publicUrl,
        { cache: 'no-store' },
      )
      expect(still.status).toBe(200)
    })

    it('lets any member remove an image no entry uses', async () => {
      const path = `test-${crypto.randomUUID()}.png`
      await member.client.storage
        .from('thumbnails')
        .upload(path, png, { contentType: 'image/png' })
      made.push(path)
      const other = castMember('bob')

      const { data } = await other.client.storage.from('thumbnails').remove([path])
      expect(data).toHaveLength(1)
    })

    it('refuses a signed-out visitor removing an unused image', async () => {
      const path = `test-${crypto.randomUUID()}.png`
      await member.client.storage
        .from('thumbnails')
        .upload(path, png, { contentType: 'image/png' })
      made.push(path)

      const { data } = await anonClient().storage.from('thumbnails').remove([path])
      expect(data ?? []).toHaveLength(0)
    })
  })

  it('refuses a submission filed under someone else‘s name', async () => {
    const other = castMember('bob')

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
