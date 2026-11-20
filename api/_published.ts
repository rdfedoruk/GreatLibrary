// Works out when a link's content was published, and when it was last updated
// if the source says so separately. Both are plain dates ("2024-10-26"), or
// null when the source doesn't say. Never guesses: a missing date stays missing.
//
// Where the date comes from, best first:
//   - GitHub projects: GitHub's own record (created = published, last push = updated).
//   - LinkedIn posts: the post number in the link has its time built in.
//   - Everything else: the date the page itself declares for search engines
//     (YouTube, ServiceNow Community, blogs, podcast pages).

export interface PublishedDates {
  published: string | null;
  updated: string | null;
}

const NONE: PublishedDates = { published: null, updated: null };
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

/** "2024-10-26" from anything a page might write, or null if it isn't a real date. */
export function toDay(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.trim();
  // Already a date with no time: keep it as written, so no timezone shifts it a day.
  const bare = text.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (bare) return bare[1];
  const time = Date.parse(text);
  if (Number.isNaN(time)) return null;
  // A time with its own offset ("…T06:31:51-07:00") keeps the day it was written in.
  const dated = text.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (dated) return dated[1];
  const d = new Date(time);
  // Words like "April 9, 2022" parse as local midnight; read the day back the same way.
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** LinkedIn post numbers carry the moment they were made in their leading bits. */
export function linkedinDay(text: string): string | null {
  const m = text.match(/(?:activity|ugcPost|share)[-:](\d{19})/);
  if (!m) return null;
  const ms = Number(BigInt(m[1]) >> 22n);
  return new Date(ms).toISOString().slice(0, 10);
}

const PUBLISHED: RegExp[] = [
  /<meta[^>]+(?:property|name)=["'](?:article:published_time|og:published_time)["'][^>]*content=["']([^"']+)/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:article:published_time|og:published_time)["']/i,
  /"datePublished"\s*:\s*"([^"]+)"/,
  /"uploadDate"\s*:\s*"([^"]+)"/,
  /itemprop=["'](?:datePublished|uploadDate)["'][^>]*content=["']([^"']+)/i,
  // Transistor podcast pages: published_at":"April 9, 2022" (inside escaped JSON).
  /published_at(?:&quot;|")\s*:\s*(?:&quot;|")([^&"]+)/,
  /<time[^>]*datetime=["']([^"']+)/i,
];

const UPDATED: RegExp[] = [
  /<meta[^>]+(?:property|name)=["'](?:article:modified_time|og:updated_time)["'][^>]*content=["']([^"']+)/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:article:modified_time|og:updated_time)["']/i,
  /"dateModified"\s*:\s*"([^"]+)"/,
];

function firstDay(html: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const day = toDay(html.match(p)?.[1]);
    if (day) return day;
  }
  return null;
}

/** An updated date only counts if it is after the published day. */
function laterOnly(published: string | null, updated: string | null): PublishedDates {
  return { published, updated: updated && (!published || updated > published) ? updated : null };
}

/** Dates from a page's own text. */
export function datesFromPage(finalUrl: string, html: string): PublishedDates {
  const published = linkedinDay(finalUrl) ?? firstDay(html, PUBLISHED) ?? linkedinDay(html.slice(0, 200_000));
  return laterOnly(published, firstDay(html, UPDATED));
}

/** owner/repo for a github.com project link, or null. */
export function githubRepo(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.replace(/^www\./, '') !== 'github.com') return null;
    const [owner, repo] = u.pathname.split('/').filter(Boolean);
    return owner && repo ? `${owner}/${repo.replace(/\.git$/, '')}` : null;
  } catch {
    return null;
  }
}

async function fromGithub(repo: string): Promise<PublishedDates> {
  const r = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: { 'user-agent': 'link-dates', accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) return NONE;
  const data = (await r.json()) as { created_at?: string; pushed_at?: string };
  return laterOnly(toDay(data.created_at), toDay(data.pushed_at));
}

/** Never throws: a link whose date can't be found just has none. */
export async function findDates(url: string): Promise<PublishedDates> {
  try {
    const repo = githubRepo(url);
    if (repo) return await fromGithub(repo);

    const fromLink = linkedinDay(url);
    if (fromLink) return { published: fromLink, updated: null };

    const r = await fetch(url, {
      headers: { 'user-agent': UA, 'accept-language': 'en' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return NONE;
    if (!(r.headers.get('content-type') ?? '').includes('html')) return NONE;
    return datesFromPage(r.url, await r.text());
  } catch {
    return NONE;
  }
}
