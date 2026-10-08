// INTERFACE
// Renders what the engines return and narrates the player through it. No business logic.
//   arcade front end → Round 1 (on your own) → rewind → Round 2 (with Wake)
//   → walk to the meeting → present yours, present Wake's → walk back → the week → the ending

import { createGame } from '../engine/game.js';
import { fmtClock } from '../engine/config.js';
import { h, avatar } from './art.js';
import { drawDesk, OBJECTS, DW, DH } from './arcade/desk.js';
import { sfx } from './arcade/sound.js';
import { createField } from './field.js';
import { createArcade } from './arcade/screens.js';

const HOST = (typeof window !== 'undefined' && window.WAKE_HOST) || 'web';
const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.getElementById('wx');
let game = null;
let cleanup = null;
const CLOCK_MS = 2000;            // one minute of the morning every two seconds: 7:48 to 10:00 in about 4.5 minutes

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
  let steps = [], i = -1, timer = null;
  function place() {
    const st = steps[i]; if (!st) return;
    const t = st.target ? document.querySelector(st.target) : null;
    const vw = window.innerWidth, vh = window.innerHeight;
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
  function go(n) {
    i = n;
    const st = steps[i];
    if (!st) { stop(); return; }
    box.hidden = false;
    box.replaceChildren(h('b', {}, 'GUIDE'), h('p', {}, st.text), st.next ? btn(st.next, () => { sfx.select(); go(i + 1); }, 'btn primary small') : h('span', { class: 'coach-wait' }, '▶ ' + (st.hint || 'Go ahead')));
    sfx.blip(); place();
  }
  function stop() { steps = []; i = -1; box.hidden = true; ring.hidden = true; clearInterval(timer); }
  return {
    run(list) { steps = list; clearInterval(timer); timer = setInterval(place, 250); go(0); },
    emit(ev) { const st = steps[i]; if (st && st.wait && (st.wait === ev || (Array.isArray(st.wait) && st.wait.includes(ev)))) setTimeout(() => go(i + 1), 120); },
    stop, active: () => i >= 0,
  };
}
const coach = createCoach();

// ------------------------------------------------------------------ opening
const arcade = createArcade({
  root, reduced,
  onPicked(shellId, roleId) {
    game = createGame({ shellId, roleId });
    window.WakeExperience = { session: () => game.session(), state: () => game.state };
    arcade.arrival(game, () => round1());
  },
});
const restart = () => { coach.stop(); game = null; arcade.start(); };

// ------------------------------------------------------------------ ROUND 1: on your own
const KINDS = { email: 'Inbox', report: 'Reports', message: 'Phone', note: 'Note', calendar: 'Calendar', location: 'Locations' };

