// SIMULATION ENGINE
// Two rounds of the same Monday morning, then the meeting, then the week.
//   Round 1: on your own. The clock runs by itself. Flag data points in the reports and the
//            location scorecards, pick or write what should happen, attach supporting context.
//   Round 2: with Wake. Same data. Wake hands you a ranked briefing; you decide and assign.
//   Meeting: present both. The room reacts to exactly what you hand it.
//   Week: both plans play out side by side.
// No business logic lives in the interface. Everything here is deterministic for a seed.

import { buildWorld, fmtClock } from './config.js';
import { createSignalEngine } from './signals.js';
import { createEventEngine } from './events.js';
import { createTracker } from './behavior.js';
import { runWake } from './intelligence.js';
import { judgeFlag, bestHandling, STATUS } from './judge.js';
import { buildRecap } from './recap.js';

export const MIN_FLAGS = 3, MAX_FLAGS = 5;
const SECONDARY = ['email', 'message', 'calendar', 'note'];
const hash = (s) => { let x = 2166136261; for (const ch of String(s)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };

export function createGame({ shellId, roleId, seed = 1, now = () => Date.now(), sessionId } = {}) {
  const world = buildWorld(shellId, roleId, seed);
  const signals = createSignalEngine(world);
  const events = createEventEngine(world);
  const tracker = createTracker(now);
  const D = world.day;

  const state = {
    sessionId: sessionId || 'wx-' + now().toString(36), shell: shellId, role: roleId, seed,
    phase: 'entry', clock: D.start,
    sources: {}, signals: {}, events: {},
    flags: [], flagSeq: 0, submittedAt: null, submittedMs: null, round1StartMs: null,
    wake: null, wakeClock: D.start, wakeOrder: [], assigned: {}, sharpened: {}, putThrough: [], wakeDoneAt: null,
    insightOrder: [], picked: [], r2: { sources: {}, events: {}, opened: {} }, round2StartMs: null, round2Ms: null,
  };
  for (const [id, src] of Object.entries(world.sources)) state.sources[id] = { available: !src.arrives, arrivedAt: src.arrives ? null : 0, opened: 0, firstAt: null, dwellMs: 0 };
  for (const id of Object.keys(world.signals)) state.signals[id] = { seen: false, seenAt: null, seenIn: null, views: 0, pinned: false };

  const rec = (type, data) => tracker.record(type, state.clock, data);
  rec('session_start', { session: state.sessionId, seed }); rec('business_selected', { shell: shellId, company: world.shell.company, size: world.shell.size }); rec('role_selected', { role: roleId });

  const person = (key) => key === 'me' ? { key: 'me', name: 'You', title: world.role.label } : { key, ...world.characters[key] };
  const sysOf = (src) => world.system[src.id] || world.system[src.kind] || '';

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
  const unread = (kind) => listSources(kind).filter((s) => !s.opened && s.kind !== 'team' && s.id !== 'loc_all').length;

  // Opening something costs nothing.
  function open(sourceId, from) {
    const src = world.sources[sourceId], st = state.sources[sourceId];
    if (!src || !st.available) return null;
    const first = st.opened === 0;
    if (!tracker.of('source_opened').length) rec('first_interaction', { source: sourceId, kind: src.kind, cat: src.cat });
    st.opened += 1; st.firstAt = st.firstAt ?? state.clock;
    for (const id of src.lines) { const s = state.signals[id]; if (!s.seen) { s.seen = true; s.seenAt = state.clock; s.seenIn = sourceId; } s.views += 1; }
    rec('source_opened', { source: sourceId, kind: src.kind, cat: src.cat, first, signals: src.lines.length, via: from || null });
    return view(sourceId);
  }

  const flagNo = (id) => { const i = state.flags.findIndex((f) => f.signals.includes(id)); return i + 1; };
  const sig = (id) => { const s = world.signals[id]; return { key: id, label: s.label, value: s.value, delta: s.delta, flag: flagNo(id) }; };
  const attachedTo = (key) => state.flags.map((f, i) => (f.attached.some((a) => a.key === key) ? i + 1 : 0)).filter(Boolean);

  // Everything a screen needs to draw one source. Figures carry their flag number.
  function view(sourceId) {
    const src = world.sources[sourceId];
    const who = src.from ? world.characters[src.from] : null;
    const v = {
      id: src.id, kind: src.kind, title: src.title, sub: src.sub || '', intro: src.intro || '', when: src.when, flag: src.flag || '',
      from: who ? { key: src.from, name: who.name, title: who.title } : null, system: sysOf(src), run: src.run || '',
      body: src.body || [], note: src.note || '', to: src.to || '', cc: src.cc || '', address: src.address || '', memo: src.memo || null, ask: src.ask || '',
      secondary: SECONDARY.includes(src.kind), attachedTo: attachedTo(src.id),
      related: signals.related(sourceId, state).map(({ id, via }) => ({ id, title: world.sources[id].title, kind: world.sources[id].kind, opened: state.sources[id].opened > 0, via: via.map((x) => world.signals[x].label), hl: via })),
    };
    if (src.blocks) v.blocks = src.blocks.map((b) => ({ title: b.title, note: b.note || '', cols: b.cols, rows: b.rows.map((r) => ({ total: !!r.total, cells: r.cells.map((c) => ({ t: c.t, s: c.s || null, tone: c.tone || '', flag: c.s ? flagNo(c.s) : 0 })) })) }));
    if (src.tiles) v.tiles = src.tiles.map((t) => ({ ...sig(t.id), label: t.label }));
    if (src.rows) v.rows = src.rows.map((r) => ({ label: r.label, cells: r.ids.map(sig) }));
    if (src.kind === 'location' && src.loc) v.loc = src.loc;
    if (src.kind === 'calendar') {
      const ev = (e) => ({ ...e, attachedTo: attachedTo('cal:' + e.id), detail: e.detail ? { ...e.detail, people: (e.detail.people || []).map(person) } : null });
      Object.assign(v, { wakeToday: (src.wakeToday || []).map(ev), today: src.today.map(ev), weeks: Object.fromEntries(Object.entries(src.weeks).map(([k, list]) => [k, list.map(ev)])), dates: src.dates, lastDates: src.lastDates, nextDates: src.nextDates });
    }
    if (src.kind === 'note') v.list = src.list || null;
    if (src.kind === 'team') Object.assign(v, { central: src.central.map(person), managers: src.managers.map((k) => ({ ...person(k), loc: world.locById[world.characters[k].loc] })) });
    return v;
  }
  const dwell = (sourceId, ms) => { if (state.sources[sourceId]) state.sources[sourceId].dwellMs += ms; };

  // What the player is pointing at, in words they would recognize.
  function describe(signalIds, sourceId) {
    const s = world.signals[signalIds[0]];
    const src = world.sources[sourceId];
    return { label: s.label, value: ['request', 'assumption', 'invite', 'plan'].includes(s.value) ? '' : [s.value, s.delta].filter(Boolean).join(', '), where: src ? src.title : '', system: src ? sysOf(src) : '' };
  }

  // The common answers for a data point: four styles, in an order fixed by the seed.
  function answers(signalId) {
    const list = world.answers[world.ansKey[signalId]] || [];
    return list.map((a, i) => ({ ...a, o: hash(seed + ':' + signalId + ':' + i) })).sort((a, b) => a.o - b.o).map(({ o: _o, ...a }) => a);
  }
  const answerById = (id) => { if (!id) return null; const [k] = id.split(':'); return (world.answers[k] || []).find((a) => a.id === id) || null; };
  const compose = (choice, note) => [choice ? choice.text : '', String(note || '').trim()].filter(Boolean).join(' ').slice(0, 400);

  function flag({ signals: ids, source, choice, note, owner, text }) {
    if (state.phase !== 'morning' || state.flags.length >= MAX_FLAGS) return null;
    const a = answerById(choice);
    const n = String(note !== undefined ? note : text || '').trim().slice(0, 280);
    if (!a && n.length < 3) return null;
    const f = { id: 'f' + (++state.flagSeq), signals: [].concat(ids), source, choice: a ? a.id : null, intent: a ? a.intent : null, style: a ? a.style : 'own', note: n,
      text: compose(a, n), owner: owner || null, attached: [], at: state.clock, what: describe([].concat(ids), source) };
    state.flags.push(f);
    for (const id of f.signals) state.signals[id].pinned = true;
    rec('flag_added', { flag: f.id, signals: f.signals, source, choice: f.choice, intent: f.intent, style: f.style, owner: f.owner, wrote: n.length > 0, words: n.split(/\s+/).filter(Boolean).length, text: f.text });
    return f;
  }
  function editFlag(id, { choice, note, owner, text }) {
    const f = state.flags.find((x) => x.id === id); if (!f || state.phase !== 'morning') return null;
    if (choice !== undefined) { const a = answerById(choice); f.choice = a ? a.id : null; f.intent = a ? a.intent : null; f.style = a ? a.style : 'own'; }
    if (note !== undefined || text !== undefined) f.note = String(note !== undefined ? note : text).trim().slice(0, 280);
    if (owner !== undefined) f.owner = owner || null;
    f.text = compose(answerById(f.choice), f.note);
    rec('flag_edited', { flag: id, choice: f.choice, owner: f.owner, text: f.text });
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

  // Supporting context: an email, a text, a calendar entry or a note, attached to a finding.
  function attach(flagId, item) {
    const f = state.flags.find((x) => x.id === flagId); if (!f || state.phase !== 'morning') return null;
    if (f.attached.some((a) => a.key === item.key)) return f;
    const src = world.sources[item.source];
    const sigs = item.signals || (src ? src.lines : []);
    f.attached.push({ key: item.key, source: item.source, label: item.label || (src ? src.title : ''), kind: src ? src.kind : '', signals: sigs });
    for (const id of sigs) if (state.signals[id]) { const s = state.signals[id]; if (!s.seen) { s.seen = true; s.seenAt = state.clock; s.seenIn = item.source; } }
    rec('context_attached', { flag: flagId, item: item.key, source: item.source });
    return f;
  }
  function detach(flagId, key) {
    const f = state.flags.find((x) => x.id === flagId); if (!f || state.phase !== 'morning') return;
    f.attached = f.attached.filter((a) => a.key !== key);
    rec('context_detached', { flag: flagId, item: key });
  }

  const flags = () => state.flags.map((f, i) => ({ ...f, n: i + 1, ownerName: f.owner ? person(f.owner).name : '', ownerTitle: f.owner ? person(f.owner).title : '' }));
  const owners = () => {
    const mk = (k, group) => { const p = person(k); return { key: k, name: p.name, title: p.title, av: p.av, group, loc: p.loc ? world.locById[p.loc].name : '' }; };
    return world.central.map((k) => mk(k, 'central')).concat(world.locations.map((L) => mk(L.manager, 'manager')), [{ key: 'me', name: 'You', title: 'Keep it yourself', group: 'me' }]);
  };

  function submitRound1() {
    if (state.flags.length < MIN_FLAGS) return false;
    state.submittedAt = state.clock; state.submittedMs = now() - state.round1StartMs; state.phase = 'between';
    rec('round1_submitted', { flags: state.flags.length, clock: state.clock, ms: state.submittedMs, judged: state.flags.map((f) => judgeFlag(world, f).handling) });
    return true;
  }

  // ------------------------------------------------------------ round 2
  // Same morning, same data. Wake has already read every source; the player decides which
  // of its ranked insights to hand to the team (at least 3, at most 5). Texts still arrive
  // on the phone and can be sent to Wake. Emails are connected; Wake reads them as they land.
  const MIN_PICKS = MIN_FLAGS, MAX_PICKS = MAX_FLAGS;
  function startRound2() {
    state.phase = 'wake';
    if (!state.wake) state.wake = runWake(world, signals, state);
    state.wakeClock = D.start; state.round2StartMs = now();
    const routine = world.routine.slice().sort((a, b) => b.urgency + b.impact - (a.urgency + a.impact));
    state.insightOrder = state.wake.findings.map((f) => f.id).concat(routine.map((r) => r.id));
    state.wakeOrder = state.insightOrder.slice();
    rec('round2_started', { funnel: state.wake.funnel, insights: state.insightOrder.length });
    return briefing();
  }

  // The round 2 clock, and the morning's arrivals replayed on it.
  function tickWake() {
    if (state.phase !== 'wake' || state.wakeClock >= D.meetingAt) return { clock: state.wakeClock, fired: [], atTen: state.wakeClock >= D.meetingAt };
    state.wakeClock += 1;
    const fired = [];
    for (const ev of world.events) {
      if (ev.when.at === undefined || state.r2.events[ev.id] || state.wakeClock < ev.when.at) continue;
      state.r2.events[ev.id] = state.wakeClock; state.r2.sources[ev.add] = state.wakeClock;
      const src = world.sources[ev.add];
      fired.push({ id: ev.id, source: ev.add, kind: src.kind, from: src.from, toast: ev.toast, sharpen: !!world.sharpen[ev.add], links: tagsFor(ev.add) });
    }
    return { clock: state.wakeClock, fired, atTen: state.wakeClock >= D.meetingAt };
  }
  const r2Available = (id) => { const src = world.sources[id]; return src && (!src.arrives || state.r2.sources[id] !== undefined); };
  function listR2(kind) {
    const ids = (world.order[kind] || []).concat(Object.keys(world.sources).filter((id) => world.sources[id].arrives && world.sources[id].kind === kind));
    return ids.filter(r2Available).map((id) => ({ ...world.sources[id], when: world.sources[id].arrives ? fmtClock(state.r2.sources[id]) : world.sources[id].when, arrivedAt: state.r2.sources[id] || 0, opened: !!state.r2.opened[id], tags: tagsFor(id), sendable: !!world.sharpen[id] && !state.sharpened[id], sent: !!state.sharpened[id] }))
      .sort((a, b) => b.arrivedAt - a.arrivedAt);
  }
  const unreadR2 = (kind) => listR2(kind).filter((s) => !s.opened).length;
  function openR2(id, from) {
    if (!r2Available(id)) return null;
    state.r2.opened[id] = (state.r2.opened[id] || 0) + 1;
    rec('r2_opened', { source: id, kind: world.sources[id].kind, via: from || null });
    const v = view(id);
    return { ...v, tags: tagsFor(id), sendable: !!world.sharpen[id] && !state.sharpened[id], sent: !!state.sharpened[id], when: world.sources[id].arrives ? fmtClock(state.r2.sources[id]) : v.when };
  }
  // Which insights a source feeds. This is how the inbox shows what Wake already used.
  function tagsFor(id) {
    const src = world.sources[id]; if (!src || !state.insightOrder.length) return [];
    return state.insightOrder.map((iid, i) => ({ id: iid, rank: i + 1, ev: evidenceOf(iid) })).filter((x) => src.lines.some((l) => x.ev.includes(l))).map((x) => x.rank);
  }
  const evidenceOf = (id) => { const f = state.wake.findings.find((x) => x.id === id); return f ? f.evidence.map((e) => e.key) : (world.routineById[id] || { evidence: [] }).evidence; };

  function insight(id) {
    const f = state.wake.findings.find((x) => x.id === id), r = world.routineById[id], b = world.briefing[id], wf = world.findingById[id];
    const extra = Object.entries(state.sharpened).filter(([, x]) => x.finding === id);
    const ownerKeys = b.owner.concat(extra.map(([, x]) => x.addOwner).filter((k) => k && !b.owner.includes(k)));
    const src = (key) => {
      const s = world.signals[key], st = state.signals[key];
      const home = world.sources[s.sources.find((x) => world.sources[x].kind !== 'location' && !world.sources[x].arrives) || s.sources[0]];
      return { key, label: s.label, value: ['request', 'assumption', 'invite', 'plan'].includes(s.value) ? '' : s.value, delta: s.delta, system: sysOf(home), where: home.title, kind: home.kind, seen: st.seen, flagged: flagNo(key) };
    };
    const ev = evidenceOf(id);
    const rank = state.insightOrder.indexOf(id) + 1;
    return {
      id, rank, routine: !!r, place: f ? f.place : (world.shell.multi && r.loc ? world.locById[r.loc].name : r.topic), topic: f ? wf.topic : r.topic,
      headline: b.headline, why: b.why, action: b.action, check: b.check,
      finding: f ? f.finding : r.why, connection: f ? f.connection : '', interpretation: f ? f.interpretation : r.why, whyFirst: f ? wf.whyFirst : 'Small, real, and quick to close. Lower priority than the items above it.',
      owners: ownerKeys.map(person), picked: state.picked.includes(id), urgent: extra.some(([, x]) => x.urgent),
      sharpened: extra.map(([msg, x]) => ({ from: world.characters[world.sources[msg.split(':')[0]].from].name.split(' ')[0], line: x.line })),
      keys: b.keys.map(src), sources: ev.map(src), signals: ev.length, systems: new Set(ev.map((k) => sysOf(world.sources[world.signals[k].sources[0]]))).size,
    };
  }
  const insights = () => state.insightOrder.map(insight);

  const compare = (s) => { const d = s.delta || ''; if (/^was /.test(d)) return s.value + (s.v > s.base ? ', up from ' : ', down from ') + d.slice(4); if (/^norm /.test(d)) return s.value + ' against a norm of ' + d.slice(5); if (/^target /.test(d)) return s.value + ' against a target of ' + d.slice(7); return s.value + (d ? ' (' + d + ')' : ''); };
  // Trace one line back to where it lived in Round 1: what it said, where, and how Wake read it.
  function trace(sigId) {
    const s = world.signals[sigId], st = state.signals[sigId];
    const homeId = s.sources.find((x) => !['location'].includes(world.sources[x].kind) && !world.sources[x].arrives) || s.sources[0];
    const src = world.sources[homeId];
    let excerpt;
    if (src.blocks) {
      for (const bl of src.blocks) {
        const rows = bl.rows.filter((r) => r.cells.some((c) => c.s === sigId));
        if (rows.length) { excerpt = { kind: 'report', block: bl.title, cols: bl.cols, rows: rows.slice(0, 4).map((r) => r.cells.map((c) => ({ t: c.t, hl: c.s === sigId }))) }; break; }
      }
    } else if (src.kind === 'location') excerpt = { kind: 'scorecard', tiles: (src.tiles || []).filter((t) => t.id === sigId).map((t) => ({ label: t.label, value: s.cell || s.value, delta: s.delta })) };
    else if (src.kind === 'calendar') {
      const all = src.today.concat(...Object.values(src.weeks));
      const e = all.find((x) => (x.signals || []).includes(sigId));
      excerpt = { kind: 'calendar', title: e ? e.title : s.label, when: e ? (e.start ? 'Today, ' + e.start + ' to ' + e.end : e.time) : '', lines: e && e.detail ? e.detail.lines || [] : [] };
    } else excerpt = { kind: src.kind, title: src.title, body: src.body || [], list: src.list || null };
    const who = src.from ? person(src.from) : null;
    const numeric = s.base !== 0 && typeof s.v === 'number' && s.v !== s.base;
    return {
      key: sigId, label: s.label, value: s.value, delta: s.delta, source: { id: homeId, title: src.title, kind: src.kind, system: sysOf(src), when: src.when, run: src.run || '', by: who ? who.name + ', ' + who.title : '' },
      excerpt,
      r1: { seen: st.seen, at: st.seen ? fmtClock(st.seenAt) : '', in: st.seen && world.sources[st.seenIn] ? world.sources[st.seenIn].title : '', flagged: flagNo(sigId) },
      reading: s.kind === 'noise' ? 'Within its normal range on its own. It matters here as context.' : s.kind === 'explainer' ? 'Explains another line. On its own it needs no action.'
        : (numeric ? compare(s) + '. Outside its normal range.' : 'Context Wake connected to the numbers.'),
    };
  }

  function pick(id) {
    if (state.phase !== 'wake' || !state.insightOrder.includes(id)) return insights();
    const i = state.picked.indexOf(id);
    if (i >= 0) state.picked.splice(i, 1);
    else if (state.picked.length < MAX_PICKS) state.picked.push(id);
    else return insights();
    rec(i >= 0 ? 'wake_unpicked' : 'wake_picked', { insight: id, rank: state.insightOrder.indexOf(id) + 1, routine: !!world.routineById[id] });
    return insights();
  }
  const r2Ready = () => state.picked.length >= MIN_PICKS && state.picked.length <= MAX_PICKS;

  function card(fid) {
    const it = insight(fid);
    return { ...it, assigned: !!state.assigned[fid], evidence: it.keys };
  }
  function briefing() {
    const W = state.wake;
    const systems = {};
    for (const src of Object.values(world.sources)) if (state.sources[src.id].available && src.volume > 1 && src.cat !== 'general' && src.kind !== 'exec') { const k = sysOf(src); systems[k] = (systems[k] || 0) + src.volume; }
    return {
      clock: state.wakeClock, funnel: W.funnel, you: W.you, field: W.field, findings: W.findings,
      systems: Object.entries(systems).map(([name, n]) => ({ name, n })),
      cards: state.insightOrder.map(card),
      filtered: W.dismissed.map((d) => ({ label: d.label, value: d.value, because: d.because[0] || '' })),
      phone: world.phone.map((id) => ({ id, from: world.characters[world.sources[id].from].name, key: world.sources[id].from, text: world.sources[id].body[0], done: !!state.sharpened[id] })),
      ready: r2Ready(), picked: state.picked.slice(), min: MIN_PICKS, max: MAX_PICKS,
    };
  }
  function assign(fid) { if (!state.picked.includes(fid)) pick(fid); return briefing(); }
  function moveWake() { return briefing(); }
  function putThrough(msgId) {
    if (state.phase !== 'wake' || state.sharpened[msgId] || !world.sharpen[msgId] || !r2Available(msgId)) return null;
    const s = world.sharpen[msgId];
    state.sharpened[msgId] = s; state.putThrough.push(msgId);
    if (s.also) state.sharpened[msgId + ':also'] = s.also;
    rec('put_through_wake', { message: msgId, finding: s.finding });
    const rank = s.finding ? state.insightOrder.indexOf(s.finding) + 1 : 0;
    const also = s.also ? { finding: s.also.finding, rank: state.insightOrder.indexOf(s.also.finding) + 1, line: s.also.line } : null;
    return { finding: s.finding, rank, line: s.line, also, briefing: briefing() };
  }
  function lockRound2() {
    if (!r2Ready()) return false;
    state.wakeOrder = state.insightOrder.filter((id) => state.picked.includes(id));
    state.assigned = Object.fromEntries(state.wakeOrder.map((id) => [id, true]));
    state.wakeDoneAt = state.wakeClock; state.round2Ms = now() - state.round2StartMs; state.phase = 'meeting';
    rec('round2_locked', { clock: state.wakeClock, picked: state.wakeOrder, putThrough: state.putThrough.length, ms: state.round2Ms });
    return true;
  }
  // Who has what, as of right now.
  function assignments() {
    const out = {};
    for (const id of state.picked) { const it = insight(id); for (const o of it.owners) (out[o.key] = out[o.key] || []).push({ rank: it.rank, headline: it.headline }); }
    return out;
  }

  // ------------------------------------------------------------ the meeting
  function delivery() {
    const yours = state.flags.map((f, i) => {
      const j = judgeFlag(world, f);
      return { n: i + 1, what: f.what, text: f.text, owner: f.owner ? person(f.owner) : null, status: j.status, statusLabel: STATUS[j.status],
        reactions: j.reactions.map((r) => ({ ...r, ...person(r.who) })), finding: j.finding, kind: j.kind, handling: j.handling, attached: j.attached, backed: j.backed };
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
      const w = state.assigned[wf.id] ? T.aligned : T.untouched;
      return { id: wf.id, label: T.label, you: { text: you[0], dir: you[1], handled: best ? best.handling : 'untouched' }, wake: { text: w[0], dir: w[1] } };
    });
    for (const id of state.wakeOrder) if (world.routineById[id]) { const T = world.weekText[id]; rows.push({ id, label: T.label, you: { text: T.untouched[0], dir: 'flat', handled: 'untouched' }, wake: { text: T.aligned[0], dir: T.aligned[1] }, extra: true }); }
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

  function recap() { const r = buildRecap(world, state, { delivery: delivery(), week: week(), QUIET: world.quiet }); rec('recap_viewed'); return r; }
  function complete() { state.phase = 'complete'; rec('session_complete'); }
  function exported(how) { rec('report_exported', { how }); }

  // A sales-ready summary of what this player did. Never shown to the player.
  function session() {
    const judged = state.flags.map((f) => ({ ...judgeFlag(world, f), text: f.text, note: f.note, owner: f.owner, at: fmtClock(f.at) }));
    const styles = {};
    for (const j of judged) if (j.style) styles[j.style] = (styles[j.style] || 0) + 1;
    return {
      sessionId: state.sessionId, shell: shellId, role: roleId, seed, company: world.shell.company, size: world.shell.size, events: tracker.log,
      summary: {
        sourcesOpened: Object.values(state.sources).filter((s) => s.opened).length,
        categoriesOpened: [...new Set(Object.entries(state.sources).filter(([, s]) => s.opened).map(([id]) => world.sources[id].cat))],
        flags: judged.map((j) => ({ signal: j.signal, kind: j.kind, finding: j.finding, handling: j.handling, style: j.style, obvious: j.obvious, quiet: j.quiet, owner: j.owner, text: j.text, wrote: j.note, at: j.at,
          attached: j.attached.map((a) => ({ item: a.key, fits: a.fits })) })),
        styles, wroteOwn: judged.filter((j) => j.note).length, ownersNamed: judged.filter((j) => j.owner).length,
        contextAttached: judged.reduce((n, j) => n + j.attached.length, 0), contextThatFits: judged.reduce((n, j) => n + j.backed, 0),
        findingsFound: [...new Set(judged.filter((j) => j.finding).map((j) => j.finding))],
        falseAlarmsFlagged: judged.filter((j) => j.kind === 'falseAlarm').length,
        round1Clock: state.submittedAt ? fmtClock(state.submittedAt) : null, round1Seconds: state.submittedMs ? Math.round(state.submittedMs / 1000) : null,
        wakeDone: state.wakeDoneAt ? fmtClock(state.wakeDoneAt) : null, putThrough: state.putThrough.length, round2Seconds: state.round2Ms ? Math.round(state.round2Ms / 1000) : null,
        wakePicked: state.wakeOrder.map((id) => ({ id, rank: state.insightOrder.indexOf(id) + 1, routine: !!world.routineById[id] })), wakeShown: state.insightOrder.length,
        tracesOpened: tracker.of('trace_opened').length, execOpened: tracker.of('r2_opened').filter((e) => /^x_/.test(e.source)).length,
      },
    };
  }

  return {
    world, state, tracker, signals, fmtClock, MIN_FLAGS, MAX_FLAGS,
    startRound1, tickClock, listSources, unread, open, view, dwell, answers, flag, editFlag, removeFlag, moveFlag, attach, detach, attachedTo, flags, owners, submitRound1,
    startRound2, briefing, assign, moveWake, putThrough, lockRound2,
    tickWake, listR2, unreadR2, openR2, insights, insight, trace, pick, assignments, r2Ready, MIN_PICKS, MAX_PICKS,
    traced: (id) => rec('trace_opened', { signal: id }),
    delivery, presented, week, recap, complete, exported, session, person,
    clockLabel: () => fmtClock(state.clock),
  };
}
