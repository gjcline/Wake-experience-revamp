// FINALE ENGINE
// The meeting, the week and the final score. Deterministic for a seed and a set of answers.
//
// The meeting. The room asks what any leadership team asks: what is driving it, what it is
// costing us, who owns it, and how we will know. On your own, what you brought decides what
// you can answer on the spot. What you cannot answer becomes a follow-up, and every follow-up
// pushes the action back a day. With Wake, the same questions get answered in the room.
//
// The week. Monday afternoon to Friday, both plans run against the same company. Each problem
// has a measure, a weekly value in this company's own numbers, and what happens when nobody
// is assigned (people on site still fix what they can see). The scoreboard tracks profit
// impact, run-rate added, problems resolved, time to action, team hours and open follow-ups.

import { createMeeting, MOVED } from './meeting.js';
import { createLenderCall } from './lender.js';

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const money = (v) => (v < 0 ? '-$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const round1 = (x) => Math.round(x * 10) / 10;
const round2 = (x) => Math.round(x * 100) / 100;
const OPENING = 3, PRESENT = 2, WAKE_ITEM = 2;
const NEXT_WEEK = 9;
// How far Wake carries a problem this week: one you handed off, one it only flagged to its owner.
// Tuned so Wake reads as a believable step up on a good team (see test/audit.mjs).
const WAKE_DONE = 0.95, WAKE_ALERT = 0.55;
// New problems a quarter of attention finds each week, as a share of this week's pool.
const NEW_RATE = 0.08;
// A fix started this week wins back only part of a problem's weekly cost before Friday (and
// part of its yearly value in the run-rate): the leak slows before it stops. Applies to both plans.
const REALIZE = 0.5;
const hash = (s) => { let x = 2166136261; for (const ch of String(s)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };

export function createFinaleEngine({ world, state, rec, person, insight }) {
  const t = world.t, model = world.model, fin = world.fin;
  const first = (k) => (k === 'me' ? 'You' : (world.characters[k] ? world.characters[k].name.split(' ')[0] : ''));
  const who = (k) => { const p = person(k); return { key: k, name: p.name, first: first(k), title: p.title }; };
  const inRoom = (k) => world.central.includes(k) || world.locations.some((L) => L.manager === k);
  const topicOf = (fid) => { const f = world.findingById[fid]; return t(f.topic).toLowerCase(); };
  const placeOf = (fid) => { const f = world.findingById[fid]; return world.shell.multi && f.loc ? world.locById[f.loc].name : ''; };
  const ownerOf = (fid) => (world.briefing[fid] ? world.briefing[fid].owner[0] : 'opsdir');
  const thu = world.sources.x_brief ? world.sources.x_brief.title.replace(/^Brief for /, '') : 'Thursday\'s review';
  if (!state.meet) state.meet = { answers: {} };
  const ctrlKey = 'controller';
  const lc = (x) => (x ? x.charAt(0).toLowerCase() + x.slice(1) : x);

  // ============================================================ YOUR MEETING
  // The meeting director (meeting.js) runs the room. These are the entry points.
  const M = createMeeting({ world, state, person });
  const step = () => M.step();
  const answer = (id, optId) => { const r = M.answer(id, optId); if (r) rec('meeting_answer', { q: id, effect: r.effect }); else rec('meeting_answer', { q: id }); return r; };
  // the call with your lender (world.moment 'lender') is the same outcomes on a call: its own
  // script, its own clock, three people on the line instead of a room
  const LC = world.moment === 'lender' ? createLenderCall({ world, who }) : null;
  const onCall = (r, c) => {
    r.call = c; r.minutes = c.minutes; r.attendees = c.attendees; r.hours = c.hours;
    for (const it of r.items) { const x = c.items.find((y) => y.n === it.n); if (x) it.minutes = x.minutes; }
    return r;
  };
  const yours = () => { const r = M.result(); return LC ? onCall(r, LC.yours(r, M.agenda())) : r; };
  // the prep each meeting needed: from 7:48 AM to the moment the briefing was locked in
  const prep = () => ({ you: Math.max(0, (state.submittedAt || 600) - 468), wake: Math.max(0, (state.wakeDoneAt || 468) - 468) });

  // ============================================================ WAKE'S MEETING
  function wake() {
    const items = state.wakeOrder.map((id, i) => {
      const c = insight(id), fid = world.findingById[id] ? id : null, Mo = fid ? model[fid] : null;
      const owner = who(c.owners[0].key);
      const qs = [];
      if (fid) {
        const [wk, wl] = Mo.q.why, [ck, cl] = Mo.q.cost;
        qs.push({ type: 'why', asker: { ...who(wk), line: wl }, answer: c.why, chips: c.keys.slice(0, 4).map((k) => ({ sys: k.system, label: k.label })) });
        qs.push({ type: 'cost', asker: { ...who(ck), line: cl }, answer: Mo.costLine });
      } else {
        qs.push({ type: 'why', asker: { ...who('opsdir'), line: 'Why is this one on the list?' }, answer: c.why, chips: c.keys.slice(0, 3).map((k) => ({ sys: k.system, label: k.label })) });
      }
      return { n: i + 1, id, fid, routine: !fid, headline: c.headline, action: c.action, check: c.check, place: c.place, owners: c.owners.map((o) => who(o.key)), owner, onIt: world.briefing[id].onIt, qs, minutes: WAKE_ITEM, systems: c.systems, signals: c.signals };
    });
    const asked = items.reduce((n, x) => n + x.qs.length, 0) + 1;
    const watch = items.length;
    const wrap = { asker: { ...who('opsdir'), line: 'How will we know any of this is working before ' + thu + '?' }, answer: watch + ' numbers on watch, checked daily. Each owner gets an alert if theirs drifts.' };
    const people = new Set(items.flatMap((x) => x.owners.map((o) => o.key))).size;
    const minutes = OPENING + items.length * WAKE_ITEM + 1, attendees = world.central.length + world.locations.length + 1;
    const res = { items, wrap, minutes, attendees, hours: Math.round(minutes * attendees / 6) / 10, asked, answered: asked, decided: items.length, ownerDate: items.length, real: items.length, deferred: 0, ious: 0, people };
    return LC ? onCall(res, LC.wake(res)) : res;
  }

  // ============================================================ AFTER THE MEETING
  function after() {
    const Y = yours(), Wk = wake(), boss = world.boss || 'your boss';
    const mine = LC
      ? Y.call.lines.filter((l) => l.owe).map((l) => ({ who: who('me'), what: l.owe, hrs: 0.5, day: 0 })).concat([{ who: who('me'), what: 'Write up the call and brief the team on what you told the bank', hrs: 0.5, day: 0 }])
      : [{ who: who('me'), what: 'Write up the meeting notes and send them round', hrs: 0.5, day: 0 }];
    Y.tasks.filter((x) => x.kind !== 'self').forEach((x) => mine.push({ who: who(x.who), what: x.what, hrs: x.hrs, day: x.day || 1, kind: x.kind }));
    mine.push({ who: who('me'), what: 'Build ' + thu + ' brief for ' + (LC ? LC.L.first + ' at the bank' : boss), hrs: 2, day: 2 });
    if (Y.wrap === 'manual') mine.push({ who: who('me'), what: 'Check in with each owner on Wednesday', hrs: Math.max(0.5, Math.round(0.25 * Y.items.filter((x) => x.kind === 'finding').length * 2) / 2), day: 2 });
    for (const x of Y.tasks) if (x.kind === 'self') mine.push({ who: who('me'), what: x.what, hrs: 3, day: 1 });
    if (Y.trackerHours) mine.push({ who: who('me'), what: 'Build the tracker and send it round', hrs: Y.trackerHours, day: 1 });
    const holds = (world.sources.cal.wakeToday || []).filter((h) => (h.id === 'ev_w_eq' && state.wakeOrder.includes('F2')) || (h.id === 'ev_w_ap' && state.wakeOrder.includes('F4')));
    const done = [
      { at: '10:15 AM', what: 'Decisions, owners and due dates sent to ' + Wk.people + (Wk.people === 1 ? ' person' : ' people') },
      { at: '10:15 AM', what: Wk.items.length + ' tasks in owners\' queues, each with its number to watch' },
      { at: '10:16 AM', what: Wk.items.length + ' measures on daily watch, with alerts to each owner' },
      { at: '10:16 AM', what: thu.charAt(0).toUpperCase() + thu.slice(1) + ' brief for ' + (LC ? LC.L.first + ' at ' + LC.L.bank : boss) + (LC ? ' sent, with today\'s numbers' : ' updated with today\'s decisions') },
    ].concat(holds.map((h) => { const hh = parseInt(h.start, 10); return { at: h.start + (hh >= 7 && hh < 12 ? ' AM' : ' PM'), what: t(h.title) + ', on the calendar' }; }));
    return { mine, done, hours: round1(mine.reduce((n, x) => n + x.hrs, 0)) };
  }

  // ============================================================ THE WEEK
  // How hard each plan pushes each problem, day by day. p is the share of the fix in place.
  function curve(fid, plan) {
    const Mo = model[fid], ramp = Mo.metric.ramp;
    // with the numbers attached, the owner skips the first day of figuring it out
    const at = (start, e, d) => (d < start ? 0 : e * ramp[Math.min(4, d - start + (plan.fast || 0))]);
    const act = plan.mode === 'aligned' || plan.mode === 'alert' ? { start: plan.s, e: plan.mult }
      : plan.mode === 'partial' ? { start: plan.s + 2, e: 0.9 * plan.mult, look: plan.s }
        : plan.mode === 'unclear' ? { start: plan.s, e: 0.4 * plan.mult }
          : plan.mode === 'counter' ? { start: plan.s, e: fid === 'F4' || fid === 'F5' ? -0.01 : -0.15 } : { start: NEXT_WEEK, e: 0 };
    // agreed in the room ahead of the numbers: the first step starts Tuesday at part strength
    if (plan.pre && act.e > 0 && plan.pre.start < act.start) act.pre = { start: plan.pre.start, e: plan.pre.e };
    const sq = fid === teamFix() ? { ...Mo.sq, e: 0.9, s: 1, team: true, text: teamText(fid, Mo) } : Mo.sq;
    return { act, sq, p: DAYS.map((_, d) => {
      const a = Math.max(at(act.start, act.e, d), act.pre ? at(act.pre.start, act.pre.e, d) : 0);
      // a move against the grain sets things back, but the people on site still do part of what they can see
      const own = sq.e ? at(sq.s, sq.e, d) : 0;
      return act.e < 0 ? round2(at(act.start, act.e, d) + own * 0.7) : Math.max(a, own);
    }) };
  }
  // A good company fixes some things without being told. The most visible problem on site gets
  // handled by the people who see it every day, so on your own something is always resolved.
  // It is never one the room just sent the wrong way: the team can't fix what leadership redirected.
  let team, teamKey;
  function teamFix() {
    const key = Object.keys((state.meet && state.meet.answers) || {}).length;
    if (team !== undefined && teamKey === key) return team;
    const off = new Set(yours().items.filter((x) => x.kind === 'finding' && x.handling === 'counter').map((x) => x.fid));
    const order = ['F2', 'F1', 'F5', 'F3'].filter((f) => model[f] && model[f].sq && model[f].sq.e > 0);
    const first3 = order.filter((f) => f !== 'F3'), pool = first3.filter((f) => !off.has(f));
    const can = pool.length ? pool : order.filter((f) => !off.has(f));
    // the most visible is the one that costs the most where people can see it
    const worth = (f) => (f === 'F2' ? model.F2.weekly * fin.cm : f === 'F5' ? model.F5.perExit : model[f].weekly) * (1 + (hash(world.seed + f) % 10) / 100);
    team = can.length ? can.slice().sort((x, y) => worth(y) - worth(x))[0] : null; teamKey = key;
    return team;
  }
  const teamText = (fid, Mo) => (fid === 'F3' ? t('The front desk' + (placeOf(fid) ? ' at ' + placeOf(fid) : '') + ' restarts the {followup} on its own.') : Mo.sq.text);
  const fmtM = (Mo, v) => { const u = Mo.metric.unit; return u === '$' ? money(v) : u === 'count' ? (v === 1 ? '1 exit' : v + ' exits') : u === '%' ? v + '%' : u === 'hrs' && v === 1 ? '1 hr' : v + ' ' + u; };
  const okAt = (Mo, m, p) => { const o = Mo.metric.ok; return p > 0 && (o.op === 'le' ? m <= o.v : o.op === 'ge' ? m >= o.v : p >= o.v); };

  function lane(fid, plan, side) {
    const Mo = model[fid], met = Mo.metric, cm = fin.cm;
    const { act, sq, p } = curve(fid, plan);
    const days = [];
    let credit = 0;
    DAYS.forEach((_, d) => {
      const pd = p[d], prevPath = met.path ? (d ? met.path[d - 1] : 0) : 0;
      let m;
      if (met.path) m = pd >= 0 ? Math.round(met.path[d] * (1 - pd)) : met.path[d];
      else { const drift = met.start + (met.drift || 0) * d; m = Math.round(drift + (met.target - drift) * pd); }
      let cost = 0, revenue = 0, cr = 0;
      if (fid === 'F1') cost = Mo.weekly / 7 * pd * (d === 0 ? 0.5 : 1);
      if (fid === 'F2') revenue = (met.path[d] - prevPath) * Mo.weekly / 13 * pd;
      if (fid === 'F3') revenue = d === 0 ? 0 : Mo.weekly / 4 * pd;
      if (fid === 'F4') { cost = (met.path[d] - prevPath) * pd; if (act.e >= 0.85 && d === act.start + 3) { cr = Mo.credit; credit = cr; } }
      if (fid === 'F5') cost = pd < 0 ? Mo.weekly / 7 * pd : d === 4 && met.path[4] && m === 0 ? Mo.perExit : 0;
      const profit = (cost + revenue * cm) * REALIZE; // operating; a one-time recovery is kept in `credit`
      const ok = okAt(Mo, m, pd);
      const waiting = plan.mode !== 'none' && d < act.start && !(act.pre && d >= act.pre.start);
      const status = ok ? 'fixed' : pd < 0 ? 'worse' : pd > 0 ? 'working' : waiting ? 'waiting' : 'open';
      const lines = [];
      if (act.pre && d === act.pre.start) lines.push({ t: 'Agreed Monday, started ahead of the numbers: ' + lc(Mo.act.aligned), k: 'act' });
      if (plan.mode === 'partial' && d === act.look) lines.push({ t: Mo.act.partial, k: 'act' });
      if (plan.mode === 'alert' && d === act.start) lines.push({ t: 'Wake flagged it to ' + first(ownerOf(fid)) + ' at 7:48 AM, with the numbers. ' + Mo.act.aligned, k: 'act' });
      if (plan.mode !== 'none' && plan.mode !== 'alert' && d === act.start) lines.push({ t: plan.mode === 'counter' ? (Mo.act.counter[plan.key] || Mo.act.unclear)
        : plan.mode === 'partial' ? 'Findings back. ' + Mo.act.aligned
          : plan.waited ? (act.pre ? 'Numbers are back. Full plan under way.' : 'Numbers are back. Decided: ' + lc(Mo.act[plan.mode])) : Mo.act[plan.mode], k: plan.mode === 'counter' ? 'bad' : 'act' });
      if (sq.e && d === sq.s && (act.e < 0 || sq.e > (act.start <= d ? act.e : 0))) lines.push({ t: sq.text, k: 'info' });
      if (fid === 'F2' && d === 3) lines.push(pd >= 0.5 ? { t: Mo.fail.held, k: 'good' } : { t: Mo.fail.lost, k: 'bad' });
      if (fid === 'F4' && cr) lines.push({ t: Mo.creditText, k: 'good' });
      if (fid === 'F5' && d === 4) lines.push(m === 0 ? { t: Mo.exit.held, k: 'good' } : { t: Mo.exit.lost, k: 'bad' });
      days.push({ m, shown: fmtM(Mo, m), p: round1(pd), status, cost: Math.round(cost), revenue: Math.round(revenue), credit: cr, profit: Math.round(profit), lines });
    });
    if (fid === 'F4' && act.e >= 0.85 && act.start <= 4 && act.start + 3 > 4) days[4].lines.push({ t: 'Credit of ' + money(Mo.credit) + ' expected next week.', k: 'wait' });
    const sum = (k) => days.reduce((n, x) => n + x[k], 0);
    const pf = p[4];
    const run = Math.round(Mo.run * REALIZE * (pf < 0 ? pf / 2 : pf) / 100) * 100;
    const pending = plan.mode !== 'none' && act.start > 4 && !act.pre;
    return { side, mode: plan.mode, key: plan.key, start: act.start, first: act.pre ? act.pre.start : act.look !== undefined ? act.look : act.start, e: act.e, plan, days, profit: sum('profit'), revenue: sum('revenue'), cost: sum('cost'), credit, run,
      sq: sq.e || 0, status: pending ? 'waiting' : days[4].status, from: fmtM(Mo, met.path ? 0 : met.start), to: days[4].shown, series: [met.path ? 0 : met.start].concat(days.map((x) => x.m)) };
  }

  function plans() {
    const Y = yours();
    const youPlan = {};
    const rank = { aligned: 4, partial: 3, unclear: 2, counter: 1 };
    const first1 = (x) => Math.min(x.s, x.pre ? x.pre.start : 9);
    for (const it of Y.items) if (it.kind === 'finding' && it.decision !== 'dropped') {
      const mode = it.handling === 'aligned' ? 'aligned' : it.handling === 'counter' ? 'counter' : it.handling === 'partial' ? 'partial' : 'unclear';
      // on your own the owner works from the meeting notes, not the numbers: the first fix lands a little less precisely
      const plan = { mode, key: it.key, s: it.s, mult: Math.min(0.85, it.mult), item: it.n, pilot: it.pilot, waited: ['parked', 'next', 'agreed'].includes(it.decision) && it.s > 1, pre: it.pre };
      const prev = youPlan[it.fid];
      if (!prev || rank[mode] > rank[prev.mode] || (rank[mode] === rank[prev.mode] && first1(plan) < first1(prev))) youPlan[it.fid] = plan;
      // two items on one problem: whatever the room settled first still starts on time
      const best = youPlan[it.fid], other = best === plan ? prev : plan;
      if (other && best.mode !== 'counter' && other.mode !== 'counter' && first1(other) < first1(best) && !best.pre) best.pre = { start: first1(other), e: 0.4 * best.mult };
    }
    // With Wake, what you handed off starts Monday with the numbers attached. Everything else Wake
    // found stays on its watch: the owner gets the alert Tuesday and fits it in around the week,
    // so it moves, but not at full strength. Wake is a step up on a good team, not a miracle.
    const wakePlan = {};
    for (const f of world.findings) {
      const mine = youPlan[f.id], alert = { mode: 'alert', key: 'aligned', s: 1, mult: WAKE_ALERT };
      // never behind your own plan: what you decided in the room, Wake backs with the numbers a day sooner
      if (mine && ['aligned', 'partial'].includes(mine.mode)) { alert.mult = Math.max(WAKE_ALERT, Math.min(WAKE_DONE, mine.mult + 0.1)); alert.s = Math.min(1, mine.s); alert.fast = 1; }
      wakePlan[f.id] = state.wakeOrder.includes(f.id) ? { mode: 'aligned', key: 'aligned', s: 0, mult: WAKE_DONE, fast: 1 } : alert;
    }
    return { Y, youPlan, wakePlan };
  }

  function week() {
    const { Y, youPlan, wakePlan } = plans();
    const Wk = wake(), A = after();
    const rows = world.findings.map((f) => {
      const fid = f.id, Mo = model[fid];
      const you = lane(fid, youPlan[fid] || { mode: 'none', s: NEXT_WEEK, mult: 0 }, 'you');
      const wk = lane(fid, wakePlan[fid] || { mode: 'none', s: NEXT_WEEK, mult: 0 }, 'wake');
      return { id: fid, label: t(world.weekText[fid].label), place: placeOf(fid), loc: f.loc || null, topic: t(f.topic), metric: { label: Mo.metric.label, short: Mo.metric.short, unit: Mo.metric.unit, good: Mo.metric.good }, kind: Mo.kind, weekly: Mo.weekly, you, wake: wk };
    });
    // the small items Wake picked; on your own, about half still get done by someone
    const routine = state.wakeOrder.filter((id) => world.routineById[id]).map((id, i) => {
      const r = world.routineById[id];
      const yDone = (world.seed + i) % 2 === 0;
      return { id, label: t(r.topic) + ': ' + t(r.action).replace(/\.$/, ''), loc: r.loc || null, you: { done: yDone, day: yDone ? 4 : null, text: yDone ? 'Done Friday, after a reminder.' : 'Not raised. Still open.' }, wake: { done: true, day: 2, text: t(r.week[0]) } };
    });
    const busy = Y.items.filter((x) => x.decision === 'busy').map((x) => ({ label: x.what.label, hrs: x.tasks.reduce((n, k) => n + k.hrs, 0) }));

    // hours, follow-ups and the day logs
    const alerts = Object.values(wakePlan).filter((x) => x.mode === 'alert').length;
    const yHours = [0, 0, 0, 0, 0], wHours = [0.25, 0.25 + 0.1 * alerts, 0.5, 0.25, 0.25].map(round1);
    const yLog = DAYS.map(() => []), wLog = DAYS.map(() => []);
    A.mine.forEach((x) => {
      let d = x.day;
      d = Math.min(4, d);
      if (x.kind === 'keep') { yHours[1] += x.hrs / 2; yHours[2] += x.hrs / 2; yLog[1].push({ t: x.who.first + ' starts on: ' + x.what.toLowerCase() + '.', k: 'info' }); return; }
      if (/yourself$/.test(x.what)) { yHours[1] += 1; yHours[2] += 1; yHours[3] += 1; return; }
      yHours[d] += x.hrs;
      yLog[d].push({ t: (x.kind ? 'Follow-up · ' : '') + x.who.first + ': ' + x.what + ' (' + x.hrs + (x.hrs === 1 ? ' hr' : ' hrs') + ').', k: x.kind ? 'wait' : 'info' });
    });
    wLog[0].push({ t: '10:15 AM · Decisions, owners and due dates sent.', k: 'good' });
    const moved = (r, side, d, log) => {
      const L = r[side], a = d ? L.days[d - 1].m : L.series[0], b = L.days[d].m;
      if (a === b || L.days[d].p === 0) return;
      const better = r.metric.good === 'down' ? b < a : b > a;
      log[d].push({ t: (r.place ? r.place + ' · ' : '') + r.metric.short + ' ' + L.days[d].shown + (better ? ', improving.' : ', getting worse.'), k: better ? 'good' : 'bad' });
    };
    for (const r of rows) DAYS.forEach((_, d) => {
      for (const l of r.you.days[d].lines) yLog[d].push({ ...l, t: (r.place ? r.place + ' · ' : '') + l.t });
      for (const l of r.wake.days[d].lines) wLog[d].push({ ...l, t: (r.place ? r.place + ' · ' : '') + l.t });
      if (!['F2', 'F4', 'F5'].includes(r.id)) { moved(r, 'you', d, yLog); moved(r, 'wake', d, wLog); }
    });
    for (const r of routine) { if (r.wake.done) wLog[r.wake.day].push({ t: r.wake.text, k: 'good' }); if (r.you.done) yLog[4].push({ t: r.label + '. Done after a reminder.', k: 'info' }); }
    // the moment a problem is resolved, on either side
    for (const r of rows) for (const [side, log] of [['you', yLog], ['wake', wLog]]) {
      const ds = r[side].days, d = ds.findIndex((x, i) => x.status === 'fixed' && (i === 0 || ds[i - 1].status !== 'fixed'));
      if (d >= 0) log[d].push({ t: 'Resolved: ' + r.label + (r.place ? ' at ' + r.place : '') + '. ' + r.metric.short + ' ' + ds[d].shown + '.', k: 'win' });
    }
    // the business is good on its own: a day with nothing new is still a day the company ran well
    const V = world.shell.vocab, units = world.shell.multi ? 'all ' + world.shell.size + ' ' + V.units : 'the ' + V.unit;
    const STEADY = ['Business as usual across ' + units + '. Revenue on pace for a normal week.', 'Your managers run the day. ' + V.customers.charAt(0).toUpperCase() + V.customers.slice(1) + ' served, nothing dropped.', 'A steady day. Every ' + V.unit + ' open, staffed and on plan.', 'The team keeps the week moving. No new fires.', 'Normal day on the floor. The business does what it does well.'];
    DAYS.forEach((_, d) => { if (!yLog[d].some((l) => ['good', 'act', 'win'].includes(l.k))) yLog[d].unshift({ t: STEADY[(hash(world.seed + 'st') + d) % STEADY.length], k: 'base' }); });
    DAYS.forEach((_, d) => { if (d > 0) wLog[d].push({ t: 'Watch check: ' + rows.filter((r) => r.wake.days[d].status === 'fixed').length + ' of ' + rows.length + ' measures on target.', k: 'info' }); });

    const acted = (lanes) => lanes.filter((l) => l.mode !== 'none');
    // days from Monday's meeting to the first real action, for every problem the plan took on;
    // anything that does not start this week counts as five
    const tta = (side) => { const L = acted(rows.map((r) => r[side])); return L.length ? round1(L.reduce((n, l) => n + Math.min(5, l.first), 0) / L.length) : null; };
    const board = (side, hours) => {
      let cum = 0, cumH = 0, oneTime = 0;
      return DAYS.map((_, d) => {
        cum += rows.reduce((n, r) => n + r[side].days[d].profit, 0);
        oneTime += rows.reduce((n, r) => n + r[side].days[d].credit, 0);
        cumH += hours[d];
        const runRate = Math.round(rows.reduce((n, r) => { const p = r[side].days[d].p; return n + model[r.id].run * REALIZE * (p < 0 ? p / 2 : p); }, 0) / 100) * 100;
        const resolved = rows.filter((r) => r[side].days[d].status === 'fixed').length;
        const open = side === 'you' ? A.mine.filter((x) => x.kind && !['keep', 'watch', 'brief', 'self'].includes(x.kind) && x.day > d).length + Y.items.filter((x) => x.decision === 'next').length : 0;
        const small = side === 'wake' ? routine.filter((r) => r.wake.day <= d).length : routine.filter((r) => r.you.done && d >= 4).length;
        return { profit: Math.round(cum), oneTime, runRate, resolved, hours: round1(cumH), open, small };
      });
    };
    const you = board('you', yHours), wk = board('wake', wHours);
    rec('week_played', { you: you[4], wake: wk[4] });
    return { days: DAYS, rows, routine, busy, n: rows.length, tta: { you: tta('you'), wake: tta('wake') }, board: { you, wake: wk }, log: { you: yLog, wake: wLog }, meeting: { you: Y, wake: Wk }, after: A };
  }

  // ============================================================ THE FINAL SCORE
  function score() {
    const W = week(), Y = W.meeting.you, Wk = W.meeting.wake, n = W.n;
    const fy = W.board.you[4], fw = W.board.wake[4];
    const found = new Set(Y.items.filter((x) => x.kind === 'finding').map((x) => x.fid)).size;
    const fmtT = (x) => (x === null ? 'None this week' : x === 0 ? 'Same day' : x + (x === 1 ? ' day' : ' days'));
    const hrs = (x) => x + (x === 1 ? ' hr' : ' hrs');
    // every row says how far ahead the week ran with Wake, in the row's own units
    const dur = (m) => (m >= 60 ? Math.floor(m / 60) + ' hr' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min');
    const AHEAD = {
      ready: (d) => dur(Math.round(d)) + ' sooner', call: (d) => Math.round(d) + ' min shorter', found: (d) => '+' + d + ' found', room: (d) => round1(d) + ' hrs back', owned: (d) => '+' + d + ' owned',
      tta: (d) => round1(d) + (d === 1 ? ' day' : ' days') + ' sooner', resolved: (d) => '+' + d + ' resolved', hours: (d) => round1(d) + ' hrs back', profit: (d) => '+' + money(d), run: (d) => '+' + money(d),
    };
    const row = (id, label, you, wake, yv, wv, lower, gap) => {
      const youWins = lower ? yv < wv : yv > wv, tie = yv === wv;
      const d = gap !== undefined ? gap : lower ? yv - wv : wv - yv;
      return { id, label, you, wake, youWins, tie, ahead: tie || youWins || !(d > 0) ? '' : AHEAD[id](d), lower: !!lower, yv, wv };
    };
    const P = prep();
    const rows = [
      row('ready', 'Briefing ready', fmt(state.submittedAt || 600), fmt(state.wakeDoneAt || 468), state.submittedAt, state.wakeDoneAt, true),
      row('found', 'Problems found', found + ' of ' + n, n + ' of ' + n, found, n),
      LC ? row('call', 'Time on the call with the bank', Y.minutes + ' min', Wk.minutes + ' min', Y.minutes, Wk.minutes, true)
        : row('room', 'Leadership hours in the meeting', hrs(Y.hours), hrs(Wk.hours), Y.hours, Wk.hours, true),
      row('owned', 'Decisions with an owner and a start date', Y.ownerDate + ' of ' + Y.items.length, Wk.ownerDate + ' of ' + Wk.items.length, Y.ownerDate / Math.max(1, Y.items.length), Wk.ownerDate / Math.max(1, Wk.items.length), false, Wk.ownerDate - Y.ownerDate),
      row('tta', 'Time to action', fmtT(W.tta.you), fmtT(W.tta.wake), W.tta.you === null ? 99 : W.tta.you, W.tta.wake === null ? 99 : W.tta.wake, true),
      row('resolved', 'Problems resolved by Friday', fy.resolved + ' of ' + n, fw.resolved + ' of ' + n, fy.resolved, fw.resolved),
      row('hours', 'Team hours on follow-up', hrs(fy.hours), hrs(fw.hours), fy.hours, fw.hours, true),
      row('profit', 'Operating profit impact this week', money(fy.profit), money(fw.profit), fy.profit, fw.profit),
      row('run', 'Run-rate added, annualized', money(fy.runRate), money(fw.runRate), fy.runRate, fw.runRate),
    ];
    const wakeAhead = rows.filter((r) => !r.youWins && !r.tie).length, youAhead = rows.filter((r) => r.youWins).length;
    // how each week rates, in the words an owner would use; the business was already good
    const DAYNAME = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const allBy = W.board.wake.findIndex((x) => x.resolved === n);
    const rating = { you: fy.resolved >= 2 || (fy.resolved >= 1 && fy.profit > 0 && found >= n - 1) ? 'A good week' : fy.resolved >= 1 || fy.profit > 0 ? 'A solid week' : 'A steady week', wake: 'A standout week' };
    const by = { wake: allBy >= 0 ? DAYNAME[allBy] : null, wakeDay: allBy };
    const quarter = project(W, found);
    // what the player did well on their own, in their own numbers
    const credit = { found, resolved: fy.resolved, runRate: fy.runRate, profit: fy.profit, decided: Y.decided, items: Y.items.filter((x) => x.kind === 'finding').length,
      wins: rows.filter((r) => r.youWins).map((r) => r.label), ties: rows.filter((r) => r.tie).map((r) => r.label), quarter: quarter.you.total };
    return { rows, wakeAhead, youAhead, found, n, week: W, quarter, credit, prep: P, final: { you: fy, wake: fw }, rating, by };
  }
  // ============================================================ THIRTEEN WEEKS
  // The quarter, projected from this week. Week 1 is the week just played. From week 2, the
  // fixes in place keep paying their weekly value, plans still in flight finish, and problems
  // nobody found get found the way they usually are: the visible ones once they get worse, the
  // hidden ones late or never. New problems keep arriving at about a seventh of this week's size;
  // with Wake they are caught the next week, on your own a share of them, about three weeks on.
  // Profit here is operating profit. One-time recoveries are counted on their own.
  function project(W, found) {
    const WEEKS = 13, n = W.n;
    const value = (fid) => model[fid].run * REALIZE / 52;
    const pool = W.rows.reduce((sum, r) => sum + value(r.id), 0);
    const late = { F1: [5, 0.8], F2: [6, 0.8], F5: [5, 0.8], F3: [8, 0.7], F4: [99, 0] };
    const share = (side, r, k) => {
      const L = r[side];
      if (side === 'wake') return L.e;
      const e = L.e, sq = L.sq || 0;
      if (L.mode === 'counter') return k <= 3 ? sq * 0.7 - 0.25 : k === 4 ? sq : Math.max(sq, 0.6);
      if (L.mode === 'unclear') return Math.max(sq, k === 2 ? 0.4 : 0.7);
      if (L.mode !== 'none') return Math.max(sq, k === 2 && L.start > 4 ? e * 0.5 : e);
      const [wk, eLate] = late[r.id] || [99, 0];
      return k >= wk ? Math.max(sq, eLate) : sq;
    };
    const catchRate = { you: 0.35 + 0.3 * found / n, wake: 0.85 };
    const lag = { you: 3, wake: 1 }, eff = { you: 0.85, wake: 1 };
    const pendingCredit = (side) => { const r = W.rows.find((x) => x.id === 'F4'); if (!r) return 0; const L = r[side]; return !L.credit && L.mode !== 'none' && L.mode !== 'counter' && L.e >= 0.85 ? model.F4.credit : 0; };
    const side = (k0) => {
      const weekly = [W.board[k0][4].profit], hrs = [W.board[k0][4].hours];
      const recovered = W.board[k0][4].oneTime + pendingCredit(k0);
      // fixes nobody watches slip back a little each week: schedules drift, invoices creep;
      // a midweek check-in slows it, and with Wake every fix has its number on daily watch
      const slip = k0 === 'wake' ? 0 : W.meeting.you.wrap === 'manual' ? 0.02 : 0.03;
      for (let k = 2; k <= WEEKS; k++) {
        let v = W.rows.reduce((sum, r) => { const sh = share(k0, r, k); return sum + value(r.id) * (sh > 0 ? sh * Math.pow(1 - slip, k - 2) : sh); }, 0);
        const caught = Math.max(0, k - lag[k0] - 1);
        v += pool * NEW_RATE * catchRate[k0] * eff[k0] * caught;
        weekly.push(Math.round(v));
        hrs.push(k0 === 'you' ? round1(Math.max(4, W.board.you[4].hours * 0.6)) : 1.5);
      }
      const cum = []; weekly.reduce((a, b, i) => (cum[i] = a + b), 0);
      return { weekly, cum, total: cum[WEEKS - 1], recovered, hours: round1(hrs.reduce((a, b) => a + b, 0)), runRate: Math.round(weekly[WEEKS - 1] * 52 / 1000) * 1000 };
    };
    const you = side('you'), wake = side('wake');
    return { weeks: WEEKS, you, wake, profit: Math.round((wake.total - you.total) / 1000) * 1000, hours: Math.round(you.hours - wake.hours), run: wake.runRate - you.runRate };
  }

  const fmt = (min) => { const h24 = Math.floor(min / 60), m = min % 60; return (((h24 + 11) % 12) + 1) + ':' + String(m).padStart(2, '0') + ' ' + (h24 < 12 ? 'AM' : 'PM'); };

  return { step, answer, yours, prep, agenda: () => M.agenda(), wake, after, week, score, DAYS };
}
