// The thumbnail rubric. Bump RUBRIC whenever the rules in this file (or card.ts) change.
//
// Copied from ../Thumbnailer/src (rubric r6). The rubric is tuned there; to
// pick up a newer one, copy rubric.ts and card.ts over again and re-apply the
// three differences: the import below ends in .js, youtube() names its unused
// first argument _url (this project refuses unused names), and card.ts reads its fonts
// from ./fonts.
import { imageSize } from 'image-size';
import { renderCard } from './card.js';

// r1: YouTube native; LinkedIn og:image unless it is LinkedIn's logo; otherwise generated card.
// r2: platform is decided by the final URL after redirects (lnkd.in short links);
//     social posts take their title from the post text (JSON-LD), not the hashtag-y og:title.
// r3: every site (not just LinkedIn) uses its own og:image when it has one; the card is the fallback.
// r4: square or portrait share images are not cropped: they become a cover card (cover left, title right).
//     Podcast episodes are detected; their show name is dropped from the title and used as the card label.
// r5: an og:image that is identical to the homepage's is the site default, not this page's picture.
//     It is rejected, and the page's own image is used instead (article's declared image, then body pictures).
//     Those are also tried whenever there is no usable og:image, before falling back to the card.
// r6: a link to a PDF takes its title from the PDF itself: the document's Title field when it has a real one
//     (not "Microsoft Word - x.docx" and the like), otherwise the file name. It always gets the generated card,
//     so the card text and the title are the same.
export const RUBRIC = 'r6';

export type Thumbnail = {
  title: string;
  strategy: 'youtube-native' | 'linkedin-og-image' | 'generated' | string;
  image: Buffer;
  ext: string;
  notes: string;
};

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

