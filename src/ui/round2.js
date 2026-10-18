// ROUND 2: WITH WAKE
// The same computer, the same apps, the same Monday, with Wake connected to all of them. Wake
// opens in the dock with every insight from this morning, ranked, and the lines behind each one.
// QuickBooks carries the statements Wake reconciled overnight; Drive carries the executive briefs
// and a drafted Thursday brief. Gmail is labeled by insight, the calendar carries Wake's suggested
// holds, and texts (which live in no system) can be sent to Wake. The player's job is the one only
// they can do: decide.
// Renders what the engine returns. No business logic lives here.

import { h } from './art.js';
import { sfx } from './arcade/sound.js';
import { fmtClock } from '../engine/config.js';
import { createComputer, gameStrip, face, addressOf, glyph, icon } from './os/shell.js';
import { gmail, gmailRow, gmailMessage, mailDate, qbo, qboReportList, qboReport, dataTable, drive, docs, gcal, gcalPopover, monthTitle, messages, imThread, contacts, contactRow } from './os/apps.js';

const CLOCK_MS = 2000;
const STATEMENTS = ['x_pl', 'x_cash', 'x_bs'];
// Which app a system's lines live in, for the source chips and the trace.
const appOfSystem = (s) => (/accounting|purchas|payroll/i.test(s) ? 'qbo' : /inbox|email/i.test(s) ? 'gmail' : /phone|text/i.test(s) ? 'messages' : /calendar/i.test(s) ? 'calendar' : /desk|note/i.test(s) ? 'docs' : 'sheets');

