import { supabase } from '../../lib/supabase'

export type TagStatus = 'suggested' | 'approved'

export interface Tag {
  id: string
  name: string
  status: TagStatus
  type: string
}

/** A tag plus how many entries carry it — what the tags page lists. */
export interface TagWithUses extends Tag {
  uses: number
}

/**
 * Tag types. 'general' tags share the unlabelled line on an entry; every
 * other type gets its own labelled line ("Version: …") when the entry has a
 * tag of that type. A new type is one more row here, plus the same word in
 * the database's list of allowed types.
 */
export const TAG_TYPES = [
  { id: 'general', label: 'Tag' },
  { id: 'version', label: 'Version' },
  { id: 'medium', label: 'Medium' },
] as const

export const tagTypeLabel = (type: string): string =>
  TAG_TYPES.find((t) => t.id === type)?.label ?? type

const MAX_NAME = 40

/** Collapses runs of spaces and trims. Throws a message fit to show. */
export function cleanTagName(input: string): string {
  const name = input.replace(/\s+/g, ' ').trim()
  if (!name) throw new Error('Enter a tag name')
  if (name.length > MAX_NAME) {
    throw new Error(`Tag names are limited to ${MAX_NAME} characters`)
  }
  return name
}

/** Letters and digits only, so "Java Script" and "java-script" both find "Javascript". */
export const squash = (s: string): string =>
  s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

/**
 * The name a tag goes by in a URL — `Flow Designer` becomes `flow-designer`.
 * Derived rather than stored, so renaming a tag changes its address.
 */
export function tagSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type TagRow = {
  id: string
  name: string
  status: string
  type: string
  submission_tags: { count: number }[]
}

export async function fetchTags(): Promise<TagWithUses[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('id, name, status, type, submission_tags ( count )')
    .order('name')
  if (error) throw new Error(error.message)
  return (data as TagRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status as TagStatus,
    type: row.type,
    uses: row.submission_tags[0]?.count ?? 0,
  }))
}

async function tagByName(name: string): Promise<Tag | null> {
  const { data, error } = await supabase
    .from('tags')
    .select('id, name, status, type')
    // ilike with the wildcards escaped is a case-insensitive exact match.
    .ilike('name', name.replace(/[\\%_]/g, '\\$&'))
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as Tag | null
}

/**
 * Puts a tag on an entry by name. A name nobody has used yet becomes a new
 * suggested tag of the given type; an existing one is reused whatever its
 * capitals.
 */
export async function tagSubmission(
  submissionId: string,
  rawName: string,
  type = 'general',
): Promise<Tag> {
  const name = cleanTagName(rawName)
  let tag = await tagByName(name)
  if (!tag) {
    const { data, error } = await supabase
      .from('tags')
      .insert({ name, type, status: 'suggested' })
      .select('id, name, status, type')
      .single()
    // 23505: someone suggested the same name a moment ago — use theirs.
    if (error && error.code !== '23505') throw new Error(error.message)
    tag = (data as Tag | null) ?? (await tagByName(name))
    if (!tag) throw new Error('Could not create that tag')
  }
  const { error } = await supabase
    .from('submission_tags')
    .insert({ submission_id: submissionId, tag_id: tag.id })
  // Already carrying it is not a failure.
  if (error && error.code !== '23505') throw new Error(error.message)
  return tag
}

/** Takes a tag off an entry. A suggestion nothing else carries disappears with it. */
export async function untagSubmission(
  submissionId: string,
  tagId: string,
): Promise<void> {
  const { error } = await supabase
    .from('submission_tags')
    .delete()
    .eq('submission_id', submissionId)
    .eq('tag_id', tagId)
  if (error) throw new Error(error.message)
}

/**
 * Tags page: make a tag that is approved from the start. If the name is
 * already a suggestion, that suggestion is approved instead.
 */
export async function createApprovedTag(
  rawName: string,
  type: string,
): Promise<void> {
  const name = cleanTagName(rawName)
  const existing = await tagByName(name)
  if (existing?.status === 'approved') {
    throw new Error(`"${existing.name}" already exists`)
  }
  const { error } = existing
    ? await supabase
        .from('tags')
        .update({ status: 'approved', type })
        .eq('id', existing.id)
    : await supabase.from('tags').insert({ name, type, status: 'approved' })
  if (error) throw new Error(error.message)
}

export async function setTagStatus(id: string, status: TagStatus): Promise<void> {
  const { error } = await supabase.from('tags').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function setTagType(id: string, type: string): Promise<void> {
  const { error } = await supabase.from('tags').update({ type }).eq('id', id)
  if (error) throw new Error(error.message)
}

/** Thrown by renameTag when the new name already belongs to another tag. */
export class TagNameTaken extends Error {
  other: Tag
  constructor(other: Tag) {
    super(`"${other.name}" already exists`)
    this.other = other
  }
}

export async function renameTag(id: string, rawName: string): Promise<void> {
  const name = cleanTagName(rawName)
  const other = await tagByName(name)
  if (other && other.id !== id) throw new TagNameTaken(other)
  const { error } = await supabase.from('tags').update({ name }).eq('id', id)
  if (error) throw new Error(error.message)
}

/** Everything carrying `fromId` carries `intoId` instead, and `fromId` is gone. */
export async function mergeTag(fromId: string, intoId: string): Promise<void> {
  const { error } = await supabase.rpc('merge_tag', {
    p_from: fromId,
    p_into: intoId,
  })
  if (error) throw new Error(error.message)
}

/** Removes a tag everywhere — also how a suggestion is rejected. */
export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
