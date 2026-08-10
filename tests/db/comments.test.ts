import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, createTestUser, deleteTestUsers, seedSubmission, type TestUser } from './helpers'

// Rules under test, from the initial migration:
//   comments are publicly readable; authenticated users can comment as
//   themselves; body must survive check (length(trim(body)) > 0).

describe('comments', () => {
  let author: TestUser
  let submissionId: string

  beforeAll(async () => {
    author = await createTestUser('Commenter')
    submissionId = await seedSubmission(author.profileId)
  })

  afterAll(deleteTestUsers)

  it('lets a signed-in member comment as themselves', async () => {
    const { error } = await author.client
      .from('comments')
      .insert({
        submission_id: submissionId,
        user_id: author.profileId,
        body: 'This cleared up the many-to-many confusion.',
      })
    expect(error).toBeNull()
  })

  it('defaults an unspecified type to comment', async () => {
    const { data, error } = await author.client
      .from('comments')
      .select('comment_type')
      .eq('submission_id', submissionId)
      .single()

    expect(error).toBeNull()
    expect(data?.comment_type).toBe('comment')
  })

  it('accepts all three comment types', async () => {
    const other = await seedSubmission(author.profileId)
    for (const type of ['comment', 'suggestion', 'critique'] as const) {
      const { error } = await author.client
        .from('comments')
        .insert({
          submission_id: other,
          user_id: author.profileId,
          body: `A ${type}.`,
          comment_type: type,
        })
      expect(error).toBeNull()
    }
  })

  it('refuses a type outside the enum', async () => {
    const other = await seedSubmission(author.profileId)
    const { error } = await author.client
      .from('comments')
      .insert({
        submission_id: other,
        user_id: author.profileId,
        body: 'Mislabelled.',
        // Deliberately not a comment_type — the enum is the gate.
        comment_type: 'rant' as never,
      })

    expect(error).not.toBeNull()
  })

  it('refuses an empty body', async () => {
    const { error } = await author.client
      .from('comments')
      .insert({ submission_id: submissionId, user_id: author.profileId, body: '' })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23514') // check constraint violation
  })

  it('refuses a whitespace-only body', async () => {
    const { error } = await author.client
      .from('comments')
      .insert({
        submission_id: submissionId,
        user_id: author.profileId,
        body: '   \n\t  ',
      })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23514')
  })

  it('refuses a comment posted in someone else‘s name', async () => {
    const impostor = await createTestUser('Impostor')

    const { error } = await impostor.client
      .from('comments')
      .insert({
        submission_id: submissionId,
        user_id: author.profileId,
        body: 'Not actually mine.',
      })

    expect(error).not.toBeNull()
  })

  it('refuses a comment from a signed-out visitor', async () => {
    const { error } = await anonClient()
      .from('comments')
      .insert({
        submission_id: submissionId,
        user_id: author.profileId,
        body: 'Drive-by.',
      })

    expect(error).not.toBeNull()
  })

  it('lets anyone read comments', async () => {
    const { data, error } = await anonClient()
      .from('comments')
      .select('body, comment_type')
      .eq('submission_id', submissionId)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('lets an author edit their own comment, and stamps it as edited', async () => {
    const target = await seedSubmission(author.profileId)
    const { data: created } = await author.client
      .from('comments')
      .insert({
        submission_id: target,
        user_id: author.profileId,
        body: 'First thought.',
      })
      .select('id, edited_at')
      .single()

    expect(created?.edited_at).toBeNull()

    const { data: edited, error } = await author.client
      .from('comments')
      .update({ body: 'Second thought.', comment_type: 'suggestion' })
      .eq('id', created!.id)
      .select('body, comment_type, edited_at')
      .single()

    expect(error).toBeNull()
    expect(edited?.body).toBe('Second thought.')
    expect(edited?.comment_type).toBe('suggestion')
    // Stamped by the trigger, not by the client.
    expect(edited?.edited_at).not.toBeNull()
  })

  it('refuses an edit that blanks the body', async () => {
    const target = await seedSubmission(author.profileId)
    const { data: created } = await author.client
      .from('comments')
      .insert({ submission_id: target, user_id: author.profileId, body: 'Real.' })
      .select('id')
      .single()

    const { error } = await author.client
      .from('comments')
      .update({ body: '  \n\t ' })
      .eq('id', created!.id)

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23514')
  })

  it('ignores an attempt to move a comment onto another submission', async () => {
    const target = await seedSubmission(author.profileId)
    const elsewhere = await seedSubmission(author.profileId)
    const { data: created } = await author.client
      .from('comments')
      .insert({ submission_id: target, user_id: author.profileId, body: 'Stay put.' })
      .select('id')
      .single()

    // The trigger pins submission_id, so this silently keeps its original home
    // rather than being relocated by an "edit".
    const { data: edited } = await author.client
      .from('comments')
      .update({ body: 'Still here.', submission_id: elsewhere })
      .eq('id', created!.id)
      .select('submission_id')
      .single()

    expect(edited?.submission_id).toBe(target)
  })

  it('refuses an edit to someone else‘s comment', async () => {
    const impostor = await createTestUser('Edit Impostor')
    const { data: existing } = await author.client
      .from('comments')
      .select('id')
      .eq('submission_id', submissionId)
      .single()

    const { data } = await impostor.client
      .from('comments')
      .update({ body: 'Hijacked.' })
      .eq('id', existing!.id)
      .select()

    // RLS refuses by matching no rows rather than raising an error.
    expect(data).toHaveLength(0)
  })

  it('refuses a delete of someone else‘s comment', async () => {
    const impostor = await createTestUser('Delete Impostor')
    const { data: existing } = await author.client
      .from('comments')
      .select('id')
      .eq('submission_id', submissionId)
      .single()

    const { data } = await impostor.client
      .from('comments')
      .delete()
      .eq('id', existing!.id)
      .select()

    expect(data).toHaveLength(0)
  })

  it('lets an author delete their own comment', async () => {
    const target = await seedSubmission(author.profileId)
    const { data: created } = await author.client
      .from('comments')
      .insert({ submission_id: target, user_id: author.profileId, body: 'Regretted.' })
      .select('id')
      .single()

    const { data, error } = await author.client
      .from('comments')
      .delete()
      .eq('id', created!.id)
      .select()

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })
})
