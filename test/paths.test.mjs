// PATH TESTS
// Plays the two-round game headlessly across many generated companies (every shell, every
// role, single and multi-location), and checks the invariants that make the experience
// credible and the comparison fair.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/engine/game.js';
import { intentsOf } from '../src/engine/judge.js';
import { SHELL_ORDER } from '../src/content/shells.js';
import { ROLE_ORDER } from '../src/content/roles.js';
import { HANDLING } from '../src/content/rounds.js';

let tick = 0;
const mk = (seed = 7, shellId = 'service', roleId = 'coo') => createGame({ shellId, roleId, seed, now: () => (tick += 3000), sessionId: 'test' });
const flaggable = (g, id) => g.world.signals[id].sources.find((s) => ['report', 'location'].includes(g.world.sources[s].kind));
const pick = (g, sig, pred) => g.answers(sig).find(pred);
const coreSig = (g, f) => f.core.find((id) => flaggable(g, id)) || f.evidence.find((id) => flaggable(g, id));

// run the meeting beat by beat, answering every question the same way: the first option,
// a follow-up, a guess, or follow-ups but moving now
const PREFER = {
  iou: ['iou', 'later', 'rethink', 'wait', 'waitlook', 'longer', 'skip'],
  guess: ['guess', 'bounce', 'anyway', 'self', 'drop', 'now', 'push', 'quick', 'clarify', 'interim', 'accept'],
  now: ['iou', 'later', 'now', 'waitlook', 'accept', 'date'],
};
function meet(g, how = 'first') {
  const said = [];
  for (let i = 0; i < 400; i++) {
    const st = g.meetingStep(); if (st.done) break;
    const b = st.beat;
    // options rotate, so 'first' means the strongest answer on the table, then the first one
    const o = b.auto ? b.opts[0] : how === 'first' ? (b.opts.find((x) => x.effect === 'answer') || b.opts[0]) : (b.opts.find((x) => PREFER[how].includes(x.effect)) || b.opts[0]);
    g.answerQ(b.id, o.id); said.push({ beat: b, opt: o });
  }
  assert.ok(g.meetingStep().done, 'the meeting finishes');
  return { items: g.meetingAgenda(), said };
}

function finish(g, { through = [], reorder = false, how = 'first' } = {}) {
  assert.ok(g.submitRound1(), 'submits');
  const b = g.startRound2();
  for (let i = 0; i < 30; i++) g.tickWake();
  for (const id of through) g.putThrough(id);
  const ins = g.insights();
  // pick the top of Wake's list, or (reorder) swap one priority for a routine item
  const picks = ins.slice(0, Math.min(5, g.world.findings.length)).map((x) => x.id);
  if (reorder) { picks.pop(); picks.push(ins[ins.length - 1].id); }
  for (const id of picks) g.pick(id);
  assert.ok(g.briefing().ready);
  assert.ok(g.lockRound2());
  const plan = meet(g, how);
  const d = { plan, yours: g.meetingYours(), wake: g.meetingWake(), after: g.afterMeeting() }; g.presented('yours'); g.presented('wake');
  const wk = g.week(); const rc = g.recap(); g.complete();
  return { b, d, wk, rc };
}

