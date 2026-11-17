import { expect, test } from '@playwright/test'

// Google's sign-in review needs a privacy policy reachable from the home page.
test('the footer leads to the privacy page', async ({ page }) => {
  await page.goto('/')
  await page.locator('.site-footer').getByRole('link', { name: 'Privacy' }).click()

  await expect(page).toHaveURL(/\/privacy$/)
  await expect(page.getByRole('heading', { name: 'Privacy', level: 2 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Deleting your account' })).toBeVisible()
})
