// THE INTRO
// A clean front door: what this is, one page to choose the business and your role, then the
// laptop's lock screen at 7:48 AM with the morning already piling up. Also the short cards
// that carry the player between scenes (joining the meeting, the afternoon, Friday evening).
// Everything shown about a business or role is read from configuration.

import { h } from './art.js';
import { SHELLS, SHELL_ORDER } from '../content/shells.js';
import { ROLES, ROLE_ORDER } from '../content/roles.js';
import { makeResolver, randomSeed } from '../engine/config.js';
import { previewScenario } from '../content/scenario.js';
import { sfx } from './arcade/sound.js';
import { ICONS } from './os/icons.js';
import { face, glyph } from './os/shell.js';

// ?seed=123 replays a specific company (useful for demos and support)
const urlSeed = () => { try { const v = new URLSearchParams(window.location.search).get('seed'); return v && /^\d+$/.test(v) ? Number(v) : 0; } catch (e) { return 0; } };
const LENS = { finance: 'Finance', labor: 'Labor', operations: 'Operations', customer: 'Customers', maintenance: 'Maintenance', people: 'People', purchasing: 'Purchasing' };
const THU = { gm: 'Lender review', coo: 'Board call', owner: 'Bank covenant check', partner: 'Quarterly review', regional: 'Labor review' };
const TAGS = { service: 'Auto, repair, trades', clinical: 'Clinics and practices', consumer: 'Studios and clubs', field: 'Crews and service calls', multi: 'Restaurants and sites' };

// simple line icons for the five kinds of business
const line = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
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
const wakeMark = (size) => h('span', { class: 'cl-mark', style: { width: size + 'px', height: size + 'px' }, html: ICONS.wake });

