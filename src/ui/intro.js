// THE INTRO
// About 30 seconds, before the title screen on a first visit (and from "Watch the intro" after):
// Monday 7:48, an ERP full of numbers nobody has read, digging by hand, Wake reading it all first,
// the meeting with the answers in hand, and the line the game is built on. Drawn with the page
// itself, so it is sharp at any size and loads with the game. Skip is always there.

import { h } from './art.js';
import { icon } from './os/shell.js';

const INSIGHTS = [
  ['Union Square', 'Labor is up because the schedule moved, not because demand did.', 'UM'],
  ['Old Mill', 'The alignment rack keeps failing, and Cedar Park is paying for it.', 'TC'],
  ['All shops', 'A parts supplier is billing above the contract price.', 'DD'],
  ['Cedar Park', 'Regulars are drifting away behind a record month.', 'LA'],
  ['Stonebridge', 'New hires are leaving over late schedules.', 'TP'],
];
const SCENES = [
  // [start ms, kicker, caption]
  [0, '', ''],
  [4200, 'Everything in one place', 'Every report, scorecard and number is in your ERP. Nothing in it says what changed, or why.'],
  [10200, 'Round 1 · on your own', 'So you dig through it by hand, and hope nothing important is buried.'],
  [15800, 'Round 2 · with Wake', 'Wake reads all of it before you sit down, and hands you what matters, ranked, with an owner.'],
  [22600, '10:00 AM · the meeting', 'You walk in with the answers. Decisions, not follow-ups.'],
  [27600, '', ''],
];
export const INTRO_MS = 33000;

