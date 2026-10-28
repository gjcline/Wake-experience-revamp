// THE WORLD
// The title screen, four setup questions (business, role, which 10:00 AM, your company), and the pixel office
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
import { icon } from './os/shell.js';
import { WAKE_MARK, GLYPH } from './os/icons.js';
import { playIntro } from './intro.js';

export const STEPS = ['Arrive', 'On your own', 'With Wake', 'The meeting', 'The week', 'Your score'];

const TAGS = { service: 'Auto, repair, trades', clinical: 'Clinics and practices', consumer: 'Studios and clubs', field: 'Crews and service calls', multi: 'Restaurants and sites' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export function createScenes({ root, reduced, onPicked, onStep = () => {}, onSignup = null }) {
  let teardown = [];
  // the step names along the top of every card; step 4 is whichever 10:00 AM was picked
  let steps = STEPS.slice();
  const setMoment = (m) => { steps = STEPS.slice(); if (m === 'lender') steps[3] = 'The call'; };
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
  function card({ step, kicker, title, what, note, why, wake, cta, onGo, body, tone }) {
    const go = btn(cta, () => onGo(), 'ab primary' + (tone === 'wake' ? ' wake' : ''));
    const el = h('section', { class: 'mc' + (tone ? ' ' + tone : ''), role: 'dialog', 'aria-label': title },
      step ? h('div', { class: 'mc-steps' }, steps.map((s, i) => h('span', { class: i + 1 < step ? 'done' : i + 1 === step ? 'on' : '' }, h('i', {}, String(i + 1)), h('b', {}, s)))) : null,
      kicker ? h('p', { class: 'mc-k' }, kicker) : null,
      h('h1', {}, title),
      what ? h('div', { class: 'mc-row' }, h('p', { class: 'mc-l' }, 'What you\'re doing'), h('p', {}, what)) : null,
      note ? h('p', { class: 'mc-note' }, note) : null,
      why ? h('div', { class: 'mc-row' }, h('p', { class: 'mc-l' }, 'Why it matters'), h('p', {}, why)) : null,
      // every step says how Wake does it: it doesn't wait to be asked
      wake ? h('div', { class: 'mc-wake' }, icon('wake', 'ico mc-wk'), h('div', {}, h('p', { class: 'mc-l' }, 'How Wake does it'), h('p', {}, wake))) : null,
      body || null,
      h('div', { class: 'mc-go' }, go, h('span', { class: 'mc-key' }, 'Enter')));
    let k = null;
    k = (e) => { if (e.key === 'Enter' && el.isConnected && !go.disabled && !go.hidden) { e.preventDefault(); window.removeEventListener('keydown', k); go.click(); } };
    keys(k);
    setTimeout(() => { try { go.focus({ preventScroll: true }); } catch (e) { /* fine */ } }, 60);
    el._go = go;
    return el;
  }

  // ------------------------------------------------------------ 1. the title screen
  // The office the game happens in, still and quiet behind a plain title and one button.
  const EXTRAS = [['#2A1C14', '#E0B08A', '#4F81BD'], ['#111', '#8D5A3B', '#9BBB59'], ['#C9A46A', '#F0C7A0', '#C0504D'], ['#5A3A28', '#C68A64', '#8064A2'], ['#222', '#F0C7A0', '#F2C14E']]
    .map(([hair, skin, shirt]) => ({ hair, skin, shirt }));
  function home() {
    const start = () => { if (gone) return; gone = true; sfx.unlock(); sfx.start(); signup(); };
    let gone = false;
    const holder = h('div', { class: 'px-map' });
    const el = screen('ti', holder,
      h('div', { class: 'ti-body' },
        h('b', { class: 'ti-brand' }, 'Wake'),
        h('h1', {}, 'Run a company for one Monday morning.'),
        h('p', {}, 'Then run the same morning again with Wake, and see how the week turns out.'),
        h('div', { class: 'su-go' }, btn('Play', start, 'ab primary big'), h('span', { class: 'mc-key' }, 'Enter')),
        h('button', { class: 'ti-intro', type: 'button', onclick: () => intro() }, 'Watch the 15-second intro')));
    const npcs = [[80, 141, true, 'down'], [168, 146, true, 'up'], [254, 146, true, 'up'], [226, 170, true, 'up'], [200, 76, false, 'up']]
      .map(([x, y, seated, facing], i) => ({ av: EXTRAS[i], x, y, seated, facing }));
    const map = createOffice(holder, { company: 'Your company', playerShirt: ROLE_COLOR.gm, npcs, reduced });
    teardown.push(() => map.destroy());
    map.ready.then(() => el.classList.add('in'));
    setTimeout(() => { const b = el.querySelector('.ab.primary'); if (b) b.focus({ preventScroll: true }); }, 60);
    keys((e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } });
  }

  // ------------------------------------------------------------ 0. start, then the intro video
  // A plain start screen: the Wake mark, "Welcome to the Wake Experience", Start. Its Start click is what lets the browser play the
  // intro full screen with sound; when the video ends (or is skipped) the title screen follows.
  // `?intro=0` goes straight to the title, and so does the single-file artifact build, which has
  // no video next to it.
  const introParam = (() => { try { return new URLSearchParams(window.location.search).get('intro'); } catch (e) { return null; } })();
  const full = (on) => {
    try {
      const d = document;
      if (on && !d.fullscreenElement && d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().catch(() => {});
      if (!on && d.fullscreenElement && d.exitFullscreen) d.exitFullscreen().catch(() => {});
    } catch (e) { /* fullscreen is a nicety */ }
  };
  // called straight from a click, so the video may play with sound
  function intro() {
    clear();
    full(true);
    const stop = playIntro({ mount: (el) => { root.className = 'wx sc-root'; root.replaceChildren(el); window.scrollTo(0, 0); }, onDone: () => { full(false); home(); } });
    teardown.push(stop);
  }
  function first() {
    if (introParam === '0' || window.WAKE_HOST === 'artifact') return home();
    let gone = false;
    const go = () => { if (gone) return; gone = true; sfx.unlock(); intro(); };
    screen('st', h('div', { class: 'st-body' },
      h('span', { class: 'st-mark', role: 'img', 'aria-label': 'Wake', html: WAKE_MARK }),
      h('h1', { class: 'st-h' }, h('span', {}, 'Welcome to the'), h('b', {}, 'Wake Experience')),
      h('button', { class: 'st-go', type: 'button', onclick: go }, 'Start')));
    setTimeout(() => { const b = document.querySelector('.st-go'); if (b) b.focus({ preventScroll: true }); }, 60);
    keys((e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  }

  // ------------------------------------------------------------ 1b. who's playing
  // Play asks for a name, an email and a phone number before the game starts, so the
  // Wake team knows who played. Remembered on this browser, so Play again goes straight through.
  // Not asked in the single-file artifact build, which has no tracking.
  const KNOWN = 'wx-contact';
  const known = () => { try { return JSON.parse(localStorage.getItem(KNOWN) || 'null'); } catch (e) { return null; } };
  function signup() {
    if (!onSignup || window.WAKE_HOST === 'artifact') return setup();
    const me = known();
    if (me && me.name && me.email && me.phone) { onSignup(me); return setup(); }
    const field = (label, attrs, hint) => { const input = h('input', { class: 'sg-in', ...attrs }); return [h('label', { class: 'sg-f' }, h('span', {}, label, hint ? h('em', {}, hint) : null), input), input]; };
    const [fName, name] = field('Your name', { type: 'text', autocomplete: 'name', required: true, maxlength: 80 });
    const [fEmail, email] = field('Work email', { type: 'email', autocomplete: 'email', required: true, maxlength: 120 });
    const [fPhone, phone] = field('Phone', { type: 'tel', autocomplete: 'tel', required: true, maxlength: 40 });
    const note = h('p', { class: 'sg-note', 'aria-live': 'polite' });
    const submit = (e) => {
      e.preventDefault();
      const c = { name: name.value.trim(), email: email.value.trim(), phone: phone.value.trim() };
      if (!c.name) { note.textContent = 'Please add your name.'; name.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) { note.textContent = 'That email doesn\'t look right.'; email.focus(); return; }
      if (c.phone.replace(/\D/g, '').length < 7) { note.textContent = 'Please add a phone number we can reach you on.'; phone.focus(); return; }
      try { localStorage.setItem(KNOWN, JSON.stringify(c)); } catch (err) { /* fine */ }
      sfx.select(); onSignup(c); setup();
    };
    screen('su sg', h('header', { class: 'su-top' }, h('b', { class: 'su-brand' }, 'Wake'), h('span'), h('button', { class: 'su-back', type: 'button', onclick: () => { sfx.back(); home(); } }, '\u2190 Back')),
      h('div', { class: 'su-body' },
        h('h1', {}, 'Before you start'),
        h('p', { class: 'su-sub' }, 'Tell us who\'s playing. We\'ll follow up after you play.'),
        h('form', { class: 'sg-form', onsubmit: submit, novalidate: true }, fName, fEmail, fPhone, note,
          h('div', { class: 'su-go' }, h('button', { class: 'ab primary big', type: 'submit' }, 'Start the game'), h('span', { class: 'mc-key' }, 'Enter')))));
    setTimeout(() => name.focus({ preventScroll: true }), 60);
  }

  // ------------------------------------------------------------ 2. setup: four short questions
  // One question per screen, a plain list of answers, one click to move on.
  const pick = { shell: null, role: null, seed: 0, moment: 'meeting' };
  const urlSeed = () => { try { const x = new URLSearchParams(window.location.search).get('seed'); return x && /^\d+$/.test(x) ? Number(x) : 0; } catch (e) { return 0; } };
  const TOTAL = 4;
  const head = (n, onBack) => h('header', { class: 'su-top' },
    h('b', { class: 'su-brand' }, 'Wake'),
    h('div', { class: 'su-prog' }, h('span', {}, 'Step ' + n + ' of ' + TOTAL), h('i', {}, Array.from({ length: TOTAL }, (_, i) => h('em', { class: i < n ? 'on' : '' })))),
    onBack ? h('button', { class: 'su-back', type: 'button', onclick: () => { sfx.back(); onBack(); } }, '← Back') : h('span'));

  // `soon` items are shown but can't be picked yet: they say what else Wake does
  function select({ n, title, sub, items, onPick, onBack, note }) {
    const all = items.map((it) => it.soon
      ? h('div', { class: 'su-row soon', 'aria-disabled': 'true' }, it.icon ? h('span', { class: 'su-ic', html: it.icon }) : null, h('span', { class: 'su-rt' }, h('b', {}, it.name), h('span', {}, it.line)), h('em', { class: 'su-soon' }, 'Coming soon'))
      : h('button', { class: 'su-row', type: 'button', onclick: () => { sfx.select(); onPick(it.id); } },
        it.icon ? h('span', { class: 'su-ic', html: it.icon }) : null, h('span', { class: 'su-rt' }, h('b', {}, it.name), h('span', {}, it.line)), it.meta ? h('em', {}, it.meta) : null, h('i', { 'aria-hidden': 'true' }, '→')));
    const rows = all.filter((r) => r.tagName === 'BUTTON');
    screen('su', head(n, onBack),
      h('div', { class: 'su-body' }, h('h1', {}, title), sub ? h('p', { class: 'su-sub' }, sub) : null, h('div', { class: 'su-list' }, all), note ? h('p', { class: 'su-note' }, note) : null));
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
    select({ n: 1, title: 'What kind of business do you want to simulate?', sub: 'Pick one. The game builds a company of that kind, with its own people, numbers and problems.',
      items: SHELL_ORDER.map((id) => ({ id, name: SHELLS[id].label, line: TAGS[id] })),
      onPick: (id) => { pick.shell = id; pick.seed = urlSeed() || randomSeed(); setupRole(); }, onBack: home });
  }
  function setupRole() {
    select({ n: 2, title: 'Who do you want to play?', sub: 'Your role decides what lands on your desk Monday morning and who you answer to.',
      items: ROLE_ORDER.map((id) => ({ id, name: ROLES[id].label, line: ROLES[id].blurb })),
      onPick: (id) => { pick.role = id; setupMoment(); }, onBack: setup });
  }
  // The 10:00 AM you play: the role's own meeting, or a call with the bank about your covenants.
  // The morning is the same either way; what changes is who asks the questions.
  function setupMoment() {
    const r = ROLES[pick.role], G = (k) => GLYPH[k] || '';
    select({ n: 3, title: 'Where do you want to see Wake work?', sub: 'Wake isn\'t just for meetings. It reads your business every morning, so the answers are ready wherever the questions come from. Pick one moment to play: same company, same morning, same data.',
      items: [
        { id: 'meeting', icon: G('people'), name: 'Your weekly ' + r.meetingName, line: 'Your leadership team, in the conference room. Decide what happens this week: what matters, who owns it, by when.', meta: 'In person' },
        { id: 'lender', icon: G('call'), name: 'A call with your lender', line: 'Your relationship manager at the bank calls ahead of the covenant check. Every answer you don\'t have goes in the bank\'s file.', meta: 'Phone call' },
        { soon: true, icon: G('chart'), name: 'Your monthly update to the owner or board', line: 'Present the month and answer for every number.' },
        { soon: true, icon: G('receipt'), name: 'A dispute call with a vendor', line: 'Recover what they overbilled, with every invoice in hand.' },
        { soon: true, icon: G('file'), name: 'A due diligence call with a buyer', line: 'Someone wants to invest. They ask for the story behind every number.' },
      ],
      note: 'Every moment uses the same morning and the same Wake. Only the people asking the questions change.',
      onPick: (id) => { pick.moment = id; ready(); }, onBack: setupRole });
  }
  function ready() {
    onStep('ready');
    const s = SHELLS[pick.shell], r = ROLES[pick.role];
    const pv = previewScenario(s, r, pick.seed);
    const go = () => { sfx.start(); onPicked(pick.shell, pick.role, pick.seed, pick.moment); };
    const tenAm = pick.moment === 'lender' ? 'call with your lender' : r.meetingName;
    const fact = (k, v) => [h('dt', {}, k), h('dd', {}, v)];
    screen('su', head(4, setupMoment),
      h('div', { class: 'su-body' },
        h('h1', {}, 'Your company for this game'),
        h('p', { class: 'su-sub' }, 'The game starts Monday morning. Your ' + tenAm + ' is at 10:00 AM, and your team expects you to know what matters this week.'),
        h('section', { class: 'su-card' },
          h('div', { class: 'su-co' }, h('b', {}, pv.company), h('button', { class: 'su-link', type: 'button', onclick: () => { pick.seed = randomSeed(); sfx.blip(); ready(); } }, 'Try a different company')),
          h('dl', {}, fact('Business', s.label), fact('Your role', r.label), fact('Size', (pv.N > 1 ? pv.N + ' ' + s.vocab.units : '1 ' + s.vocab.unit) + ', ' + pv.headcount + ' people'), fact('Runs on', 'Sample ERP, with every report in one place'), fact('10:00 AM', cap(tenAm)))),
        h('p', { class: 'su-q' }, 'How it works'),
        h('ol', { class: 'su-how' }, h('li', {}, 'Round 1: play the morning on your own, with your ERP, inbox and texts.'), h('li', {}, 'Round 2: play the same morning again, with Wake.'), h('li', {}, 'Then watch both weeks play out and see your score.')),
        h('div', { class: 'su-go' }, btn('Start the game', go, 'ab primary big'), h('span', { class: 'mc-key' }, 'Enter'))));
    keys((e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } else if (e.key === 'Escape') setupMoment(); });
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
        what: 'Walking in on a Monday. ' + w.shell.company + ' runs on Sample ERP: every report, scorecard and number in one place. Your ' + meeting + ' starts at 10:00 AM.',
        note: 'Sample ERP is made up. It stands in for the ERP your business already runs on, like NetSuite, QuickBooks, Sage or Dynamics.',
        why: 'You built a business that tracks everything. The problems that cost you money this week are already in there. The question is whether you find them by ten.',
        wake: 'Wake reads every system the business runs on overnight. Nobody has to ask it a question first: by the time you walk in, it already knows what changed.',
        cta: 'Walk in' },
      card: { step: 2, kicker: 'Round 1 · on your own · 7:48 AM', title: 'Get ready for ten o\'clock.',
        what: 'Your computer has Sample ERP, plus Gmail, Calendar and Messages. Every number is in there. Find the ones that matter, flag 3 to 5 of them, and decide who handles each.',
        why: 'This is how most teams prep today: all the data in one system, and nothing in it saying what changed or why. Remember how it feels.',
        wake: 'This round you dig on your own. With Wake, there is nothing to search for or prompt: the morning is already read, connected and ranked.',
        cta: 'Sit down' },
      done });
  }

  return { start: first, arrival, office, card, clear, wait, setMoment };
}
