// POST /api/cal: Cal.com booking webhook. The experience's Book a call link carries the run id as
// metadata[runId], so a booking lands next to the run that led to it. When CAL_WEBHOOK_SECRET is
// set, the x-cal-signature-256 header must match.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { save, json, ID } from './_store.js';

export async function POST(request) {
  const raw = await request.text();
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (secret) {
    const sig = request.headers.get('x-cal-signature-256') || '';
    const want = createHmac('sha256', secret).update(raw).digest('hex');
    if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return json({ ok: false }, 401);
  }
  let b;
  try { b = JSON.parse(raw); } catch (e) { return json({ ok: false }, 400); }
  // Cal.com's "Ping test" is not a booking: say OK and keep nothing
  if (/PING/i.test(String(b.triggerEvent || ''))) return json({ ok: true });
  const p = b.payload || {};
  const runId = p.metadata && ID.test(String(p.metadata.runId || '')) ? p.metadata.runId : null;
  const att = (p.attendees || [])[0] || {};
  const uid = String(p.uid || p.bookingId || Date.now()).replace(/[^a-z0-9-]/gi, '').slice(0, 64);
  const booking = { uid, runId, event: b.triggerEvent || null, email: att.email || null, name: att.name || null, title: p.title || null, startTime: p.startTime || null, receivedAt: new Date().toISOString() };
  try { await save('bookings/' + uid + '.json', booking); } catch (e) { return json({ ok: false }, 500); }
  return json({ ok: true });
}
