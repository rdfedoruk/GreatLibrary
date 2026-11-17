// The one server-side piece of the site. Submitting a link comes here, because
// working out a title and thumbnail means visiting other websites and drawing
// an image — neither of which a visitor's browser can do.
//
//   POST /api/thumbnail   { url, description? }   (signed in)
//     → works out the title and thumbnail, stores the image, creates the
//       entry, and answers { id }.
//   GET  /api/thumbnail
//     → a health check: draws one card and reports its size. Fetches nothing.
//
// Everything is done *as the signed-in person*, with their own sign-in token,
// so the database's permission rules apply exactly as they do in the browser.
// This file holds no secret keys.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { RUBRIC, thumbnail } from './_thumbnail/rubric.js';
import { renderCard } from './_thumbnail/card.js';

const BUCKET = 'thumbnails';
const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

/** An error whose message is safe to show to the person, with the status to send. */
class UserError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  // The host parses JSON bodies for us; the local site hands over the raw stream.
  const parsed = (req as IncomingMessage & { body?: unknown }).body;
  if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new UserError(400, 'That request could not be read');
  }
}

/** Addresses that point back inside a network rather than out at the web. */
const PRIVATE_HOST =
  /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[.*\])/i;

function normalizeUrl(input: unknown): string {
  if (typeof input !== 'string' || !input.trim()) throw new UserError(400, 'Enter a link');
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new UserError(400, 'That does not look like a link');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UserError(400, 'Only http and https links are supported');
  }
  if (PRIVATE_HOST.test(url.hostname)) throw new UserError(400, 'That link cannot be reached from here');
  return url.href;
}

async function submit(req: IncomingMessage) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) throw new Error('The server is missing its Supabase settings');

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!token) throw new UserError(401, 'Sign in to submit a link');

  // A client that carries the person's own token: every read and write below
  // is theirs, and subject to the same rules as in their browser.
  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) throw new UserError(401, 'Sign in to submit a link');

  const body = await readBody(req);
  const url = normalizeUrl(body.url);
  const description = typeof body.description === 'string' ? body.description.trim() : '';

  const existing = await supabase.from('submissions').select('id').eq('url', url).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) throw new UserError(409, 'That link is already in the library.');

  const result = await thumbnail(url);

  const path = `${randomUUID()}.${result.ext}`;
  const upload = await supabase.storage.from(BUCKET).upload(path, result.image, {
    contentType: MIME[result.ext] ?? 'application/octet-stream',
    cacheControl: '31536000',
  });
  if (upload.error) throw new Error(`Could not store the thumbnail: ${upload.error.message}`);

  const inserted = await supabase
    .from('submissions')
    .insert({
      url,
      title: result.title,
      description,
      source_site: 'manual',
      submitted_by: auth.user.id,
      thumbnail_path: path,
      thumbnail_strategy: result.strategy,
      thumbnail_rubric: RUBRIC,
      thumbnail_notes: result.notes,
    })
    .select('id')
    .single();

  if (inserted.error) {
    // Don't leave an image behind that no entry points at.
    await supabase.storage.from(BUCKET).remove([path]);
    if (inserted.error.code === '23505') throw new UserError(409, 'That link is already in the library.');
    throw new Error(inserted.error.message);
  }
  return { id: inserted.data.id as string };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (req.method === 'GET') {
      const card = await renderCard('Health check', 'greatlibrary');
      return send(res, 200, { ok: true, rubric: RUBRIC, cardBytes: card.length });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    send(res, 200, await submit(req));
  } catch (err) {
    if (err instanceof UserError) return send(res, err.status, { error: err.message });
    console.error(err);
    send(res, 500, { error: 'Something went wrong working out the thumbnail. Try again.' });
  }
}
