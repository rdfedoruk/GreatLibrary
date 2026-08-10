import { expect, test } from '@playwright/test'

// Covers the signed-out lines of view-the-submission-list and submit-a-link.
test.describe('the home page, signed out', () => {
  test('shows the library and offers a way to sign in', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'The Great Library' })).toBeVisible()

    // The list resolves to something real — entries, or an honest empty
    // message — rather than sitting on "Loading…" or failing to load.
    await expect(page.getByText('Loading the library…')).toHaveCount(0, { timeout: 15000 })
    await expect(page.getByText(/Couldn’t load the library/)).toHaveCount(0)

    const list = page.getByRole('region', { name: 'Submissions' })
    const emptyMessage = page.locator('.submission-status')
    await expect(list.or(emptyMessage).first()).toBeVisible()

    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
  })

  test('offers no way to submit content', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Submit content' })).toHaveCount(0)
  })
})