function invariants(g, out, name) {
  const { b, d, wk, rc } = out;
  const n = g.world.findings.length;
  assert.equal(g.state.phase, 'complete');
  assert.ok(g.state.clock <= g.world.day.meetingAt, name + ': clock never passes 10:00');
  assert.equal(b.cards.filter((c) => !c.routine).length, n, name + ': every problem in the company surfaces');
  assert.ok(b.cards.length >= 5 && b.cards.length <= 8, name + ': five to eight insights');
  assert.ok(b.cards.slice(0, n).every((c) => !c.routine), name + ': the problems rank above the routine items');
  assert.ok(n >= 4 && n <= 5, name + ': four or five priorities');
  assert.ok(b.filtered.length >= 1, name + ': at least one false alarm filtered');
  for (const c of b.cards.filter((x) => !x.routine)) assert.ok(c.evidence.length >= 4 && c.owners.length >= 1 && new Set(c.evidence.map((e) => e.system)).size >= 2, name + ': card ' + c.id + ' is cross-system and owned');
  assert.equal(d.yours.items.length, g.state.flags.length);
  for (const it of d.plan.items) assert.ok(d.plan.said.some((x) => x.beat.item === it.n && x.beat.type === 'ask' && x.beat.line && x.beat.who.name), name + ': every item meets the room');
  const lines = d.plan.said.filter((x) => x.beat.type === 'ask').map((x) => x.beat.line);
  assert.ok(new Set(lines).size >= lines.length - 1, name + ': the room does not repeat itself');
  assert.ok(d.yours.minutes > d.wake.minutes && d.yours.hours > d.wake.hours, name + ': more leadership time on your own');
  assert.equal(d.wake.answered, d.wake.asked, name + ': Wake answers every question in the room');
  assert.equal(d.wake.ious, 0);
  assert.ok(d.wake.minutes < d.yours.minutes, name + ': Wake\'s meeting is shorter');
  assert.ok(g.state.wakeOrder.length >= 3 && g.state.wakeOrder.length <= 5);
  assert.ok(d.after.mine.length >= 2 && d.after.done.length >= 4, name + ': the meeting creates work, or does it');
  assert.equal(wk.rows.length, n, name + ': the week covers every priority');
  for (const r of wk.rows) { assert.ok(r.label && r.metric.label); for (const L of [r.you, r.wake]) { assert.equal(L.days.length, 5); assert.ok(L.days.every((x) => x.shown && x.status), name + ': every day has a measure'); } }
  assert.equal(wk.board.you.length, 5); assert.equal(wk.board.wake.length, 5);
  const picked = g.state.wakeOrder.filter((id) => g.world.findingById[id]).length;
  assert.ok(wk.board.wake[4].resolved >= picked, name + ': everything Wake handed off is resolved by Friday');
  const fy = wk.board.you[4], fw = wk.board.wake[4];
  assert.ok(fw.profit > fy.profit && fw.runRate > fy.runRate && fw.resolved >= fy.resolved, name + ': Wake wins the week on the money that matters');
  assert.ok(rc.score.quarter.wake.total > rc.score.quarter.you.total && rc.score.quarter.you.total > 0, name + ': the quarter widens the gap, and your baseline is real');
  assert.ok(rc.score.wakeAhead > rc.score.youAhead, name + ': the verdict and the numbers agree');
  for (const it of d.yours.items.filter((x) => ['decided', 'guess', 'agreed', 'pilot'].includes(x.decision))) {
    const firstDay = wk.rows.find((r) => r.id === it.fid).you.first, twin = d.yours.items.filter((x) => x.fid === it.fid).length > 1;
    const clean = it.dated && !it.late && !it.tasks.some((x) => x.kind === 'brief');
    assert.ok(twin || firstDay <= (clean ? 1 : 2), name + ': what the room decided starts Tuesday, or Wednesday without a firm date');
  }
  assert.ok(wk.board.wake[4].hours < wk.board.you[4].hours, name + ': fewer hours with Wake');
  assert.ok(rc.moment.title && rc.moment.lines.length >= 2 && rc.closer && rc.verdict);
  assert.equal(rc.score.rows.length, 9, name + ': nine head-to-head measures');
  const text = JSON.stringify([b, d, wk, rc.score.rows, rc.moment, rc.closer]) + rc.report.toText() + rc.report.toHTML();
  assert.ok(!/\{[A-Za-z]+\}/.test(text), name + ': unresolved token ' + (text.match(/\{[A-Za-z]+\}/) || [''])[0]);
  assert.ok(!text.includes('—') && !text.includes('undefined') && !text.includes('NaN'), name + ': clean text');
  assert.ok(!/\b(F[1-5]|falseAlarm|offTarget|counter)\b/.test(rc.report.toText()), name + ': no internal labels in the report');
  const types = new Set(g.tracker.log.map((e) => e.type));
  for (const t of ['session_start', 'round1_started', 'flag_added', 'round1_submitted', 'round2_started', 'wake_picked', 'round2_locked', 'meeting_answer', 'presented_yours', 'presented_wake', 'week_played', 'recap_viewed', 'session_complete']) assert.ok(types.has(t), name + ': log has ' + t);
  assert.equal(g.session().summary.flags.length, g.state.flags.length);
}

