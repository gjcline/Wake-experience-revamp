// ROUND 2: WITH WAKE
// The same desk, rebuilt around Wake. Wake's read of the morning loads into the computer
// the player already uses. The raw reports are gone from the desk; in their place are the
// documents an executive has time for once the reading is done. Inbox, phone and calendar
// are still here, and still live. The player's job is the one only they can do: decide.
// Renders what the engine returns. No business logic lives here.

import { h, avatar } from './art.js';
import { drawDesk, OBJECTS, DW, DH } from './arcade/desk.js';
import { sfx } from './arcade/sound.js';
import { fmtClock } from '../engine/config.js';

const CLOCK_MS = 2000;

export function round2({ game, show, coach, reduced, onLock, setCleanup }) {
  const w = game.world, D = w.day, M = w.shell.multi, V = w.shell.vocab;
  const btn = (label, onclick, cls = 'btn') => h('button', { class: cls, type: 'button', onclick }, label);
  const ME = { skin: '#D9A07A', hair: '#2A1C14', style: 'short', shirt: '#FFD23F' };
  const av = (key, size) => avatar(key === 'me' ? ME : (w.characters[key] || {}).av, size);
  const first = (name) => String(name).split(' ')[0];
  const person = (k) => game.person(k);
  const n = (x) => x.toLocaleString('en-US');
  const B0 = game.briefing();
  const KINDS = { report: 'Wake', location: 'Exec briefs', note: 'Thursday brief', email: 'Inbox', message: 'Phone', calendar: 'Calendar', team: 'Team' };
  const SUBS = { report: 'Everything this morning, read, connected and ranked', location: 'What you have time for now', note: 'Drafted for you', email: 'Wake reads these as they land', message: 'Texts are not in any system', calendar: w.shell.mondayLong, team: 'Who is on what' };
  const PANEL = { report: 'wake', location: 'briefs', note: 'brief', email: 'email', message: 'message', calendar: 'calendar', team: 'team' };

  let kind = null, docId = null, shown = game.state.wakeClock, pop = null, calTab = 'this', open = {}, live = false;
  const clockEl = h('b', { class: 'clock' }, fmtClock(shown));
  const pclock = h('b', { class: 'pclock' }, fmtClock(shown));
  const deskCanvas = h('canvas', { class: 'desk-art', role: 'img', 'aria-label': 'Your desk, with Wake' });
  const spots = h('div', { class: 'spots', hidden: true });
  const panel = h('section', { class: 'panel', hidden: true, 'aria-label': 'Desk item' });
  const overlay = h('div', { class: 'overlay', hidden: true });
  const toasts = h('div', { class: 'toasts', 'aria-live': 'polite' });
  const tray = h('div', { class: 'tray wake-tray', hidden: true });
  const banner = h('div', { class: 'banner', hidden: true });

  show('wake', 'office round2',
    h('header', { class: 'bar' },
      h('div', { class: 'when' }, h('span', { class: 'round-tag cyan' }, 'ROUND 2 · WITH WAKE'), clockEl, h('span', { class: 'co' }, w.shell.company)),
      h('div', { class: 'bar-right' }, btn('HOW THIS WORKS', rulesCard, 'chip'))),
    banner,
    h('div', { class: 'stage' },
      h('div', { class: 'prompt' }, h('h1', {}, 'DECIDE WHAT MATTERS.'), h('p', {}, 'Pick ' + game.MIN_PICKS + ' to ' + game.MAX_PICKS + ' insights to hand your team before your ' + w.role.meetingName + ' at 10:00 AM.')),
      h('div', { class: 'scene' }, h('div', { class: 'scene-wrap' }, deskCanvas), spots)),
    panel, tray, overlay, toasts);

  let glow = 0;
  const drawScene = () => drawDesk(deskCanvas, Math.min(1, (shown - D.start) / (D.meetingAt - D.start)), w.shell.size, 'wake', glow);
  const steam = setInterval(drawScene, 600);
  let ticker = null;
  const ghost = { stop: () => {} };
  setCleanup(() => { clearInterval(steam); clearInterval(ticker); ghost.stop(); coach.stop(); });
  sfx.ambience(1);
  drawScene();

  // ------------------------------------------------------------ Wake loads into the computer
  // Everything Wake read drifts in from around the screen like vapor and is pulled into the
  // monitor: the same place the reports used to arrive.
  function loadIn(done) {
    if (reduced) { done(); return; }
    const cv = h('canvas', { class: 'ghost-layer', 'aria-hidden': 'true' });
    document.body.appendChild(cv);
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const box = deskCanvas.getBoundingClientRect();
    const [mx, my, mw, mh] = OBJECTS.report.rect;
    const tx = box.left + (mx + mw / 2) / DW * box.width, ty = box.top + (my + mh * 0.4) / DH * box.height;
    const words = B0.systems.map((s) => s.name).concat(['WO-' + (4100 + (w.seed % 700)), n(B0.funnel.records) + ' records', 'payroll export', 'invoice lines', 'reviews', 'schedules', 'work orders', 'texts', 'email']);
    const P = [];
    const rnd = (() => { let a = (w.seed || 1) >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
    const edge = () => { const s = rnd() * 4 | 0; return s === 0 ? [rnd() * W, -20] : s === 1 ? [W + 20, rnd() * H] : s === 2 ? [rnd() * W, H + 20] : [-20, rnd() * H]; };
    for (let i = 0; i < 46; i++) { const [x, y] = rnd() < 0.5 ? edge() : [rnd() * W, rnd() * H]; P.push({ t: 'v', x, y, r: 26 + rnd() * 54, d: rnd() * 700, dur: 1500 + rnd() * 700, sw: (rnd() - 0.5) * 1.6 }); }
    for (let i = 0; i < 180; i++) { const [x, y] = rnd() < 0.35 ? edge() : [rnd() * W, rnd() * H]; P.push({ t: 'p', x, y, s: 2 + (rnd() * 3 | 0), d: rnd() * 1100, dur: 1100 + rnd() * 700, sw: (rnd() - 0.5) * 2.2 }); }
    words.forEach((word, i) => { const [x, y] = [rnd() * W, rnd() * H * 0.9]; P.push({ t: 'w', x, y, word, d: 150 + i * 70, dur: 1500 + rnd() * 500, sw: (rnd() - 0.5) * 1.2 }); });
    const t0 = performance.now(); let raf = 0, dead = false;
    sfx.zoom();
    const frame = (now) => {
      if (dead) return;
      const el = now - t0;
      g.clearRect(0, 0, W, H);
      let alive = 0;
      for (const p of P) {
        const k = Math.max(0, Math.min(1, (el - p.d) / p.dur));
        if (k >= 1) continue; alive += 1;
        const e = k * k * k; // accelerating: pulled in
        const dx = tx - p.x, dy = ty - p.y, len = Math.hypot(dx, dy) || 1;
        const off = Math.sin(Math.PI * k) * p.sw * len * 0.35;
        const x = p.x + dx * e - dy / len * off, y = p.y + dy * e + dx / len * off;
        const a = (k < 0.15 ? k / 0.15 : 1) * (1 - e * 0.7);
        if (p.t === 'v') {
          const r = p.r * (1 - e * 0.85);
          const gr = g.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, 'rgba(57,229,224,' + (0.16 * a) + ')'); gr.addColorStop(1, 'rgba(57,229,224,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        } else if (p.t === 'p') {
          g.fillStyle = 'rgba(160,250,247,' + (0.85 * a) + ')'; g.fillRect(Math.round(x), Math.round(y), p.s, p.s);
        } else {
          g.font = Math.round(13 * (1 - e * 0.7)) + "px 'VT323', monospace"; g.fillStyle = 'rgba(57,229,224,' + (0.75 * a) + ')'; g.fillText(p.word.toUpperCase(), x, y);
        }
      }
      const pull = Math.min(1, el / 2200);
      const halo = g.createRadialGradient(tx, ty, 0, tx, ty, 80 + 60 * pull);
      halo.addColorStop(0, 'rgba(57,229,224,' + (0.35 * pull) + ')'); halo.addColorStop(1, 'rgba(57,229,224,0)');
      g.fillStyle = halo; g.fillRect(tx - 160, ty - 160, 320, 320);
      glow = Math.min(1, el / 1800); drawScene();
      if (alive || el < 400) raf = requestAnimationFrame(frame);
      else finish();
    };
    const finish = async () => {
      dead = true; cancelAnimationFrame(raf); cv.remove(); sfx.credit();
      for (let i = 10; i >= 0; i--) { glow = i / 10; drawScene(); await new Promise((r) => setTimeout(r, 45)); }
      done();
    };
    ghost.stop = () => { dead = true; cancelAnimationFrame(raf); cv.remove(); };
    raf = requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------ the desk comes alive
  function start() {
    live = true;
    spots.hidden = false; tray.hidden = false;
    drawSpots(); drawTray();
    ticker = setInterval(() => {
      const r = game.tickWake();
      shown = r.clock; clockEl.textContent = pclock.textContent = fmtClock(r.clock); drawScene();
      if (r.fired.length) { toast(r.fired); drawSpots(); if (kind === 'email' || kind === 'message') drawList(); }
      if (kind === 'calendar') { const nl = panel.querySelector('.now-line'); if (nl) nl.style.top = nowTop() + 'px'; }
      if (r.atTen && banner.hidden) { banner.hidden = false; banner.replaceChildren(h('b', {}, '10:00 AM'), h('span', {}, 'Your meeting is starting. Lock in your briefing when you\'re ready.')); }
    }, reduced ? 600 : CLOCK_MS);
    tour();
  }

  function drawSpots() {
    spots.replaceChildren(...Object.entries(OBJECTS).map(([k, o]) => {
      const [x, y, ww, hh] = o.rect;
      const badge = k === 'report' ? String(game.insights().length) : k === 'email' ? game.unreadR2('email') : k === 'message' ? game.unreadR2('message') : 0;
      return h('button', { class: 'spot' + (k === 'report' ? ' wake-spot' : ''), type: 'button', 'data-kind': k, style: { left: x / DW * 100 + '%', top: y / DH * 100 + '%', width: ww / DW * 100 + '%', height: hh / DH * 100 + '%' }, onclick: () => openPanel(k) },
        h('span', { class: 'tag' }, KINDS[k].toUpperCase(), badge ? h('i', {}, String(badge)) : null));
    }));
  }

  function toast(fired) {
    for (const f of fired) {
      const p = f.from ? person(f.from) : null;
      const line = f.kind === 'email' ? 'New email from ' + (p ? p.name : '') + '. ' + (f.links.length ? 'Wake read it: insight #' + f.links.join(', #') + '.' : 'Wake read it. Nothing new.')
        : (p ? p.name : 'New text') + ' texted you.' + (f.sharpen ? ' You can send it to Wake.' : '');
      const el = h('button', { class: 'toast' + (f.kind === 'email' ? ' cy' : ''), type: 'button', onclick: () => { el.remove(); openPanel(f.kind === 'email' ? 'email' : 'message'); if (f.kind === 'email') openDoc(f.source); else openThread(f.from); } }, f.from ? av(f.from, 30) : null, h('span', {}, line));
      toasts.appendChild(el); sfx.alert();
      setTimeout(() => el.remove(), 8000);
    }
  }

  function openPanel(k) {
    const pk = PANEL[k];
    kind = pk; docId = null; pop = null;
    sfx.blip();
    panel.hidden = false;
    const single = ['wake', 'brief', 'calendar', 'team'].includes(pk);
    const listEl = h('div', { class: 'list', role: 'list' });
    const reader = h('article', { class: 'reader' }, h('p', { class: 'empty' }, 'Pick something to open it.'));
    panel.className = 'panel kind-' + pk;
    panel.replaceChildren(
      h('div', { class: 'panel-head' },
        btn('◀ BACK TO DESK', closePanel, 'btn back-desk'),
        h('div', { class: 'ph-title' }, h('h2', {}, KINDS[k].toUpperCase()), h('span', { class: 'sys' }, SUBS[k])),
        pclock),
      h('div', { class: 'panel-body' + (single ? ' single' : '') }, listEl, reader));
    panel._list = listEl; panel._reader = reader; panel._body = panel.querySelector('.panel-body');
    if (pk === 'wake') renderInsights();
    else if (pk === 'brief') openDoc('x_brief');
    else if (pk === 'calendar') openDoc('cal');
    else if (pk === 'team') renderTeam();
    else { drawList(); if (pk === 'briefs' && window.innerWidth > 760) openDoc(w.sources.x_pl ? 'x_pl' : 'x_forecast'); }
    coach.emit('panel:' + pk); coach.context(pk);
  }
  function closePanel() { kind = null; docId = null; pop = null; panel.hidden = true; drawSpots(); drawTray(); sfx.back(); coach.emit('desk'); coach.context('desk'); }

  function drawList() {
    if (kind === 'briefs') {
      const groups = w.sources.x_list.groups || [['Briefs', ['x_forecast', 'x_pacing', 'x_brief']]];
      const item = (id) => { const s = w.sources[id]; if (!s) return null;
        return h('button', { class: 'item rep exec-item' + (id === docId ? ' on' : ''), type: 'button', onclick: () => openDoc(id) }, h('span', { class: 'wk-dot' }), h('span', { class: 'item-text' }, h('strong', {}, s.title), h('span', {}, s.sub))); };
      panel._list.replaceChildren(
        h('div', { class: 'brief-intro' },
          h('p', { class: 'bi-top' }, h('b', {}, 'WAKE'), h('span', {}, 'Prepared 7:48 AM')),
          h('p', {}, 'Your executive documents for the week: the statements, the quarter, ' + (M ? 'every ' + V.unit + ', ' : '') + 'your people and the plan.'),
          h('p', {}, 'Wake built them from the same systems as your insights, so the gathering and reconciling is already done. The time that used to go into pulling numbers now goes into reading them and deciding what the business does next.')),
        ...groups.map(([g, ids]) => h('div', { class: 'exec-group' }, h('p', { class: 'eg-h' }, g.toUpperCase()), ...ids.map(item))));
      return;
    }
    if (kind === 'message') return drawThreads();
    if (kind !== 'email') return;
    panel._list.replaceChildren(...game.listR2('email').map((s) => { const p = person(s.from);
      return h('button', { class: 'item mail' + (s.opened ? ' read' : ' unread') + (s.id === docId ? ' on' : ''), type: 'button', onclick: () => openDoc(s.id) },
        h('span', { class: 'dot' }),
        h('span', { class: 'item-text' }, h('span', { class: 'it-top' }, h('strong', {}, p.name), h('time', {}, s.when)), h('span', { class: 'subj' }, s.title),
          s.tags.length ? h('em', { class: 'wtag' }, 'IN INSIGHT #' + s.tags.join(', #')) : h('em', { class: 'wtag dim' }, 'READ · NO ACTION'))); }));
  }

  function threads() {
    const by = {};
    for (const s of game.listR2('message')) (by[s.from] = by[s.from] || []).push(s);
    return Object.entries(by).map(([from, list]) => ({ from, list: list.slice().sort((a, b) => a.arrivedAt - b.arrivedAt), unread: list.some((s) => !s.opened), last: list.reduce((m, s) => Math.max(m, s.arrivedAt), 0), sendable: list.some((s) => s.sendable) }))
      .sort((a, b) => b.last - a.last || (b.unread - a.unread));
  }
  function drawThreads() {
    panel._list.replaceChildren(...threads().map((t) => { const p = person(t.from), last = t.list[t.list.length - 1];
      return h('button', { class: 'item thread' + (t.unread ? ' unread' : ' read') + (docId === 'th:' + t.from ? ' on' : ''), type: 'button', onclick: () => openThread(t.from) },
        h('span', { class: 'dot' }), av(t.from, 38),
        h('span', { class: 'item-text' }, h('span', { class: 'it-top' }, h('strong', {}, p.name), h('time', {}, last.when)), h('span', { class: 'prev' }, last.body[last.body.length - 1]), t.sendable ? h('em', { class: 'wtag' }, 'CAN SEND TO WAKE') : null)); }));
  }

  function openDoc(id) {
    const v = game.openR2(id); if (!v) return;
    docId = id;
    const R = panel._reader;
    panel._body.classList.add('reading');
    const back = h('button', { class: 'link back mobile-only', type: 'button', onclick: () => { panel._body.classList.remove('reading'); drawList(); } }, '◀ BACK TO THE LIST');
    if (v.kind === 'email') {
      R.replaceChildren(back, h('div', { class: 'mailv' },
        v.tags.length ? h('p', { class: 'wake-note' }, h('b', {}, 'WAKE'), ' Already part of insight #' + v.tags.join(', #') + '. Nothing to copy or forward.') : h('p', { class: 'wake-note dim' }, h('b', {}, 'WAKE'), ' Read. Not connected to anything that needs action.'),
        h('h3', {}, v.title), v.flag ? h('p', { class: 'flag' }, v.flag) : null,
        h('div', { class: 'from' }, av(v.from.key, 44), h('div', {}, h('strong', {}, v.from.name + ' '), h('span', {}, v.from.title)), h('time', {}, v.when)),
        h('p', { class: 'hdrs' }, 'To: You' + (v.cc ? '   Cc: ' + v.cc : '')),
        h('div', { class: 'body' }, v.body.map((p) => h('p', {}, p)))));
    } else if (v.kind === 'calendar') { renderCalendar(v); }
    else if (v.kind === 'exec') { renderExec(v); R.prepend(back); }
    R.scrollTop = 0;
    drawList(); drawSpots();
    sfx.blip();
  }

  function openThread(from) {
    const t = threads().find((x) => x.from === from); if (!t) return;
    for (const s of t.list) game.openR2(s.id);
    docId = 'th:' + from;
    panel._body.classList.add('reading');
    renderThread(from);
    drawList(); drawSpots(); sfx.blip();
    coach.emit('thread');
  }
  function renderThread(from) {
    const R = panel._reader, p = person(from), t = threads().find((x) => x.from === from); if (!t) return;
    R.replaceChildren(
      h('button', { class: 'link back mobile-only', type: 'button', onclick: () => { panel._body.classList.remove('reading'); drawList(); } }, '◀ BACK TO MESSAGES'),
      h('div', { class: 'thread-view' },
        h('div', { class: 'from' }, av(from, 44), h('div', {}, h('strong', {}, p.name), h('span', {}, p.title))),
        t.list.map((s) => h('div', { class: 'msg-group', id: 'mg-' + s.id },
          h('time', {}, s.when || ''), s.body.map((line) => h('p', { class: 'bubble-in' }, line)),
          s.sent ? h('span', { class: 'sent-tag' }, '✓ SENT TO WAKE' + (w.sharpen[s.id].finding ? ' · INSIGHT #' + game.insight(w.sharpen[s.id].finding).rank : '')) :
            s.sendable ? btn('SEND TO WAKE ▶', () => send(s.id), 'btn send-btn') : null))));
  }
  async function send(id) {
    const from = document.getElementById('mg-' + id);
    const r = game.putThrough(id); if (!r) return;
    sfx.zoom();
    if (from && !reduced) {
      const a = from.getBoundingClientRect();
      const fly = h('div', { class: 'flyer' }, 'WAKE');
      Object.assign(fly.style, { left: a.left + 'px', top: a.top + 'px', width: Math.min(a.width, 280) + 'px' });
      document.body.appendChild(fly);
      requestAnimationFrame(() => Object.assign(fly.style, { transform: 'translate(' + (window.innerWidth / 2 - a.left - 100) + 'px, ' + (-a.top + 30) + 'px) scale(.5)', opacity: '0.1' }));
      await new Promise((res) => setTimeout(res, 650)); fly.remove();
    }
    sfx.credit();
    note(r.finding ? 'Wake added it to insight #' + r.rank + ': ' + r.line : 'Wake read it. ' + r.line, true);
    if (r.also) setTimeout(() => note('And to insight #' + r.also.rank + ': ' + r.also.line, true), 500);
    renderThread(docId.slice(3)); drawList(); drawSpots();
    coach.emit('sent');
  }

  // ------------------------------------------------------------ the computer: Wake's insights
  function renderInsights() {
    const R = panel._reader, list = game.insights(), B = game.briefing();
    const picked = list.filter((x) => x.picked).length;
    R.replaceChildren(
      h('div', { class: 'wk-head' },
        h('div', {}, h('p', { class: 'wk-k' }, 'WAKE · READ AT 7:48 AM'),
          h('p', { class: 'wk-sum' }, n(B.funnel.records) + ' records from ' + B.systems.length + ' systems. ' + B.funnel.material + ' signals connected into ' + list.length + ' insights, ranked.')),
        h('p', { class: 'wk-pick' + (picked >= game.MIN_PICKS ? ' ok' : '') }, h('b', {}, picked + ' / ' + game.MIN_PICKS + (picked > game.MIN_PICKS ? '+' : '')), ' picked · up to ' + game.MAX_PICKS)),
      h('ol', { class: 'ins-list' }, list.map(insightRow)),
      h('details', { class: 'cleared' }, h('summary', {}, 'CLEARED · ' + B.filtered.length + ' NO ACTION NEEDED'),
        h('ul', {}, B.filtered.map((f) => h('li', {}, h('strong', {}, f.label + ' ' + f.value), h('span', {}, f.because ? 'Explained by: ' + f.because : 'Within normal range.'))))));
  }
  function insightRow(it) {
    const isOpen = !!open[it.id];
    return h('li', { class: 'ins' + (it.picked ? ' picked' : '') + (it.routine ? ' routine' : '') + (it.urgent ? ' urgent' : ''), id: 'in-' + it.id },
      h('span', { class: 'ins-rank' }, String(it.rank)),
      h('div', { class: 'ins-main' },
        h('p', { class: 'ins-place' }, it.place.toUpperCase() + (it.urgent ? ' · TODAY' : '')),
        h('h3', {}, it.headline),
        h('div', { class: 'built' }, h('span', { class: 'b-l' }, 'BUILT FROM'),
          h('div', { class: 'src-row' }, it.keys.map((s) => srcChip(it, s)), it.sources.length > it.keys.length ? h('button', { class: 'src-more', type: 'button', onclick: () => toggle(it.id) }, '+' + (it.sources.length - it.keys.length) + ' more') : null)),
        it.sharpened.length ? h('ul', { class: 'sharp' }, it.sharpened.map((s) => h('li', {}, h('b', {}, '+ ' + s.from.toUpperCase()), ' ' + s.line))) : null,
        h('div', { class: 'do' }, h('span', { class: 'lbl' }, 'DO'), h('p', {}, it.action)),
        h('div', { class: 'ins-foot' },
          h('span', { class: 'owners' }, it.owners.map((o) => h('span', { class: 'owner' }, av(o.key, 24), h('span', {}, o.name, h('em', {}, ' · ' + shortTitle(o)))))),
          btn(isOpen ? 'LESS ▲' : 'WHY ▼', () => toggle(it.id), 'link more')),
        isOpen ? h('div', { class: 'ins-more' },
          h('p', { class: 'why' }, it.why),
          h('p', { class: 'mono-l' }, 'EVERY LINE BEHIND IT · ' + it.signals + ' FROM ' + it.systems + ' SYSTEMS'),
          h('div', { class: 'src-row all' }, it.sources.map((s) => srcChip(it, s))),
          h('p', { class: 'check' }, 'How you\'ll know it worked: ' + it.check)) : null),
      btn(it.picked ? '✓ ASSIGNED' : '+ ASSIGN', () => togglePick(it.id), 'btn pick' + (it.picked ? ' on' : '')));
  }
  const shortTitle = (o) => (o.loc && M ? w.locById[o.loc].name : String(o.title || '').split(',')[0]);
  function srcChip(it, s) {
    return h('button', { class: 'src-chip' + (s.flagged ? ' flagged-r1' : s.seen ? ' seen-r1' : ''), type: 'button', title: 'See where this came from', onclick: () => traceOf(it.id, s.key) },
      h('span', { class: 'sc-sys' }, s.system), h('span', { class: 'sc-l' }, s.label + (s.value ? ': ' + s.value : '')));
  }
  function toggle(id) { open[id] = !open[id]; renderInsights(); const el = document.getElementById('in-' + id); if (el) el.scrollIntoView({ block: 'nearest' }); sfx.blip(); }
  function togglePick(id) {
    const before = game.state.picked.length, had = game.state.picked.includes(id);
    game.pick(id);
    if (!had && game.state.picked.length === before) { note('You can hand off up to ' + game.MAX_PICKS + '. Unassign one to swap it.'); return; }
    sfx[had ? 'back' : 'coin']();
    renderInsights(); drawTray(); drawSpots();
    coach.emit('pick');
  }

  // Trace a line back to where it lived this morning.
  function traceOf(iid, key) {
    const it = game.insight(iid), t = game.trace(key);
    game.traced(key);
    pop = { type: 'trace', iid, key };
    sfx.blip();
    const ex = t.excerpt;
    let body;
    if (ex.kind === 'report') body = h('div', { class: 'docp mini' }, h('div', { class: 'docp-sys' }, h('span', {}, t.source.system.toUpperCase() + ' · ' + t.source.title.toUpperCase()), h('span', {}, t.source.run ? 'Run ' + t.source.run : '')),
      h('p', { class: 'docp-by' }, t.source.by ? 'Prepared by ' + t.source.by : ''), h('h4', { class: 'mini-h' }, ex.block),
      h('div', { class: 'dscroll' }, h('table', { class: 'dtable' }, h('thead', {}, h('tr', {}, ex.cols.map((c) => h('th', {}, c)))),
        h('tbody', {}, ex.rows.map((r) => h('tr', {}, r.map((c) => h('td', { class: c.hl ? 'tr-hl' : '' }, c.t))))))));
    else if (ex.kind === 'email' || ex.kind === 'message' || ex.kind === 'note') body = h('div', { class: 'quote-src ' + ex.kind }, h('p', { class: 'q-h' }, (ex.kind === 'email' ? 'EMAIL · ' : ex.kind === 'message' ? 'TEXT · ' : 'NOTE · ') + (t.source.by || '') + (t.source.when ? ' · ' + t.source.when : '')),
      ex.kind === 'email' ? h('strong', {}, ex.title) : null, (ex.list || ex.body).map((x) => h('p', {}, x)));
    else if (ex.kind === 'calendar') body = h('div', { class: 'quote-src calendar' }, h('p', { class: 'q-h' }, 'CALENDAR · ' + ex.when), h('strong', {}, ex.title), ex.lines.map((x) => h('p', {}, x)));
    else body = h('div', { class: 'quote-src' }, (ex.tiles || []).map((x) => h('p', {}, x.label + ': ' + x.value + (x.delta ? ' (' + x.delta + ')' : ''))));
    const r1 = t.r1.flagged ? 'You flagged this as finding #' + t.r1.flagged + ' in Round 1.' : t.r1.seen ? 'You had this open in Round 1, at ' + t.r1.at + ' in ' + t.r1.in + '.' : 'You never opened this in Round 1.';
    popup([
      h('p', { class: 'pp-kind' }, 'WHERE THIS CAME FROM'),
      h('h3', {}, t.label), h('p', { class: 'tr-val' }, [t.value, t.delta].filter(Boolean).join(' · ')),
      h('p', { class: 'tr-src' }, 'Source: ' + t.source.title + ' · ' + t.source.system),
      body,
      h('p', { class: 'tr-r1' + (t.r1.seen ? ' seen' : '') }, r1),
      h('div', { class: 'tr-sec' }, h('b', {}, 'HOW WAKE READ IT'), h('p', {}, t.reading)),
      h('div', { class: 'tr-sec' }, h('b', {}, 'WHAT IT CONNECTS TO'), h('div', { class: 'src-row' }, it.sources.filter((s) => s.key !== key).map((s) => srcChip(it, s)))),
      h('div', { class: 'tr-sec' }, h('b', {}, 'WHAT WAKE CONCLUDED'), h('p', {}, it.interpretation)),
      h('div', { class: 'tr-sec' }, h('b', {}, 'WHY THIS ACTION'), h('p', {}, it.whyFirst), h('p', { class: 'tr-do' }, 'Recommended: ' + it.action)),
    ]);
    coach.emit('trace');
  }
  function popup(kids, cls = '') {
    const old = panel.querySelector('.pop'); if (old) old.remove();
    const el = h('div', { class: 'pop calpop trace ' + cls, role: 'dialog' },
      h('button', { class: 'pop-x', type: 'button', 'aria-label': 'Close', onclick: () => { coach.emit('traceClosed'); el.remove(); pop = null; sfx.back(); } }, '✕ CLOSE'),
      h('div', { class: 'pop-body' }, ...[].concat(kids).flat().filter(Boolean)));
    const head = panel.querySelector('.panel-head');
    el.style.top = (head ? head.offsetHeight : 64) + 'px';
    panel.appendChild(el);
  }

  // ------------------------------------------------------------ executive documents
  function renderExec(v) {
    const R = panel._reader;
    if (v.memo) {
      R.replaceChildren(h('div', { class: 'docp memo' },
        h('div', { class: 'docp-sys' }, h('span', {}, 'DRAFT · PREPARED BY WAKE'), h('span', {}, v.when)),
        h('h3', {}, v.title),
        h('p', { class: 'docp-by' }, 'To: ' + v.to + ' · From: You · Review before sending'),
        h('blockquote', { class: 'memo-ask' }, h('b', {}, w.characters.boss.name + ' asked: '), '"' + v.ask + '"'),
        v.memo.map((p) => h('p', { class: 'memo-p' }, p)),
        h('p', { class: 'docp-foot' }, 'Every figure in this draft comes from this morning\'s data. Open any insight on your computer to see the lines behind it.')));
      return;
    }
    const isNum = (t) => /^[-+$(●▲≥≤]?\s?\$?\d/.test(String(t).trim());
    const d = v.doc || { company: w.shell.company, title: v.title, period: v.sub, systems: '' };
    const spark = (vals, tone) => { const lo = Math.min(...vals), hi = Math.max(...vals), sp = hi - lo || 1, W2 = 72, H2 = 20;
      const pts = vals.map((x, i) => (i / (vals.length - 1) * W2).toFixed(1) + ',' + (H2 - 2 - (x - lo) / sp * (H2 - 4)).toFixed(1)).join(' ');
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); el.setAttribute('viewBox', '0 0 ' + W2 + ' ' + H2); el.setAttribute('width', W2); el.setAttribute('height', H2); el.setAttribute('class', 'spark' + (tone ? ' ' + tone : '')); el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<polyline fill="none" stroke-width="1.6" points="' + pts + '"/><circle r="2.2" cx="' + pts.split(' ').pop().split(',')[0] + '" cy="' + pts.split(' ').pop().split(',')[1] + '"/>'; return el; };
    const table = (b) => h('section', { class: 'dblock' }, b.title ? h('h4', {}, b.title) : null, b.note ? h('p', { class: 'dnote' }, b.note) : null,
      h('div', { class: 'dscroll' }, h('table', { class: 'dtable fin' },
        h('thead', {}, h('tr', {}, b.cols.map((c, i) => h('th', { class: i && b.rows.some((r) => r.cells[i] && (isNum(r.cells[i].t) || r.cells[i].spark)) ? 'n' : '' }, c)))),
        h('tbody', {}, b.rows.map((r) => h('tr', { class: ['total', 'head', 'indent', 'grand'].filter((k) => r[k]).join(' ') },
          r.head ? h('td', { colspan: b.cols.length }, r.cells[0].t) : r.cells.map((c, i) => h('td', { class: [i && (isNum(c.t) || c.spark) ? 'n' : '', c.tone].filter(Boolean).join(' ') }, c.spark ? h('span', { class: 'sp' }, spark(c.spark, c.tone), c.t ? h('span', {}, c.t) : null) : c.t))))))));
    const kpis = (b) => h('div', { class: 'kpis-x' }, b.items.map((k) => h('div', { class: 'kx' + (k.tone ? ' ' + k.tone : '') }, h('span', { class: 'kx-l' }, k.label), h('strong', {}, k.value), k.sub ? h('span', { class: 'kx-s' }, k.sub) : null)));
    const text = (b) => h('section', { class: 'dblock dtext' }, b.title ? h('h4', {}, b.title) : null, (b.paras || []).map((p) => h('p', {}, p)), b.bullets ? h('ul', {}, b.bullets.map((x) => h('li', {}, x))) : null);
    R.replaceChildren(h('div', { class: 'docp fin-doc' },
      h('header', { class: 'fd-head' }, h('p', { class: 'fd-co' }, d.company), h('h3', {}, d.title), h('p', { class: 'fd-per' }, d.period)),
      h('p', { class: 'fd-meta' }, h('span', {}, 'Prepared by Wake · ' + v.when), d.systems ? h('span', {}, 'Source: ' + d.systems) : null),
      v.intro ? h('p', { class: 'docp-intro' }, v.intro) : null,
      v.blocks.map((b) => (b.type === 'kpis' ? kpis(b) : b.type === 'text' ? text(b) : table(b))),
      h('p', { class: 'fd-foot' }, h('span', {}, 'Confidential · for internal use'), h('span', {}, d.company))));
  }

  // ------------------------------------------------------------ calendar, annotated
  const toMin = (t) => { const [hh, mm] = t.split(':').map(Number); return ((hh < 7 ? hh + 12 : hh) * 60) + (mm || 0); };
  const HOUR = 46, START = 7 * 60;
  const nowTop = () => (shown - START) / 60 * HOUR;
  const label12 = (m) => { const hh = Math.floor(m / 60); return ((hh + 11) % 12 + 1) + ' ' + (hh < 12 ? 'AM' : 'PM'); };
  function renderCalendar(v) {
    const R = panel._reader;
    const evs = v.today.concat(v.wakeToday);
    const day = h('div', { class: 'cal-day' }, Array.from({ length: 11 }, (_, i) => h('div', { class: 'hr', style: { top: i * HOUR + 'px' } }, h('span', {}, label12(START + i * 60)))),
      evs.map((e) => { const s = toMin(e.start), en = toMin(e.end);
        return h('button', { class: 'cev k-' + e.kind + (e.detail ? '' : ' plain') + (e.wake ? ' wk' : ''), type: 'button', style: { top: (s - START) / 60 * HOUR + 'px', height: Math.max(22, (en - s) / 60 * HOUR - 3) + 'px' }, onclick: () => e.detail && calPop(e), disabled: !e.detail },
          h('strong', {}, (e.kind === 'wake' ? 'WAKE · ' : '') + e.title), h('span', {}, e.start + ' to ' + e.end + (e.place ? ' · ' + e.place : ''))); }),
      h('div', { class: 'now-line', style: { top: nowTop() + 'px' } }, h('span', {}, 'NOW')));
    const tabs = [['last', 'Last week', v.lastDates], ['this', 'This week', v.dates], ['next', 'Next week', v.nextDates]];
    const cur = tabs.find((t) => t[0] === calTab);
    const week = h('div', { class: 'cal-week' },
      h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([k, l]) => h('button', { class: 'tab' + (k === calTab ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': String(k === calTab), onclick: () => { calTab = k; sfx.blip(); renderCalendar(game.view('cal')); } }, l))),
      h('div', { class: 'wk-grid' }, cur[2].map((d, i) => h('div', { class: 'wk-day' + (calTab === 'this' && i === 0 ? ' today' : '') }, h('b', {}, d),
        v.weeks[calTab].filter((e) => e.day === i).map((e) => { const ref = e.ref ? v.today.find((t) => t.id === e.ref) : e;
          return h('button', { class: 'wk-ev' + (ref.detail ? '' : ' plain') + (ref.wake ? ' wk' : ''), type: 'button', disabled: !ref.detail, onclick: () => calPop(ref) }, h('span', {}, e.time), h('strong', {}, e.title)); })))));
    R.replaceChildren(h('div', { class: 'calv' },
      h('div', { class: 'cal-col' }, h('h3', {}, 'TODAY · ' + w.shell.mondayLong.toUpperCase()), h('p', { class: 'quiet' }, 'Teal marks what Wake connected. Click an event for details.'), day),
      h('div', { class: 'cal-col' }, h('h3', {}, 'THE WEEK'), week)));
  }
  function calPop(e) {
    if (!e || !e.detail) return;
    sfx.blip();
    const dt = e.detail;
    popup([
      h('p', { class: 'pp-kind' }, e.kind === 'wake' ? 'SUGGESTED BY WAKE' : e.kind === 'review' ? 'CHECK-IN' : 'EVENT'), h('h3', {}, e.title),
      h('p', { class: 'quiet' }, (e.start ? 'Today, ' + e.start + ' to ' + e.end : e.time) + (e.place ? ' · ' + e.place : '')),
      e.wake ? h('p', { class: 'wake-note' }, h('b', {}, 'WAKE'), ' ' + e.wake) : null,
      dt.people && dt.people.length ? h('ul', { class: 'pp-people' }, dt.people.map((p) => h('li', {}, av(p.key, 30), h('span', {}, h('strong', {}, p.name), h('em', {}, p.title))))) : null,
      dt.review ? h('table', { class: 'dtable mini' }, h('thead', {}, h('tr', {}, h('th', {}, 'Goal'), h('th', {}, 'Target'), h('th', { class: 'n' }, 'Now'))), h('tbody', {}, dt.review.map(([g, t, x]) => h('tr', {}, h('td', {}, g), h('td', {}, t), h('td', { class: 'n' }, x))))) : null,
      (dt.lines || []).map((l) => h('p', {}, l)),
    ], 'cal');
  }

  // ------------------------------------------------------------ team: who has what
  function renderTeam() {
    const R = panel._reader, asg = game.assignments();
    const card = (p, sub) => h('div', { class: 'tcard' + (asg[p.key] ? ' has' : '') }, av(p.key, 44), h('span', {}, h('strong', {}, p.name), h('em', {}, sub || p.title),
      asg[p.key] ? asg[p.key].map((a) => h('small', { class: 'asg' }, '#' + a.rank + ' ' + a.headline)) : h('small', {}, 'Nothing from you yet')));
    const team = game.view('team');
    R.replaceChildren(h('div', { class: 'teamv' },
      h('p', { class: 'quiet' }, 'Each insight comes matched to the person who owns that part of the business. This updates as you assign.'),
      h('h3', {}, 'CENTRAL TEAM'), h('div', { class: 'tgrid' }, team.central.map((p) => card(p))),
      h('h3', {}, M ? 'LOCATION MANAGERS' : 'ON SITE'), h('div', { class: 'tgrid' }, team.managers.map((p) => card(p, p.loc && M ? V.mgrTitle + ', ' + p.loc.name : p.title)))));
  }

  // ------------------------------------------------------------ your briefing
  function drawTray() {
    const k = game.state.picked.length, ok = game.r2Ready();
    tray.replaceChildren(
      h('button', { class: 'tray-open', type: 'button', onclick: briefCard },
        h('b', {}, 'YOUR BRIEFING'), h('span', { class: 'tcount' + (ok ? ' ok' : '') }, k + ' / ' + game.MIN_PICKS + (k > game.MIN_PICKS ? '+' : '')),
        h('span', { class: 'slots' }, Array.from({ length: game.MAX_PICKS }, (_, i) => h('i', { class: i < k ? 'on' : i < game.MIN_PICKS ? 'need' : '' }))), h('span', { class: 'open-lbl' }, k ? 'OPEN ▲' : '')),
      btn(ok ? 'LOCK IN MY BRIEFING ▶' : 'ASSIGN ' + (game.MIN_PICKS - k) + ' MORE', ok ? briefCard : () => openPanel('report'), 'btn' + (ok ? ' primary' : '')));
  }
  function briefCard() {
    const list = game.insights().filter((x) => x.picked);
    sfx.blip();
    card('findings-card', h('h2', {}, 'YOUR BRIEFING'),
      h('p', {}, list.length ? 'This is what you\'ll hand your team at 10:00, in Wake\'s priority order.' : 'Nothing assigned yet. Open your computer and pick ' + game.MIN_PICKS + ' to ' + game.MAX_PICKS + ' insights.'),
      h('ol', { class: 'finding-list' }, list.map((it) => h('li', { class: 'finding-row' }, h('span', { class: 'fnum cy' }, String(it.rank)),
        h('div', {}, h('span', { class: 'fr-src' }, it.place), h('strong', {}, it.headline), h('p', {}, it.action), h('span', { class: 'quiet' }, 'Owner: ' + it.owners.map((o) => o.name).join(' and '))),
        h('div', { class: 'row-tools' }, btn('REMOVE', () => { game.pick(it.id); briefCard(); drawTray(); if (kind === 'wake') renderInsights(); }, 'chip'))))),
      h('div', { class: 'row' }, game.r2Ready() ? btn('LOCK IN MY BRIEFING ▶', () => { closeCard(); lock(); }, 'btn primary') : h('span', { class: 'quiet' }, 'Assign at least ' + game.MIN_PICKS + ' to lock in.'), btn('Keep working', () => { closeCard(); sfx.back(); }, 'link')));
  }
  function lock() { if (!game.lockRound2()) return; sfx.start(); coach.stop(); onLock(); }

  function card(cls, ...kids) { overlay.hidden = false; overlay.replaceChildren(h('div', { class: 'dialog ' + cls, role: 'dialog' }, ...kids)); overlay.scrollTop = 0; }
  function closeCard() { overlay.hidden = true; overlay.replaceChildren(); }
  function note(text, cy) { const el = h('div', { class: 'toast note' + (cy ? ' cy' : '') }, h('span', {}, text)); toasts.appendChild(el); setTimeout(() => el.remove(), 6000); }
  function rulesCard() {
    card('rules-card', h('h2', {}, 'HOW THIS WORKS'),
      h('ul', { class: 'mini-rules' },
        h('li', {}, 'Your computer opens to Wake: every insight from this morning, ranked, with the data behind it.'),
        h('li', {}, 'Click any source on an insight to see exactly what it said and where it came from.'),
        h('li', {}, 'Assign ' + game.MIN_PICKS + ' to ' + game.MAX_PICKS + ' insights. Owners are already matched.'),
        h('li', {}, 'Texts aren\'t in any system. Send one to Wake from your phone and it lands where it belongs.'),
        h('li', {}, 'Exec briefs, the Thursday brief and your calendar are kept current from the same data.'),
        h('li', {}, 'Lock in your briefing before your ' + w.role.meetingName + ' at 10:00 AM.')),
      h('div', { class: 'row' }, btn('BACK TO MY DESK ▶', closeCard, 'btn primary')));
  }

  // ------------------------------------------------------------ the tour
  function tour() {
    // The guide, in chapters. The computer first; then, back at the desk, a short tour of the
    // rest of the suite that holds the desk until it's done; then each place explains itself.
    const boss = w.characters.boss.name.split(' ')[0];
    const tour = (text, target, next = 'NEXT ▶') => ({ text, target, next, modal: true, when: () => coach.seen('panel:wake') });
    coach.chapters({
      desk: [
        { text: 'Welcome back to your desk. Same Monday, same 7:48 AM, same data. The stack of reports and location files is gone. Wake read all of it before you sat down.', target: '.scene-wrap', next: 'NEXT ▶', once: true },
        { text: 'Everything you dug through in Round 1 now lives on your computer, in the same place the reports used to land. Open it.', target: '.spot[data-kind="report"]', wait: 'panel:wake', hint: 'Click the computer', skipIf: () => coach.seen('panel:wake') },
        tour('A quick tour of the rest of your desk. Texts still land on your phone, and they aren\'t in any system. Send one to Wake and it goes straight to the insight it belongs to.', '.spot[data-kind="message"]'),
        tour('This side of the desk used to hold raw data. Now it holds your executive briefs: the statements, forecasts and reports you\'d normally wait days for, current as of 7:48 AM.', '.spot[data-kind="location"]'),
        tour('Thursday\'s brief for ' + boss + ' is already drafted from this morning\'s numbers. You review it. You don\'t write it.', '.spot[data-kind="note"]'),
        tour('Your inbox is connected. Wake has read every email, and each one is tagged with the insight it feeds.', '.spot[data-kind="email"]'),
        tour('Your calendar carries Wake\'s suggested holds: the time today\'s decisions will need.', '.spot[data-kind="calendar"]'),
        tour('When you\'ve assigned ' + game.MIN_PICKS + ' to ' + game.MAX_PICKS + ', lock in your briefing. Your meeting is at 10:00 AM. The desk is yours.', '.wake-tray', 'LET\'S GO ▶'),
      ],
      wake: [
        { text: 'These are your insights, ranked. Each one starts with the data behind it: the same lines from this morning\'s reports, inbox and phone, already connected.', target: '.ins', next: 'NEXT ▶' },
        { text: 'Click any source to see exactly what it said and where it came from.', target: '.ins .src-chip', wait: 'trace', hint: 'Click a source', skipIf: () => coach.seen('trace') },
        { text: 'That\'s the original line, as it arrived this morning, and how Wake read it. Go as deep as you like, or don\'t. Close it when you\'re done.', target: '.pop .pop-body', inline: true, wait: 'traceClosed', hint: 'Close it when you\'re done', when: () => !!document.querySelector('.pop .pop-body') },
        { text: 'Your call now. Pick ' + game.MIN_PICKS + ' to ' + game.MAX_PICKS + ' to hand to your team. Each one already has an owner.', target: '.ins .pick', wait: 'pick', hint: 'Assign one', skipIf: () => coach.seen('pick') },
        { text: 'Head back to your desk for a quick tour.', target: '.panel .back-desk', wait: 'desk', hint: 'Click ◀ BACK TO DESK' },
      ],
      briefs: [
        { text: 'Every document here ties to the same numbers behind your insights, and none of them waited for month end. Read them the way an owner would: where is the business going, and what only you can move.', target: '.panel .brief-intro', next: 'GOT IT ▶', once: true },
      ],
      message: [
        { text: 'Texts that belong to an insight have a SEND TO WAKE button. Send one and watch where it lands.', target: '.panel .list', next: 'GOT IT ▶', once: true },
      ],
      email: [
        { text: 'Each email shows the insight it already feeds, or that it needs nothing from you. Nothing to forward.', target: '.panel .list', next: 'GOT IT ▶', once: true },
      ],
      calendar: [
        { text: 'The cyan holds are Wake\'s suggestions: the time today\'s decisions will take. Click any meeting to see what it means now.', target: '.panel .reader', next: 'GOT IT ▶', once: true },
      ],
    }, 'desk');
  }

  // go
  setTimeout(() => loadIn(start), reduced ? 0 : 250);
}
