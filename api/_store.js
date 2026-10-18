// Shared storage for the tracking endpoints: one private JSON blob per run (runs/<id>.json) and
// one per booking (bookings/<id>.json). Files starting with _ are not routes.
import { put, get, list } from '@vercel/blob';

export const ID = /^[a-z0-9-]{8,64}$/i;

export async function save(path, data) {
  await put(path, JSON.stringify(data), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: 60 });
}

export async function load(path) {
  try {
    const r = await get(path, { access: 'private', useCache: false });
    if (!r || !r.stream) return null;
    return JSON.parse(await new Response(r.stream).text());
  } catch (e) { return null; }
}

// Every blob under a prefix, newest first, up to `max`.
export async function all(prefix, max = 1000) {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && blobs.length < 5000);
  blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  const out = [];
  for (let i = 0; i < Math.min(max, blobs.length); i += 25) {
    const chunk = await Promise.all(blobs.slice(i, Math.min(i + 25, max)).map((b) => load(b.pathname)));
    out.push(...chunk.filter(Boolean));
  }
  return out;
}

export const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