// ------------------------------------------------------------------ the paths
const PATHS = {
  // the player connects every story and picks the answer that fits it
  aligned(g) {
    for (const f of g.world.findings) {
      const s = coreSig(g, f); g.open(flaggable(g, s));
      const a = pick(g, s, (x) => HANDLING[f.id].aligned.includes(x.intent));
      assert.ok(a, 'aligned answer exists for ' + f.id);
      assert.ok(g.flag({ signals: [s], source: flaggable(g, s), choice: a.id, owner: g.world.briefing[f.id].owner[0] }));
    }
  },
  // the player reacts to the obvious line with the obvious move
  counter(g) {
    for (const f of g.world.findings.slice(0, 3)) {
      const s = coreSig(g, f);
      const a = pick(g, s, (x) => HANDLING[f.id].counter.includes(x.intent));
      g.flag({ signals: [s], source: flaggable(g, s), choice: a.id, owner: null });
    }
  },
  // the player chases the false alarms and the noise
  distracted(g) {
    const fa = Object.values(g.world.signals).filter((s) => s.kind === 'falseAlarm' && flaggable(g, s.id));
    const noise = Object.values(g.world.signals).filter((s) => s.kind === 'noise' && flaggable(g, s.id) && !s.findings.length);
    for (const s of fa.concat(noise).slice(0, 4)) { const a = g.answers(s.id)[0]; g.flag({ signals: [s.id], source: flaggable(g, s.id), choice: a.id }); }
  },
  // the player ignores the common answers and writes everything
  writer(g) {
    const fs = g.world.findings;
    const texts = ['Cut hours there by ten percent starting tomorrow', 'Look into it and report back Friday', 'fix it'];
    fs.slice(0, 3).forEach((f, i) => { const s = coreSig(g, f); g.flag({ signals: [s], source: flaggable(g, s), note: texts[i] }); });
  },
  // the player flags, attaches context, edits, removes and reorders
  tinkerer(g) {
    const fs = g.world.findings;
    for (const f of fs.slice(0, 4)) { const s = coreSig(g, f); g.flag({ signals: [s], source: flaggable(g, s), choice: g.answers(s)[1].id, owner: 'opsdir' }); }
    const first = g.state.flags[0], ev = fs[0].evidence;
    const ctxSrc = Object.values(g.world.sources).find((s) => ['email', 'message'].includes(s.kind) && !s.arrives && s.lines.some((id) => ev.includes(id)));
    g.attach(first.id, { key: ctxSrc.id, source: ctxSrc.id, label: ctxSrc.title });
    g.attach(first.id, { key: 'cal:ev_meet', source: 'cal', label: 'Calendar: meeting', signals: ['cal.meeting'] });
    const s0 = first.signals[0];
    const aligned = pick(g, s0, (x) => HANDLING[g.world.signals[s0].findings[0]].aligned.includes(x.intent));
    g.editFlag(first.id, { choice: aligned.id, note: 'and tell me Wednesday how it went' });
    g.removeFlag(g.state.flags[3].id);
    g.moveFlag(g.state.flags[2].id, -1);
    g.detach(first.id, 'cal:ev_meet');
  },
};

