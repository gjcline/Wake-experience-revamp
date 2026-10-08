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
// A narrator that points at the real control and waits for the player to use it.
function createCoach() {
  const ring = h('div', { class: 'coach-ring', hidden: true });
  const box = h('div', { class: 'coach', hidden: true, role: 'status', 'aria-live': 'polite' });
  document.body.append(ring, box);
  let steps = [], i = -1, timer = null, inline = null;
  const recent = {}; // actions taken a moment before the step that asks for them
  function place() {
    const st = steps[i]; if (!st) return;
    const t = st.target ? document.querySelector(st.target) : null;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (st.inline) {
      // the guide lives inside the thing it points at, so nothing it explains is ever dimmed
      if (t && t.offsetParent !== null) {
        if (!inline || !t.contains(inline)) { if (inline) inline.remove(); inline = h('div', { class: 'coach-inline' }, h('b', {}, 'GUIDE'), h('p', {}, st.text), st.wait && !st.next ? h('span', { class: 'coach-wait' }, '▶ ' + (st.hint || 'Go ahead')) : st.next ? btn(st.next, () => advance(), 'btn primary small') : null); t.prepend(inline); try { inline.scrollIntoView({ block: 'nearest' }); } catch (e) { /* older browsers */ } }
        const r = t.getBoundingClientRect();
        ring.hidden = false; box.hidden = true;
        Object.assign(ring.style, { left: Math.max(2, r.left - 6) + 'px', top: Math.max(2, r.top - 6) + 'px', width: Math.min(vw - 4, r.width + 12) + 'px', height: Math.min(vh * 3, r.height + 12) + 'px' });
      } else { ring.hidden = true; box.hidden = true; }
      return;
    }
    box.hidden = false;
    if (t && t.offsetParent !== null) {
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
  function advance() { const st = steps[i]; sfx.select(); if (st && st.onNext) st.onNext(); go(i + 1); }
  function go(n) {
    if (inline) { inline.remove(); inline = null; }
    const prev = steps[i];
    i = n;
    while (steps[i] && steps[i].skipIf && steps[i].skipIf()) i += 1;
    const st = steps[i];
    if (!st) { const done = prev && prev.onDone; stop(); if (done) done(); return; }
    box.replaceChildren(h('b', {}, 'GUIDE'), h('p', {}, st.text), st.next ? btn(st.next, advance, 'btn primary small') : h('span', { class: 'coach-wait' }, '▶ ' + (st.hint || 'Go ahead')));
    box.hidden = !!st.inline;
    // bring what the guide points at into view before pointing at it
    const t = st.target ? document.querySelector(st.target) : null;
    if (t && t.offsetParent !== null) { const r = t.getBoundingClientRect(); if (r.top < 0 || r.bottom > window.innerHeight - 90) t.scrollIntoView({ block: r.height > window.innerHeight * 0.6 ? 'start' : 'center', behavior: 'auto' }); }
    sfx.blip(); place();
    const waits = [].concat(st.wait || []);
    if (waits.some((ev) => recent[ev] && Date.now() - recent[ev] < 1500)) setTimeout(() => { if (steps[i] === st) go(i + 1); }, 200);
  }
  function stop() { steps = []; i = -1; box.hidden = true; ring.hidden = true; clearInterval(timer); if (inline) { inline.remove(); inline = null; } }
  return {
    run(list) { steps = list; clearInterval(timer); timer = setInterval(place, 250); i = -1; go(0); },
    emit(ev) {
      recent[ev] = Date.now();
      const st = steps[i]; if (!st) return;
      if (st.back && st.back === ev) { setTimeout(() => go(Math.max(0, i - 1)), 120); return; }
      if (st.wait && (st.wait === ev || (Array.isArray(st.wait) && st.wait.includes(ev)))) setTimeout(() => go(i + 1), 120);
    },
    stop, active: () => i >= 0,
  };
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
    lines: ['MONDAY  10:00 AM', 'This is where data turns into work. Your team will act on exactly what you hand them.', 'You\'ll present twice. Your briefing first, then Wake\'s.'],
    cta: 'START PRESENTING ▶' }, meeting);
}

