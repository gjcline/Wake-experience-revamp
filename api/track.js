// POST /api/track: the experience reports a run's progress (where they got to, time spent,
// mode, and who they are: name, email, phone, whether they already have a meeting). Each report overwrites that run's record.
import { save, json, ID } from './_store.js';

const STR = (v, n = 200) => (typeof v === 'string' ? v.slice(0, n) : null);
const NUM = (v) => (Number.isFinite(v) ? v : null);

export async function POST(request) {
  const text = await request.text();
  if (text.length > 20000) return json({ ok: false }, 413);
  let b;
  try { b = JSON.parse(text); } catch (e) { return json({ ok: false }, 400); }
  if (!b || !ID.test(String(b.id || ''))) return json({ ok: false }, 400);
  const run = {
    id: b.id, visitor: ID.test(String(b.visitor || '')) ? b.visitor : null,
    startedAt: STR(b.startedAt, 40), lastAt: new Date().toISOString(),
    activeSeconds: NUM(b.activeSeconds), step: NUM(b.step), stepName: STR(b.stepName, 40), steps: Array.isArray(b.steps) ? b.steps.slice(0, 40).map((s) => ({ name: STR(s.name, 40), at: NUM(s.at) })) : [],
    mode: STR(b.mode, 10), moment: STR(b.moment, 10), shell: STR(b.shell, 20), role: STR(b.role, 20), company: STR(b.company, 80),
    finished: !!b.finished, name: STR(b.name, 80), email: STR(b.email, 120), phone: STR(b.phone, 40),
    hasMeeting: typeof b.hasMeeting === 'boolean' ? b.hasMeeting : null, bookClicked: !!b.bookClicked,
    utm: b.utm && typeof b.utm === 'object' ? Object.fromEntries(Object.entries(b.utm).slice(0, 6).map(([k, v]) => [STR(k, 20), STR(v, 100)])) : null,
    referrer: STR(b.referrer, 120), device: STR(b.device, 10), country: request.headers.get('x-vercel-ip-country') || null,
    result: b.result && typeof b.result === 'object' && JSON.stringify(b.result).length < 4000 ? b.result : null,
  };
  try { await save('runs/' + run.id + '.json', run); } catch (e) { return json({ ok: false }, 500); }
  return json({ ok: true });
}
