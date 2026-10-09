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

import { judgeFlag } from './judge.js';

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const money = (v) => (v < 0 ? '-$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const round1 = (x) => Math.round(x * 10) / 10;
const OPENING = 3, PRESENT = 2, WAKE_ITEM = 2;
const MIN = { answer: 1, iou: 3, guess: 4, bounce: 5, self: 2, later: 2, anyway: 4, rethink: 3, drop: 2, keep: 3, manual: 2, monday: 1, explain: 3, reroute: 2, now: 3, wait: 1 };
const NEXT_WEEK = 9;

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
  function plan() {
    const items = state.flags.map((f, i) => {
      const j = judgeFlag(world, f), n = i + 1, id = 'i' + n;
      const base = { id, n, flag: f.id, kind: j.kind, fid: j.finding || null, what: f.what, text: f.text, owner: f.owner ? who(f.owner) : null, handling: j.handling, key: j.key, qs: [] };
      const opening = j.reactions[0] && inRoom(j.reactions[0].who) ? { ...who(j.reactions[0].who), line: j.reactions[0].line } : null;
      base.opening = opening;
      if (j.kind === 'falseAlarm') {
        const x = opening || { ...who('opsdir'), line: 'That one has an explanation already.' };
        base.qs.push({ id: id + ':fa', type: 'explain', asker: x, line: x.line + ' Do we still need to act on it?', opts: [
          { id: 'drop', label: 'Good to know. Let\'s drop it.', effect: 'drop', reply: 'Thanks. Moving on.' },
          { id: 'keep', label: 'Keep pulling the numbers on it anyway.', effect: 'keep', reply: 'Okay. We\'ll keep pulling it.', task: { who: x.key, what: 'Keep pulling numbers on ' + f.what.label, hrs: 3 } }] });
        base.opening = null;
        return base;
      }
      if (j.kind === 'noise') {
        const o = who('opsdir');
        base.qs.push({ id: id + ':pr', type: 'priority', asker: o, line: 'Is this one really a priority for this week?', opts: [
          { id: 'drop', label: 'Fair. Let\'s drop it.', effect: 'drop', reply: 'Moving on.' },
          { id: 'keep', label: 'I\'d still like someone on it.', effect: 'keep', reply: 'Okay. I\'ll find someone.', task: { who: 'analyst', what: 'Look into ' + f.what.label, hrs: 3 } }] });
        base.opening = null;
        return base;
      }
      // a real problem
      const fid = j.finding, Mo = model[fid], topic = topicOf(fid);
      const fits = j.attached.filter((a) => a.fits);
      const flagged = f.signals.concat(...fits.map((a) => a.signals));
      if (j.handling === 'counter') {
        const x = opening || { ...who(ownerOf(fid)), line: 'Are we sure that fixes it?' };
        base.qs.push({ id: id + ':ct', type: 'counter', asker: x, line: x.line, opts: [
          { id: 'anyway', label: 'Noted. Let\'s do it anyway.', effect: 'anyway', reply: 'Okay. Your call.' },
          { id: 'rethink', label: 'Fair point. Let me rethink it and come back.', effect: 'rethink', reply: 'Thanks. That\'s the right call.', task: { who: 'me', what: 'Rework the plan for ' + topic, hrs: 1.5 } }] });
        base.opening = null;
      } else {
        // the specific question only lands when you named the fix; otherwise the room asks plainly
        const [ak, line] = j.handling === 'aligned' ? Mo.q.why : ['opsdir', 'What do you think is driving it?'];
        const ev = fits[0] ? fits[0].label : j.quiet ? f.what.label + (f.what.value ? ': ' + f.what.value : '') : '';
        base.qs.push({ id: id + ':why', type: 'why', asker: { ...who(ak), line }, line, evidence: ev || null, opts: ev
          ? [{ id: 'show', label: 'Show: ' + ev, effect: 'answer', reply: 'Okay. That is clear.' },
            { id: 'iou', label: 'I\'ll pull the history and send it round.', effect: 'iou', reply: 'Send it when you have it.', task: { who: 'analyst', what: 'Pull the history behind ' + topic, hrs: 2.5 } }]
          : [{ id: 'iou', label: 'I\'ll pull the history and send it round.', effect: 'iou', reply: 'Okay. Send it when you have it.', task: { who: 'analyst', what: 'Pull the history behind ' + topic, hrs: 2.5 } },
            { id: 'guess', label: 'It\'s my read. Let\'s move on it.', effect: 'guess', reply: 'I\'d want to see the numbers. But fine.' }] });
      }
      {
        const [ak, line] = j.handling === 'aligned' ? Mo.q.cost : [ctrlKey, 'What is it costing us?'];
        const mSig = flagged.find((id2) => Mo.money.includes(id2));
        const ev = mSig ? world.signals[mSig].label + ': ' + world.signals[mSig].value : '';
        const bounce = ['F2', 'F4'].includes(fid) && j.handling === 'aligned';
        const opts = [];
        if (ev) opts.push({ id: 'show', label: 'Show: ' + ev, effect: 'answer', reply: 'Good. That is enough to act on.' });
        opts.push({ id: 'iou', label: 'I\'ll get you a number by Wednesday.', effect: 'iou', reply: 'Get it to me and I\'ll sign off.', task: { who: ak === 'controller' ? 'controller' : 'analyst', what: 'Size the cost of ' + topic, hrs: 2 } });
        if (!ev) opts.push(bounce
          ? { id: 'guess', label: 'Ballpark, a few thousand a week.', effect: 'bounce', reply: 'I can\'t sign off on a ballpark. Get me the number.', task: { who: ak === 'controller' ? 'controller' : 'analyst', what: 'Size the cost of ' + topic, hrs: 2 } }
          : { id: 'guess', label: 'Ballpark, a few thousand a week.', effect: 'guess', reply: 'A few thousand. Okay, we\'ll go with that.' });
        base.qs.push({ id: id + ':cost', type: 'cost', asker: { ...who(ak), line }, line, evidence: ev || null, opts });
      }
      const right = world.briefing[fid].owner;
      if (!f.owner) {
        const o = who('opsdir');
        base.qs.push({ id: id + ':own', type: 'owner', asker: { ...o, line: 'Who\'s taking this one?' }, line: 'Who\'s taking this one?', opts: [
          { id: 'self', label: 'I\'ll take it myself.', effect: 'self', reply: 'Okay. It\'s yours.' },
          { id: 'later', label: 'Let\'s sort out owners after the meeting.', effect: 'later', reply: 'Don\'t let it drop. Send names after.', task: { who: 'me', what: 'Find an owner for ' + topic, hrs: 0.5 } }] });
      } else if (f.owner !== 'me' && !right.includes(f.owner) && inRoom(f.owner)) {
        const o = who(f.owner), r = who(right[0]);
        base.qs.push({ id: id + ':rr', type: 'reroute', auto: true, asker: { ...o, line: 'That\'s really ' + r.first + '\'s area. I can help, but ' + r.first + ' should own it.' }, line: 'That\'s really ' + r.first + '\'s area. I can help, but ' + r.first + ' should own it.', opts: [
          { id: 'ok', label: 'Okay. ' + r.first + ' takes it.', effect: 'reroute', reply: 'Got it.', replyBy: r.key }] });
      }
      // When something has to be followed up, the room still gets to decide whether to move now.
      // Moving now starts the first step on Tuesday; the full plan waits for the numbers.
      base.qs.push({ id: id + ':go', type: 'commit', cond: 'pending', asker: { ...who('opsdir'), line: 'So do we move on this now, or wait for the numbers?' }, line: 'So do we move on this now, or wait for the numbers?', opts: [
        { id: 'now', label: 'Move now. The numbers can follow.', effect: 'now', reply: 'Okay. Start it Tuesday, and get us the numbers as soon as you have them.' },
        { id: 'wait', label: 'Let\'s wait for the numbers.', effect: 'wait', reply: 'Fine. We\'ll pick it up when they land.' }] });
      return base;
    });
    const o = who('opsdir');
    const wrap = { id: 'wrap', type: 'check', asker: { ...o, line: 'How will we know any of this is working before ' + thu + '?' }, line: 'How will we know any of this is working before ' + thu + '?', opts: [
      { id: 'manual', label: 'I\'ll check in with each of you Wednesday.', effect: 'manual', reply: 'Okay. Wednesday it is.' },
      { id: 'monday', label: 'Let\'s review it all next Monday.', effect: 'monday', reply: 'Next Monday, then.' }] };
    return { items, wrap };
  }
  const optOf = (q) => { const a = state.meet.answers[q.id]; return q.opts.find((o) => o.id === a) || q.opts.find((o) => o.effect === 'iou') || q.opts[0]; };
  // does this item, as answered so far, leave anything to follow up?
  function pending(itemId) {
    const it = plan().items.find((x) => x.id === itemId); if (!it || it.kind !== 'finding') return false;
    return it.qs.some((q) => q.type !== 'commit' && ['iou', 'bounce', 'later', 'rethink'].includes(optOf(q).effect));
  }
  function answer(qid, optId) {
    const P = plan(), all = P.items.flatMap((x) => x.qs).concat(P.wrap);
    const q = all.find((x) => x.id === qid); if (!q) return null;
    const o = q.opts.find((x) => x.id === optId) || q.opts[0];
    state.meet.answers[qid] = o.id;
    rec('meeting_answer', { q: qid, question: q.type, effect: o.effect });
    const by = o.replyBy ? who(o.replyBy) : q.asker;
    return { ...o, by, minutes: MIN[o.effect] || 1 };
  }

  // What came out of your meeting, item by item.
  function yours() {
    const P = plan();
    const wrapEffect = optOf(P.wrap).effect;
    const items = P.items.map((it) => {
      let minutes = PRESENT, asked = 0, answered = 0, guess = 0, tasks = [], handling = it.handling, owner = it.owner, decision, self = false;
      let commit = null;
      const open = it.kind === 'finding' && pending(it.id);
      for (const q of it.qs) {
        if (q.type === 'commit') { if (open) { commit = optOf(q).effect; minutes += MIN[commit]; } continue; }
        const o = optOf(q);
        minutes += MIN[o.effect] || 1;
        if (!q.auto) asked += 1;
        if (o.effect === 'answer' || o.effect === 'guess') answered += 1;
        if (o.effect === 'guess') guess += 1;
        if (o.task) tasks.push({ ...o.task, item: it.n, fid: it.fid, kind: o.effect });
        if (o.effect === 'rethink') { handling = 'aligned'; guess += 1; }
        if (o.effect === 'self') { owner = who('me'); self = true; }
        if (o.effect === 'reroute') owner = who(world.briefing[it.fid].owner[0]);
      }
      if (it.opening && !it.qs.some((q) => q.type === 'counter')) minutes += 1;
      if (it.kind !== 'finding') {
        const keep = it.qs.some((q) => optOf(q).effect === 'keep');
        decision = keep ? 'busy' : 'dropped';
        return { ...it, minutes, asked, answered, tasks, decision, s: NEXT_WEEK, mult: 0, owner };
      }
      decision = open ? (commit === 'now' ? 'agreed' : 'parked') : guess ? 'guess' : 'decided';
      let mult = Math.pow(0.85, Math.min(guess, 1)) * (self ? 0.8 : 1) * (wrapEffect === 'monday' ? 0.85 : 1);
      if (handling === 'counter') mult = 1;
      return { ...it, minutes, asked, answered, tasks, guess, decision, s: 1, mult, owner, handling, self, commit };
    });
    const wrapMin = MIN[wrapEffect];
    const minutes = OPENING + items.reduce((n, x) => n + x.minutes, 0) + wrapMin;
    const asked = items.reduce((n, x) => n + x.asked, 0) + 1, answered = items.reduce((n, x) => n + x.answered, 0);
    // two findings on the same problem share their follow-ups
    const seen = new Set();
    const tasks = items.flatMap((x) => x.tasks.concat(x.self ? [{ who: 'me', what: 'Run the ' + topicOf(x.fid) + ' fix yourself', hrs: 3, item: x.n, fid: x.fid, kind: 'self' }] : [])).filter((t) => { const k = t.who + '|' + t.what; if (seen.has(k)) return false; seen.add(k); return true; });
    // Follow-ups land in people's queues. Each person turns around about two a day, starting
    // Tuesday; an item can act the day after its last follow-up lands.
    const queue = {};
    for (const t of tasks) { if (['keep', 'self'].includes(t.kind)) { t.day = 1; continue; } const k = (queue[t.who] = (queue[t.who] || 0) + 1); t.day = 1 + Math.floor((k - 1) / 2); }
    const dayOf = (t) => (tasks.find((x) => x.who === t.who && x.what === t.what) || t).day;
    for (const it of items) {
      if (it.kind !== 'finding') continue;
      const follow = it.tasks.filter((x) => x.kind !== 'keep');
      for (const t of it.tasks) t.day = dayOf(t);
      const last = follow.length ? Math.max(...follow.map(dayOf)) : 0;
      it.s = last + 1 > 4 ? NEXT_WEEK : Math.max(1, last + 1);
      if (it.s === NEXT_WEEK && it.decision === 'parked') it.decision = 'next';
    }
    const DECIDED = ['decided', 'guess', 'agreed'];
    const decidedInRoom = items.filter((x) => DECIDED.includes(x.decision)).length;
    const clear = new Set(items.filter((x) => DECIDED.includes(x.decision) && x.owner && x.owner.key !== 'me').map((x) => x.owner.key));
    return { items, wrap: wrapEffect, minutes, asked, answered, tasks, decided: decidedInRoom, ious: tasks.filter((x) => !['keep', 'self'].includes(x.kind)).length, people: clear.size };
  }

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
    return { items, wrap, minutes: OPENING + items.length * WAKE_ITEM + 1, asked, answered: asked, decided: items.length, ious: 0, people };
  }

  // ============================================================ AFTER THE MEETING
  function after() {
    const Y = yours(), Wk = wake(), boss = world.boss || 'your boss';
    const mine = [{ who: who('me'), what: 'Write up the meeting notes and send them round', hrs: 0.5, day: 0 }];
    Y.tasks.filter((x) => x.kind !== 'self').forEach((x) => mine.push({ who: who(x.who), what: x.what, hrs: x.hrs, day: x.day || 1, kind: x.kind }));
    mine.push({ who: who('me'), what: 'Build ' + thu + ' brief for ' + boss, hrs: 2, day: 2 });
    if (Y.wrap === 'manual') mine.push({ who: who('me'), what: 'Check in with each owner on Wednesday', hrs: Math.max(0.5, Math.round(0.25 * Y.items.filter((x) => x.kind === 'finding').length * 2) / 2), day: 2 });
    for (const x of Y.tasks) if (x.kind === 'self') mine.push({ who: who('me'), what: x.what, hrs: 3, day: 1 });
    const holds = (world.sources.cal.wakeToday || []).filter((h) => (h.id === 'ev_w_eq' && state.wakeOrder.includes('F2')) || (h.id === 'ev_w_ap' && state.wakeOrder.includes('F4')));
    const done = [
      { at: '10:15 AM', what: 'Decisions, owners and due dates sent to ' + Wk.people + (Wk.people === 1 ? ' person' : ' people') },
      { at: '10:15 AM', what: Wk.items.length + ' tasks in owners\' queues, each with its number to watch' },
      { at: '10:16 AM', what: Wk.items.length + ' measures on daily watch, with alerts to each owner' },
      { at: '10:16 AM', what: thu.charAt(0).toUpperCase() + thu.slice(1) + ' brief for ' + boss + ' updated with today\'s decisions' },
    ].concat(holds.map((h) => { const hh = parseInt(h.start, 10); return { at: h.start + (hh >= 7 && hh < 12 ? ' AM' : ' PM'), what: t(h.title) + ', on the calendar' }; }));
    return { mine, done, hours: round1(mine.reduce((n, x) => n + x.hrs, 0)) };
  }

  // ============================================================ THE WEEK
  // How hard each plan pushes each problem, day by day. p is the share of the fix in place.
  function curve(fid, plan) {
    const Mo = model[fid], ramp = Mo.metric.ramp;
    const at = (start, e, d) => (d < start ? 0 : e * ramp[Math.min(4, d - start)]);
    const act = plan.mode === 'aligned' || plan.mode === 'alert' ? { start: plan.s, e: plan.mult }
      : plan.mode === 'partial' ? { start: plan.s + 2, e: 0.9 * plan.mult, look: plan.s }
        : plan.mode === 'unclear' ? { start: plan.s, e: 0.4 * plan.mult }
          : plan.mode === 'counter' ? { start: plan.s, e: -0.25 } : { start: NEXT_WEEK, e: 0 };
    // agreed in the room ahead of the numbers: the first step starts Tuesday at part strength
    if (plan.pre && act.e > 0 && plan.pre.start < act.start) act.pre = { start: plan.pre.start, e: plan.pre.e };
    const sq = Mo.sq;
    return { act, sq, p: DAYS.map((_, d) => {
      const a = Math.max(at(act.start, act.e, d), act.pre ? at(act.pre.start, act.pre.e, d) : 0);
      return act.e < 0 ? at(act.start, act.e, d) : Math.max(a, sq.e ? at(sq.s, sq.e, d) : 0);
    }) };
  }
  const fmtM = (Mo, v) => { const u = Mo.metric.unit; return u === '$' ? money(v) : u === 'count' ? (v === 1 ? '1 exit' : v + ' exits') : u === '%' ? v + '%' : v + ' ' + u; };
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
      const profit = cost + revenue * cm; // operating; a one-time recovery is kept in `credit`
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
      if (sq.e && d === sq.s && act.e >= 0 && sq.e > (act.start <= d ? act.e : 0)) lines.push({ t: sq.text, k: 'info' });
      if (fid === 'F2' && d === 3) lines.push(pd >= 0.5 ? { t: Mo.fail.held, k: 'good' } : { t: Mo.fail.lost, k: 'bad' });
      if (fid === 'F4' && cr) lines.push({ t: Mo.creditText, k: 'good' });
      if (fid === 'F5' && d === 4) lines.push(m === 0 ? { t: Mo.exit.held, k: 'good' } : { t: Mo.exit.lost, k: 'bad' });
      days.push({ m, shown: fmtM(Mo, m), p: round1(pd), status, cost: Math.round(cost), revenue: Math.round(revenue), credit: cr, profit: Math.round(profit), lines });
    });
    if (fid === 'F4' && act.e >= 0.85 && act.start <= 4 && act.start + 3 > 4) days[4].lines.push({ t: 'Credit of ' + money(Mo.credit) + ' expected next week.', k: 'wait' });
    const sum = (k) => days.reduce((n, x) => n + x[k], 0);
    const pf = p[4];
    const run = Math.round(Mo.run * (pf < 0 ? pf / 2 : pf) / 100) * 100;
    const pending = plan.mode !== 'none' && act.start > 4 && !act.pre;
    return { side, mode: plan.mode, key: plan.key, start: act.start, first: act.pre ? act.pre.start : act.look !== undefined ? act.look : act.start, e: act.e, plan, days, profit: sum('profit'), revenue: sum('revenue'), cost: sum('cost'), credit, run,
      status: pending ? 'waiting' : days[4].status, from: fmtM(Mo, met.path ? 0 : met.start), to: days[4].shown, series: [met.path ? 0 : met.start].concat(days.map((x) => x.m)) };
  }

  function plans() {
    const Y = yours();
    const youPlan = {};
    const rank = { aligned: 4, partial: 3, unclear: 2, counter: 1 };
    for (const it of Y.items) if (it.kind === 'finding') {
      const mode = it.handling === 'aligned' ? 'aligned' : it.handling === 'counter' ? 'counter' : it.handling === 'partial' ? 'partial' : 'unclear';
      const agreed = it.decision === 'agreed';
      // an agreed investigation simply starts; an agreed fix starts its first step at part strength
      const s = agreed && mode !== 'aligned' ? 1 : it.s;
      const plan = { mode, key: it.key, s, mult: it.mult, item: it.n, waited: ['parked', 'next', 'agreed'].includes(it.decision) && s > 1,
        pre: agreed && mode === 'aligned' && it.s > 1 ? { start: 1, e: 0.6 * it.mult } : null };
      const prev = youPlan[it.fid];
      const first1 = (x) => Math.min(x.s, x.pre ? x.pre.start : 9);
      if (!prev || rank[mode] > rank[prev.mode] || (rank[mode] === rank[prev.mode] && first1(plan) < first1(prev))) youPlan[it.fid] = plan;
      // two findings on one problem: whatever the room settled first still starts on time
      const best = youPlan[it.fid], other = best === plan ? prev : plan;
      if (other && best.mode !== 'counter' && other.mode !== 'counter' && first1(other) < first1(best) && !best.pre) best.pre = { start: first1(other), e: 0.4 * best.mult };
    }
    // With Wake, what you handed off starts Monday. Everything else Wake found is still on its
    // watch: the owner gets the alert with the numbers attached at 7:48 Tuesday and acts on it.
    const wakePlan = {};
    for (const f of world.findings) wakePlan[f.id] = state.wakeOrder.includes(f.id) ? { mode: 'aligned', key: 'aligned', s: 0, mult: 1 } : { mode: 'alert', key: 'aligned', s: 1, mult: 1 };
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
        const runRate = Math.round(rows.reduce((n, r) => { const p = r[side].days[d].p; return n + model[r.id].run * (p < 0 ? p / 2 : p); }, 0) / 100) * 100;
        const resolved = rows.filter((r) => r[side].days[d].status === 'fixed').length;
        const open = side === 'you' ? A.mine.filter((x) => x.kind && x.kind !== 'keep' && x.day > d).length + Y.items.filter((x) => x.decision === 'next').length : 0;
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
    const row = (id, label, you, wake, yv, wv, lower) => ({ id, label, you, wake, youWins: lower ? yv < wv : yv > wv, tie: yv === wv });
    const rows = [
      row('ready', 'Briefing ready', fmt(state.submittedAt || 600), fmt(state.wakeDoneAt || 468), state.submittedAt, state.wakeDoneAt, true),
      row('found', 'Problems found', found + ' of ' + n, n + ' of ' + n, found, n),
      row('meeting', 'Meeting length', Y.minutes + ' min', Wk.minutes + ' min', Y.minutes, Wk.minutes, true),
      row('answered', 'Questions answered in the room', Y.answered + ' of ' + Y.asked, Wk.answered + ' of ' + Wk.asked, Y.answered / Y.asked, Wk.answered / Wk.asked),
      row('tta', 'Time to action', fmtT(W.tta.you), fmtT(W.tta.wake), W.tta.you === null ? 99 : W.tta.you, W.tta.wake === null ? 99 : W.tta.wake, true),
      row('resolved', 'Problems resolved by Friday', fy.resolved + ' of ' + n, fw.resolved + ' of ' + n, fy.resolved, fw.resolved),
      row('hours', 'Team hours on follow-up', hrs(fy.hours), hrs(fw.hours), fy.hours, fw.hours, true),
      row('profit', 'Operating profit impact this week', money(fy.profit), money(fw.profit), fy.profit, fw.profit),
      row('run', 'Run-rate added, annualized', money(fy.runRate), money(fw.runRate), fy.runRate, fw.runRate),
    ];
    const wakeAhead = rows.filter((r) => !r.youWins && !r.tie).length, youAhead = rows.filter((r) => r.youWins).length;
    const quarter = project(W, found);
    // what the player did well on their own, in their own numbers
    const credit = { found, resolved: fy.resolved, runRate: fy.runRate, profit: fy.profit, decided: Y.decided, items: Y.items.filter((x) => x.kind === 'finding').length,
      wins: rows.filter((r) => r.youWins).map((r) => r.label), ties: rows.filter((r) => r.tie).map((r) => r.label), quarter: quarter.you.total };
    return { rows, wakeAhead, youAhead, found, n, week: W, quarter, credit, final: { you: fy, wake: fw } };
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
    const value = (fid) => model[fid].run / 52;
    const pool = W.rows.reduce((sum, r) => sum + value(r.id), 0);
    const late = { F1: [5, 0.8], F2: [6, 0.8], F5: [5, 0.8], F3: [8, 0.7], F4: [99, 0] };
    const share = (side, r, k) => {
      const L = r[side];
      if (side === 'wake') return 1;
      const e = L.e;
      if (L.mode === 'counter') return k <= 3 ? -0.25 : k === 4 ? 0 : 0.6;
      if (L.mode === 'unclear') return k === 2 ? 0.4 : 0.7;
      if (L.mode !== 'none') return k === 2 && L.start > 4 ? e * 0.5 : e;
      const [wk, eLate] = late[r.id] || [99, 0];
      const sq = model[r.id].sq.e || 0;
      return k >= wk ? Math.max(sq, eLate) : sq;
    };
    const catchRate = { you: 0.2 + 0.3 * found / n, wake: 1 };
    const lag = { you: 3, wake: 1 }, eff = { you: 0.85, wake: 1 };
    const pendingCredit = (side) => { const r = W.rows.find((x) => x.id === 'F4'); if (!r) return 0; const L = r[side]; return !L.credit && L.mode !== 'none' && L.mode !== 'counter' && L.e >= 0.85 ? model.F4.credit : 0; };
    const side = (k0) => {
      const weekly = [W.board[k0][4].profit], hrs = [W.board[k0][4].hours];
      const recovered = W.board[k0][4].oneTime + pendingCredit(k0);
      // fixes nobody watches slip back a little each week: schedules drift, invoices creep;
      // a midweek check-in slows it, and with Wake every fix has its number on daily watch
      const slip = k0 === 'wake' ? 0 : W.meeting.you.wrap === 'manual' ? 0.03 : 0.05;
      for (let k = 2; k <= WEEKS; k++) {
        let v = W.rows.reduce((sum, r) => { const sh = share(k0, r, k); return sum + value(r.id) * (sh > 0 ? sh * Math.pow(1 - slip, k - 2) : sh); }, 0);
        const caught = Math.max(0, k - lag[k0] - 1);
        v += pool * 0.15 * catchRate[k0] * eff[k0] * caught;
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

  return { plan, answer, pending, yours, wake, after, week, score, DAYS };
}
