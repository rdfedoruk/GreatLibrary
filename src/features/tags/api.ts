import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type TagDimension = Database['public']['Enums']['tag_dimension']

export interface Tag {
  id: string
  dimension: TagDimension
  name: string
}

// The controlled vocabulary. New tags are an admin add via the dashboard —
// there is deliberately no free-text tag input anywhere (docs/data-model.md).
export async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('id, dimension, name')
    .order('name')
  if (error) throw new Error(error.message)
  return data
}

/**
 * The name a tag goes by in a URL — `ITBM/SPM` becomes `itbm-spm`.
 *
 * Derived rather than stored, so adding a tag stays a one-row insert. The
 * accepted cost is that renaming a tag breaks links shared under its old
 * name; two tags deriving the same name is the signal to store one instead.
 * See docs/work/stories/filter-the-list-by-tag.md.
 */
export function tagSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
