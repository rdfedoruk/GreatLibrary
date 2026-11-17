import { expect, test } from '@playwright/test'
import { cleanUp, seedSubmission, signIn, signOut, trackProfileNamed } from './helpers'

// Covers crediting who made an entry: the path from "someone shared this
// link" to "and here is who actually made it", including the page getting
// created for a creator who has never signed in. Since migration 15 anyone
// signed in can do this, not only the submitter.
test.describe('crediting the creator of a submission', () => {
  test.afterAll(cleanUp)

  test('any signed-in member can credit a new creator, and it shows up everywhere', async ({
    page,
  }) => {
    const owner = await signIn(page, 'Journey Submitter')
    const submissionId = await seedSubmission(owner.profileId, 'A video worth watching')
    const creatorName = `Journey Creator ${crypto.randomUUID().slice(0, 8)}`

    // Someone other than the submitter does the crediting.
    await signOut(page)
    await signIn(page, 'Journey Curator')
    await page.goto(`/submission/${submissionId}`)

    const editor = page.getByRole('region', { name: 'People and organizations' })
    await expect(editor).toContainText('Nobody credited yet')
    await editor.getByRole('button', { name: 'Add attribution' }).click()

    // Nobody has a page under this name, so the only way forward is to make one.
    await editor.getByLabel('Search for who made this').fill(creatorName)
    await editor.getByRole('button', { name: /Suggest .* as a new profile/ }).click()
    await expect(editor.getByRole('link', { name: creatorName })).toBeVisible()
    await trackProfileNamed(creatorName)

    // The credit reaches the entry's by-line, not just the editor…
    await expect(page.locator('.submission-meta')).toContainText(creatorName)

    // …and the creator's page.
    await page.locator('.submission-meta').getByRole('link', { name: creatorName }).click()
    await expect(page.getByRole('heading', { name: `Content by ${creatorName}` })).toBeVisible()
    await expect(page.getByText('A video worth watching')).toBeVisible()
  })

  test('an existing page is offered rather than duplicated, and a credit can be undone', async ({
    page,
  }) => {
    const member = await signIn(page, 'Journey Reviser')
    const submissionId = await seedSubmission(member.profileId, 'An article worth reading')
    const creatorName = `Journey Creator ${crypto.randomUUID().slice(0, 8)}`

    await page.goto(`/submission/${submissionId}`)
    const editor = page.getByRole('region', { name: 'People and organizations' })
    await editor.getByRole('button', { name: 'Add attribution' }).click()
    const search = editor.getByLabel('Search for who made this')

    await search.fill(creatorName)
    await editor.getByRole('button', { name: /Suggest .* as a new profile/ }).click()
    await expect(editor.getByRole('link', { name: creatorName })).toBeVisible()
    await trackProfileNamed(creatorName)

    // Typing the same name again offers the page that exists, and does not
    // offer to make a second one — the commonest way duplicates get created.
    await search.fill(creatorName)
    await expect(
      editor.getByRole('button', { name: /Suggest .* as a new profile/ }),
    ).toHaveCount(0)
    await expect(editor.getByRole('button', { name: creatorName, exact: true })).toHaveCount(0)

    await search.fill('')
    await editor.getByRole('button', { name: `Remove ${creatorName}` }).click()
    await expect(editor).toContainText('Nobody credited yet')
    await expect(page.locator('.submission-meta')).not.toContainText(creatorName)
  })

  test('a signed-out visitor sees the credits but no way to change them', async ({ page }) => {
    const owner = await signIn(page, 'Journey Owner')
    const submissionId = await seedSubmission(owner.profileId, 'Someone else’s submission')

    await signOut(page)
    await page.goto(`/submission/${submissionId}`)
    const editor = page.getByRole('region', { name: 'People and organizations' })
    await expect(editor).toBeVisible()
    await expect(editor.getByRole('button', { name: 'Add attribution' })).toHaveCount(0)
  })
})
