// POST /api/report: email the player their report when they reach the final score. It goes only
// to the email saved with that run at sign-up (never one sent with this request), once per run,
// and at most a few times a day per address. The email is a fixed template: the only things
// taken from the request are the scorecard's labels and figures, cleaned so they can't carry a
// link. Sending needs RESEND_API_KEY (resend.com); without it this answers { ok: false } and the
// experience carries on. Optional: REPORT_FROM, REPORT_REPLY_TO, REPORT_BCC (comma separated).
import { createHash } from 'node:crypto';
import { save, load, json, ID } from './_store.js';

const SITE = 'https://experience.wakepe.com';
const BOOK = process.env.WAKE_BOOK_URL || 'https://cal.com/bliztic/wake';
const PER_DAY = 3;

// letters, digits and plain punctuation only, and nothing shaped like a web address
const clean = (v, n = 60) => {
  const s = String(v == null ? '' : v).slice(0, n).replace(/[^\w\s$%.,:+\-·'’()]/g, '').trim();
  return /[a-z]\.[a-z]|www|http/i.test(s) ? '' : s;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (v) => (Number.isFinite(v) ? (v < 0 ? '-$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US') : '');

export async function POST(request) {
  const key = process.env.RESEND_API_KEY;
  const text = await request.text();
  if (text.length > 8000) return json({ ok: false }, 413);
  let b;
  try { b = JSON.parse(text); } catch (e) { return json({ ok: false }, 400); }
  if (!b || !ID.test(String(b.id || ''))) return json({ ok: false }, 400);
  if (!key) return json({ ok: false, reason: 'email-off' });

  const run = await load('runs/' + b.id + '.json');
  const to = run && typeof run.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(run.email) ? run.email.trim().slice(0, 120) : null;
  if (!to) return json({ ok: false, reason: 'no-email' });
  if (await load('reports/' + b.id + '.json')) return json({ ok: true, to, already: true });
  const day = new Date().toISOString().slice(0, 10);
  const tally = 'reports/by-email/' + createHash('sha256').update(to.toLowerCase()).digest('hex').slice(0, 32) + '-' + day + '.json';
  const sent = (await load(tally)) || { n: 0 };
  if (sent.n >= PER_DAY) return json({ ok: false, reason: 'limit' });

  const r = b.result && typeof b.result === 'object' ? b.result : {};
  const rows = (Array.isArray(r.rows) ? r.rows : []).slice(0, 12).map((x) => ({ label: clean(x && x.label), you: clean(x && x.you, 24), wake: clean(x && x.wake, 24), ahead: clean(x && x.ahead, 32) })).filter((x) => x.label);
  const first = clean((run.name || '').split(/\s+/)[0], 40);
  const company = clean(run.company, 80) || 'your company';
  const book = new URL(BOOK);
  book.searchParams.set('metadata[runId]', b.id);
  if (run.name) book.searchParams.set('name', String(run.name).slice(0, 80));
  book.searchParams.set('email', to);

  const subject = 'Your Wake Experience report: ' + company;
  const lead = 'Here\'s how your Monday at ' + company + ' played out, on your own and with Wake.';
  const head = Number.isFinite(r.profitYou) && Number.isFinite(r.profitWake)
    ? 'Operating profit this week: ' + money(r.profitYou) + ' on your own, ' + money(r.profitWake) + ' with Wake.' : '';
  const solved = Number.isFinite(r.resolvedYou) && Number.isFinite(r.resolvedWake) && Number.isFinite(r.problems)
    ? 'Problems resolved by Friday: ' + r.resolvedYou + ' of ' + r.problems + ' on your own, ' + r.resolvedWake + ' of ' + r.problems + ' with Wake.' : '';
  const td = 'padding:9px 10px;border-bottom:1px solid #E5E7EB;font:14px/1.4 Arial,sans-serif;';
  const html = '<!doctype html><html><body style="margin:0;background:#F4F4F5;padding:24px 12px">' +
    '<div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;padding:28px">' +
    '<p style="margin:0 0 4px;font:600 12px/1 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6B7280">The Wake Experience</p>' +
    '<h1 style="margin:0 0 16px;font:700 24px/1.25 Arial,sans-serif;color:#111">' + esc(first ? 'Your report, ' + first : 'Your report') + '</h1>' +
    '<p style="margin:0 0 12px;font:15px/1.55 Arial,sans-serif;color:#374151">' + esc(lead) + '</p>' +
    (head ? '<p style="margin:0 0 6px;font:15px/1.55 Arial,sans-serif;color:#111"><b>' + esc(head) + '</b></p>' : '') +
    (solved ? '<p style="margin:0 0 18px;font:15px/1.55 Arial,sans-serif;color:#111">' + esc(solved) + '</p>' : '') +
    (rows.length ? '<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin:0 0 22px">' +
      '<tr><th style="' + td + 'text-align:left;color:#6B7280;font-weight:600"></th><th style="' + td + 'text-align:left;color:#B45309">On your own</th><th style="' + td + 'text-align:left;color:#0E7490">With Wake</th><th style="' + td + 'text-align:left;color:#6B7280">Ahead by</th></tr>' +
      rows.map((x) => '<tr><td style="' + td + 'color:#374151">' + esc(x.label) + '</td><td style="' + td + '">' + esc(x.you) + '</td><td style="' + td + '">' + esc(x.wake) + '</td><td style="' + td + 'font-weight:700">' + esc(x.ahead || 'Even') + '</td></tr>').join('') + '</table>' : '') +
    '<p style="margin:0 0 18px;font:15px/1.55 Arial,sans-serif;color:#374151">That was a simulated company. We\'d like to show you the same thing on your own numbers.</p>' +
    '<p style="margin:0 0 26px"><a href="' + esc(book.toString()) + '" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font:700 15px/1 Arial,sans-serif;padding:14px 22px">Book a walkthrough</a></p>' +
    '<p style="margin:0;font:13px/1.5 Arial,sans-serif;color:#6B7280">Want to see another 10:00 AM? <a href="' + SITE + '" style="color:#0E7490">Play again</a>.</p>' +
    '</div></body></html>';
  const txt = ['The Wake Experience', '', (first ? 'Your report, ' + first : 'Your report'), '', lead, head, solved, '',
    ...rows.map((x) => x.label + ': ' + x.you + ' on your own / ' + x.wake + ' with Wake' + (x.ahead ? ' (' + x.ahead + ')' : '')), '',
    'That was a simulated company. We\'d like to show you the same thing on your own numbers.', 'Book a walkthrough: ' + book.toString(), '', 'Play again: ' + SITE].filter((l, i, a) => l || a[i - 1]).join('\n');

  const list = (v) => String(v || '').split(',').map((x) => x.trim()).filter((x) => /^[^\s@]+@[^\s@]+$/.test(x));
  const msg = { from: process.env.REPORT_FROM || 'Wake <experience@wakepe.com>', to: [to], subject, html, text: txt };
  if (list(process.env.REPORT_BCC).length) msg.bcc = list(process.env.REPORT_BCC);
  if (list(process.env.REPORT_REPLY_TO).length) msg.reply_to = list(process.env.REPORT_REPLY_TO);
  let res;
  try {
    res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' }, body: JSON.stringify(msg) });
  } catch (e) { return json({ ok: false, reason: 'send' }, 502); }
  if (!res.ok) return json({ ok: false, reason: 'send', status: res.status }, 502);
  try {
    await save('reports/' + b.id + '.json', { id: b.id, to, sentAt: new Date().toISOString() });
    await save(tally, { n: sent.n + 1 });
  } catch (e) { /* sent anyway */ }
  return json({ ok: true, to });
}
