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

  // Read-only on purpose: the dev server points at the live database, so this
  // walks to the discussion and stops short of posting anything.
  test('leads from an entry to its discussion', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Loading the library…')).toHaveCount(0, { timeout: 15000 })

    const discuss = page.getByRole('link', { name: /^Discuss \(\d+\)$/ })
    test.skip((await discuss.count()) === 0, 'the library has no entries to open')

    await discuss.first().click()

    await expect(page).toHaveURL(/\/submission\/[0-9a-f-]+$/)
    await expect(page.getByRole('heading', { name: /^Discussion/ })).toBeVisible()
    // Signed out, the thread reads but offers nothing to post with.
    await expect(page.getByText('Sign in to join the discussion.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Post' })).toHaveCount(0)
  })
})