function meeting() {
  const w = game.world, Dl = game.delivery();
  const tiles = {};
  const ROOM = w.central.concat(w.locations.map((l) => l.manager));
  const board = h('div', { class: 'board' }, ROOM.concat(['me', 'none']).map((k) => {
    const p = k === 'none' ? { name: 'Nobody', title: 'No owner' } : game.person(k);
    const cnt = h('span', { class: 'cnt' });
    const el = h('div', { class: 'tile' + (k === 'none' ? ' nobody' : ''), 'data-k': k }, k === 'none' ? h('span', { class: 'avwrap q' }, '?') : av(k, 40), h('b', {}, first(p.name)), h('span', { class: 'ttl' }, k === 'me' ? 'You' : k === 'none' ? 'Unassigned' : (w.locations.find((l) => l.manager === k) || {}).name || p.title.split(',')[0]), cnt);
    tiles[k] = { el, cnt, you: 0, wake: 0 };
    return el;
  }));
  const head = h('div', { class: 'meet-head' });
  const stageEl = h('div', { class: 'meet-stage' });
  show('day', 'meeting', h('header', { class: 'bar' }, h('div', { class: 'when' }, h('span', { class: 'round-tag' }, 'THE MEETING'), h('b', { class: 'clock' }, '10:00 AM'), h('span', { class: 'co' }, w.shell.company))),
    head, board, stageEl);

  const land = (key, side) => { const t = tiles[key] || tiles.none; t[side] += 1; t.el.classList.remove('hit'); void t.el.offsetWidth; t.el.classList.add('hit', side); t.cnt.replaceChildren(t.you ? h('i', { class: 'y' }, String(t.you)) : '', t.wake ? h('i', { class: 'w' }, String(t.wake)) : ''); };
  const resetBoard = () => Object.values(tiles).forEach((t) => { t.you = 0; t.wake = 0; t.cnt.replaceChildren(); t.el.classList.remove('hit', 'you', 'wake'); });
  const chip = (status, label) => h('span', { class: 'status s-' + status }, label.toUpperCase());

  async function presentYours(i) {
    const Y = Dl.yours;
    head.replaceChildren(h('h1', {}, 'PRESENTATION 1 OF 2 · YOUR BRIEFING'), h('p', { class: 'lede' }, 'You hand over each finding exactly as you wrote it. Watch how the room takes it.'));
    if (i >= Y.length) return yoursDone();
    const y = Y[i];
    const reacts = h('div', { class: 'reacts' });
    const nextB = btn(i === Y.length - 1 ? 'FINISH YOUR BRIEFING ▶' : 'NEXT FINDING ▶', () => presentYours(i + 1), 'btn primary');
    nextB.hidden = true;
    stageEl.replaceChildren(h('article', { class: 'deliver you' },
      h('div', { class: 'dl-top' }, h('span', { class: 'rank' }, y.n + '/' + Y.length), h('span', { class: 'quiet' }, 'You flagged: ' + y.what.label + (y.what.value ? ' (' + y.what.value + ')' : ''))),
      h('div', { class: 'said-you' }, av('me', 36), h('p', {}, '"' + y.text + '"')),
      h('p', { class: 'quiet' }, y.owner ? 'For ' + y.owner.name : 'No owner named'), reacts, nextB));
    sfx.blip();
    for (const r of y.reactions) { await wait(700); reacts.appendChild(h('div', { class: 'react-line' }, av(r.who, 32), h('div', {}, h('b', {}, first(r.name)), h('p', {}, r.line)))); sfx.type(); }
    await wait(500);
    reacts.appendChild(chip(y.status, y.statusLabel));
    land(y.owner ? y.owner.key : 'none', 'you'); sfx[y.status === 'handed' ? 'coin' : 'back']();
    nextB.hidden = false; nextB.focus({ preventScroll: true });
  }
  function tallyLine(t) { return Object.entries(t).filter(([, v]) => v).map(([k, v]) => h('span', { class: 'status s-' + k }, v + ' ' + ({ handed: 'handed off', questions: 'with questions', pushback: 'pushed back', explained: 'already explained', offTarget: 'not a priority' })[k])); }
  function yoursDone() {
    game.presented('yours');
    stageEl.replaceChildren(h('div', { class: 'summary' }, h('h2', {}, 'YOUR BRIEFING'), h('div', { class: 'tally-line' }, tallyLine(Dl.tally.yours)),
      h('p', { class: 'lede' }, 'Now run the same meeting with Wake\'s briefing.'), btn('PRESENT WAKE\'S BRIEFING ▶', () => { resetBoard(); presentWake(); }, 'btn primary')));
  }
  async function presentWake() {
    root.className = 'wx arcade wake';
    head.replaceChildren(h('h1', {}, 'PRESENTATION 2 OF 2 · WAKE\'S BRIEFING'), h('p', { class: 'lede' }, 'Each item arrives with the evidence, the owner and the number to watch.'));
    const current = h('div', {});
    const done = h('ul', { class: 'done-list' });
    let fast = reduced;
    const skip = btn('SKIP ▶', () => { fast = true; }, 'btn small');
    stageEl.replaceChildren(current, done, h('div', { class: 'row' }, skip));
    for (const x of Dl.wake) {
      current.replaceChildren(h('article', { class: 'deliver wk' }, h('div', { class: 'dl-top' }, h('span', { class: 'rank' }, x.n + '/' + Dl.wake.length), h('strong', {}, x.headline)),
        h('p', {}, x.text), h('p', { class: 'quiet' }, 'For ' + x.owners.map((o) => o.name).join(' and ') + ' · ' + x.check),
        h('div', { class: 'react-line' }, av(x.reactions[0].who, 32), h('div', {}, h('b', {}, first(x.reactions[0].name)), h('p', {}, x.reactions[0].line))), chip('handed', 'Handed off')));
      x.owners.forEach((o) => land(o.key, 'wake')); sfx.coin();
      await wait(fast ? 0 : 1700);
      done.appendChild(h('li', {}, h('span', { class: 'status s-handed' }, '✓'), h('b', {}, x.owners.map((o) => first(o.name)).join(' + ')), ' ' + x.text));
    }
    current.replaceChildren();
    skip.remove();
    game.presented('wake');
    stageEl.appendChild(h('div', { class: 'summary' }, h('h2', {}, 'WAKE\'S BRIEFING'), h('div', { class: 'tally-line' }, tallyLine(Dl.tally.wake)), btn('SEE WHO LEFT WITH WHAT ▶', whoGotWhat, 'btn primary')));
  }
  function whoGotWhat() {
    const rows = Dl.board.slice().sort((a, b) => (b.wake.length + b.you.length) - (a.wake.length + a.you.length));
    head.replaceChildren(h('h1', {}, 'WHO LEFT THE ROOM WITH WHAT'), h('p', { class: 'lede' }, 'Same team, same hour. Here is the work each person walked out with.'));
    board.remove();
    stageEl.replaceChildren(h('div', { class: 'wgw' },
      h('div', { class: 'wgw-row head' }, h('span', {}, ''), h('b', { class: 'y' }, 'YOUR BRIEFING'), h('b', { class: 'w' }, 'WAKE\'S BRIEFING')),
      rows.map((r) => h('div', { class: 'wgw-row' },
        h('div', { class: 'who' }, r.person.key === 'none' ? h('span', { class: 'avwrap q' }, '?') : av(r.person.key, 32), h('b', {}, r.person.name)),
        h('div', { class: 'cellw y' }, r.you.length ? r.you.map((x) => h('p', {}, '"' + x.text + '" ', h('span', { class: 'status s-' + x.status }, x.statusLabel.toUpperCase()))) : h('p', { class: 'quiet' }, 'Nothing')),
        h('div', { class: 'cellw w' }, r.wake.length ? r.wake.map((x) => h('p', {}, x.text)) : h('p', { class: 'quiet' }, 'Nothing'))))),
      h('div', { class: 'row' }, btn('BACK TO YOUR OFFICE ▶', walkBack, 'btn primary')));
    window.scrollTo(0, 0);
  }
  presentYours(0);
}

