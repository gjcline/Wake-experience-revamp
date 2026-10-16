// ROUND 1: ON YOUR OWN
// The desk, and everything on it. Reports and location scorecards hold the figures a player
// can flag as findings. Inbox, phone, calendar and notes hold context a player can attach to
// a finding. The team directory says who everyone is. Connected data links them together.
// Renders what the engine returns. No business logic lives here.

import { h, avatar } from './art.js';
import { citySVG } from './arcade/citymap.js';
import { drawDesk, OBJECTS, DW, DH } from './arcade/desk.js';
import { sfx } from './arcade/sound.js';
import { fmtClock } from '../engine/config.js';

const CLOCK_MS = 2000; // one minute of the morning every two seconds
const PRIMARY = ['report', 'location'];
const SECONDARY = ['email', 'message', 'calendar', 'note'];

export function round1({ game, show, coach, reduced, onSubmit, setCleanup }) {
  const w = game.world, D = w.day, M = w.shell.multi, V = w.shell.vocab;
  const btn = (label, onclick, cls = 'btn') => h('button', { class: cls, type: 'button', onclick }, label);
  const ME = { skin: '#D9A07A', hair: '#2A1C14', style: 'short', shirt: '#FFD23F' };
  const av = (key, size) => avatar(key === 'me' ? ME : (w.characters[key] || {}).av, size);
  const first = (name) => String(name).split(' ')[0];
  const person = (k) => game.person(k);
  const KINDS = { report: 'Reports', location: M ? 'Locations' : 'Your ' + V.unit, email: 'Inbox', message: 'Phone', calendar: 'Calendar', note: 'Notes', team: 'Team' };
  const SUBS = { report: 'This morning\'s reports. Click any figure to flag it.', location: M ? 'Every ' + V.unit + ', this week' : 'This week\'s scorecard', email: 'Your inbox', message: 'Texts to your phone', calendar: w.shell.mondayLong, note: 'On your desk', team: 'Who does what' };

  game.startRound1();
  let kind = null, docId = null, docStart = 0, shown = game.state.clock;
  let history = [], hl = [], pop = null, calTab = 'this';

  const clockEl = h('b', { class: 'clock' }, fmtClock(shown));
  const pclock = h('b', { class: 'pclock' }, fmtClock(shown));
  const deskCanvas = h('canvas', { class: 'desk-art', role: 'img', 'aria-label': 'Your desk on Monday morning' });
  const spots = h('div', { class: 'spots' });
  const panel = h('section', { class: 'panel', hidden: true, 'aria-label': 'Desk item' });
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
      h('div', { class: 'prompt' }, h('h1', {}, 'FIND WHAT MATTERS.'), h('p', {}, 'Flag at least 3 figures that matter and decide what should happen with each. Your ' + w.role.meetingName + ' is at 10:00 AM.')),
      h('div', { class: 'scene' }, h('div', { class: 'scene-wrap' }, deskCanvas), spots)),
    panel, tray, overlay, toasts);

  const drawScene = () => drawDesk(deskCanvas, Math.min(1, (shown - D.start) / (D.meetingAt - D.start)), w.shell.size);
  const steam = setInterval(drawScene, 600);
  const ticker = setInterval(() => {
    const r = game.tickClock();
    shown = r.clock; clockEl.textContent = pclock.textContent = fmtClock(r.clock);
    if (r.fired.length) { toast(r.fired); drawSpots(); if (kind && !pop) drawList(); }
    if (kind === 'calendar') { const now = panel.querySelector('.now-line'); if (now) now.style.top = nowTop() + 'px'; }
    if (r.atTen && banner.hidden) {
      banner.hidden = false;
      banner.replaceChildren(h('b', {}, '10:00 AM'), h('span', {}, game.state.flags.length >= game.MIN_FLAGS ? 'Your meeting is starting. Lock in your briefing when you\'re ready.' : 'Your meeting is starting. Flag at least ' + game.MIN_FLAGS + ' figures, then lock in your briefing.'));
      sfx.credit();
    }
  }, reduced ? 600 : CLOCK_MS);
  setCleanup(() => { clearInterval(steam); clearInterval(ticker); coach.stop(); });
  sfx.ambience(1);

  // ------------------------------------------------------------ the desk
  function drawSpots() {
    spots.replaceChildren(...Object.entries(OBJECTS).map(([k, o]) => {
      const [x, y, ww, hh] = o.rect, n = game.unread(k);
      return h('button', { class: 'spot', type: 'button', 'data-kind': k, style: { left: x / DW * 100 + '%', top: y / DH * 100 + '%', width: ww / DW * 100 + '%', height: hh / DH * 100 + '%' }, onclick: () => openPanel(k) },
        h('span', { class: 'tag' }, KINDS[k].toUpperCase(), n ? h('i', {}, String(n)) : null));
    }));
  }

  function toast(fired) {
    for (const f of fired) {
      const src = w.sources[f.source];
      const el = h('button', { class: 'toast', type: 'button', onclick: () => { el.remove(); go(f.source); } }, src.from ? av(src.from, 30) : null, h('span', {}, f.toast));
      toasts.appendChild(el); sfx.credit();
      setTimeout(() => el.remove(), 8000);
    }
  }

  // ------------------------------------------------------------ panel
  function closeDoc() { if (docId) { game.dwell(docId, Date.now() - docStart); } }

  function openPanel(k, keepHistory) {
    closeDoc();
    kind = k; docId = null; pop = null; if (!keepHistory) { history = []; hl = []; }
    sfx.blip();
    panel.hidden = false;
    const single = ['calendar', 'team', 'location', 'note'].includes(k);
    const listEl = h('div', { class: 'list', role: 'list' });
    const reader = h('article', { class: 'reader' }, h('p', { class: 'empty' }, 'Pick something to open it.'));
    panel.className = 'panel kind-' + k;
    panel.replaceChildren(
      h('div', { class: 'panel-head' },
        btn('◀ BACK TO DESK', closePanel, 'btn back-desk'),
        h('div', { class: 'ph-title' }, h('h2', {}, KINDS[k].toUpperCase()), h('span', { class: 'sys' }, SUBS[k])),
        pclock),
      h('div', { class: 'panel-body' + (single ? ' single' : '') }, listEl, reader));
    panel._list = listEl; panel._reader = reader; panel._body = panel.querySelector('.panel-body');
    drawList();
    coach.emit('panel:' + k); coach.context(k);
    if (single) { if (k === 'location') renderLocation(); else openDoc(w.order[k][0]); }
  }

  function drawList() {
    if (!kind || ['calendar', 'team', 'location', 'note'].includes(kind)) return;
    if (kind === 'message') return drawThreads();
    const items = game.listSources(kind);
    panel._list.replaceChildren(...items.map((s) => {
      const on = s.id === docId;
      if (kind === 'email') {
        const p = person(s.from);
        return h('button', { class: 'item mail' + (s.opened ? ' read' : ' unread') + (on ? ' on' : ''), type: 'button', role: 'listitem', onclick: () => openDoc(s.id) },
          h('span', { class: 'dot', 'aria-label': s.opened ? '' : 'Unread' }),
          h('span', { class: 'item-text' }, h('span', { class: 'it-top' }, h('strong', {}, p.name), h('time', {}, s.when)), h('span', { class: 'subj' }, s.title), s.flag ? h('em', {}, s.flag) : null, h('span', { class: 'prev' }, (s.body || [''])[0])));
      }
      const by = s.from ? person(s.from) : null;
      return h('button', { class: 'item rep' + (s.opened ? ' read' : ' unread') + (on ? ' on' : ''), type: 'button', role: 'listitem', onclick: () => openDoc(s.id) },
        h('span', { class: 'dot' }), h('span', { class: 'item-text' }, h('strong', {}, s.title), h('span', {}, s.sub), h('span', { class: 'by' }, (w.system[s.id] || '') + (by ? ' · ' + by.name : ''))));
    }));
  }

  // Texts are grouped into one thread per person, newest first.
  function threads() {
    const by = {};
    for (const s of game.listSources('message')) (by[s.from] = by[s.from] || []).push(s);
    return Object.entries(by).map(([from, list]) => ({ from, list: list.slice().sort((a, b) => (a.arrivedAt || 0) - (b.arrivedAt || 0)), unread: list.some((s) => !s.opened), last: list.reduce((m, s) => Math.max(m, s.arrivedAt || 0), 0) }))
      .sort((a, b) => b.last - a.last || (b.unread - a.unread));
  }
  function drawThreads() {
    panel._list.replaceChildren(...threads().map((t) => {
      const p = person(t.from), lastMsg = t.list[t.list.length - 1];
      return h('button', { class: 'item thread' + (t.unread ? ' unread' : ' read') + (docId === 'th:' + t.from ? ' on' : ''), type: 'button', role: 'listitem', onclick: () => openThread(t.from) },
        h('span', { class: 'dot', 'aria-label': t.unread ? 'New message' : '' }), av(t.from, 38),
        h('span', { class: 'item-text' }, h('span', { class: 'it-top' }, h('strong', {}, p.name), h('time', {}, lastMsg.when)), h('span', { class: 'prev' }, lastMsg.body[lastMsg.body.length - 1])));
    }));
  }

  function closePanel() {
    closeDoc(); kind = null; docId = null; pop = null; history = []; panel.hidden = true; drawSpots(); drawTray(); sfx.back();
    coach.emit('desk'); coach.context('desk');
  }

  // Go anywhere: used by toasts and by connected data.
  function go(id, from) {
    const src = w.sources[id]; if (!src) return;
    if (from) history.push(from);
    const k = src.kind;
    if (kind !== k) openPanel(k, true);
    if (k === 'message') return openThread(src.from, true);
    if (k === 'location') { if (id === 'loc_all') return openAll(); return openScore(src.loc); }
    openDoc(id, true);
  }
  const here = () => ({ id: kind === 'message' ? (threads().find((t) => 'th:' + t.from === docId) || { list: [{ id: docId }] }).list[0].id : kind === 'location' ? (pop && pop.type === 'score' ? 'loc_' + pop.loc : pop && pop.type === 'all' ? 'loc_all' : null) : docId, title: titleOfHere() });
  function titleOfHere() {
    if (kind === 'message') { const t = docId && docId.slice(3); return t ? person(t).name : 'Phone'; }
    if (kind === 'location') return pop && pop.type === 'score' ? w.locById[pop.loc].name + (M ? ' scorecard' : '') : 'All locations';
    return docId ? w.sources[docId].title : KINDS[kind];
  }
  function back() {
    const prev = history.pop(); if (!prev) return;
    hl = []; sfx.back();
    const src = w.sources[prev.id];
    if (kind !== src.kind) openPanel(src.kind, true);
    if (src.kind === 'message') openThread(src.from, true); else if (src.kind === 'location') { if (prev.id === 'loc_all') openAll(); else openScore(src.loc); } else openDoc(prev.id, true);
  }

  function openDoc(id, keep) {
    closeDoc();
    if (!keep) { history = []; hl = []; }
    const v = game.open(id); if (!v) return;
    coach.emit('doc:location');
    docId = id; docStart = Date.now();
    renderDoc(v);
    panel._body.classList.add('reading');
    drawList(); drawSpots();
    sfx.blip();
    coach.emit('doc:' + v.kind);
  }
  function openThread(from, keep) {
    closeDoc();
    if (!keep) { history = []; hl = []; }
    const t = threads().find((x) => x.from === from); if (!t) return;
    for (const s of t.list) game.open(s.id);
    docId = 'th:' + from; docStart = Date.now();
    renderThread(from);
    panel._body.classList.add('reading');
    drawList(); drawSpots(); sfx.blip();
  }
  function renderCurrent() {
    if (!kind) return;
    if (kind === 'message' && docId) return renderThread(docId.slice(3));
    if (kind === 'location') return renderLocation();
    if (docId) renderDoc(game.view(docId));
  }

  // ------------------------------------------------------------ shared pieces
  function crumbs() {
    if (!history.length) return null;
    const prev = history[history.length - 1];
    return h('div', { class: 'crumb' }, btn('◀ BACK TO ' + prev.title.toUpperCase(), back, 'btn small crumb-btn'), h('span', {}, 'You followed a connection. Highlighted lines are what links the two.'));
  }
  // Connected data: other sources that share a line with this one.
  function connected(related) {
    if (!related || !related.length) return null;
    const label = (r) => r.kind === 'report' ? 'Report' : r.kind === 'location' ? 'Scorecard' : r.kind === 'email' ? 'Email' : r.kind === 'message' ? 'Text' : r.kind === 'calendar' ? 'Calendar' : r.kind === 'note' ? 'Note' : '';
    return h('nav', { class: 'connected', 'aria-label': 'Connected data' },
      h('div', { class: 'cx-head' }, h('b', {}, 'CONNECTED DATA'), h('span', {}, 'The same numbers show up here too. Jump over, then come back.')),
      h('div', { class: 'cx-list' }, related.map((r) => h('button', { class: 'cx' + (r.opened ? ' seen' : ''), type: 'button', onclick: () => { coach.emit('connected'); const from = here(); hl = r.hl; go(r.id, from); } },
        h('span', { class: 'cx-kind' }, label(r)), h('strong', {}, r.title), h('span', { class: 'cx-via' }, 'via ' + r.via.slice(0, 2).join(' · ')), h('i', {}, r.opened ? '✓' : '▶')))));
  }
  function attachBtn(item, attachedTo) {
    const on = attachedTo && attachedTo.length;
    return btn(on ? '✓ ADDED TO FINDING #' + attachedTo.join(', #') : '+ ADD TO A FINDING', () => attachPicker(item), 'btn attach-btn' + (on ? ' on' : ''));
  }

  // ------------------------------------------------------------ reports
  const isNum = (t) => /^[-+$(]?\$?\d/.test(String(t).trim()) || /^\d/.test(String(t));
  function table(b, srcId) {
    const keep = b.cols.map((c, i) => c !== '' || b.rows.some((r) => r.cells[i] && r.cells[i].t));
    const num = b.cols.map((_, i) => { const vals = b.rows.map((r) => r.cells[i] && r.cells[i].t).filter(Boolean); return i > 0 && vals.length && vals.filter(isNum).length >= vals.length / 2; });
    return h('section', { class: 'dblock' },
      h('h4', {}, b.title), b.note ? h('p', { class: 'dnote' }, b.note) : null,
      h('div', { class: 'dscroll' }, h('table', { class: 'dtable' },
        h('thead', {}, h('tr', {}, b.cols.map((c, i) => keep[i] ? h('th', { class: num[i] ? 'n' : '' }, c) : null))),
        h('tbody', {}, b.rows.map((r) => h('tr', { class: r.total ? 'total' : '' }, r.cells.map((c, i) => {
          if (!keep[i]) return null;
          const cls = [num[i] ? 'n' : '', c.s ? 'fig' : '', c.flag ? 'is-flag' : '', c.s && hl.includes(c.s) ? 'hl' : '', c.tone].filter(Boolean).join(' ');
          if (!c.s) return h('td', { class: cls }, c.t);
          return h('td', { class: cls }, h('button', { type: 'button', class: 'figbtn', 'data-s': c.s, title: 'Flag this', onclick: () => figure(c.s, srcId) }, c.flag ? h('i', { class: 'fnum' }, String(c.flag)) : null, c.t || '·'));
        })))))));
  }
  function figure(sid, srcId) {
    const f = game.state.flags.find((x) => x.signals.includes(sid));
    if (f) return compose({ existing: f });
    compose({ signals: [sid], source: srcId });
  }

  function renderDoc(v) {
    const R = panel._reader;
    const kids = [h('button', { class: 'link back mobile-only', type: 'button', onclick: () => { panel._body.classList.remove('reading'); drawList(); } }, '◀ BACK TO THE LIST'), crumbs()];
    if (v.kind === 'report') {
      kids.push(connected(v.related), h('p', { class: 'doc-hint' }, h('b', {}, '▶'), ' Click any figure to flag it as a finding.'),
        h('div', { class: 'docp' },
          h('div', { class: 'docp-sys' }, h('span', {}, v.system.toUpperCase()), h('span', {}, 'Run ' + v.run)),
          h('h3', {}, v.title),
          h('p', { class: 'docp-by' }, 'Prepared by ' + v.from.name + ', ' + v.from.title),
          h('p', { class: 'docp-intro' }, v.intro),
          v.blocks.map((b) => table(b, v.id)),
          h('p', { class: 'docp-foot' }, w.shell.company + ' · Internal · Page 1 of 1')));
    } else if (v.kind === 'email') {
      kids.push(connected(v.related), h('div', { class: 'mailv' },
        h('h3', {}, v.title), v.flag ? h('p', { class: 'flag' }, v.flag) : null,
        h('div', { class: 'from' }, av(v.from.key, 44), h('div', {}, h('strong', {}, v.from.name + ' '), h('span', {}, v.from.title)), h('time', {}, v.when)),
        h('p', { class: 'hdrs' }, 'To: You' + (v.cc ? '   Cc: ' + v.cc : '')),
        h('div', { class: 'body' }, v.body.map((p) => h('p', {}, p))),
        h('p', { class: 'sig' }, v.from.name, h('br'), v.from.title + (w.characters[v.from.key].ext ? '' : ', ' + w.shell.company)),
        h('div', { class: 'attach-row' }, attachBtn({ key: v.id, source: v.id, label: 'Email: ' + v.title }, v.attachedTo), h('span', { class: 'quiet' }, 'Context for a finding you\'ve stored'))));
    } else if (v.kind === 'note' || v.kind === 'calendar' || v.kind === 'team') {
      if (v.kind === 'calendar') return renderCalendar(v);
      if (v.kind === 'team') return renderTeam(v);
      return renderNotes();
    }
    R.replaceChildren(...kids.filter(Boolean)); R.scrollTop = 0;
    if (hl.length) setTimeout(() => { const t = R.querySelector('.hl'); if (t) t.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); }, 60);
  }

  // ------------------------------------------------------------ phone
  function renderThread(from) {
    const R = panel._reader, p = person(from), t = threads().find((x) => x.from === from);
    if (!t) return;
    const rel = []; for (const s of t.list) for (const r of game.view(s.id).related) if (!rel.some((x) => x.id === r.id)) rel.push(r);
    R.replaceChildren(...[
      h('button', { class: 'link back mobile-only', type: 'button', onclick: () => { panel._body.classList.remove('reading'); drawList(); } }, '◀ BACK TO MESSAGES'),
      crumbs(), connected(rel.slice(0, 3)),
      h('div', { class: 'thread-view' },
        h('div', { class: 'from' }, av(from, 44), h('div', {}, h('strong', {}, p.name), h('span', {}, p.title))),
        t.list.map((s) => { const v = game.view(s.id); return h('div', { class: 'msg-group' },
          h('time', {}, s.when || ''), s.body.map((line) => h('p', { class: 'bubble-in' }, line)),
          attachBtn({ key: s.id, source: s.id, label: 'Text from ' + first(p.name) + ': "' + s.body[0].slice(0, 60) + (s.body[0].length > 60 ? '…' : '') + '"' }, v.attachedTo)); })),
    ].filter(Boolean));
    R.scrollTop = 0;
  }

  // ------------------------------------------------------------ notes
  function renderNotes() {
    const R = panel._reader;
    const boss = game.open('note_role'), mine = game.open('note_mine');
    docId = 'note_role';
    R.replaceChildren(h('div', { class: 'notes-view' },
      h('div', { class: 'sticky' }, h('p', { class: 'n-from' }, 'From ' + w.characters.boss.name + ', ' + w.characters.boss.title), boss.body.map((x) => h('p', {}, x)), attachBtn({ key: 'note_role', source: 'note_role', label: 'Note from ' + w.characters.boss.name }, boss.attachedTo)),
      h('div', { class: 'pad' }, h('p', { class: 'n-from' }, 'Your notes · last week\'s 1:1s'), h('ul', {}, mine.list.map((x) => h('li', {}, x))), attachBtn({ key: 'note_mine', source: 'note_mine', label: 'Your notes from last week' }, mine.attachedTo))));
  }

  // ------------------------------------------------------------ calendar
  const toMin = (t) => { const [hh, mm] = t.split(':').map(Number); return ((hh < 7 ? hh + 12 : hh) * 60) + (mm || 0); };
  const HOUR = 46, START = 7 * 60;
  const nowTop = () => (shown - START) / 60 * HOUR;
  const label12 = (m) => { const hh = Math.floor(m / 60); return ((hh + 11) % 12 + 1) + ' ' + (hh < 12 ? 'AM' : 'PM'); };
  function renderCalendar(v) {
    const R = panel._reader;
    const day = h('div', { class: 'cal-day' }, Array.from({ length: 11 }, (_, i) => h('div', { class: 'hr', style: { top: i * HOUR + 'px' } }, h('span', {}, label12(START + i * 60)))),
      v.today.map((e) => { const s = toMin(e.start), en = toMin(e.end);
        return h('button', { class: 'cev k-' + e.kind + (e.detail ? '' : ' plain'), type: 'button', style: { top: (s - START) / 60 * HOUR + 'px', height: Math.max(22, (en - s) / 60 * HOUR - 3) + 'px' }, onclick: () => e.detail && calPop(e), disabled: !e.detail },
          h('strong', {}, e.title), h('span', {}, e.start + ' to ' + e.end + (e.place ? ' · ' + e.place : '')), e.attachedTo.length ? h('i', {}, '#' + e.attachedTo.join(' #')) : null); }),
      h('div', { class: 'now-line', style: { top: nowTop() + 'px' } }, h('span', {}, 'NOW')));
    const tabs = [['last', 'Last week', v.lastDates], ['this', 'This week', v.dates], ['next', 'Next week', v.nextDates]];
    const cur = tabs.find((t) => t[0] === calTab);
    const week = h('div', { class: 'cal-week' },
      h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([k, l]) => h('button', { class: 'tab' + (k === calTab ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': String(k === calTab), onclick: () => { calTab = k; sfx.blip(); renderCalendar(game.view('cal')); } }, l))),
      h('div', { class: 'wk-grid' }, cur[2].map((d, i) => h('div', { class: 'wk-day' + (calTab === 'this' && i === 0 ? ' today' : '') }, h('b', {}, d),
        v.weeks[calTab].filter((e) => e.day === i).map((e) => h('button', { class: 'wk-ev' + (e.detail || e.ref ? '' : ' plain'), type: 'button', disabled: !(e.detail || e.ref), onclick: () => calPop(e.ref ? v.today.find((t) => t.id === e.ref) : e) },
          h('span', {}, e.time), h('strong', {}, e.title), e.attachedTo.length ? h('i', {}, '#' + e.attachedTo.join(' #')) : null))))));
    R.replaceChildren(h('div', { class: 'calv' },
      h('div', { class: 'cal-col' }, h('h3', {}, 'TODAY · ' + w.shell.mondayLong.toUpperCase()), h('p', { class: 'quiet' }, 'Click an event for details.'), day),
      h('div', { class: 'cal-col' }, h('h3', {}, 'THE WEEK'), week)));
    if (pop && pop.type === 'cal') { const e = v.today.concat(...Object.values(v.weeks)).find((x) => x.id === pop.id); if (e) calPop(e, true); }
  }
  function calPop(e, quiet) {
    if (!e || !e.detail) return;
    pop = { type: 'cal', id: e.id };
    if (!quiet) sfx.blip();
    const dt = e.detail;
    const when = e.start ? 'Today, ' + e.start + ' to ' + e.end : (calTab === 'last' ? 'Last week' : calTab === 'next' ? 'Next week' : 'This week') + ', ' + (calTab === 'this' ? w.sources.cal.dates : calTab === 'last' ? w.sources.cal.lastDates : w.sources.cal.nextDates)[e.day] + ' · ' + e.time;
    popup('calpop', [
      h('p', { class: 'pp-kind' }, e.kind === 'review' ? 'CHECK-IN' : 'EVENT'), h('h3', {}, e.title), h('p', { class: 'quiet' }, when + (e.place ? ' · ' + e.place : '')),
      dt.people && dt.people.length ? h('ul', { class: 'pp-people' }, dt.people.map((p) => h('li', {}, av(p.key, 30), h('span', {}, h('strong', {}, p.name), h('em', {}, p.title))))) : null,
      dt.review ? h('table', { class: 'dtable mini' }, h('thead', {}, h('tr', {}, h('th', {}, 'Goal'), h('th', {}, 'Target'), h('th', { class: 'n' }, 'Now'))), h('tbody', {}, dt.review.map(([g, t, n]) => h('tr', {}, h('td', {}, g), h('td', {}, t), h('td', { class: 'n' }, n))))) : null,
      (dt.lines || []).map((l) => h('p', {}, l)),
      e.kind === 'block' ? null : attachBtn({ key: 'cal:' + e.id, source: 'cal', label: 'Calendar: ' + e.title, signals: e.signals || [] }, e.attachedTo),
    ]);
  }

  // ------------------------------------------------------------ team
  function renderTeam(v) {
    const R = panel._reader;
    const card = (p, sub) => h('button', { class: 'tcard', type: 'button', onclick: () => profile(p.key) }, av(p.key, 48), h('span', {}, h('strong', {}, p.name), h('em', {}, sub || p.title), h('small', {}, (p.owns || []).slice(0, 2).join(' · '))));
    R.replaceChildren(h('div', { class: 'teamv' },
      h('div', { class: 'tme' }, av('me', 52), h('span', {}, h('strong', {}, 'You'), h('em', {}, w.role.label))),
      h('h3', {}, 'CENTRAL TEAM'), h('p', { class: 'quiet' }, 'They run the company-wide functions and the reports on your desk.'),
      h('div', { class: 'tgrid' }, v.central.map((p) => card(p))),
      h('h3', {}, M ? 'LOCATION MANAGERS' : 'ON SITE'), h('p', { class: 'quiet' }, M ? 'Each runs one ' + V.unit + ' and its schedule.' : 'Runs the ' + V.unit + ' and its schedule day to day.'),
      h('div', { class: 'tgrid' }, v.managers.map((p) => card(p, p.loc && M ? V.mgrTitle + ', ' + p.loc.name : p.title))),
      h('p', { class: 'quiet' }, 'Click anyone to see what they own.')));
  }
  function profile(key) {
    const p = person(key), loc = p.loc ? w.locById[p.loc] : null;
    sfx.blip();
    card('profile-card', h('div', { class: 'from' }, av(key, 56), h('div', {}, h('h2', {}, p.name), h('span', {}, p.title))),
      h('dl', { class: 'pdl' },
        p.since ? [h('dt', {}, 'WITH THE COMPANY'), h('dd', {}, 'Since ' + p.since)] : null,
        loc ? [h('dt', {}, M ? V.unit.toUpperCase() : 'SITE'), h('dd', {}, loc.name + ' · ' + loc.staff + ' people · opened ' + loc.opened)] : null,
        h('dt', {}, 'OWNS'), h('dd', {}, h('ul', {}, (p.owns || []).map((o) => h('li', {}, o)))),
        p.best ? [h('dt', {}, loc ? 'STYLE' : 'GO TO FOR'), h('dd', {}, p.best)] : null,
        h('dt', {}, 'REPORTS TO'), h('dd', {}, loc ? (w.role.id === 'regional' ? 'You' : person('opsdir').name + ', and you') : 'You')),
      h('div', { class: 'row' }, btn('CLOSE', () => { closeCard(); sfx.back(); }, 'btn primary')));
  }

  // ------------------------------------------------------------ locations
  function renderLocation() {
    const R = panel._reader;
    if (!M) { const id = w.order.location[0]; return openScore(w.sources[id].loc, true); }
    const map = h('div', { class: 'cmap' }, h('div', { class: 'cmap-art', html: mapSVG() }),
      w.pins.map((p) => { const L = w.locById[p.id]; const n = game.state.sources['loc_' + p.id].opened;
        return h('button', { class: 'pin' + (n ? ' seen' : ''), type: 'button', style: { left: p.x + '%', top: p.y + '%' }, onclick: () => openScore(p.id) },
          h('i', {}), h('span', {}, h('strong', {}, L.name), h('em', {}, first(person(L.manager).name) + (L.tag ? ' · ' + L.tag : '')))); }));
    R.replaceChildren(h('div', { class: 'locv' },
      h('div', { class: 'loc-bar' }, h('p', {}, h('b', {}, '▶'), ' Click a ' + V.unit + ' to open its weekly scorecard.'), btn('VIEW ALL SIDE BY SIDE ▶', openAll, 'btn small')),
      map));
    if (pop && pop.type === 'score') openScore(pop.loc, true);
    if (pop && pop.type === 'all') openAll(true);
  }
  const mapSVG = citySVG;
  function openScore(locId, quiet) {
    closeDoc();
    const id = 'loc_' + locId;
    const v = game.open(id); if (!v) return;
    docId = id; docStart = Date.now(); pop = { type: 'score', loc: locId };
    if (!quiet) sfx.blip();
    const L = w.locById[locId], p = person(L.manager);
    const tile = (t) => h('button', { class: 'kpi' + (t.flag ? ' is-flag' : '') + (hl.includes(t.key) ? ' hl' : ''), type: 'button', onclick: () => figure(t.key, id) },
      t.flag ? h('i', { class: 'fnum' }, String(t.flag)) : null, h('span', { class: 'k-l' }, t.label), h('strong', {}, (w.signals[t.key].cell || t.value)), h('span', { class: 'k-d' }, t.delta || ' '));
    const content = [
      crumbs(), connected(v.related),
      h('div', { class: 'docp score' },
        h('div', { class: 'docp-sys' }, h('span', {}, 'LOCATION SCORECARD'), h('span', {}, 'Week ending ' + w.shell.weekEnd)),
        h('h3', {}, M ? L.name : w.shell.company), h('p', { class: 'docp-by' }, L.street + ' · ' + v.sub),
        h('div', { class: 'sc-mgr' }, av(L.manager, 40), h('span', {}, h('strong', {}, p.name), h('em', {}, p.title))),
        h('p', { class: 'doc-hint dark' }, 'Click any figure to flag it.'),
        h('div', { class: 'kpis' }, v.tiles.map(tile)),
        h('div', { class: 'sc-note' }, h('b', {}, 'Manager\'s note for the week'), h('p', {}, '"' + v.note + '"'))),
    ];
    if (!M) { const R = panel._reader; R.replaceChildren(...content.filter(Boolean)); R.scrollTop = 0; return; }
    popup('scorepop', content);
  }
  function openAll(quiet) {
    closeDoc();
    const v = game.open('loc_all'); if (!v) return;
    docId = 'loc_all'; docStart = Date.now(); pop = { type: 'all' };
    if (!quiet) sfx.blip();
    const locs = w.locations;
    popup('scorepop wide', [crumbs(),
      h('div', { class: 'docp' },
        h('div', { class: 'docp-sys' }, h('span', {}, 'LOCATION SCORECARDS · ALL'), h('span', {}, 'Week ending ' + w.shell.weekEnd)),
        h('h3', {}, 'All ' + V.units + ' side by side'), h('p', { class: 'docp-intro' }, 'Same measures as each scorecard. Click any figure to flag it.'),
        h('div', { class: 'dscroll' }, h('table', { class: 'dtable' },
          h('thead', {}, h('tr', {}, h('th', {}, ''), locs.map((L) => h('th', { class: 'n' }, L.name)))),
          h('tbody', {}, v.rows.map((r) => h('tr', {}, h('td', {}, r.label), r.cells.map((c) => h('td', { class: 'n fig' + (c.flag ? ' is-flag' : '') + (hl.includes(c.key) ? ' hl' : '') },
            h('button', { type: 'button', class: 'figbtn', onclick: () => figure(c.key, 'loc_all') }, c.flag ? h('i', { class: 'fnum' }, String(c.flag)) : null, h('span', {}, w.signals[c.key].cell || c.value), h('small', {}, c.delta || ''))))))))))]);
  }
  function popup(cls, kids) {
    const old = panel.querySelector('.pop'); if (old) old.remove();
    const el = h('div', { class: 'pop ' + cls, role: 'dialog' },
      h('button', { class: 'pop-x', type: 'button', 'aria-label': 'Close', onclick: () => { el.remove(); pop = null; hl = []; sfx.back(); if (kind === 'location') { closeDoc(); docId = null; renderLocation(); } } }, '✕ CLOSE'),
      h('div', { class: 'pop-body' }, ...[].concat(kids).flat().filter(Boolean)));
    const head = panel.querySelector('.panel-head');
    el.style.top = (head ? head.offsetHeight : 64) + 'px';
    panel.appendChild(el);
    if (hl.length) setTimeout(() => { const t = el.querySelector('.hl'); if (t) t.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); }, 60);
  }

  // ------------------------------------------------------------ flagging: the composer
  // Four short reads, each with the action beneath it; then the player's own words, an owner,
  // and how sure they are. Each step has its own color so the card reads top to bottom.
  function compose({ signals, source, existing }) {
    if (!existing && game.state.flags.length >= game.MAX_FLAGS) { note('You can store up to ' + game.MAX_FLAGS + ' findings. Remove one in your findings to add another.'); return; }
    sfx.select();
    const sid = existing ? existing.signals[0] : signals[0];
    const s = w.signals[sid], src = w.sources[existing ? existing.source : source];
    const n = existing ? game.state.flags.indexOf(existing) + 1 : game.state.flags.length + 1;
    let choice = existing ? existing.choice : null, owner = existing ? existing.owner : null, sure = existing ? existing.confidence : null;
    const answers = game.answers(sid);
    const steps = h('ol', { class: 'cprog' });
    const progress = () => steps.replaceChildren(...[['YOUR READ', !!choice || ta.value.trim().length >= 3], ['YOUR WORDS', ta.value.trim().length >= 3], ['OWNER', !!owner], ['HOW SURE', !!sure]].map(([t, done], i) => h('li', { class: 'cp' + i + (done ? ' done' : '') }, h('i', {}, done ? '✓' : String(i + 1)), t)));
    const opts = h('div', { class: 'answers', role: 'radiogroup', 'aria-label': 'Your read' });
    const drawOpts = () => opts.replaceChildren(...answers.map((a) => h('button', { class: 'answer' + (choice === a.id ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(choice === a.id), onclick: () => { choice = choice === a.id ? null : a.id; drawOpts(); progress(); sfx.blip(); } },
      h('i', {}), h('span', { class: 'a-read' }, a.read), h('span', { class: 'a-act' }, a.act))));
    const ta = h('textarea', { id: 'wx-action', rows: '3', maxlength: '280', placeholder: 'What do you think is really going on? What would you do? Anything the options miss.', 'aria-label': 'In your own words' });
    if (existing) ta.value = existing.note || '';
    const count = h('span', { class: 'wcount' });
    const words = () => { const k = ta.value.trim().split(/\s+/).filter(Boolean).length; count.textContent = k ? k + (k === 1 ? ' word' : ' words') : ''; };
    ta.addEventListener('input', () => { words(); progress(); });
    const ownersEl = h('div', { class: 'owner-pick' });
    const drawOwners = () => {
      const list = game.owners();
      const grp = (g, title) => { const ps = list.filter((o) => o.group === g); return ps.length ? h('div', { class: 'og' }, h('span', { class: 'og-t' }, title), h('div', { class: 'og-list' }, ps.map((o) => h('button', { class: 'owner-chip' + (owner === o.key ? ' on' : ''), type: 'button', 'aria-pressed': String(owner === o.key), onclick: () => { owner = owner === o.key ? null : o.key; drawOwners(); progress(); sfx.blip(); } },
        o.key === 'me' ? av('me', 26) : av(o.key, 26), h('span', {}, h('strong', {}, o.key === 'me' ? 'You' : o.name), h('em', {}, o.group === 'manager' && M ? o.loc : o.title)))))) : null; };
      ownersEl.replaceChildren(grp('manager', M ? 'LOCATION MANAGERS' : 'ON SITE'), grp('central', 'CENTRAL TEAM'), grp('me', ''));
    };
    drawOwners();
    const sureEl = h('div', { class: 'sure' });
    const drawSure = () => sureEl.replaceChildren(...[['hunch', 'A hunch'], ['fair', 'Fairly sure'], ['certain', 'Certain']].map(([k, l]) => h('button', { class: 'sure-chip' + (sure === k ? ' on' : ''), type: 'button', 'aria-pressed': String(sure === k), onclick: () => { sure = sure === k ? null : k; drawSure(); progress(); sfx.blip(); } }, l)));
    drawSure();
    const save = btn(existing ? 'SAVE ▶' : 'ADD TO FINDINGS ▶', () => {
      if (!choice && ta.value.trim().length < 3) { opts.classList.add('shake'); setTimeout(() => opts.classList.remove('shake'), 400); note('Pick the read closest to yours, or write your own.'); return; }
      if (existing) game.editFlag(existing.id, { choice, note: ta.value, owner, confidence: sure }); else game.flag({ signals, source, choice, note: ta.value, owner, confidence: sure });
      closeCard(); sfx.coin(); drawTray(); renderCurrent();
      coach.emit('flagged'); coach.pop();
    }, 'btn primary');
    const step = (k, title, help, ...body) => h('section', { class: 'cstep2 s' + k }, h('div', { class: 'cs-head' }, h('b', {}, String(k)), h('div', {}, h('p', { class: 'label' }, title), help ? h('p', { class: 'help' }, help) : null)), ...body);
    card('composer',
      h('p', { class: 'stamp' }, existing ? 'EDIT FINDING #' + n : 'NEW FINDING #' + n),
      h('blockquote', { class: 'flagged' }, h('span', { class: 'fl-src' }, (src ? src.title : '') + (w.system[src && src.id] ? ' · ' + w.system[src.id] : '')), h('strong', {}, s.label), h('span', { class: 'fl-v' }, [s.value, s.delta].filter(Boolean).join(' · '))),
      steps,
      step(1, 'WHAT\'S YOUR READ?', 'Pick the one closest to what you think is going on. The action underneath is what your team would do.', opts),
      step(2, 'IN YOUR OWN WORDS', 'Optional, but it goes into the meeting with you. Explain your read, or write your own if none of the above fit.', ta, count),
      step(3, 'WHO OWNS IT?', 'Optional. Who on your team should take this on?', ownersEl),
      step(4, 'HOW SURE ARE YOU?', null, sureEl),
      h('div', { class: 'row' }, save, existing ? btn('Remove this finding', () => { game.removeFlag(existing.id); closeCard(); sfx.back(); drawTray(); renderCurrent(); }, 'link') : null, btn('Cancel', () => { closeCard(); sfx.back(); coach.emit('cancel'); coach.pop(); }, 'link')));
    drawOpts(); words(); progress();
    coach.emit('compose'); coach.push('compose');
  }

  // ------------------------------------------------------------ attaching context
  function attachPicker(item) {
    const fl = game.flags();
    sfx.select();
    if (!fl.length) {
      card('attach-card', h('h2', {}, 'ADD TO A FINDING'), h('p', {}, 'You haven\'t stored a finding yet. Flag a figure in a report or a location scorecard first, then attach this to it as supporting context.'), h('div', { class: 'row' }, btn('GOT IT', () => { closeCard(); sfx.back(); }, 'btn primary')));
      return;
    }
    const draw = () => card('attach-card', h('h2', {}, 'ADD TO A FINDING'),
      h('p', {}, 'Attach this as supporting context. It travels with the finding into your meeting.'),
      h('p', { class: 'att-item' }, item.label),
      h('ul', { class: 'att-list' }, game.flags().map((f) => { const on = f.attached.some((a) => a.key === item.key);
        return h('li', {}, h('button', { class: 'att-f' + (on ? ' on' : ''), type: 'button', onclick: () => { if (on) game.detach(f.id, item.key); else game.attach(f.id, item); sfx[on ? 'back' : 'coin'](); draw(); drawTray(); renderCurrent(); coach.emit('attached'); } },
          h('i', { class: 'fnum' }, String(f.n)), h('span', {}, h('strong', {}, f.what.label), h('em', {}, f.text)), h('b', {}, on ? '✓ ADDED' : '+ ADD'))); })),
      h('div', { class: 'row' }, btn('DONE', () => { closeCard(); sfx.back(); }, 'btn primary')));
    draw();
  }

  // ------------------------------------------------------------ findings
  function drawTray() {
    const fl = game.flags(), n = fl.length, ok = n >= game.MIN_FLAGS;
    tray.replaceChildren(
      h('button', { class: 'tray-open', type: 'button', onclick: findingsCard },
        h('b', {}, 'YOUR FINDINGS'), h('span', { class: 'tcount' + (ok ? ' ok' : '') }, n + ' / ' + game.MIN_FLAGS + (n > game.MIN_FLAGS ? '+' : '')),
        h('span', { class: 'slots' }, Array.from({ length: game.MAX_FLAGS }, (_, i) => h('i', { class: i < n ? 'on' : i < game.MIN_FLAGS ? 'need' : '' }))),
        h('span', { class: 'open-lbl' }, n ? 'OPEN ▲' : '')),
      btn(ok ? 'REVIEW & LOCK IN ▶' : 'FLAG ' + (game.MIN_FLAGS - n) + ' MORE', ok ? findingsCard : () => note('Open your reports or your locations. Click any figure that sticks out to flag it.'), 'btn' + (ok ? ' primary' : '')));
  }

  function findingsCard() {
    const fl = game.flags(), ok = fl.length >= game.MIN_FLAGS;
    sfx.blip();
    const rows = fl.map((f, i) => h('li', { class: 'finding-row' },
      h('span', { class: 'fnum' }, String(i + 1)),
      h('div', {},
        h('span', { class: 'fr-src' }, w.sources[f.source] ? w.sources[f.source].title : ''),
        h('strong', {}, f.what.label + (f.what.value ? ' (' + f.what.value + ')' : '')),
        h('p', {}, '"' + f.text + '"'),
        h('span', { class: 'quiet' }, f.owner ? 'Owner: ' + f.ownerName + (f.owner === 'me' ? '' : ', ' + f.ownerTitle) : 'No owner named'),
        f.attached.length ? h('ul', { class: 'fr-att' }, f.attached.map((a) => h('li', {}, h('span', {}, '+ ' + a.label), btn('✕', () => { game.detach(f.id, a.key); findingsCard(); renderCurrent(); }, 'chip x')))) : null),
      h('div', { class: 'row-tools' }, btn('▲', () => { game.moveFlag(f.id, -1); findingsCard(); drawTray(); }, 'chip'), btn('▼', () => { game.moveFlag(f.id, 1); findingsCard(); drawTray(); }, 'chip'), btn('EDIT', () => compose({ existing: game.state.flags.find((x) => x.id === f.id) }), 'chip'))));
    card('findings-card',
      h('h2', {}, 'YOUR FINDINGS'),
      h('p', {}, fl.length ? 'This is exactly what you\'ll hand your team at 10:00. Edit, reorder, or remove anything. Attach context from your inbox, phone, calendar or notes with the blue button.' : 'Nothing stored yet. Click a figure in a report or a location scorecard to flag it.'),
      h('ol', { class: 'finding-list' }, rows),
      h('div', { class: 'row' }, ok ? btn('LOCK IN MY BRIEFING ▶', () => { closeCard(); submit(); }, 'btn primary') : h('span', { class: 'quiet' }, 'Store at least ' + game.MIN_FLAGS + ' to lock in.'), btn('Keep working', () => { closeCard(); sfx.back(); coach.emit('closed'); }, 'link')));
    coach.emit('findings');
  }

  function submit() { if (!game.submitRound1()) return; sfx.start(); onSubmit(); }

  function card(cls, ...kids) { overlay.hidden = false; overlay.replaceChildren(h('div', { class: 'dialog ' + cls, role: 'dialog' }, ...kids)); overlay.scrollTop = 0; }
  function closeCard() { overlay.hidden = true; overlay.replaceChildren(); }
  function note(text) { const el = h('div', { class: 'toast note' }, h('span', {}, text)); toasts.appendChild(el); setTimeout(() => el.remove(), 5000); sfx.back(); }
  function rulesCard() {
    card('rules-card', h('h2', {}, 'HOW THIS WORKS'),
      h('ul', { class: 'mini-rules' },
        h('li', {}, 'Your desk has everything your team sent: reports, your ' + (M ? V.units : V.unit) + ', inbox, phone, calendar, notes, and who\'s who on your team.'),
        h('li', {}, 'Click any figure in a report or a location scorecard to flag it. Pick your read on it, or write your own, and name an owner if you like.'),
        h('li', {}, 'Emails, texts, calendar entries and notes are context. Attach them to a finding with the blue + ADD TO A FINDING button.'),
        h('li', {}, 'Connected data jumps you to other places the same numbers show up, and back.'),
        h('li', {}, 'Store ' + game.MIN_FLAGS + ' to ' + game.MAX_FLAGS + ' findings. Your ' + w.role.meetingName + ' starts at 10:00 AM. Lock in your briefing before then.')),
      h('div', { class: 'row' }, btn('BACK TO MY DESK ▶', closeCard, 'btn primary')));
  }

  drawScene(); drawSpots(); drawTray();
  // The guide, in chapters. Each plays where it belongs; leave and it waits for you.
  const flagged = () => game.state.flags.length >= 1;
  setTimeout(() => coach.chapters({
    desk: [
      { text: 'This is your desk. Everything your team sent this morning is here: reports, your ' + (M ? V.units : V.unit) + ', inbox, phone, calendar, notes, and your team. Open anything. The guide follows you.', target: '.scene-wrap', next: 'NEXT ▶', once: true },
      { text: 'A good place to start is the computer. It has this morning\'s reports.', target: '.spot[data-kind="report"]', wait: 'panel:report', hint: 'Click the computer', skipIf: () => coach.seen('panel:report') },
      { text: 'Your findings are stored down here. Open them any time to review, edit or reorder.', target: '.tray-open', wait: 'findings', hint: 'Open your findings', when: flagged },
      { text: 'This list is exactly what you\'ll hand your team. EDIT changes your answer or owner. The arrows set the order you\'d tackle them in.', target: '.findings-card', next: 'GOT IT ▶', wait: 'closed', inline: true, onNext: closeCard, when: () => !!document.querySelector('.findings-card') },
      { text: 'Your ' + w.role.meetingName + ' starts at 10:00 AM. Have at least ' + game.MIN_FLAGS + ' findings ready by then. The rest is up to you.', target: '.bar .clock', next: 'LET\'S GO ▶', when: flagged },
    ],
    report: [
      { text: 'Open any report.', target: '.panel .list', wait: 'doc:report', hint: 'Pick a report', skipIf: () => coach.seen('doc:report') },
      { text: 'Connected data shows other places these numbers show up. Click one to jump there, then use the back button at the top to return.', target: '.panel .connected', next: 'NEXT ▶', skipIf: () => !document.querySelector('.panel .connected'), once: true },
      { text: 'Reports are a page of figures. Every figure is a data point. When one looks off, click it to flag it.', target: '.panel .docp', wait: 'flagged', hint: 'Click a figure', side: 'over', skipIf: flagged },
      { text: 'That\'s your first finding. Keep going here, or head back to your desk to see it stored.', target: '.panel .back-desk', next: 'GOT IT ▶', when: flagged, once: true },
    ],
    location: [
      { text: 'Every ' + V.unit + ' has a weekly scorecard. Click one to open it.', target: '.cmap', wait: 'doc:location', hint: 'Click a ' + V.unit, skipIf: () => !M || coach.seen('doc:location') },
      { text: 'Any figure on a scorecard can be flagged, the same as a report.', target: '.kpis', next: 'GOT IT ▶', once: true, skipIf: () => !document.querySelector('.kpis') },
    ],
    compose: [
      { text: 'Pick the read closest to yours. Then, if you can, say it in your own words: it goes into the meeting with you. An owner and how sure you are help too. Then add it.', target: '.composer', inline: true, wait: 'flagged' },
    ],
    secondary: [
      { text: 'Emails, texts, your calendar and your notes don\'t become findings on their own. When one adds context to a finding you\'ve stored, attach it with the blue button. It travels with that finding into the meeting.', target: '.panel .attach-btn', next: 'GOT IT ▶', once: true },
    ],
    _alias: { email: 'secondary', message: 'secondary', calendar: 'secondary', note: 'secondary' },
  }, 'desk'), reduced ? 0 : 500);
}
