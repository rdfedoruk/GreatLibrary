import { expect, test } from '@playwright/test'
import { admin, cleanUp, seedSubmission, signIn, signOut } from './helpers'

// Only an account holding the delete_entries capability sees "Delete entry" on
// the curation page. Deleting asks first, then returns to the library.
test.describe('deleting an entry', () => {
  test.afterAll(cleanUp)

  test('an account with the capability deletes an entry after confirming', async ({ page }) => {
    const owner = await signIn(page, 'Doomed Owner')
    const id = await seedSubmission(owner.profileId, '', 'An entry to delete')

    await signOut(page)
    const deleter = await signIn(page, 'Entry Deleter')
    await admin
      .from('capability_grants')
      .insert({ user_id: deleter.userId, capability: 'delete_entries' })
    await page.goto(`/submission/${id}/curate`)

    // Saying no to the prompt leaves it alone.
    page.once('dialog', (dialog) => dialog.dismiss())
    await page.getByRole('button', { name: 'Delete entry' }).click()
    await expect(page.getByRole('heading', { name: 'An entry to delete' })).toBeVisible()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete entry' }).click()
    await expect(page).toHaveURL(/\/$/)

    const row = await admin.from('submissions').select('id').eq('id', id)
    expect(row.data ?? []).toHaveLength(0)
  })

  test('is not offered to an ordinary signed-in account', async ({ page }) => {
    const owner = await signIn(page, 'Ordinary Owner')
    const id = await seedSubmission(owner.profileId, '', 'Safe from deletion')
    await page.goto(`/submission/${id}/curate`)
    await expect(page.getByRole('heading', { name: 'Safe from deletion' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit title' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete entry' })).toHaveCount(0)
  })
})
