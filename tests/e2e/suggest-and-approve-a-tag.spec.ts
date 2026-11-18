import { expect, test, type Page } from '@playwright/test'
import { admin, cleanUp, seedProfile, seedSubmission, signIn, signOut } from './helpers'

// Suggest-and-approve tagging end to end: a tag typed on an entry starts out
// suggested, the entry sits in Curation Bounties until one of its tags is
// approved, and the tags page is where that happens.
test.describe('suggesting and approving a tag', () => {
  const stamp = crypto.randomUUID().slice(0, 8)
  const entry = `An entry to tag ${stamp}`
  const tagName = `Journey Tag ${stamp}`

  test.afterAll(async () => {
    await cleanUp()
    await admin.from('tags').delete().eq('name', tagName)
  })

  function cardFor(page: Page) {
    return page.locator('.submission-card').filter({ hasText: entry })
  }

  test('a suggested tag keeps its entry in bounties until it is approved', async ({
    page,
  }) => {
    const member = await signIn(page, 'Journey Tagger')
    await seedSubmission(member.profileId, entry)

    // Suggest a tag nobody has used before, from the entry on the feed.
    await page.goto('/')
    await cardFor(page).getByRole('button', { name: `Suggest tags for ${entry}` }).click()
    await page.getByLabel(`Add a tag to ${entry}`).fill(tagName)
    await page.getByRole('option', { name: /Suggest new tag/ }).click()

    const chip = cardFor(page).locator('.tag.suggested', { hasText: tagName })
    await expect(chip).toBeVisible()

    // Clicked straight away, the brand-new tag still narrows the feed rather
    // than being called unknown.
    await chip.getByRole('link', { name: tagName }).click()
    await expect(
      page.getByRole('button', { name: `Remove tag ${tagName} from the search` }),
    ).toBeVisible()
    await expect(cardFor(page)).toBeVisible()

    // Only suggested so far, so the entry is still a bounty.
    await page.getByRole('link', { name: 'Curation Bounties' }).click()
    await expect(cardFor(page)).toBeVisible()

    // Approve it on the tags page.
    await page.getByRole('tab', { name: 'Tags' }).click()
    const row = page.locator('.tag-row').filter({ hasText: tagName })
    await row.getByRole('button', { name: 'Approve' }).click()
    await expect(row.getByRole('button', { name: 'Unapprove' })).toBeVisible()

    // It now carries an approved tag, so it has left the bounties…
    await page.getByRole('link', { name: 'Curation Bounties' }).click()
    await expect(page.getByRole('tab', { name: /Untagged/ })).toBeVisible()
    await expect(page.getByText('Loading the library…')).toHaveCount(0)
    await expect(cardFor(page)).toHaveCount(0)

    // …and on the feed the chip is a solid, approved one that filters.
    await page.getByRole('link', { name: 'Feed' }).click()
    await expect(cardFor(page).locator('.tag.approved', { hasText: tagName })).toBeVisible()
    await cardFor(page).getByRole('link', { name: tagName }).click()
    await expect(
      page.getByRole('button', { name: `Remove tag ${tagName} from the search` }),
    ).toBeVisible()
    await expect(cardFor(page)).toBeVisible()
  })

  test('taking a suggested tag off its only entry removes the tag', async ({ page }) => {
    const typo = `Journey Typo ${stamp}`
    const member = await signIn(page, 'Journey Untagger')
    const other = `An entry with a typo ${stamp}`
    await seedSubmission(member.profileId, other)
    const card = page.locator('.submission-card').filter({ hasText: other })

    await page.goto('/')
    await card.getByRole('button', { name: `Suggest tags for ${other}` }).click()
    await page.getByLabel(`Add a tag to ${other}`).fill(typo)
    await page.getByRole('option', { name: /Suggest new tag/ }).click()
    await expect(card.locator('.tag', { hasText: typo })).toBeVisible()

    await card.getByRole('button', { name: `Remove tag ${typo}` }).click()
    await expect(card.locator('.tag', { hasText: typo })).toHaveCount(0)

    await page.goto('/bounties#tags')
    await expect(page.getByRole('heading', { name: /^Approved/ })).toBeVisible()
    await expect(page.locator('.tag-row').filter({ hasText: typo })).toHaveCount(0)
  })

  test('signed out, an entry offers no way to tag it and the tags page asks you to sign in', async ({
    page,
  }) => {
    await signOut(page)
    const submitter = await seedProfile(`Journey Bystander ${stamp}`)
    const plain = `An entry nobody can tag ${stamp}`
    await seedSubmission(submitter, plain)

    await page.goto('/')
    const card = page.locator('.submission-card').filter({ hasText: plain })
    await expect(card).toBeVisible()
    await expect(card.getByRole('button', { name: /Suggest tags/ })).toHaveCount(0)

    await page.goto('/tags')
    await expect(page.getByText('Sign in to manage tags.')).toBeVisible()
  })
})
