// ROUND 1: ON YOUR OWN
// Your computer on Monday morning. The company runs on one ERP (Example ERP): the dashboard,
// every report and saved search, each location's scorecard and the shared notes are all in it.
// The data is all in one place; what it means is up to you. Any figure on the dashboard, in a
// report or a scorecard can be flagged as a finding. Gmail, Messages, Calendar and the notes
// hold context a player can attach to a finding. Contacts says who everyone is.
// Renders what the engine returns. No business logic lives here.

import { h } from './art.js';
import { sfx } from './arcade/sound.js';
import { fmtClock } from '../engine/config.js';
import { createComputer, gameStrip, face, addressOf, glyph, icon } from './os/shell.js';
import { gmail, gmailRow, gmailMessage, mailDate, dataTable, gcal, gcalPopover, monthTitle, messages, imThread, contacts, contactRow } from './os/apps.js';
import { erp, pageHead, filters, reportList, subtabs, fileCabinet, docPage, hashOf, ERP_NAME, ERP_HOST, SCORE_FILE, erpModel, homePage, reportGroups, scoreBlocks, scoreTabs } from './os/erp.js';

const CLOCK_MS = 2000; // one minute of the morning every two seconds

export function round1({ game, show, coach, reduced, onSubmit, setCleanup }) {
  const w = game.world, D = w.day, M = w.shell.multi, V = w.shell.vocab;
  const btn = (label, onclick, cls = 'ob') => h('button', { class: cls, type: 'button', onclick }, label);
  const first = (name) => String(name).split(' ')[0];
  const person = (k) => game.person(k);
  const USER = { name: w.role.label, email: 'you@' + w.shell.company.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '') + '.com' };
  const mail = (k) => (k === 'me' ? USER.email : addressOf(w.characters[k] || person(k), w.shell.company));
  const fc = (k, size) => (k === 'me' ? face(USER.name, size, '#5F6368') : face(person(k).name, size));
  const reportIds = w.order.report || [];
  const locIds = w.order.location || [];

  game.startRound1();
  // where the player is: one app at a time, and what is open inside it
  let app = null, docId = null, docStart = 0, shown = game.state.clock;
  let history = [], hl = [], calTab = 'this', calPopId = null, sheetTab = null, erpTab = 'home', erpDoc = null, mailId = null, thread = null, profileKey = null;

  const APPS = [
    { id: 'erp', name: ERP_NAME, icon: 'erp', title: 'Home - ' + ERP_NAME, url: ERP_HOST + '/app/center/card.nl', hero: true },
    { id: 'gmail', name: 'Gmail', icon: 'gmail', title: 'Gmail', url: 'mail.google.com/mail/u/0/#inbox' },
    { id: 'calendar', name: 'Google Calendar', icon: 'calendar', title: 'Google Calendar - Week', url: 'calendar.google.com/calendar/u/0/r/week' },
    { id: 'messages', name: 'Messages', icon: 'messages', title: 'Messages', chrome: 'native' },
    { id: 'contacts', name: 'Contacts', icon: 'contacts', title: 'Directory - Google Contacts', url: 'contacts.google.com/directory' },
  ];
  const pc = createComputer({ apps: APPS, user: USER, company: w.shell.company, onOpen: (id) => openApp(id), onHome: () => { closeDoc(); app = null; docId = null; history = []; badges(); sfx.back(); coach.emit('desk'); coach.context('desk'); } });
  const overlay = h('div', { class: 'overlay os-ov', hidden: true });
  const strip = gameStrip({ round: 'Step 2 of 6 · On your own', task: 'Find ' + game.MIN_FLAGS + ' things that look off before your 10:00 AM meeting. Click a row to flag it.', onRules: rulesCard });

  show('day', 'os-screen round1', strip.el, pc.el, overlay);
  const clockLabel = () => w.shell.monday.replace(',', '') + '  ' + fmtClock(shown);
  pc.setClock(clockLabel());

  const ticker = setInterval(() => {
    const r = game.tickClock();
    shown = r.clock; pc.setClock(clockLabel());
    if (r.fired.length) { arrivals(r.fired); badges(); if (app === 'gmail' && !mailId) renderGmail(); if (app === 'messages') renderMessages(); }
    if (app === 'calendar') { const now = document.querySelector('.gc-now'); if (now) now.style.top = ((shown - 7 * 60) / 60 * 48) + 'px'; }
    if (r.atTen && strip.alert.hidden) {
      strip.alert.hidden = false;
      strip.alert.replaceChildren(h('b', {}, '10:00 AM'), h('span', {}, game.state.flags.length >= game.MIN_FLAGS ? ' Your meeting is starting. Lock in your briefing when you\'re ready.' : ' Your meeting is starting. Flag at least ' + game.MIN_FLAGS + ' figures, then lock in your briefing.'));
      sfx.credit();
    }
  }, reduced ? 600 : CLOCK_MS);
  setCleanup(() => { clearInterval(ticker); coach.stop(); doneEl.remove(); });
  sfx.ambience(1);

  // ------------------------------------------------------------ the dock
  function badges() {
    const unreadOf = (ids) => ids.filter((id) => game.state.sources[id] && !game.state.sources[id].opened).length;
    pc.badge('gmail', game.unread('email'));
    pc.badge('messages', game.unread('message'));
    pc.badge('erp', unreadOf(reportIds) + (locIds.some((id) => !game.state.sources[id].opened) ? 1 : 0) + unreadOf(['note_role', 'note_mine']));
  }
  function arrivals(fired) {
    for (const f of fired) {
      const src = w.sources[f.source];
      const p = src.from ? person(src.from) : null;
      sfx.alert();
      pc.notify({ app: src.kind === 'message' ? 'messages' : 'gmail', title: p ? p.name : '', text: src.kind === 'message' ? src.body[0] : src.title, onclick: () => go(f.source) });
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
    else if (app === 'erp') renderErp();
    else if (app === 'calendar') renderCalendar();
    else if (app === 'messages') renderMessages();
    else if (app === 'contacts') renderContacts();
  }
  const fill = (...kids) => { pc.body.replaceChildren(...kids.flat().filter(Boolean)); };

  // Go anywhere: used by notifications and by connected data.
  function go(id, from) {
    const src = w.sources[id]; if (!src) return;
    if (from) history.push(from);
    const k = src.kind;
    if (k === 'email') { mailId = id; return show2('gmail', () => openMail(id)); }
    if (k === 'message') { thread = src.from; return show2('messages'); }
    if (k === 'report' || k === 'location' || k === 'note') { erpDoc = k === 'location' ? SCORE_FILE : id; if (k === 'location') sheetTab = id; return show2('erp', () => openErp(id)); }
    if (k === 'calendar') return show2('calendar');
  }
  function show2(id, then) {
    const keep = history.slice();
    if (pc.active !== id) pc.open(id);
    history = keep;
    if (then) then(); else render();
  }
  const here = () => {
    if (app === 'messages') { const t = threads().find((x) => x.from === thread); return { id: t ? t.list[0].id : null, title: thread ? person(thread).name : 'Messages' }; }
    if (app === 'erp' && erpDoc === SCORE_FILE) return { id: sheetTab, title: sheetTab === 'loc_all' ? 'All locations' : w.sources[sheetTab].title + (M ? ' scorecard' : '') };
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
    const ic = (r) => (r.kind === 'email' ? 'gmail' : r.kind === 'message' ? 'messages' : r.kind === 'calendar' ? 'calendar' : 'erp');
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
  // Every row with a figure in it is clickable, not just the number. The row's figure is the one
  // that matters most (part of a real problem), else its first. Before your first finding, one
  // row in the report is marked for the guide to point at: "This one looks off."
  const CORE = new Set(w.findings.flatMap((f) => f.core || []));
  function rowify(mark) {
    let tut = null, firstRow = null;
    pc.body.querySelectorAll('.ns-grid tbody tr').forEach((tr) => {
      const figs = [...tr.querySelectorAll('.figbtn')]; if (!figs.length) return;
      const main = figs.find((b) => CORE.has(b.dataset.s)) || figs[0];
      tr.classList.add('flagrow'); firstRow = firstRow || tr;
      tr.title = 'Click to flag';
      tr.addEventListener('click', (e) => { if (!e.target.closest('.figbtn')) main.click(); });
      if (mark && !tut && !game.state.flags.length && CORE.has(main.dataset.s)) tut = tr;
    });
    if (mark && !game.state.flags.length && (tut || firstRow)) (tut || firstRow).classList.add('tut-row');
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

  // ------------------------------------------------------------ Example ERP, the ERP
  // Every report, scorecard and number is in one place. That was never the problem.
  const rolled = (id) => (game.state.sources[id] || {}).opened;
  const model = erpModel(w), { where, sysOf } = model;
  const flagOf = (sid) => { const i = game.state.flags.findIndex((f) => f.signals.includes(sid)); return i + 1; };

  function frame(tab, main) {
    fill(erp({ company: w.shell.company, user: USER, role: w.role.label, tab, onTab: erpTo, main,
      badge: { reports: reportIds.filter((id) => !rolled(id)).length + (locIds.some((id) => !rolled(id)) ? 1 : 0), documents: ['note_role', 'note_mine'].filter((id) => !rolled(id)).length } }));
  }
  function renderErp() {
    if (erpDoc) return openErp(erpDoc, true);
    if (erpTab === 'reports') return erpReports();
    if (erpTab === 'documents') return erpFiles();
    erpHome();
  }
  function erpTo(tab) {
    erpTab = tab; erpDoc = null; closeDoc(); docId = null; history = []; hl = [];
    renderErp(); badges(); sfx.blip(); coach.emit('erp:' + tab);
  }
  function openErp(id, quiet) {
    const k = (w.sources[id] || {}).kind;
    if (id === SCORE_FILE || k === 'location') return openScorecards(id === SCORE_FILE ? sheetTab || locIds[0] : id, quiet);
    if (k === 'note') return openNote(id, quiet);
    return openReport(id, quiet);
  }
  const fig = (sid, cls) => { const s = w.signals[sid], n = flagOf(sid);
    return h('button', { type: 'button', class: 'figbtn ' + (cls || '') + (n ? ' is-flag' : ''), 'data-s': sid, title: 'Flag this figure', onclick: () => figure(sid, where(sid)) }, n ? h('i', { class: 'fnum' }, String(n)) : null, s.cell || s.value); };

  function erpHome() {
    frame('home', homePage({ w, model, fig, rolled, onOpen: (id) => openErp(id) }));
    rowify(false);
    pc.url(ERP_HOST + '/app/center/card.nl?sc=-29');
  }

  function erpReports() {
    const groups = reportGroups({ w, model, rolled });
    frame('reports', reportList({ groups, onOpen: (id) => openErp(id) }));
    pc.url(ERP_HOST + '/app/reporting/reportcenter.nl');
  }
  function openReport(id, quiet) {
    const v = quiet ? game.view(id) : game.open(id); if (!v) return;
    if (!quiet) { startDoc(id); sfx.blip(); }
    erpDoc = id; erpTab = 'reports';
    frame('reports', h('div', { class: 'ns-rep' },
      pageHead(v.title, { sub: 'Saved search · ' + sysOf(id) + ' · run ' + (v.run || v.when || '6:00 AM'), back: () => erpTo('reports') }),
      crumbs(), connected(v.related),
      filters([['Period', 'This week'], ['Subsidiary', w.shell.company], [M ? 'Location' : 'Site', M ? 'All' : w.shell.company]]),
      h('p', { class: 'flag-hint' }, glyph('flag'), 'Click any row that looks off to flag it.'),
      v.intro ? h('p', { class: 'ns-intro' }, v.intro) : null,
      h('div', { class: 'ns-blocks' }, v.blocks.map((b) => h('section', { class: 'ns-block' }, b.title ? h('h3', {}, b.title) : null, b.note ? h('p', { class: 'ns-bnote' }, b.note) : null, h('div', { class: 'dscroll' }, dataTable(b, { cell: figCell(v.id), cls: 'ns-grid' }))))),
      h('p', { class: 'ns-foot' }, 'Owner: ' + v.from.name + ', ' + v.from.title + ' · synced from ' + sysOf(id))));
    pc.url(ERP_HOST + '/app/common/search/searchresults.nl?searchid=' + hashOf(id) % 900);
    rowify(true); scrollHl(pc.body); badges();
    if (!quiet) coach.emit('doc:report');
  }
  function openScorecards(tab, quiet) {
    sheetTab = tab;
    const v = quiet ? game.view(tab) : game.open(tab); if (!v) return;
    if (!quiet) { startDoc(tab); sfx.blip(); }
    erpDoc = SCORE_FILE; erpTab = 'reports';
    const { blocks, intro } = scoreBlocks(w, v, tab, person);
    const tabs = scoreTabs(w, locIds);
    frame('reports', h('div', { class: 'ns-rep' },
      pageHead(M ? 'Location scorecards' : 'Weekly scorecard', { sub: 'Week ending ' + w.shell.weekEnd.replace(/^\w+, /, '') + ' · updated ' + (v.when || ''), back: () => erpTo('reports') }),
      crumbs(), connected(v.related),
      tabs.length > 1 ? subtabs(tabs, tab, (t) => { history = []; hl = []; openScorecards(t); coach.emit('doc:location'); }) : null,
      h('p', { class: 'flag-hint' }, glyph('flag'), 'Click any row that looks off to flag it.'),
      h('p', { class: 'ns-intro' }, intro),
      h('div', { class: 'ns-blocks' }, blocks.map((b) => h('section', { class: 'ns-block' }, b.title ? h('h3', {}, b.title) : null, h('div', { class: 'dscroll' }, dataTable(b, { cell: figCell(tab), cls: 'ns-grid' })))))));
    pc.url(ERP_HOST + '/app/center/scorecard.nl?loc=' + (locIds.indexOf(tab) + 1));
    rowify(false); scrollHl(pc.body); badges();
    if (!quiet) coach.emit('doc:location');
  }
  function erpFiles() {
    const boss = w.characters.boss;
    frame('documents', fileCabinet({ folders: ['Management', 'Location managers', 'Templates', 'Exports', 'Contracts'], folder: 'Management',
      files: [{ id: 'note_role', name: 'Note from ' + boss.name, owner: boss.name, modified: 'Fri', size: '2 KB', unread: !rolled('note_role') }, { id: 'note_mine', name: '1:1 notes - last week', owner: 'You', modified: 'Fri', size: '4 KB', unread: !rolled('note_mine') }],
      onOpen: (id) => openErp(id) }));
    pc.url(ERP_HOST + '/app/common/media/mediaitemfolders.nl');
  }
  function openNote(id, quiet) {
    const v = quiet ? game.view(id) : game.open(id); if (!v) return;
    if (!quiet) { startDoc(id); sfx.blip(); coach.emit('doc:note'); }
    erpDoc = id; erpTab = 'documents';
    const boss = w.characters.boss;
    const page = id === 'note_role'
      ? [h('p', { class: 'doc-meta' }, 'From ' + boss.name + ', ' + boss.title), h('h2', {}, 'Before Monday'), v.body.map((x) => h('p', {}, x)), h('div', { class: 'attach-row' }, attachBtn({ key: 'note_role', source: 'note_role', label: 'Note from ' + boss.name }, v.attachedTo))]
      : [h('p', { class: 'doc-meta' }, 'Your notes · last week\'s 1:1s'), h('h2', {}, '1:1 notes'), h('ul', {}, v.list.map((x) => h('li', {}, x))), h('div', { class: 'attach-row' }, attachBtn({ key: 'note_mine', source: 'note_mine', label: 'Your notes from last week' }, v.attachedTo))];
    frame('documents', docPage({ title: id === 'note_role' ? 'Note from ' + boss.name : '1:1 notes - last week', by: id === 'note_role' ? 'Shared by ' + boss.name : 'Last edited last week', back: () => erpTo('documents'), page }));
    pc.url(ERP_HOST + '/core/media/media.nl?id=' + hashOf(id) % 9000);
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
    fill(messages({
      threads: ts.map((x) => { const last = x.list[x.list.length - 1]; return imThread({ name: person(x.from).name, preview: last.body[last.body.length - 1], when: mailDate(last.when, w.shell.monday), unread: x.unread && x.from !== thread, on: x.from === thread, onclick: () => { thread = x.from; history = []; hl = []; sfx.blip(); renderMessages(); coach.emit('doc:message'); } }); }),
      current: !!t,
      header: t ? [h('span', { class: 'im-to' }, 'To: ', h('b', {}, person(t.from).name)), h('span', { class: 'im-sub' }, person(t.from).title)] : null,
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
  // Four short reads, each with the action beneath it; then an owner and how sure they are.
  function compose({ signals, source, existing }) {
    if (!existing && game.state.flags.length >= game.MAX_FLAGS) { note('You can store up to ' + game.MAX_FLAGS + ' findings. Remove one in your findings to add another.'); return; }
    sfx.select();
    const sid = existing ? existing.signals[0] : signals[0];
    const s = w.signals[sid], src = w.sources[existing ? existing.source : source];
    const n = existing ? game.state.flags.indexOf(existing) + 1 : game.state.flags.length + 1;
    let choice = existing ? existing.choice : null, owner = existing ? existing.owner : null, sure = existing ? existing.confidence : null;
    const answers = game.answers(sid);
    // the first finding is filled in for you: a sensible read (dig into it), its natural owner,
    // fairly sure. You only have to add it. The rest are yours.
    const prefill = !existing && !game.state.flags.length;
    if (prefill) {
      const a = answers.find((x) => x.intent === 'investigate') || answers.find((x) => x.style === 'analyze') || answers[0];
      const f = w.findings.find((x) => (x.core || []).concat(x.evidence || []).includes(sid));
      const nat = f && w.briefing[f.id] ? w.briefing[f.id].owner[0] : null;
      choice = a ? a.id : null; owner = nat && game.owners().some((o) => o.key === nat) ? nat : null; sure = 'fair';
    }
    const steps = h('ol', { class: 'cprog' });
    const progress = () => steps.replaceChildren(...[['Your read', !!choice], ['Owner', !!owner], ['How sure', !!sure]].map(([t, done], i) => h('li', { class: 'cp' + i + (done ? ' done' : '') }, h('i', {}, done ? '✓' : String(i + 1)), t)));
    const opts = h('div', { class: 'answers', role: 'radiogroup', 'aria-label': 'Your read' });
    const drawOpts = () => opts.replaceChildren(...answers.map((a) => h('button', { class: 'answer' + (choice === a.id ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(choice === a.id), onclick: () => { choice = choice === a.id ? null : a.id; drawOpts(); progress(); sfx.blip(); } },
      h('i', {}), h('span', { class: 'a-read' }, a.read), h('span', { class: 'a-act' }, a.act))));
    const noteText = existing ? existing.note || '' : '';
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
      if (!choice && noteText.trim().length < 3) { opts.classList.add('shake'); setTimeout(() => opts.classList.remove('shake'), 400); note('Pick the read closest to yours.'); return; }
      if (existing) game.editFlag(existing.id, { choice, note: noteText, owner, confidence: sure }); else game.flag({ signals, source, choice, owner, confidence: sure });
      closeCard(); sfx.coin(); drawTray(); render();
      coach.emit('flagged'); coach.pop();
      if (!existing && game.state.flags.length === game.MIN_FLAGS && !doneShown) { doneShown = true; doneScreen(); }
      else if (!existing && game.state.flags.length > 1) saved();
    }, 'ob primary');
    const step = (k, title, help, ...body) => h('section', { class: 'cstep2 s' + k }, h('div', { class: 'cs-head' }, h('b', {}, String(k)), h('div', {}, h('p', { class: 'label' }, title), help ? h('p', { class: 'help' }, help) : null)), ...body);
    card('composer',
      h('p', { class: 'stamp' }, existing ? 'Edit finding #' + n : 'New finding #' + n),
      prefill ? h('p', { class: 'prefill' }, glyph('check'), 'We filled in your first one. Just click Add to findings.') : null,
      h('blockquote', { class: 'flagged' }, h('span', { class: 'fl-src' }, (src ? src.title : '') + (w.system[src && src.id] ? ' · ' + w.system[src.id] : '')), h('strong', {}, s.label), h('span', { class: 'fl-v' }, [s.value, s.delta].filter(Boolean).join(' · '))),
      steps,
      step(1, 'What do you think is going on?', 'Pick one.', opts),
      step(2, 'Who should handle it?', 'Optional.', ownersEl),
      step(3, 'How sure are you?', 'Optional.', sureEl),
      h('div', { class: 'row' }, save, existing ? btn('Remove this finding', () => { game.removeFlag(existing.id); closeCard(); sfx.back(); drawTray(); render(); }, 'link') : null, btn('Cancel', () => { closeCard(); sfx.back(); coach.emit('cancel'); coach.pop(); }, 'link')));
    drawOpts(); progress();
    coach.emit('compose'); coach.push('compose');
  }

  // ------------------------------------------------------------ attaching context
  function attachPicker(item) {
    const fl = game.flags();
    sfx.select();
    if (!fl.length) {
      card('attach-card', h('h2', {}, 'Add to a finding'), h('p', {}, 'You haven\'t stored a finding yet. Flag a figure in ' + ERP_NAME + ' first, then attach this to it as supporting context.'), h('div', { class: 'row' }, btn('Got it', () => { closeCard(); sfx.back(); }, 'ob primary')));
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
      btn(ok ? 'Review & lock in' : 'Flag ' + (game.MIN_FLAGS - n) + ' more', ok ? findingsCard : () => note('Open ' + ERP_NAME + '. Click any row that looks off to flag it.'), 'ob' + (ok ? ' primary' : ' quiet')));
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
      h('p', {}, fl.length ? 'This is exactly what you\'ll hand your team at 10:00. Edit, reorder, or remove anything. Attach context from Gmail, Messages, Calendar or your notes with Add to a finding.' : 'Nothing stored yet. Click a figure in ' + ERP_NAME + ' to flag it.'),
      h('ol', { class: 'finding-list' }, rows),
      h('div', { class: 'row' }, ok ? btn('Lock in my briefing', () => { closeCard(); submit(); }, 'ob primary') : h('span', { class: 'quiet' }, 'Store at least ' + game.MIN_FLAGS + ' to lock in.'), btn('Keep working', () => { closeCard(); sfx.back(); coach.emit('closed'); }, 'link')));
    coach.emit('findings');
  }

  function submit() { if (!game.submitRound1()) return; sfx.start(); doneEl.remove(); onSubmit(); }

  // after a save: the findings counter at the top flashes, and a line says how many you have
  function saved() {
    const n = game.state.flags.length, t = strip.right.querySelector('.gs-findings');
    if (t) { t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump'); }
    const el = h('div', { class: 'os-tip saved', role: 'status' }, '✓ Saved to your findings. ' + (n < game.MIN_FLAGS ? n + ' of ' + game.MIN_FLAGS + ' found.' : n + ' found.'));
    document.querySelector('.os-desktop').appendChild(el); setTimeout(() => el.remove(), 3500);
  }

  // The moment you have enough: the whole screen says so, with one big button to go on.
  let doneShown = false;
  const doneEl = h('div', { class: 'r1-done', role: 'dialog', 'aria-label': 'You found ' + game.MIN_FLAGS });
  function doneScreen() {
    const fl = game.flags();
    coach.stop();
    doneEl.replaceChildren(h('div', { class: 'r1d-box' },
      h('div', { class: 'r1d-check' }, '✓'),
      h('h1', {}, 'Nice. You found ' + fl.length + '.'),
      h('p', { class: 'r1d-sub' }, 'That\'s enough for your 10:00 meeting.'),
      h('ol', { class: 'r1d-list' }, fl.map((f) => h('li', {}, h('b', {}, f.what.label), h('span', {}, f.what.value || '')))),
      btn('Continue  →', () => { sfx.blip(); submit(); }, 'r1d-go'),
      btn('Keep looking', () => { doneEl.remove(); sfx.back(); }, 'r1d-more')));
    document.body.appendChild(doneEl);
    setTimeout(() => { const b = doneEl.querySelector('.r1d-go'); if (b) b.focus({ preventScroll: true }); }, 60);
  }

  function card(cls, ...kids) { overlay.hidden = false; overlay.replaceChildren(h('div', { class: 'dialog ' + cls, role: 'dialog' }, ...kids)); overlay.scrollTop = 0; }
  function closeCard() { overlay.hidden = true; overlay.replaceChildren(); }
  function note(text) { const el = h('div', { class: 'os-tip', role: 'status' }, text); document.querySelector('.os-desktop').appendChild(el); setTimeout(() => el.remove(), 5000); sfx.back(); }
  function rulesCard() {
    card('rules-card', h('h2', {}, 'How this works'),
      h('ul', { class: 'mini-rules' },
        h('li', {}, 'This is your computer on Monday morning. Your company runs on ' + ERP_NAME + ': the dashboard, every report, each ' + V.unit + '\'s scorecard and your notes are in it. Your inbox, texts, calendar and directory are in the dock.'),
        h('li', {}, 'Click any figure on the dashboard, in a report or a scorecard to flag it. Pick your read on it and name an owner if you like.'),
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
      { text: 'This is your computer. Everything about your company is in ' + ERP_NAME + '.', target: '.os-dock', next: 'NEXT ▶', modal: true, once: true },
      { text: 'Open ' + ERP_NAME + '.', target: '.dock-app[data-app="erp"]', wait: 'app:erp', hint: 'Click it', force: true, skipIf: () => coach.seen('app:erp') },
    ],
    erp: [
      { text: 'Your dashboard. Lots of numbers. Nothing says which ones matter.', target: '.ns-kpi', next: 'NEXT ▶', modal: true, once: true },
      { text: 'Click Reports.', target: '.ns-tab[data-tab="reports"]', wait: 'erp:reports', hint: 'Click it', force: true, skipIf: flagged },
      { text: 'Open this report.', target: '.ns-rli.live', wait: 'doc:report', hint: 'Click it', force: true, skipIf: flagged },
      { text: 'This one looks off. Click it.', target: '.tut-row', wait: 'compose', hint: 'Click the row', force: true, skipIf: flagged, when: () => !!document.querySelector('.tut-row') },
      { text: 'Saved. All your findings are kept up here. You have 1 of ' + game.MIN_FLAGS + '.', target: '.gs-findings', next: 'GOT IT ▶', modal: true, when: flagged },
      { text: 'Now find ' + (game.MIN_FLAGS - 1) + ' more on your own. Click any row that looks off. Other reports are under Reports.', target: '.ns-tab[data-tab="reports"]', next: 'GOT IT ▶', modal: true, when: flagged },
    ],
    compose: [
      { text: 'We filled this one in for you. Click Add to findings.', target: '.composer .ob.primary', wait: 'flagged', hint: 'Click Add to findings', force: true, allow: '.composer', skipIf: () => game.state.flags.length > 0 },
      { text: 'Your turn. Pick what you think is going on, then click Add to findings.', target: '.composer', inline: true, wait: 'flagged', skipIf: () => game.state.flags.length !== 1 },
    ],
    secondary: [
      { text: 'An email or text can back up a finding. Click Add to a finding to attach it.', target: '.attach-btn', next: 'GOT IT ▶', once: true },
    ],
    _alias: { gmail: 'secondary', messages: 'secondary', calendar: 'secondary' },
  }, 'desk'), reduced ? 0 : 500);
}