export async function thumbnail(rawUrl: string): Promise<Thumbnail> {
  let url = new URL(rawUrl);

  const videoId = youtubeId(url);
  if (videoId) {
    const yt = await youtube(url, videoId);
    if (yt) return yt;
  }

  const notes: string[] = [];
  if (videoId) notes.push('youtube: no native thumbnail found');

  const page = await fetchPage(url.href);
  if (!page.ok) notes.push(`page fetch: ${page.problem}`);
  if (page.ok && page.pdf) {
    const finalUrl = new URL(page.finalUrl);
    const found = pdfTitle(page.pdf, finalUrl);
    const pdfHost = finalUrl.hostname.replace(/^www\./, '');
    const title = found.title ?? pdfHost;
    notes.push(...found.rejected);
    notes.push(found.title ? `pdf: title from ${found.from}` : 'pdf: no usable Title field or file name, used the domain');
    return { title, strategy: 'generated', image: await renderCard(title, pdfHost), ext: 'png', notes: notes.join('; ') };
  }
  const meta = page.ok ? parseMeta(page.html) : {};
  const post = page.ok ? parseSocialPost(page.html) : {};

  // Short links (lnkd.in) only reveal their platform after redirects.
  if (page.ok && page.finalUrl !== url.href) {
    if (new URL(page.finalUrl).hostname !== url.hostname) notes.push(`redirected from ${url.hostname}`);
    url = new URL(page.finalUrl);
  }
  const host = url.hostname.replace(/^www\./, '');
  const isLinkedIn = host === 'linkedin.com' || host.endsWith('.linkedin.com');

  const podcast = page.ok ? detectPodcast(page.html, meta, host) : null;
  if (podcast) notes.push(`podcast: ${podcast.reason}${podcast.show ? `; show: ${podcast.show}` : ''}`);
  const pageTitle = (raw: string) => {
    const t = stripByline(raw, isLinkedIn);
    return podcast?.show && t.toLowerCase().endsWith(`| ${podcast.show.toLowerCase()}`)
      ? t.slice(0, t.lastIndexOf('|')).trim()
      : t;
  };
  const label = podcast?.show ?? host;

  const author = post.author ?? (isLinkedIn ? linkedInAuthor(url) : null);
  const candidates = [
    ['post text', firstLine(post.text ?? '')],
    ['post headline', post.headline ?? ''],
    ['og:title', pageTitle(meta['og:title'] ?? '')],
    ['<title>', pageTitle(meta.title ?? '')],
  ];
  const found = candidates.map(([from, raw]) => [from, cleanTitle(raw)]).find(([, t]) => t && !isOnlyHashtags(t));
  const title = found?.[1] ?? (isLinkedIn && author ? `LinkedIn post by ${author}` : host);
  notes.push(found ? `title: from ${found[0]}` : 'title: none found, used fallback');

  // The page's own share image, when it has a usable one.
  const absolute = (src: string) => {
    try {
      return new URL(src, url).href;
    } catch {
      return null;
    }
  };
  const rawImage = meta['og:image'] ?? meta['twitter:image'] ?? post.image;
  const shareImage = rawImage ? absolute(rawImage) : null;
  const declaredWidth = Number(meta['og:image:width']);

  // Candidate images, best first. Each is [strategy, url].
  const images: [string, string][] = [];
  if (!shareImage) {
    notes.push('no og:image');
  } else if (isLinkedIn && isLinkedInGenericAsset(shareImage)) {
    notes.push(`og:image rejected: LinkedIn static asset (logo) — ${shareImage}`);
  } else if (declaredWidth > 0 && declaredWidth < 400) {
    notes.push(`og:image rejected: only ${declaredWidth}px wide`);
  } else if (!isLinkedIn && (await isSiteWideImage(shareImage, url))) {
    notes.push('og:image rejected: same image as the site homepage, not specific to this page');
  } else {
    images.push([isLinkedIn ? 'linkedin-og-image' : 'og-image', shareImage]);
  }
  // Images that belong to this page itself: the article's declared image, then pictures in its body.
  if (page.ok && !isLinkedIn) {
    const declared = articleImage(page.html);
    if (declared) images.push(['article-image', declared]);
    for (const src of contentImages(page.html)) images.push(['page-image', src]);
  }

  const tried = new Set<string>();
  for (const [strategy, src] of images) {
    const href = absolute(src);
    if (!href || tried.has(href)) continue;
    tried.add(href);
    const img = await fetchImage(href);
    if (!img) {
      notes.push(`${strategy} failed to download`);
      continue;
    }
    const size = measure(img.image);
    if (strategy !== 'og-image' && strategy !== 'linkedin-og-image' && (!size || size.width < 400)) {
      notes.push(`${strategy} skipped: too small`);
      continue;
    }
    if (isLinkedIn) notes.push('logo-check: url-only, passed');
    if (size && size.width / size.height < 1.2 && img.ext === 'webp') {
      // The card renderer cannot draw WebP, so the cover would come out blank.
      notes.push(`cover-card skipped: ${size.width}×${size.height} image is WebP, used as is`);
    } else if (size && size.width / size.height < 1.2) {
      // Square or portrait: a 16:9 crop would cut it, so place it whole on a card.
      notes.push(`cover-card: ${strategy} is ${size.width}×${size.height}`);
      return {
        title,
        strategy: 'cover-card',
        image: await renderCard(title, label, { ...img, ...size }),
        ext: 'png',
        notes: notes.join('; '),
      };
    }
    return { title, strategy, ...img, notes: notes.join('; ') };
  }
  notes.push('fallback: no usable image');

  return {
    title,
    strategy: 'generated',
    image: await renderCard(title, label),
    ext: 'png',
    notes: notes.join('; '),
  };
}

// ---------- Page images ----------

/** True when the page's share image is just the site's default: the homepage declares the same one. */
async function isSiteWideImage(shareImage: string, pageUrl: URL): Promise<boolean> {
  if (pageUrl.pathname === '/' || pageUrl.pathname === '') return false;
  const home = await fetchPage(pageUrl.origin + '/');
  if (!home.ok) return false;
  const homeMeta = parseMeta(home.html);
  const homeImage = homeMeta['og:image'] ?? homeMeta['twitter:image'];
  if (!homeImage) return false;
  try {
    return new URL(homeImage, pageUrl.origin).href === shareImage;
  } catch {
    return false;
  }
}

/** The image an article declares for itself in schema.org JSON-LD. */
function articleImage(html: string): string | null {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(m[1]);
      for (const item of [j, ...(Array.isArray(j?.['@graph']) ? j['@graph'] : [])].flat()) {
        if (!/Article|BlogPosting|Recipe|Product|Episode|VideoObject/.test(String(item?.['@type']))) continue;
        const image = [item.image, item.thumbnailUrl].flat().find(Boolean);
        const src = typeof image === 'string' ? image : image?.url;
        if (typeof src === 'string' && src) return src;
      }
    } catch {}
  }
  return null;
}

