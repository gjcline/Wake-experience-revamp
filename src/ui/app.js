// INTERFACE
// Renders what the engines return and narrates the player through it. No business logic.
//   arcade front end → Round 1 (on your own) → rewind → Round 2 (with Wake)
//   → walk to the meeting → present yours, present Wake's → walk back → the week → the ending

import { createGame } from '../engine/game.js';
import { fmtClock } from '../engine/config.js';
import { h, avatar } from './art.js';
import { sfx } from './arcade/sound.js';
import { createField } from './field.js';
import { createArcade } from './arcade/screens.js';
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
const av = (key, size) => avatar(key === 'me' ? { skin: '#D9A07A', hair: '#2A1C14', style: 'short', shirt: '#FFD23F' } : game.world.characters[key] && game.world.characters[key].av, size);
const first = (name) => String(name).split(' ')[0];

function show(world, cls, ...kids) {
  if (cleanup) { cleanup(); cleanup = null; }
  root.className = 'wx arcade ' + world;
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
const arcade = createArcade({
  root, reduced,
  onPicked(shellId, roleId, seed) {
    game = createGame({ shellId, roleId, seed });
    window.WakeExperience = { session: () => game.session(), state: () => game.state };
    arcade.arrival(game, () => round1());
  },
});
const restart = () => { coach.stop(); game = null; arcade.start(); };

// ------------------------------------------------------------------ ROUND 1: on your own
function round1() {
  runRound1({ game, show, coach, reduced, onSubmit: () => { leave(); roundOneDone(); }, setCleanup: (fn) => { cleanup = fn; } });
}

// ------------------------------------------------------------------ round 1 complete
// Centered, like the end of a stage. It reads as progress, not as a do-over.
function roundOneDone() {
  const s = game.state, w = game.world;
  const opened = Object.entries(s.sources).filter(([id, x]) => x.opened && !['team', 'exec'].includes(w.sources[id].kind)).length;
  const total = Object.entries(s.sources).filter(([id, x]) => x.available && !['team', 'exec'].includes(w.sources[id].kind) && id !== 'loc_all').length;
  const stat = (big, small) => h('div', { class: 'cstat' }, h('b', {}, big), h('span', {}, small));
  const go = btn('TRY IT WITH WAKE ▶', resetDay, 'btn primary big');
  show('day', 'stage-done',
    h('div', { class: 'center-card' },
      h('p', { class: 'stage-k' }, 'ROUND 1'),
      h('h1', { class: 'stage-h' }, 'COMPLETE'),
      h('p', { class: 'lede' }, 'You prepared for your ' + w.role.meetingName + ' on your own. Your briefing is locked in.'),
      h('div', { class: 'cstats' }, stat(fmtClock(s.submittedAt), 'briefing ready'), stat(String(s.flags.length), 'findings'), stat(opened + ' of ' + total, 'sources opened')),
      h('p', { class: 'lede dim' }, 'Next: the same morning, prepared with Wake.'),
      go));
  sfx.credit();
  setTimeout(() => go.focus({ preventScroll: true }), 100);
}

// The day resets: same Monday, same data, with Wake underneath it this time.
function resetDay() {
  const s = game.state, D = game.world.day, w = game.world;
  sfx.select();
  const clock = h('b', { class: 'big-clock' }, fmtClock(s.submittedAt));
  const lines = h('div', { class: 'typed center' });
  const go = btn('START ROUND 2 ▶', scan, 'btn primary big'); go.hidden = true;
  const el = show('wake', 'stage-done reset', h('div', { class: 'center-card' }, h('p', { class: 'stage-k cy' }, 'ROUND 2 · WITH WAKE'), clock, lines, go));
  let fast = reduced; el.addEventListener('click', (e) => { if (e.target !== go) fast = true; });
  (async () => {
    el.classList.add('vhs'); sfx.zoom();
    const step = Math.max(1, Math.round((s.submittedAt - D.start) / 24));
    for (let m = s.submittedAt; m > D.start; m -= step) { clock.textContent = fmtClock(m); await wait(fast ? 0 : 40); }
    clock.textContent = fmtClock(D.start); el.classList.remove('vhs'); sfx.credit();
    const text = [
      'Same Monday. Same 7:48 AM.',
      'Same company, same people, same numbers. Every report, email and text is exactly what you just worked through.',
      'One thing is different. This time Wake is running underneath your systems, and it has already read all of it.',
      'Your job is the part only you can do: decide.',
    ];
    for (const [i, line] of text.entries()) {
      const p = h('p', { class: i === 0 ? 'stamp-px' : '' }); lines.appendChild(p);
      for (const ch of line) { if (fast) { p.textContent = line; break; } p.textContent += ch; if (ch !== ' ') sfx.type(); await wait(18); }
      await wait(fast ? 0 : 260);
    }
    go.hidden = false; go.focus({ preventScroll: true });
  })();
}

// ------------------------------------------------------------------ ROUND 2: with Wake
// Wake reads everything first, in front of the player. Then it loads into the desk.
function scan() {
  const B = game.startRound2();
  const n = (x) => x.toLocaleString('en-US');
  const canvas = h('canvas', { class: 'field', 'aria-hidden': 'true' });
  const sys = h('ul', { class: 'syslist' }, B.systems.map((x) => h('li', {}, h('span', {}, x.name), h('b', {}, n(x.n)))));
  const cap = h('p', { class: 'cap' }, h('b', {}, n(B.funnel.records)), ' records across every system this morning. Yellow is what you looked at in Round 1.');
  let alive = true;
  const done = () => { if (!alive) return; alive = false; leave(); round2(); };
  const skip = btn('SKIP ▶', done, 'btn');
  show('wake', 'scan', h('h1', {}, 'WAKE IS READING YOUR MORNING'), h('div', { class: 'scan-grid' }, h('div', { class: 'field-wrap' }, canvas), sys), cap, h('div', { class: 'row' }, skip));
  const field = createField(canvas, { ...B, findings: B.findings }, reduced);
  cleanup = () => { alive = false; field.destroy(); };
  (async () => {
    for (const li of [...sys.children]) { if (!alive) return; li.classList.add('on'); sfx.type(); await wait(160); }
    const steps = [[3, n(B.funnel.moved), ' moved outside their normal range.'], [4, n(B.funnel.material), ' connect to something real. ' + B.funnel.dismissed + ' false alarms cleared.'], [6, String(B.cards.length), ' insights, ranked. Loading to your desk.']];
    for (const [st, big, text] of steps) { if (!alive) return; field.setStage(st); cap.replaceChildren(h('b', {}, big), text); sfx.blip(); await wait(1500); }
    done();
  })();
}

function round2() {
  runRound2({ game, show, coach, reduced, onLock: () => walkToMeeting(), setCleanup: (fn) => { cleanup = fn; } });
}

// ------------------------------------------------------------------ the meeting
function walkToMeeting() {
  leave();
  arcade.walkScene(game, { day: 'MONDAY', time: '10:00 AM', people: 'meeting', route: 'toMeeting', from: { x: 284, y: 180 }, view: [144, 168, 2.6],
    lines: ['MONDAY  10:00 AM', 'Your team is in the room. They will act on exactly what you hand them, and they will have questions.', 'You\'ll run this meeting twice. First with the briefing you built on your own, then with the one you built with Wake.'],
    cta: 'START PRESENTING ▶' }, () => finale().meeting());
}

function walkBack() {
  leave();
  arcade.walkScene(game, { day: 'MONDAY', time: '10:52 AM', people: 'office', route: 'toOffice', from: { x: 110, y: 178 }, view: [272, 170, 3],
    lines: ['MONDAY  11:00 AM', 'Both plans go to work now.', 'Player 1 is the plan that left your meeting. Player 2 is the plan that left Wake\'s.', 'Same company, same people, same week. Watch them play out side by side, Monday to Friday.'],
    cta: 'PLAY OUT THE WEEK ▶' }, () => finale().week());
}

// Friday evening: the office empties out, then the final score.
function friday(then) {
  leave();
  arcade.walkScene(game, { day: 'FRIDAY', time: '6:10 PM', people: 'night', route: null, from: { x: 284, y: 180 }, view: [204, 150, 2.2], night: true,
    lines: ['FRIDAY  6:10 PM', 'The week is in. Both plans had the same five days.', 'Time to count it up.'],
    cta: 'SEE THE FINAL SCORE ▶' }, then);
}

// The finale: meeting, week, final score. Built per game so it reads the current one.
function finale() {
  return createFinale({ game, show, root, reduced, setCleanup: (fn) => { cleanup = fn; }, onWalkBack: walkBack, onFriday: friday, onRestart: restart, post, HOST });
}

// Optional: send the finished session to an endpoint for aggregate analysis.
function post() {
  const cfg = window.WAKE_CONFIG || {};
  if (!cfg.logEndpoint) return;
  try { navigator.sendBeacon(cfg.logEndpoint, new Blob([JSON.stringify(game.session())], { type: 'application/json' })); } catch (e) { /* never block the experience */ }
}

arcade.start();
