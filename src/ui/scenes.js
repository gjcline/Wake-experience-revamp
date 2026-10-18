// THE WORLD
// The arcade you walk up to, the setup inside its screen, and the real places the morning
// happens: the building, the office, your desk, the meeting room, Friday evening. Each place is
// one of the art pack's images with a camera that moves across it. Every step of the experience
// opens with one card that says what you're doing and why it matters.
// Everything shown about a business or role is read from configuration.

import { h } from './art.js';
import { SHELLS, SHELL_ORDER } from '../content/shells.js';
import { ROLES, ROLE_ORDER } from '../content/roles.js';
import { makeResolver, randomSeed } from '../engine/config.js';
import { previewScenario } from '../content/scenario.js';
import { sfx } from './arcade/sound.js';

// The art pack. Every image is 2560 x 1440; rectangles are [x, y, width, height] in image pixels.
export const IW = 2560, IH = 1440;
export const ART = {
  arcade: { src: 'art/arcade.webp', screen: [966, 258, 628, 418] },
  desk: { src: 'art/desk.webp', monitor: [651, 167, 1228, 611], phone: [1968, 662, 154, 318] },
  deskTidy: { src: 'art/desk-tidy.webp', monitor: [651, 167, 1254, 612], phone: [1968, 662, 154, 318] },
  exterior: { src: 'art/exterior.webp', sign: [1078, 566, 264, 122] },
  office: { src: 'art/office.webp' },
  meeting: { src: 'art/meeting-room.webp' },
  evening: { src: 'art/office-evening.webp' },
};
// Camera framings, also in image pixels.
export const SHOT = {
  all: [0, 0, IW, IH],
  cabinet: [700, 0, 1160, 1440],
  door: [380, 200, 1500, 844],
  entrance: [760, 640, 1000, 562],
  ownerOffice: [1880, 120, 680, 382],
  meetingRoom: [300, 30, 860, 484],
  desk: [590, 100, 1600, 920],
  monitor: [641, 157, 1248, 631],
};
export const STEPS = ['Arrive', 'On your own', 'With Wake', 'The meeting', 'The week', 'Your score'];

