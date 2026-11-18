import { expect, test } from '@playwright/test'
import { admin, cleanUp, seedProfile, seedSubmission } from './helpers'

// Covers the feed loading more as you scroll, rather than page numbers.
//
// Runs on a profile page's "Submitted by" list — the same list the home page
// uses — so the count is exact whatever else is in the test project.
test.describe('loading more as you scroll', () => {
  const stamp = crypto.randomUUID().slice(0, 8)
  let slug = ''

  test.beforeAll(async () => {
    const submitter = await seedProfile(`Journey Scroller ${stamp}`)
    // One more full load than fits in the first, plus a few.
    for (let i = 0; i < 25; i++) {
      await seedSubmission(submitter, `Scrolled entry ${stamp} #${i}`)
    }
    const { data, error } = await admin
      .from('profiles')
      .select('slug')
      .eq('id', submitter)
      .single()
    if (error) throw error
    slug = data.slug
  })

  test.afterAll(cleanUp)

  test('shows the first twenty, then the rest once scrolled to', async ({
    page,
  }) => {
    await page.goto(`/profile/${slug}`)

    const section = page.locator('.profile-section').filter({
      has: page.getByRole('heading', { name: /^Submitted by/ }),
    })
    const cards = section.locator('.submission-card')

    await expect(cards).toHaveCount(20)
    // The newest comes first.
    await expect(cards.first()).toContainText(`Scrolled entry ${stamp} #24`)

    await cards.last().scrollIntoViewIfNeeded()
    await expect(cards).toHaveCount(25)
    await expect(cards.last()).toContainText(`Scrolled entry ${stamp} #0`)

    // Nothing left to fetch, so nothing says it is still loading.
    await expect(page.getByText('Loading more…')).toHaveCount(0)
  })
})