const SEEDS = [3, 7, 12, 19, 25, 31, 44, 58, 71, 90];
for (const [name, play] of Object.entries(PATHS)) {
  test('path ' + name + ' across companies', () => {
    for (const seed of SEEDS) {
      const g = mk(seed, SHELL_ORDER[seed % 5], ROLE_ORDER[(seed >> 1) % 5]);
      g.startRound1();
      for (let i = 0; i < 40; i++) g.tickClock();
      for (const id of g.world.order.report) g.open(id);
      play(g);
      invariants(g, finish(g, { through: g.world.phone, reorder: seed % 2 === 0 }), name + ' seed ' + seed);
    }
  });
}

test('expected outcomes', () => {
  const run = (play, how = 'first', seed = 12) => { const g = mk(seed, 'multi', 'coo'); g.startRound1(); play(g); const out = finish(g, { how }); return { g, ...out }; };
  const A = run(PATHS.aligned, 'iou');
  assert.ok(A.d.plan.items.every((y) => y.handling === 'aligned'), 'aligned answers read as aligned');
  assert.ok(A.d.yours.items.every((y) => y.decision === 'parked' || y.decision === 'next'), 'what you cannot answer gets parked');
  assert.ok(A.d.yours.ious >= A.d.yours.items.length, 'every unanswered question is a follow-up');
  assert.ok(A.wk.board.you[4].resolved < A.wk.board.wake[4].resolved, 'parked work resolves less by Friday');
  assert.ok(A.wk.board.you[4].profit > 0, 'your plan still creates value');
  const N2 = run(PATHS.aligned, 'now');
  assert.ok(N2.d.yours.items.every((y) => ['agreed', 'decided', 'guess', 'pilot'].includes(y.decision)) && N2.d.yours.items.some((y) => y.decision === 'agreed'), 'the room can always agree to move, even without the numbers');
  assert.ok(N2.wk.board.you[4].profit > A.wk.board.you[4].profit, 'moving ahead of the numbers is worth more than waiting');
  const G = run(PATHS.aligned, 'guess');
  const bounced = new Set(G.d.plan.said.filter((x) => x.opt.effect === 'bounce').map((x) => x.beat.item));
  assert.ok(G.d.yours.items.every((y) => ['decided', 'guess', 'pilot', 'agreed'].includes(y.decision)), 'a guess keeps it moving');
  assert.ok([...bounced].every((n) => { const y = G.d.yours.items[n - 1]; return y.decision === 'agreed' && y.tasks.some((x) => /Size the cost/.test(x.what)); }), 'no one signs off on a ballpark: it moves, but the number is still owed');
  assert.ok(G.wk.board.you[4].profit > A.wk.board.you[4].profit, 'deciding sooner is worth more');
  const C = run(PATHS.counter, 'guess');
  assert.ok(C.d.plan.items.every((y) => y.handling === 'counter' && C.d.plan.said.some((x) => x.beat.id === y.id + ':ct')), 'obvious moves get pushback');
  assert.ok(C.wk.rows.filter((r) => C.d.yours.items.some((y) => y.fid === r.id)).every((r) => r.you.mode === 'counter'), 'pushing through runs the counter move');
  assert.ok(C.wk.rows.some((r) => r.you.days.some((x) => x.status === 'worse')), 'and some of it gets worse');
  const D = run(PATHS.distracted, 'guess');
  assert.ok(D.d.plan.items.every((y) => ['falseAlarm', 'noise'].includes(y.kind)), 'false alarms and noise are recognized');
  assert.ok(D.d.yours.items.every((y) => y.decision === 'dropped'));
  const W = run(PATHS.writer);
  assert.deepEqual(W.d.plan.items.map((y) => y.handling), ['counter', 'partial', 'unclear'], 'written text is read for intent');
  const T = run(PATHS.tinkerer);
  assert.equal(T.g.state.flags.length, 3);
  assert.equal(T.g.state.flags[0].attached.length, 1, 'attached and detached context');
  assert.ok(T.d.plan.items[0].handling === 'aligned' && T.d.plan.items[0].text.includes('tell me Wednesday'), 'edits change the answer and keep the note');
  assert.ok(T.d.plan.items[0].ev && T.d.plan.said.some((x) => x.opt.effect === 'answer'), 'context you brought answers the room');
  assert.ok(T.d.yours.answered >= 1);
  const sum = T.g.session().summary;
  assert.equal(sum.contextAttached, 1);
  assert.equal(sum.contextThatFits, 1, 'context from the same story counts as support');
  assert.ok(Object.keys(sum.styles).length >= 1 && sum.ownersNamed === 3);
});

