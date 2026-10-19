// INTERFACE
// Renders what the engines return and narrates the player through it. No business logic.
//   intro → Round 1 (on your own) → rewind → Round 2 (with Wake)
//   → walk to the meeting → present yours, present Wake's → walk back → the week → the ending

import { createGame } from '../engine/game.js';
import { fmtClock } from '../engine/config.js';
import { h } from './art.js';
import { sfx } from './arcade/sound.js';
import { createScenes } from './scenes.js';
import { createTracker } from './track.js';
import { installDemoNote } from './demo-note.js';
import { round1 as runRound1 } from './round1.js';
import { round2 as runRound2 } from './round2.js';
import { createFinale } from './finale.js';

const HOST = (typeof window !== 'undefined' && window.WAKE_HOST) || 'web';
const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.getElementById('wx');
let game = null;
let cleanup = null;

const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
const btn = (label, onclick, cls = 'btn') => h('button', { class: cls, type: 'button', onclick }, label);

function show(world, cls, ...kids) {
  if (cleanup) { cleanup(); cleanup = null; }
  root.className = 'wx cl-root ' + world;
  const el = h('main', { class: 'screen ' + cls }, ...kids);
  root.replaceChildren(el);
  window.scrollTo(0, 0);
  return el;
}
function leave() { if (cleanup) { cleanup(); cleanup = null; } }