function round1() {
  const w = game.world, D = w.day;
  game.startRound1();
  let panelKind = null, docId = null, docStart = 0, shownClock = game.state.clock;
  const clockEl = h('b', { class: 'clock' }, fmtClock(shownClock));
  const deskCanvas = h('canvas', { class: 'desk-art', role: 'img', 'aria-label': 'Your desk on Monday morning' });
  const spots = h('div', { class: 'spots' });
  const panel = h('section', { class: 'panel', hidden: true });
  const overlay = h('div', { class: 'overlay', hidden: true });
  const toasts = h('div', { class: 'toasts', 'aria-live': 'polite' });
  const tray = h('div', { class: 'tray' });
  const banner = h('div', { class: 'banner', hidden: true });

  show('day', 'office round1',
    h('header', { class: 'bar' },
      h('div', { class: 'when' }, h('span', { class: 'round-tag' }, 'ROUND 1 · ON YOUR OWN'), clockEl, h('span', { class: 'co' }, w.shell.company)),
      h('div', { class: 'bar-right' }, btn('HOW THIS WORKS', rulesCard, 'chip'))),
    banner,
    h('div', { class: 'stage' },
      h('div', { class: 'prompt' }, h('h1', {}, 'FIND WHAT MATTERS.'), h('p', {}, 'Flag at least 3 data points and write what your team should do about each one.')),
      h('div', { class: 'scene' }, h('div', { class: 'scene-wrap' }, deskCanvas), spots), panel),
    tray, overlay, toasts);

  const drawScene = () => drawDesk(deskCanvas, Math.min(1, (shownClock - D.start) / (D.meetingAt - D.start)));
  const steam = setInterval(drawScene, 600);
  const ticker = setInterval(() => {
    const r = game.tickClock();
    shownClock = r.clock; clockEl.textContent = fmtClock(r.clock);
    if (r.fired.length) { toast(r.fired); drawSpots(); if (panelKind) drawList(); }
    if (r.atTen && banner.hidden) {
      banner.hidden = false;
      banner.replaceChildren(h('b', {}, '10:00 AM'), h('span', {}, game.state.flags.length >= game.MIN_FLAGS ? 'Your meeting is waiting. Submit your briefing when you\'re ready.' : 'Your meeting is waiting. Flag at least ' + game.MIN_FLAGS + ' data points, then submit.'));
      sfx.credit();
    }
  }, reduced ? 600 : CLOCK_MS);
  cleanup = () => { clearInterval(steam); clearInterval(ticker); coach.stop(); };

  function drawSpots() {
    spots.replaceChildren(...Object.entries(OBJECTS).map(([kind, o]) => {
      const [x, y, ww, hh] = o.rect, n = game.unread(kind);
      const label = kind === 'location' ? 'Your six ' + w.shell.vocab.units : KINDS[kind];
      return h('button', { class: 'spot', type: 'button', 'data-kind': kind, style: { left: x / DW * 100 + '%', top: y / DH * 100 + '%', width: ww / DW * 100 + '%', height: hh / DH * 100 + '%' }, onclick: () => openPanel(kind) },
        h('span', { class: 'tag' }, label.toUpperCase(), n ? h('i', {}, String(n)) : null));
    }));
  }

  function toast(fired) {
    for (const f of fired) {
      const src = w.sources[f.source];
      const el = h('button', { class: 'toast', type: 'button', onclick: () => { el.remove(); openPanel(src.kind); openDoc(f.source); } }, src.from ? av(src.from, 30) : null, h('span', {}, f.toast));
      toasts.appendChild(el); sfx.credit();
      setTimeout(() => el.remove(), 8000);
    }
  }

  function closeDoc() { if (docId) { game.dwell(docId, Date.now() - docStart); docId = null; } }

  function openPanel(kind) {
    closeDoc();
    panelKind = kind; sfx.blip();
    const items = game.listSources(kind);
    panel.hidden = false;
    const single = items.length === 1 && (kind === 'calendar' || kind === 'note');
    const listEl = h('div', { class: 'list' });
    const reader = h('article', { class: 'reader' }, h('p', { class: 'empty' }, kind === 'location' ? 'Pick a ' + w.shell.vocab.unit + ' to open its file.' : 'Pick something to open it.'));
    panel.replaceChildren(
      h('div', { class: 'panel-head' }, btn('◀ BACK TO DESK', closePanel, 'link back'), h('h2', {}, kind === 'location' ? 'YOUR SIX ' + w.shell.vocab.units.toUpperCase() : KINDS[kind].toUpperCase()), h('span', { class: 'sys' }, kind === 'message' ? 'Texts to your phone' : '')),
      h('div', { class: 'panel-body' + (single ? ' single' : '') }, listEl, reader));
    panel._list = listEl; panel._reader = reader; panel._body = panel.querySelector('.panel-body');
    drawList();
    coach.emit('panel');
    if (single) openDoc(items[0].id);
  }

  function drawList() {
    if (!panelKind) return;
    panel._list.replaceChildren(...game.listSources(panelKind).map((s) => h('button', { class: 'item' + (s.opened ? ' read' : '') + (s.id === docId ? ' on' : ''), type: 'button', onclick: () => openDoc(s.id) },
      s.from && panelKind !== 'report' ? av(s.from, 34) : null,
      h('span', { class: 'item-text' }, h('strong', {}, s.title), h('span', {}, panelKind === 'report' || panelKind === 'location' ? s.sub : (panelKind === 'email' ? w.characters[s.from].name + ' · ' : '') + s.when), s.flag ? h('em', {}, s.flag) : null))));
  }

  function closePanel() { closeDoc(); panelKind = null; panel.hidden = true; drawSpots(); sfx.back(); }

  function openDoc(id) {
    closeDoc();
    const v = game.open(id); if (!v) return;
    docId = id; docStart = Date.now();
    renderDoc(v); panel._body.classList.add('reading');
    drawList(); drawSpots(); sfx.blip();
    coach.emit('doc');
  }

  function renderDoc(s) {
    const R = panel._reader;
    const kids = [h('button', { class: 'link back mobile-only', type: 'button', onclick: () => { panel._body.classList.remove('reading'); drawList(); } }, '◀ BACK TO THE LIST')];
    if (s.kind === 'email' || s.kind === 'message' || s.kind === 'note') {
      const flagBtn = s.kind === 'note' ? null : btn(s.flagged ? 'FLAGGED #' + s.flagged + ' · EDIT' : '⚑ FLAG THIS', () => s.flagged ? editFlag(s.pinKeys, s.id) : compose({ signals: s.pinKeys, source: s.id, what: { label: s.quote, from: s.from ? s.from.name : '' } }), 'pinbtn' + (s.flagged ? ' pinned' : ''));
      kids.push(h('div', { class: 'doc ' + s.kind },
        h('div', { class: 'from' }, s.from ? av(s.from.key, 46) : null, h('div', {}, h('strong', {}, s.from ? s.from.name : ''), h('span', {}, [s.from && s.from.title, s.when].filter(Boolean).join(' · ')))),
        s.kind === 'email' ? h('h3', {}, s.title) : null, s.flag ? h('p', { class: 'flag' }, s.flag) : null,
        h('div', { class: 'body' }, s.body.map((p) => h('p', {}, p))), flagBtn));
    } else {
      const who = s.kind === 'location' ? s.from : null;
      kids.push(h('div', { class: 'doc sheet' },
        h('h3', {}, s.title), s.sub ? h('p', { class: 'quiet' }, s.sub) : null,
        who ? h('blockquote', { class: 'mgr' }, av(who.key, 46), h('div', {}, h('p', {}, '"' + s.note + '"'), h('span', {}, who.name))) : null,
        h('p', { class: 'intro' }, (s.intro ? s.intro + ' ' : '') + 'Click any line to flag it.'),
        s.sections.map((sec) => h('div', { class: 'sec' }, h('h4', {}, sec.title), sec.lines.map((l) => h('button', { class: 'line' + (l.flag ? ' pinned' : ''), type: 'button', onclick: () => l.flag ? editFlag([l.key], s.id) : compose({ signals: [l.key], source: s.id, what: { label: l.label, value: [l.value, l.delta].filter(Boolean).join(', ') } }) },
          l.flag ? h('i', { class: 'fnum' }, String(l.flag)) : null, h('span', { class: 'l' }, l.label), h('span', { class: 'v' }, l.value), h('span', { class: 'd' }, l.delta)))))));
    }
    if (s.related.length) kids.push(h('div', { class: 'related' }, h('span', {}, 'Related'), s.related.map((r) => btn(r.title, () => { openPanel(r.kind); openDoc(r.id); }, 'chip'))));
    R.replaceChildren(...kids); R.scrollTop = 0;
  }

  // The composer: the flagged data point, the action in the player's words, an optional owner.
  function compose({ signals, source, what, existing }) {
    if (!existing && game.state.flags.length >= game.MAX_FLAGS) { note('You can flag up to ' + game.MAX_FLAGS + '. Remove one in your findings to add another.'); return; }
    sfx.select();
    let owner = existing ? existing.owner : null;
    const ta = h('textarea', { id: 'wx-action', rows: '3', maxlength: '280', placeholder: 'For example: Riverside, look into why overtime doubled and report back Wednesday.', 'aria-label': 'Your action for the team' });
    if (existing) ta.value = existing.text;
    const chips = h('div', { class: 'chips owner-pick' });
    const drawOwners = () => chips.replaceChildren(...game.owners().map((o) => h('button', { class: 'chip person-chip' + (owner === o.key ? ' on' : ''), type: 'button', 'aria-pressed': String(owner === o.key), onclick: () => { owner = owner === o.key ? null : o.key; drawOwners(); sfx.blip(); } }, av(o.key, 20), first(o.name))));
    drawOwners();
    const save = btn(existing ? 'SAVE ▶' : 'ADD TO FINDINGS ▶', () => {
      if (ta.value.trim().length < 3) { ta.focus(); ta.classList.add('shake'); setTimeout(() => ta.classList.remove('shake'), 400); return; }
      if (existing) game.editFlag(existing.id, { text: ta.value, owner }); else game.flag({ signals, source, text: ta.value, owner });
      closeCard(); sfx.coin(); drawTray(); if (docId) renderDoc(game.view(docId));
      coach.emit('flagged');
    }, 'btn primary');
    card('composer',
      h('p', { class: 'stamp' }, existing ? 'EDIT FINDING #' + (game.state.flags.indexOf(existing) + 1) : 'YOU FLAGGED'),
      h('blockquote', { class: 'flagged' }, h('strong', {}, what.label), what.value ? h('span', {}, what.value) : null, what.from ? h('span', {}, 'From ' + what.from) : null),
      h('label', { for: 'wx-action' }, 'What should your team do about it?'), ta,
      h('p', { class: 'label' }, 'Who owns it? ', h('span', { class: 'quiet' }, 'Optional')), chips,
      h('div', { class: 'row' }, save, existing ? btn('Remove this finding', () => { game.removeFlag(existing.id); closeCard(); sfx.back(); drawTray(); if (docId) renderDoc(game.view(docId)); }, 'link') : null, btn('Cancel', () => { closeCard(); sfx.back(); }, 'link')));
    ta.focus({ preventScroll: true });
    coach.emit('compose');
  }
  function editFlag(sigs, source) { const f = game.state.flags.find((x) => x.signals.some((id) => sigs.includes(id))); if (f) compose({ existing: f, what: f.what, source }); }

  function drawTray() {
    const fl = game.flags(), n = fl.length, ok = n >= game.MIN_FLAGS;
    tray.replaceChildren(
      h('button', { class: 'tray-open', type: 'button', onclick: findingsCard },
        h('b', {}, 'YOUR FINDINGS'), h('span', { class: 'tcount' + (ok ? ' ok' : '') }, n + ' / ' + game.MIN_FLAGS + (n > game.MIN_FLAGS ? '+' : '')),
        h('span', { class: 'slots' }, Array.from({ length: game.MAX_FLAGS }, (_, i) => h('i', { class: i < n ? 'on' : i < game.MIN_FLAGS ? 'need' : '' })))),
      btn(ok ? 'REVIEW & SUBMIT ▶' : 'FLAG ' + (game.MIN_FLAGS - n) + ' MORE', ok ? findingsCard : () => note('Open your reports, inbox and phone. Click any line or message that sticks out to flag it.'), 'btn' + (ok ? ' primary' : '')));
  }

  function findingsCard() {
    const fl = game.flags();
    const ok = fl.length >= game.MIN_FLAGS;
    const rows = fl.map((f, i) => h('li', { class: 'finding-row' },
      h('span', { class: 'fnum' }, String(i + 1)),
      h('div', {}, h('strong', {}, f.what.label + (f.what.value ? ' (' + f.what.value + ')' : '')), h('p', {}, '"' + f.text + '"'), h('span', { class: 'quiet' }, f.owner ? 'Owner: ' + f.ownerName : 'No owner named')),
      h('div', { class: 'row-tools' }, btn('▲', () => { game.moveFlag(f.id, -1); findingsCard(); drawTray(); }, 'chip'), btn('▼', () => { game.moveFlag(f.id, 1); findingsCard(); drawTray(); }, 'chip'), btn('EDIT', () => compose({ existing: game.state.flags.find((x) => x.id === f.id), what: f.what }), 'chip'))));
    card('findings-card',
      h('h2', {}, 'YOUR BRIEFING'),
      h('p', {}, fl.length ? 'This is exactly what you\'ll hand your team at 10:00. Put it in the order you\'d tackle it.' : 'Nothing flagged yet.'),
      h('ol', { class: 'finding-list' }, rows),
      h('div', { class: 'row' }, ok ? btn('LOCK IT IN ▶', () => { closeCard(); submit(); }, 'btn primary') : h('span', { class: 'quiet' }, 'Flag at least ' + game.MIN_FLAGS + ' to submit.'), btn('Keep working', () => { closeCard(); sfx.back(); }, 'link')));
  }

  function submit() {
    if (!game.submitRound1()) return;
    sfx.start(); leave(); rewind();
  }

  function card(cls, ...kids) { overlay.hidden = false; overlay.replaceChildren(h('div', { class: 'dialog ' + cls }, ...kids)); }
  function closeCard() { overlay.hidden = true; overlay.replaceChildren(); }
  function note(text) { const el = h('div', { class: 'toast note' }, h('span', {}, text)); toasts.appendChild(el); setTimeout(() => el.remove(), 5000); sfx.back(); }
  function rulesCard() {
    card('rules-card', h('h2', {}, 'HOW THIS WORKS'),
      h('ul', { class: 'mini-rules' },
        h('li', {}, 'Click anything on your desk to open it. Nothing you open costs time.'),
        h('li', {}, 'Click a line, or ⚑ FLAG THIS on a message, when something sticks out.'),
        h('li', {}, 'Write what your team should do about it. Naming an owner is optional.'),
        h('li', {}, 'Flag ' + game.MIN_FLAGS + ' to ' + game.MAX_FLAGS + ' data points. Then lock in your briefing.'),
        h('li', {}, 'The clock runs to 10:00 on its own. Look across everything before you decide.')),
      h('div', { class: 'row' }, btn('BACK TO MY DESK ▶', closeCard, 'btn primary')));
  }

  drawScene(); drawSpots(); drawTray();
  setTimeout(() => coach.run([
    { text: 'This is your desk. Reports, inbox, phone, calendar and your six location files are all here.', target: '.scene-wrap', next: 'NEXT ▶' },
    { text: 'Click anything to open it. Try the computer: it has your reports.', target: '.spot[data-kind="report"]', wait: 'panel', hint: 'Click the computer' },
    { text: 'Pick something from the list to open it.', target: '.panel .list', wait: 'doc', hint: 'Pick one' },
    { text: 'Every line is a data point. When one sticks out, click it to flag it. Messages have a ⚑ FLAG THIS button.', target: '.reader .doc', wait: 'compose', hint: 'Flag something', side: 'over' },
    { text: 'Now write what you\'d tell your team to do. Picking an owner is optional.', target: '.composer .btn.primary', wait: 'flagged', hint: 'Add it to your findings' },
    { text: 'Your findings collect down here. You need at least 3, up to 5.', target: '.tray', next: 'NEXT ▶' },
    { text: 'The clock runs to 10:00 on its own and nothing costs time. Open everything, compare across your desk, then lock in your briefing.', target: '.bar .clock', next: 'GOT IT ▶' },
  ]), reduced ? 0 : 500);
}

