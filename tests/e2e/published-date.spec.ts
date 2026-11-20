import { expect, test } from '@playwright/test'
import { admin, cleanUp, seedProfile, seedSubmission, signIn } from './helpers'

// Covers the dates shown on an entry: when its content was published (and
// last updated, where the source says), never when it was added to the library.
test.describe('published dates', () => {
  const stamp = crypto.randomUUID().slice(0, 8)
  const dated = `An old dated entry ${stamp}`
  const undated = `An entry with no date ${stamp}`
  let datedId = ''
  let undatedId = ''

  test.beforeAll(async () => {
    const submitter = await seedProfile(`Date Seeder ${stamp}`)
    datedId = await seedSubmission(submitter, dated)
    undatedId = await seedSubmission(submitter, undated)
    const { error } = await admin
      .from('submissions')
      .update({ published_on: '2022-04-09', updated_on: '2026-11-01' })
      .eq('id', datedId)
    if (error) throw error
  })

  test.afterAll(cleanUp)

  // The entry's own page shows the same card as the feed, and can't be
  // pushed off the first page by entries other journeys add meanwhile.
  test('the card shows when it was published, not when it was added', async ({ page }) => {
    await page.goto(`/submission/${datedId}`)
    const card = page.locator('.submission-card').filter({ hasText: dated })
    const date = card.locator('time.published-date')
    await expect(date).toHaveText(/years? ago/)
    await expect(date).toHaveAttribute('datetime', '2022-04-09')
    await expect(date).toHaveAttribute('title', 'Published Apr 9, 2022, updated Nov 1, 2026')

    // No date known: no date shown, rather than the day it was added.
    await page.goto(`/submission/${undatedId}`)
    const bare = page.locator('.submission-card').filter({ hasText: undated })
    await expect(bare).toBeVisible()
    await expect(bare.locator('time')).toHaveCount(0)
  })

  test('the curation page shows published and updated dates', async ({ page }) => {
    await signIn(page)
    await page.goto(`/submission/${datedId}/curate`)
    await expect(page.locator('time.published-date')).toHaveAttribute('title', 'Apr 9, 2022')
    await expect(page.locator('time.updated-date')).toHaveAttribute('title', 'Nov 1, 2026')
    await expect(page.getByText(/· added/)).toHaveCount(0)
  })
})
