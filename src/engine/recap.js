// RECAP: REPORT ENGINE
// The ending and the take-home report. A one-page after-action report in the game's dark
// palette, built the way an operating partner would want to read it: the result, the money
// and what supports it, the week day by day, the meeting, each problem, the moment from the
// player's own morning that made the difference, and what a quarter at this pace looks like.

import { fmtClock } from './config.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (v) => (v < 0 ? '-$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US');
const kmoney = (v) => { const a = Math.abs(v); const s = a >= 1e6 ? '$' + (a / 1e6).toFixed(2) + 'M' : a >= 1e4 ? '$' + Math.round(a / 1000) + 'k' : '$' + Math.round(a).toLocaleString('en-US'); return (v < 0 ? '-' : '') + s; };
const hrs = (x) => x + (x === 1 ? ' hr' : ' hrs');
const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const STATUS = { open: 'Open', waiting: 'Waiting', working: 'In progress', fixed: 'Resolved', worse: 'Worse' };
const DECISION = { decided: 'Decided', guess: 'Decided on a guess', agreed: 'Agreed, numbers to follow', parked: 'Parked', next: 'Parked to next week', dropped: 'Dropped', busy: 'Kept on the list' };

export function buildRecap(world, state, { score, trace }) {
  const W = state.wake, S = score, WK = S.week, n = WK.n;
  const Y = WK.meeting.you, K = WK.meeting.wake, A = WK.after;
  const fy = S.final.you, fw = S.final.wake;
  const rowOf = (fid) => WK.rows.find((r) => r.id === fid);

  // The moment: the first problem the player did not land, told through its quietest line,
  // as it actually appeared that morning.
  const target = W.findings.find((f) => { const r = rowOf(f.id); return r && r.you.mode !== 'aligned'; });
  let moment;
  if (!target) {
    moment = { title: 'You found all ' + (WORD[n] || n) + '.', lines: ['That is rare. Your read was right on every one.', 'It took until ' + fmtClock(state.submittedAt) + ', and the room still had questions you had to take away. Wake had the same ' + (WORD[n] || n) + ' at 7:48 AM, with the answers attached.'], excerpt: null };
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
      stake: world.model[target.id] ? world.model[target.id].weekly : 0, place: f.place,
    };
  }

  const total = S.rows.length;
  const verdict = S.youAhead === 0 && S.wakeAhead === total ? 'With Wake, ahead on all ' + (WORD[total] || total) + ' measures.'
    : S.wakeAhead >= S.youAhead ? 'With Wake, ahead on ' + S.wakeAhead + ' of ' + total + ' measures.' : 'On your own, ahead on ' + S.youAhead + ' of ' + total + ' measures.';
  const C = S.credit;
  const join = (xs) => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);
  const mine = [];
  if (C.found) mine.push('found ' + C.found + ' of ' + n + ' problems');
  if (C.decided) mine.push('got ' + C.decided + ' decided in the room');
  if (C.resolved) mine.push('resolved ' + C.resolved + ' by Friday');
  if (C.runRate > 0) mine.push('added ' + kmoney(C.runRate) + ' of yearly run-rate');
  const won = C.wins.length ? ' You also came out ahead on ' + join(C.wins.map((x) => x.toLowerCase())) + '.' : '';
  const solid = C.found * 2 >= n || C.resolved >= 1;
  const credit = (mine.length ? 'On your own you ' + join(mine) + '.' + won + (solid ? ' That is a real week, and it is where the business runs today.' : ' That is where the business runs today.')
    : 'On your own, the people on site still handled some of it themselves' + (C.runRate > 0 ? ', ' + kmoney(C.runRate) + ' of yearly run-rate' : '') + '. That is where the business runs today.')
    + ' With Wake, the same Monday resolved ' + S.final.wake.resolved + ' of ' + n + ' and added ' + kmoney(S.final.wake.runRate) + '.';
  const closer = 'Wake read all ' + W.funnel.records.toLocaleString('en-US') + ' records across ' + W.systems + ' systems before you sat down. The rest of the week followed from that.';
  const meta = { company: world.shell.company, role: world.role.label, shell: world.shell.label, date: world.shell.mondayLong, size: world.shell.multi ? world.shell.size + ' ' + world.shell.vocab.units : 'One ' + world.shell.vocab.unit, headcount: world.shell.headcount };

  // ---------------------------------------------------------------- pieces
  const pair = (label, yv, wv, yn, wn, lower) => {
    const top = Math.max(1, Math.abs(yn), Math.abs(wn));
    const yb = Math.max(2, Math.abs(yn) / top * 100), wb = Math.max(2, Math.abs(wn) / top * 100);
    const yWin = lower ? yn < wn : yn > wn, wWin = lower ? wn < yn : wn > yn;
    return '<div class="kpi"><p class="kl">' + esc(label) + '</p>' +
      '<div class="kv y' + (yWin ? ' win' : '') + '"><span>On your own</span><b>' + esc(yv) + '</b><i style="width:' + yb.toFixed(1) + '%"></i></div>' +
      '<div class="kv w' + (wWin ? ' win' : '') + '"><span>With Wake</span><b>' + esc(wv) + '</b><i style="width:' + wb.toFixed(1) + '%"></i></div></div>';
  };

  // two cumulative lines on one axis, labelled at the end
  function lineChart(ys, ws, xs, what, dots = true) {
    const last = xs.length - 1;
    const lo = Math.min(0, ...ys, ...ws), hi = Math.max(1, ...ys, ...ws);
    const step = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000].find((v) => (hi - lo) / v <= 5) || 2500000;
    const top = Math.ceil(hi / step) * step, bot = Math.floor(lo / step) * step;
    const X0 = 64, X1 = 560, Y0 = 18, Y1 = 196;
    const x = (i) => X0 + (X1 - X0) * i / last, y = (v) => Y1 - (v - bot) / (top - bot || 1) * (Y1 - Y0);
    let g = '';
    for (let v = bot; v <= top; v += step) g += '<line x1="' + X0 + '" x2="' + X1 + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" class="' + (v === 0 ? 'zero' : 'grid') + '"/><text x="' + (X0 - 10) + '" y="' + (y(v) + 4).toFixed(1) + '" class="ax" text-anchor="end">' + kmoney(v) + '</text>';
    xs.forEach((d, i) => { if (d) g += '<text x="' + x(i) + '" y="' + (Y1 + 20) + '" class="ax" text-anchor="middle">' + d + '</text>'; });
    const line = (vals, cls, label) => {
      let s2 = '<polyline points="' + vals.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ') + '" class="ln ' + cls + '"/>';
      vals.forEach((v, i) => { s2 += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="' + (dots || i === last ? 4.5 : 3) + '" class="pt ' + cls + '"><title>' + label + ', ' + (xs[i] || 'week ' + (i + 1)) + ': ' + money(v) + '</title></circle>'; });
      return s2;
    };
    const ly = y(ys[last]), lw = y(ws[last]);
    const gap = Math.abs(ly - lw) < 30 ? (30 - Math.abs(ly - lw)) / 2 : 0;
    const lyA = ly + (ly >= lw ? gap : -gap), lwA = lw + (lw > ly ? gap : -gap);
    g += line(ys, 'y', 'On your own') + line(ws, 'w', 'With Wake');
    g += '<text x="' + (X1 + 12) + '" y="' + (lwA - 2).toFixed(1) + '" class="lb w">With Wake</text><text x="' + (X1 + 12) + '" y="' + (lwA + 14).toFixed(1) + '" class="lv">' + money(ws[last]) + '</text>';
    g += '<text x="' + (X1 + 12) + '" y="' + (lyA - 2).toFixed(1) + '" class="lb y">On your own</text><text x="' + (X1 + 12) + '" y="' + (lyA + 14).toFixed(1) + '" class="lv">' + money(ys[last]) + '</text>';
    return '<svg viewBox="0 0 680 228" role="img" aria-label="' + esc(what) + '. On your own ' + money(ys[last]) + '. With Wake ' + money(ws[last]) + '.">' + g + '</svg>';
  }
  const chart = () => lineChart(WK.board.you.map((x) => x.profit), WK.board.wake.map((x) => x.profit), WK.days, 'Cumulative operating profit impact, Monday to Friday');
  const qchart = () => lineChart(S.quarter.you.cum, S.quarter.wake.cum, S.quarter.you.cum.map((_, i) => (i === 0 || (i + 1) % 4 === 1 || i === 12 ? 'WK ' + (i + 1) : '')), 'Cumulative operating profit impact over thirteen weeks', false);

  // the two meetings as timelines, segment per agenda item
  function timelines() {
    const max = Math.max(Y.minutes, K.minutes);
    const seg = (min, cls, label) => '<i class="sg ' + cls + '" style="width:' + (min / max * 100).toFixed(2) + '%" title="' + esc(label) + '"></i>';
    const yRest = Y.minutes - 3 - Y.items.reduce((s, x) => s + x.minutes, 0);
    const yb = seg(3, 'op', 'Opening') + Y.items.map((it) => seg(it.minutes, it.decision, it.n + '. ' + (DECISION[it.decision] || '') + ', ' + it.minutes + ' min')).join('') + seg(yRest, 'op', 'Wrap-up');
    const kb = seg(3, 'op', 'Opening') + K.items.map((it) => seg(it.minutes, 'decided', it.n + '. Decided, ' + it.minutes + ' min')).join('') + seg(1, 'op', 'Wrap-up');
    return '<div class="tl"><p class="tk y">On your own<b>' + Y.minutes + ' min</b></p><div class="tb">' + yb + '</div></div>' +
      '<div class="tl"><p class="tk w">With Wake<b>' + K.minutes + ' min</b></p><div class="tb">' + kb + '</div></div>' +
      '<div class="lg"><span class="decided"><i></i>Decided</span><span class="guess"><i></i>Decided on a guess</span><span class="agreed"><i></i>Agreed, numbers to follow</span><span class="parked"><i></i>Parked for follow-ups</span><span class="dropped"><i></i>Dropped</span></div>';
  }

  const PR = S.prep, dur = (m) => (m >= 60 ? Math.floor(m / 60) + ' hr ' + (m % 60) + ' min' : m + ' min');
  const ms2 = (label, yv, wv) => '<div><p><i>On your own</i><b>' + esc(yv) + '</b></p><p><i>With Wake</i><b class="w">' + esc(wv) + '</b></p><span>' + esc(label) + '</span></div>';
  function fragment() {
    const kpis = pair('Operating profit impact this week', money(fy.profit), money(fw.profit), fy.profit, fw.profit) +
      pair('Run-rate added, annualized', kmoney(fy.runRate), kmoney(fw.runRate), fy.runRate, fw.runRate) +
      pair('Problems resolved by Friday', fy.resolved + ' of ' + n, fw.resolved + ' of ' + n, fy.resolved, fw.resolved) +
      pair('Team hours on follow-up', hrs(fy.hours), hrs(fw.hours), fy.hours, fw.hours, true);
    const score = S.rows.map((r) => '<tr><th>' + esc(r.label) + '</th><td class="y' + (r.youWins ? ' win' : '') + '">' + esc(r.you) + '</td><td class="w' + (!r.youWins && !r.tie ? ' win' : '') + '">' + esc(r.wake) + '</td></tr>').join('');
    const probs = WK.rows.map((r) => {
      const cell = (L) => '<td><b>' + esc(L.to) + '</b><span class="st ' + L.status + '">' + STATUS[L.status] + '</span></td>';
      return '<tr><th>' + esc(r.label) + '<span>' + esc(r.metric.label) + '</span></th><td class="num">' + esc(r.you.from) + '</td>' + cell(r.you) + cell(r.wake) +
        '<td class="num"><span class="y">' + money(r.you.profit) + (r.you.credit ? ' + ' + kmoney(r.you.credit) + ' back' : '') + '</span><span class="w">' + money(r.wake.profit) + (r.wake.credit ? ' + ' + kmoney(r.wake.credit) + ' back' : '') + '</span></td></tr>';
    }).join('');
    const meet = '<div class="ms">' +
      ms2('prep before the meeting', dur(PR.you), dur(PR.wake)) +
      ms2('leadership hours in the room (' + Y.attendees + ' people)', Y.hours.toFixed(1) + ' hrs', K.hours.toFixed(1) + ' hrs') +
      ms2('decisions with an owner and a start date', Y.ownerDate + ' of ' + Y.items.length, K.ownerDate + ' of ' + K.items.length) +
      ms2('items carried to another meeting', String(Y.deferred), '0') + '</div>';
    const m = moment;
    const mom = m.excerpt
      ? '<div class="mo"><div class="saw"><p class="mk">What you saw</p><p class="src">' + esc(m.excerpt.source.title) + ' · ' + esc(m.excerpt.source.system) + '</p><p class="q">' + esc(m.opener) + '</p></div>' +
        '<div class="meant"><p class="mk">What it meant</p><h3>' + esc(m.title) + '</h3><p>' + esc(m.wake) + '</p><ul>' + m.connected.slice(0, 5).map((c) => '<li><span>' + esc(c.where) + '</span>' + esc(c.label + (c.value ? ': ' + c.value : '')) + '</li>').join('') + '</ul>' + (m.stake ? '<p class="stk">' + money(m.stake) + ' a week at stake</p>' : '') + '</div></div>'
      : '<div class="mo one"><div class="meant"><h3>' + esc(m.title) + '</h3>' + m.lines.map((l) => '<p>' + esc(l) + '</p>').join('') + '</div></div>';
    const Q = S.quarter;
    return '<article class="wxr">' +
      '<header class="mast"><div class="brand"><span class="mark" aria-hidden="true"></span>WAKE</div><div class="meta"><span>After-action report</span><span>' + esc(meta.company) + '</span><span>Week of ' + esc(meta.date) + '</span><span>' + esc(meta.role) + '</span></div></header>' +
      '<section class="hero"><h1>' + esc(verdict) + '</h1><p class="lead">One week at ' + esc(meta.company) + ' (' + esc(meta.size.toLowerCase()) + ', ' + meta.headcount + ' people), run twice from the same Monday morning. Once prepared on your own. Once prepared with Wake. Same data, same people, same five days.</p><p class="lead credit">' + esc(credit) + '</p>' +
      '<div class="kpis">' + kpis + '</div></section>' +
      '<section><h2>The week, day by day</h2><p class="sub">Cumulative operating profit impact against doing nothing, Monday afternoon to Friday.' + (fw.oneTime || fy.oneTime ? ' One-time recoveries come on top: ' + money(fw.oneTime) + ' with Wake' + (fy.oneTime ? ', ' + money(fy.oneTime) + ' on your own' : ', none on your own this week') + '.' : '') + '</p><figure class="chart">' + chart() + '</figure></section>' +
      '<section><h2>Scorecard</h2><table class="sc"><thead><tr><th></th><th class="y">On your own</th><th class="w">With Wake</th></tr></thead><tbody>' + score + '</tbody></table></section>' +
      '<section><h2>The meeting</h2><p class="sub">Same room, same people, same questions. Prep, time in the room, and whether each decision left with an owner and a start date.</p>' + timelines() + meet + '</section>' +
      '<section><h2>Problem by problem</h2><table class="pb"><thead><tr><th>Problem</th><th class="num">Monday</th><th>Friday, on your own</th><th>Friday, with Wake</th><th class="num">Operating profit</th></tr></thead><tbody>' + probs + '</tbody></table></section>' +
      '<section><h2>The moment that mattered</h2>' + mom + '</section>' +
      '<section class="qtr"><h2>Thirteen weeks like this one</h2><p class="sub">Projected from this week. Fixes in place keep paying, open problems get found the way they usually are, and new ones keep arriving. On your own, unwatched fixes slip back a little each week; with Wake, every fix has its number on watch and new problems are caught the week they show up.</p>' +
        '<figure class="chart">' + qchart() + '</figure>' +
        '<div class="qg"><div><b>' + kmoney(Q.wake.total) + '</b><span>operating profit with Wake over the quarter</span><em>On your own: ' + kmoney(Q.you.total) + '</em></div><div><b>' + kmoney(Q.wake.runRate) + '</b><span>yearly run-rate by week 13</span><em>On your own: ' + kmoney(Q.you.runRate) + '</em></div><div><b>' + Math.round(Q.hours).toLocaleString('en-US') + ' hrs</b><span>of team time back</span><em>On your own: ' + Math.round(Q.you.hours).toLocaleString('en-US') + ' hrs on follow-up</em></div></div>' +
        (Q.wake.recovered || Q.you.recovered ? '<p class="sub after">Plus one-time recoveries: ' + money(Q.wake.recovered) + ' with Wake, ' + money(Q.you.recovered) + ' on your own.</p>' : '') + '</section>' +
      '<footer><p>' + esc(closer) + '</p><p class="fine">Estimates use this company\'s own figures: payroll, revenue, invoices and average ticket. Profit impact is operating profit against doing nothing: cost avoided and protected revenue at its contribution margin. One-time recoveries are shown on their own. Run-rate is the yearly value of the fixes in place.</p><p class="sig">The Wake Experience · wakepe.com</p></footer>' +
      '</article>';
  }

  const css = `
.wxr{--bg:#0B0A16;--pn:#121027;--pn2:#18142F;--ln:#2C2650;--ink:#F4F1DE;--dim:#ABA7C8;--y:#FFD23F;--w:#39E5E0;--pk:#FF4F8B;--ok:#5BD66B;
  background:var(--bg);color:var(--ink);font:400 15px/1.55 'Chakra Petch','Segoe UI',system-ui,sans-serif;max-width:980px;margin:0 auto;padding:36px 40px 30px;box-shadow:inset 0 0 0 3px var(--ln);text-align:left;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.wxr *{box-sizing:border-box}
.wxr h1,.wxr h2,.wxr h3{font-family:'Pixelify Sans','Chakra Petch',sans-serif!important;color:var(--ink)!important;text-transform:none!important;letter-spacing:0!important;margin:0;text-shadow:none!important}
.wxr p{margin:0}
.wxr .mast{display:flex;justify-content:space-between;align-items:center;gap:12px 24px;flex-wrap:wrap;padding-bottom:18px;box-shadow:0 3px 0 var(--ln)}
.wxr .brand{display:flex;align-items:center;gap:10px;font:400 14px/1 'Press Start 2P',monospace;color:var(--w);letter-spacing:.08em}
.wxr .mark{width:18px;height:18px;background:var(--w);box-shadow:4px 4px 0 var(--pk);display:inline-block}
.wxr .meta{display:flex;flex-wrap:wrap;gap:6px 18px;color:var(--dim);font-size:13px}
.wxr .meta span:first-child{color:var(--ink);font-weight:600}
.wxr .hero{padding:26px 0 8px}
.wxr .hero h1{font-size:34px!important;line-height:1.15;font-weight:600}
.wxr .lead{color:var(--dim);max-width:46em;margin-top:10px}
.wxr .kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:22px}
.wxr .kpi{background:var(--pn);box-shadow:inset 0 0 0 2px var(--ln);padding:14px 14px 12px;display:flex;flex-direction:column;gap:8px}
.wxr .kl{font:600 14px/1.25 'Pixelify Sans',sans-serif;color:var(--ink)}
.wxr .kv{display:grid;grid-template-columns:1fr auto;align-items:baseline;gap:2px 8px}
.wxr .kv span{font-size:12px;color:var(--dim)}
.wxr .kv b{font:400 26px/1 'VT323',monospace;color:var(--dim);text-align:right}
.wxr .kv i{grid-column:1/-1;height:6px;display:block;background:var(--ln)}
.wxr .kv.y i{background:var(--y);opacity:.55}.wxr .kv.w i{background:var(--w);opacity:.55}
.wxr .kv.win b{color:var(--ink)}.wxr .kv.y.win i,.wxr .kv.w.win i{opacity:1}
.wxr section{padding-top:30px}
.wxr h2{font-size:22px!important;font-weight:600;line-height:1.2;padding-bottom:8px;box-shadow:0 2px 0 var(--ln);margin-bottom:12px!important}
.wxr .sub{color:var(--dim);font-size:14px;margin:-4px 0 12px}
.wxr .chart{margin:0;background:var(--pn);box-shadow:inset 0 0 0 2px var(--ln);padding:12px 8px 4px}
.wxr .chart svg{width:100%;height:auto;display:block}
.wxr .chart .grid{stroke:#241F44;stroke-width:1}.wxr .chart .zero{stroke:#4A437A;stroke-width:1.5}
.wxr .chart .ax{fill:var(--dim);font:400 12px 'Chakra Petch',sans-serif}
.wxr .chart .ln{fill:none;stroke-width:2.5}.wxr .chart .ln.y{stroke:var(--y)}.wxr .chart .ln.w{stroke:var(--w)}
.wxr .chart .pt{stroke:var(--pn);stroke-width:2}.wxr .chart .pt.y{fill:var(--y)}.wxr .chart .pt.w{fill:var(--w)}
.wxr .chart .lb{font:600 12px 'Chakra Petch',sans-serif;fill:var(--ink)}.wxr .chart .lb.y{fill:var(--y)}.wxr .chart .lb.w{fill:var(--w)}
.wxr .chart .lv{font:400 18px 'VT323',monospace;fill:var(--ink)}
.wxr table{width:100%;border-collapse:collapse;font-size:14px}
.wxr th,.wxr td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--ln);vertical-align:top}
.wxr thead th{font:600 12px/1.2 'Chakra Petch',sans-serif;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid var(--ln)}
.wxr thead th.y{color:var(--y)}.wxr thead th.w{color:var(--w)}
.wxr .sc tbody th{font-weight:500;color:var(--ink);width:44%}
.wxr .sc td{font:400 20px/1.1 'VT323',monospace;color:var(--dim)}
.wxr .sc td.win{color:var(--ink)}.wxr .sc td.y.win{box-shadow:inset 3px 0 0 var(--y)}.wxr .sc td.w.win{box-shadow:inset 3px 0 0 var(--w)}
.wxr .num{text-align:right}
.wxr .pb tbody th{font-weight:600}.wxr .pb tbody th span{display:block;font-weight:400;color:var(--dim);font-size:12.5px}
.wxr .pb td b{font:400 20px/1.1 'VT323',monospace;display:block}
.wxr .pb td.num{font:400 18px/1.25 'VT323',monospace}.wxr .pb td.num span{display:block}.wxr .pb td.num .y{color:var(--y)}.wxr .pb td.num .w{color:var(--w)}
.wxr .st{display:inline-block;margin-top:4px;font:600 11px/1 'Chakra Petch',sans-serif;letter-spacing:.05em;text-transform:uppercase;padding:4px 6px 3px;box-shadow:inset 0 0 0 1.5px currentColor}
.wxr .st.fixed{color:var(--ok)}.wxr .st.working{color:var(--y)}.wxr .st.waiting{color:#C9A0FF}.wxr .st.open{color:var(--dim)}.wxr .st.worse{color:var(--pk)}
.wxr .tl{display:grid;grid-template-columns:150px 1fr;gap:12px;align-items:center;margin:8px 0}
.wxr .tk{font:600 13px/1.2 'Chakra Petch',sans-serif;display:flex;justify-content:space-between;gap:8px}
.wxr .tk.y{color:var(--y)}.wxr .tk.w{color:var(--w)}.wxr .tk b{font:400 20px/1 'VT323',monospace;color:var(--ink)}
.wxr .tb{display:flex;gap:2px;height:22px}
.wxr .sg{display:block;height:100%;background:var(--ln)}
.wxr .sg.decided{background:var(--ok)}.wxr .sg.agreed{background:repeating-linear-gradient(45deg,var(--ok) 0 4px,var(--pn) 4px 8px);box-shadow:inset 0 0 0 2px var(--pk)}.wxr .sg.guess{background:repeating-linear-gradient(45deg,var(--ok) 0 4px,#2E6A35 4px 8px)}
.wxr .sg.parked,.wxr .sg.next{background:var(--pn);box-shadow:inset 0 0 0 2px var(--pk)}.wxr .sg.dropped,.wxr .sg.busy{background:#4A437A}
.wxr .lg{display:flex;flex-wrap:wrap;gap:6px 16px;color:var(--dim);font-size:12.5px;margin:8px 0 0 162px}
.wxr .lg i{display:inline-block;width:12px;height:12px;margin-right:6px;vertical-align:-1px}
.wxr .lg .decided i{background:var(--ok)}.wxr .lg .guess i{background:repeating-linear-gradient(45deg,var(--ok) 0 3px,#2E6A35 3px 6px)}.wxr .lg .parked i{box-shadow:inset 0 0 0 2px var(--pk)}.wxr .lg .agreed i{background:repeating-linear-gradient(45deg,var(--ok) 0 3px,var(--pn) 3px 6px);box-shadow:inset 0 0 0 2px var(--pk)}.wxr .lg .dropped i{background:#4A437A}
.wxr .ms{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:18px}
.wxr .ms div{background:var(--pn);box-shadow:inset 0 0 0 2px var(--ln);padding:12px;display:flex;flex-direction:column;gap:2px}
.wxr .ms p{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.wxr .ms i{font-style:normal;font-size:12px;color:var(--dim)}
.wxr .ms b{font:400 22px/1.05 'VT323',monospace;color:var(--y)}.wxr .ms b.w{color:var(--w)}
.wxr .ms span{color:var(--dim);font-size:13px;margin-top:4px}
.wxr .mo{display:grid;grid-template-columns:1fr 1.2fr;gap:12px}.wxr .mo.one{grid-template-columns:1fr}
.wxr .mo>div{background:var(--pn);box-shadow:inset 0 0 0 2px var(--ln);padding:16px;display:flex;flex-direction:column;gap:8px}
.wxr .mo .meant{box-shadow:inset 0 0 0 2px var(--w)}
.wxr .mk{font:400 9px/1 'Press Start 2P',monospace;color:var(--dim);letter-spacing:.06em}
.wxr .mo .src{color:var(--dim);font-size:12.5px}.wxr .mo .q{font-size:15px}
.wxr .mo h3{font-size:19px!important;line-height:1.25;font-weight:600}
.wxr .mo ul{list-style:none;margin:2px 0 0;padding:0;display:flex;flex-direction:column;gap:4px;font-size:13px}
.wxr .mo li span{color:var(--w);font-weight:600;margin-right:8px}
.wxr .stk{font:400 20px/1 'VT323',monospace;color:var(--w)}
.wxr .qg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.wxr .qg div{background:var(--pn2);box-shadow:inset 0 0 0 2px var(--w);padding:16px;display:flex;flex-direction:column;gap:6px}
.wxr .qg b{font:400 40px/1 'VT323',monospace;color:var(--w)}.wxr .qg span{color:var(--dim);font-size:13.5px}.wxr .qg em{font:400 19px/1.1 'VT323',monospace;font-style:normal;color:var(--y);margin-top:auto;padding-top:8px;box-shadow:0 -1px 0 var(--ln)}
.wxr .qtr .chart{margin-bottom:12px}.wxr .sub.after{margin:10px 0 0}.wxr .lead.credit{color:var(--ink);margin-top:12px}
.wxr footer{margin-top:30px;padding-top:16px;box-shadow:0 -2px 0 var(--ln);display:flex;flex-direction:column;gap:8px}
.wxr footer p{color:var(--ink)}.wxr footer .fine{color:var(--dim);font-size:12.5px;max-width:60em}
.wxr .sig{font:400 9px/1.6 'Press Start 2P',monospace;color:var(--w)!important;letter-spacing:.06em}
@media (max-width:760px){.wxr{padding:22px 16px}.wxr .hero h1{font-size:26px!important}.wxr .kpis,.wxr .ms{grid-template-columns:repeat(2,minmax(0,1fr))}.wxr .mo,.wxr .qg{grid-template-columns:1fr}
  .wxr .tl{grid-template-columns:1fr;gap:4px}.wxr .lg{margin-left:0}.wxr .pb thead{display:none}.wxr .pb tr{display:grid;grid-template-columns:1fr 1fr;border-bottom:2px solid var(--ln);padding:6px 0}
  .wxr .pb th,.wxr .pb td{border:0;padding:5px 6px}.wxr .pb tbody th{grid-column:1/-1}.wxr .pb td.num:first-of-type{display:none}.wxr .pb td.num{grid-column:1/-1;text-align:left}.wxr .pb td.num span{display:inline;margin-right:14px}
  .wxr .sc tbody th{width:auto}}
@media print{.wxr{box-shadow:none;max-width:none;padding:18px}.wxr section{break-inside:avoid}}`;

  function toText() {
    const L = [];
    L.push('THE WAKE EXPERIENCE · AFTER-ACTION REPORT');
    L.push(meta.company + ' · ' + meta.role + ' · Week of ' + meta.date, '');
    L.push(verdict, '', credit, '');
    L.push('SCORECARD (on your own / with Wake)');
    for (const r of S.rows) L.push('  ' + r.label + ': ' + r.you + ' / ' + r.wake);
    L.push('', 'THE MEETING');
    L.push('  On your own: ' + dur(PR.you) + ' of prep, ' + Y.minutes + ' min in the room (' + Y.hours.toFixed(1) + ' leadership hours), ' + Y.ownerDate + ' of ' + Y.items.length + ' decisions with an owner and a start date, ' + Y.deferred + ' carried to another meeting.');
    L.push('  With Wake: ' + dur(PR.wake) + ' of prep, ' + K.minutes + ' min in the room (' + K.hours.toFixed(1) + ' leadership hours), ' + K.ownerDate + ' of ' + K.items.length + ' decisions with an owner and a start date, none carried over.');
    L.push('', 'PROBLEM BY PROBLEM (Friday)');
    for (const r of WK.rows) L.push('  ' + r.label + ' · ' + r.metric.label + ': ' + r.you.to + ' (' + STATUS[r.you.status].toLowerCase() + ') on your own, ' + r.wake.to + ' (' + STATUS[r.wake.status].toLowerCase() + ') with Wake.');
    L.push('', 'THE MOMENT THAT MATTERED', '  ' + moment.title);
    for (const l of moment.lines) L.push('  ' + l);
    if (moment.wake) L.push('  ' + moment.wake);
    L.push('', 'THIRTEEN WEEKS LIKE THIS ONE (projected)');
    L.push('  Operating profit: ' + kmoney(S.quarter.wake.total) + ' with Wake, ' + kmoney(S.quarter.you.total) + ' on your own.');
    L.push('  Yearly run-rate by week 13: ' + kmoney(S.quarter.wake.runRate) + ' with Wake, ' + kmoney(S.quarter.you.runRate) + ' on your own.');
    L.push('  Team time back: ' + Math.round(S.quarter.hours) + ' hrs.');
    L.push('', closer, '', 'Estimates use this company\'s own figures. wakepe.com');
    return L.join('\n');
  }
  function toHTML() {
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Wake Experience report · ' + esc(meta.company) + '</title>' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600&family=Pixelify+Sans:wght@500;600&family=Press+Start+2P&family=VT323&display=swap">' +
      '<style>html,body{margin:0;background:#07060F}body{padding:24px 12px}' + css + '</style></head><body>' + fragment() + '</body></html>';
  }

  return { score: S, finale: S, verdict, credit, moment, closer, meta, report: { meta, css, fragment, toText, toHTML } };
}