// ------------------------------------------------------------------ rewind
function rewind() {
  const s = game.state, D = game.world.day;
  const clock = h('b', { class: 'big-clock' }, fmtClock(s.submittedAt));
  const go = btn('START ROUND 2 ▶', round2, 'btn primary');
  const msg = h('div', { class: 'rewind-copy' },
    h('h1', {}, 'ROUND 1 COMPLETE'),
    h('p', { class: 'lede' }, 'Your briefing is locked: ' + s.flags.length + ' findings, ready at ' + fmtClock(s.submittedAt) + '.'));
  const after = h('div', { class: 'rewind-copy', hidden: true },
    h('h1', { class: 'cyan' }, 'ROUND 2 · WITH WAKE'),
    h('p', { class: 'lede' }, 'Same desk. Same data. Same 7:48 AM.'),
    h('p', { class: 'lede' }, 'This time Wake is running underneath, reading every system at once.'), go);
  const rw = btn('◀◀ REWIND TO 7:48 AM', async () => {
    rw.disabled = true; el.classList.add('vhs'); sfx.zoom();
    for (let m = s.submittedAt; m >= D.start; m -= Math.max(1, Math.round((s.submittedAt - D.start) / 24))) { clock.textContent = fmtClock(m); await wait(45); }
    clock.textContent = fmtClock(D.start); el.classList.remove('vhs'); sfx.credit();
    msg.hidden = true; rw.hidden = true; after.hidden = false; root.className = 'wx arcade wake';
    go.focus({ preventScroll: true });
  }, 'btn');
  const el = show('day', 'rewind', clock, msg, after, rw);
}

