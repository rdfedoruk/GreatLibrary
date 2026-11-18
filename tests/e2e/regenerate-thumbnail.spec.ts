import { expect, test } from '@playwright/test'
import { admin, cleanUp, seedSubmission, signIn, signOut } from './helpers'

// When a link hides its real title (LinkedIn's "Sign Up" wall), the thumbnail
// says "Sign Up" too. After fixing the title, anyone signed in can draw a new
// thumbnail from it on the curation page; the old image is deleted.
test.describe('regenerating a thumbnail', () => {
  test.afterAll(cleanUp)

  // The smallest valid PNG: one transparent pixel.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  )

  test('replaces someone else’s thumbnail and deletes the old one', async ({ page }) => {
    const owner = await signIn(page, 'Sign Up Owner')
    const id = await seedSubmission(owner.profileId, '', 'A fixed-up title')
    const oldPath = `test-${crypto.randomUUID()}.png`
    await admin.storage.from('thumbnails').upload(oldPath, png, { contentType: 'image/png' })
    await admin.from('submissions').update({ thumbnail_path: oldPath }).eq('id', id)

    await signOut(page)
    await signIn(page, 'Thumbnail Fixer')
    await page.goto(`/submission/${id}/curate`)

    const thumb = page.locator('.entry-thumb')
    await expect(thumb).toHaveAttribute('src', new RegExp(oldPath))
    await page.getByRole('button', { name: 'Regenerate thumbnail' }).click()
    await expect(thumb).not.toHaveAttribute('src', new RegExp(oldPath), { timeout: 20000 })

    const row = await admin
      .from('submissions')
      .select('thumbnail_path, thumbnail_strategy')
      .eq('id', id)
      .single()
    expect(row.data?.thumbnail_path).not.toBe(oldPath)
    expect(row.data?.thumbnail_strategy).toBe('regenerated')

    const left = await admin.storage.from('thumbnails').list('', { search: oldPath })
    expect(left.data ?? []).toHaveLength(0)
  })

  test('is not offered to a signed-out visitor', async ({ page }) => {
    const owner = await signIn(page, 'Quiet Owner')
    const id = await seedSubmission(owner.profileId, 'No button here')
    await signOut(page)
    await page.goto(`/submission/${id}/curate`)
    await expect(page.getByRole('heading', { name: 'No button here' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Regenerate thumbnail' })).toHaveCount(0)
  })
})