// ------------------------------------------------------------------ live coaching
// A narrator that points at the real control and waits for the player to use it. It is
// adaptive: the guide is written in chapters, one per place (the desk, the computer, the
// composer, the inbox...). Walk away from a step and that chapter pauses; walk into a place
// with its own chapter and that one plays; come back and the first picks up where it left off.
// A step can be gated (`when`), skipped (`skipIf`), dismissed by leaving (`once`), or modal
// (`modal`: a short tour that holds the desk until the player presses NEXT).
function createCoach() {
  // fixed elements have no offsetParent, so visibility is whether it has a box on screen
  const vis = (t) => t.getClientRects().length > 0 && getComputedStyle(t).visibility !== 'hidden';
  const ring = h('div', { class: 'coach-ring', hidden: true });
  const box = h('div', { class: 'coach', hidden: true, role: 'status', 'aria-live': 'polite' });
  const block = h('div', { class: 'coach-block', hidden: true });
  document.body.append(block, ring, box);
  let book = null, stack = ['desk'], timer = null, inline = null, shown = null;
  const seen = {};
  const chapterOf = (ctx) => (book ? book[ctx] || (book._alias && book[book._alias[ctx]]) || book['*'] || null : null);
  const stepOf = (ch) => { if (!ch) return null; while (ch.steps[ch.pos] && ch.steps[ch.pos].skipIf && ch.steps[ch.pos].skipIf()) ch.pos += 1; return ch.steps[ch.pos] || null; };
  const visible = () => { const ch = chapterOf(stack[stack.length - 1]); const st = stepOf(ch); return st && (!st.when || st.when()) ? { ch, st } : null; };
  function hide() { box.hidden = true; ring.hidden = true; block.hidden = true; if (inline) { inline.remove(); inline = null; } shown = null; }
  function place() {
    const v = visible();
    if (!v) { if (shown || !box.hidden || !ring.hidden || !block.hidden || inline) hide(); return; }
    const st = v.st;
    if (shown !== st) draw(v);
    const t = st.target ? document.querySelector(st.target) : null;
    const vw = window.innerWidth, vh = window.innerHeight;
    block.hidden = !st.modal;
    if (st.inline) {
      // the guide lives inside the thing it points at, so nothing it explains is ever dimmed
      if (t && vis(t)) {
        if (!inline || !t.contains(inline)) { if (inline) inline.remove(); inline = h('div', { class: 'coach-inline' }, h('b', {}, 'GUIDE'), h('p', {}, st.text), st.wait && !st.next ? h('span', { class: 'coach-wait' }, '▶ ' + (st.hint || 'Go ahead')) : st.next ? btn(st.next, () => advance(v.ch), 'btn primary small') : null); t.prepend(inline); try { inline.scrollIntoView({ block: 'nearest' }); } catch (e) { /* older browsers */ } }
        const r = t.getBoundingClientRect();
        ring.hidden = false; box.hidden = true;
        Object.assign(ring.style, { left: Math.max(2, r.left - 6) + 'px', top: Math.max(2, r.top - 6) + 'px', width: Math.min(vw - 4, r.width + 12) + 'px', height: Math.min(vh * 3, r.height + 12) + 'px' });
      } else { ring.hidden = true; box.hidden = true; }
      return;
    }
    box.hidden = false;
    if (t && vis(t)) {
      const r = t.getBoundingClientRect();
      ring.hidden = false;
      Object.assign(ring.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' });
      const bw = Math.min(380, vw - 32), bh = box.offsetHeight || 120;
      let top = r.bottom + 14; if (top + bh > vh - 12) top = Math.max(12, r.top - bh - 14);
      if (st.side === 'over') top = Math.min(vh - bh - 12, Math.max(12, r.top + 12));
      // tall targets, and every phone, get the guide docked low on the screen so it never hides what it points at
      if (vw < 760 || r.height > vh * 0.55) top = vh - bh - (document.querySelector('.tray, .lockbar') ? 100 : 16);
      const left = vw < 760 ? 16 : Math.min(vw - bw - 16, Math.max(16, r.left + r.width / 2 - bw / 2));
      Object.assign(box.style, { left: left + 'px', top: top + 'px', width: bw + 'px' });
    } else {
      ring.hidden = true;
      const bw = Math.min(420, vw - 32);
      Object.assign(box.style, { left: (vw - bw) / 2 + 'px', top: vh * 0.3 + 'px', width: bw + 'px' });
    }
  }
  function draw(v) {
    const st = v.st;
    if (inline) { inline.remove(); inline = null; }
    shown = st;
    box.replaceChildren(h('b', {}, 'GUIDE'), h('p', {}, st.text), st.next ? btn(st.next, () => advance(v.ch), 'btn primary small') : h('span', { class: 'coach-wait' }, '▶ ' + (st.hint || 'Go ahead')));
    box.hidden = !!st.inline;
    // bring what the guide points at into view before pointing at it
    const t = st.target ? document.querySelector(st.target) : null;
    if (t && vis(t)) { const r = t.getBoundingClientRect(); if (r.top < 0 || r.bottom > window.innerHeight - 90) t.scrollIntoView({ block: r.height > window.innerHeight * 0.6 ? 'start' : 'center', behavior: 'auto' }); }
    sfx.blip();
    // an action taken a moment before the step that asks for it still counts
    const waits = [].concat(st.wait || []);
    if (waits.some((ev) => seen[ev] && Date.now() - seen[ev] < 1500)) setTimeout(() => { if (shown === st) move(v.ch, 1); }, 200);
  }
  function move(ch, by) {
    const st = ch.steps[ch.pos];
    if (by > 0 && st && st.onNext) st.onNext();
    ch.pos = Math.max(0, ch.pos + by);
    if (by > 0 && !ch.steps[ch.pos] && st && st.onDone) st.onDone();
    if (book && Object.entries(book).every(([k, c]) => k.startsWith('_') || c.pos >= c.steps.length)) { stop(); return; }
    shown = null; place();
  }
  function advance(ch) { sfx.select(); move(ch, 1); }
  // leaving a place: a step marked `once` counts as seen
  function leaving() { const ch = chapterOf(stack[stack.length - 1]); const st = stepOf(ch); if (st && st.once) ch.pos += 1; }
  function stop() { book = null; clearInterval(timer); hide(); }
  const coach = {
    // chapters: { desk: [...], report: [...], _alias: { email: 'secondary', ... } }
    chapters(map, start = 'desk') {
      book = {}; for (const [k, v] of Object.entries(map)) book[k] = k === '_alias' ? v : { steps: v, pos: 0 };
      stack = [start]; clearInterval(timer); timer = setInterval(place, 250); shown = null; place();
    },
    run(list) { coach.chapters({ '*': list }, stack[stack.length - 1] || 'desk'); },
    context(name) { if (stack[stack.length - 1] === name) return; leaving(); stack = [name]; shown = null; hide(); place(); },
    push(name) { leaving(); stack.push(name); shown = null; hide(); place(); },
    pop() { if (stack.length > 1) { stack.pop(); shown = null; hide(); place(); } },
    emit(ev) {
      seen[ev] = Date.now();
      if (!book) return;
      for (const ctx of stack.slice().reverse()) {
        const ch = chapterOf(ctx), st = stepOf(ch);
        // a step that was on screen still hears the event that closed the thing it pointed at
        if (!st || (st.when && !st.when() && shown !== st)) continue;
        if (st.back && st.back === ev) { setTimeout(() => move(ch, -1), 120); continue; }
        if (st.wait && [].concat(st.wait).includes(ev)) setTimeout(() => { if (ch.steps[ch.pos] === st) move(ch, 1); }, 120);
      }
    },
    seen: (ev) => !!seen[ev],
    stop, active: () => !!book && !!visible(),
  };
  return coach;
}
const coach = createCoach();

// ------------------------------------------------------------------ opening
// one record per run, for the team's dashboard (see track.js and api/)
const track = createTracker({ host: HOST });
const CFG = window.WAKE_CONFIG || {};

const world = createScenes({
  root, reduced, onStep: (name) => track.step(name),
  onPicked(shellId, roleId, seed, mode) {
    game = createGame({ shellId, roleId, seed });
    window.WakeExperience = { session: () => game.session(), state: () => game.state, run: () => track.id };
    track.step('arrive', { mode: mode === 'quick' ? 'quick' : 'full', shell: shellId, role: roleId, company: game.world.shell.company });
    if (mode === 'quick') { game.autopilotRound1(); world.arrival(game, resetDay, usualMorning()); }
    else world.arrival(game, () => round1());
  },
});
const restart = () => { coach.stop(); sfx.ambience(0); game = null; track.begin(); world.start(); };
const meetingName = () => { const m = game.world.role.meetingName; return m[0].toUpperCase() + m.slice(1); };

// ------------------------------------------------------------------ ROUND 1: on your own
function round1() {
  track.step('round1');
  runRound1({ game, show, coach, reduced, onSubmit: () => { leave(); roundOneDone(); }, setCleanup: (fn) => { cleanup = fn; } });
}

// ------------------------------------------------------------------ round 1 complete
// Back from the desk: what you did, and what comes next.
function roundOneDone() {
  const s = game.state, w = game.world;
  const opened = Object.entries(s.sources).filter(([id, x]) => x.opened && !['team', 'exec'].includes(w.sources[id].kind)).length;
  const total = Object.entries(s.sources).filter(([id, x]) => x.available && !['team', 'exec'].includes(w.sources[id].kind) && id !== 'loc_all').length;
  const stat = (big, small) => h('div', { class: 'mc-stat' }, h('b', {}, big), h('span', {}, small));
  world.office(game, { day: w.shell.mondayLong, time: fmtClock(s.submittedAt), preset: 'office', at: 'office', z: 2.1,
    card: { step: 3, kicker: 'Round 1 complete · briefing locked at ' + fmtClock(s.submittedAt), title: 'That\'s how most Mondays go.',
      body: h('div', { class: 'mc-stats' }, stat(String(s.flags.length), 'findings for your team'), stat(opened + ' of ' + total, 'sources opened'), stat(fmtClock(s.submittedAt), 'briefing ready')),
      what: 'Next you\'ll run the exact same morning again: same company, same data, same 7:48 AM. This time with Wake.',
      why: 'Everything stays the same except Wake, so any difference you see comes from Wake, not from luck.',
      cta: 'Rewind the morning' },
    done: resetDay });
  sfx.credit();
}

// Quick mode: the usual morning, already played, shown when you sit down.
function usualMorning() {
  const s = game.state, D = game.world.day, sum = game.session().summary;
  const prep = s.submittedAt - D.start;
  const stat = (big, small) => h('div', { class: 'mc-stat' }, h('b', {}, big), h('span', {}, small));
  const loud = sum.flags.filter((f) => f.obvious).length;
  return { kicker: 'Round 1 · the usual way · locked at ' + fmtClock(s.submittedAt), title: 'Here\'s how most owners spend this morning.',
    body: h('div', { class: 'mc-stats' }, stat(Math.floor(prep / 60) + ' hr ' + (prep % 60) + ' min', 'digging through reports'), stat(String(sum.flags.length), 'findings, ' + loud + ' of them the loudest numbers'), stat('0', 'owners named')),
    what: 'We played Round 1 for you the usual way: open every report, chase the numbers that jump out, lock a briefing just before ten. That\'s the baseline.',
    why: 'Next you run the same morning with Wake. Every result from here compares the two, so the difference is Wake, not luck.',
    cta: 'Run it with Wake' };
}

// The day resets: same Monday, same data, with Wake underneath it this time.
async function resetDay() {
  const s = game.state, D = game.world.day;
  const clock = h('b', { class: 'mc-clock' }, fmtClock(s.submittedAt));
  const { layer } = await world.office(game, { day: game.world.shell.mondayLong, time: fmtClock(D.start), preset: 'office', at: 'office', z: 2.1,
    card: { step: 3, tone: 'wake', kicker: 'Round 2 · with Wake', title: 'Same Monday. Same 7:48 AM.', body: clock,
      what: 'Wake has already read every report, email and text from this morning. It hands you what matters, ranked, with the evidence and an owner for each. You pick what goes to your team.',
      why: 'Deciding is the part only you can do. Wake takes the digging off your plate, so you walk into ten o\'clock ready.',
      cta: 'Sit back down' },
    done: () => { game.startRound2(); round2(); } });
  const go = layer.querySelector('.mc-go .ab'); if (go) go.disabled = true;
  sfx.zoom();
  const step = Math.max(1, Math.round((s.submittedAt - D.start) / 24));
  for (let m = s.submittedAt; m > D.start; m -= step) { clock.textContent = fmtClock(m); await wait(40); }
  clock.textContent = fmtClock(D.start); sfx.credit();
  if (go) { go.disabled = false; go.focus({ preventScroll: true }); }
}

function round2() {
  track.step('round2');
  runRound2({ game, show, coach, reduced, onLock: () => walkToMeeting(), setCleanup: (fn) => { cleanup = fn; } });
}

// ------------------------------------------------------------------ the meeting
async function walkToMeeting() {
  track.step('meeting');
  leave();
  world.office(game, { day: 'Monday', time: '10:00 AM', preset: 'meeting', at: 'office', z: 2, route: 'toMeeting', end: 'left', endView: [112, 52, 2.2],
    card: { step: 4, kicker: '10:00 AM · ' + meetingName(), title: 'Time to brief your team.',
      what: game.quick() ? 'Your team is in the room and the managers are on video. The meeting runs twice: first with the usual briefing, played for you in seconds, then with the one you built with Wake.'
        : 'Your team is in the room and the managers are on video. You\'ll run this meeting twice: first with the briefing you built on your own, then with the one you built with Wake.',
      why: 'A meeting is only as good as what you bring to it. Watch each item: decided on the spot, or pushed off into follow-ups.',
      cta: 'Join the call' },
    done: () => (game.quick() ? finale().quickMeeting() : finale().meeting()) });
}

function walkBack() {
  track.step('week');
  leave();
  world.office(game, { day: 'Monday', time: '10:52 AM', preset: 'office', at: 'meeting', z: 2, route: 'toOffice', end: 'sit', endView: [192, 120, 1],
    card: { step: 5, kicker: 'Monday · 11:00 AM', title: 'Both plans go to work.',
      what: 'The rest of the week plays out twice, side by side: the plan that left your meeting, and the plan that left Wake\'s.',
      why: 'Decisions only matter once they move the numbers. This is where you see how far each plan gets by Friday.',
      cta: 'Play out the week' },
    done: () => finale().week() });
}

// Friday evening, then the final score.
function friday(then) {
  leave();
  world.office(game, { day: 'Friday', time: '6:10 PM', preset: 'night', night: true, view: [192, 120, 1],
    card: { step: 6, kicker: 'Friday · 6:10 PM', title: 'The week is in.',
      what: 'Your final score: both weeks side by side, in your company\'s own numbers, and a report to keep.',
      why: 'Same company, same data, same Monday. The only difference was how the morning was run.',
      cta: 'See your score' },
    done: then });
}

// The finale: meeting, week, final score. Built per game so it reads the current one.
function finale() {
  return createFinale({ game, show, root, reduced, setCleanup: (fn) => { cleanup = fn; }, onWalkBack: walkBack, onFriday: friday, onRestart: restart, post, HOST,
    onFinished: (result) => track.step('score', { finished: true, result }),
    onEmail: (email) => track.set({ email }),
    onBook: CFG.bookUrl ? book : null });
}

// Optional: send the finished session to an endpoint for aggregate analysis.
function post() {
  const cfg = window.WAKE_CONFIG || {};
  if (!cfg.logEndpoint) return;
  try { navigator.sendBeacon(cfg.logEndpoint, new Blob([JSON.stringify(game.session())], { type: 'application/json' })); } catch (e) { /* never block the experience */ }
}

// Book a call: the booking page gets the run id (and email, if given) so the booking matches the run.
function book(email) {
  track.set({ bookClicked: true, ...(email && /@/.test(email) ? { email } : {}) });
  const u = new URL(CFG.bookUrl, window.location.href);
  if (track.id) u.searchParams.set('metadata[runId]', track.id);
  if (email && /@/.test(email)) u.searchParams.set('email', email);
  window.open(u.toString(), '_blank', 'noopener');
}

installDemoNote(root);
track.begin();
world.start();
