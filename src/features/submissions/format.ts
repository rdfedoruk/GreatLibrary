/** The site a link points at, without "www.". */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/** "2 days ago", "last month", "just now". */
export function ago(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000
  for (const [unit, size] of STEPS) {
    if (seconds >= size) return relative.format(-Math.floor(seconds / size), unit)
  }
  return 'just now'
}

/** "Nov 17, 2026", for a hover title next to ago(). */
export const fullDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
