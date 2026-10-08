// THE ARCADE FRONT END
// Attract screen, coin drop and zoom, how-to-play card, game setup, countdown, and the
// bird's-eye arrival. Everything shown about a business or role is read from configuration.

import { h } from '../art.js';
import { SHELLS, SHELL_ORDER } from '../../content/shells.js';
import { ROLES, ROLE_ORDER } from '../../content/roles.js';
import { makeResolver, randomSeed } from '../../engine/config.js';
import { previewScenario } from '../../content/scenario.js';
import { sfx } from './sound.js';
import { createMap, personPal } from './map.js';

// ?seed=123 replays a specific company (useful for demos and support)
const urlSeed = () => { try { const v = new URLSearchParams(window.location.search).get('seed'); return v && /^\d+$/.test(v) ? Number(v) : 0; } catch (e) { return 0; } };
export const ROLE_COLOR = { gm: '#FF4F8B', coo: '#39E5E0', owner: '#FFD23F', partner: '#A98BFF', regional: '#5BD66B' };
const LENS_NAME = { finance: 'FINANCE', labor: 'LABOR', operations: 'OPERATIONS', customer: 'CUSTOMERS', maintenance: 'MAINTENANCE', people: 'PEOPLE', purchasing: 'PURCHASING' };

// ------------------------------------------------------------------ pixel art helpers
function pix(rows, pal, px = 4) {
  const w = rows[0].length, hgt = rows.length;
  let r = '';
  rows.forEach((row, y) => [...row].forEach((k, x) => { if (k !== '.') r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${pal[k]}"/>`; }));
  return `<svg class="pix" width="${w * px}" height="${hgt * px}" viewBox="0 0 ${w} ${hgt}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
const Y = '#FFD23F', K = '#39E5E0', M = '#FF4F8B', W = '#F4F1DE', D = '#2C2650';
const ICON = {
  clock: [['..WWWW..', '.W....W.', 'W...Y..W', 'W...Y..W', 'W...YY.W', 'W......W', '.W....W.', '..WWWW..'], { W, Y }],
  pin: [['...MM...', '..MMMM..', '..MMMM..', '.MMMMMM.', '...WW...', '...WW...', '....W...', '....W...'], { M, W }],
  phone: [['.KKKKKK.', 'KK....KK', 'K.KKKK.K', '..KYYK..', '.KKYYKK.', '.KKKKKK.', '.KKKKKK.', '........'], { K, Y }],
  table: [['.W.W.W..', 'YYYYYYY.', 'YYYYYYY.', '.W.W.W..', '........', '.K....K.', 'KKK..KKK', '........'], { W, Y, K }],
  job: [['..YYYY..', '..Y..Y..', 'YYYYYYYY', 'Y......Y', 'YYYKKYYY', 'Y......Y', 'Y......Y', 'YYYYYYYY'], { Y, K }],
  wake: [['K......K', 'K......K', 'K..KK..K', 'K..KK..K', 'K.KKKK.K', 'KKK..KKK', 'KK....KK', 'K......K'], { K }],
  eye: [['........', '..WWWW..', '.W....W.', 'W..KK..W', 'W..KK..W', '.W....W.', '..WWWW..', '........'], { W, K }],
  service: [['.....YY.', '....Y..Y', '....Y.YY', '...YYY..', '..YYY...', '.YYY....', 'YYY.....', 'YY......'], { Y }],
  clinical: [['...MM...', '...MM...', '...MM...', 'MMMMMMMM', 'MMMMMMMM', '...MM...', '...MM...', '...MM...'], { M }],
  consumer: [['...YY...', '...YY...', 'YYYYYYYY', '.YYYYYY.', '..YYYY..', '.YY..YY.', 'YY....YY', '........'], { Y }],
  field: [['........', 'KKKKK...', 'KKKKKKK.', 'KKKKKKKK', 'KKKKKKKK', '.WW..WW.', '.WW..WW.', '........'], { K, W }],
  multi: [['M.....M.', 'MM...MM.', 'M..M..M.', '..MMM...', '...M....', 'M.....M.', 'MM...MM.', 'M.....M.'], { M }],
};
const icon = (name, px) => h('span', { class: 'icon', html: pix(ICON[name][0], ICON[name][1], px) });
const DOWN = ['..HHH..', '.HHHHH.', '.HSSSH.', '..SSS..', '.CCCCC.', 'SCCCCCS', '.CCCCC.', '.PP.PP.', '.PP.PP.', '.KK.KK.'];
const playerSprite = (role, px = 6) => h('span', { class: 'icon', html: pix(DOWN, personPal({ hair: '#2A1C14', skin: '#D9A07A' }, ROLE_COLOR[role]), px) });

// ------------------------------------------------------------------ shared bits
// One sound switch for the whole game, mounted outside the screens so it never moves.
export function ensureMute() { if (!document.querySelector('.a-mute')) document.body.appendChild(muteBtn()); }
function muteBtn() {
  const b = h('button', { class: 'a-mute', type: 'button', 'aria-pressed': String(!sfx.isMuted()) }, sfx.isMuted() ? 'SOUND OFF' : 'SOUND ON');
  b.addEventListener('click', (e) => { e.stopPropagation(); sfx.setMuted(!sfx.isMuted()); b.textContent = sfx.isMuted() ? 'SOUND OFF' : 'SOUND ON'; b.setAttribute('aria-pressed', String(!sfx.isMuted())); if (!sfx.isMuted()) sfx.blip(); });
  return b;
}
const abtn = (label, onclick, cls = 'a-btn') => h('button', { class: cls, type: 'button', onclick: (e) => { sfx.select(); onclick(e); } }, label);

function logo() {
  const letters = (word, cls) => h('span', { class: cls }, [...word].map((ch, i) => h('i', { style: { animationDelay: (0.6 + i * 0.09) + 's' } }, ch)));
  return h('div', { class: 'logo', role: 'img', 'aria-label': 'The Wake Experience' }, h('span', { class: 'the' }, 'THE'), letters('WAKE', 'wake'), h('span', { class: 'exp' }, 'EXPERIENCE'));
}

// slowly drifting pixel skyline for the attract screen
function skyline(reduced) {
  const c = h('canvas', { class: 'skyline', 'aria-hidden': 'true' });
  const g = c.getContext('2d');
  let raf = 0, off = 0, dead = false;
  const blds = []; let x = 0, seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  while (x < 640) { const w = 14 + Math.floor(rnd() * 26), hh = 18 + Math.floor(rnd() * 60); blds.push({ x, w, h: hh, lit: Array.from({ length: 12 }, () => rnd() > 0.72) }); x += w + 2; }
  const draw = () => {
    if (dead) return;
    c.width = 320; c.height = 90; g.imageSmoothingEnabled = false;
    for (let i = 0; i < 40; i++) { g.fillStyle = i % 7 ? '#2C2650' : '#5B4C99'; g.fillRect((i * 53 + 17) % 320, (i * 29) % 40, 1, 1); }
    for (const b of blds) for (const dx of [0, 640]) {
      const bx = Math.floor(b.x + dx - off);
      if (bx > 320 || bx + b.w < 0) continue;
      g.fillStyle = '#140F2B'; g.fillRect(bx, 90 - b.h, b.w, b.h);
      b.lit.forEach((l, i) => { if (l) { g.fillStyle = i % 3 ? '#3B2F6E' : '#FFD23F33'; g.fillRect(bx + 3 + (i % 3) * 4, 90 - b.h + 4 + Math.floor(i / 3) * 6, 2, 3); } });
    }
    g.fillStyle = '#1D1640'; g.fillRect(0, 88, 320, 2);
    off = (off + 0.12) % 640;
    if (!reduced) raf = requestAnimationFrame(draw);
  };
  draw();
  return { el: c, stop: () => { dead = true; cancelAnimationFrame(raf); } };
}

// ------------------------------------------------------------------ the cabinet
function cabinetSVG(company) {
  return `<svg class="cab" viewBox="0 0 400 700" aria-hidden="true">
    <defs><linearGradient id="cabSide" x1="0" x2="1"><stop offset="0" stop-color="#1A1533"/><stop offset="1" stop-color="#0E0B1E"/></linearGradient></defs>
    <path d="M30 10h340l10 360-30 60 20 260H30l20-260-30-60z" fill="url(#cabSide)"/>
    <path d="M30 10h340l10 360-30 60 20 260" fill="none" stroke="#FF4F8B" stroke-width="4"/>
    <path d="M370 10H30l-10 360 30 60-20 260" fill="none" stroke="#39E5E0" stroke-width="4"/>
    <rect x="44" y="24" width="312" height="78" fill="#120B2A"/>
    <rect x="44" y="24" width="312" height="78" fill="none" stroke="#2C2650" stroke-width="3"/>
    <text x="200" y="66" text-anchor="middle" font-family="'Press Start 2P', monospace" font-size="30" fill="#FFD23F" class="marquee">WAKE</text>
    <text x="200" y="90" text-anchor="middle" font-family="'Press Start 2P', monospace" font-size="9" fill="#39E5E0" letter-spacing="3">THE EXPERIENCE</text>
    <rect x="48" y="118" width="304" height="246" rx="8" fill="#05040C"/>
    <rect class="cab-screen" x="70" y="138" width="260" height="195" fill="#000"/>
    <g class="cab-title">
      <text x="200" y="200" text-anchor="middle" font-family="'Press Start 2P', monospace" font-size="9" fill="#39E5E0" letter-spacing="2">THE</text>
      <text x="200" y="236" text-anchor="middle" font-family="'Press Start 2P', monospace" font-size="30" fill="#FFD23F" style="paint-order:stroke" stroke="#FF4F8B" stroke-width="3">WAKE</text>
      <text x="200" y="262" text-anchor="middle" font-family="'Press Start 2P', monospace" font-size="9" fill="#F4F1DE" letter-spacing="2">EXPERIENCE</text>
      <text class="cab-msg" x="200" y="306" text-anchor="middle" font-family="'Press Start 2P', monospace" font-size="8" fill="#FF4F8B">INSERT COIN</text>
    </g>
    <path d="M40 380h320l24 56H16z" fill="#2A2350"/><path d="M16 436h368v16H16z" fill="#1D1840"/>
    <rect x="96" y="400" width="10" height="26" fill="#3A3460"/><circle cx="101" cy="398" r="11" fill="#FF4F8B"/>
    <circle cx="232" cy="414" r="11" fill="#FFD23F"/><circle cx="268" cy="404" r="11" fill="#39E5E0"/><circle cx="304" cy="414" r="11" fill="#A98BFF"/>
    <text x="200" y="476" text-anchor="middle" font-family="'Press Start 2P', monospace" font-size="7" fill="#5B4C99" letter-spacing="1">${company}</text>
    <rect x="140" y="510" width="120" height="150" rx="4" fill="#1B1734" stroke="#2C2650" stroke-width="3"/>
    <rect x="168" y="530" width="64" height="74" rx="3" fill="#2C2650"/>
    <rect class="slot-glow" x="174" y="536" width="52" height="20" rx="2" fill="#FF4F8B" opacity=".25"/>
    <text x="200" y="550" text-anchor="middle" font-family="'Press Start 2P', monospace" font-size="7" fill="#FF4F8B">25¢</text>
    <rect x="196" y="562" width="8" height="34" rx="2" fill="#05040C"/>
    <text class="slot-label" x="200" y="630" text-anchor="middle" font-family="'Press Start 2P', monospace" font-size="7" fill="#FFD23F">INSERT COIN</text>
    <g class="coin" opacity="0"><circle r="13" fill="#FFD23F"/><circle r="9" fill="none" stroke="#C99A1E" stroke-width="2"/><rect x="-1.5" y="-5" width="3" height="10" fill="#C99A1E"/></g>
    <rect x="30" y="690" width="340" height="10" fill="#07060F"/>
  </svg>`;
}

// ------------------------------------------------------------------ flow
export function createArcade({ root, reduced, onPicked }) {
  let teardown = [];
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const clear = () => { teardown.forEach((f) => f()); teardown = []; };
  const keys = (fn) => { const k = (e) => fn(e); window.addEventListener('keydown', k); teardown.push(() => window.removeEventListener('keydown', k)); };
  function screen(cls, ...kids) {
    clear();
    root.className = 'wx arcade';
    const el = h('main', { class: 'a-screen ' + cls }, ...kids);
    root.replaceChildren(el);
    ensureMute();
    window.scrollTo(0, 0);
    return el;
  }

  // 1. attract screen: powered off, CRT turns on, the logo lands, INSERT COIN blinks
  function attract() {
    const sky = skyline(reduced);
    teardown.push(sky.stop);
    let gone = false;
    const insert = () => { if (gone) return; gone = true; sfx.unlock(); coinDrop(); };
    const el = screen('attract' + (reduced ? ' still' : ''),
      h('div', { class: 'crt-on', 'aria-hidden': 'true' }),
      h('div', { class: 'hud' }, h('span', {}, '1 PLAYER'), h('span', {}, 'CREDIT 00')),
      logo(),
      h('button', { class: 'a-btn blink insert', type: 'button', onclick: insert }, 'INSERT COIN'),
      h('p', { class: 'a-small' }, 'PRESS ENTER OR CLICK TO PLAY'),
      sky.el,
      h('p', { class: 'a-foot' }, '© 2026 WAKE  ·  WAKEPE.COM'));
    keys((e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); insert(); } });
    void el;
  }

  // 2. pull back to the cabinet, drop the coin, push into the screen
  async function coinDrop() {
    const company = 'WAKE · 1 PLAYER';
    const stage = h('div', { class: 'cab-stage' });
    const holder = h('div', { class: 'cab-holder', html: cabinetSVG(company) });
    stage.appendChild(holder);
    screen('cabinet', stage);
    const svg = holder.querySelector('svg');
    const scr = svg.querySelector('.cab-screen');
    const fill = () => {
      // transform that makes the cabinet's screen cover the viewport
      holder.style.transition = 'none'; holder.style.transform = 'none';
      const hr = holder.getBoundingClientRect(), sr = scr.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      const s = Math.max(vw / sr.width, vh / sr.height) * 1.04;
      const cx = sr.left - hr.left + sr.width / 2, cy = sr.top - hr.top + sr.height / 2;
      return `translate(${vw / 2 - hr.left - cx * s}px, ${vh / 2 - hr.top - cy * s}px) scale(${s})`;
    };
    if (reduced) { sfx.coin(); return rules(); }
    const zoomed = fill();
    holder.style.transform = zoomed; void holder.offsetWidth;
    holder.style.transition = 'transform 1.2s cubic-bezier(.6,0,.2,1)';
    holder.style.transform = 'none';
    await wait(1350);
    // the coin
    const coin = svg.querySelector('.coin');
    const t0 = performance.now();
    await new Promise((res) => {
      const path = (p) => { // arc in from the right, settle at the slot, turn edge-on, drop in
        if (p < 0.6) { const q = p / 0.6; return { x: 300 - 100 * q, y: 470 + 109 * q - 60 * Math.sin(Math.PI * q), sx: 1, o: 1 }; }
        if (p < 0.8) { const q = (p - 0.6) / 0.2; return { x: 200, y: 579, sx: 1 - 0.85 * q, o: 1 }; }
        const q = (p - 0.8) / 0.2; return { x: 200, y: 579 + 12 * q, sx: 0.15, o: 1 - q };
      };
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / 1300), c = path(p);
        coin.setAttribute('opacity', c.o); coin.setAttribute('transform', `translate(${c.x} ${c.y}) scale(${c.sx} 1)`);
        if (p < 1) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
    sfx.coin(); await wait(160); sfx.thunk();
    svg.querySelector('.slot-glow').setAttribute('opacity', '.9');
    svg.querySelector('.slot-label').textContent = 'CREDIT 01';
    const msg = svg.querySelector('.cab-msg'); msg.textContent = 'PLAYER 1  READY'; msg.setAttribute('fill', '#39E5E0');
    sfx.credit();
    await wait(1100);
    sfx.zoom();
    const target = fill(); void holder.offsetWidth;
    holder.style.transition = 'transform 1.15s cubic-bezier(.7,0,.3,1)';
    holder.style.transform = target;
    await wait(1250);
    stage.classList.add('flash');
    await wait(220);
    rules();
  }

  // 3. how to play
  function rules() {
    const item = (ic, head, text) => h('li', {}, icon(ic, 4), h('div', {}, h('b', {}, head), h('p', {}, text)));
    const go = () => { sfx.start(); setupBusiness(); };
    screen('rules',
      h('div', { class: 'panel-px' },
        h('h1', {}, 'HOW TO PLAY'),
        h('ul', { class: 'rule-list' },
          item('job', 'THE JOB', 'Run a company for one Monday morning. Every game is a different company, with its own locations, people and numbers. You\'ll prepare for one meeting, twice.'),
          item('pin', 'ROUND 1 · ON YOUR OWN', 'Your desk holds everything your team sent. Flag at least 3 figures that matter and decide what should happen with each.'),
          item('clock', 'THE MEETING TIME', 'Your meeting starts at 10:00 AM. Have your briefing ready by then.'),
          item('wake', 'ROUND 2 · WITH WAKE', 'Same desk, same data, same 7:48 AM. This time Wake is running underneath it.'),
          item('table', 'THE MEETING', 'Present both briefings to your team and see how each one lands. Then watch both plans play out over the week.'),
          item('eye', 'NO SCORE', 'No points and no right answers. A guide walks you through every step.')),
        h('div', { class: 'a-row' }, h('span', { class: 'a-small' }, 'ABOUT 15 MINUTES'), abtn('PRESS START', go, 'a-btn primary blink-soft'))));
    keys((e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  }

  // 4. game setup, one choice per screen, joystick friendly
  function selector({ step, title, items, onPick, onBack }) {
    let at = 0;
    const detail = h('div', { class: 'detail' });
    const cards = items.map((it, i) => h('button', { class: 'sel', type: 'button', onmouseenter: () => focus(i), onfocus: () => focus(i, true), onclick: () => { sfx.select(); onPick(it.id); } }, it.art, h('b', {}, it.name), h('span', {}, it.tag)));
    function focus(i, quiet) {
      if (i === at && cards[i].classList.contains('on')) return;
      at = (i + items.length) % items.length;
      cards.forEach((c, j) => c.classList.toggle('on', j === at));
      if (document.activeElement !== cards[at] && document.activeElement && document.activeElement.classList.contains('sel')) cards[at].focus({ preventScroll: true });
      detail.replaceChildren(...items[at].detail);
      if (!quiet) sfx.blip();
    }
    screen('setup',
      h('div', { class: 'setup-head' }, h('span', { class: 'a-small' }, 'GAME SETUP  ' + step), h('h1', {}, title)),
      h('div', { class: 'sel-row' }, cards), detail,
      h('div', { class: 'a-row' }, onBack ? abtn('◀ BACK', onBack, 'a-btn ghost') : h('span'), h('span', { class: 'a-small hint' }, '◀ ▶ TO MOVE  ·  ENTER TO SELECT')));
    at = -1; focus(0, true);
    keys((e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); focus(at + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); focus(at - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); sfx.select(); onPick(items[at].id); }
      else if (e.key === 'Escape' && onBack) { sfx.back(); onBack(); }
    });
    cards[0].focus({ preventScroll: true });
  }

  const pick = { shell: null, role: null, seed: 0 };
  const THU = { gm: 'LENDER REVIEW', coo: 'BOARD CALL', owner: 'BANK COVENANT CHECK', partner: 'QUARTERLY REVIEW', regional: 'LABOR REVIEW' };
  const TAGS = { service: 'Auto, repair, trades', clinical: 'Clinics and practices', consumer: 'Studios and clubs', field: 'Crews and service calls', multi: 'Restaurants and sites' };

  function setupBusiness() {
    selector({
      step: '1 / 2', title: 'CHOOSE THE BUSINESS',
      items: SHELL_ORDER.map((id) => {
        const s = SHELLS[id];
        return { id, name: s.label.toUpperCase(), tag: TAGS[id], art: icon(id, 6),
          detail: [h('b', {}, s.label), h('p', {}, s.blurb), h('dl', {}, h('dt', {}, 'ON THE FLOOR'), h('dd', {}, s.vocab.frontlines.toUpperCase()), h('dt', {}, 'YOU SERVE'), h('dd', {}, s.vocab.customers.toUpperCase()), h('dt', {}, 'THE COMPANY'), h('dd', {}, 'NEW EVERY GAME'))] };
      }),
      onPick: (id) => { pick.shell = id; pick.seed = urlSeed() || randomSeed(); setupRole(); },
      onBack: () => rules(),
    });
  }

  function setupRole() {
    const t = makeResolver(SHELLS[pick.shell].vocab);
    selector({
      step: '2 / 2', title: 'CHOOSE YOUR ROLE',
      items: ROLE_ORDER.map((id) => {
        const r = ROLES[id];
        return { id, name: r.label.toUpperCase(), tag: r.blurb, art: playerSprite(id, 7),
          detail: [h('b', {}, r.label), h('p', {}, t(r.seat)), h('dl', {}, h('dt', {}, 'FIRST LOOK'), h('dd', {}, LENS_NAME[r.lens[0]] + ' + ' + LENS_NAME[r.lens[1]]), h('dt', {}, '10:00 AM'), h('dd', {}, r.meetingName.toUpperCase()), h('dt', {}, 'THURSDAY'), h('dd', {}, THU[id]))] };
      }),
      onPick: (id) => { pick.role = id; ready(); },
      onBack: () => setupBusiness(),
    });
  }

  function ready() {
    const s = SHELLS[pick.shell], r = ROLES[pick.role];
    const pv = previewScenario(s, r, pick.seed);
    const row = (k, v) => [h('dt', {}, k), h('dd', {}, v)];
    const begin = () => countdown();
    const reroll = () => { pick.seed = randomSeed(); ready(); };
    screen('ready',
      h('div', { class: 'panel-px card-ready' },
        h('div', { class: 'ready-art' }, playerSprite(pick.role, 9), icon(pick.shell, 9)),
        h('div', {},
          h('h1', {}, 'READY?'),
          h('dl', {}, row('COMPANY', pv.company.toUpperCase()), row('BUSINESS', s.label.toUpperCase()), row('YOUR ROLE', r.label.toUpperCase()), row('SIZE', (pv.N > 1 ? pv.N + ' ' + s.vocab.units : '1 ' + s.vocab.unit).toUpperCase() + ' · ' + pv.headcount + ' PEOPLE'), row('START', pv.monday.toUpperCase() + ', 7:48 AM'), row('MEETING', '10:00 AM')),
          h('div', { class: 'a-row' }, abtn('◀ CHANGE', setupBusiness, 'a-btn ghost'), abtn('NEW COMPANY', reroll, 'a-btn ghost'), abtn('START ▶', begin, 'a-btn primary')))));
    keys((e) => { if (e.key === 'Enter') { e.preventDefault(); sfx.select(); begin(); } else if (e.key === 'Escape') { sfx.back(); setupRole(); } });
  }

  async function countdown() {
    clear();
    const n = h('div', { class: 'count' });
    root.querySelector('.a-screen').appendChild(n);
    for (const v of ['3', '2', '1']) { n.textContent = v; n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); sfx.count(); await wait(650); }
    n.textContent = 'GO!'; n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop', 'go'); sfx.go();
    await wait(600);
    onPicked(pick.shell, pick.role, pick.seed);
  }

  // 5. the arrival: bird's-eye view, walk to the desk, then the morning brief
  async function arrival(sim, done) {
    const w = sim.world;
    const clockEl = h('b', {}, '7:42 AM');
    const skipBtn = h('button', { class: 'a-btn ghost small', type: 'button' }, 'SKIP ▶');
    const holder = h('div', { class: 'map-holder' });
    const box = h('div', { class: 'dialog-px', hidden: true });
    screen('arrival',
      h('div', { class: 'hud' }, h('span', {}, 'MONDAY  ', clockEl), h('span', { class: 'co' }, w.shell.company.toUpperCase()), skipBtn),
      h('div', { class: 'map-frame' }, holder, box));
    const npcs = cast(w, 'office');
    const map = createMap(holder, { company: w.shell.company, playerShirt: ROLE_COLOR[pick.role], npcs, reduced, onClock: (m) => { clockEl.textContent = '7:' + String(m).padStart(2, '0') + ' AM'; } });
    teardown.push(() => map.destroy());
    let skipped = false;
    skipBtn.onclick = () => { skipped = true; map.skip(); sfx.select(); };
    await map.ready;
    await map.arrive();
    clockEl.textContent = '7:48 AM';
    skipBtn.hidden = true;
    // the morning brief, typed out RPG style
    typeBox(box, [
      'MONDAY  7:48 AM',
      'Your ' + w.role.meetingName + ' starts at 10:00 AM. Have your briefing ready by then.',
      'Round 1: prepare on your own. Everything your team sent is on your desk.',
      'Find what matters and decide what should happen.',
    ], 'SIT DOWN ▶', done, skipped);
  }

  // Types lines into a dialog box, then shows one button. Click anywhere to finish typing.
  async function typeBox(box, lines, cta, onGo, fastStart) {
    box.hidden = false;
    const text = h('div', { class: 'typed' });
    const nextBtn = h('button', { class: 'a-btn primary', type: 'button', hidden: true }, cta);
    box.replaceChildren(text, nextBtn);
    let fast = fastStart || reduced, gone = false;
    box.onclick = (e) => { if (e.target !== nextBtn) fast = true; };
    for (const [i, line] of lines.entries()) {
      const p = h('p', { class: i === 0 ? 'stamp-px' : '' });
      text.appendChild(p);
      for (const ch of line) { if (fast) { p.textContent = line; break; } p.textContent += ch; if (ch !== ' ') sfx.type(); await wait(20); }
      await wait(fast ? 0 : 220);
    }
    nextBtn.hidden = false; nextBtn.focus({ preventScroll: true });
    const go = () => { if (gone) return; gone = true; sfx.select(); const sc = root.querySelector('.a-screen'); if (sc) sc.classList.add('wipe'); setTimeout(() => { clear(); onGo(); }, reduced ? 0 : 600); };
    nextBtn.onclick = go;
    keys((e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  }

  // People in the building, by moment of the day.
  function cast(w, preset) {
    const c = (k) => w.characters[k].av;
    if (preset === 'meeting') return [
      { av: c('controller'), x: 132, y: 158, seated: true }, { av: c('opsdir'), x: 144, y: 158, seated: true }, { av: c('trainer'), x: 156, y: 158, seated: true },
      { av: c('hr'), x: 132, y: 180, seated: true, facing: 'up' }, { av: c('analyst'), x: 144, y: 180, seated: true, facing: 'up' }, { av: c('marketing'), x: 156, y: 180, seated: true, facing: 'up' },
    ];
    if (preset === 'night') return [];
    return [
      { av: c('marketing'), x: 132, y: 116, seated: false }, { av: c('controller'), x: 187, y: 89, seated: true },
      { av: c('analyst'), x: 255, y: 89, seated: true }, { av: c('hr'), x: 221, y: 115, seated: true }, { av: c('opsdir'), x: 212, y: 162, seated: false },
    ];
  }

  // 6. moving between rooms: the same map, the avatar walks, then a short dialog
  async function walkScene(sim, { day, time, people, route, from, view, lines, cta, night }, done) {
    const w = sim.world;
    const skipBtn = h('button', { class: 'a-btn ghost small', type: 'button' }, 'SKIP ▶');
    const holder = h('div', { class: 'map-holder' + (night ? ' night' : '') });
    const box = h('div', { class: 'dialog-px', hidden: true });
    screen('arrival walk',
      h('div', { class: 'hud' }, h('span', {}, day + '  ', h('b', {}, time)), h('span', { class: 'co' }, w.shell.company.toUpperCase()), skipBtn),
      h('div', { class: 'map-frame' }, holder, box));
    const map = createMap(holder, { company: w.shell.company, playerShirt: ROLE_COLOR[pick.role], npcs: cast(w, people), reduced, start: { ...from, z: 2.6 } });
    teardown.push(() => map.destroy());
    let skipped = false;
    skipBtn.onclick = () => { skipped = true; map.skip(); sfx.select(); };
    await map.ready;
    if (route) { await new Promise((r) => setTimeout(r, reduced ? 0 : 450)); map.follow(2.6); await map.walk(route); }
    if (view) map.view(view[0], view[1], view[2]);
    skipBtn.hidden = true;
    await new Promise((r) => setTimeout(r, reduced || skipped ? 0 : 500));
    typeBox(box, lines, cta, done, skipped);
  }

  return { start: attract, arrival, walkScene, stop: clear };
}
