// ROUND 1: ON YOUR OWN
// Your computer on Monday morning, and the apps your team actually uses. QuickBooks holds the
// finance reports; Drive holds the exports from every other system, the location scorecards and
// your notes. Any figure in a report or a scorecard can be flagged as a finding. Gmail, Messages,
// Calendar and your notes hold context a player can attach to a finding. Contacts says who
// everyone is. Connected data links them together.
// Renders what the engine returns. No business logic lives here.

import { h } from './art.js';
import { sfx } from './arcade/sound.js';
import { fmtClock } from '../engine/config.js';
import { createComputer, gameStrip, face, addressOf, glyph, icon } from './os/shell.js';
import { createDesk } from './desk.js';
import { gmail, gmailRow, gmailMessage, mailDate, qbo, qboReportList, qboReport, dataTable, drive, sheets, docs, gcal, gcalPopover, monthTitle, messages, imThread, contacts, contactRow } from './os/apps.js';

const CLOCK_MS = 2000; // one minute of the morning every two seconds
// Finance reports live in QuickBooks. Every other system exports to a shared Drive folder.
const QBO_IDS = ['rep_fin', 'rep_ap', 'rep_labor'];
const QBO_NAV = { rep_fin: 'Reports', rep_ap: 'Expenses', rep_labor: 'Payroll' };

