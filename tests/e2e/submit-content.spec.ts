import { expect, test } from '@playwright/test'
import {
  admin,
  cleanUp,
  seedProfile,
  signIn,
  trackProfileNamed,
  trackSubmissionAt,
} from './helpers'

// The submit form: a link, who made it (existing profiles or new names), and
// tags (existing or new). New names and tags start out suggested.

const unique = (name: string) => `${name} ${crypto.randomUUID().slice(0, 8)}`

test.describe('submitting content', () => {
  test.afterAll(cleanUp)

  test('a link goes in with its credits and tags', async ({ page }) => {
    await signIn(page)
    const known = unique('Known Creator')
    await seedProfile(known)
    const newcomer = unique('Newcomer Creator')
    const newTag = unique('Brand new tag').slice(0, 30)
    const url = `https://example.com/${crypto.randomUUID()}`

    await page.goto('/')
    await page.getByRole('button', { name: 'Submit content' }).click()
    await expect(page.getByLabel(/^Description/)).toHaveCount(0)
    await page.getByLabel('Link', { exact: true }).fill(url)

    const credits = page.getByLabel('Attributions')
    await credits.fill(known)
    await page.getByRole('option', { name: known, exact: true }).click()
    await credits.fill(newcomer)
    await page.getByRole('option', { name: /Suggest new profile/ }).click()

    const form = page.locator('.submit-form')
    await expect(form.locator('.profile-chip.approved', { hasText: known })).toBeVisible()
    await expect(form.locator('.profile-chip.suggested', { hasText: newcomer })).toBeVisible()

    const tags = page.getByLabel('Tags', { exact: true })
    await tags.fill('Video')
    // An existing tag's option also names its type, e.g. Video · Medium.
    await page
      .getByRole('option')
      .filter({ has: page.locator('.tag', { hasText: /^Video$/ }) })
      .click()
    await tags.fill(newTag)
    await page.getByRole('option', { name: /Suggest new tag/ }).click()
    await expect(form.locator('.tag.suggested', { hasText: newTag })).toBeVisible()

    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    await expect(form).toHaveCount(0)

    const card = page.locator('.submission-card').filter({ hasText: newcomer })
    await expect(card).toBeVisible()
    await trackSubmissionAt(url)
    await trackProfileNamed(newcomer)
    await expect(card).toContainText(known)
    await expect(card.locator('.profile-link.suggested', { hasText: newcomer })).toBeVisible()
    await expect(card.getByRole('link', { name: 'Video', exact: true })).toBeVisible()

    await card.getByRole('link', { name: /^Discuss/ }).click()
    await expect(page.locator('.tag.suggested', { hasText: newTag })).toBeVisible()
    await admin.from('tags').delete().eq('name', newTag)
  })

  test('cancelling leaves no new profile behind', async ({ page }) => {
    await signIn(page)
    const name = unique('Never Saved')

    await page.goto('/')
    await page.getByRole('button', { name: 'Submit content' }).click()
    await page.getByLabel('Attributions').fill(name)
    await page.getByRole('option', { name: /Suggest new profile/ }).click()
    await page.getByRole('button', { name: 'Cancel' }).click()

    const { data } = await admin.from('profiles').select('id').eq('display_name', name)
    expect(data).toHaveLength(0)
  })

  // The button sits in the main nav; the form opens on the feed.
  test('the nav button opens the form on the feed from another page', async ({ page }) => {
    await signIn(page)
    await page.goto('/bounties')
    await page.getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name: 'Submit content' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('.submit-form')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('.submit-form')).toHaveCount(0)
  })

  test('Feed, or the button again, closes the form', async ({ page }) => {
    await signIn(page)
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Main' })
    const button = nav.getByRole('button', { name: 'Submit content' })
    const form = page.locator('.submit-form')

    await button.click()
    await expect(form).toBeVisible()
    await nav.getByRole('link', { name: 'Feed' }).click()
    await expect(form).toHaveCount(0)

    await button.click()
    await expect(form).toBeVisible()
    await button.click()
    await expect(form).toHaveCount(0)

    await button.click()
    await nav.getByRole('link', { name: 'Curation Bounties' }).click()
    await nav.getByRole('link', { name: 'Feed' }).click()
    await expect(form).toHaveCount(0)
  })
})
