// THE WORLD
// The arcade you walk up to, the stage and character select on its screen, and the pixel office
// the morning happens in: the street, the lobby, the walk to your desk, the meeting room, Friday
// evening. Every step of the experience opens with one card that says what you're doing and why
// it matters. Everything shown about a business or role is read from configuration.

import { h } from './art.js';
import { SHELLS, SHELL_ORDER } from '../content/shells.js';
import { ROLES, ROLE_ORDER } from '../content/roles.js';
import { makeResolver, randomSeed } from '../engine/config.js';
import { previewScenario } from '../content/scenario.js';
import { sfx } from './arcade/sound.js';
import { createOffice, SEAT } from './pixel/office.js';
import { storefront, bust, ROLE_COLOR } from './pixel/sprites.js';

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

const LENS = [['operations', 'Operations'], ['labor', 'Labor'], ['finance', 'Money'], ['customer', 'Customers'], ['people', 'People']];
const THU = { gm: 'Lender review', coo: 'Board call', owner: 'Bank covenant check', partner: 'Quarterly review', regional: 'Labor review' };
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
      h('span', { class: 'ar-time' }, '15 MIN · 1 COMPANY · 1 WEEK'));
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

  // ------------------------------------------------------------ 2. stage select and character select
  const pick = { shell: null, role: null, seed: 0 };
  const urlSeed = () => { try { const x = new URLSearchParams(window.location.search).get('seed'); return x && /^\d+$/.test(x) ? Number(x) : 0; } catch (e) { return 0; } };
  // a role's portrait: the art pack's image when it exists, the pixel character until then
  function portrait(roleId, cls) {
    const box = h('div', { class: 'cs-pic ' + (cls || '') }, bust(roleId));
    const img = h('img', { src: 'art/roles/' + roleId + '.webp', alt: '', draggable: 'false', onload: () => box.replaceChildren(img), onerror: () => {} });
    return box;
  }

  // One select screen: a big hero on the left, what it means on the right, the roster below.
  function select({ step, title, items, onPick, onBack }) {
    let at = 0;
    const hero = h('div', { class: 'cs-hero' });
    const info = h('div', { class: 'cs-info' });
    const tiles = items.map((it, i) => h('button', { class: 'cs-tile', type: 'button', onmouseenter: () => focus(i), onfocus: () => focus(i, true), onclick: () => { if (at !== i) focus(i); else choose(); } },
      h('span', { class: 'cs-thumb' }, it.thumb()), h('b', {}, it.short || it.name)));
    const choose = () => { sfx.select(); onPick(items[at].id); };
    function focus(i, quiet) {
      at = (i + items.length) % items.length;
      tiles.forEach((t, j) => t.classList.toggle('on', j === at));
      if (document.activeElement && document.activeElement.classList.contains('cs-tile') && document.activeElement !== tiles[at]) tiles[at].focus({ preventScroll: true });
      const it = items[at];
      hero.replaceChildren(it.hero(), h('span', { class: 'cs-floor' }));
      hero.style.setProperty('--tone', it.tone || '#22D3EE');
      info.replaceChildren(...[
        h('p', { class: 'cs-kick' }, it.kicker),
        h('h2', { class: 'cs-name' }, it.name),
        h('p', { class: 'cs-line' }, it.line),
        it.stats ? h('div', { class: 'cs-stats' }, h('p', { class: 'cs-kick' }, it.statsTitle), it.stats.map(([label, n]) => h('div', { class: 'cs-bar' }, h('span', {}, label), h('i', {}, Array.from({ length: 7 }, (_, k) => h('em', { class: k < n ? 'on' : '' })))))) : null,
        h('dl', { class: 'cs-facts' }, it.facts.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
        h('div', { class: 'cs-go' }, btn(it.cta, choose, 'ab primary big'))].filter(Boolean));
      if (!quiet) sfx.blip();
    }
    screen('cs',
      h('header', { class: 'cs-top' }, h('span', { class: 'cs-p1' }, 'P1'), h('h1', {}, title), h('span', { class: 'cs-step' }, step), onBack ? btn('◀ Back', onBack, 'ab ghost small') : h('span')),
      h('div', { class: 'cs-stage' }, hero, info),
      h('div', { class: 'cs-roster' }, tiles),
      h('p', { class: 'cs-keys' }, h('span', {}, '◀ ▶'), ' move  ', h('span', {}, 'Enter'), ' select'));
    focus(0, true); tiles[0].focus({ preventScroll: true });
    keys((e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); focus(at + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); focus(at - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(); }
      else if (e.key === 'Escape' && onBack) onBack();
    });
  }

  function setup() {
    onStep('select');
    select({ step: '1 / 2', title: 'Select your stage',
      items: SHELL_ORDER.map((id) => {
        const s = SHELLS[id];
        return { id, name: s.label, short: s.label.replace(' Business', ''), kicker: 'The business', line: s.blurb, tone: '#FFD23F', cta: 'Run this business ▶',
          thumb: () => storefront(id), hero: () => h('div', { class: 'cs-pic stage' }, storefront(id)),
          facts: [['Known for', TAGS[id]], ['On the floor', cap(s.vocab.frontlines)], ['You serve', cap(s.vocab.customers)], ['The company', 'New every game']] };
      }),
      onPick: (id) => { pick.shell = id; pick.seed = urlSeed() || randomSeed(); setupRole(); }, onBack: home });
  }
  function setupRole() {
    const t = makeResolver(SHELLS[pick.shell].vocab);
    select({ step: '2 / 2', title: 'Select your seat',
      items: ROLE_ORDER.map((id) => {
        const r = ROLES[id];
        return { id, name: r.label, short: r.label.replace(' / Operations', ''), kicker: 'Your role', line: t(r.seat), tone: ROLE_COLOR[id], cta: 'Take this seat ▶',
          thumb: () => portrait(id, 'mini'), hero: () => portrait(id),
          statsTitle: 'What lands on your desk first',
          stats: LENS.map(([k, label]) => [label, 7 - r.lens.indexOf(k)]),
          facts: [['10:00 AM', cap(r.meetingName)], ['Thursday', THU[id]]] };
      }),
      onPick: (id) => { pick.role = id; ready(); }, onBack: setup });
  }
  function ready() {
    onStep('ready');
    const s = SHELLS[pick.shell], r = ROLES[pick.role];
    const pv = previewScenario(s, r, pick.seed);
    const go = (mode) => { sfx.start(); onPicked(pick.shell, pick.role, pick.seed, mode); };
    const mode = (id, name, time, line, cls) => h('button', { class: 'cs-mode ' + cls, type: 'button', onclick: () => go(id) }, h('span', { class: 'cs-mt' }, h('b', {}, name), h('em', {}, time)), h('span', { class: 'cs-ml' }, line));
    const hero = h('div', { class: 'cs-hero' }, portrait(pick.role), h('span', { class: 'cs-floor' }));
    hero.style.setProperty('--tone', ROLE_COLOR[pick.role]);
    screen('cs cs-ready',
      h('header', { class: 'cs-top' }, h('span', { class: 'cs-p1' }, 'P1'), h('h1', {}, 'Player 1 ready'), h('span', { class: 'cs-step' }, ''), btn('◀ Back', setupRole, 'ab ghost small')),
      h('div', { class: 'cs-stage' }, hero,
        h('div', { class: 'cs-info' },
          h('p', { class: 'cs-kick' }, 'Your company'),
          h('h2', { class: 'cs-name' }, pv.company),
          h('p', { class: 'cs-line' }, 'You are the ' + r.label + '. New company, new people, new numbers: nobody has played this one before.'),
          h('dl', { class: 'cs-facts' }, [['Business', s.label], ['Size', (pv.N > 1 ? pv.N + ' ' + s.vocab.units : '1 ' + s.vocab.unit) + ' · ' + pv.headcount + ' people'], ['Today', pv.monday + ', 7:48 AM'], ['10:00 AM', cap(r.meetingName)], ['Thursday', THU[pick.role]]].flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
          h('p', { class: 'cs-kick' }, 'Select mode'),
          h('div', { class: 'cs-modes' },
            mode('quick', 'Quick run ▶', '5 min', 'We play the usual morning for you. You run it with Wake and see the score.', 'quick'),
            mode('full', 'Full picture', '15 min', 'Run the morning yourself first, then again with Wake. The whole comparison.', 'full')),
          h('div', { class: 'cs-go' }, btn('A different company', () => { pick.seed = randomSeed(); sfx.blip(); ready(); }, 'ab ghost small')))));
    keys((e) => { if (e.key === 'Enter') { e.preventDefault(); go('quick'); } else if (e.key === 'Escape') setupRole(); });
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

  // `atDesk` replaces the card you get when you sit down (quick mode shows the usual morning).
  async function arrival(sim, done, atDesk) {
    const w = sim.world, meeting = w.role.meetingName;
    await office(sim, { day: w.shell.mondayLong, time: '7:42 AM', preset: 'office', arrive: true,
      before: { step: 1, kicker: w.shell.mondayLong + ' · 7:42 AM', title: 'This is ' + w.shell.company + '. You run it.',
        what: 'Walking in on a Monday. Your ' + meeting + ' starts at 10:00 AM, and your team expects you to walk in knowing what matters this week.',
        why: 'The problems that cost you money this week are already in your reports, inbox and texts. The question is whether you find them by ten.',
        cta: 'Walk in' },
      card: { step: 2, kicker: 'Round 1 · on your own · 7:48 AM', title: 'Get ready for ten o\'clock.',
        what: 'Your computer has everything your team sent: QuickBooks, Drive, Gmail, Calendar and Messages. Find the numbers that matter, flag 3 to 5 of them, and decide who handles each.',
        why: 'This is how most owners prep today: clicking through every app, hoping nothing important is buried. Remember how it feels.',
        cta: 'Sit down', ...(atDesk || {}) },
      done });
  }

  return { start: home, arrival, office, card, clear, wait };
}
