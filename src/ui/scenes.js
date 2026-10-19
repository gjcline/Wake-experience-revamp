// THE WORLD
// The arcade you walk up to, the stage and character select on its screen, and the pixel office
// the morning happens in: the street, the lobby, the walk to your desk, the meeting room, Friday
// evening. Every step of the experience opens with one card that says what you're doing and why
// it matters. Everything shown about a business or role is read from configuration.

import { h } from './art.js';
import { SHELLS, SHELL_ORDER } from '../content/shells.js';
import { ROLES, ROLE_ORDER } from '../content/roles.js';
import { randomSeed } from '../engine/config.js';
import { previewScenario } from '../content/scenario.js';
import { sfx } from './arcade/sound.js';
import { createOffice, SEAT, ROLE_COLOR } from './pixel/office.js';

// The arcade photo is 2560 x 1440; rectangles are [x, y, width, height] in image pixels.
export const IW = 2560, IH = 1440;
export const ART = { arcade: { src: 'art/arcade.webp', screen: [966, 258, 628, 418] } };
const CABINET = [700, 0, 1160, 1440];
export const STEPS = ['Arrive', 'On your own', 'With Wake', 'The meeting', 'The week', 'Your score'];

// A photo fitted to the view. `cover` fills the view; otherwise the whole framing stays visible.
export function createView(art, { cover = true, cls = '' } = {}) {
  const img = h('img', { class: 'sc-img', src: art.src, alt: '', draggable: 'false' });
  const stage = h('div', { class: 'sc-stage' }, img);
  const el = h('div', { class: 'sc-view ' + cls }, stage);
  let shot = [0, 0, IW, IH], fill = cover;
  function apply() {
    const vw = el.clientWidth || window.innerWidth, vh = el.clientHeight || window.innerHeight;
    const [x, y, w, hh] = shot;
    const s = fill ? Math.max(vw / w, vh / hh) : Math.min(vw / w, vh / hh);
    let tx = vw / 2 - (x + w / 2) * s, ty = vh / 2 - (y + hh / 2) * s;
    tx = IW * s <= vw ? (vw - IW * s) / 2 : Math.min(0, Math.max(vw - IW * s, tx));
    ty = IH * s <= vh ? (vh - IH * s) / 2 : Math.min(0, Math.max(vh - IH * s, ty));
    stage.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
  }
  const onResize = () => apply();
  window.addEventListener('resize', onResize);
  return {
    el, stage, img,
    frame(next, opts = {}) { shot = next; if (opts.cover !== undefined) fill = opts.cover; apply(); },
    pin(rect, node, cls = '') { const [x, y, w, hh] = rect; const p = h('div', { class: 'sc-pin ' + cls, style: { left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px' } }, node); stage.appendChild(p); return p; },
    ready: () => new Promise((r) => { if (img.complete) r(); else { img.onload = () => r(); img.onerror = () => r(); } }),
    destroy() { window.removeEventListener('resize', onResize); },
  };
}

const TAGS = { service: 'Auto, repair, trades', clinical: 'Clinics and practices', consumer: 'Studios and clubs', field: 'Crews and service calls', multi: 'Restaurants and sites' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export function createScenes({ root, reduced, onPicked, onStep = () => {} }) {
  let teardown = [];
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const clear = () => { teardown.forEach((f) => f()); teardown = []; };
  const keys = (fn) => { const k = (e) => fn(e); window.addEventListener('keydown', k); teardown.push(() => window.removeEventListener('keydown', k)); };
  const btn = (label, onclick, cls = 'ab') => h('button', { class: cls, type: 'button', onclick: (e) => { sfx.select(); onclick(e); } }, label);
  function screen(cls, ...kids) {
    clear();
    root.className = 'wx sc-root';
    const el = h('main', { class: 'sc-screen ' + cls }, ...kids);
    root.replaceChildren(el);
    window.scrollTo(0, 0);
    return el;
  }

  // ------------------------------------------------------------ the step card
  // One per step: where you are, what you're doing, why it matters, one button.
  function card({ step, kicker, title, what, why, cta, onGo, body, tone }) {
    const go = btn(cta, () => onGo(), 'ab primary' + (tone === 'wake' ? ' wake' : ''));
    const el = h('section', { class: 'mc' + (tone ? ' ' + tone : ''), role: 'dialog', 'aria-label': title },
      step ? h('div', { class: 'mc-steps' }, STEPS.map((s, i) => h('span', { class: i + 1 < step ? 'done' : i + 1 === step ? 'on' : '' }, h('i', {}, String(i + 1)), h('b', {}, s)))) : null,
      kicker ? h('p', { class: 'mc-k' }, kicker) : null,
      h('h1', {}, title),
      what ? h('div', { class: 'mc-row' }, h('p', { class: 'mc-l' }, 'What you\'re doing'), h('p', {}, what)) : null,
      why ? h('div', { class: 'mc-row' }, h('p', { class: 'mc-l' }, 'Why it matters'), h('p', {}, why)) : null,
      body || null,
      h('div', { class: 'mc-go' }, go, h('span', { class: 'mc-key' }, 'Enter')));
    let k = null;
    k = (e) => { if (e.key === 'Enter' && el.isConnected && !go.disabled && !go.hidden) { e.preventDefault(); window.removeEventListener('keydown', k); go.click(); } };
    keys(k);
    setTimeout(() => { try { go.focus({ preventScroll: true }); } catch (e) { /* fine */ } }, 60);
    el._go = go;
    return el;
  }

  // ------------------------------------------------------------ 1. the arcade
  function home() {
    const v = createView(ART.arcade);
    teardown.push(v.destroy);
    const start = () => { if (gone) return; gone = true; sfx.unlock(); enter(); };
    let gone = false;
    const scr = h('button', { class: 'ar-scr', type: 'button', onclick: start, 'aria-label': 'Press start' },
      h('span', { class: 'ar-p1' }, '1 PLAYER'),
      h('span', { class: 'ar-logo' }, 'WAKE'),
      h('span', { class: 'ar-sub' }, 'MONDAY MORNING'),
      h('span', { class: 'ar-press' }, 'PRESS START'),
      h('span', { class: 'ar-time' }, '1 COMPANY · 1 MONDAY · 1 WEEK'));
    const el = screen('sc-home', v.el,
      h('div', { class: 'ar-foot' }, h('span', {}, 'Run a real company for one Monday. Then run it again with Wake.'), h('span', { class: 'ar-hint' }, 'Click the screen or press Enter')));
    v.pin(ART.arcade.screen, scr, 'ar-screen');
    v.frame(CABINET, { cover: false });
    v.ready().then(() => el.classList.add('in'));
    keys((e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } });
    async function enter() {
      sfx.start();
      el.classList.add('entering');
      await wait(450);
      setup();
    }
  }

  // ------------------------------------------------------------ 2. setup: three short questions
  // One question per screen, a plain list of answers, one click to move on.
  const pick = { shell: null, role: null, seed: 0 };
  const urlSeed = () => { try { const x = new URLSearchParams(window.location.search).get('seed'); return x && /^\d+$/.test(x) ? Number(x) : 0; } catch (e) { return 0; } };
  const TOTAL = 3;
  const head = (n, onBack) => h('header', { class: 'su-top' },
    h('b', { class: 'su-brand' }, 'Wake'),
    h('div', { class: 'su-prog' }, h('span', {}, 'Step ' + n + ' of ' + TOTAL), h('i', {}, Array.from({ length: TOTAL }, (_, i) => h('em', { class: i < n ? 'on' : '' })))),
    onBack ? h('button', { class: 'su-back', type: 'button', onclick: () => { sfx.back(); onBack(); } }, '← Back') : h('span'));

  function select({ n, title, sub, items, onPick, onBack }) {
    const rows = items.map((it) => h('button', { class: 'su-row', type: 'button', onclick: () => { sfx.select(); onPick(it.id); } },
      h('span', { class: 'su-rt' }, h('b', {}, it.name), h('span', {}, it.line)), it.meta ? h('em', {}, it.meta) : null, h('i', { 'aria-hidden': 'true' }, '→')));
    screen('su', head(n, onBack),
      h('div', { class: 'su-body' }, h('h1', {}, title), sub ? h('p', { class: 'su-sub' }, sub) : null, h('div', { class: 'su-list' }, rows)));
    rows[0].focus({ preventScroll: true });
    keys((e) => {
      const i = rows.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); rows[(i + 1) % rows.length].focus(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); rows[(i - 1 + rows.length) % rows.length].focus(); }
      else if (e.key === 'Escape' && onBack) onBack();
    });
  }

  function setup() {
    onStep('select');
    select({ n: 1, title: 'What kind of business do you run?', sub: 'Pick the closest fit. You\'ll get a made-up company of that kind, with its own people and numbers.',
      items: SHELL_ORDER.map((id) => ({ id, name: SHELLS[id].label, line: TAGS[id] })),
      onPick: (id) => { pick.shell = id; pick.seed = urlSeed() || randomSeed(); setupRole(); }, onBack: home });
  }
  function setupRole() {
    select({ n: 2, title: 'What\'s your role?', sub: 'Your role decides what lands on your desk Monday morning and who you answer to.',
      items: ROLE_ORDER.map((id) => ({ id, name: ROLES[id].label, line: ROLES[id].blurb })),
      onPick: (id) => { pick.role = id; ready(); }, onBack: setup });
  }
  function ready() {
    onStep('ready');
    const s = SHELLS[pick.shell], r = ROLES[pick.role];
    const pv = previewScenario(s, r, pick.seed);
    const go = () => { sfx.start(); onPicked(pick.shell, pick.role, pick.seed); };
    const fact = (k, v) => [h('dt', {}, k), h('dd', {}, v)];
    screen('su', head(3, setupRole),
      h('div', { class: 'su-body' },
        h('h1', {}, 'Here\'s your company'),
        h('p', { class: 'su-sub' }, 'It\'s Monday morning. Your ' + r.meetingName + ' is at 10:00 AM, and your team expects you to know what matters this week.'),
        h('section', { class: 'su-card' },
          h('div', { class: 'su-co' }, h('b', {}, pv.company), h('button', { class: 'su-link', type: 'button', onclick: () => { pick.seed = randomSeed(); sfx.blip(); ready(); } }, 'Try a different company')),
          h('dl', {}, fact('Business', s.label), fact('Your role', r.label), fact('Size', (pv.N > 1 ? pv.N + ' ' + s.vocab.units : '1 ' + s.vocab.unit) + ', ' + pv.headcount + ' people'), fact('10:00 AM', cap(r.meetingName)))),
        h('p', { class: 'su-q' }, 'How it works'),
        h('ol', { class: 'su-how' }, h('li', {}, 'You run the morning on your own, with the apps your team uses.'), h('li', {}, 'You run the same morning again, with Wake.'), h('li', {}, 'You see both weeks play out, side by side.')),
        h('div', { class: 'su-go' }, btn('Start the morning', go, 'ab primary big'), h('span', { class: 'mc-key' }, 'Enter'))));
    keys((e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } else if (e.key === 'Escape') setupRole(); });
  }

  // ------------------------------------------------------------ 3. the pixel office
  // Who is where, by moment of the day (map pixels; see pixel/office.js).
  function cast(w, preset) {
    const c = (k) => w.characters[k].av;
    if (preset === 'meeting') return [
      { av: c('controller'), x: 86, y: 42, seated: true }, { av: c('opsdir'), x: 100, y: 42, seated: true }, { av: c('trainer'), x: 114, y: 42, seated: true },
      { av: c('hr'), x: 100, y: 70, seated: true, facing: 'up' }, { av: c('analyst'), x: 114, y: 70, seated: true, facing: 'up' }, { av: c('marketing'), x: 128, y: 70, seated: true, facing: 'up' },
    ];
    if (preset === 'night') return [];
    return [
      { av: c('marketing'), x: 80, y: 141, seated: true }, { av: c('controller'), x: 168, y: 146, seated: true, facing: 'up' },
      { av: c('analyst'), x: 254, y: 146, seated: true, facing: 'up' }, { av: c('hr'), x: 314, y: 170, seated: true, facing: 'up' },
      { av: c('trainer'), x: 226, y: 170, seated: true, facing: 'up' }, { av: c('opsdir'), x: 200, y: 76, seated: false, facing: 'up' },
    ];
  }

  // A moment in the office: the map, a clock, an optional walk, then the step card.
  // { day, time, preset, night, at: 'office' | 'meeting' | null, z, route, end, view, card, before }
  async function office(sim, o) {
    const w = sim.world;
    const clock = h('b', {}, o.time);
    const skip = h('button', { class: 'px-skip', type: 'button', hidden: true }, 'Skip ▶');
    const holder = h('div', { class: 'px-map' });
    const layer = h('div', { class: 'sc-layer dim' });
    const el = screen('px-scene' + (o.night ? ' night' : ''),
      holder,
      h('header', { class: 'px-hud' }, h('span', { class: 'px-chip' }, o.day + ' · ', clock), h('span', { class: 'px-chip co' }, w.shell.company), skip),
      layer);
    const seat = o.at ? SEAT[o.at] : null;
    const map = createOffice(holder, { company: w.shell.company, playerShirt: ROLE_COLOR[w.role.id] || ROLE_COLOR.gm, npcs: cast(w, o.preset), reduced, night: o.night,
      start: seat ? { ...seat, z: o.z || 2, seated: o.at === 'office', dir: o.at === 'meeting' ? 'left' : 'down' } : null,
      onClock: (m) => { clock.textContent = '7:' + String(m).padStart(2, '0') + ' AM'; } });
    teardown.push(() => map.destroy());
    if (o.view) map.view(...o.view);
    await map.ready;
    requestAnimationFrame(() => el.classList.add('in'));
    const showCard = (c) => { layer.replaceChildren(card(c)); layer.classList.add('show'); };
    const hideCard = () => { layer.replaceChildren(); layer.classList.remove('show'); };
    if (o.before) { await new Promise((res) => showCard({ ...o.before, onGo: res })); hideCard(); }
    if (o.route || o.arrive) {
      skip.hidden = false;
      skip.onclick = () => { map.skip(); sfx.select(); };
      if (o.arrive) await map.arrive();
      else { await wait(400); map.follow(o.z || 2); await map.walk(o.route); }
      if (o.end === 'sit') map.sit('down'); else if (o.end) map.face(o.end);
      if (o.endView) map.view(...o.endView);
      skip.hidden = true;
      await wait(500);
    }
    showCard({ ...o.card, onGo: () => { clear(); o.done(); } });
    return { el, layer, map };
  }

  async function arrival(sim, done) {
    const w = sim.world, meeting = w.role.meetingName;
    await office(sim, { day: w.shell.mondayLong, time: '7:42 AM', preset: 'office', arrive: true,
      before: { step: 1, kicker: w.shell.mondayLong + ' · 7:42 AM', title: 'This is ' + w.shell.company + '. You run it.',
        what: 'Walking in on a Monday. Your ' + meeting + ' starts at 10:00 AM, and your team expects you to walk in knowing what matters this week.',
        why: 'The problems that cost you money this week are already in your reports, inbox and texts. The question is whether you find them by ten.',
        cta: 'Walk in' },
      card: { step: 2, kicker: 'Round 1 · on your own · 7:48 AM', title: 'Get ready for ten o\'clock.',
        what: 'Your computer has everything your team sent: QuickBooks, Drive, Gmail, Calendar and Messages. Find the numbers that matter, flag 3 to 5 of them, and decide who handles each.',
        why: 'This is how most owners prep today: clicking through every app, hoping nothing important is buried. Remember how it feels.',
        cta: 'Sit down' },
      done });
  }

  return { start: home, arrival, office, card, clear, wait };
}
