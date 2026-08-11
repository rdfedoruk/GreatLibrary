import { expect, test } from '@playwright/test'
import { cleanUp, seedSubmission, signIn, signOut, trackProfileNamed } from './helpers'

// Covers attribute-a-profile-to-a-submission end to end: the path from "I
// shared this link" to "and here is who actually made it", including the page
// getting created for a creator who has never signed in.
test.describe('crediting the creator of a submission', () => {
  test.afterAll(cleanUp)

  test('the submitter can credit a new creator, and it shows up everywhere', async ({
    page,
  }) => {
    const member = await signIn(page, 'Journey Submitter')
    const submissionId = await seedSubmission(
      member.profileId,
      'A video worth watching',
    )
    const creatorName = `Journey Creator ${crypto.randomUUID().slice(0, 8)}`

    await page.goto(`/submission/${submissionId}`)

    const editor = page.getByRole('region', { name: 'Who made this' })
    await expect(editor).toBeVisible()
    await expect(editor).toContainText('Nobody credited yet')

    // Nobody has a page under this name, so the only way forward is to make one.
    await editor.getByLabel('Search for who made this').fill(creatorName)
    await editor.getByRole('button', { name: /Add .* as a new page/ }).click()
    await expect(editor.getByRole('link', { name: creatorName })).toBeVisible()
    await trackProfileNamed(creatorName)

    // The credit reaches the entry's own by-line, not just the editor.
    await expect(page.locator('.submission-meta')).toContainText(`by ${creatorName}`)

    // …and the creator's page, which is the whole point of separating who
    // made something from who submitted it.
    await page
      .locator('.submission-meta')
      .getByRole('link', { name: creatorName })
      .click()
    await expect(
      page.getByRole('heading', { name: `Content by ${creatorName}` }),
    ).toBeVisible()
    await expect(page.getByText('A video worth watching')).toBeVisible()
  })

  test('an existing page is offered rather than duplicated, and a credit can be undone', async ({
    page,
  }) => {
    const member = await signIn(page, 'Journey Reviser')
    const submissionId = await seedSubmission(
      member.profileId,
      'An article worth reading',
    )
    const creatorName = `Journey Creator ${crypto.randomUUID().slice(0, 8)}`

    await page.goto(`/submission/${submissionId}`)
    const editor = page.getByRole('region', { name: 'Who made this' })
    const search = editor.getByLabel('Search for who made this')

    await search.fill(creatorName)
    await editor.getByRole('button', { name: /Add .* as a new page/ }).click()
    await expect(editor.getByRole('link', { name: creatorName })).toBeVisible()
    await trackProfileNamed(creatorName)

    // Typing the same name again offers the page that exists, and does not
    // offer to make a second one — the commonest way duplicates get created.
    await search.fill(creatorName)
    await expect(
      editor.getByRole('button', { name: /Add .* as a new page/ }),
    ).toHaveCount(0)

    // Already credited, so it isn't offered as a suggestion either.
    await expect(
      editor.getByRole('button', { name: creatorName, exact: true }),
    ).toHaveCount(0)

    await search.fill('')
    await editor.getByRole('button', { name: `Remove ${creatorName}` }).click()
    await expect(editor).toContainText('Nobody credited yet')
    await expect(page.locator('.submission-meta')).not.toContainText(
      `by ${creatorName}`,
    )
  })

  test('nobody but the submitter is offered the editor', async ({ page }) => {
    const owner = await signIn(page, 'Journey Owner')
    const submissionId = await seedSubmission(
      owner.profileId,
      'Someone else’s submission',
    )

    // A different member, then a signed-out visitor: neither gets a way in.
    await signOut(page)
    await signIn(page, 'Journey Passerby')
    await page.goto(`/submission/${submissionId}`)
    await expect(page.getByRole('heading', { name: /^Discussion/ })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Who made this' })).toHaveCount(0)

    await signOut(page)
    await page.goto(`/submission/${submissionId}`)
    await expect(page.getByRole('heading', { name: /^Discussion/ })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Who made this' })).toHaveCount(0)
  })
})
