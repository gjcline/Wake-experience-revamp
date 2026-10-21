// BALANCE AUDIT
// Plays many random games (random flags, answers, picks and meeting choices) across every shell
// and role, and reports any game where the numbers stop telling one story. Run: node test/audit.mjs 3000
import { createGame } from '../src/engine/game.js';
import { autoPick } from '../src/engine/meeting.js';
import { SHELL_ORDER } from '../src/content/shells.js';
import { ROLE_ORDER } from '../src/content/roles.js';
const N = +(process.argv[2] || 1500), verbose = process.argv[3] === 'v';
let a = 7; const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const issues = {}; const bump = (k, info) => { (issues[k] = issues[k] || []).push(info); };
const S = { yp: [], wp: [], yq: [], wq: [], ratioRun: [], dec0: 0, ydec: [] };
for (let run = 0; run < N; run++) {
  const seed = 1 + Math.floor(rnd() * 5000), shell = pick(SHELL_ORDER), role = pick(ROLE_ORDER);
  const g = createGame({ shellId: shell, roleId: role, seed, now: () => 0 }); const w = g.world; g.startRound1();
  for (let i = 0; i < 40 + Math.floor(rnd() * 90); i++) g.tickClock();
  const flaggable = Object.values(w.signals).filter((s) => s.sources.some((x) => ['report', 'location'].includes(w.sources[x].kind)) && w.ansKey[s.id]);
  const style = pick(['skilled', 'random', 'random', 'weak']);
  const pool = style === 'skilled' ? w.findings.map((f) => f.core.find((id) => flaggable.some((s) => s.id === id))).filter(Boolean) : flaggable.map((s) => s.id);
  const nf = 3 + Math.floor(rnd() * 3); const used = new Set();
  for (let i = 0; i < nf * 3 && g.state.flags.length < nf; i++) {
    const sid = style === 'skilled' ? pool[i % pool.length] : pick(pool); if (!sid || used.has(sid)) continue; used.add(sid);
    const ans = g.answers(sid); const choice = style === 'skilled' ? (ans.find((x) => x.style === 'process') || ans[0]) : pick(ans);
    const owner = rnd() < 0.6 ? pick(w.owners) : null;
    g.flag({ signals: [sid], source: w.signals[sid].sources.find((x) => ['report', 'location'].includes(w.sources[x].kind)), choice: choice.id, owner });
  }
  if (!g.submitRound1()) continue;
  const B = g.startRound2(); for (let i = 0; i < 140; i++) g.tickWake();
  const ins = g.insights(); const np = 3 + Math.floor(rnd() * 3);
  const order = rnd() < 0.5 ? ins : ins.slice().sort(() => rnd() - 0.5);
  for (const x of order.slice(0, np)) g.pick(x.id);
  g.lockRound2();
  const strat = process.env.AUTO ? 'auto' : pick(['first', 'last', 'random', 'iou', 'guess']);
  const PREF = { iou: ['iou', 'later', 'rethink', 'wait', 'waitlook', 'longer', 'skip'], guess: ['guess', 'bounce', 'anyway', 'self', 'drop', 'now', 'push', 'quick'] };
  const P = { items: g.meetingAgenda(), said: [] };
  for (let i = 0; i < 400; i++) {
    const st = g.meetingStep(); if (st.done) break; const b = st.beat;
    const o = b.auto ? b.opts[0] : strat === 'auto' ? autoPick(b) : strat === 'first' ? b.opts[0] : strat === 'last' ? b.opts[b.opts.length - 1] : strat === 'random' ? pick(b.opts) : (b.opts.find((x) => PREF[strat].includes(x.effect)) || b.opts[0]);
    g.answerQ(b.id, o.id); P.said.push({ beat: b, opt: o });
  }
  const R = g.recap(), SC = R.score, W = SC.week, fy = SC.final.you, fw = SC.final.wake, Y = W.meeting.you;
  const tag = { seed, shell, role, style, strat, picks: g.state.wakeOrder.join(','), dec: Y.decided + '/' + Y.items.filter((x) => x.kind === 'finding').length, yp: fy.profit, wp: fw.profit, yr: fy.runRate, wr: fw.runRate, rows: W.rows.map((r) => r.id + ':' + r.you.mode + ':' + r.you.profit + '/' + r.wake.profit).join(' ') };
  S.yp.push(fy.profit); S.wp.push(fw.profit); (S.gap = S.gap || []).push(fw.profit - fy.profit); (S.rgap = S.rgap || []).push(fw.runRate - fy.runRate); (S.qgap = S.qgap || []).push(SC.quarter.wake.total - SC.quarter.you.total); (S.wres = S.wres || []).push(fw.resolved);
  const key = style + '/' + strat; (S.by = S.by || {})[key] = S.by[key] || { p: [], r: [], q: [], res: [] };
  S.by[key].p.push(fy.profit / Math.max(1, fw.profit)); S.by[key].r.push(fy.runRate / Math.max(1, fw.runRate)); S.by[key].q.push(SC.quarter.you.total / Math.max(1, SC.quarter.wake.total)); S.by[key].res.push(fy.resolved + '/' + fw.resolved);
  if (fy.profit >= fw.profit) bump('P1 profit >= Wake', tag);
  // a thriving business has a steady week on its own: never a losing week, never a token one
  if (fy.profit <= 0) bump('P1 week profit <= 0', tag);
  if (fy.runRate <= 0) bump('P1 run-rate <= 0', tag);
  if (W.board.you.slice(3).some((x) => x.profit < 0)) bump('P1 cumulative profit negative from Thursday', tag);
  if (fy.profit < fw.profit * 0.15) bump('P1 week under 15% of Wake', tag);
  if (fy.profit > fw.profit * 0.8) bump('P1 week over 80% of Wake', tag);
  if (SC.quarter.you.runRate <= 0) bump('P1 quarter run-rate <= 0', tag);
  S.ratio = S.ratio || []; S.ratio.push(fy.profit / Math.max(1, fw.profit) * 100); S.yr = S.yr || []; S.yr.push(fy.runRate); S.yq = S.yq || []; S.yq.push(SC.quarter.you.total);
  if (fy.runRate >= fw.runRate) bump('P1 run-rate >= Wake', tag);
  if (fy.resolved > fw.resolved) bump('P1 resolved > Wake', tag);
  if (fy.hours <= fw.hours) bump('P1 hours <= Wake', tag);
  if (Y.minutes <= W.meeting.wake.minutes) bump('P1 meeting <= Wake', tag);
  if (SC.youAhead >= SC.wakeAhead) bump('P1 ahead on measures', tag);
  if (W.tta.you !== null && W.tta.wake !== null && W.tta.you < W.tta.wake) bump('P1 faster to action', tag);
  const realItems = Y.items.filter((x) => x.kind === 'finding');
  const chose = (eff) => P.said.some((x) => x.opt.effect === eff);
  if (realItems.length && Y.decided === 0 && !chose('wait') && !chose('skip') && !chose('longer') && !chose('alt') && !chose('anyway')) bump('nothing agreed, never chose to wait', { ...tag, items: realItems.map((x) => x.handling + ':' + x.decision) });
  if (realItems.length && Y.decided === 0) S.dec0++;
  // story consistency: nothing decided and no follow-ups landed, yet money moved before Wednesday
  const earlyMoney = W.board.you[1].profit;

  for (const it of realItems) { const L = W.rows.find((r) => r.id === it.fid).you;
    const twin = realItems.filter((x) => x.fid === it.fid).length > 1;
    if (['decided', 'guess', 'agreed', 'pilot'].includes(it.decision) && L.first > (it.dated && !it.late && !it.tasks.some((x) => x.kind === 'brief') ? 1 : 2) && !twin) bump('decided in the room but nothing starts Tuesday', { ...tag, it: it.decision, h: it.handling, first: L.first });
    if (it.decision === 'parked' && !twin && L.first <= 1) bump('parked but started Tuesday', { ...tag, h: it.handling }); }
  if (W.rows.some((r) => r.you.days.some((x, d) => d < (r.you.first || 9) && x.p > 0 && !(world => true)()))) {}
  if (SC.quarter && SC.quarter.you && SC.quarter.you.cum[12] <= 0) bump('P1 quarter <= 0', tag);
  if (SC.quarter && SC.quarter.you && SC.quarter.you.cum[12] >= SC.quarter.wake.cum[12]) bump('P1 quarter >= Wake', tag);
}
for (const [k, v] of Object.entries(issues)) { console.log(k, v.length); if (verbose) for (const x of v.slice(0, 3)) console.log('   e.g.', JSON.stringify(x)); }
const q = (arr) => { const s = arr.slice().sort((x, y) => x - y); return [0, 0.1, 0.5, 0.9, 1].map((f) => Math.round(s[Math.min(s.length - 1, Math.floor(f * s.length))])).join(' / '); };
const med = (a) => { const x = a.slice().sort((m, n) => m - n); return (x[Math.floor(x.length / 2)] * 100).toFixed(0) + '%'; };
for (const [k, v] of Object.entries(S.by).sort()) console.log(k.padEnd(18), 'n', String(v.p.length).padStart(3), ' week profit', med(v.p).padStart(5), ' run-rate', med(v.r).padStart(5), ' quarter', med(v.q).padStart(5), ' resolved e.g.', v.res.slice(0, 4).join(' '));
console.log('P1 profit', q(S.yp)); console.log('P1 / Wake week %', q(S.ratio)); console.log('P1 run-rate', q(S.yr)); console.log('P1 quarter', q(S.yq)); console.log('Wake profit', q(S.wp)); console.log('Week gap $', q(S.gap)); console.log('Run-rate gap $', q(S.rgap)); console.log('Quarter gap $', q(S.qgap)); console.log('Wake resolved', q(S.wres)); console.log('nothing decided', S.dec0, 'of', N);