// A view onto one image: the image sits on a stage at its own pixel size, and the camera fits a
// framing to the view. `cover` fills the view; otherwise the whole framing stays visible.
export function createView(art, { cover = true, cls = '' } = {}) {
  const img = h('img', { class: 'sc-img', src: art.src, alt: '', draggable: 'false' });
  const stage = h('div', { class: 'sc-stage' }, img);
  const el = h('div', { class: 'sc-view ' + cls }, stage);
  let shot = SHOT.all, fill = cover;
  function apply(ms) {
    const vw = el.clientWidth || window.innerWidth, vh = el.clientHeight || window.innerHeight;
    const [x, y, w, hh] = shot;
    const s = fill ? Math.max(vw / w, vh / hh) : Math.min(vw / w, vh / hh);
    let tx = vw / 2 - (x + w / 2) * s, ty = vh / 2 - (y + hh / 2) * s;
    // never show past the edge of the image
    tx = IW * s <= vw ? (vw - IW * s) / 2 : Math.min(0, Math.max(vw - IW * s, tx));
    ty = IH * s <= vh ? (vh - IH * s) / 2 : Math.min(0, Math.max(vh - IH * s, ty));
    stage.style.transition = ms ? 'transform ' + ms + 'ms cubic-bezier(.45,.05,.25,1)' : 'none';
    stage.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
    return s;
  }
  const onResize = () => apply(0);
  window.addEventListener('resize', onResize);
  return {
    el, stage, img,
    go(next, ms = 0, opts = {}) { shot = next; if (opts.cover !== undefined) fill = opts.cover; return apply(ms); },
    // place an element on the image at an image-pixel rectangle
    pin(rect, node, cls = '') { const [x, y, w, hh] = rect; const p = h('div', { class: 'sc-pin ' + cls, style: { left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px' } }, node); stage.appendChild(p); return p; },
    ready: () => new Promise((r) => { if (img.complete) r(); else { img.onload = () => r(); img.onerror = () => r(); } }),
    destroy() { window.removeEventListener('resize', onResize); },
  };
}

export function createScenes({ root, reduced, onPicked }) {
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
  const view = (art, opts) => { const v = createView(art, opts); teardown.push(v.destroy); return v; };

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
    keys((e) => { if (e.key === 'Enter' && !go.disabled && !go.hidden) { e.preventDefault(); go.click(); } });
    setTimeout(() => { try { go.focus({ preventScroll: true }); } catch (e) { /* fine */ } }, 60);
    el._go = go;
    return el;
  }

  // A place in the world with a moving camera and, once it settles, a step card.
  // { art, from, to, ms, card: {...}, delay, dim, pins: [[rect, node]] }
  async function scene({ art, from = SHOT.all, to, ms = 4000, card: c, delay = 700, dim = true, pins = [], cls = '', cover = true }) {
    const v = view(art, { cover });
    const layer = h('div', { class: 'sc-layer' + (dim ? ' dim' : '') });
    const el = screen('sc-place ' + cls, v.el, layer);
    pins.forEach(([rect, node, pc]) => v.pin(rect, node, pc));
    v.go(from);
    await v.ready();
    requestAnimationFrame(() => { el.classList.add('in'); if (to) v.go(to, reduced ? 0 : ms); });
    if (c) { await wait(delay); layer.appendChild(card(c)); layer.classList.add('show'); }
    return { el, v, layer };
  }

  // ------------------------------------------------------------ 1. the arcade
  function home() {
    const v = view(ART.arcade);
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
    v.go(SHOT.cabinet, 0, { cover: false });
    v.ready().then(() => el.classList.add('in'));
    keys((e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } });
    async function enter() {
      el.classList.add('entering');
      v.go(ART.arcade.screen, reduced ? 0 : 1300, { cover: true });
      await wait(1250);
      setup();
    }
  }

  // ------------------------------------------------------------ 2. setup, inside the screen
  const pick = { shell: null, role: null, seed: 0 };
  const urlSeed = () => { try { const x = new URLSearchParams(window.location.search).get('seed'); return x && /^\d+$/.test(x) ? Number(x) : 0; } catch (e) { return 0; } };
  const TAGS = { service: 'Auto, repair, trades', clinical: 'Clinics and practices', consumer: 'Studios and clubs', field: 'Crews and service calls', multi: 'Restaurants and sites' };
  const line = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const BIZ = {
    service: line('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
    clinical: line('<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>'),
    consumer: line('<path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/>'),
    field: line('<path d="M2 7h11v9H2zM13 10h4l4 3v3h-8M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>'),
    multi: line('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
  };
  const ROLEI = {
    gm: line('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>'),
    coo: line('<path d="M3 12h4l3-8 4 16 3-8h4"/>'),
    owner: line('<path d="M3 21V10l9-6 9 6v11M9 21v-6h6v6"/>'),
    partner: line('<path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c.8-3 3.2-5 6-5s5.2 2 6 5M14 15c3 0 5.6 1.6 6.6 5"/>'),
    regional: line('<path d="M9 4l-6 3v13l6-3 6 3 6-3V4l-6 3zM9 4v13M15 7v13"/>'),
  };
  function selector({ step, title, sub, items, onPick, onBack }) {
    let at = 0;
    const cards = items.map((it, i) => h('button', { class: 'ar-opt', type: 'button', onmouseenter: () => focus(i), onfocus: () => focus(i, true), onclick: () => { sfx.select(); onPick(it.id); } },
      h('span', { class: 'ar-oi', html: it.icon }), h('b', {}, it.name), h('span', {}, it.tag)));
    const detail = h('p', { class: 'ar-detail' });
    function focus(i, quiet) {
      at = (i + items.length) % items.length;
      cards.forEach((c, j) => c.classList.toggle('on', j === at));
      if (document.activeElement && document.activeElement.classList.contains('ar-opt') && document.activeElement !== cards[at]) cards[at].focus({ preventScroll: true });
      detail.textContent = items[at].detail;
      if (!quiet) sfx.blip();
    }
    screen('ar-setup',
      h('header', { class: 'ar-head' }, h('span', { class: 'ar-px' }, 'SETUP ' + step), onBack ? btn('◀ Back', onBack, 'ab ghost small') : null),
      h('div', { class: 'ar-body' },
        h('h1', {}, title), h('p', { class: 'ar-lede' }, sub),
        h('div', { class: 'ar-grid' }, cards), detail,
        h('p', { class: 'ar-keys' }, h('span', {}, '◀ ▶'), ' move   ', h('span', {}, 'Enter'), ' select')));
    focus(0, true); cards[0].focus({ preventScroll: true });
    keys((e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); focus(at + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); focus(at - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); sfx.select(); onPick(items[at].id); }
      else if (e.key === 'Escape' && onBack) onBack();
    });
  }
  function setup() {
    selector({ step: '1 / 2', title: 'Pick the business you\'ll run', sub: 'Every game is a new company, with its own people and numbers.',
      items: SHELL_ORDER.map((id) => ({ id, name: SHELLS[id].label, tag: TAGS[id], icon: BIZ[id], detail: SHELLS[id].blurb })),
      onPick: (id) => { pick.shell = id; pick.seed = urlSeed() || randomSeed(); setupRole(); }, onBack: home });
  }
  function setupRole() {
    const t = makeResolver(SHELLS[pick.shell].vocab);
    selector({ step: '2 / 2', title: 'Pick your seat', sub: 'Your role decides what lands on your desk and who you answer to.',
      items: ROLE_ORDER.map((id) => ({ id, name: ROLES[id].label, tag: ROLES[id].blurb, icon: ROLEI[id], detail: t(ROLES[id].seat) })),
      onPick: (id) => { pick.role = id; ready(); }, onBack: setup });
  }
  function ready() {
    const s = SHELLS[pick.shell], r = ROLES[pick.role];
    const pv = previewScenario(s, r, pick.seed);
    const row = (k, val) => [h('dt', {}, k), h('dd', {}, val)];
    const go = () => { sfx.start(); onPicked(pick.shell, pick.role, pick.seed); };
    screen('ar-setup ar-ready',
      h('header', { class: 'ar-head' }, h('span', { class: 'ar-px' }, 'PLAYER 1 READY'), btn('◀ Back', setupRole, 'ab ghost small')),
      h('div', { class: 'ar-body' },
        h('p', { class: 'ar-px dim' }, 'YOUR COMPANY'),
        h('h1', {}, pv.company),
        h('dl', { class: 'ar-dl' }, row('Business', s.label), row('You are', r.label), row('Size', (pv.N > 1 ? pv.N + ' ' + s.vocab.units : '1 ' + s.vocab.unit) + ' · ' + pv.headcount + ' people'), row('Today', pv.monday + ', 7:48 AM'), row('At 10:00 AM', r.meetingName[0].toUpperCase() + r.meetingName.slice(1))),
        h('div', { class: 'ar-go' }, btn('Start the morning ▶', go, 'ab primary big'), btn('A different company', () => { pick.seed = randomSeed(); sfx.blip(); ready(); }, 'ab ghost'))));
    keys((e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } else if (e.key === 'Escape') setupRole(); });
  }

  // ------------------------------------------------------------ 3. arriving: the building, the office, the desk
  async function arrival(sim, done) {
    const w = sim.world, meeting = w.role.meetingName;
    const sign = h('span', { class: 'sc-sign', style: `--fs:${w.shell.company.length > 18 ? 16 : w.shell.company.length > 12 ? 19 : 22}px` }, w.shell.company);
    await scene({ art: ART.exterior, from: SHOT.all, to: SHOT.door, ms: 9000, pins: [[ART.exterior.sign, sign]],
      card: { step: 1, kicker: w.shell.mondayLong + ' · 7:42 AM', title: 'This is ' + w.shell.company + '. You run it.',
        what: 'Walking in on a Monday. Your ' + meeting + ' starts at 10:00 AM, and your team expects you to walk in knowing what matters this week.',
        why: 'The problems that cost you money this week are already in your reports, inbox and texts. The question is whether you find them by ten.',
        cta: 'Walk in', onGo: office } });
    async function office() {
      const { el } = await scene({ art: ART.office, from: SHOT.entrance, to: SHOT.ownerOffice, ms: 3400, dim: false });
      el.appendChild(h('p', { class: 'sc-cap' }, 'Your office is in the back corner.'));
      await wait(3300);
      await scene({ art: ART.desk, from: SHOT.all, to: SHOT.desk, ms: 1800, cover: false, delay: 1500,
        card: { step: 2, kicker: 'Round 1 · on your own · 7:48 AM', title: 'Get ready for ten o\'clock.',
          what: 'Your computer has everything your team sent: QuickBooks, Drive, Gmail, Calendar. Texts come to your phone. Find the numbers that matter, flag 3 to 5 of them, and decide who handles each.',
          why: 'This is how most owners prep today: clicking through every app, hoping nothing important is buried. Remember how it feels.',
          cta: 'Sit down', onGo: () => { clear(); done(); } } });
    }
  }

  // ------------------------------------------------------------ 4. a step card over a place
  function place(opts, done) {
    const c = { ...opts.card, onGo: () => { clear(); done(); } };
    return scene({ ...opts, card: c });
  }

  return { start: home, arrival, place, card, scene, view, clear, wait };
}
