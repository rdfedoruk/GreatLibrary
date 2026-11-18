import { expect, test, type Page } from '@playwright/test'
import { cleanUp, creditProfile, seedProfile, seedSubmission, tagSubmission } from './helpers'

// Covers the feed's search box: tags added to the search narrow the feed to
// entries carrying all of them, and typed words narrow it further to entries
// with every word in the title, the description, or the name of someone
// credited on it.
//
// Searching is what a signed-out visitor does, so nothing signs in and the
// fixtures are seeded straight into the database. Every entry carries a stamp,
// and every search includes it, so other rows in the test project never match.
test.describe('searching the library', () => {
  const stamp = crypto.randomUUID().slice(0, 8)
  // ITSM and Video, "projectile" in the title.
  const hit = `Projectile vomit in ITSM ${stamp}`
  // Video only, "projectile" in the title.
  const offTag = `Projectile vomit elsewhere ${stamp}`
  // ITSM, but not the word.
  const offWord = `A calm ITSM entry ${stamp}`
  // ITSM, with "projectile" only in the description.
  const inDescription = `Projectile mentioned only down here ${stamp}`
  // Nothing about it says "Zephyrine" except who it's credited to.
  const credited = `A quiet walkthrough ${stamp}`

  test.beforeAll(async () => {
    const submitter = await seedProfile(`Journey Searcher ${stamp}`)
    const hitId = await seedSubmission(submitter, `First ${stamp}`, hit)
    await tagSubmission(hitId, 'ITSM')
    await tagSubmission(hitId, 'Video')
    const offTagId = await seedSubmission(submitter, `Second ${stamp}`, offTag)
    await tagSubmission(offTagId, 'Video')
    const offWordId = await seedSubmission(submitter, `Third ${stamp}`, offWord)
    await tagSubmission(offWordId, 'ITSM')
    const descId = await seedSubmission(submitter, inDescription, `Fourth ${stamp}`)
    await tagSubmission(descId, 'ITSM')
    const creditedId = await seedSubmission(submitter, `Fifth ${stamp}`, credited)
    await creditProfile(creditedId, await seedProfile(`Ada Zephyrine ${stamp}`))
  })

  test.afterAll(cleanUp)

  const box = (page: Page) => page.getByRole('combobox', { name: 'Search the library' })
  const cardFor = (page: Page, text: string) =>
    page.locator('.submission-card').filter({ hasText: text })

  test('add a tag, then type a word that is in a few titles', async ({ page }) => {
    await page.goto('/')

    await box(page).fill('itsm')
    await page.getByRole('option', { name: /^ITSM/ }).click()
    await expect(page).toHaveURL(/\?tag=itsm$/)
    await expect(
      page.getByRole('button', { name: 'Remove tag ITSM from the search' }),
    ).toBeVisible()
    // Picking the tag clears the words typed to find it.
    await expect(box(page)).toHaveValue('')

    await box(page).fill(`projectile ${stamp}`)

    await expect(page).toHaveURL(/q=projectile/)
    await expect(page.getByText(hit)).toBeVisible()
    await expect(page.getByText(inDescription)).toBeVisible()
    await expect(page.getByText(offTag)).toHaveCount(0)
    await expect(page.getByText(offWord)).toHaveCount(0)
  })

  test('words can come in any order and any capitals', async ({ page }) => {
    await page.goto('/')
    await box(page).fill(`${stamp} PROJECTILE`)

    await expect(page.getByText(hit)).toBeVisible()
    await expect(page.getByText(offTag)).toBeVisible()
    await expect(page.getByText(inDescription)).toBeVisible()
    await expect(page.getByText(offWord)).toHaveCount(0)
  })

  test('clicking a tag on a card adds it to the search', async ({ page }) => {
    await page.goto(`/?q=${stamp}`)
    await expect(page.getByText(offTag)).toBeVisible()

    await cardFor(page, hit).getByRole('link', { name: 'ITSM', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`q=${stamp}`))
    await expect(page.getByText(offTag)).toHaveCount(0)
    await expect(page.getByText(offWord)).toBeVisible()
    await expect(box(page)).toHaveValue(stamp)

    // A second tag narrows further: only entries carrying both.
    await cardFor(page, hit).getByRole('link', { name: 'Video', exact: true }).click()
    await expect(page.getByText(hit)).toBeVisible()
    await expect(page.getByText(offWord)).toHaveCount(0)
    await expect(page.getByText(offTag)).toHaveCount(0)

    // Taking ITSM back out leaves Video and the words.
    await page.getByRole('button', { name: 'Remove tag ITSM from the search' }).click()
    await expect(page.getByText(offTag)).toBeVisible()
    await expect(page.getByText(offWord)).toHaveCount(0)
  })

  test('a shared search opens straight into its results', async ({ page }) => {
    await page.goto(`/?tag=itsm&tag=video&q=${stamp}`)

    await expect(box(page)).toHaveValue(stamp)
    await expect(page.getByText(hit)).toBeVisible()
    await expect(page.getByText(offTag)).toHaveCount(0)
    await expect(page.getByText(offWord)).toHaveCount(0)
  })

  test('words can match who an entry is credited to', async ({ page }) => {
    await page.goto('/')
    await box(page).fill(`zephyrine ${stamp}`)

    await expect(page.getByText(credited)).toBeVisible()
    await expect(page.getByText(hit)).toHaveCount(0)

    // A word from the credit and a word from the title narrow together.
    await box(page).fill(`zephyrine walkthrough ${stamp}`)
    await expect(page.getByText(credited)).toBeVisible()
    await box(page).fill(`zephyrine projectile ${stamp}`)
    await expect(page.getByText('Nothing matches that search.')).toBeVisible()
  })

  test('a search with no matches says so', async ({ page }) => {
    await page.goto(`/?q=${stamp}+nothing-has-this-word`)
    await expect(page.getByText('Nothing matches that search.')).toBeVisible()
  })
})