test('false alarm: checking is not the same as reacting', () => {
  const g = mk(12, 'multi', 'coo'); g.startRound1();
  const fa = Object.values(g.world.signals).filter((s) => s.kind === 'falseAlarm' && flaggable(g, s.id));
  assert.ok(fa.length >= 1);
  const s = fa[0].id;
  const check = pick(g, s, (x) => x.intent === 'investigate'), react = pick(g, s, (x) => x.intent !== 'investigate');
  g.flag({ signals: [s], source: flaggable(g, s), choice: check.id });
  const g2 = mk(12, 'multi', 'coo'); g2.startRound1();
  g2.flag({ signals: [s], source: flaggable(g2, s), choice: react.id });
  for (const x of [g, g2]) { const f = Object.values(x.world.findings)[0]; const t = coreSig(x, f); x.flag({ signals: [t], source: flaggable(x, t), choice: x.answers(t)[0].id }); x.flag({ signals: [coreSig(x, x.world.findings[1])], source: flaggable(x, coreSig(x, x.world.findings[1])), choice: x.answers(coreSig(x, x.world.findings[1]))[0].id }); }
  const o1 = finish(g), o2 = finish(g2);
  assert.equal(o1.d.plan.items[0].handling, 'checked');
  assert.equal(o2.d.plan.items[0].handling, 'react');
});

test('common answers: four styles, about 8 to 12 words, every flaggable figure', () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const g = mk(seed, SHELL_ORDER[seed % 5], 'gm');
    for (const s of Object.values(g.world.signals)) {
      if (!flaggable(g, s.id)) continue;
      const list = g.answers(s.id);
      assert.equal(list.length, 4, 'four answers for ' + s.id);
      for (const a of list) {
        const words = a.text.split(/\s+/).length;
        assert.ok(words >= 7 && words <= 14, 'answer length ' + words + ': ' + a.text);
        assert.ok(!/\{|undefined|—/.test(a.text), 'clean answer: ' + a.text);
      }
    }
    for (const f of g.world.findings) {
      const s = coreSig(g, f), ints = g.answers(s).map((a) => a.intent);
      assert.ok(ints.some((i) => HANDLING[f.id].aligned.includes(i)), f.id + ' offers the fitting answer');
      assert.ok(ints.some((i) => HANDLING[f.id].counter.includes(i)), f.id + ' offers an obvious answer');
    }
  }
});

test('intent mapping reads common phrasing', () => {
  const cases = [['Cut Riverside hours by 10%', 'cut'], ['Approve the replacement quote', 'replace'], ['Dispute the invoices against the contract', 'dispute'], ['Restart the follow-up calls', 'followup'],
    ['Post schedules a week ahead', 'posting'], ['Raise starting pay', 'pay'], ['Look into it and report back', 'investigate'], ['Move coverage to the afternoon peak', 'schedule']];
  for (const [t, i] of cases) assert.ok(intentsOf(t).includes(i), t + ' -> ' + i);
});