function walkBack() {
  leave();
  arcade.walkScene(game, { day: 'MONDAY', time: '10:52 AM', people: 'office', route: 'toOffice', from: { x: 110, y: 178 }, view: [272, 170, 3],
    lines: ['MONDAY  10:52 AM', 'Both plans go to work now.', 'Watch them run side by side through Friday.'],
    cta: 'PLAY OUT THE WEEK ▶' }, week);
}

// ------------------------------------------------------------------ the week
function week() {
  const rows = game.week();
  const ARROW = { up: '▲', flat: '■', down: '▼' };
  const days = ['TUE', 'WED', 'THU', 'FRI'].map((d) => h('span', {}, d));
  const table = h('div', { class: 'lanes' }, h('div', { class: 'lane-row head' }, h('span', {}, ''), h('b', { class: 'y' }, 'YOUR PLAN'), h('b', { class: 'w' }, 'WAKE\'S PLAN')));
  const next = btn('SEE THE DIFFERENCE ▶', ending, 'btn primary');
  next.hidden = true;
  show('wake', 'week', h('h1', {}, 'THE WEEK · TWO PLANS'), h('p', { class: 'lede' }, 'Same company, same week. Your plan on the left, Wake\'s on the right.'), h('div', { class: 'days' }, days), table, h('div', { class: 'row' }, next));
  (async () => {
    for (const d of days) { d.classList.add('on'); sfx.blip(); await wait(380); }
    for (const r of rows) {
      const el = h('div', { class: 'lane-row' + (r.extra ? ' extra' : '') },
        h('b', { class: 'lbl' }, r.label),
        h('p', { class: 'cell ' + r.you.dir }, h('i', {}, ARROW[r.you.dir]), r.you.text),
        h('p', { class: 'cell ' + r.wake.dir }, h('i', {}, ARROW[r.wake.dir]), r.wake.text));
      table.appendChild(el); sfx[r.you.dir === 'up' ? 'coin' : 'type']();
      await wait(650);
    }
    next.hidden = false; next.focus({ preventScroll: true });
  })();
}