export function createIntro({ root, reduced, onPicked }) {
  let teardown = [];
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const clear = () => { teardown.forEach((f) => f()); teardown = []; };
  const keys = (fn) => { const k = (e) => fn(e); window.addEventListener('keydown', k); teardown.push(() => window.removeEventListener('keydown', k)); };
  const btn = (label, onclick, cls = 'cb') => h('button', { class: cls, type: 'button', onclick: (e) => { sfx.select(); onclick(e); } }, label);
  function screen(cls, ...kids) {
    clear();
    root.className = 'wx cl-root';
    const el = h('main', { class: 'cl-screen ' + cls }, ...kids);
    root.replaceChildren(el);
    window.scrollTo(0, 0);
    return el;
  }
  const topbar = (right) => h('header', { class: 'cl-top' }, h('span', { class: 'cl-brand' }, wakeMark(26), h('b', {}, 'Wake'), h('span', {}, 'The Experience')), right || null);

  // 1. the front door
  function landing() {
    const go = () => { sfx.unlock(); setup(); };
    const step = (n, title, text, tone) => h('li', { class: 'cl-step ' + (tone || '') }, h('span', { class: 'cl-sn' }, String(n)), h('div', {}, h('b', {}, title), h('p', {}, text)));
    screen('cl-landing',
      topbar(h('span', { class: 'cl-top-r' }, 'About 15 minutes · a guide walks you through it')),
      h('section', { class: 'cl-hero' },
        h('p', { class: 'cl-eyebrow' }, 'No slides. No pitch.'),
        h('h1', {}, 'Run one Monday morning.', h('br'), h('span', {}, 'Then run it again with Wake.')),
        h('p', { class: 'cl-lede' }, 'You\'ll get a real company, your own inbox, books and calendar, and a leadership meeting at 10:00 AM. Prepare for it on your own. Then do the same morning again with Wake reading everything first. Nobody tells you what it\'s worth. You\'ll see it.'),
        h('div', { class: 'cl-cta' }, btn('Start', go, 'cb primary big'), h('span', { class: 'cl-muted' }, 'Press Enter'))),
      h('ol', { class: 'cl-steps' },
        step(1, 'On your own', 'Your desk, your data, your call. Brief your team by 10:00 AM.', 'y'),
        step(2, 'With Wake', 'The same Monday again. Wake has already read all of it.', 'w'),
        step(3, 'The meeting and the week', 'Run the meeting both ways, then watch both plans play out to Friday.'),
        step(4, 'Your report', 'The week side by side, in your company\'s own numbers. Yours to keep.')),
      h('footer', { class: 'cl-foot' }, '© 2026 Wake · ', h('a', { href: 'https://wakepe.com', target: '_blank', rel: 'noopener' }, 'wakepe.com')));
    keys((e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  }

  // 2. one page: the business, your role, and the company you'll get
  const pick = { shell: SHELL_ORDER[0], role: null, seed: urlSeed() || randomSeed() };
  function setup() {
    const t = () => makeResolver(SHELLS[pick.shell].vocab);
    const bizRow = h('div', { class: 'cl-grid five', role: 'radiogroup', 'aria-label': 'Business' });
    const roleRow = h('div', { class: 'cl-grid five', role: 'radiogroup', 'aria-label': 'Your role' });
    const preview = h('aside', { class: 'cl-preview' });
    const start = btn('Start the morning', () => begin(), 'cb primary big');
    const draw = () => {
      bizRow.replaceChildren(...SHELL_ORDER.map((id) => { const s = SHELLS[id], on = pick.shell === id;
        return h('button', { class: 'cl-opt' + (on ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(on), onclick: () => { pick.shell = id; pick.seed = urlSeed() || randomSeed(); sfx.blip(); draw(); } },
          h('span', { class: 'cl-oi', html: BIZ[id] }), h('b', {}, s.label), h('span', {}, TAGS[id])); }));
      roleRow.replaceChildren(...ROLE_ORDER.map((id) => { const r = ROLES[id], on = pick.role === id;
        return h('button', { class: 'cl-opt' + (on ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(on), onclick: () => { pick.role = id; sfx.blip(); draw(); } },
          h('span', { class: 'cl-oi', html: ROLEI[id] }), h('b', {}, r.label), h('span', {}, r.blurb)); }));
      const s = SHELLS[pick.shell];
      if (!pick.role) {
        preview.replaceChildren(h('p', { class: 'cl-pk' }, 'Your company'), h('p', { class: 'cl-ph' }, s.label), h('p', { class: 'cl-muted' }, s.blurb), h('p', { class: 'cl-hint' }, 'Now choose your role.'));
        start.disabled = true; return;
      }
      const r = ROLES[pick.role], pv = previewScenario(s, r, pick.seed);
      const row = (k, v) => [h('dt', {}, k), h('dd', {}, v)];
      preview.replaceChildren(
        h('p', { class: 'cl-pk' }, 'Your company'),
        h('p', { class: 'cl-ph' }, pv.company),
        h('p', { class: 'cl-muted' }, t()(r.seat)),
        h('dl', {}, row('Business', s.label), row('Your role', r.label), row('Size', (pv.N > 1 ? pv.N + ' ' + s.vocab.units : '1 ' + s.vocab.unit) + ' · ' + pv.headcount + ' people'),
          row('First look', LENS[r.lens[0]] + ' and ' + LENS[r.lens[1]]), row('Start', pv.monday + ', 7:48 AM'), row('10:00 AM', r.meetingName[0].toUpperCase() + r.meetingName.slice(1)), row('Thursday', THU[pick.role])),
        h('button', { class: 'cl-link', type: 'button', onclick: () => { pick.seed = randomSeed(); sfx.blip(); draw(); } }, glyph('refresh'), 'A different company'));
      start.disabled = false;
    };
    screen('cl-setup',
      topbar(btn(h('span', {}, glyph('back'), 'Back'), landing, 'cb ghost small')),
      h('div', { class: 'cl-setup-grid' },
        h('div', { class: 'cl-choices' },
          h('h1', {}, 'Set up your morning'),
          h('p', { class: 'cl-q' }, h('span', {}, '1'), 'Choose the business'), bizRow,
          h('p', { class: 'cl-q' }, h('span', {}, '2'), 'Choose your role'), roleRow),
        h('div', { class: 'cl-side' }, preview, start)));
    draw();
    keys((e) => { if (e.key === 'Enter' && !start.disabled) { e.preventDefault(); begin(); } else if (e.key === 'Escape') landing(); });
  }
  function begin() { sfx.start(); onPicked(pick.shell, pick.role, pick.seed); }

  // 3. the lock screen: Monday, 7:48 AM, the morning already piling up
  async function arrival(sim, done) {
    const w = sim.world;
    const person = (k) => sim.person(k);
    const time = h('b', { class: 'ls-time' }, '7:42');
    const stack = h('div', { class: 'ls-notes' });
    const unlock = btn(h('span', {}, 'Open your desk ', glyph('chevR')), () => go(), 'cb primary big ls-go');
    unlock.hidden = true;
    const brief = h('div', { class: 'ls-brief', hidden: true },
      h('p', { class: 'ls-bk' }, 'Your ' + w.role.meetingName + ' starts at 10:00 AM'),
      h('p', {}, 'Round 1: prepare on your own. Everything your team sent this morning is on your computer.'),
      h('p', {}, 'Find what matters, decide what should happen, and have your briefing ready by ten.'));
    screen('cl-lock', h('div', { class: 'ls-wall' }),
      h('div', { class: 'ls-top' }, h('span', {}, w.shell.mondayLong), time, h('span', { class: 'ls-co' }, w.shell.company)),
      stack, brief, unlock);
    let gone = false;
    function go() { if (gone) return; gone = true; clear(); done(); }
    keys((e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    const mails = (w.order.email || []).slice(0, 3).map((id) => w.sources[id]);
    const texts = (w.order.message || []).slice(0, 2).map((id) => w.sources[id]);
    const cal = { title: 'Leadership meeting', text: '10:00 – 11:00 AM · ' + (w.role.meetingName[0].toUpperCase() + w.role.meetingName.slice(1)) };
    const notes = [
      { app: 'calendar', name: 'Calendar', title: cal.title, text: cal.text, when: 'in 2h' },
      ...texts.map((s) => ({ app: 'messages', name: 'Messages', title: person(s.from).name, text: s.body[0], when: s.when })),
      ...mails.map((s) => ({ app: 'gmail', name: 'Gmail', title: person(s.from).name + ' · ' + s.title, text: (s.body || [''])[0], when: s.when })),
    ];
    for (const [i, n] of notes.entries()) {
      await wait(i ? 260 : 500);
      if (gone) return;
      stack.appendChild(h('div', { class: 'ls-note' }, h('span', { class: 'ls-ni', html: ICONS[n.app] }),
        h('div', {}, h('p', { class: 'ls-nt' }, h('b', {}, n.name.toUpperCase()), h('span', {}, n.when)), h('strong', {}, n.title), h('p', { class: 'ls-nx' }, n.text))));
      sfx.blip();
      time.textContent = '7:' + String(42 + Math.min(6, i + 1)).padStart(2, '0');
    }
    time.textContent = '7:48';
    await wait(300);
    if (gone) return;
    brief.hidden = false; unlock.hidden = false; unlock.focus({ preventScroll: true });
  }

  // 4. between scenes: a short card with the time, what's happening, and one button.
  // `meet` renders a Google Meet style "ready to join" screen instead.
  function interlude({ day, time, title, lines, cta, meet, people, night, company }, done) {
    const go = () => { clear(); done(); };
    if (meet) {
      const tiles = (people || []).slice(0, 6).map((p) => h('span', { class: 'mj-p', title: p.name }, face(p.name, 28)));
      screen('cl-join',
        h('header', { class: 'mj-top' }, h('span', { class: 'mj-logo', html: ICONS.calendar }), h('b', {}, 'Meet'), h('span', { class: 'mj-co' }, company)),
        h('div', { class: 'mj-grid' },
          h('div', { class: 'mj-cam' }, h('div', { class: 'mj-self' }, face('You', 96, '#5F6368')), h('span', { class: 'mj-name' }, 'You'), h('div', { class: 'mj-ctl' }, h('i', {}, glyph('video')), h('i', {}, '🎙'))),
          h('div', { class: 'mj-side' },
            h('h1', {}, 'Ready to join?'),
            h('p', { class: 'mj-who' }, h('span', { class: 'mj-ps' }, tiles), (people || []).length + ' people are in the call'),
            h('p', { class: 'mj-title' }, title),
            lines.map((l) => h('p', { class: 'mj-l' }, l)),
            btn(cta, go, 'cb meet big'))));
    } else {
      screen('cl-inter' + (night ? ' night' : ''),
        h('div', { class: 'ci-card' },
          h('p', { class: 'ci-k' }, day + ' · ' + time),
          h('h1', {}, title),
          lines.map((l) => h('p', { class: 'ci-l' }, l)),
          btn(cta, go, 'cb primary big')));
    }
    keys((e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    const b = root.querySelector('.cb.big'); if (b) setTimeout(() => b.focus({ preventScroll: true }), 50);
  }

  return { start: landing, arrival, interlude, stop: clear };
}