test('every company is different, and the same seed is the same company', () => {
  const a = mk(101, 'service', 'gm'), b = mk(101, 'service', 'gm'), c = mk(102, 'service', 'gm');
  assert.equal(JSON.stringify(a.world.sources), JSON.stringify(b.world.sources), 'deterministic for a seed');
  assert.notEqual(a.world.shell.company + a.world.locations.map((l) => l.name), c.world.shell.company + c.world.locations.map((l) => l.name));
  const sizes = new Set(), companies = new Set();
  for (let s = 1; s <= 80; s++) { const g = mk(s, 'service', 'gm'); sizes.add(g.world.shell.size); companies.add(g.world.shell.company); }
  assert.ok(sizes.has(1) && sizes.size >= 5, 'single and multi-location companies both occur: ' + [...sizes]);
  assert.ok(companies.size >= 15, 'company names vary');
  for (let s = 1; s <= 40; s++) { assert.ok(mk(s, 'multi', 'gm').world.shell.size >= 3, 'multi-location operator has several sites'); assert.ok(mk(s, 'service', 'regional').world.shell.size >= 3, 'a regional manager has a region'); }
});

test('no time cost, and the clock stops at 10:00', () => {
  const g = mk(7); g.startRound1();
  const t0 = g.state.clock; for (const id of g.world.order.report) g.open(id); g.open('cal'); g.open('team');
  assert.equal(g.state.clock, t0, 'opening costs nothing');
  for (let i = 0; i < 400; i++) g.tickClock();
  assert.equal(g.state.clock, g.world.day.meetingAt);
});

test('flag limits and validation', () => {
  const g = mk(7); g.startRound1();
  const sigs = Object.values(g.world.signals).filter((s) => flaggable(g, s.id)).map((s) => s.id);
  assert.equal(g.flag({ signals: [sigs[0]], source: flaggable(g, sigs[0]) }), null, 'needs an answer or words');
  for (let i = 0; i < 7; i++) g.flag({ signals: [sigs[i]], source: flaggable(g, sigs[i]), choice: g.answers(sigs[i])[0].id });
  assert.equal(g.state.flags.length, g.MAX_FLAGS);
});

test('Wake is fair: same data, nothing invented, everything it uses was on the desk', () => {
  for (const seed of SEEDS) {
    const g = mk(seed, SHELL_ORDER[seed % 5], 'partner'); g.startRound1();
    const w = g.world;
    for (const f of w.findings) for (const id of f.evidence) {
      const srcs = w.signals[id].sources;
      assert.ok(srcs.length, id + ' lives somewhere');
      assert.ok(srcs.some((s) => !w.sources[s].arrives), id + ' was available at 7:48');
    }
    g.flag({ signals: [coreSig(g, w.findings[0])], source: flaggable(g, coreSig(g, w.findings[0])), choice: g.answers(coreSig(g, w.findings[0]))[0].id });
    g.flag({ signals: [coreSig(g, w.findings[1])], source: flaggable(g, coreSig(g, w.findings[1])), choice: g.answers(coreSig(g, w.findings[1]))[0].id });
    g.flag({ signals: [coreSig(g, w.findings[2])], source: flaggable(g, coreSig(g, w.findings[2])), choice: g.answers(coreSig(g, w.findings[2]))[0].id });
    g.submitRound1();
    const b = g.startRound2();
    assert.equal(b.cards.filter((c) => !c.routine).length, w.findings.length);
  }
});

test('putting a text through sharpens the right card', () => {
  for (const seed of SEEDS) {
    const g = mk(seed, SHELL_ORDER[seed % 5], 'coo'); g.startRound1();
    for (const f of g.world.findings.slice(0, 3)) { const s = coreSig(g, f); g.flag({ signals: [s], source: flaggable(g, s), choice: g.answers(s)[0].id }); }
    g.submitRound1(); g.startRound2();
    for (const id of g.world.phone) {
      const r = g.putThrough(id); assert.ok(r);
      if (r.finding) assert.ok(r.briefing.cards.find((c) => c.id === r.finding).sharpened.length >= 1, 'sharpened ' + id);
    }
  }
});