// ------------------------------------------------------------------ the ending
function ending() {
  const R = game.recap();
  game.complete(); post();
  const S = R.stats;
  const stat = (big, small) => h('div', { class: 'stat' }, h('b', {}, big), h('span', {}, small));
  const reportEl = h('div', { class: 'paper', hidden: true });
  const status = h('span', { class: 'quiet', 'aria-live': 'polite' });
  reportEl.replaceChildren(h('h2', {}, 'YOUR REPORT'), h('p', { class: 'meta' }, R.report.meta), ...R.report.sections.map((s) => h('section', {}, h('h3', {}, s.title), s.lines.map((l) => h('p', {}, l)))));
  const copy = async () => {
    try { await navigator.clipboard.writeText(R.report.toText()); status.textContent = 'Report copied.'; game.exported('copy'); }
    catch (e) { const ta = h('textarea', { id: 'wx-copy', class: 'copybox', rows: '8', readonly: true }); ta.value = R.report.toText(); reportEl.prepend(ta); ta.select(); status.textContent = 'Select all and copy.'; }
  };
  const download = () => { const a = h('a', { href: URL.createObjectURL(new Blob([R.report.toHTML()], { type: 'text/html' })), download: 'wake-experience.html' }); document.body.appendChild(a); a.click(); a.remove(); game.exported('download'); status.textContent = 'Report downloaded.'; };
  const email = () => { window.location.href = 'mailto:?subject=' + encodeURIComponent('The Wake Experience') + '&body=' + encodeURIComponent(R.report.toText().slice(0, 1800)); game.exported('email'); };
  const actions = HOST === 'artifact' ? [btn('COPY REPORT', copy, 'btn small')] : [btn('DOWNLOAD', download, 'btn small'), btn('EMAIL', email, 'btn small'), btn('COPY', copy, 'btn small')];
  const toggle = btn('VIEW YOUR REPORT ▼', () => { reportEl.hidden = !reportEl.hidden; toggle.textContent = reportEl.hidden ? 'VIEW YOUR REPORT ▼' : 'HIDE YOUR REPORT ▲'; if (!reportEl.hidden) reportEl.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }, 'btn');
  const parts = [
    h('h1', {}, 'SAME COMPANY. SAME DATA. SAME MORNING.'),
    h('div', { class: 'vs' },
      h('section', { class: 'col you' }, h('h2', {}, 'ON YOUR OWN'), stat(S.you.ready, 'briefing ready, after ' + S.you.took + ' of reading'), stat(S.you.real + ' of ' + S.wake.findings, 'real issues found'), stat(S.you.handed + ' of ' + S.you.flags, 'handed off cleanly')),
      h('section', { class: 'col wk' }, h('h2', {}, 'WITH WAKE'), stat('7:48 AM', 'briefing waiting before you sat down, decisions done by ' + S.wake.ready), stat(S.wake.findings + ' of ' + S.wake.findings, 'found, ' + S.wake.filtered + ' false alarms filtered'), stat(S.wake.handed + ' of ' + S.wake.handed, 'handed off cleanly'))),
    h('section', { class: 'moment' }, h('p', { class: 'stamp' }, 'THE MOMENT THAT MATTERED'), h('h2', {}, R.moment.title), R.moment.lines.map((l) => h('p', {}, l)), R.moment.wake ? h('p', { class: 'wake-line' }, R.moment.wake) : null),
    h('p', { class: 'closer' }, R.closer),
    h('div', { class: 'row' }, toggle, h('span', { class: 'row' }, actions, status)),
  ];
  show('wake', 'ending', h('div', { class: 'reveal end-copy' }, parts), reportEl,
    h('div', { class: 'row end' }, btn('PLAY AGAIN', restart, 'link'), h('a', { class: 'link', href: 'https://wakepe.com', target: '_blank', rel: 'noopener' }, 'wakepe.com')));
  (async () => { for (const p of parts) { p.classList.add('in'); sfx.blip(); await wait(550); } })();
}

// Optional: send the finished session to an endpoint for aggregate analysis.
function post() {
  const cfg = window.WAKE_CONFIG || {};
  if (!cfg.logEndpoint) return;
  try { navigator.sendBeacon(cfg.logEndpoint, new Blob([JSON.stringify(game.session())], { type: 'application/json' })); } catch (e) { /* never block the experience */ }
}

arcade.start();