/** The first few pictures inside the page's main content, skipping logos, icons and avatars. */
function contentImages(html: string): string[] {
  const start = html.search(/<article\b/i) >= 0 ? html.search(/<article\b/i) : html.search(/<main\b/i);
  if (start < 0) return [];
  const end = html.search(/<\/article>|<\/main>/i);
  const body = html.slice(start, end > start ? end : undefined);
  const out: string[] = [];
  for (const tag of body.match(/<img\b[^>]*>/gi) ?? []) {
    const attr = (name: string) =>
      tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'))?.slice(1).find((v) => v !== undefined);
    const src = attr('src') ?? attr('data-src');
    if (!src || src.startsWith('data:') || /\.svg(\?|$)/i.test(src)) continue;
    if (/logo|avatar|gravatar|icon|sprite|emoji/i.test(tag)) continue;
    const width = Number(attr('width'));
    if (width > 0 && width < 400) continue;
    out.push(decodeEntities(src));
    if (out.length === 3) break;
  }
  return out;
}

// ---------- PDFs ----------

const JUNK_PDF_TITLE =
  /^(microsoft (word|powerpoint|excel)\s*-|untitled|document\s*\d*$|slide\s*\d+$|powerpoint presentation$|presentation\s*\d*$)|\.(docx?|pptx?|xlsx?|pdf|indd|rtf|odt|tex|dvi|qxd)$/i;
const GENERIC_PDF_NAME = /^(download|document|file|view|get|index|attachment|export|print|output|scan)\s*\d*$/i;

/** A PDF's title: its Title field (document info, then XMP metadata), otherwise the file name in the URL. */
function pdfTitle(pdf: Buffer, url: URL): { title?: string; from?: string; rejected: string[] } {
  const raw = pdf.toString('latin1');
  const rejected: string[] = [];
  const fields: [string, string | null][] = [
    ['the PDF Title field', pdfInfoTitle(raw)],
    ['the PDF Title field (XMP)', pdfXmpTitle(raw)],
  ];
  for (const [from, value] of fields) {
    const title = cleanTitle(value ?? '');
    if (!title) continue;
    if (JUNK_PDF_TITLE.test(title) || !/\p{L}{3}/u.test(title)) {
      rejected.push(`pdf: Title field rejected as junk — "${title}"`);
      continue;
    }
    return { title, from, rejected };
  }

  let name = url.pathname.split('/').filter(Boolean).pop() ?? '';
  try {
    name = decodeURIComponent(name);
  } catch {}
  name = name.replace(/\.pdf$/i, '').replace(/_+/g, ' ');
  if (!/\s/.test(name.trim())) name = name.replace(/[-+]+/g, ' '); // a-file-name-like-this
  const title = cleanTitle(name);
  if (!title || GENERIC_PDF_NAME.test(title) || !/\p{L}{3}/u.test(title)) return { rejected };
  return { title, from: 'the file name (the PDF has no usable Title field)', rejected };
}

/** /Title in the document information dictionary (not the /Title entries of bookmarks). */
function pdfInfoTitle(raw: string): string | null {
  if (/\/Encrypt\b/.test(raw)) return null; // the strings are encrypted
  const ref = [...raw.matchAll(/\/Info\s+(\d+)\s+(\d+)\s+R/g)].pop();
  if (!ref) return null;
  const start = [...raw.matchAll(new RegExp(`(?<!\\d)${ref[1]}\\s+${ref[2]}\\s+obj\\b`, 'g'))].pop()?.index;
  if (start === undefined) return null;
  const end = raw.indexOf('endobj', start);
  const info = raw.slice(start, end > start ? end : start + 4000);

  let bytes: Buffer | null = null;
  const literal = info.match(/\/Title\s*\(((?:\\[\s\S]|[^\\()])*)\)/);
  const hex = info.match(/\/Title\s*<([0-9A-Fa-f\s]*)>/);
  if (literal) {
    const escapes: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' };
    const text = literal[1].replace(/\\(\r\n|[0-7]{1,3}|[\s\S])/g, (_, e: string) =>
      /^[0-7]/.test(e) ? String.fromCharCode(parseInt(e, 8) & 0xff) : /^[\r\n]/.test(e) ? '' : (escapes[e] ?? e),
    );
    bytes = Buffer.from(text, 'latin1');
  } else if (hex) {
    const digits = hex[1].replace(/\s/g, '');
    bytes = Buffer.from(digits.length % 2 ? digits + '0' : digits, 'hex');
  }
  if (!bytes) return null;
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return bytes.subarray(3).toString('utf8');
  return bytes.toString('latin1');
}

