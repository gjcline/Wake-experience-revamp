// RECAP: REPORT ENGINE
// The ending and the take-home report. One page a prospect will actually look at: a
// verdict, six head-to-head measures with bars, the week problem by problem, both
// briefings, and the one moment from their own morning that made the difference.

import { fmtClock } from './config.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (v) => (v < 0 ? '-$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US');
const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];

export function buildRecap(world, state, { delivery, week, finale, trace }) {
  const W = state.wake, n = world.findings.length;
  const yours = delivery.yours, rowOf = (fid) => week.find((r) => r.id === fid);
  const S = finale;

  // The moment: the first priority the player did not fully land, told through its quietest
  // line, as it actually appeared that morning.
  const target = W.findings.find((f) => rowOf(f.id).you.handled !== 'aligned');
  let moment;
  if (!target) {
    moment = { title: 'You found all ' + (WORD[n] || n) + '.', lines: ['That is rare. Your instincts were right on every one.', 'It took you until ' + fmtClock(state.submittedAt) + '. Wake had the same ' + (WORD[n] || n) + ' at 7:48 AM, ranked, with owners attached.'], excerpt: null };
  } else {
    const q = world.quiet[target.id], s = world.signals[q], st = state.signals[q];
    const t = trace ? trace(q) : null;
    const home = world.sources[s.sources.find((x) => world.sources[x].kind !== 'location') || s.sources[0]];
    const value = [s.value, s.delta].filter((x) => x && !['request', 'assumption'].includes(x)).join(', ');
    const quote = '"' + s.label + (value ? ': ' + value : '') + '."';
    const sender = home.from ? world.characters[home.from].name : '';
    let opener;
    if (home.kind === 'email') opener = st.seen ? 'At ' + fmtClock(st.seenAt) + ' you read an email from ' + sender + '. It said ' + quote : 'An email from ' + sender + ' sat unopened in your inbox. It said ' + quote;
    else if (home.kind === 'message') opener = st.seen ? 'At ' + fmtClock(st.seenAt) + ' you read a text from ' + sender + '. It said ' + quote : 'A text from ' + sender + ' sat unread on your phone. It said ' + quote;
    else if (home.kind === 'calendar') opener = 'Your calendar had it: ' + quote;
    else opener = st.seen ? 'At ' + fmtClock(st.seenAt) + ' you had the ' + home.title + ' report open. One line read ' + quote : 'The ' + home.title + ' report had one line you never got to. ' + quote;
    const f = W.findings.find((x) => x.id === target.id);
    moment = {
      title: target.title, short: world.findingById[target.id].short, opener, seen: st.seen,
      lines: [opener, 'On its own, it looks like nothing.', 'Next to ' + world.context[target.id] + ', it was the whole story: ' + world.findingById[target.id].short + '.'],
      wake: 'Wake connected it at 7:48 AM, with ' + (f.evidence.length - 1) + ' other lines from ' + f.systems + ' systems.',
      excerpt: t, connected: f.evidence.filter((e) => e.key !== q).slice(0, 6).map((e) => ({ label: e.label, value: e.value, where: e.where })),
      stake: rowOf(target.id).wake.stake, place: f.place,
    };
  }

  const verdict = S.youAhead === 0 ? 'With Wake, ahead on all ' + WORD[S.rows.length] + ' measures.' : 'With Wake, ahead on ' + S.wakeAhead + ' of ' + S.rows.length + ' measures.';
  const closer = 'Wake read all ' + W.funnel.records.toLocaleString('en-US') + ' records across ' + W.systems + ' systems before you sat down. You only had to decide.';
  const meta = { company: world.shell.company, role: world.role.label, shell: world.shell.label, date: world.shell.mondayLong, size: world.shell.multi ? world.shell.size + ' ' + world.shell.vocab.units : 'One ' + world.shell.vocab.unit };

  // ---------------------------------------------------------------- the report
  const main = week.filter((r) => !r.extra);
  const pill = (dir) => dir === 'up' ? 'up' : dir === 'down' ? 'down' : 'flat';
  const ARROW = { up: '▲', flat: '■', down: '▼' };
  const maxVal = Math.max(1, ...main.map((r) => Math.max(Math.abs(r.you.money), Math.abs(r.wake.money))));
  const bar = (v, side) => '<span class="bar ' + side + (v < 0 ? ' neg' : '') + '" style="width:' + Math.max(2, Math.round(Math.abs(v) / maxVal * 100)) + '%"></span>';

  function fragment() {
    const rows = S.rows.map((r) => '<tr><th>' + esc(r.label) + '</th><td class="y' + (r.youWins ? ' win' : '') + '">' + esc(r.you) + '</td><td class="w' + (!r.youWins && !r.tie ? ' win' : '') + '">' + esc(r.wake) + '</td></tr>').join('');
    const weekRows = main.map((r) => '<tr><th>' + esc(r.label) + '</th>' +
      '<td class="y"><span class="pl ' + pill(r.you.dir) + '">' + ARROW[r.you.dir] + '</span>' + esc(r.you.text) + '<div class="bw">' + bar(r.you.money, 'y') + '<b>' + money(r.you.money) + '</b></div></td>' +
      '<td class="w"><span class="pl ' + pill(r.wake.dir) + '">' + ARROW[r.wake.dir] + '</span>' + esc(r.wake.text) + '<div class="bw">' + bar(r.wake.money, 'w') + '<b>' + money(r.wake.money) + '</b></div></td></tr>').join('');
    const yourList = yours.map((y) => '<li><span class="st s-' + y.status + '">' + esc(y.statusLabel) + '</span><b>' + esc(y.what.label) + '</b><span>"' + esc(y.text) + '"</span><em>' + (y.owner ? esc(y.owner.name) : 'No owner named') + '</em></li>').join('');
    const wakeList = delivery.wake.map((x) => '<li><span class="st s-handed">Handed off</span><b>' + esc(x.headline) + '</b><span>' + esc(x.text) + '</span><em>' + esc(x.owners.map((o) => o.name).join(' and ')) + ' · ' + esc(x.check) + '</em></li>').join('');
    const m = moment.excerpt ? '<blockquote>' + esc(moment.opener) + '</blockquote>' : '';
    return '<div class="wxr">' +
      '<header><p class="k">THE WAKE EXPERIENCE</p><h1>Same company. Same data. Same morning.</h1><p class="meta">' + esc(meta.company) + ' · ' + esc(meta.size) + ' · ' + esc(meta.role) + ' · ' + esc(meta.date) + '</p></header>' +
      '<section class="verdict"><div class="big"><span>On your own</span><b class="y">' + money(S.value.you) + '</b><small>captured this week</small></div><div class="vs">VS</div><div class="big"><span>With Wake</span><b class="w">' + money(S.value.wake) + '</b><small>captured this week</small></div></section>' +
      '<p class="vline">' + esc(verdict) + '</p>' +
      '<section><h2>Head to head</h2><table class="hh"><thead><tr><th></th><th class="y">On your own</th><th class="w">With Wake</th></tr></thead><tbody>' + rows + '</tbody></table></section>' +
      '<section><h2>The week, problem by problem</h2><table class="wk"><thead><tr><th></th><th class="y">Your plan</th><th class="w">Wake\'s plan</th></tr></thead><tbody>' + weekRows + '</tbody></table>' +
        '<p class="note">Dollar figures are Wake\'s estimates from this company\'s own numbers: value captured this week, compared with doing nothing.</p></section>' +
      '<section class="two"><div><h2>Your briefing</h2><ol>' + yourList + '</ol><p class="note">' + delivery.minutes.yours + ' minutes in the meeting.</p></div><div><h2>Wake\'s briefing</h2><ol>' + wakeList + '</ol><p class="note">' + delivery.minutes.wake + ' minutes in the meeting.</p></div></section>' +
      '<section class="moment"><h2>The moment that mattered</h2><h3>' + esc(moment.title) + '</h3>' + m + '<p>' + esc(moment.lines.slice(moment.excerpt ? 1 : 0).join(' ')) + '</p>' + (moment.wake ? '<p class="wl">' + esc(moment.wake) + '</p>' : '') + '</section>' +
      '<footer><p>' + esc(closer) + '</p><p class="brand">wakepe.com</p></footer></div>';
  }
  const CSS = '.wxr{--ink:#14121F;--dim:#5F5B70;--line:#E6E4EE;--y:#E0A800;--yb:#FFF4CC;--w:#0E9E9A;--wb:#DDF7F6;--neg:#C62828;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:#fff;max-width:920px;margin:0 auto;padding:36px 32px}' +
    '.wxr header{border-bottom:3px solid var(--ink);padding-bottom:16px}.wxr .k{font-weight:700;font-size:11px;line-height:1;letter-spacing:.18em;color:var(--w);margin:0 0 10px}.wxr h1{font-size:28px;line-height:1.15;margin:0}.wxr .meta{color:var(--dim);margin:8px 0 0}' +
    '.wxr .verdict{display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center;margin:24px 0 8px}.wxr .big{padding:18px;border-radius:4px;background:#F7F6FA;text-align:center}.wxr .big span{display:block;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}.wxr .big b{display:block;font-size:34px;line-height:1.2;margin:6px 0 2px}.wxr .big b.y{color:var(--y)}.wxr .big b.w{color:var(--w)}.wxr .big small{color:var(--dim)}.wxr .vs{font-weight:800;color:var(--dim)}' +
    '.wxr h1,.wxr h2,.wxr h3{font-family:inherit!important;color:var(--ink)!important;text-shadow:none!important;letter-spacing:normal}.wxr h1,.wxr h3{text-transform:none!important}.wxr h1{font-size:28px!important;font-weight:800!important;line-height:1.15!important}.wxr h2{font-size:13px!important;font-weight:800!important;letter-spacing:.1em!important;text-transform:uppercase}.wxr h3{font-size:19px!important;font-weight:800!important}' +
    '.wxr .vline{text-align:center;font-weight:700;font-size:18px;margin:10px 0 6px}.wxr section{margin-top:28px}.wxr h2{font-size:13px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 10px}.wxr h3{font-size:19px;margin:0 0 8px}' +
    '.wxr table{width:100%;border-collapse:collapse}.wxr th,.wxr td{text-align:left;vertical-align:top;padding:9px 10px;border-bottom:1px solid var(--line)}.wxr thead th{font-size:11px;letter-spacing:.06em;text-transform:uppercase;border-bottom:2px solid var(--ink)}.wxr thead th.y{color:var(--y)}.wxr thead th.w{color:var(--w)}' +
    '.wxr .hh td{font-weight:700;font-size:16px}.wxr .hh td.win.w{background:var(--wb)}.wxr .hh td.win.y{background:var(--yb)}.wxr .wk th{width:22%;font-weight:700}.wxr .wk td{width:39%}' +
    '.wxr .pl{display:inline-block;width:20px;font-size:12px}.wxr .pl.up{color:var(--w)}.wxr .pl.down{color:var(--neg)}.wxr .pl.flat{color:var(--dim)}' +
    '.wxr .bw{display:flex;align-items:center;gap:8px;margin-top:6px}.wxr .bar{display:inline-block;height:8px;border-radius:2px}.wxr .bar.y{background:var(--y)}.wxr .bar.w{background:var(--w)}.wxr .bar.neg{background:var(--neg)}.wxr .bw b{font-size:13px;white-space:nowrap}' +
    '.wxr .two{display:grid;grid-template-columns:1fr 1fr;gap:24px}.wxr ol{margin:0;padding-left:18px}.wxr li{margin:0 0 12px}.wxr li b,.wxr li span,.wxr li em{display:block}.wxr li span{color:var(--ink)}.wxr li em{color:var(--dim);font-style:normal;font-size:13px}' +
    '.wxr .st{display:inline-block!important;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 6px;border-radius:3px;margin-bottom:4px;background:#EEE}.wxr .s-handed{background:var(--wb);color:#0B6966}.wxr .s-questions{background:var(--yb);color:#6B5000}.wxr .s-pushback{background:#FDE3E3;color:var(--neg)}' +
    '.wxr .note{color:var(--dim);font-size:13px}.wxr .moment{padding:18px 20px;background:#F7F6FA;border-left:4px solid var(--y)}.wxr blockquote{margin:0 0 10px;padding:10px 14px;background:#fff;border-left:3px solid var(--dim)}.wxr .wl{color:var(--w);font-weight:700}' +
    '.wxr footer{margin-top:32px;padding-top:16px;border-top:3px solid var(--ink);display:flex;justify-content:space-between;gap:16px;align-items:baseline}.wxr .brand{font-weight:800;letter-spacing:.06em}' +
    '@media (max-width:640px){.wxr{padding:20px 14px}.wxr .verdict,.wxr .two{grid-template-columns:1fr}.wxr .vs{text-align:center}.wxr .wk th{width:auto}.wxr .wk tr{display:grid}.wxr .wk td{width:auto}}';
  const toHTML = () => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>The Wake Experience: ' + esc(meta.company) + '</title><style>body{margin:0;background:#fff}' + CSS + '</style></head><body>' + fragment() + '</body></html>';
  const toText = () => ['THE WAKE EXPERIENCE', meta.company + ' · ' + meta.size + ' · ' + meta.role + ' · ' + meta.date, '', verdict,
    'Value captured this week: on your own ' + money(S.value.you) + ', with Wake ' + money(S.value.wake) + '.', '',
    'HEAD TO HEAD'].concat(S.rows.map((r) => r.label + ': you ' + r.you + ', with Wake ' + r.wake + '.'), ['', 'THE WEEK'],
    main.map((r) => r.label + '. You: ' + r.you.text + ' (' + money(r.you.money) + ') Wake: ' + r.wake.text + ' (' + money(r.wake.money) + ')'),
    ['', 'THE MOMENT THAT MATTERED', moment.title].concat(moment.lines, moment.wake ? [moment.wake] : [], ['', closer, 'wakepe.com'])).join('\n');

  return { finale: S, verdict, moment, closer, meta, report: { meta, css: CSS, fragment, toText, toHTML } };
}
