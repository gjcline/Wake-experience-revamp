// SIMULATION ENGINE
// Two rounds of the same Monday morning, then the meeting, then the week.
//   Round 1: on your own. The clock runs by itself. Flag data points, write the action.
//   Round 2: with Wake. Same data. Wake hands you a ranked briefing; you decide and assign.
//   Meeting: present both. The room reacts to exactly what you hand it.
//   Week: both plans play out side by side.
// No business logic lives in the interface. Everything here is deterministic.

import { buildWorld, fmtClock } from './config.js';
import { createSignalEngine } from './signals.js';
import { createEventEngine } from './events.js';
import { createTracker } from './behavior.js';
import { runWake } from './intelligence.js';
import { judgeFlag, bestHandling, STATUS } from './judge.js';
import { buildRecap } from './recap.js';
import { OWNERS, PHONE, SYSTEM, QUIET } from '../content/rounds.js';

export const MIN_FLAGS = 3, MAX_FLAGS = 5;

export function createGame({ shellId, roleId, now = () => Date.now(), sessionId } = {}) {
  const world = buildWorld(shellId, roleId);
  const signals = createSignalEngine(world);
  const events = createEventEngine(world);
  const tracker = createTracker(now);
  const D = world.day;

  const state = {
    sessionId: sessionId || 'wx-' + now().toString(36), shell: shellId, role: roleId,
    phase: 'entry', clock: D.start,
    sources: {}, signals: {}, events: {},
    flags: [], flagSeq: 0, submittedAt: null, submittedMs: null, round1StartMs: null,
    wake: null, wakeClock: D.start, wakeOrder: [], assigned: {}, sharpened: {}, putThrough: [], wakeDoneAt: null,
  };
  for (const [id, src] of Object.entries(world.sources)) state.sources[id] = { available: !src.arrives, arrivedAt: src.arrives ? null : 0, opened: 0, firstAt: null, dwellMs: 0 };
  for (const id of Object.keys(world.signals)) state.signals[id] = { seen: false, seenAt: null, seenIn: null, views: 0, pinned: false };

  const rec = (type, data) => tracker.record(type, state.clock, data);
  rec('session_start', { session: state.sessionId }); rec('business_selected', { shell: shellId }); rec('role_selected', { role: roleId });

  const person = (key) => key === 'me' ? { key: 'me', name: 'You', title: world.role.label } : { key, ...world.characters[key] };

  // ------------------------------------------------------------ round 1
  function startRound1() { state.phase = 'morning'; state.round1StartMs = now(); rec('round1_started'); return events.tick(state); }

  // The clock runs on its own, one minute at a time, and stops at 10:00.
  function tickClock() {
    if (state.phase !== 'morning' || state.clock >= D.meetingAt) return { clock: state.clock, fired: [], atTen: state.clock >= D.meetingAt };
    state.clock += 1;
    const fired = events.tick(state);
    for (const f of fired) rec('event_fired', { event: f.id, source: f.source });
    if (state.clock === D.meetingAt) rec('clock_reached_ten', { flags: state.flags.length });
    return { clock: state.clock, fired, atTen: state.clock >= D.meetingAt };
  }

  function listSources(kind) {
    const ids = world.order[kind].concat(Object.keys(world.sources).filter((id) => world.sources[id].arrives && world.sources[id].kind === kind));
    return ids.filter((id) => state.sources[id].available).map((id) => ({ ...world.sources[id], opened: state.sources[id].opened, arrivedAt: state.sources[id].arrivedAt }))
      .sort((a, b) => (b.arrivedAt || 0) - (a.arrivedAt || 0));
  }
  const unread = (kind) => listSources(kind).filter((s) => !s.opened).length;

  // Opening something costs nothing. Look at everything.
  function open(sourceId) {
    const src = world.sources[sourceId], st = state.sources[sourceId];
    if (!src || !st.available) return null;
    const first = st.opened === 0;
    if (!tracker.of('source_opened').length) rec('first_interaction', { source: sourceId, kind: src.kind, cat: src.cat });
    st.opened += 1; st.firstAt = st.firstAt ?? state.clock;
    for (const id of src.lines) { const s = state.signals[id]; if (!s.seen) { s.seen = true; s.seenAt = state.clock; s.seenIn = sourceId; } s.views += 1; }
    rec('source_opened', { source: sourceId, kind: src.kind, cat: src.cat, first, signals: src.lines.length });
    return view(sourceId);
  }

  function flagOf(signalIds) { return state.flags.find((f) => f.signals.some((id) => signalIds.includes(id))); }

  function view(sourceId) {
    const src = world.sources[sourceId];
    const line = (id) => { const s = world.signals[id]; const f = flagOf([id]); return { key: id, label: s.label, value: s.value, delta: s.delta, flag: f ? state.flags.indexOf(f) + 1 : 0 }; };
    const who = src.from ? world.characters[src.from] : null;
    const whole = src.sections ? null : flagOf(src.lines);
    return {
      id: src.id, kind: src.kind, title: src.title, sub: src.sub || '', intro: src.intro || '', when: src.when, flag: src.flag || '',
      from: who ? { key: src.from, name: who.name, title: who.title } : null, system: SYSTEM[src.id] || SYSTEM[src.kind] || '',
      body: src.body || [], note: src.note || '',
      sections: (src.sections || []).map((sec) => ({ title: sec.title, lines: sec.lines.map(line) })),
      pinKeys: src.sections ? [] : src.lines, flagged: whole ? state.flags.indexOf(whole) + 1 : 0,
      quote: src.sections ? '' : (src.kind === 'email' ? src.title : (src.body || [])[0] || ''),
      related: signals.related(sourceId, state).map((id) => ({ id, title: world.sources[id].title, kind: world.sources[id].kind })),
    };
  }
  const dwell = (sourceId, ms) => { if (state.sources[sourceId]) state.sources[sourceId].dwellMs += ms; };

  // What the player is pointing at, in words they would recognize.
  function describe(signalIds, sourceId) {
    const src = world.sources[sourceId];
    if (src && !src.sections) return { label: src.kind === 'email' ? src.title : (src.body || [])[0], value: '', from: src.from ? world.characters[src.from].name : '' };
    const s = world.signals[signalIds[0]];
    return { label: s.label, value: ['call', 'request', 'assumption', 'invite', 'plan'].includes(s.value) ? '' : [s.value, s.delta].filter(Boolean).join(', '), from: '' };
  }

  function flag({ signals: ids, source, text, owner }) {
    if (state.phase !== 'morning' || state.flags.length >= MAX_FLAGS) return null;
    const f = { id: 'f' + (++state.flagSeq), signals: [].concat(ids), source, text: String(text || '').trim().slice(0, 280), owner: owner || null, at: state.clock, what: describe([].concat(ids), source) };
    state.flags.push(f);
    for (const id of f.signals) state.signals[id].pinned = true;
    rec('flag_added', { flag: f.id, signals: f.signals, source, owner: f.owner, words: f.text.split(/\s+/).filter(Boolean).length, text: f.text });
    return f;
  }
  function editFlag(id, { text, owner }) {
    const f = state.flags.find((x) => x.id === id); if (!f || state.phase !== 'morning') return null;
    if (text !== undefined) f.text = String(text).trim().slice(0, 280);
    if (owner !== undefined) f.owner = owner || null;
    rec('flag_edited', { flag: id, owner: f.owner, text: f.text });
    return f;
  }
  function removeFlag(id) {
    const i = state.flags.findIndex((x) => x.id === id); if (i < 0 || state.phase !== 'morning') return;
    const [f] = state.flags.splice(i, 1);
    for (const sid of f.signals) state.signals[sid].pinned = state.flags.some((x) => x.signals.includes(sid));
    rec('flag_removed', { flag: id, signals: f.signals });
  }
  function moveFlag(id, dir) {
    const i = state.flags.findIndex((x) => x.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= state.flags.length) return;
    [state.flags[i], state.flags[j]] = [state.flags[j], state.flags[i]];
    rec('flag_reordered', { flag: id, to: j + 1 });
  }
  const flags = () => state.flags.map((f, i) => ({ ...f, n: i + 1, ownerName: f.owner ? person(f.owner).name : '' }));
  const owners = () => OWNERS.map(person).concat([person('me')]).map((p) => ({ key: p.key, name: p.name, title: p.title, av: p.av }));

  function submitRound1() {
    if (state.flags.length < MIN_FLAGS) return false;
    state.submittedAt = state.clock; state.submittedMs = now() - state.round1StartMs; state.phase = 'between';
    rec('round1_submitted', { flags: state.flags.length, clock: state.clock, ms: state.submittedMs, judged: state.flags.map((f) => judgeFlag(world, f).handling) });
    return true;
  }

  // ------------------------------------------------------------ round 2
  function startRound2() {
    state.phase = 'wake';
    if (!state.wake) state.wake = runWake(world, signals, state);
    state.wakeOrder = state.wake.findings.map((f) => f.id);
    rec('round2_started', { funnel: state.wake.funnel });
    return briefing();
  }

  function card(fid) {
    const w = state.wake.findings.find((f) => f.id === fid), b = world.briefing[fid];
    const extra = Object.entries(state.sharpened).filter(([, s]) => s.finding === fid);
    const ownerKeys = b.owner.concat(extra.map(([, s]) => s.addOwner).filter(Boolean));
    return {
      id: fid, rank: state.wakeOrder.indexOf(fid) + 1, place: w.place, headline: b.headline, why: b.why, action: b.action, check: b.check,
      owners: ownerKeys.map(person), assigned: !!state.assigned[fid], urgent: extra.some(([, s]) => s.urgent),
      sharpened: extra.map(([msg, s]) => ({ from: world.characters[world.sources[msg].from].name.split(' ')[0], line: s.line })),
      evidence: b.keys.map((id) => { const s = world.signals[id], st = state.signals[id]; const home = s.sources.find((x) => world.sources[x].kind !== 'location');
        return { key: id, label: s.label, value: ['call', 'request', 'assumption'].includes(s.value) ? '' : s.value, system: SYSTEM[home] || SYSTEM[world.sources[home].kind], seen: st.seen, flagged: st.pinned }; }),
      signals: w.evidence.length, systems: w.systems,
    };
  }
  function briefing() {
    const W = state.wake;
    const systems = {};
    for (const src of Object.values(world.sources)) if (state.sources[src.id].available && src.volume > 1 && src.cat !== 'general') { const k = SYSTEM[src.id]; systems[k] = (systems[k] || 0) + src.volume; }
    return {
      clock: state.wakeClock, funnel: W.funnel, you: W.you, field: W.field, findings: W.findings,
      systems: Object.entries(systems).map(([name, n]) => ({ name, n })),
      cards: state.wakeOrder.map(card),
      filtered: W.dismissed.map((d) => ({ label: d.label, value: d.value, because: d.because[0] || '' })),
      phone: PHONE.map((id) => ({ id, from: world.characters[world.sources[id].from].name, key: world.sources[id].from, text: world.sources[id].body[0], done: !!state.sharpened[id] })),
      ready: state.wakeOrder.every((id) => state.assigned[id]),
    };
  }
  function assign(fid) {
    if (state.phase !== 'wake' || state.assigned[fid]) return briefing();
    state.assigned[fid] = true; state.wakeClock += 1;
    rec('wake_assigned', { finding: fid, rank: state.wakeOrder.indexOf(fid) + 1 });
    return briefing();
  }
  function moveWake(fid, dir) {
    const i = state.wakeOrder.indexOf(fid), j = i + dir;
    if (i < 0 || j < 0 || j >= state.wakeOrder.length) return briefing();
    [state.wakeOrder[i], state.wakeOrder[j]] = [state.wakeOrder[j], state.wakeOrder[i]];
    rec('wake_reordered', { finding: fid, to: j + 1 });
    return briefing();
  }
  function putThrough(msgId) {
    if (state.phase !== 'wake' || state.sharpened[msgId]) return null;
    const s = world.sharpen[msgId];
    state.sharpened[msgId] = s; state.putThrough.push(msgId);
    rec('put_through_wake', { message: msgId, finding: s.finding });
    return { finding: s.finding, line: s.line, briefing: briefing() };
  }
  function lockRound2() {
    state.wakeDoneAt = state.wakeClock; state.phase = 'meeting';
    rec('round2_locked', { clock: state.wakeClock, order: state.wakeOrder, putThrough: state.putThrough.length });
  }

  // ------------------------------------------------------------ the meeting
  function delivery() {
    const yours = state.flags.map((f, i) => {
      const j = judgeFlag(world, f);
      return { n: i + 1, what: f.what, text: f.text, owner: f.owner ? person(f.owner) : null, status: j.status, statusLabel: STATUS[j.status],
        reactions: j.reactions.map((r) => ({ ...r, ...person(r.who) })), finding: j.finding, kind: j.kind, handling: j.handling };
    });
    const wake = state.wakeOrder.map((fid, i) => {
      const c = card(fid), b = world.briefing[fid];
      return { n: i + 1, headline: c.headline, text: c.action, check: c.check, owners: c.owners, status: 'handed', statusLabel: STATUS.handed,
        reactions: [{ ...person(b.owner[0]), who: b.owner[0], line: b.onIt }], finding: fid };
    });
    const board = {};
    const put = (key, side, item) => { (board[key] = board[key] || { person: key === 'none' ? { key: 'none', name: 'Nobody', title: 'No owner named' } : person(key), you: [], wake: [] })[side].push(item); };
    for (const y of yours) put(y.owner ? y.owner.key : 'none', 'you', { text: y.text, status: y.status, statusLabel: y.statusLabel });
    const taskFor = Object.fromEntries(Object.values(state.sharpened).filter((x) => x.addOwner).map((x) => [x.addOwner, x.task]));
    for (const w of wake) for (const o of w.owners) put(o.key, 'wake', { text: o.key === world.briefing[w.finding].owner[0] ? w.text : (taskFor[o.key] || w.text), status: 'handed', statusLabel: STATUS.handed });
    const tally = (list) => Object.fromEntries(Object.keys(STATUS).map((k) => [k, list.filter((x) => x.status === k).length]));
    return { yours, wake, board: Object.values(board), tally: { yours: tally(yours), wake: tally(wake) } };
  }
  function presented(which) { rec(which === 'wake' ? 'presented_wake' : 'presented_yours'); }

  // ------------------------------------------------------------ the week
  function week() {
    const judged = state.flags.map((f) => judgeFlag(world, f));
    const rows = state.wake.findings.map((wf) => {
      const T = world.weekText[wf.id];
      const mine = judged.filter((j) => j.finding === wf.id);
      const best = mine.length ? bestHandling(mine) : null;
      const you = best ? (T[best.key] || T[best.handling] || T.partial) : T.untouched;
      return { id: wf.id, label: T.label, you: { text: you[0], dir: you[1], handled: best ? best.handling : 'untouched' }, wake: { text: T.aligned[0], dir: T.aligned[1] } };
    });
    const seen = new Set();
    for (const j of judged) {
      if (j.kind === 'finding' || seen.has(j.signal)) continue;
      seen.add(j.signal);
      const s = world.signals[j.signal];
      const W = world.weekText;
      const you = j.kind === 'falseAlarm' ? W.falseAlarm[j.handling === 'checked' ? 'checked' : 'react'] : W.noise.you;
      const wake = j.kind === 'falseAlarm' ? W.falseAlarm.wake : W.noise.wake;
      rows.push({ id: j.signal, label: s.label, you: { text: you[0], dir: you[1], handled: j.handling }, wake: { text: wake[0], dir: wake[1] }, extra: true });
    }
    rec('week_played', { rows: rows.map((r) => [r.id, r.you.handled]) });
    return rows;
  }

  function recap() { const r = buildRecap(world, state, { delivery: delivery(), week: week(), QUIET }); rec('recap_viewed'); return r; }
  function complete() { state.phase = 'complete'; rec('session_complete'); }
  function exported(how) { rec('report_exported', { how }); }

  // A sales-ready summary of what this player did. Never shown to the player.
  function session() {
    const judged = state.flags.map((f) => ({ ...judgeFlag(world, f), text: f.text, owner: f.owner, at: fmtClock(f.at) }));
    return {
      sessionId: state.sessionId, shell: shellId, role: roleId, events: tracker.log,
      summary: {
        sourcesOpened: Object.values(state.sources).filter((s) => s.opened).length,
        categoriesOpened: [...new Set(Object.entries(state.sources).filter(([, s]) => s.opened).map(([id]) => world.sources[id].cat))],
        flags: judged.map((j) => ({ signal: j.signal, kind: j.kind, finding: j.finding, handling: j.handling, obvious: j.obvious, quiet: j.quiet, owner: j.owner, text: j.text, at: j.at })),
        findingsFound: [...new Set(judged.filter((j) => j.finding).map((j) => j.finding))],
        falseAlarmsFlagged: judged.filter((j) => j.kind === 'falseAlarm').length,
        round1Clock: state.submittedAt ? fmtClock(state.submittedAt) : null, round1Seconds: state.submittedMs ? Math.round(state.submittedMs / 1000) : null,
        wakeDone: state.wakeDoneAt ? fmtClock(state.wakeDoneAt) : null, putThrough: state.putThrough.length, wakeReordered: tracker.of('wake_reordered').length,
      },
    };
  }

  return {
    world, state, tracker, signals, fmtClock, MIN_FLAGS, MAX_FLAGS,
    startRound1, tickClock, listSources, unread, open, view, dwell, flag, editFlag, removeFlag, moveFlag, flags, owners, submitRound1,
    startRound2, briefing, assign, moveWake, putThrough, lockRound2,
    delivery, presented, week, recap, complete, exported, session, person,
    clockLabel: () => fmtClock(state.clock),
  };
}
