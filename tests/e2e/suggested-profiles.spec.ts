import { expect, test, type Page } from '@playwright/test'
import {
  cleanUp,
  seedProfile,
  seedSubmission,
  signIn,
  trackProfileNamed,
} from './helpers'

// A name typed in while crediting an entry is only a suggestion until someone
// approves it, merges it into the profile it should have been, or deletes it
// on the Profiles tab of Curation Bounties.

const unique = (name: string) => `${name} ${crypto.randomUUID().slice(0, 8)}`

/** Credits a brand-new name on the entry, from the entry's own page. */
async function suggestCredit(page: Page, submissionId: string, name: string) {
  await page.goto(`/submission/${submissionId}`)
  const editor = page.getByRole('region', { name: 'Who made this' })
  await editor.getByLabel('Search for who made this').fill(name)
  await editor.getByRole('button', { name: /Suggest .* as a new profile/ }).click()
  await expect(editor.getByRole('link', { name })).toBeVisible()
  await trackProfileNamed(name)
  return editor
}

function rowFor(page: Page, name: string) {
  return page
    .locator('.suggested-profile')
    .filter({ has: page.getByRole('link', { name, exact: true }) })
}

test.describe('suggested profiles', () => {
  test.afterAll(cleanUp)

  test('a new name shows as a suggestion until it is approved', async ({ page }) => {
    const member = await signIn(page, 'Profile Suggester')
    const submissionId = await seedSubmission(member.profileId, 'A talk worth hearing')
    const name = unique('Brand New Creator')

    const editor = await suggestCredit(page, submissionId, name)
    await expect(editor.locator('.attribution-chip.suggested')).toContainText(name)

    await page.goto('/bounties#profiles')
    const row = rowFor(page, name)
    await expect(row).toContainText('A talk worth hearing')
    await row.getByRole('button', { name: 'Approve' }).click()
    await expect(row).toHaveCount(0)

    await page.goto(`/submission/${submissionId}`)
    await expect(
      page.locator('.attribution-chip.approved', { hasText: name }),
    ).toBeVisible()
    await page.locator('.submission-meta').getByRole('link', { name }).click()
    await expect(page.getByRole('heading', { name: `Content by ${name}` })).toBeVisible()
    await expect(page.getByText('Awaiting approval')).toHaveCount(0)
  })

  test('a misspelt name can be merged into the real profile', async ({ page }) => {
    const member = await signIn(page, 'Profile Merger')
    const submissionId = await seedSubmission(member.profileId, 'A post worth reading')
    const realName = unique('Chuck Tomasi')
    await seedProfile(realName)
    const typo = unique('Chuk Tomasi')

    await suggestCredit(page, submissionId, typo)

    await page.goto('/bounties#profiles')
    const row = rowFor(page, typo)
    await row.getByLabel(`Merge ${typo} into`).fill(realName)
    await row.getByRole('button', { name: `Merge into ${realName}` }).click()
    await expect(row).toHaveCount(0)

    await page.goto(`/submission/${submissionId}`)
    const byline = page.locator('.submission-meta')
    await expect(byline).toContainText(realName)
    await expect(byline).not.toContainText(typo)
  })

  test('a misspelt suggestion can be renamed in place', async ({ page }) => {
    const member = await signIn(page, 'Profile Renamer')
    const submissionId = await seedSubmission(member.profileId, 'A demo worth seeing')
    const typo = unique('Jace Benson Typo')
    const fixed = typo.replace('Jace Benson Typo', 'Jace Benson')

    await suggestCredit(page, submissionId, typo)

    await page.goto('/bounties#profiles')
    await rowFor(page, typo).getByLabel(`Name of ${typo}`).fill(fixed)
    await rowFor(page, typo).getByRole('button', { name: 'Save' }).click()
    await trackProfileNamed(fixed)
    await expect(rowFor(page, fixed)).toBeVisible()
    await expect(rowFor(page, typo)).toHaveCount(0)

    await page.goto(`/submission/${submissionId}`)
    await expect(page.locator('.submission-meta')).toContainText(fixed)
  })

  test('a suggestion can be marked as an entity before it is approved', async ({ page }) => {
    const member = await signIn(page, 'Entity Marker')
    const submissionId = await seedSubmission(member.profileId, 'An episode worth hearing')
    const name = unique('Some Podcast')

    await suggestCredit(page, submissionId, name)

    await page.goto('/bounties#profiles')
    const row = rowFor(page, name)
    await row.getByLabel(`${name} is a`).selectOption('entity')
    await expect(row.getByLabel(`${name} is a`)).toHaveValue('entity')
    await row.getByRole('button', { name: 'Approve' }).click()
    await expect(row).toHaveCount(0)

    await page.goto(`/submission/${submissionId}`)
    await page.locator('.submission-meta').getByRole('link', { name }).click()
    await expect(page.locator('.profile-type-chip')).toHaveText('Entity')
  })

  test('a suggestion can be deleted, taking it off its entry', async ({ page }) => {
    const member = await signIn(page, 'Profile Deleter')
    const submissionId = await seedSubmission(member.profileId, 'A video of nothing much')
    const name = unique('Not A Real Person')

    await suggestCredit(page, submissionId, name)

    await page.goto('/bounties#profiles')
    const row = rowFor(page, name)
    page.once('dialog', (dialog) => void dialog.accept())
    await row.getByRole('button', { name: `Delete ${name}` }).click()
    await expect(row).toHaveCount(0)

    await page.goto(`/submission/${submissionId}`)
    await expect(page.locator('.submission-meta')).not.toContainText(name)
  })
})
