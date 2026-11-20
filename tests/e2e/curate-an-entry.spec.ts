import { expect, test } from '@playwright/test'
import { cleanUp, seedSubmission, signIn, signOut, trackProfileNamed } from './helpers'

// The curation page, its own page alongside the discussion page: anyone
// signed in can fix the title, credits, and each kind of tag from its own
// section. The discussion shows here too.
test.describe('curating an entry', () => {
  test.afterAll(cleanUp)

  test('is reached from the feed card, and the old discussion page is unchanged', async ({
    page,
  }) => {
    const owner = await signIn(page)
    const entry = `An entry to find ${crypto.randomUUID().slice(0, 8)}`
    const submissionId = await seedSubmission(owner.profileId, entry)

    await page.goto('/')
    const card = page.locator('.submission-card').filter({ hasText: entry })
    await card.getByRole('link', { name: 'Curate' }).click()
    await expect(page).toHaveURL(new RegExp(`/submission/${submissionId}/curate$`))
    await expect(page.getByRole('region', { name: 'Curation' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Discussion/ })).toBeVisible()

    // The speech bubble still opens the discussion page as before.
    await page.goto('/')
    await card.getByRole('link', { name: /^Discuss/ }).click()
    await expect(page).toHaveURL(new RegExp(`/submission/${submissionId}$`))
    await expect(page.getByRole('region', { name: 'Who made this' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Curation' })).toHaveCount(0)
  })

  test('a member can credit a creator on someone else’s entry', async ({ page }) => {
    const owner = await signIn(page)
    const submissionId = await seedSubmission(owner.profileId, 'An entry to credit')
    const creatorName = `Curated Creator ${crypto.randomUUID().slice(0, 8)}`

    await signOut(page)
    await signIn(page, 'bob')
    await page.goto(`/submission/${submissionId}/curate`)

    const credits = page.getByRole('region', { name: 'People and organizations' })
    await expect(credits).toContainText('Nobody credited yet')
    await credits.getByRole('button', { name: 'Edit people and organizations' }).click()
    await credits.getByLabel('Search for who made this').fill(creatorName)
    await credits.getByRole('button', { name: /Suggest .* as a new profile/ }).click()
    await expect(credits.getByRole('link', { name: creatorName })).toBeVisible()
    await trackProfileNamed(creatorName)
    await expect(page.locator('.submission-meta')).toContainText(creatorName)

    await credits.getByRole('button', { name: `Remove ${creatorName}` }).click()
    await expect(credits).toContainText('Nobody credited yet')
  })

  test('a member can retitle someone else’s entry', async ({ page }) => {
    const owner = await signIn(page)
    const submissionId = await seedSubmission(owner.profileId, 'a badly typed titel')
    const better = `A properly typed title ${crypto.randomUUID().slice(0, 8)}`

    await signOut(page)
    await signIn(page, 'bob')
    await page.goto(`/submission/${submissionId}/curate`)

    await page.getByRole('button', { name: 'Edit title' }).click()
    await page.getByLabel('Title', { exact: true }).fill(better)
    await page.getByRole('button', { name: 'Save title' }).click()
    await expect(page.getByRole('heading', { name: better })).toBeVisible()

    // It stuck.
    await page.reload()
    await expect(page.getByRole('heading', { name: better })).toBeVisible()
  })

  test('each tag section only offers its own kind of tag', async ({ page }) => {
    const member = await signIn(page)
    const submissionId = await seedSubmission(member.profileId, 'An entry to tag by section')
    const version = `Zurich ${crypto.randomUUID().slice(0, 6)}`

    await page.goto(`/submission/${submissionId}/curate`)
    const versions = page.getByRole('region', { name: 'Applicable versions' })
    await expect(versions).toContainText('Not yet identified')

    await versions.getByRole('button', { name: 'Edit Applicable versions' }).click()
    await versions.getByLabel('Add applicable versions').fill(version)
    // Only "version" is offered as the kind of new tag, not topic or medium.
    const suggest = page.getByRole('option').filter({ hasText: /^Suggest new/ })
    await expect(suggest).toHaveCount(1)
    await expect(suggest).toContainText('Suggest new version')
    await suggest.click()

    await expect(versions.getByRole('link', { name: version })).toBeVisible()
    // It went in as a version, so it isn't listed under Topics.
    await expect(
      page.getByRole('region', { name: 'What is this content about?' }).getByRole('link', { name: version }),
    ).toHaveCount(0)

    // Tidy up: taking it off removes the now-unused suggestion too.
    await versions.getByRole('button', { name: `Remove tag ${version}` }).click()
    await expect(versions).toContainText('Not yet identified')
  })

  test('a signed-out visitor sees the record but cannot edit it', async ({ page }) => {
    const owner = await signIn(page)
    const submissionId = await seedSubmission(owner.profileId, 'A read-only look')

    await signOut(page)
    await page.goto(`/submission/${submissionId}/curate`)
    await expect(page.getByRole('region', { name: 'What is this content about?' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit title' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Edit / })).toHaveCount(0)
  })
})