test('all shells, roles and sizes play through cleanly', () => {
  let seed = 200;
  for (const shell of SHELL_ORDER) for (const role of ROLE_ORDER) for (let k = 0; k < 4; k++) {
    const g = mk(seed++, shell, role); g.startRound1();
    for (const f of g.world.findings.slice(0, 3)) { const s = coreSig(g, f); g.flag({ signals: [s], source: flaggable(g, s), choice: g.answers(s)[2].id, owner: g.world.owners[k] }); }
    invariants(g, finish(g, { through: g.world.phone }), shell + '/' + role + '/' + seed);
    const all = JSON.stringify(Object.values(g.world.sources).map((s) => [s.title, s.body, s.blocks, s.tiles, s.today, s.weeks, s.note, s.list]));
    assert.ok(!/\{[A-Za-z]+\}/.test(all) && !/undefined|NaN|—/.test(all), 'clean desk text for ' + shell + '/' + role);
  }
});

test('round 2: picks, trace, arrivals, and the inbox Wake already read', () => {
  const g = mk(12, 'multi', 'coo'); g.startRound1();
  for (const f of g.world.findings.slice(0, 3)) { const s = coreSig(g, f); g.flag({ signals: [s], source: flaggable(g, s), choice: g.answers(s)[0].id }); }
  g.submitRound1(); g.startRound2();
  const ins = g.insights();
  assert.ok(ins.every((i) => i.sources.length >= 1 && i.owners.length >= 1 && i.headline && i.action));
  for (const i of ins) for (const src of i.sources) {
    const t = g.trace(src.key);
    assert.ok(t.source.title && t.excerpt && t.reading, 'trace for ' + src.key);
    if (t.excerpt.kind === 'report') assert.ok(t.excerpt.rows.some((r) => r.some((c) => c.hl)), 'the traced line is highlighted');
  }
  assert.equal(g.lockRound2(), false, 'cannot lock with fewer than 3');
  for (const i of ins) g.pick(i.id);
  assert.equal(g.state.picked.length, 5, 'no more than 5');
  g.pick(ins[0].id); assert.equal(g.state.picked.length, 4, 'unpick works');
  const fired = []; for (let i = 0; i < 200; i++) fired.push(...g.tickWake().fired);
  assert.equal(g.state.wakeClock, g.world.day.meetingAt);
  assert.ok(fired.length >= 3, 'the morning still arrives');
  const inbox = g.listR2('email');
  assert.ok(inbox.some((e) => e.tags.length), 'emails Wake used are tagged with their insight');
  for (const x of ['x_forecast', 'x_pacing', 'x_brief']) { const v = g.openR2(x); assert.ok(v && (v.blocks || v.memo)); }
  assert.ok(g.lockRound2());
  assert.equal(g.meetingWake().items.length, 4);
});

test('quick mode: the autopilot plays a typical morning and meeting, then the Wake round runs as usual', () => {
  for (const shellId of SHELL_ORDER) for (const roleId of ROLE_ORDER) {
    const g = mk(11, shellId, roleId);
    assert.ok(g.autopilotRound1(), shellId + '/' + roleId + ' submits');
    assert.equal(g.state.flags.length, g.MIN_FLAGS);
    g.startRound2();
    for (let i = 0; i < 30; i++) g.tickWake();
    for (const x of g.insights().slice(0, Math.min(5, g.world.findings.length))) g.pick(x.id);
    assert.ok(g.lockRound2());
    const Y = g.autopilotMeeting();
    assert.ok(g.meetingStep().done && Y.items.length >= 1);
    const K = g.meetingWake(); g.presented('wake');
    assert.ok(K.decided >= Y.items.filter((x) => x.decision === 'decided').length);
    g.week(); g.recap(); g.complete();
    assert.equal(g.session().mode, 'quick');
  }
});
