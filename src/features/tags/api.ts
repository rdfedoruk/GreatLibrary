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
  if (error) throw error
  return data
}