/** dc:title in the PDF's XMP metadata packet. */
function pdfXmpTitle(raw: string): string | null {
  const block = raw.match(/<dc:title>([\s\S]*?)<\/dc:title>/)?.[1];
  const text = block?.match(/<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/)?.[1];
  return text ? decodeEntities(Buffer.from(text, 'latin1').toString('utf8')) : null;
}

// ---------- Podcasts ----------

const PODCAST_HOSTS =
  /(^|\.)(transistor\.fm|buzzsprout\.com|podbean\.com|simplecast\.com|captivate\.fm|libsyn\.com|spreaker\.com|podcasts\.apple\.com|pca\.st|overcast\.fm)$/;

function detectPodcast(html: string, meta: Record<string, string>, host: string): { reason: string; show?: string } | null {
  const reason = (meta['twitter:player:stream:content_type'] ?? '').startsWith('audio/')
    ? 'audio player metadata'
    : /"@type"\s*:\s*"PodcastEpisode"/.test(html)
      ? 'PodcastEpisode structured data'
      : PODCAST_HOSTS.test(host) || (host === 'open.spotify.com' && (meta['og:url'] ?? '').includes('/episode/'))
        ? `known podcast host ${host}`
        : null;
  if (!reason) return null;
  // The show's RSS feed link carries the show name.
  const feed = (html.match(/<link\b[^>]*>/gi) ?? []).find((tag) => tag.includes('application/rss+xml'));
  const show = feed?.match(/\btitle\s*=\s*(?:"([^"]*)"|'([^']*)')/i)?.slice(1).find((v) => v !== undefined);
  return { reason, show: show ? decodeEntities(show).trim() || undefined : undefined };
}

function measure(image: Buffer): { width: number; height: number } | null {
  try {
    const { width, height, orientation } = imageSize(image);
    if (!width || !height) return null;
    return orientation && orientation >= 5 ? { width: height, height: width } : { width, height };
  } catch {
    return null;
  }
}

// ---------- YouTube ----------

function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null;
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') return null;
  if (url.pathname === '/watch') return url.searchParams.get('v');
  return url.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]+)/)?.[1] ?? null;
}

async function youtube(_url: URL, id: string): Promise<Thumbnail | null> {
  for (const size of ['maxresdefault', 'sddefault', 'hqdefault']) {
    const img = await fetchImage(`https://i.ytimg.com/vi/${id}/${size}.jpg`);
    if (!img) continue;
    let title = '';
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
        { signal: AbortSignal.timeout(10_000) },
      );
      if (res.ok) title = ((await res.json()) as { title?: string }).title ?? '';
    } catch {}
    return {
      title: cleanTitle(title) || `YouTube video ${id}`,
      strategy: 'youtube-native',
      ...img,
      notes: `${size}.jpg${title ? '' : '; title: oEmbed failed, used fallback'}`,
    };
  }
  return null;
}

// ---------- LinkedIn ----------

/** Real post media lives on media.licdn.com / dms.licdn.com; static.licdn.com serves LinkedIn's own artwork. */
function isLinkedInGenericAsset(imageUrl: string): boolean {
  try {
    const u = new URL(imageUrl);
    return u.hostname === 'static.licdn.com' || u.pathname.includes('/aero-v1/sc/h/');
  } catch {
    return true;
  }
}

