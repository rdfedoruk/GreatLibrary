import { expect, test, type Page } from '@playwright/test'
import {
  admin,
  cleanUp,
  seedSubmission,
  signIn,
  tagSubmission,
  trackProfileNamed,
} from './helpers'

// Curation Bounties: an entry you work on stays on the list (marked done) so
// you can add a second tag or credit, and leaves once you switch tabs.
test.describe('bounty tabs', () => {
  const stamp = crypto.randomUUID().slice(0, 8)
  const tagA = `Bounty Tag A ${stamp}`
  const tagB = `Bounty Tag B ${stamp}`

  test.beforeAll(async () => {
    const { error } = await admin.from('tags').insert([
      { name: tagA, type: 'general', status: 'approved' },
      { name: tagB, type: 'general', status: 'approved' },
    ])
    if (error) throw error
  })

  test.afterAll(async () => {
    await cleanUp()
    await admin.from('tags').delete().in('name', [tagA, tagB])
  })

  const cardFor = (page: Page, text: string) =>
    page.locator('.submission-card').filter({ hasText: text })

  test('a tagged entry stays on Untagged until you leave the tab', async ({ page }) => {
    const member = await signIn(page, 'Bounty Tagger')
    const entry = `Build an agent for HRSD ${stamp}`
    const id = await seedSubmission(member.profileId, entry)
    // A medium tag isn't a tag in this sense: the entry is still untagged.
    await tagSubmission(id, 'Video')

    await page.goto('/bounties#untagged')
    const card = cardFor(page, entry)
    await expect(card).toBeVisible()

    await card.getByRole('button', { name: `Suggest tags for ${entry}` }).click()
    const input = card.getByLabel(`Add a tag to ${entry}`)
    await input.fill(tagA)
    await input.press('Enter')
    await expect(card.getByText('Tagged ✓')).toBeVisible()

    // Still there for a second tag.
    await input.fill(tagB)
    await input.press('Enter')
    await expect(card.locator('.tag', { hasText: tagB })).toBeVisible()

    // Leave and come back: gone.
    await page.getByRole('tab', { name: /Unversioned/ }).click()
    await page.getByRole('tab', { name: /Untagged/ }).click()
    await expect(page.getByText('Loading the library…')).toHaveCount(0)
    await expect(cardFor(page, entry)).toHaveCount(0)
  })

  test('a credited entry stays on Unattributed until you leave the tab', async ({
    page,
  }) => {
    const member = await signIn(page, 'Bounty Attributor')
    const entry = `An entry nobody made ${stamp}`
    await seedSubmission(member.profileId, entry)
    const name = `Igni Bugnostroclumbasaur ${stamp}`

    await page.goto('/bounties#unattributed')
    const card = cardFor(page, entry)
    await expect(card).toBeVisible()

    await card.getByRole('button', { name: 'Edit people and organizations' }).click()
    await card.getByLabel('Search for who made this').fill(name)
    await card.getByRole('button', { name: /as a new profile/ }).click()
    await trackProfileNamed(name)
    await expect(card.getByText('Attributed ✓')).toBeVisible()
    await expect(card.locator('.attribution-chip', { hasText: name })).toBeVisible()

    // A credit to a name still waiting for its profile counts.
    await page.getByRole('tab', { name: /Untagged/ }).click()
    await page.getByRole('tab', { name: /Unattributed/ }).click()
    await expect(page.getByText('Loading the library…')).toHaveCount(0)
    await expect(cardFor(page, entry)).toHaveCount(0)
  })

  test('the old tags address opens the Tags tab', async ({ page }) => {
    await signIn(page, 'Bounty Tag Manager')
    await page.goto('/tags')
    await expect(page).toHaveURL(/\/bounties#tags$/)
    await expect(page.getByRole('tab', { name: 'Tags', selected: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Approved/ })).toBeVisible()
  })
})