export function round2({ game, show, coach, reduced, onLock, setCleanup }) {
  const w = game.world, M = w.shell.multi, V = w.shell.vocab;
  const btn = (label, onclick, cls = 'ob') => h('button', { class: cls, type: 'button', onclick }, label);
  const person = (k) => game.person(k);
  const n = (x) => x.toLocaleString('en-US');
  const B0 = game.briefing();
  const USER = { name: w.role.label, email: 'you@' + w.shell.company.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '') + '.com' };
  const mail = (k) => addressOf(w.characters[k] || person(k), w.shell.company);
  const groups = (w.sources.x_list && w.sources.x_list.groups) || [['Briefs', ['x_forecast', 'x_pacing', 'x_brief']]];
  const statements = STATEMENTS.filter((id) => w.sources[id]);

  let app = null, shown = game.state.wakeClock, open = {}, trace = null, calTab = 'this', calPopId = null;
  let mailId = null, thread = null, qboDoc = null, driveFile = null, profileKey = null, live = false;
  const seenDoc = {};

  const APPS = [
    { id: 'wake', name: 'Wake', icon: 'wake', title: 'Today - Wake', url: 'app.wake.ai/today', hero: true },
    { id: 'gmail', name: 'Gmail', icon: 'gmail', title: 'Gmail', url: 'mail.google.com/mail/u/0/#inbox' },
    { id: 'qbo', name: 'QuickBooks', icon: 'qbo', title: 'Reports | QuickBooks', url: 'qbo.intuit.com/app/reportlist' },
    { id: 'drive', name: 'Google Drive', icon: 'drive', title: 'Executive briefs - Google Drive', url: 'drive.google.com/drive/folders/wake-briefs' },
    { id: 'calendar', name: 'Google Calendar', icon: 'calendar', title: 'Google Calendar - Week', url: 'calendar.google.com/calendar/u/0/r/week' },
    { id: 'messages', name: 'Messages', icon: 'messages', title: 'Messages', chrome: 'native' },
    { id: 'contacts', name: 'Contacts', icon: 'contacts', title: 'Directory - Google Contacts', url: 'contacts.google.com/directory' },
  ];
  const pc = createComputer({ apps: APPS, user: USER, company: w.shell.company, onOpen: (id) => openApp(id), onHome: () => { app = null; badges(); sfx.back(); coach.emit('desk'); coach.context('desk'); } });
  const overlay = h('div', { class: 'overlay os-ov', hidden: true });
  const strip = gameStrip({ round: 'Step 3 of 6 · With Wake', tone: 'wake', task: 'Decide what matters. Pick ' + game.MIN_PICKS + ' to ' + game.MAX_PICKS + ' insights to hand your team before your ' + w.role.meetingName + ' at 10:00 AM.', onRules: rulesCard });
  show('wake', 'os-screen round2', strip.el, pc.el, overlay);
  const clockLabel = () => w.shell.monday.replace(',', '') + '  ' + fmtClock(shown);
  pc.setClock(clockLabel());

  let ticker = null;
  setCleanup(() => { clearInterval(ticker); coach.stop(); });
  sfx.ambience(1);

  // ------------------------------------------------------------ Wake connects, then the morning runs
  function connect(done) {
    const sys = h('ul', { class: 'wk-sync' }, B0.systems.map((s) => h('li', {}, icon(appOfSystem(s.name) === 'docs' ? 'docs' : appOfSystem(s.name), 'ico wk-sync-ico'), h('span', {}, s.name), h('em', {}, n(s.n) + ' records'), glyph('check', 'gl wk-ok'))));
    const card = h('div', { class: 'wk-connect' }, icon('wake', 'ico wk-connect-ico'), h('h2', {}, 'Wake read your morning'), h('p', {}, n(B0.funnel.records) + ' records from ' + B0.systems.length + ' systems, connected and ranked at 7:48 AM.'), sys);
    pc.el.querySelector('.os-desktop').appendChild(card);
    const items = [...sys.children];
    let i = 0;
    const step = () => { if (i < items.length) { items[i].classList.add('on'); i += 1; setTimeout(step, reduced ? 0 : 140); } else setTimeout(() => { card.classList.add('out'); setTimeout(() => { card.remove(); done(); }, reduced ? 0 : 300); }, reduced ? 0 : 700); };
    setTimeout(step, reduced ? 0 : 300);
  }
  function start() {
    live = true;
    badges(); drawTray();
    ticker = setInterval(() => {
      const r = game.tickWake();
      shown = r.clock; pc.setClock(clockLabel());
      if (r.fired.length) { arrivals(r.fired); badges(); if (app === 'gmail' && !mailId) renderGmail(); if (app === 'messages') renderMessages(); }
      if (app === 'calendar') { const nl = document.querySelector('.gc-now'); if (nl) nl.style.top = ((shown - 7 * 60) / 60 * 48) + 'px'; }
      if (r.atTen && strip.alert.hidden) { strip.alert.hidden = false; strip.alert.replaceChildren(h('b', {}, '10:00 AM'), h('span', {}, ' Your meeting is starting. Lock in your briefing when you\'re ready.')); }
    }, reduced ? 600 : CLOCK_MS);
    tour();
  }

  function badges() {
    pc.badge('wake', live ? game.insights().length : 0);
    pc.badge('gmail', game.unreadR2('email'));
    pc.badge('messages', game.unreadR2('message'));
    pc.badge('qbo', statements.filter((id) => !seenDoc[id]).length);
    pc.badge('drive', groups.flatMap((g) => g[1]).filter((id) => w.sources[id] && !STATEMENTS.includes(id) && !seenDoc[id]).length);
  }
  function arrivals(fired) {
    for (const f of fired) {
      const p = f.from ? person(f.from) : null;
      sfx.alert();
      if (f.kind === 'email') {
        pc.notify({ app: 'gmail', title: p ? p.name : 'New email', text: (w.sources[f.source] || {}).title || '', onclick: () => { mailId = f.source; pc.open('gmail'); openMail(f.source); } });
        setTimeout(() => { const nn = pc.notify({ app: 'wake', title: 'Wake read it', text: f.links.length ? 'It feeds insight #' + f.links.join(', #') + '.' : 'Nothing new. No action needed.', onclick: () => pc.open('wake') }); nn.classList.add('wkn'); }, reduced ? 0 : 900);
      } else {
        const src = w.sources[f.source] || {};
        pc.notify({ app: 'messages', title: p ? p.name : 'New message', text: (src.body || [''])[0] + (f.sharpen ? '  ·  You can send it to Wake.' : ''), onclick: () => { thread = f.from; pc.open('messages'); } });
      }
    }
  }

  function openApp(id) {
    app = id; sfx.blip();
    render(); badges();
    coach.emit('app:' + id); coach.emit('panel:' + id); coach.context(id);
  }
  function render() {
    if (app === 'wake') renderWake();
    else if (app === 'gmail') renderGmail();
    else if (app === 'qbo') renderQbo();
    else if (app === 'drive') renderDrive();
    else if (app === 'calendar') renderCalendar();
    else if (app === 'messages') renderMessages();
    else if (app === 'contacts') renderContacts();
  }
  const fill = (...kids) => pc.body.replaceChildren(...kids.flat().filter(Boolean));

  // ------------------------------------------------------------ Wake
  const shortTitle = (o) => (o.loc && M ? w.locById[o.loc].name : String(o.title || '').split(',')[0]);
  function renderWake() {
    const list = game.insights(), B = game.briefing();
    const picked = list.filter((x) => x.picked).length;
    const scroller = pc.body.querySelector('.wk-main');
    const keep = scroller ? scroller.scrollTop : 0;
    fill(h('div', { class: 'wkapp' },
      h('aside', { class: 'wk-nav' },
        h('div', { class: 'wk-brand' }, icon('wake', 'ico wk-logo'), h('b', {}, 'Wake')),
        h('span', { class: 'wk-ni on' }, glyph('sparkle'), 'Today', h('b', {}, String(list.length))),
        h('button', { class: 'wk-ni', type: 'button', onclick: briefCard }, glyph('check'), 'Your briefing', h('b', {}, String(picked))),
        h('span', { class: 'wk-ni' }, glyph('chart'), 'Briefs'),
        h('span', { class: 'wk-ni' }, glyph('people'), 'Team'),
        h('p', { class: 'wk-nh' }, 'Connected'),
        B.systems.map((s) => h('span', { class: 'wk-sys' }, icon(appOfSystem(s.name), 'ico wk-sys-ico'), h('span', {}, s.name), h('i', { class: 'wk-live' }))),
        h('span', { class: 'wk-sys' }, icon('gmail', 'ico wk-sys-ico'), h('span', {}, 'Gmail'), h('i', { class: 'wk-live' })),
        h('span', { class: 'wk-sys' }, icon('calendar', 'ico wk-sys-ico'), h('span', {}, 'Calendar'), h('i', { class: 'wk-live' })),
        h('span', { class: 'wk-sys off' }, icon('messages', 'ico wk-sys-ico'), h('span', {}, 'Texts'), h('em', {}, 'send to Wake'))),
      h('section', { class: 'wk-main' },
        h('header', { class: 'wa-head' },
          h('div', {}, h('p', { class: 'wa-k' }, w.shell.mondayLong + ' · read at 7:48 AM'), h('h1', {}, 'Good morning. Here\'s what needs you.'),
            h('p', { class: 'wa-sum' }, n(B.funnel.records) + ' records from ' + B.systems.length + ' systems. ' + B.funnel.material + ' signals connected into ' + list.length + ' insights, ranked.')),
          h('div', { class: 'wa-pick' + (picked >= game.MIN_PICKS ? ' ok' : '') }, h('b', {}, picked + ' / ' + game.MIN_PICKS + (picked > game.MIN_PICKS ? '+' : '')), h('span', {}, 'assigned · up to ' + game.MAX_PICKS))),
        h('ol', { class: 'wi-list' }, list.map(insightRow)),
        h('details', { class: 'wk-cleared' }, h('summary', {}, glyph('check'), 'Cleared · ' + B.filtered.length + ' looked unusual, no action needed'),
          h('ul', {}, B.filtered.map((f) => h('li', {}, h('strong', {}, f.label + ' ' + f.value), h('span', {}, f.because ? 'Explained by: ' + f.because : 'Within normal range.')))))),
      trace ? traceDrawer() : null));
    const sc = pc.body.querySelector('.wk-main'); if (sc) sc.scrollTop = keep;
    pc.url('app.wake.ai/today');
  }
  function insightRow(it) {
    const isOpen = !!open[it.id];
    return h('li', { class: 'wi' + (it.picked ? ' picked' : '') + (it.routine ? ' routine' : '') + (it.urgent ? ' urgent' : ''), id: 'in-' + it.id },
      h('div', { class: 'wi-top' }, h('span', { class: 'wi-rank' }, String(it.rank)), h('span', { class: 'wi-place' }, it.place, it.urgent ? h('em', { class: 'wi-today' }, 'Today') : null, it.routine ? h('em', { class: 'wi-rt' }, 'Routine') : null),
        btn(h('span', {}, glyph(it.picked ? 'wi-check' : 'plus'), it.picked ? 'Assigned' : 'Assign'), () => togglePick(it.id), 'ob pick' + (it.picked ? ' on' : ' primary'))),
      h('h3', {}, it.headline),
      h('div', { class: 'wi-built' }, h('span', { class: 'wi-bl' }, 'Built from'),
        h('div', { class: 'wi-srcs' }, it.keys.map((s) => srcChip(it, s)), it.sources.length > it.keys.length ? h('button', { class: 'wi-more', type: 'button', onclick: () => toggle(it.id) }, '+' + (it.sources.length - it.keys.length) + ' more') : null)),
      it.sharpened.length ? h('ul', { class: 'wi-sharp' }, it.sharpened.map((s) => h('li', {}, icon('messages', 'ico sh-ico'), h('b', {}, s.from), ' ' + s.line))) : null,
      h('div', { class: 'wi-do' }, h('span', { class: 'wi-lbl' }, 'Recommended'), h('p', {}, it.action)),
      h('div', { class: 'wi-foot' },
        h('span', { class: 'wi-owners' }, it.owners.map((o) => h('span', { class: 'wi-owner' }, face(o.name, 24), h('span', {}, o.name, h('em', {}, ' · ' + shortTitle(o)))))),
        btn(isOpen ? 'Less' : 'Why', () => toggle(it.id), 'link wi-whybtn')),
      isOpen ? h('div', { class: 'wi-moreinfo' },
        h('p', { class: 'wi-why' }, it.why),
        h('p', { class: 'wi-mono' }, 'Every line behind it · ' + it.signals + ' from ' + it.systems + ' systems'),
        h('div', { class: 'wi-srcs all' }, it.sources.map((s) => srcChip(it, s))),
        h('p', { class: 'wi-check' }, glyph('flag'), 'How you\'ll know it worked: ' + it.check)) : null);
  }
  function srcChip(it, s) {
    return h('button', { class: 'wi-chip' + (s.flagged ? ' flagged-r1' : s.seen ? ' seen-r1' : '') + (trace && trace.key === s.key ? ' on' : ''), type: 'button', title: 'See where this came from', onclick: () => traceOf(it.id, s.key) },
      icon(appOfSystem(s.system), 'ico wi-cico'), h('span', { class: 'wi-cl' }, s.label + (s.value ? ': ' + s.value : '')));
  }
  function toggle(id) { open[id] = !open[id]; renderWake(); sfx.blip(); }
  function togglePick(id) {
    const before = game.state.picked.length, had = game.state.picked.includes(id);
    game.pick(id);
    if (!had && game.state.picked.length === before) { note('You can hand off up to ' + game.MAX_PICKS + '. Unassign one to swap it.'); return; }
    sfx[had ? 'back' : 'coin']();
    renderWake(); drawTray(); badges();
    coach.emit('pick');
  }

  // Trace a line back to where it lived this morning, drawn the way that app shows it.
  function traceOf(iid, key) { trace = { iid, key }; game.traced(key); sfx.blip(); renderWake(); coach.emit('trace'); }
  function traceDrawer() {
    const it = game.insight(trace.iid), t = game.trace(trace.key), ex = t.excerpt;
    const where = appOfSystem(t.source.system);
    let body;
    if (ex.kind === 'report') body = h('div', { class: 'wt-paper ' + where }, h('p', { class: 'wt-ph' }, t.source.title + (t.source.run ? ' · run ' + t.source.run : '')), h('p', { class: 'wt-bk' }, ex.block),
      h('div', { class: 'dscroll' }, h('table', { class: 'dt' }, h('thead', {}, h('tr', {}, ex.cols.map((c) => h('th', {}, c)))), h('tbody', {}, ex.rows.map((r) => h('tr', {}, r.map((c) => h('td', { class: c.hl ? 'wt-hl' : '' }, c.t))))))));
    else if (ex.kind === 'email') body = h('div', { class: 'wt-mail' }, h('p', { class: 'wt-subj' }, ex.title), h('p', { class: 'wt-from' }, t.source.by + (t.source.when ? ' · ' + t.source.when : '')), (ex.body || []).map((x) => h('p', {}, x)));
    else if (ex.kind === 'message') body = h('div', { class: 'wt-im' }, h('p', { class: 'im-time' }, (t.source.by || '') + (t.source.when ? ' · ' + t.source.when : '')), (ex.body || []).map((x) => h('p', { class: 'im-b in' }, x)));
    else if (ex.kind === 'note') body = h('div', { class: 'wt-doc' }, h('p', { class: 'wt-from' }, t.source.by || 'Your notes'), (ex.list || ex.body || []).map((x) => h('p', {}, x)));
    else if (ex.kind === 'calendar') body = h('div', { class: 'wt-cal' }, h('p', { class: 'wt-subj' }, ex.title), h('p', { class: 'wt-from' }, ex.when), ex.lines.map((x) => h('p', {}, x)));
    else body = h('div', { class: 'wt-paper sheets' }, h('table', { class: 'dt' }, h('tbody', {}, (ex.tiles || []).map((x) => h('tr', {}, h('td', {}, x.label), h('td', { class: 'n wt-hl' }, x.value), h('td', {}, x.delta || ''))))));
    const r1 = t.r1.flagged ? 'You flagged this as finding #' + t.r1.flagged + ' in Round 1.' : t.r1.seen ? 'You had this open in Round 1, at ' + t.r1.at + ' in ' + t.r1.in + '.' : 'You never opened this in Round 1.';
    const appName = { qbo: 'QuickBooks', gmail: 'Gmail', messages: 'Messages', calendar: 'Google Calendar', docs: 'Google Docs', sheets: 'Google Sheets' }[where];
    return h('aside', { class: 'wk-drawer', role: 'dialog', 'aria-label': 'Where this came from' },
      h('header', { class: 'wk-dh' }, h('span', {}, 'Where this came from'), h('button', { class: 'gm-ib', type: 'button', 'aria-label': 'Close', onclick: () => { trace = null; coach.emit('traceClosed'); sfx.back(); renderWake(); } }, '✕')),
      h('div', { class: 'wk-dbody' },
        h('h3', {}, t.label), h('p', { class: 'wt-val' }, [t.value, t.delta].filter(Boolean).join(' · ')),
        h('p', { class: 'wt-src' }, icon(where, 'ico wt-ico'), h('span', {}, appName + ' · ' + t.source.title + ' · ' + t.source.system)),
        body,
        h('p', { class: 'wt-r1' + (t.r1.seen ? ' seen' : '') }, r1),
        h('div', { class: 'wt-sec' }, h('b', {}, 'How Wake read it'), h('p', {}, t.reading)),
        h('div', { class: 'wt-sec' }, h('b', {}, 'What it connects to'), h('div', { class: 'wi-srcs' }, it.sources.filter((s) => s.key !== trace.key).map((s) => srcChip(it, s)))),
        h('div', { class: 'wt-sec' }, h('b', {}, 'What Wake concluded'), h('p', {}, it.interpretation)),
        h('div', { class: 'wt-sec' }, h('b', {}, 'Why this action'), h('p', {}, it.whyFirst), h('p', { class: 'wt-do' }, 'Recommended: ' + it.action))));
  }

  // ------------------------------------------------------------ Gmail, read and labeled by Wake
  const wakeChips = (tags) => (tags.length ? [{ text: 'Wake · Insight #' + tags.join(', #'), tone: 'wkc' }] : [{ text: 'Wake · No action', tone: 'dim' }]);
  function renderGmail() {
    if (mailId) return openMail(mailId, true);
    fill(gmail({ user: USER, inboxCount: game.unreadR2('email'), labels: [{ name: 'Wake', color: '#0891B2' }, { name: 'Finance', color: '#16A765' }, { name: 'People', color: '#4986E7' }],
      list: game.listR2('email').map((s) => gmailRow({ name: person(s.from).name, subject: s.title, snippet: (s.body || [''])[0], when: mailDate(s.when, w.shell.monday), unread: !s.opened, on: false, chips: wakeChips(s.tags), onclick: () => openMail(s.id) })) }));
    pc.url('mail.google.com/mail/u/0/#inbox');
  }
  function openMail(id, quiet) {
    const v = game.openR2(id); if (!v) return;
    mailId = id;
    if (!quiet) sfx.blip();
    fill(gmail({ user: USER, inboxCount: game.unreadR2('email'), labels: [], view: gmailMessage({
      subject: v.title, chips: wakeChips(v.tags), from: { name: v.from.name, email: mail(v.from.key) }, to: 'me', cc: v.cc, when: v.when, body: v.body,
      above: h('div', { class: 'wk-banner' + (v.tags.length ? '' : ' dim') }, icon('wake', 'ico wk-b-ico'), h('span', {}, v.tags.length ? 'Already part of insight #' + v.tags.join(', #') + '. Nothing to copy or forward.' : 'Read. Not connected to anything that needs action.'), v.tags.length ? btn('Open in Wake', () => pc.open('wake'), 'ob small tonal') : null),
      onBack: () => { mailId = null; renderGmail(); badges(); } }) }));
    pc.url('mail.google.com/mail/u/0/#inbox/' + id.replace('eml_', 'FMfcg') + 'xWk');
    badges();
  }

  // ------------------------------------------------------------ executive documents
  function spark(vals, tone) {
    const lo = Math.min(...vals), hi = Math.max(...vals), sp = hi - lo || 1, W2 = 72, H2 = 20;
    const pts = vals.map((x, i) => (i / (vals.length - 1) * W2).toFixed(1) + ',' + (H2 - 2 - (x - lo) / sp * (H2 - 4)).toFixed(1)).join(' ');
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); el.setAttribute('viewBox', '0 0 ' + W2 + ' ' + H2); el.setAttribute('width', W2); el.setAttribute('height', H2); el.setAttribute('class', 'xspark' + (tone ? ' ' + tone : '')); el.setAttribute('aria-hidden', 'true');
    const last = pts.split(' ').pop().split(',');
    el.innerHTML = '<polyline fill="none" stroke-width="1.6" points="' + pts + '"/><circle r="2.2" cx="' + last[0] + '" cy="' + last[1] + '"/>'; return el;
  }
  function execBlocks(v) {
    const kpis = (b) => h('div', { class: 'xk' }, b.items.map((k) => h('div', { class: 'xk-i' + (k.tone ? ' ' + k.tone : '') }, h('span', { class: 'xk-l' }, k.label), h('strong', {}, k.value), k.sub ? h('span', { class: 'xk-s' }, k.sub) : null)));
    const text = (b) => h('section', { class: 'x-text' }, b.title ? h('h3', {}, b.title) : null, (b.paras || []).map((p) => h('p', {}, p)), b.bullets ? h('ul', {}, b.bullets.map((x) => h('li', {}, x))) : null);
    const table = (b) => h('section', { class: 'qb-block' }, b.title ? h('h3', {}, b.title) : null, b.note ? h('p', { class: 'qb-bnote' }, b.note) : null,
      h('div', { class: 'dscroll' }, dataTable(b, { cell: (c) => (c.spark ? h('span', { class: 'xsp' }, spark(c.spark, c.tone), c.t ? h('span', {}, c.t) : null) : null), cls: 'fin' })));
    return v.blocks.map((b) => (b.type === 'kpis' ? kpis(b) : b.type === 'text' ? text(b) : table(b)));
  }
  function renderQbo() {
    if (qboDoc) return openStatement(qboDoc, true);
    const items = statements.map((id) => ({ id, title: w.sources[id].title, sub: w.sources[id].sub, unread: !seenDoc[id] }));
    fill(qbo({ company: w.shell.company, user: USER, nav: 'Reports', onNav: () => { qboDoc = null; renderQbo(); },
      banner: h('div', { class: 'qb-banner' }, icon('wake', 'ico wk-b-ico'), h('span', {}, 'Wake reconciled your books with payroll and operations at 7:48 AM. These statements are current as of this morning, not month end.')),
      main: qboReportList({ groups: [['Prepared by Wake this morning', items]], onOpen: (id) => openStatement(id) }) }));
    pc.url('qbo.intuit.com/app/reportlist');
  }
  function openStatement(id, quiet) {
    const v = game.openR2(id); if (!v) return;
    qboDoc = id; seenDoc[id] = true;
    if (!quiet) { sfx.blip(); coach.emit('doc:exec'); }
    const d = v.doc || { company: w.shell.company, title: v.title, period: v.sub, systems: '' };
    fill(qbo({ company: w.shell.company, user: USER, nav: 'Reports', onNav: () => { qboDoc = null; renderQbo(); },
      banner: h('div', { class: 'qb-banner' }, icon('wake', 'ico wk-b-ico'), h('span', {}, 'Prepared by Wake · ' + v.when + (d.systems ? ' · Source: ' + d.systems : ''))),
      main: qboReport({ company: d.company, title: d.title, period: d.period, intro: v.intro, run: v.when, by: 'Confidential · for internal use', content: h('div', { class: 'qb-blocks' }, execBlocks(v)), onBack: () => { qboDoc = null; renderQbo(); badges(); } }) }));
    pc.url('qbo.intuit.com/app/report?rptId=' + id + '&wake=1');
    badges();
  }
  function renderDrive() {
    if (driveFile) return openBrief(driveFile, true);
    const files = [];
    for (const [g, ids] of groups) {
      const keep = ids.filter((id) => w.sources[id] && !STATEMENTS.includes(id));
      if (!keep.length) continue;
      files.push({ group: g });
      for (const id of keep) { const s = w.sources[id]; files.push({ id, type: s.memo ? 'docs' : 'docs', name: s.title, owner: 'Wake', modified: '7:48 AM', size: '—', unread: !seenDoc[id], tag: s.memo ? 'Draft' : null, tagTone: 'wkapp' }); }
    }
    fill(drive({ user: USER, section: 'My Drive', crumbs: ['My Drive', 'Wake', 'Executive briefs'], files, onOpen: (id) => openBrief(id),
      note: h('div', { class: 'gd-note' }, icon('wake', 'ico wk-b-ico'), h('span', {}, 'Wake built these from the same systems as your insights, so the gathering and reconciling is done. Your financial statements are in QuickBooks.')) }));
    pc.url('drive.google.com/drive/folders/wake-briefs');
  }
  function openBrief(id, quiet) {
    const v = game.openR2(id); if (!v) return;
    driveFile = id; seenDoc[id] = true;
    if (!quiet) { sfx.blip(); coach.emit(v.memo ? 'doc:brief' : 'doc:exec'); }
    const back = () => { driveFile = null; renderDrive(); badges(); sfx.back(); };
    if (v.memo) {
      fill(docs({ title: v.title, onBack: back, by: 'Drafted by Wake · ' + v.when, page: [
        h('p', { class: 'doc-meta' }, 'To: ' + v.to + ' · From: You · Draft for your review'),
        h('h1', {}, v.title),
        h('blockquote', {}, h('b', {}, w.characters.boss.name + ' asked: '), '"' + v.ask + '"'),
        v.memo.map((p) => h('p', {}, p)),
        h('p', { class: 'doc-meta' }, 'Every figure in this draft comes from this morning\'s data. Open any insight in Wake to see the lines behind it.')],
        aside: h('div', { class: 'gdoc-comment' }, h('p', { class: 'gc-who' }, icon('wake', 'ico wk-b-ico'), h('b', {}, 'Wake'), h('span', {}, v.when)), h('p', {}, 'Drafted from this morning\'s insights. Review and send when you\'re ready.')) }));
    } else {
      const d = v.doc || { company: w.shell.company, title: v.title, period: v.sub, systems: '' };
      fill(docs({ title: v.title, onBack: back, by: 'Prepared by Wake · ' + v.when, page: [
        h('p', { class: 'doc-meta' }, d.company + ' · ' + d.period + (d.systems ? ' · Source: ' + d.systems : '')), h('h1', {}, d.title), v.intro ? h('p', {}, v.intro) : null, execBlocks(v),
        h('p', { class: 'doc-meta' }, 'Confidential · for internal use')] }));
    }
    pc.url('docs.google.com/document/d/1' + id + 'Wk/edit');
    badges();
  }

  // ------------------------------------------------------------ Calendar, with Wake's holds
  const TONE = { meeting: 'blue', review: 'green', deadline: 'red', block: 'gray', wake: 'wake' };
  const allDay = (t) => !/\d{1,2}:\d{2}/.test(String(t || ''));
  function renderCalendar() {
    const v = game.openR2('cal') || game.view('cal');
    const dates = calTab === 'this' ? v.dates : calTab === 'last' ? v.lastDates : v.nextDates;
    const today = v.today.concat(v.wakeToday || []);
    const columns = dates.map((_, d) => (calTab === 'this' && d === 0
      ? today.map((e) => ({ title: (e.kind === 'wake' ? 'Wake: ' : '') + e.title, start: e.start, end: e.end, place: e.place, tone: (e.wake && e.kind !== 'wake' ? 'wk-note ' : '') + (TONE[e.kind] || 'blue'), onclick: e.detail ? () => calPop(e) : null }))
      : v.weeks[calTab].filter((e) => e.day === d && !e.ref).map((e) => ({ title: e.title, start: e.time, allDay: allDay(e.time), tone: e.wake ? 'blue wk-note' : e.detail ? 'blue' : 'gray', onclick: e.detail ? () => calPop(e) : null }))));
    const all = today.concat(...Object.values(v.weeks));
    const pe = calPopId ? all.find((e) => e.id === calPopId) : null;
    fill(gcal({ user: USER, monthLabel: monthTitle(w.shell.monday), dates, columns, nowMin: calTab === 'this' ? shown : null, todayIndex: calTab === 'this' ? 0 : -1,
      onPrev: () => { calTab = calTab === 'next' ? 'this' : 'last'; calPopId = null; renderCalendar(); },
      onNext: () => { calTab = calTab === 'last' ? 'this' : 'next'; calPopId = null; renderCalendar(); },
      onToday: () => { calTab = 'this'; calPopId = null; renderCalendar(); },
      side: h('div', { class: 'gc-wk' }, icon('wake', 'ico wk-b-ico'), h('span', {}, 'Dashed holds are Wake\'s suggestions: the time today\'s decisions will take.')),
      popover: pe ? calPopover(pe, v) : null }));
    pc.url('calendar.google.com/calendar/u/0/r/week');
    const now = pc.body.querySelector('.gc-now'); if (now && !pe) now.scrollIntoView({ block: 'center' });
  }
  function calPop(e) { calPopId = e.id; sfx.blip(); renderCalendar(); }
  function calPopover(e, v) {
    const dt = e.detail || {};
    const when = e.start ? w.shell.mondayLong + ' · ' + e.start + ' – ' + e.end : (calTab === 'this' ? v.dates : calTab === 'last' ? v.lastDates : v.nextDates)[e.day] + ' · ' + e.time;
    return gcalPopover({ title: e.title, when, place: e.place, color: e.kind === 'wake' ? '#0891B2' : e.kind === 'review' ? '#33B679' : '#039BE5',
      people: (dt.people || []).map((p) => ({ name: p.name, title: p.title })),
      lines: (dt.review ? [h('table', { class: 'dt mini' }, h('thead', {}, h('tr', {}, h('th', {}, 'Goal'), h('th', {}, 'Target'), h('th', { class: 'n' }, 'Now'))), h('tbody', {}, dt.review.map(([g, t, x]) => h('tr', {}, h('td', {}, g), h('td', {}, t), h('td', { class: 'n' }, x)))))] : []).concat((dt.lines || []).map((l) => h('p', {}, l))),
      extra: e.wake ? h('div', { class: 'wk-banner' }, icon('wake', 'ico wk-b-ico'), h('span', {}, e.wake)) : null,
      onClose: () => { calPopId = null; sfx.back(); renderCalendar(); } });
  }

  // ------------------------------------------------------------ Messages, with send to Wake
  function threads() {
    const by = {};
    for (const s of game.listR2('message')) (by[s.from] = by[s.from] || []).push(s);
    return Object.entries(by).map(([from, list]) => ({ from, list: list.slice().sort((a, b) => a.arrivedAt - b.arrivedAt), unread: list.some((s) => !s.opened), last: list.reduce((m, s) => Math.max(m, s.arrivedAt), 0), sendable: list.some((s) => s.sendable) }))
      .sort((a, b) => b.last - a.last || (b.unread - a.unread));
  }
  function renderMessages() {
    const ts = threads();
    const t = thread ? ts.find((x) => x.from === thread) : null;
    if (t) for (const s of t.list) game.openR2(s.id);
    fill(messages({
      threads: ts.map((x) => { const last = x.list[x.list.length - 1]; return imThread({ name: person(x.from).name, preview: last.body[last.body.length - 1], when: mailDate(last.when, w.shell.monday), unread: x.unread && x.from !== thread, on: x.from === thread, tag: x.sendable ? h('em', { class: 'im-wk' }, icon('wake', 'ico im-wk-ico'), 'Can send to Wake') : null, onclick: () => { thread = x.from; sfx.blip(); renderMessages(); coach.emit('thread'); } }); }),
      current: !!t,
      header: t ? [h('span', { class: 'im-to' }, 'To: ', h('b', {}, person(t.from).name)), h('span', { class: 'im-sub' }, person(t.from).title)] : null,
      bubbles: t ? t.list.map((s) => h('div', { class: 'im-group', id: 'mg-' + s.id },
        h('p', { class: 'im-time' }, s.when || ''), s.body.map((line) => h('p', { class: 'im-b in' }, line)),
        s.sent ? h('span', { class: 'im-sent' }, icon('wake', 'ico im-wk-ico'), 'Sent to Wake' + (w.sharpen[s.id].finding ? ' · insight #' + game.insight(w.sharpen[s.id].finding).rank : '')) :
          s.sendable ? btn(h('span', {}, icon('wake', 'ico im-wk-ico'), 'Send to Wake'), () => send(s.id), 'ob im-send') : null)) : null,
    }));
    badges();
  }
  async function send(id) {
    const from = document.getElementById('mg-' + id);
    const r = game.putThrough(id); if (!r) return;
    sfx.zoom();
    if (from && !reduced) {
      const a = from.getBoundingClientRect(), d = document.querySelector('.dock-app[data-app="wake"]'), b = d ? d.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight };
      const fly = h('div', { class: 'flyer-os' }, icon('wake', 'ico'));
      Object.assign(fly.style, { left: a.left + 20 + 'px', top: a.top + 20 + 'px' });
      document.body.appendChild(fly);
      requestAnimationFrame(() => Object.assign(fly.style, { transform: 'translate(' + (b.left - a.left - 10) + 'px, ' + (b.top - a.top - 10) + 'px) scale(.6)', opacity: '0.2' }));
      await new Promise((res) => setTimeout(res, 650)); fly.remove();
    }
    sfx.credit();
    const nn = pc.notify({ app: 'wake', title: r.finding ? 'Added to insight #' + r.rank : 'Wake read it', text: r.line, onclick: () => pc.open('wake') }); nn.classList.add('wkn');
    if (r.also) setTimeout(() => { const n2 = pc.notify({ app: 'wake', title: 'And to insight #' + r.also.rank, text: r.also.line }); n2.classList.add('wkn'); }, 500);
    renderMessages(); badges();
    coach.emit('sent');
  }

  // ------------------------------------------------------------ Contacts: who has what
  function renderContacts() {
    const asg = game.assignments(), team = game.view('team');
    const row = (p, job) => contactRow({ name: p.name, email: mail(p.key), job,
      labels: asg[p.key] ? asg[p.key].map((a) => '#' + a.rank + ' ' + a.headline) : [],
      extra: asg[p.key] ? null : h('span', { class: 'quiet' }, 'Nothing from you yet') });
    fill(contacts({ user: USER, title: 'Directory', note: h('div', { class: 'gd-note' }, icon('wake', 'ico wk-b-ico'), h('span', {}, 'Each insight comes matched to the person who owns that part of the business. Labels update as you assign.')),
      rows: [h('p', { class: 'gco-group' }, 'Central team'), team.central.map((p) => row(p, p.title)), h('p', { class: 'gco-group' }, M ? 'Location managers' : 'On site'), team.managers.map((p) => row(p, p.loc && M ? V.mgrTitle + ', ' + p.loc.name : p.title))] }));
  }

  // ------------------------------------------------------------ your briefing
  function drawTray() {
    const k = game.state.picked.length, ok = game.r2Ready();
    strip.right.replaceChildren(
      h('button', { class: 'gs-findings wake-tray', type: 'button', onclick: briefCard },
        h('span', {}, 'Your briefing'), h('b', { class: ok ? 'ok' : '' }, k + ' / ' + game.MIN_PICKS + (k > game.MIN_PICKS ? '+' : '')),
        h('span', { class: 'slots' }, Array.from({ length: game.MAX_PICKS }, (_, i) => h('i', { class: i < k ? 'on' : i < game.MIN_PICKS ? 'need' : '' })))),
      btn(ok ? 'Lock in my briefing' : 'Assign ' + (game.MIN_PICKS - k) + ' more', ok ? briefCard : () => pc.open('wake'), 'ob' + (ok ? ' primary' : ' quiet')));
  }
  function briefCard() {
    const list = game.insights().filter((x) => x.picked);
    sfx.blip();
    card('findings-card', h('h2', {}, 'Your briefing'),
      h('p', {}, list.length ? 'This is what you\'ll hand your team at 10:00, in Wake\'s priority order.' : 'Nothing assigned yet. Open Wake and assign ' + game.MIN_PICKS + ' to ' + game.MAX_PICKS + ' insights.'),
      h('ol', { class: 'finding-list' }, list.map((it) => h('li', { class: 'finding-row' }, h('span', { class: 'fnum cy' }, String(it.rank)),
        h('div', {}, h('span', { class: 'fr-src' }, it.place), h('strong', {}, it.headline), h('p', {}, it.action), h('span', { class: 'quiet' }, 'Owner: ' + it.owners.map((o) => o.name).join(' and '))),
        h('div', { class: 'row-tools' }, btn('Remove', () => { game.pick(it.id); briefCard(); drawTray(); if (app === 'wake') renderWake(); }, 'chip'))))),
      h('div', { class: 'row' }, game.r2Ready() ? btn('Lock in my briefing', () => { closeCard(); lock(); }, 'ob primary') : h('span', { class: 'quiet' }, 'Assign at least ' + game.MIN_PICKS + ' to lock in.'), btn('Keep working', () => { closeCard(); sfx.back(); }, 'link')));
  }
  function lock() { if (!game.lockRound2()) return; sfx.start(); coach.stop(); onLock(); }

  function card(cls, ...kids) { overlay.hidden = false; overlay.replaceChildren(h('div', { class: 'dialog ' + cls, role: 'dialog' }, ...kids)); overlay.scrollTop = 0; }
  function closeCard() { overlay.hidden = true; overlay.replaceChildren(); }
  function note(text) { const el = h('div', { class: 'os-tip', role: 'status' }, text); document.querySelector('.os-desktop').appendChild(el); setTimeout(() => el.remove(), 5000); }
  function rulesCard() {
    card('rules-card', h('h2', {}, 'How this works'),
      h('ul', { class: 'mini-rules' },
        h('li', {}, 'Wake is in your dock: every insight from this morning, ranked, with the data behind it.'),
        h('li', {}, 'Click any source on an insight to see exactly what it said and where it came from.'),
        h('li', {}, 'Assign ' + game.MIN_PICKS + ' to ' + game.MAX_PICKS + ' insights. Owners are already matched.'),
        h('li', {}, 'Texts aren\'t in any system. Send one to Wake from Messages and it lands where it belongs.'),
        h('li', {}, 'QuickBooks has statements current to this morning. Drive has your executive briefs and a drafted Thursday brief. Gmail and Calendar are labeled by Wake.'),
        h('li', {}, 'Lock in your briefing before your ' + w.role.meetingName + ' at 10:00 AM.')),
      h('div', { class: 'row' }, btn('Back to work', closeCard, 'ob primary')));
  }

  // ------------------------------------------------------------ the tour
  function tour() {
    // Wake first; then, back on the desktop, a short tour of the rest of the dock that holds the
    // screen until it's done; then each app explains itself.
    const boss = w.characters.boss.name.split(' ')[0];
    const step = (text, target, next = 'NEXT ▶') => ({ text, target, next, modal: true, when: () => coach.seen('app:wake') });
    coach.chapters({
      desk: [
        { text: 'Same computer, same Monday, same 7:48 AM, same data. This time Wake is connected to all of it, and it read everything before you sat down.', target: '.os-dock', next: 'NEXT ▶', once: true },
        { text: 'Open Wake. Everything you dug through in Round 1 is already read, connected and ranked there.', target: '.dock-app[data-app="wake"]', wait: 'app:wake', hint: 'Open Wake', skipIf: () => coach.seen('app:wake') },
        step('A quick tour of the rest of your dock. Texts still land in Messages, and they aren\'t in any system. Send one to Wake and it goes straight to the insight it belongs to.', '.dock-app[data-app="messages"]'),
        step('QuickBooks now has statements current to this morning, not month end: income statement, cash flow and balance sheet.', '.dock-app[data-app="qbo"]'),
        step('Drive holds your executive briefs, and Thursday\'s brief for ' + boss + ' is already drafted. You review it. You don\'t write it.', '.dock-app[data-app="drive"]'),
        step('Gmail is connected. Wake has read every email, and each one is labeled with the insight it feeds.', '.dock-app[data-app="gmail"]'),
        step('Your calendar carries Wake\'s suggested holds: the time today\'s decisions will need.', '.dock-app[data-app="calendar"]'),
        step('When you\'ve assigned ' + game.MIN_PICKS + ' to ' + game.MAX_PICKS + ', lock in your briefing. Your meeting is at 10:00 AM. The computer is yours.', '.wake-tray', 'LET\'S GO ▶'),
      ],
      wake: [
        { text: 'These are your insights, ranked. Each one starts with the data behind it: the same lines from this morning\'s reports, inbox and phone, already connected.', target: '.wi', next: 'NEXT ▶' },
        { text: 'Click any source to see exactly what it said and where it came from.', target: '.wi .wi-chip', wait: 'trace', hint: 'Click a source', skipIf: () => coach.seen('trace') },
        { text: 'That\'s the original line, as it arrived this morning, and how Wake read it. Go as deep as you like, or don\'t. Close it when you\'re done.', target: '.wk-dbody', inline: true, wait: 'traceClosed', hint: 'Close it when you\'re done', when: () => !!document.querySelector('.wk-dbody') },
        { text: 'Your call now. Pick ' + game.MIN_PICKS + ' to ' + game.MAX_PICKS + ' to hand to your team. Each one already has an owner.', target: '.wi .pick', wait: 'pick', hint: 'Assign one', skipIf: () => coach.seen('pick') },
        { text: 'Close Wake for a quick tour of the rest of your computer.', target: '.os-window .l-r', wait: 'desk', hint: 'Click the red button' },
      ],
      drive: [
        { text: 'Every document here ties to the same numbers behind your insights, and none of them waited for month end. Read them the way an owner would: where is the business going, and what only you can move.', target: '.gd-table', next: 'GOT IT ▶', once: true },
      ],
      messages: [
        { text: 'Texts that belong to an insight can be sent to Wake. Send one and watch where it lands.', target: '.im-list', next: 'GOT IT ▶', once: true },
      ],
      gmail: [
        { text: 'Each email is labeled with the insight it already feeds, or that it needs nothing from you. Nothing to forward.', target: '.gm-list', next: 'GOT IT ▶', once: true },
      ],
      calendar: [
        { text: 'The dashed holds are Wake\'s suggestions: the time today\'s decisions will take. Click any meeting to see what it means now.', target: '.gc-pane', next: 'GOT IT ▶', once: true },
      ],
    }, 'desk');
  }

  // go
  setTimeout(() => connect(start), reduced ? 0 : 250);
}
