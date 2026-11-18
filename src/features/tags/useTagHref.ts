import { useLocation } from 'react-router-dom'
import { tagSlug } from './api'

/**
 * Where clicking a tag goes. On the feed it adds the tag to whatever is
 * already being searched for; anywhere else it opens the feed with just that
 * tag.
 */
export function useTagHref(): (name: string) => string {
  const { pathname, search } = useLocation()
  return (name) => {
    const slug = tagSlug(name)
    const params = new URLSearchParams(pathname === '/' ? search : '')
    if (!params.getAll('tag').includes(slug)) params.append('tag', slug)
    return `/?${params.toString()}`
  }
}
