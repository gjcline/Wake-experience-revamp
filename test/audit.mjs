// BALANCE AUDIT
// Plays many random games (random flags, answers, picks and meeting choices) across every shell
// and role, and reports any game where the numbers stop telling one story. Run: node test/audit.mjs 3000
import { createGame } from '../src/engine/game.js';
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
  const P = g.meetingPlan();
  const strat = pick(['first', 'last', 'random', 'iou', 'guess']);
  for (const it of P.items) for (const q of it.qs) {
    if (q.cond === 'pending' && !g.meetingPending(it.id)) continue;
    const o = strat === 'first' ? q.opts[0] : strat === 'last' ? q.opts[q.opts.length - 1] : strat === 'iou' ? (q.opts.find((x) => ['iou', 'later', 'rethink', 'wait'].includes(x.effect)) || q.opts[0]) : strat === 'guess' ? (q.opts.find((x) => ['guess', 'bounce', 'anyway', 'self', 'drop', 'now'].includes(x.effect)) || q.opts[0]) : pick(q.opts);
    g.answerQ(q.id, o.id);
  }
  g.answerQ('wrap', pick(P.wrap.opts).id);
  const R = g.recap(), SC = R.score, W = SC.week, fy = SC.final.you, fw = SC.final.wake, Y = W.meeting.you;
  const tag = { seed, shell, role, style, strat, picks: g.state.wakeOrder.join(','), dec: Y.decided + '/' + Y.items.filter((x) => x.kind === 'finding').length, yp: fy.profit, wp: fw.profit, yr: fy.runRate, wr: fw.runRate };
  S.yp.push(fy.profit); S.wp.push(fw.profit);
  const key = style + '/' + strat; (S.by = S.by || {})[key] = S.by[key] || { p: [], r: [], q: [], res: [] };
  S.by[key].p.push(fy.profit / Math.max(1, fw.profit)); S.by[key].r.push(fy.runRate / Math.max(1, fw.runRate)); S.by[key].q.push(SC.quarter.you.total / Math.max(1, SC.quarter.wake.total)); S.by[key].res.push(fy.resolved + '/' + fw.resolved);
  if (fy.profit >= fw.profit) bump('P1 profit >= Wake', tag);
  if (fy.runRate >= fw.runRate) bump('P1 run-rate >= Wake', tag);
  if (fy.resolved > fw.resolved) bump('P1 resolved > Wake', tag);
  if (fy.hours <= fw.hours) bump('P1 hours <= Wake', tag);
  if (Y.minutes <= W.meeting.wake.minutes) bump('P1 meeting <= Wake', tag);
  if (SC.youAhead >= SC.wakeAhead) bump('P1 ahead on measures', tag);
  if (W.tta.you !== null && W.tta.wake !== null && W.tta.you < W.tta.wake) bump('P1 faster to action', tag);
  const realItems = Y.items.filter((x) => x.kind === 'finding');
  const chose = (eff) => Object.entries(g.state.meet.answers).some(([q, o]) => { const it = P.items.flatMap((x) => x.qs).find((x) => x.id === q); return it && it.opts.find((x) => x.id === o).effect === eff; });
  if (realItems.length && Y.decided === 0 && !chose('wait')) bump('nothing agreed, never chose to wait', { ...tag, items: realItems.map((x) => x.handling + ':' + x.decision) });
  if (realItems.length && Y.decided === 0) S.dec0++;
  // story consistency: nothing decided and no follow-ups landed, yet money moved before Wednesday
  const earlyMoney = W.board.you[1].profit;

  for (const it of realItems) { const L = W.rows.find((r) => r.id === it.fid).you;
    const twin = realItems.filter((x) => x.fid === it.fid).length > 1;
    if (['decided', 'guess', 'agreed'].includes(it.decision) && L.first > 1 && !(twin && it.handling === 'counter')) bump('decided in the room but nothing starts Tuesday', { ...tag, it: it.decision, h: it.handling, first: L.first });
    if (it.decision === 'parked' && !twin && L.first <= 1) bump('parked but started Tuesday', { ...tag, h: it.handling }); }
  if (W.rows.some((r) => r.you.days.some((x, d) => d < (r.you.first || 9) && x.p > 0 && !(world => true)()))) {}
  if (SC.quarter && SC.quarter.you && SC.quarter.you.cum[12] <= 0) bump('P1 quarter <= 0', tag);
  if (SC.quarter && SC.quarter.you && SC.quarter.you.cum[12] >= SC.quarter.wake.cum[12]) bump('P1 quarter >= Wake', tag);
}
for (const [k, v] of Object.entries(issues)) { console.log(k, v.length); if (verbose) console.log('   e.g.', JSON.stringify(v[0])); }
const q = (arr) => { const s = arr.slice().sort((x, y) => x - y); return [0, 0.1, 0.5, 0.9, 1].map((f) => Math.round(s[Math.min(s.length - 1, Math.floor(f * s.length))])).join(' / '); };
const med = (a) => { const x = a.slice().sort((m, n) => m - n); return (x[Math.floor(x.length / 2)] * 100).toFixed(0) + '%'; };
for (const [k, v] of Object.entries(S.by).sort()) console.log(k.padEnd(18), 'n', String(v.p.length).padStart(3), ' week profit', med(v.p).padStart(5), ' run-rate', med(v.r).padStart(5), ' quarter', med(v.q).padStart(5), ' resolved e.g.', v.res.slice(0, 4).join(' '));
console.log('P1 profit', q(S.yp)); console.log('Wake profit', q(S.wp)); console.log('nothing decided', S.dec0, 'of', N);
