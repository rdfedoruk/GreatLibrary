import { expect, test, type Page } from '@playwright/test'
import {
  cleanUp,
  seedProfile,
  seedSubmission,
  signIn,
  tagSubmission,
  trackSubmissionAt,
} from './helpers'

// Covers filter-the-list-by-tag: narrowing the home page to one tag, and the
// address that makes a narrowed view shareable.
//
// Every journey here is a read: filtering is what a signed-out visitor does,
// so nothing signs in and the fixtures are seeded straight into the database.
test.describe('filtering the library by tag', () => {
  // One pair — one tagged, one not — with stamped descriptions, so the
  // assertions hold whatever else is in the test project.
  const stamp = crypto.randomUUID().slice(0, 8)
  const tagged = `A tagged video ${stamp}`
  const untagged = `An untagged entry ${stamp}`

  test.beforeAll(async () => {
    const submitter = await seedProfile(`Journey Filterer ${stamp}`)
    const taggedId = await seedSubmission(submitter, tagged)
    await tagSubmission(taggedId, 'Video')
    await seedSubmission(submitter, untagged)
  })

  test.afterAll(cleanUp)

  /** The card for a seeded entry, found by its stamped description. */
  function cardFor(page: Page, description: string) {
    return page.locator('.submission-card').filter({ hasText: description })
  }

  test('clicking a tag on a card opens a feed of everything carrying it', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByText(tagged)).toBeVisible()
    await expect(page.getByText(untagged)).toBeVisible()

    await cardFor(page, tagged)
      .getByRole('link', { name: 'Video', exact: true })
      .click()

    await expect(page).toHaveURL(/\?tag=video$/)
    await expect(
      page.getByRole('heading', { name: 'Tagged Video' }),
    ).toBeVisible()
    await expect(page.getByText(tagged)).toBeVisible()
    await expect(page.getByText(untagged)).toHaveCount(0)

    // The card keeps all of its own tags — the filter narrows the list, not
    // what each entry says about itself.
    await expect(page.locator('.submission-tags').first()).toContainText('Video')

    await page.getByRole('link', { name: 'Show everything' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText(untagged)).toBeVisible()

    // Back returns to the filtered view rather than leaving the library.
    await page.goBack()
    await expect(page).toHaveURL(/\?tag=video$/)
    await expect(page.getByText(untagged)).toHaveCount(0)
  })

  // The same chips ride along on the entry's own page, which is where someone
  // reading a discussion decides they want more of the same.
  test('a tag on a submission page leads to the same feed', async ({ page }) => {
    await page.goto('/')
    await cardFor(page, tagged).getByRole('link', { name: /^Discuss/ }).click()
    await expect(page).toHaveURL(/\/submission\/[0-9a-f-]+$/)
    // The address changes a beat before the feed is swapped for the entry's
    // page; wait for the page itself or the feed's chips are still there.
    await expect(page.getByRole('link', { name: /Back to the library/ })).toBeVisible()

    await page.getByRole('link', { name: 'Video', exact: true }).click()

    await expect(page).toHaveURL(/\?tag=video$/)
    await expect(page.getByText(tagged)).toBeVisible()
    await expect(page.getByText(untagged)).toHaveCount(0)
  })

  test('a filtered address opens straight into the filtered view', async ({
    page,
  }) => {
    // A fresh browser with no history: the state a shared link arrives in.
    await page.goto('/?tag=video')

    await expect(
      page.getByRole('heading', { name: 'Tagged Video' }),
    ).toBeVisible()
    await expect(page.getByText(tagged)).toBeVisible()
    await expect(page.getByText(untagged)).toHaveCount(0)
  })

  test('an address naming no known tag says so rather than showing everything', async ({
    page,
  }) => {
    await page.goto('/?tag=not-a-real-tag')

    await expect(page.getByText(/there’s no tag called “not-a-real-tag”/)).toBeVisible()
    await expect(page.getByText(tagged)).toHaveCount(0)
    await expect(page.getByText(untagged)).toHaveCount(0)
  })

  // The one journey here that writes, and the reason it signs in: an entry
  // submitted while a filter is on needn't carry the tag being filtered on, so
  // the filter comes off rather than swallowing what was just submitted.
  test('submitting while filtered leaves the new entry in sight', async ({
    page,
  }) => {
    await signIn(page, `Journey Filter Submitter ${stamp}`)
    const url = `https://example.com/${crypto.randomUUID()}`
    const description = `Submitted while filtered ${crypto.randomUUID().slice(0, 8)}`

    await page.goto('/?tag=video')
    await expect(page.getByText(untagged)).toHaveCount(0)

    await page.getByRole('button', { name: 'Submit content' }).click()
    await page.getByLabel('Link', { exact: true }).fill(url)
    await page.getByLabel(/^Description/).fill(description)
    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    await trackSubmissionAt(url)

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText(description)).toBeVisible()

    // Submitting works out a title and a thumbnail from the link. Nothing is
    // at that address, so the title falls back to the site's name and the
    // thumbnail is the generated card — but both are there, and the image
    // really loads.
    const card = cardFor(page, description)
    await expect(card.getByRole('link', { name: 'example.com', exact: true })).toBeVisible()
    const thumb = card.locator('img.submission-thumb')
    await expect(thumb).toBeVisible()
    await expect
      .poll(() => thumb.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBe(1280)
  })

  // Nothing lists the vocabulary any more, so the only tags anyone is offered
  // are the ones printed on an entry that carries them.
  test('the unfiltered feed offers no tag nothing carries', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('link', { name: 'Video', exact: true }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Virtual Agent', exact: true }),
    ).toHaveCount(0)
  })
})