// ------------------------------------------------------------------ ROUND 2: with Wake
function round2() {
  let B = game.startRound2();
  const w = game.world, n = (x) => x.toLocaleString('en-US');
  // a few seconds of Wake reading everything, then the briefing
  const canvas = h('canvas', { class: 'field', 'aria-hidden': 'true' });
  const sys = h('ul', { class: 'syslist' }, B.systems.map((x) => h('li', {}, h('span', {}, x.name), h('b', {}, n(x.n)))));
  const cap = h('p', { class: 'cap' }, h('b', {}, n(B.funnel.records)), ' records across every system. Yellow is what you looked at in Round 1.');
  const skip = btn('SKIP ▶', () => console_(), 'btn');
  show('wake', 'scan', h('div', { class: 'scan-grid' }, h('div', { class: 'field-wrap' }, canvas), sys), cap, h('div', { class: 'row' }, skip));
  const field = createField(canvas, { ...B, findings: B.findings }, reduced);
  let alive = true;
  cleanup = () => { alive = false; field.destroy(); };
  (async () => {
    const lis = [...sys.children];
    for (const li of lis) { if (!alive) return; li.classList.add('on'); sfx.type(); await wait(160); }
    const steps = [[3, n(B.funnel.moved), ' moved outside their normal range.'], [4, n(B.funnel.material), ' connect to something real. ' + B.funnel.dismissed + ' false alarms filtered.'], [6, String(B.funnel.findings), ' priorities, ranked.']];
    for (const [st, big, text] of steps) { if (!alive) return; field.setStage(st); cap.replaceChildren(h('b', {}, big), text); sfx.blip(); await wait(1500); }
    if (alive) console_();
  })();

  function console_() {
    if (!alive && root.querySelector('.wake-console')) return;
    alive = false;
    const cardsEl = h('div', { class: 'wcards' });
    const phoneEl = h('ul', { class: 'phone-list' });
    const lockNote = h('span', { class: 'quiet', 'aria-live': 'polite' });
    const lock = btn('LOCK BRIEFING ▶', () => { game.lockRound2(); sfx.start(); coach.stop(); walkToMeeting(); }, 'btn primary');
    const clockEl = h('b', { class: 'clock' }, fmtClock(B.clock));
    show('wake', 'wake-console',
      h('header', { class: 'bar' }, h('div', { class: 'when' }, h('span', { class: 'round-tag cyan' }, 'ROUND 2 · WITH WAKE'), clockEl, h('span', { class: 'co' }, w.shell.company))),
      h('div', { class: 'console-head' }, h('h1', {}, 'YOUR BRIEFING IS READY.'),
        h('p', { class: 'lede' }, 'Wake read ' + n(B.funnel.records) + ' records across ' + B.systems.length + ' systems and connected ' + B.funnel.material + ' signals. You decide what happens.')),
      h('div', { class: 'console-grid' },
        cardsEl,
        h('aside', { class: 'side' },
          h('section', { class: 'phone' }, h('h2', {}, 'YOUR PHONE'), h('p', { class: 'quiet' }, 'Texts aren\'t connected to Wake. Put one through and watch what it changes.'), phoneEl),
          h('section', { class: 'filtered' }, h('h2', {}, 'FILTERED OUT · ' + B.filtered.length), h('ul', {}, B.filtered.map((f) => h('li', {}, h('strong', {}, f.label + ' ' + f.value), h('span', {}, f.because))))))),
      h('div', { class: 'lockbar' }, lockNote, lock));
    function draw() {
      cardsEl.replaceChildren(...B.cards.map((c, i) => h('article', { class: 'wcard' + (c.assigned ? ' assigned' : '') + (c.urgent ? ' urgent' : ''), id: 'wc-' + c.id },
        h('div', { class: 'wc-top' }, h('span', { class: 'rank' }, String(i + 1)), h('span', { class: 'place' }, c.place.toUpperCase() + (c.urgent ? ' · TODAY' : '')),
          h('span', { class: 'row-tools' }, btn('▲', () => { B = game.moveWake(c.id, -1); draw(); sfx.blip(); }, 'chip'), btn('▼', () => { B = game.moveWake(c.id, 1); draw(); sfx.blip(); }, 'chip'))),
        h('h3', {}, c.headline),
        c.assigned ? null : h('p', { class: 'why' }, c.why),
        c.assigned ? null : h('ul', { class: 'ev' }, c.evidence.map((e) => h('li', { class: e.flagged ? 'flagged' : e.seen ? 'seen' : '' }, h('span', { class: 'sysname' }, e.system), h('span', {}, e.label + (e.value ? ': ' + e.value : ''))))),
        c.sharpened.length ? h('ul', { class: 'sharp' }, c.sharpened.map((s) => h('li', {}, h('b', {}, '+ ' + s.from.toUpperCase()), ' ' + s.line))) : null,
        h('div', { class: 'do' }, h('span', { class: 'lbl' }, 'DO'), h('p', {}, c.action)),
        h('div', { class: 'wc-foot' },
          h('span', { class: 'owners' }, c.owners.map((o) => h('span', { class: 'owner' }, av(o.key, 26), h('span', {}, o.name)))),
          c.assigned ? h('span', { class: 'stampd' }, '✓ ASSIGNED') : btn('ASSIGN ▶', () => { B = game.assign(c.id); clockEl.textContent = fmtClock(B.clock); sfx.coin(); draw(); coach.emit('assign'); }, 'btn primary small')),
        c.assigned ? null : h('p', { class: 'check' }, 'Check: ' + c.check))));
      phoneEl.replaceChildren(...B.phone.map((p) => h('li', { class: p.done ? 'done' : '', id: 'ph-' + p.id }, av(p.key, 30), h('div', {}, h('strong', {}, first(p.from)), h('p', {}, p.text)),
        p.done ? h('span', { class: 'stampd' }, '✓ IN WAKE') : btn('PUT THROUGH WAKE ▶', () => through(p.id), 'chip'))));
      const left = B.cards.filter((c) => !c.assigned).length;
      lock.disabled = !B.ready;
      lockNote.textContent = left ? left + ' left to assign' : 'Ready at ' + fmtClock(B.clock);
    }
    async function through(id) {
      const from = document.getElementById('ph-' + id);
      const r = game.putThrough(id); if (!r) return;
      sfx.zoom();
      const target = r.finding ? document.getElementById('wc-' + r.finding) : root.querySelector('.filtered');
      if (from && target && !reduced) {
        const a = from.getBoundingClientRect(), b = target.getBoundingClientRect();
        const ghost = h('div', { class: 'flyer' }, 'WAKE');
        Object.assign(ghost.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px' });
        document.body.appendChild(ghost);
        requestAnimationFrame(() => Object.assign(ghost.style, { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(.6)`, opacity: '0.2' }));
        await wait(650); ghost.remove();
      }
      B = r.briefing; draw(); sfx.credit();
      const t = r.finding ? document.getElementById('wc-' + r.finding) : root.querySelector('.filtered');
      if (t) { t.classList.add('glow'); t.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); setTimeout(() => t.classList.remove('glow'), 1600); }
      if (!r.finding) { const li = document.createElement('li'); li.className = 'note-in'; li.textContent = r.line; root.querySelector('.filtered ul').appendChild(li); }
      coach.emit('through');
    }
    draw();
    cleanup = () => coach.stop();
    setTimeout(() => coach.run([
      { text: 'Same morning, but Wake already did the reading. Each card is one situation, with evidence pulled from different systems.', target: '.wcard', next: 'NEXT ▶', side: 'over' },
      { text: 'Yellow marks evidence you saw in Round 1. Your job now is to decide. Reorder if you disagree, then assign.', target: '.wcard .wc-foot .btn', wait: 'assign', hint: 'Assign one' },
      { text: 'Your phone isn\'t connected to Wake. Put a text through and watch where it lands.', target: '.phone', wait: 'through', hint: 'Put a text through' },
      { text: 'Assign the rest, then lock your briefing. That\'s it.', target: '.lockbar', next: 'GOT IT ▶' },
    ]), reduced ? 0 : 400);
  }
}

// ------------------------------------------------------------------ the meeting
function walkToMeeting() {
  leave();
  arcade.walkScene(game, { day: 'MONDAY', time: '10:00 AM', people: 'meeting', route: 'toMeeting', from: { x: 284, y: 180 }, view: [144, 168, 2.6],
    lines: ['MONDAY  10:00 AM', 'This is where data turns into work. Your team will act on exactly what you hand them.', 'You\'ll present twice. Your briefing first, then Wake\'s.'],
    cta: 'START PRESENTING ▶' }, meeting);
}

const ROOM = ['dev', 'tom', 'ines', 'renee', 'colin', 'marisol', 'grace', 'marcus', 'aiko', 'derek', 'noor', 'eli'];

function meeting() {
  const w = game.world, Dl = game.delivery();
  const tiles = {};
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
      h('section', { class: 'col you' }, h('h2', {}, 'ON YOUR OWN'), stat(S.you.ready, 'briefing ready, after ' + S.you.took + ' of reading'), stat(S.you.real + ' of 5', 'real issues found'), stat(S.you.handed + ' of ' + S.you.flags, 'handed off cleanly')),
      h('section', { class: 'col wk' }, h('h2', {}, 'WITH WAKE'), stat('7:48 AM', 'briefing waiting before you sat down, decisions done by ' + S.wake.ready), stat(S.wake.findings + ' of 5', 'found, ' + S.wake.filtered + ' false alarms filtered'), stat(S.wake.handed + ' of ' + S.wake.handed, 'handed off cleanly'))),
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