export function playIntro({ mount, reduced, onDone, still = false }) {
  const hue = (i) => ['#5B7DB1', '#3E8E7E', '#8A6FB8', '#C0794F', '#4F8FB8', '#7E8B3F'][i % 6];
  // the ERP wall: a grid of report tiles, each a few bars or a figure
  const tiles = Array.from({ length: 40 }, (_, i) => {
    const bars = Array.from({ length: 5 }, (_, j) => h('i', { style: { height: (25 + ((i * 37 + j * 53) % 70)) + '%', background: hue(i) } }));
    const fig = ['$175.3k', '34.3%', '−11.9%', '4.6', '$1.15M', '27.2%', '+9.3%', '13 min', '58%', '98%'][i % 10];
    return h('div', { class: 'it-tile' }, h('span', { class: 'it-tl' }), i % 3 ? h('div', { class: 'it-bars' }, bars) : h('b', { class: 'it-fig' }, fig));
  });
  const cursor = h('div', { class: 'it-cur' });
  const wall = h('div', { class: 'it-wall' }, tiles, cursor);
  const counts = h('div', { class: 'it-counts' }, ['4,785 records', '26 indicators', '19 reports', '11 emails', '3 texts'].map((x) => h('span', {}, x)));
  const core = h('div', { class: 'it-core' }, icon('wake', 'ico it-logo'), h('span', {}, 'Wake'));
  const cards = h('ol', { class: 'it-cards' }, INSIGHTS.map(([place, text, who], i) => h('li', { style: { transitionDelay: (i * 160) + 'ms' } }, h('em', {}, String(i + 1)), h('div', {}, h('small', {}, place), h('b', {}, text)), h('span', { class: 'it-who' }, who))));
  const meet = h('div', { class: 'it-meet' }, INSIGHTS.slice(0, 3).map(([place, text], i) => h('div', { class: 'it-row', style: { transitionDelay: (i * 650) + 'ms' } }, h('span', {}, place), h('b', {}, text), h('em', {}, 'Decided'))),
    h('p', { class: 'it-stat' }, h('b', {}, '3 of 3'), ' decided in the room · ', h('b', {}, '0'), ' follow-ups'));
  const clock = h('b', { class: 'it-clock' }, '7:48 AM');
  const mini = h('span', { class: 'it-mini' }, '7:48 AM');
  const kicker = h('p', { class: 'it-k' }), caption = h('p', { class: 'it-cap' });
  const open = h('div', { class: 'it-open' }, h('p', {}, 'Monday'), clock, h('p', { class: 'it-sub' }, 'Your leadership meeting is at 10:00. Your team expects you to know what matters this week.'));
  const end = h('div', { class: 'it-end' }, h('h1', {}, h('span', {}, 'Same company.'), h('span', {}, 'Same data.'), h('span', {}, 'Same Monday.')),
    h('p', {}, 'Run it on your own. Then run it with Wake.'), h('div', { class: 'it-brand' }, icon('wake', 'ico it-logo'), h('b', {}, 'Wake')));
  const skip = h('button', { class: 'it-skip', type: 'button' }, 'Skip intro');
  const bar = h('i');
  const root = h('main', { class: 'sc-screen it' + (still ? ' still' : '') },
    h('div', { class: 'it-stage' }, open, h('div', { class: 'it-board' }, wall, core, cards, counts, mini), meet, end),
    h('div', { class: 'it-text' }, kicker, caption),
    still ? null : skip, h('div', { class: 'it-prog' }, bar));
  mount(root);

  let done = false;
  const timers = [];
  let tick = 0;
  const at = (ms, fn) => timers.push(setTimeout(fn, reduced ? 0 : ms));
  const stop = () => { done = true; timers.forEach(clearTimeout); clearInterval(tick); window.removeEventListener('keydown', key); };
  const finish = () => { if (done) return; stop(); if (onDone) onDone(); };
  skip.onclick = finish;
  function key(e) { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); finish(); } }
  if (!still) window.addEventListener('keydown', key);
  if (reduced && !still) { finish(); return stop; }

  const set = (cls) => { root.dataset.scene = cls; };
  const say = (k, c) => { kicker.textContent = k; caption.classList.remove('in'); void caption.offsetWidth; caption.textContent = c; caption.classList.add('in'); };
  const t0 = performance.now();
  bar.style.transitionDuration = INTRO_MS + 'ms';
  requestAnimationFrame(() => { bar.style.width = '100%'; });
  // the clock runs from 7:48 toward 10:00 while you dig
  const fmt = (m) => { const hh = Math.floor(m / 60), mm = m % 60; return ((hh + 11) % 12 + 1) + ':' + String(mm).padStart(2, '0') + ' AM'; };

  set('open');
  at(400, () => root.classList.add('go'));
  at(SCENES[1][0], () => { set('wall'); say(SCENES[1][1], SCENES[1][2]); tiles.forEach((t, i) => setTimeout(() => t.classList.add('on'), i * 45)); });
  at(SCENES[2][0], () => {
    set('dig'); say(SCENES[2][1], SCENES[2][2]);
    let m = 468, k = 0;
    tick = setInterval(() => {
      m = Math.min(592, m + 5); mini.textContent = fmt(m);
      const t = tiles[(k * 17 + 5) % tiles.length]; k += 1;
      tiles.forEach((x) => x.classList.remove('hot')); t.classList.add('hot');
      const r = t.getBoundingClientRect(), b = wall.getBoundingClientRect();
      cursor.style.transform = 'translate(' + (r.left - b.left + r.width / 2) + 'px,' + (r.top - b.top + r.height / 2) + 'px)';
    }, 400);
  });
  at(SCENES[3][0], () => {
    clearInterval(tick); tiles.forEach((x) => x.classList.remove('hot'));
    set('wake'); say(SCENES[3][1], SCENES[3][2]); mini.textContent = '7:48 AM';
    const c = core.getBoundingClientRect();
    tiles.forEach((t, i) => { const r = t.getBoundingClientRect(); t.style.transitionDelay = (i % 12) * 40 + 'ms'; t.style.transform = 'translate(' + (c.left + c.width / 2 - r.left - r.width / 2) + 'px,' + (c.top + c.height / 2 - r.top - r.height / 2) + 'px) scale(.1)'; t.classList.add('gone'); });
  });
  at(SCENES[3][0] + 2200, () => root.classList.add('cards'));
  at(SCENES[4][0], () => { set('meet'); say(SCENES[4][1], SCENES[4][2]); });
  at(SCENES[5][0], () => { set('end'); say('', ''); });
  at(INTRO_MS, () => { if (!still) finish(); });
  void t0;
  return stop;
}