function linkedInAuthor(url: URL): string | null {
  const slug =
    url.pathname.match(/^\/posts\/([^_/]+)_/)?.[1] ?? url.pathname.match(/^\/(?:in|company)\/([^/]+)/)?.[1];
  if (!slug) return null;
  const words = decodeURIComponent(slug)
    .split('-')
    .filter((w, i, all) => !(i === all.length - 1 && all.length > 1 && /\d/.test(w))); // drop trailing profile id
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || null;
}

// ---------- Titles ----------

export function cleanTitle(raw: string): string {
  let t = decodeEntities(raw)
    .replace(/\p{Extended_Pictographic}|️|‍/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Platform noise.
  t = t
    .replace(/^.{1,80}? on LinkedIn:\s*/i, '')
    .replace(/\s*\|\s*LinkedIn\s*$/i, '')
    .replace(/\s*\|\s*[\d,]+\+? comments?\s*$/i, '')
    .replace(/\s*\|\s*LinkedIn\s*$/i, '')
    .replace(/\s+-\s+YouTube\s*$/i, '')
    .trim();

  if (t.length <= 90) return t;

  const sentenceEnd = t.slice(0, 91).search(/[.!?](?=\s)/);
  if (sentenceEnd >= 20) return t.slice(0, sentenceEnd + 1);

  const cut = t.slice(0, 90);
  return cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : 90).replace(/[\s,;:–-]+$/, '') + '…';
}

const firstLine = (text: string) => text.split(/\r?\n/).find((line) => line.trim()) ?? '';

const isOnlyHashtags = (t: string) => t.split(/\s+/).every((word) => word.startsWith('#'));

/** Once the other noise is gone, LinkedIn titles still end in "| Author Name". */
function stripByline(raw: string, isLinkedIn: boolean): string {
  if (!isLinkedIn) return raw;
  return raw
    .replace(/\s*\|\s*LinkedIn\s*$/i, '')
    .replace(/\s*\|\s*[\d,]+\+? comments?\s*$/i, '')
    .replace(/\s*\|[^|]*$/, '');
}

/** Post text from schema.org JSON-LD (LinkedIn publishes a SocialMediaPosting block). */
function parseSocialPost(html: string): { text?: string; headline?: string; author?: string; image?: string } {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(m[1]);
      if (j?.['@type'] !== 'SocialMediaPosting') continue;
      const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined);
      return { text: str(j.articleBody), headline: str(j.headline), author: str(j.author?.name), image: str(j.image?.url) };
    } catch {}
  }
  return {};
}

function decodeEntities(s: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] !== '#') return named[code.toLowerCase()] ?? m;
    const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
  });
}

// ---------- Fetching ----------

type Page = { ok: true; html: string; finalUrl: string; pdf?: Buffer } | { ok: false; problem: string };

async function fetchPage(url: string): Promise<Page> {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,*/*', 'accept-language': 'en' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ok: false, problem: `HTTP ${res.status}` };
    if (/\/(authwall|login|uas\/login|checkpoint)\b/.test(new URL(res.url).pathname)) {
      return { ok: false, problem: `redirected to login wall (${new URL(res.url).pathname})` };
    }
    const type = res.headers.get('content-type') ?? '';
    if (type.includes('application/pdf') || (!type.includes('html') && /\.pdf$/i.test(new URL(res.url).pathname))) {
      const body = Buffer.from(await res.arrayBuffer());
      if (body.subarray(0, 1024).includes('%PDF-')) return { ok: true, html: '', finalUrl: res.url, pdf: body };
      return { ok: true, html: body.toString('utf8'), finalUrl: res.url };
    }
    return { ok: true, html: await res.text(), finalUrl: res.url };
  } catch (err) {
    return { ok: false, problem: (err as Error).message };
  }
}

function parseMeta(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attr = (name: string) =>
      tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'))?.slice(1).find((v) => v !== undefined);
    const key = (attr('property') ?? attr('name'))?.toLowerCase();
    const content = attr('content');
    if (key && content && !(key in out)) out[key] = decodeEntities(content);
  }
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  if (title) out.title = title;
  return out;
}

async function fetchImage(url: string): Promise<{ image: Buffer; ext: string } | null> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(15_000) });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.startsWith('image/')) return null;
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[
      type.split(';')[0].trim()
    ];
    if (!ext) return null;
    return { image: Buffer.from(await res.arrayBuffer()), ext };
  } catch {
    return null;
  }
}
