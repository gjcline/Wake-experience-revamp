// PATH TESTS
// Plays the two-round game headlessly through paths A to J, across every shell and role,
// and checks the invariants that make the experience credible and the comparison fair.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/engine/game.js';
import { intentsOf, judgeFlag } from '../src/engine/judge.js';
import { SHELL_ORDER } from '../src/content/shells.js';
import { ROLE_ORDER } from '../src/content/roles.js';
import * as B from '../src/content/business.js';
import * as R from '../src/content/rounds.js';

let tick = 0;
const mk = (shellId = 'service', roleId = 'coo') => createGame({ shellId, roleId, now: () => (tick += 3000), sessionId: 'test' });
const SRC = (sig) => B.SOURCES.find((s) => (s.sections ? s.sections.flatMap((x) => x.lines) : s.signals || []).includes(sig) && !s.arrives).id;

function play(g, s) {
  g.startRound1();
  for (let i = 0; i < (s.minutes ?? 60); i++) g.tickClock();
  for (const src of s.open || []) if (g.state.sources[src] && g.state.sources[src].available) g.open(src);
  for (const [sig, text, owner] of s.flags) { g.open(SRC(sig)); assert.ok(g.flag({ signals: [sig], source: SRC(sig), text, owner }), 'flag ' + sig); }
  if (s.edit) s.edit(g);
  assert.ok(g.submitRound1(), 'submits');
  const b = g.startRound2();
  for (const id of s.through || []) g.putThrough(id);
  if (s.reorder) g.moveWake(b.cards[4].id, -1);
  for (const c of b.cards) g.assign(c.id);
  assert.ok(g.briefing().ready);
  g.lockRound2();
  const d = g.delivery(); g.presented('yours'); g.presented('wake');
  const wk = g.week();
  const rc = g.recap();
  g.complete();
  return { b, d, wk, rc };
}

function invariants(g, out, name) {
  const { b, d, wk, rc } = out;
  assert.equal(g.state.phase, 'complete');
  assert.ok(g.state.clock <= g.world.day.meetingAt, name + ': clock never passes 10:00');
  assert.equal(b.cards.length, 5, name + ': five Wake priorities');
  assert.equal(b.filtered.length, 4, name + ': four false alarms filtered');
  for (const c of b.cards) assert.ok(c.evidence.length >= 4 && c.owners.length >= 1 && new Set(c.evidence.map((e) => e.system)).size >= 2, name + ': card ' + c.id + ' is cross-system and owned');
  assert.equal(d.yours.length, g.state.flags.length);
  for (const y of d.yours) assert.ok(y.reactions.length >= 1 && y.statusLabel, name + ': every finding gets a reaction in the room');
  assert.equal(d.tally.wake.handed, 5, name + ': Wake briefing lands cleanly');
  assert.equal(wk.filter((r) => !r.extra).length, 5, name + ': the week covers every priority');
  for (const r of wk) assert.ok(r.you.text && r.wake.text && r.label, name + ': week row complete');
  assert.ok(rc.moment.title && rc.moment.lines.length >= 2 && rc.closer);
  const text = JSON.stringify([b, d, wk, rc.stats, rc.moment, rc.closer]) + rc.report.toText() + rc.report.toHTML();
  assert.ok(!/\{[A-Za-z]+\}/.test(text), name + ': unresolved token ' + (text.match(/\{[A-Za-z]+\}/) || [''])[0]);
  assert.ok(!text.includes('—') && !text.includes('undefined') && !text.includes('NaN'), name + ': clean text');
  assert.ok(!/\b(F[1-5]|falseAlarm|offTarget|counter)\b/.test(rc.report.toText()), name + ': no internal labels in the report');
  const types = new Set(g.tracker.log.map((e) => e.type));
  for (const t of ['session_start', 'round1_started', 'flag_added', 'round1_submitted', 'round2_started', 'wake_assigned', 'round2_locked', 'presented_yours', 'presented_wake', 'week_played', 'recap_viewed', 'session_complete']) assert.ok(types.has(t), name + ': log has ' + t);
  const sum = g.session().summary;
  assert.equal(sum.flags.length, g.state.flags.length);
}

const ALL = B.SOURCES.filter((s) => !s.arrives).map((s) => s.id).concat(['loc_L1', 'loc_L2', 'loc_L3', 'loc_L4', 'loc_L5', 'loc_L6']);

