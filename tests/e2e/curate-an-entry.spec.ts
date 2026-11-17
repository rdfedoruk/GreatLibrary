import { expect, test } from '@playwright/test'
import { cleanUp, seedSubmission, signIn, signOut } from './helpers'

// The entry page as a curation record: anyone signed in can fix the title and
// fill in each kind of tag from its own section.
test.describe('curating an entry', () => {
  test.afterAll(cleanUp)

  test('a member can retitle someone else’s entry', async ({ page }) => {
    const owner = await signIn(page, 'Title Owner')
    const submissionId = await seedSubmission(owner.profileId, 'a badly typed titel')
    const better = `A properly typed title ${crypto.randomUUID().slice(0, 8)}`

    await signOut(page)
    await signIn(page, 'Title Fixer')
    await page.goto(`/submission/${submissionId}`)

    await page.getByRole('button', { name: 'Edit title' }).click()
    await page.getByLabel('Title', { exact: true }).fill(better)
    await page.getByRole('button', { name: 'Save title' }).click()
    await expect(page.getByRole('heading', { name: better })).toBeVisible()

    // It stuck.
    await page.reload()
    await expect(page.getByRole('heading', { name: better })).toBeVisible()
  })

  test('each tag section only offers its own kind of tag', async ({ page }) => {
    const member = await signIn(page, 'Section Tagger')
    const submissionId = await seedSubmission(member.profileId, 'An entry to tag by section')
    const version = `Zurich ${crypto.randomUUID().slice(0, 6)}`

    await page.goto(`/submission/${submissionId}`)
    const versions = page.getByRole('region', { name: 'Applicable versions' })
    await expect(versions).toContainText('Not yet identified')

    await versions.getByRole('button', { name: 'Add Applicable versions' }).click()
    await versions.getByLabel('Add applicable versions').fill(version)
    // Only "version" is offered as the kind of new tag, not topic or medium.
    const suggest = page.getByRole('option').filter({ hasText: /^Suggest new/ })
    await expect(suggest).toHaveCount(1)
    await expect(suggest).toContainText('Suggest new version')
    await suggest.click()

    await expect(versions.getByRole('link', { name: version })).toBeVisible()
    // It went in as a version, so it isn't listed under Topics.
    await expect(
      page.getByRole('region', { name: 'Topics' }).getByRole('link', { name: version }),
    ).toHaveCount(0)

    // Tidy up: taking it off removes the now-unused suggestion too.
    await versions.getByRole('button', { name: `Remove tag ${version}` }).click()
    await expect(versions).toContainText('Not yet identified')
  })

  test('a signed-out visitor sees the record but cannot edit it', async ({ page }) => {
    const owner = await signIn(page, 'Record Owner')
    const submissionId = await seedSubmission(owner.profileId, 'A read-only look')

    await signOut(page)
    await page.goto(`/submission/${submissionId}`)
    await expect(page.getByRole('region', { name: 'Topics' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit title' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Add / })).toHaveCount(0)
  })
})