export function round1({ game, show, coach, reduced, onSubmit, setCleanup }) {
  const w = game.world, D = w.day, M = w.shell.multi, V = w.shell.vocab;
  const btn = (label, onclick, cls = 'ob') => h('button', { class: cls, type: 'button', onclick }, label);
  const first = (name) => String(name).split(' ')[0];
  const person = (k) => game.person(k);
  const USER = { name: w.role.label, email: 'you@' + w.shell.company.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '') + '.com' };
  const mail = (k) => (k === 'me' ? USER.email : addressOf(w.characters[k] || person(k), w.shell.company));
  const fc = (k, size) => (k === 'me' ? face(USER.name, size, '#5F6368') : face(person(k).name, size));
  const reportIds = w.order.report || [];
  const qboIds = reportIds.filter((id) => QBO_IDS.includes(id));
  const driveIds = reportIds.filter((id) => !QBO_IDS.includes(id));
  const locIds = w.order.location || [];
  const SCORE_FILE = 'scorecards';

  game.startRound1();
  // where the player is: one app at a time, and what is open inside it
  let app = null, docId = null, docStart = 0, shown = game.state.clock;
  let history = [], hl = [], calTab = 'this', calPopId = null, sheetTab = null, driveFile = null, qboDoc = null, mailId = null, thread = null, profileKey = null;

  const APPS = [
    { id: 'gmail', name: 'Gmail', icon: 'gmail', title: 'Gmail', url: 'mail.google.com/mail/u/0/#inbox' },
    { id: 'qbo', name: 'QuickBooks', icon: 'qbo', title: 'Reports | QuickBooks', url: 'qbo.intuit.com/app/reportlist' },
    { id: 'drive', name: 'Google Drive', icon: 'drive', title: 'Shared with me - Google Drive', url: 'drive.google.com/drive/shared-with-me' },
    { id: 'calendar', name: 'Google Calendar', icon: 'calendar', title: 'Google Calendar - Week', url: 'calendar.google.com/calendar/u/0/r/week' },
    { id: 'contacts', name: 'Contacts', icon: 'contacts', title: 'Directory - Google Contacts', url: 'contacts.google.com/directory' },
  ];
  const pc = createComputer({ apps: APPS, user: USER, company: w.shell.company, onOpen: (id) => openApp(id), onHome: () => { closeDoc(); app = null; docId = null; history = []; badges(); sfx.back(); coach.emit('desk'); coach.context('desk'); } });
  const overlay = h('div', { class: 'overlay os-ov', hidden: true });
  const strip = gameStrip({ round: 'Step 2 of 6 · On your own', task: 'Find what matters. Flag ' + game.MIN_FLAGS + ' to ' + game.MAX_FLAGS + ' figures and decide what happens with each. Your ' + w.role.meetingName + ' is at 10:00 AM.', onRules: rulesCard });

  // the computer sits on your desk; texts come to the phone next to it
  const desk = createDesk({ tidy: false, computer: pc.el, onPhone: (up) => {
    if (up) { renderMessages(); sfx.blip(); coach.emit('phone'); coach.context('messages'); }
    else { closeDoc(); docId = null; thread = null; sfx.back(); coach.context(app || 'desk'); }
  } });
  show('day', 'os-screen round1 at-desk', strip.el, desk.el, overlay);
  const clockLabel = () => w.shell.monday.replace(',', '') + '  ' + fmtClock(shown);
  pc.setClock(clockLabel());

  const ticker = setInterval(() => {
    const r = game.tickClock();
    shown = r.clock; pc.setClock(clockLabel());
    desk.phone.setTime(fmtClock(shown));
    if (r.fired.length) { arrivals(r.fired); badges(); if (app === 'gmail' && !mailId) renderGmail(); if (desk.phone.isOpen) renderMessages(); }
    if (app === 'calendar') { const now = document.querySelector('.gc-now'); if (now) now.style.top = ((shown - 7 * 60) / 60 * 48) + 'px'; }
    if (r.atTen && strip.alert.hidden) {
      strip.alert.hidden = false;
      strip.alert.replaceChildren(h('b', {}, '10:00 AM'), h('span', {}, game.state.flags.length >= game.MIN_FLAGS ? ' Your meeting is starting. Lock in your briefing when you\'re ready.' : ' Your meeting is starting. Flag at least ' + game.MIN_FLAGS + ' figures, then lock in your briefing.'));
      sfx.credit();
    }
  }, reduced ? 600 : CLOCK_MS);
  setCleanup(() => { clearInterval(ticker); coach.stop(); desk.destroy(); });
  sfx.ambience(1);

  // ------------------------------------------------------------ the dock
  function badges() {
    const unreadOf = (ids) => ids.filter((id) => game.state.sources[id] && !game.state.sources[id].opened).length;
    pc.badge('gmail', game.unread('email'));
    desk.phone.setBadge(game.unread('message'));
    pc.badge('qbo', unreadOf(qboIds));
    pc.badge('drive', unreadOf(driveIds) + (locIds.some((id) => !game.state.sources[id].opened) ? 1 : 0) + unreadOf(['note_role', 'note_mine']));
  }
  function arrivals(fired) {
    for (const f of fired) {
      const src = w.sources[f.source];
      const p = src.from ? person(src.from) : null;
      sfx.alert();
      if (src.kind === 'message') desk.phone.buzz({ title: p ? p.name : 'New message', text: src.body[0] });
      else pc.notify({ app: 'gmail', title: p ? p.name : '', text: src.title, onclick: () => go(f.source) });
    }
  }

  // ------------------------------------------------------------ opening things
  function closeDoc() { if (docId) game.dwell(docId, Date.now() - docStart); }
  function startDoc(id) { closeDoc(); docId = id; docStart = Date.now(); }
  function openApp(id) {
    if (app !== id) { closeDoc(); docId = null; history = []; }
    app = id; sfx.blip();
    render();
    badges();
    coach.emit('app:' + id); coach.context(id);
  }
  function render() {
    if (app === 'gmail') renderGmail();
    else if (app === 'qbo') renderQbo();
    else if (app === 'drive') renderDrive();
    else if (app === 'calendar') renderCalendar();
    else if (app === 'contacts') renderContacts();
  }
  const fill = (...kids) => { pc.body.replaceChildren(...kids.flat().filter(Boolean)); };

  // Go anywhere: used by notifications and by connected data.
  function go(id, from) {
    const src = w.sources[id]; if (!src) return;
    if (from) history.push(from);
    const k = src.kind;
    if (k === 'email') { mailId = id; return show2('gmail', () => openMail(id)); }
    if (k === 'message') { thread = src.from; if (desk.phone.isOpen) renderMessages(); else desk.phone.open(); return; }
    if (desk.phone.isOpen) desk.phone.close();
    if (k === 'report') { if (QBO_IDS.includes(id)) { qboDoc = id; return show2('qbo', () => openQbo(id)); } driveFile = id; return show2('drive', () => openFile(id)); }
    if (k === 'location') { driveFile = SCORE_FILE; sheetTab = id; return show2('drive', () => openScorecards(id)); }
    if (k === 'note') { driveFile = id; return show2('drive', () => openFile(id)); }
    if (k === 'calendar') return show2('calendar');
  }
  function show2(id, then) {
    const keep = history.slice();
    if (pc.active !== id) pc.open(id);
    history = keep;
    if (then) then(); else render();
  }
  const here = () => {
    if (desk.phone.isOpen) { const t = threads().find((x) => x.from === thread); return { id: t ? t.list[0].id : null, title: thread ? person(thread).name : 'Messages' }; }
    if (app === 'drive' && driveFile === SCORE_FILE) return { id: sheetTab, title: sheetTab === 'loc_all' ? 'All locations' : w.sources[sheetTab].title + (M ? ' scorecard' : '') };
    return { id: docId, title: docId && w.sources[docId] ? w.sources[docId].title : 'where you were' };
  };
  function back() {
    const prev = history.pop(); if (!prev || !prev.id) return;
    hl = []; sfx.back();
    const keep = history.slice();
    go(prev.id); history = keep;
  }
  function crumbs() {
    if (!history.length) return null;
    const prev = history[history.length - 1];
    return h('div', { class: 'cx-crumb' }, btn(h('span', {}, glyph('back'), 'Back to ' + prev.title), back, 'ob tonal small'), h('span', {}, 'You followed a connection. Highlighted figures are what links the two.'));
  }
  // Connected data: other places the same numbers show up.
  function connected(related) {
    if (!related || !related.length) return null;
    const ic = (r) => (r.kind === 'report' ? (QBO_IDS.includes(r.id) ? 'qbo' : 'sheets') : r.kind === 'location' ? 'sheets' : r.kind === 'email' ? 'gmail' : r.kind === 'message' ? 'messages' : r.kind === 'calendar' ? 'calendar' : 'docs');
    return h('nav', { class: 'cx-bar', 'aria-label': 'Connected data' },
      h('span', { class: 'cx-l' }, 'Connected data'),
      related.map((r) => h('button', { class: 'cx-chip' + (r.opened ? ' seen' : ''), type: 'button', title: 'via ' + r.via.slice(0, 3).join(' · '), onclick: () => { coach.emit('connected'); const from = here(); hl = r.hl; go(r.id, from); } },
        icon(ic(r), 'ico cx-ico'), h('span', {}, r.title), r.opened ? glyph('check', 'gl cx-seen') : null)));
  }
  function attachBtn(item, attachedTo) {
    const on = attachedTo && attachedTo.length;
    return btn(h('span', {}, glyph(on ? 'check' : 'plus'), on ? 'Added to finding #' + attachedTo.join(', #') : 'Add to a finding'), () => attachPicker(item), 'ob attach-btn' + (on ? ' on' : ''));
  }
  const scrollHl = (root) => { if (hl.length) setTimeout(() => { const t = root.querySelector('.hl'); if (t) t.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); }, 60); };

  // A figure in any table: click to flag it.
  function figCell(srcId) {
    return (c) => {
      if (!c.s) return null;
      const b = h('button', { type: 'button', class: 'figbtn', 'data-s': c.s, title: 'Flag this figure', onclick: () => figure(c.s, srcId) }, c.flag ? h('i', { class: 'fnum' }, String(c.flag)) : null, c.t || '·');
      b.dataset.cls = [c.flag ? 'is-flag' : '', hl.includes(c.s) ? 'hl' : ''].filter(Boolean).join(' ');
      return b;
    };
  }
  function figure(sid, srcId) {
    const f = game.state.flags.find((x) => x.signals.includes(sid));
    if (f) return compose({ existing: f });
    compose({ signals: [sid], source: srcId });
  }

  // ------------------------------------------------------------ Gmail
  function renderGmail() {
    if (mailId) return openMail(mailId, true);
    const items = game.listSources('email');
    fill(gmail({ user: USER, inboxCount: game.unread('email'), labels: [{ name: 'Finance', color: '#16A765' }, { name: 'People', color: '#4986E7' }, { name: 'Vendors', color: '#FFAD46' }],
      list: items.map((s) => gmailRow({ name: person(s.from).name, subject: s.title, snippet: (s.body || [''])[0], when: mailDate(s.when, w.shell.monday), unread: !s.opened, chips: s.flag ? [{ text: s.flag, tone: 'warn' }] : [], onclick: () => openMail(s.id) })) }));
    pc.url('mail.google.com/mail/u/0/#inbox');
  }
  function openMail(id, quiet) {
    const v = quiet ? game.view(id) : game.open(id); if (!v) return;
    if (!quiet) { startDoc(id); coach.emit('doc:email'); sfx.blip(); }
    mailId = id;
    const from = { name: v.from.name, email: mail(v.from.key) };
    fill(gmail({ user: USER, inboxCount: game.unread('email'), labels: [], view: gmailMessage({
      subject: v.title, chips: v.flag ? [{ text: v.flag, tone: 'warn' }] : [], from, to: 'me', cc: v.cc, when: v.when.replace(/^(\w{3}) /, '$1, ') + (/\d{1,2}:\d{2}/.test(v.when) ? '' : ''),
      body: v.body, sig: [v.from.name, v.from.title + (w.characters[v.from.key] && w.characters[v.from.key].ext ? '' : ', ' + w.shell.company)],
      above: [crumbs(), connected(v.related)],
      below: h('div', { class: 'attach-row' }, attachBtn({ key: v.id, source: v.id, label: 'Email: ' + v.title }, v.attachedTo), h('span', { class: 'quiet' }, 'Context for a finding you\'ve stored')),
      onBack: () => { closeDoc(); mailId = null; docId = null; history = []; hl = []; renderGmail(); badges(); } }) }));
    pc.url('mail.google.com/mail/u/0/#inbox/' + id.replace('eml_', 'FMfcg') + 'xWk');
    badges();
  }

  // ------------------------------------------------------------ QuickBooks
  function renderQbo() {
    if (qboDoc) return openQbo(qboDoc, true);
    const items = qboIds.map((id) => { const s = w.sources[id]; return { id, title: s.title, sub: s.sub, unread: !game.state.sources[id].opened }; });
    fill(qbo({ company: w.shell.company, user: USER, nav: 'Reports', onNav: qboNav, main: qboReportList({ groups: [['Favorites', items], ['Shared by your team this morning', items.slice().reverse().slice(0, 0)]].filter((g) => g[1].length), onOpen: (id) => openQbo(id) }) }));
    pc.url('qbo.intuit.com/app/reportlist');
  }
  function qboNav(label) {
    const id = Object.keys(QBO_NAV).find((k) => QBO_NAV[k] === label && qboIds.includes(k) && label !== 'Reports');
    if (id) return openQbo(id);
    qboDoc = null; closeDoc(); docId = null; history = []; renderQbo(); sfx.blip();
  }
  function openQbo(id, quiet) {
    const v = quiet ? game.view(id) : game.open(id); if (!v) return;
    if (!quiet) { startDoc(id); sfx.blip(); }
    qboDoc = id;
    const R = h('div', { class: 'qb-blocks' }, v.blocks.map((b) => h('section', { class: 'qb-block' }, b.title ? h('h3', {}, b.title) : null, b.note ? h('p', { class: 'qb-bnote' }, b.note) : null, h('div', { class: 'dscroll' }, dataTable(b, { cell: figCell(v.id), cls: 'qb-table' })))));
    fill(qbo({ company: w.shell.company, user: USER, nav: QBO_NAV[id] || 'Reports', onNav: qboNav, main: qboReport({
      company: w.shell.company, title: v.title, period: v.intro.split('.')[0], intro: v.intro.split('.').slice(1).join('.').trim(),
      run: v.run ? v.run : '', by: 'Prepared by ' + v.from.name + ', ' + v.from.title,
      above: [crumbs(), connected(v.related), h('p', { class: 'flag-hint' }, glyph('flag'), 'Click any figure to flag it as a finding.')],
      content: R, onBack: () => { closeDoc(); qboDoc = null; docId = null; history = []; hl = []; renderQbo(); badges(); } }) }));
    pc.url('qbo.intuit.com/app/report?rptId=' + id.replace('rep_', '') + '&token=CUSTOM');
    scrollHl(pc.body);
    badges();
    if (!quiet) coach.emit('doc:report');
  }

  // ------------------------------------------------------------ Drive, Sheets, Docs
  function driveRows() {
    const st = (id) => game.state.sources[id] || {};
    const by = (k) => (k ? person(k).name : 'Me');
    const rows = [{ group: 'This morning' }];
    for (const id of driveIds) { const s = w.sources[id]; rows.push({ id, type: 'sheets', name: s.title + ' - ' + (w.system[id] || 'export'), owner: by(s.from), modified: mailDate(s.when.replace(/^Mon /, ''), w.shell.monday), size: (12 + (s.blocks || []).length * 9) + ' KB', unread: !st(id).opened }); }
    if (locIds.length) rows.push({ id: SCORE_FILE, type: 'sheets', name: (M ? 'Location scorecards' : 'Weekly scorecard') + ' - week ending ' + w.shell.weekEnd.replace(/^\w+, /, ''), owner: M ? 'Location managers' : person(w.locById[w.sources[locIds[0]].loc].manager).name, modified: '6:10 AM', size: '31 KB', unread: locIds.some((id) => !st(id).opened) });
    rows.push({ group: 'Notes' });
    rows.push({ id: 'note_role', type: 'docs', name: 'Note from ' + w.characters.boss.name, owner: w.characters.boss.name, modified: 'Fri', size: '2 KB', unread: !st('note_role').opened });
    rows.push({ id: 'note_mine', type: 'docs', name: '1:1 notes - last week', owner: 'Me', modified: 'Fri', size: '4 KB', unread: !st('note_mine').opened });
    return rows;
  }
  function renderDrive() {
    if (driveFile) return openFile(driveFile, true);
    fill(drive({ user: USER, crumbs: ['Shared with me', 'Monday reports'], files: driveRows(), onOpen: (id) => openFile(id) }));
    pc.url('drive.google.com/drive/folders/1mOnDaYrEpOrTs');
  }
  function backToDrive() { closeDoc(); driveFile = null; docId = null; history = []; hl = []; renderDrive(); badges(); sfx.back(); }
  function openFile(id, quiet) {
    driveFile = id;
    if (id === SCORE_FILE) return openScorecards(sheetTab || locIds[0], quiet);
    if (id === 'note_role' || id === 'note_mine') return openNote(id, quiet);
    const v = quiet ? game.view(id) : game.open(id); if (!v) return;
    if (!quiet) { startDoc(id); sfx.blip(); }
    fill(sheets({ title: v.title + ' - ' + (w.system[id] || 'export'), blocks: v.blocks, cell: figCell(v.id), onBack: backToDrive, intro: v.intro,
      by: 'Exported ' + (v.run || v.when) + ' by ' + v.from.name,
      topNote: h('div', { class: 'gs-note' }, crumbs(), connected(v.related), h('p', { class: 'flag-hint' }, glyph('flag'), 'Click any figure to flag it as a finding.')) }));
    pc.url('docs.google.com/spreadsheets/d/1' + id.replace('rep_', '') + 'Xq7/edit#gid=0');
    scrollHl(pc.body); badges();
    if (!quiet) coach.emit('doc:report');
  }
  function openScorecards(tab, quiet) {
    sheetTab = tab;
    const v = quiet ? game.view(tab) : game.open(tab); if (!v) return;
    if (!quiet) { startDoc(tab); sfx.blip(); }
    const sig = (key, value) => (w.signals[key] && w.signals[key].cell) || value;
    let blocks, intro;
    if (tab === 'loc_all') {
      blocks = [{ title: 'All ' + V.units + ' side by side', cols: ['Measure'].concat(w.locations.map((L) => L.name)), rows: v.rows.map((r) => ({ cells: [{ t: r.label }].concat(r.cells.map((c) => ({ t: sig(c.key, c.value) + (c.delta ? '  (' + c.delta + ')' : ''), s: c.key, flag: c.flag }))) })) }];
      intro = 'Same measures as each scorecard. This week.';
    } else {
      const L = w.locById[w.sources[tab].loc], p = person(L.manager);
      blocks = [
        { title: (M ? L.name : w.shell.company) + ' · weekly scorecard', cols: ['Measure', 'This week', 'Compared with'], rows: v.tiles.map((t) => ({ cells: [{ t: t.label }, { t: sig(t.key, t.value), s: t.key, flag: t.flag }, { t: t.delta || '' }] })) },
        { title: 'Manager\'s note for the week', cols: ['From', 'Note'], rows: [{ cells: [{ t: p.name }, { t: '"' + v.note + '"' }] }] },
      ];
      intro = L.street + ' · ' + v.sub + ' · ' + p.name + ', ' + p.title;
    }
    const tabs = locIds.map((id) => ({ id, name: id === 'loc_all' ? 'All ' + V.units : w.sources[id].title }));
    fill(sheets({ title: (M ? 'Location scorecards' : 'Weekly scorecard') + ' - week ending ' + w.shell.weekEnd.replace(/^\w+, /, ''), blocks, intro, cell: figCell(tab), tabs, tab, onTab: (t) => { history = []; hl = []; openScorecards(t); coach.emit('doc:location'); }, onBack: backToDrive,
      by: 'Updated ' + (v.when || ''),
      topNote: h('div', { class: 'gs-note' }, crumbs(), connected(v.related), h('p', { class: 'flag-hint' }, glyph('flag'), 'Click any figure to flag it. ' + (M ? 'Each tab at the bottom is a ' + V.unit + '.' : ''))) }));
    pc.url('docs.google.com/spreadsheets/d/1sCoReCaRdS/edit#gid=' + (locIds.indexOf(tab) + 1));
    scrollHl(pc.body); badges();
    if (!quiet) coach.emit('doc:location');
  }
  function openNote(id, quiet) {
    const v = quiet ? game.view(id) : game.open(id); if (!v) return;
    if (!quiet) { startDoc(id); sfx.blip(); coach.emit('doc:note'); }
    const boss = w.characters.boss;
    const page = id === 'note_role'
      ? [h('p', { class: 'doc-meta' }, 'From ' + boss.name + ', ' + boss.title), h('h1', {}, 'Before Monday'), v.body.map((x) => h('p', {}, x)), h('div', { class: 'attach-row' }, attachBtn({ key: 'note_role', source: 'note_role', label: 'Note from ' + boss.name }, v.attachedTo))]
      : [h('p', { class: 'doc-meta' }, 'Your notes · last week\'s 1:1s'), h('h1', {}, '1:1 notes'), h('ul', {}, v.list.map((x) => h('li', {}, x))), h('div', { class: 'attach-row' }, attachBtn({ key: 'note_mine', source: 'note_mine', label: 'Your notes from last week' }, v.attachedTo))];
    fill(docs({ title: id === 'note_role' ? 'Note from ' + boss.name : '1:1 notes - last week', onBack: backToDrive, page, by: id === 'note_role' ? 'Shared by ' + boss.name : 'Last edit was last week' }));
    pc.url('docs.google.com/document/d/1' + id + 'Q/edit');
    badges();
  }

  // ------------------------------------------------------------ Calendar
  const TONE = { meeting: 'blue', review: 'green', deadline: 'red', block: 'gray' };
  const allDay = (t) => !/\d{1,2}:\d{2}/.test(String(t || ''));
  function renderCalendar() {
    const v = game.view('cal');
    if (!game.state.sources.cal.opened) { game.open('cal'); startDoc('cal'); }
    docId = 'cal';
    const dates = calTab === 'this' ? v.dates : calTab === 'last' ? v.lastDates : v.nextDates;
    const tag = (e) => (e.attachedTo && e.attachedTo.length ? '#' + e.attachedTo.join(' #') : null);
    const columns = dates.map((_, d) => {
      const list = calTab === 'this' && d === 0
        ? v.today.map((e) => ({ title: e.title, start: e.start, end: e.end, place: e.place, tone: TONE[e.kind] || 'blue', badge: tag(e), onclick: e.detail ? () => calPop(e) : null }))
        : v.weeks[calTab].filter((e) => e.day === d && !e.ref).map((e) => ({ title: e.title, start: e.time, allDay: allDay(e.time), tone: e.detail ? 'blue' : 'gray', badge: tag(e), onclick: e.detail ? () => calPop(e) : null }));
      return list;
    });
    const all = v.today.concat(...Object.values(v.weeks));
    const pe = calPopId ? all.find((e) => e.id === calPopId) : null;
    fill(gcal({ user: USER, monthLabel: monthTitle(w.shell.monday), dates, columns, nowMin: calTab === 'this' ? shown : null, todayIndex: calTab === 'this' ? 0 : -1,
      onPrev: () => { calTab = calTab === 'next' ? 'this' : 'last'; calPopId = null; sfx.blip(); renderCalendar(); },
      onNext: () => { calTab = calTab === 'last' ? 'this' : 'next'; calPopId = null; sfx.blip(); renderCalendar(); },
      onToday: () => { calTab = 'this'; calPopId = null; renderCalendar(); },
      popover: pe ? popFor(pe, v) : null }));
    pc.url('calendar.google.com/calendar/u/0/r/week/2026/' + (calTab === 'this' ? '6/1' : calTab === 'last' ? '5/25' : '6/8'));
    const now = pc.body.querySelector('.gc-now'); if (now && !pe) now.scrollIntoView({ block: 'center' });
  }
  function calPop(e) { calPopId = e.id; sfx.blip(); coach.emit('doc:calendar'); renderCalendar(); }
  function popFor(e, v) {
    const dt = e.detail || {};
    const when = e.start ? w.shell.mondayLong + ' · ' + e.start + ' – ' + e.end : (calTab === 'this' ? v.dates : calTab === 'last' ? v.lastDates : v.nextDates)[e.day] + ' · ' + e.time;
    return gcalPopover({ title: e.title, when, place: e.place, color: e.kind === 'review' ? '#33B679' : '#039BE5',
      people: (dt.people || []).map((p) => ({ name: p.name || (person(p.key) || {}).name, title: p.title })),
      lines: (dt.review ? [h('table', { class: 'dt mini' }, h('thead', {}, h('tr', {}, h('th', {}, 'Goal'), h('th', {}, 'Target'), h('th', { class: 'n' }, 'Now'))), h('tbody', {}, dt.review.map(([g, t, n]) => h('tr', {}, h('td', {}, g), h('td', {}, t), h('td', { class: 'n' }, n)))))] : []).concat((dt.lines || []).map((l) => h('p', {}, l))),
      extra: e.kind === 'block' ? null : h('div', { class: 'attach-row' }, attachBtn({ key: 'cal:' + e.id, source: 'cal', label: 'Calendar: ' + e.title, signals: e.signals || [] }, e.attachedTo)),
      onClose: () => { calPopId = null; sfx.back(); renderCalendar(); } });
  }

  // ------------------------------------------------------------ Messages
  // Texts are grouped into one thread per person, newest first.
  function threads() {
    const by = {};
    for (const s of game.listSources('message')) (by[s.from] = by[s.from] || []).push(s);
    return Object.entries(by).map(([from, list]) => ({ from, list: list.slice().sort((a, b) => (a.arrivedAt || 0) - (b.arrivedAt || 0)), unread: list.some((s) => !s.opened), last: list.reduce((m, s) => Math.max(m, s.arrivedAt || 0), 0) }))
      .sort((a, b) => b.last - a.last || (b.unread - a.unread));
  }
  function renderMessages() {
    const ts = threads();
    const t = thread ? ts.find((x) => x.from === thread) : null;
    if (t) { for (const s of t.list) if (!game.state.sources[s.id].opened) { game.open(s.id); } if (docId !== 'th:' + thread) { startDoc(t.list[0].id); docId = 'th:' + thread; } }
    const rel = []; if (t) for (const s of t.list) for (const r of game.view(s.id).related) if (!rel.some((x) => x.id === r.id)) rel.push(r);
    desk.phone.body.replaceChildren(messages({
      threads: ts.map((x) => { const last = x.list[x.list.length - 1]; return imThread({ name: person(x.from).name, preview: last.body[last.body.length - 1], when: mailDate(last.when, w.shell.monday), unread: x.unread && x.from !== thread, on: x.from === thread, onclick: () => { thread = x.from; history = []; hl = []; sfx.blip(); renderMessages(); coach.emit('doc:message'); } }); }),
      current: !!t,
      header: t ? [h('button', { class: 'im-back', type: 'button', onclick: () => { closeDoc(); docId = null; thread = null; sfx.back(); renderMessages(); } }, '‹ Messages'), h('span', { class: 'im-to' }, h('b', {}, person(t.from).name)), h('span', { class: 'im-sub' }, person(t.from).title)] : null,
      bubbles: t ? [crumbs(), connected(rel.slice(0, 3)), t.list.map((s) => { const v = game.view(s.id); return h('div', { class: 'im-group' },
        h('p', { class: 'im-time' }, s.when || ''), s.body.map((line) => h('p', { class: 'im-b in' }, line)),
        attachBtn({ key: s.id, source: s.id, label: 'Text from ' + first(person(t.from).name) + ': "' + s.body[0].slice(0, 60) + (s.body[0].length > 60 ? '…' : '') + '"' }, v.attachedTo)); })] : null,
    }));
    badges();
  }

  // ------------------------------------------------------------ Contacts: who's who
  function renderContacts() {
    const v = game.view('team');
    if (!game.state.sources.team || !game.state.sources.team.opened) game.open('team');
    const row = (p, job) => contactRow({ name: p.name, email: mail(p.key), job, labels: [(p.owns || [])[0]].filter(Boolean), onclick: () => { profileKey = p.key; sfx.blip(); renderContacts(); } });
    if (profileKey) return fill(contacts({ user: USER, rows: [], detail: profileView(profileKey) }));
    fill(contacts({ user: USER, title: 'Directory', rows: [h('p', { class: 'gco-group' }, 'Central team'), v.central.map((p) => row(p, p.title)), h('p', { class: 'gco-group' }, M ? 'Location managers' : 'On site'), v.managers.map((p) => row(p, p.loc && M ? V.mgrTitle + ', ' + p.loc.name : p.title))], note: h('p', { class: 'gco-note' }, 'Click anyone to see what they own.') }));
  }
  function profileView(key) {
    const p = person(key), loc = p.loc ? w.locById[p.loc] : null;
    const field = (g, label, value) => (value ? h('div', { class: 'gco-f' }, glyph(g), h('div', {}, h('p', {}, label), h('div', {}, value))) : null);
    return h('div', { class: 'gco-detail' },
      h('button', { class: 'gm-ib', type: 'button', onclick: () => { profileKey = null; sfx.back(); renderContacts(); }, 'aria-label': 'Back' }, glyph('back')),
      h('div', { class: 'gco-hero' }, face(p.name, 120), h('div', {}, h('h1', {}, p.name), h('p', {}, p.title + (w.characters[key] && w.characters[key].ext ? '' : ' · ' + w.shell.company)))),
      h('div', { class: 'gco-card' }, h('h2', {}, 'Contact details'),
        field('send', 'Email', mail(key)),
        p.since ? field('clock', 'With the company', 'Since ' + p.since) : null,
        loc ? field('pin', M ? V.unit[0].toUpperCase() + V.unit.slice(1) : 'Site', loc.name + ' · ' + loc.staff + ' people · opened ' + loc.opened) : null,
        field('tag', 'Owns', h('ul', {}, (p.owns || []).map((o) => h('li', {}, o)))),
        p.best ? field('star', loc ? 'Style' : 'Go to for', p.best) : null,
        field('people', 'Reports to', loc ? (w.role.id === 'regional' ? 'You' : person('opsdir').name + ', and you') : 'You')));
  }

  // ------------------------------------------------------------ flagging: the composer
  // Four short reads, each with the action beneath it; then the player's own words, an owner,
  // and how sure they are.
  function compose({ signals, source, existing }) {
    if (!existing && game.state.flags.length >= game.MAX_FLAGS) { note('You can store up to ' + game.MAX_FLAGS + ' findings. Remove one in your findings to add another.'); return; }
    sfx.select();
    const sid = existing ? existing.signals[0] : signals[0];
    const s = w.signals[sid], src = w.sources[existing ? existing.source : source];
    const n = existing ? game.state.flags.indexOf(existing) + 1 : game.state.flags.length + 1;
    let choice = existing ? existing.choice : null, owner = existing ? existing.owner : null, sure = existing ? existing.confidence : null;
    const answers = game.answers(sid);
    const steps = h('ol', { class: 'cprog' });
    const progress = () => steps.replaceChildren(...[['Your read', !!choice || ta.value.trim().length >= 3], ['Your words', ta.value.trim().length >= 3], ['Owner', !!owner], ['How sure', !!sure]].map(([t, done], i) => h('li', { class: 'cp' + i + (done ? ' done' : '') }, h('i', {}, done ? '✓' : String(i + 1)), t)));
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
      const grp = (g, title) => { const ps = list.filter((o) => o.group === g); return ps.length ? h('div', { class: 'og' }, title ? h('span', { class: 'og-t' }, title) : null, h('div', { class: 'og-list' }, ps.map((o) => h('button', { class: 'owner-chip' + (owner === o.key ? ' on' : ''), type: 'button', 'aria-pressed': String(owner === o.key), onclick: () => { owner = owner === o.key ? null : o.key; drawOwners(); progress(); sfx.blip(); } },
        fc(o.key, 26), h('span', {}, h('strong', {}, o.key === 'me' ? 'You' : o.name), h('em', {}, o.group === 'manager' && M ? o.loc : o.title)))))) : null; };
      ownersEl.replaceChildren(grp('manager', M ? 'Location managers' : 'On site'), grp('central', 'Central team'), grp('me', ''));
    };
    drawOwners();
    const sureEl = h('div', { class: 'sure' });
    const drawSure = () => sureEl.replaceChildren(...[['hunch', 'A hunch'], ['fair', 'Fairly sure'], ['certain', 'Certain']].map(([k, l]) => h('button', { class: 'sure-chip' + (sure === k ? ' on' : ''), type: 'button', 'aria-pressed': String(sure === k), onclick: () => { sure = sure === k ? null : k; drawSure(); progress(); sfx.blip(); } }, l)));
    drawSure();
    const save = btn(existing ? 'Save' : 'Add to findings', () => {
      if (!choice && ta.value.trim().length < 3) { opts.classList.add('shake'); setTimeout(() => opts.classList.remove('shake'), 400); note('Pick the read closest to yours, or write your own.'); return; }
      if (existing) game.editFlag(existing.id, { choice, note: ta.value, owner, confidence: sure }); else game.flag({ signals, source, choice, note: ta.value, owner, confidence: sure });
      closeCard(); sfx.coin(); drawTray(); render();
      coach.emit('flagged'); coach.pop();
    }, 'ob primary');
    const step = (k, title, help, ...body) => h('section', { class: 'cstep2 s' + k }, h('div', { class: 'cs-head' }, h('b', {}, String(k)), h('div', {}, h('p', { class: 'label' }, title), help ? h('p', { class: 'help' }, help) : null)), ...body);
    card('composer',
      h('p', { class: 'stamp' }, existing ? 'Edit finding #' + n : 'New finding #' + n),
      h('blockquote', { class: 'flagged' }, h('span', { class: 'fl-src' }, (src ? src.title : '') + (w.system[src && src.id] ? ' · ' + w.system[src.id] : '')), h('strong', {}, s.label), h('span', { class: 'fl-v' }, [s.value, s.delta].filter(Boolean).join(' · '))),
      steps,
      step(1, 'What\'s your read?', 'Pick the one closest to what you think is going on. The action underneath is what your team would do.', opts),
      step(2, 'In your own words', 'Optional, but it goes into the meeting with you. Explain your read, or write your own if none of the above fit.', ta, count),
      step(3, 'Who owns it?', 'Optional. Who on your team should take this on?', ownersEl),
      step(4, 'How sure are you?', null, sureEl),
      h('div', { class: 'row' }, save, existing ? btn('Remove this finding', () => { game.removeFlag(existing.id); closeCard(); sfx.back(); drawTray(); render(); }, 'link') : null, btn('Cancel', () => { closeCard(); sfx.back(); coach.emit('cancel'); coach.pop(); }, 'link')));
    drawOpts(); words(); progress();
    coach.emit('compose'); coach.push('compose');
  }

  // ------------------------------------------------------------ attaching context
  function attachPicker(item) {
    const fl = game.flags();
    sfx.select();
    if (!fl.length) {
      card('attach-card', h('h2', {}, 'Add to a finding'), h('p', {}, 'You haven\'t stored a finding yet. Flag a figure in QuickBooks or a sheet in Drive first, then attach this to it as supporting context.'), h('div', { class: 'row' }, btn('Got it', () => { closeCard(); sfx.back(); }, 'ob primary')));
      return;
    }
    const draw = () => card('attach-card', h('h2', {}, 'Add to a finding'),
      h('p', {}, 'Attach this as supporting context. It travels with the finding into your meeting.'),
      h('p', { class: 'att-item' }, item.label),
      h('ul', { class: 'att-list' }, game.flags().map((f) => { const on = f.attached.some((a) => a.key === item.key);
        return h('li', {}, h('button', { class: 'att-f' + (on ? ' on' : ''), type: 'button', onclick: () => { if (on) game.detach(f.id, item.key); else game.attach(f.id, item); sfx[on ? 'back' : 'coin'](); draw(); drawTray(); render(); coach.emit('attached'); } },
          h('i', { class: 'fnum' }, String(f.n)), h('span', {}, h('strong', {}, f.what.label), h('em', {}, f.text)), h('b', {}, on ? '✓ Added' : '+ Add'))); })),
      h('div', { class: 'row' }, btn('Done', () => { closeCard(); sfx.back(); }, 'ob primary')));
    draw();
  }

  // ------------------------------------------------------------ findings
  function drawTray() {
    const fl = game.flags(), n = fl.length, ok = n >= game.MIN_FLAGS;
    strip.right.replaceChildren(
      h('button', { class: 'gs-findings', type: 'button', onclick: findingsCard },
        h('span', {}, 'Your findings'), h('b', { class: ok ? 'ok' : '' }, n + ' / ' + game.MIN_FLAGS + (n > game.MIN_FLAGS ? '+' : '')),
        h('span', { class: 'slots' }, Array.from({ length: game.MAX_FLAGS }, (_, i) => h('i', { class: i < n ? 'on' : i < game.MIN_FLAGS ? 'need' : '' })))),
      btn(ok ? 'Review & lock in' : 'Flag ' + (game.MIN_FLAGS - n) + ' more', ok ? findingsCard : () => note('Open QuickBooks or a sheet in Drive. Click any figure that sticks out to flag it.'), 'ob' + (ok ? ' primary' : ' quiet')));
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
        f.attached.length ? h('ul', { class: 'fr-att' }, f.attached.map((a) => h('li', {}, h('span', {}, '+ ' + a.label), btn('✕', () => { game.detach(f.id, a.key); findingsCard(); render(); }, 'chip x')))) : null),
      h('div', { class: 'row-tools' }, btn('▲', () => { game.moveFlag(f.id, -1); findingsCard(); drawTray(); }, 'chip'), btn('▼', () => { game.moveFlag(f.id, 1); findingsCard(); drawTray(); }, 'chip'), btn('Edit', () => compose({ existing: game.state.flags.find((x) => x.id === f.id) }), 'chip'))));
    card('findings-card',
      h('h2', {}, 'Your findings'),
      h('p', {}, fl.length ? 'This is exactly what you\'ll hand your team at 10:00. Edit, reorder, or remove anything. Attach context from Gmail, Messages, Calendar or your notes with Add to a finding.' : 'Nothing stored yet. Click a figure in QuickBooks or a sheet in Drive to flag it.'),
      h('ol', { class: 'finding-list' }, rows),
      h('div', { class: 'row' }, ok ? btn('Lock in my briefing', () => { closeCard(); submit(); }, 'ob primary') : h('span', { class: 'quiet' }, 'Store at least ' + game.MIN_FLAGS + ' to lock in.'), btn('Keep working', () => { closeCard(); sfx.back(); coach.emit('closed'); }, 'link')));
    coach.emit('findings');
  }

  function submit() { if (!game.submitRound1()) return; sfx.start(); onSubmit(); }

  function card(cls, ...kids) { overlay.hidden = false; overlay.replaceChildren(h('div', { class: 'dialog ' + cls, role: 'dialog' }, ...kids)); overlay.scrollTop = 0; }
  function closeCard() { overlay.hidden = true; overlay.replaceChildren(); }
  function note(text) { const el = h('div', { class: 'os-tip', role: 'status' }, text); document.querySelector('.os-desktop').appendChild(el); setTimeout(() => el.remove(), 5000); sfx.back(); }
  function rulesCard() {
    card('rules-card', h('h2', {}, 'How this works'),
      h('ul', { class: 'mini-rules' },
        h('li', {}, 'This is your computer on Monday morning. Your team\'s reports are in QuickBooks and in Drive, along with every ' + V.unit + '\'s scorecard and your notes. Your inbox, texts, calendar and directory are in the dock.'),
        h('li', {}, 'Click any figure in a QuickBooks report or a sheet to flag it. Pick your read on it, or write your own, and name an owner if you like.'),
        h('li', {}, 'Emails, texts, calendar entries and notes are context. Attach them to a finding with Add to a finding.'),
        h('li', {}, 'Connected data jumps you to other places the same numbers show up, and back.'),
        h('li', {}, 'Store ' + game.MIN_FLAGS + ' to ' + game.MAX_FLAGS + ' findings. Your ' + w.role.meetingName + ' starts at 10:00 AM. Lock in your briefing before then.')),
      h('div', { class: 'row' }, btn('Back to work', closeCard, 'ob primary')));
  }

  badges(); drawTray();
  // The guide, in chapters. Each plays where it belongs; leave and it waits for you.
  const flagged = () => game.state.flags.length >= 1;
  setTimeout(() => coach.chapters({
    desk: [
      { text: 'This is your computer. Everything your team sent this morning is in the apps you already use: QuickBooks, Drive, Gmail, Calendar and your directory. Open anything. The guide follows you.', target: '.os-dock', next: 'NEXT ▶', once: true },
      { text: 'Your phone is on the desk. It buzzes when someone texts you. Click it any time to pick it up and read.', target: '.dk-phone', next: 'NEXT ▶', once: true, skipIf: () => !document.querySelector('.dk-phone') },
      { text: 'A good place to start is QuickBooks. This morning\'s flash and the other finance reports are there.', target: '.dock-app[data-app="qbo"]', wait: 'app:qbo', hint: 'Open QuickBooks', skipIf: () => coach.seen('app:qbo') },
      { text: 'Your findings are stored up here. Open them any time to review, edit or reorder.', target: '.gs-findings', wait: 'findings', hint: 'Open your findings', when: flagged },
      { text: 'This list is exactly what you\'ll hand your team. Edit changes your answer or owner. The arrows set the order you\'d tackle them in.', target: '.findings-card', next: 'GOT IT ▶', wait: 'closed', inline: true, onNext: closeCard, when: () => !!document.querySelector('.findings-card') },
      { text: 'Your ' + w.role.meetingName + ' starts at 10:00 AM. Have at least ' + game.MIN_FLAGS + ' findings ready by then. The rest is up to you.', target: '.mb-clock', next: 'LET\'S GO ▶', when: flagged },
    ],
    qbo: [
      { text: 'Open any report.', target: '.qb-rl', wait: 'doc:report', hint: 'Pick a report', skipIf: () => coach.seen('doc:report') },
      { text: 'Connected data shows other places these numbers show up. Click one to jump there, then use the back button to return.', target: '.cx-bar', next: 'NEXT ▶', skipIf: () => !document.querySelector('.cx-bar'), once: true },
      { text: 'Every figure in a report is a data point. When one looks off, click it to flag it.', target: '.qb-paper', wait: 'flagged', hint: 'Click a figure', side: 'over', skipIf: flagged },
      { text: 'That\'s your first finding. The reports from your other systems, and every ' + V.unit + '\'s scorecard, are in Drive.', target: '.dock-app[data-app="drive"]', next: 'GOT IT ▶', when: flagged, once: true },
    ],
    drive: [
      { text: 'Your other systems export here every morning: operations, customers, maintenance, people. The ' + (M ? V.unit + ' scorecards' : 'weekly scorecard') + ' and your notes are here too.', target: '.gd-table', next: 'GOT IT ▶', once: true, skipIf: () => !document.querySelector('.gd-table') },
      { text: 'Any figure in a sheet can be flagged, the same as in QuickBooks.', target: '.gs-grid', next: 'GOT IT ▶', once: true, skipIf: () => !document.querySelector('.gs-grid .figbtn') },
    ],
    compose: [
      { text: 'Pick the read closest to yours. Then, if you can, say it in your own words: it goes into the meeting with you. An owner and how sure you are help too. Then add it.', target: '.composer', inline: true, wait: 'flagged' },
    ],
    secondary: [
      { text: 'Emails, texts, your calendar and your notes don\'t become findings on their own. When one adds context to a finding you\'ve stored, attach it with Add to a finding. It travels with that finding into the meeting.', target: '.attach-btn', next: 'GOT IT ▶', once: true },
    ],
    _alias: { gmail: 'secondary', messages: 'secondary', calendar: 'secondary' },
  }, 'desk'), reduced ? 0 : 500);
}