const PATHS = {
  A_found_early: { flags: [['sch.template.L4', 'Derek, move master tech coverage back to the afternoon peak this week', 'derek'], ['eml.quote.L2', 'Approve the replacement quote today', 'marcus'], ['ap.var', 'Dispute the invoices against the contract rate', 'dev']] },
  B_major_ignored: { open: ['eml_it', 'eml_party', 'cal'], flags: [['eml.angry.L3', 'Call the customer and apologize', 'aiko'], ['fin.uniform', 'Why did uniforms cost so much', null], ['fin.cash', 'Freeze discretionary spending', 'dev']] },
  C_labor: { flags: [['fin.labor.L4', 'Cut Riverside hours by 10 percent starting tomorrow', 'derek'], ['pay.ot.L5', 'Cap overtime at Ashford', 'noor'], ['sch.post.L6', 'Post schedules a week ahead at Tanner Creek', 'eli']] },
  D_financial: { flags: [['fin.mat.all', 'Raise prices 2% to cover parts', 'dev'], ['fin.cash', 'Check what moved cash this week', 'dev'], ['fin.rev.L3', 'Get a recovery plan from Kingsley', 'aiko']] },
  E_customer: { flags: [['cx.followup.L1', 'Restart follow-up calls this week with central office cover', 'grace'], ['cx.sat.L4', 'Find out why Riverside satisfaction dropped', 'derek'], ['mkt.promo.L1', 'Roll the offer out to all shops', 'colin']] },
  F_aggressive: { flags: [['fin.labor.L4', 'Cut hours', null], ['hr.exits.L6', 'Raise starting pay at Tanner Creek', 'renee'], ['msg.record.L5', 'Congratulate the Ashford team', 'noor'], ['fin.rev.L3', 'Send Tom to Kingsley tomorrow', 'tom']] },
  G_conservative: { flags: [['mnt.down.L2', 'Look into the downtime and report back Friday', 'marcus'], ['lab.util.L4', 'Review where the hours are going', 'marisol'], ['hr.req.L6', 'Monitor Tanner Creek hiring', 'renee']] },
  H_minimal: { minutes: 2, flags: [['fin.labor.L4', 'fix it', null], ['fin.rev.L3', 'why', null], ['eml.angry.L3', 'handle', null]] },
  I_extensive: { minutes: 132, open: ALL, through: R.PHONE, reorder: true, flags: [['sch.template.L4', 'Move master tech coverage back to afternoons and hold the hires', 'derek'], ['eml.quote.L2', 'Approve the $38,400 replacement today, plan overflow with Noor', 'marcus'], ['cx.followup.L1', 'Restart follow-up calls with central office cover', 'grace'], ['ap.var', 'Dispute six weeks of invoices', 'dev'], ['hr.exitnote.L6', 'Post schedules a week ahead, send Ines to help', 'eli']] },
  J_changes_mind: { flags: [['fin.labor.L4', 'Cut Riverside hours 10%', 'derek'], ['eml.angry.L3', 'Call the customer', 'aiko'], ['fin.uniform', 'Check uniform spend', 'dev'], ['eml.quote.L2', 'Approve the replacement', 'marcus']],
    edit: (g) => { const f = g.state.flags[0]; g.editFlag(f.id, { text: 'Move master tech coverage back to the afternoons' }); g.removeFlag(g.state.flags[2].id); g.moveFlag(g.state.flags[2].id, -1); } },
};

for (const [name, script] of Object.entries(PATHS)) {
  test('path ' + name, () => { const g = mk(); invariants(g, play(g, script), name); });
}

