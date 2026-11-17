import { expect, test } from '@playwright/test'
import { admin, cleanUp, seedProfile, seedSubmission, tagSubmission } from './helpers'

// Covers the feed card: media as icons, plain tags folding into "+N" with
// versions folded first, and the line that says who made it.
test.describe('the feed card', () => {
  const stamp = crypto.randomUUID().slice(0, 8)
  const busy = `A heavily tagged repo ${stamp}`
  // Named so they sort in this order; the first two show, the rest fold.
  const plain = [`Card A ${stamp}`, `Card B ${stamp}`, `Card C ${stamp}`]
  const version = `Card Version ${stamp}`
  const madeTags: string[] = []

  test.beforeAll(async () => {
    const { data, error } = await admin
      .from('tags')
      .insert([
        ...plain.map((name) => ({ name, type: 'general', status: 'approved' })),
        { name: version, type: 'version', status: 'approved' },
      ])
      .select('id')
    if (error) throw error
    madeTags.push(...data.map((t) => t.id))

    const submitter = await seedProfile(`Journey Carder ${stamp}`)
    const id = await seedSubmission(submitter, busy)
    for (const name of [...plain, version, 'Repo']) await tagSubmission(id, name)
  })

  test.afterAll(async () => {
    await cleanUp()
    await admin.from('tags').delete().in('id', madeTags)
  })

  test('shows media as icons and folds extra tags into +N', async ({ page }) => {
    await page.goto('/')
    const card = page.locator('.submission-card').filter({ hasText: busy })

    // Repo is an icon with no visible word, but still names itself and
    // still leads to its feed.
    const repo = card.getByRole('link', { name: 'Repo', exact: true })
    await expect(repo).toBeVisible()
    await expect(repo.locator('svg')).toBeVisible()
    await expect(repo).toHaveText('')

    await expect(card.getByRole('link', { name: plain[0] })).toBeVisible()
    await expect(card.getByRole('link', { name: plain[1] })).toBeVisible()
    await expect(card.getByRole('link', { name: plain[2] })).toHaveCount(0)
    await expect(card.getByRole('link', { name: version })).toHaveCount(0)

    await card.getByRole('button', { name: 'Show 2 more tags' }).click()
    await expect(card.getByRole('link', { name: plain[2] })).toBeVisible()
    await expect(card.getByRole('link', { name: version })).toBeVisible()

    // Nobody is credited, and the card says so instead of naming the submitter.
    await expect(card.locator('.submission-meta')).toContainText(
      'Creator not yet attributed',
    )
    await expect(card).not.toContainText(`Journey Carder ${stamp}`)
  })

  test('the discussion page shows every tag without folding', async ({ page }) => {
    await page.goto('/')
    const card = page.locator('.submission-card').filter({ hasText: busy })
    await card.getByRole('link', { name: /^Discuss/ }).click()
    await expect(page.getByRole('link', { name: /Back to the library/ })).toBeVisible()

    await expect(page.getByRole('link', { name: version })).toBeVisible()
    await expect(page.getByRole('button', { name: /more tag/ })).toHaveCount(0)
  })
})