test('expected outcomes', () => {
  const run = (n) => { const g = mk(); const o = play(g, PATHS[n]); return { o, g, by: Object.fromEntries(o.wk.map((r) => [r.id, r.you.handled])) }; };
  const A = run('A_found_early'); assert.equal(A.by.F1, 'aligned'); assert.equal(A.by.F2, 'aligned'); assert.equal(A.by.F4, 'aligned'); assert.equal(A.o.d.tally.yours.handed, 3);
  const Bx = run('B_major_ignored'); assert.equal(Bx.by.F1, 'untouched'); assert.equal(Bx.o.d.tally.yours.handed, 0); assert.equal(Bx.o.rc.stats.you.real, 0);
  const C = run('C_labor'); assert.equal(C.by.F1, 'counter'); assert.equal(C.by.F5, 'aligned'); assert.equal(C.o.d.yours[0].status, 'pushback');
  const D = run('D_financial'); assert.equal(D.by.F4, 'counter'); assert.equal(D.o.d.yours[1].status, 'explained');
  const E = run('E_customer'); assert.equal(E.by.F3, 'aligned'); assert.equal(E.by.F1, 'partial');
  const F = run('F_aggressive'); assert.equal(F.by.F5, 'counter'); assert.equal(F.by.F2, 'counter'); assert.ok(F.o.d.yours[0].reactions.some((r) => /Who's taking/.test(r.line)), 'no owner is called out');
  const G = run('G_conservative'); assert.equal(G.by.F2, 'partial'); assert.equal(G.by.F1, 'partial'); assert.equal(G.o.d.tally.yours.questions, 3);
  const H = run('H_minimal'); assert.ok(H.o.d.yours[0].reactions.length >= 2, 'vague and unowned get called out');
  const I = run('I_extensive'); for (const f of ['F1', 'F2', 'F3', 'F4', 'F5']) assert.equal(I.by[f], 'aligned'); assert.equal(I.o.rc.moment.title, 'You found all five.');
  const J = run('J_changes_mind'); assert.equal(J.by.F1, 'aligned');
});

test('intent mapping reads plain operator language', () => {
  const has = (t, i) => assert.ok(intentsOf(t).includes(i), t + ' → ' + i);
  has('Cut Riverside hours by 10%', 'cut'); has('Approve the two hires', 'hire'); has('Move coverage to the afternoon', 'schedule');
  has('Look into why overtime doubled', 'investigate'); has('Approve the replacement quote', 'replace'); has('Dispute the invoices', 'dispute');
  has('Restart follow-up calls', 'followup'); has('Roll the offer out to all shops', 'promoMore'); has('Post schedules a week ahead', 'posting');
  assert.ok(!intentsOf('Basket of tasks').includes('investigate'), 'no false match inside words');
});

test('round 1 has no time cost and the clock stops at 10:00', () => {
  const g = mk(); g.startRound1();
  const before = g.state.clock; g.open('rep_fin'); g.open('rep_labor'); assert.equal(g.state.clock, before, 'opening costs nothing');
  for (let i = 0; i < 300; i++) g.tickClock();
  assert.equal(g.clockLabel(), '10:00 AM');
  assert.equal(g.state.sources.msg_tom.available, true, 'pings arrive over the morning');
});

test('flag limits: at least 3 to submit, at most 5', () => {
  const g = mk(); g.startRound1();
  g.flag({ signals: ['fin.cash'], source: 'rep_fin', text: 'check it' }); assert.equal(g.submitRound1(), false);
  for (const s of ['fin.rev.L1', 'fin.rev.L2', 'fin.rev.L3', 'fin.rev.L4', 'fin.rev.L5']) g.flag({ signals: [s], source: 'rep_fin', text: 'look' });
  assert.equal(g.state.flags.length, 5);
});

test('putting a text through Wake sharpens the right card', () => {
  const g = mk(); play(g, { flags: PATHS.A_found_early.flags });
  const g2 = mk(); g2.startRound1(); for (const [sig, t, o] of PATHS.A_found_early.flags) g2.flag({ signals: [sig], source: SRC(sig), text: t, owner: o }); g2.submitRound1(); g2.startRound2();
  const r = g2.putThrough('msg_eli'); assert.equal(r.finding, 'F5');
  const c = r.briefing.cards.find((x) => x.id === 'F5'); assert.ok(c.owners.some((o) => o.key === 'ines') && c.sharpened.length === 1);
  const r2 = g2.putThrough('msg_marcus'); assert.ok(r2.briefing.cards.find((x) => x.id === 'F2').urgent);
  const r3 = g2.putThrough('msg_aiko'); assert.equal(r3.finding, null);
});

test('determinism and no cheating', () => {
  const a = play(mk(), PATHS.C_labor), b = play(mk(), PATHS.C_labor);
  assert.deepEqual(a.wk, b.wk); assert.deepEqual(a.d.tally, b.d.tally);
  const strip = (x) => x.b.cards.map((c) => [c.id, c.headline, c.evidence.map((e) => [e.key, e.value])]);
  assert.deepEqual(strip(play(mk(), PATHS.H_minimal)), strip(play(mk(), PATHS.I_extensive)));
  const base = new Set(B.SOURCES.filter((s) => !s.arrives).flatMap((s) => s.sections ? s.sections.flatMap((x) => x.lines) : s.signals));
  for (const f of B.FINDINGS) for (const id of f.evidence) assert.ok(base.has(id), id + ' was on the desk at 7:48 AM');
  for (const [, b] of Object.entries(R.BRIEFING)) for (const id of b.keys) assert.ok(base.has(id), id + ' briefing evidence was on the desk');
  for (const [id, q] of Object.entries(R.QUIET)) assert.ok(B.FINDINGS.find((f) => f.id === id).evidence.includes(q));
});

test('every shell and role produces a clean, complete run', () => {
  for (const shell of SHELL_ORDER) for (const role of ROLE_ORDER) {
    const g = mk(shell, role);
    invariants(g, play(g, PATHS.F_aggressive), shell + '/' + role);
    const worldText = JSON.stringify([g.world.sources, g.world.signals, g.world.findings, g.world.briefing, g.world.reactions, g.world.weekText, g.world.sharpen, g.world.role, g.world.characters]);
    assert.ok(!/\{[A-Za-z]+\}/.test(worldText), shell + '/' + role + ' token ' + (worldText.match(/\{[A-Za-z]+\}/) || [''])[0]);
    assert.ok(!worldText.includes('—'));
  }
});

test('judging a false alarm checked versus reacted', () => {
  const g = mk();
  assert.equal(judgeFlag(g.world, { signals: ['fin.cash'], text: 'Check what moved cash', owner: 'dev' }).handling, 'checked');
  assert.equal(judgeFlag(g.world, { signals: ['fin.cash'], text: 'Freeze spending now', owner: 'dev' }).handling, 'react');
});
