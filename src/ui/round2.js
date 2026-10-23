// ROUND 2: WITH WAKE
// The same computer, the same Monday, the same Sample ERP. The difference is that Wake is built into
// the ERP now, and it read everything before you sat down: the ERP's modules, the inbox, the
// calendar. The dashboard looks the same, but every indicator says why it moved and which insight it
// feeds; a Wake portlet ranks what needs you; the Wake tab holds every insight with the lines behind
// it; Reports holds the standard statements, current to this morning, beside the reports Wake
// prepared. Texts (which live in no system) can be sent to Wake. The player's job is the one only
// they can do: decide.
// Renders what the engine returns. No business logic lives here.

import { h } from './art.js';
import { sfx } from './arcade/sound.js';
import { fmtClock } from '../engine/config.js';
import { createComputer, gameStrip, face, addressOf, glyph, icon } from './os/shell.js';
import { gmail, gmailRow, gmailMessage, mailDate, dataTable, gcal, gcalPopover, monthTitle, messages, imThread, contacts, contactRow } from './os/apps.js';
import { erp, portlet, pageHead, filters, reportList, subtabs, fileCabinet, docPage, hashOf, ERP_NAME, ERP_HOST, SCORE_FILE, erpModel, homePage, reportGroups, scoreBlocks, scoreTabs } from './os/erp.js';

const CLOCK_MS = 2000;
const STATEMENTS = ['x_pl', 'x_cash', 'x_bs'];
// Which app a system's lines live in, for the source chips and the trace. Everything the business
// records is in the ERP; mail, texts and the calendar are the other sources Wake reads.
const appOfSystem = (s) => (/inbox|email/i.test(s) ? 'gmail' : /phone|text/i.test(s) ? 'messages' : /calendar/i.test(s) ? 'calendar' : 'erp');
const APP_NAME = { erp: ERP_NAME, gmail: 'Gmail', messages: 'Messages', calendar: 'Google Calendar' };
const WAKE = { name: 'Wake', icon: 'wake' };

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

  const model = erpModel(w), { locIds, sysOf } = model;

  let app = null, shown = game.state.wakeClock, open = {}, trace = null, calTab = 'this', calPopId = null;
  let mailId = null, thread = null, erpTab = 'home', erpDoc = null, sheetTab = null, live = false;
  const seenDoc = {};

  const APPS = [
    { id: 'erp', name: ERP_NAME, icon: 'erp', title: 'Home - ' + ERP_NAME, url: ERP_HOST + '/app/center/card.nl', hero: true },
    { id: 'gmail', name: 'Gmail', icon: 'gmail', title: 'Gmail', url: 'mail.google.com/mail/u/0/#inbox' },
    { id: 'calendar', name: 'Google Calendar', icon: 'calendar', title: 'Google Calendar - Week', url: 'calendar.google.com/calendar/u/0/r/week' },
    { id: 'messages', name: 'Messages', icon: 'messages', title: 'Messages', chrome: 'native' },
    { id: 'contacts', name: 'Contacts', icon: 'contacts', title: 'Directory - Google Contacts', url: 'contacts.google.com/directory' },
  ];
  const pc = createComputer({ apps: APPS, user: USER, company: w.shell.company, onOpen: (id) => openApp(id), onHome: () => { app = null; badges(); sfx.back(); coach.emit('desk'); if (coach.seen('erp:reports')) coach.emit('desk:back'); coach.context('desk'); } });
  const overlay = h('div', { class: 'overlay os-ov', hidden: true });
  const strip = gameStrip({ round: 'Step 3 of 6 · With Wake', tone: 'wake', task: 'Decide what matters. Pick ' + game.MIN_PICKS + ' to ' + game.MAX_PICKS + ' insights to hand your team before your ' + w.role.meetingName + ' at 10:00 AM.', onRules: rulesCard });
  show('wake', 'os-screen round2', strip.el, pc.el, overlay);
  const clockLabel = () => w.shell.monday.replace(',', '') + '  ' + fmtClock(shown);
  pc.setClock(clockLabel());

  let ticker = null;
  setCleanup(() => { clearInterval(ticker); coach.stop(); });
  sfx.ambience(1);

  // ------------------------------------------------------------ the morning runs
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

  const wakeDocs = () => groups.flatMap((g) => g[1]).filter((id) => w.sources[id] && !STATEMENTS.includes(id));
  const erpBadge = () => ({ wake: live ? game.insights().filter((x) => !x.picked).length : 0, reports: statements.concat(wakeDocs()).filter((id) => !seenDoc[id]).length });
  function badges() {
    const b = erpBadge();
    pc.badge('erp', b.wake + b.reports);
    pc.badge('gmail', game.unreadR2('email'));
    pc.badge('messages', game.unreadR2('message'));
    if (app === 'erp') pc.body.querySelectorAll('.ns-tab').forEach((t) => { const n2 = b[t.dataset.tab]; let i2 = t.querySelector('.ns-badge'); if (!n2) { if (i2) i2.remove(); return; } if (!i2) { i2 = h('i', { class: 'ns-badge' }); t.appendChild(i2); } i2.textContent = String(n2); });
  }
  const goWake = () => { if (app !== 'erp') pc.open('erp'); erpTo('wake'); };
  function arrivals(fired) {
    for (const f of fired) {
      const p = f.from ? person(f.from) : null;
      sfx.alert();
      if (f.kind === 'email') {
        pc.notify({ app: 'gmail', title: p ? p.name : 'New email', text: (w.sources[f.source] || {}).title || '', onclick: () => { mailId = f.source; pc.open('gmail'); openMail(f.source); } });
        setTimeout(() => { const nn = pc.notify({ app: 'erp', as: WAKE, title: 'Wake read it', text: f.links.length ? 'It feeds insight #' + f.links.join(', #') + '.' : 'Nothing new. No action needed.', onclick: goWake }); nn.classList.add('wkn'); }, reduced ? 0 : 900);
      } else {
        const src = w.sources[f.source] || {};
        pc.notify({ app: 'messages', title: p ? p.name : 'New message', text: (src.body || [''])[0] + (f.sharpen ? '  ·  You can send it to Wake.' : ''), onclick: () => { thread = f.from; pc.open('messages'); } });
      }
    }
  }

  const ctxOf = (tab) => (tab === 'wake' ? 'wake' : tab === 'reports' ? 'reports' : 'erp');
  function openApp(id) {
    app = id; sfx.blip();
    render(); badges();
    coach.emit('app:' + id); coach.emit('panel:' + id); coach.context(id === 'erp' ? ctxOf(erpTab) : id);
  }
  function render() {
    if (app === 'erp') renderErp();
    else if (app === 'gmail') renderGmail();
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
    const sys = B.systems.map((x) => h('span', { class: 'wk-sys' }, icon('erp', 'ico wk-sys-ico'), h('span', {}, x.name), h('i', { class: 'wk-live' })));
    frame('wake', h('div', { class: 'wkapp' },
      h('aside', { class: 'wk-nav' },
        h('span', { class: 'wk-ni on' }, glyph('sparkle'), 'Today', h('b', {}, String(list.length))),
        h('button', { class: 'wk-ni', type: 'button', onclick: briefCard }, glyph('check'), 'Your briefing', h('b', {}, String(picked))),
        h('button', { class: 'wk-ni', type: 'button', onclick: () => erpTo('reports') }, glyph('chart'), 'Wake reports'),
        h('p', { class: 'wk-nh' }, 'Reading ' + (B.systems.length + 3) + ' sources'),
        h('p', { class: 'wk-nsub' }, ERP_NAME), sys,
        h('p', { class: 'wk-nsub' }, 'Everything else'),
        h('span', { class: 'wk-sys' }, icon('gmail', 'ico wk-sys-ico'), h('span', {}, 'Gmail'), h('i', { class: 'wk-live' })),
        h('span', { class: 'wk-sys' }, icon('calendar', 'ico wk-sys-ico'), h('span', {}, 'Calendar'), h('i', { class: 'wk-live' })),
        h('span', { class: 'wk-sys off' }, icon('messages', 'ico wk-sys-ico'), h('span', {}, 'Texts'), h('em', {}, 'send to Wake')),
        h('p', { class: 'wk-nfoot' }, 'Your ERP is one source. Wake connects natively to the rest of your stack too.')),
      h('section', { class: 'wk-main' },
        h('header', { class: 'wa-head' },
          h('div', {}, h('p', { class: 'wa-k' }, 'Wake in ' + ERP_NAME + ' · ' + w.shell.mondayLong + ' · read at 7:48 AM'), h('h1', {}, 'Good morning. Here\'s what needs you.'),
            h('p', { class: 'wa-sum' }, n(B.funnel.records) + ' records from ' + B.systems.length + ' systems. ' + B.funnel.material + ' signals connected into ' + list.length + ' insights, ranked.')),
          h('div', { class: 'wa-pick' + (picked >= game.MIN_PICKS ? ' ok' : '') }, h('b', {}, picked + ' / ' + game.MIN_PICKS + (picked > game.MIN_PICKS ? '+' : '')), h('span', {}, 'assigned · up to ' + game.MAX_PICKS))),
        h('ol', { class: 'wi-list' }, list.map(insightRow)),
        h('details', { class: 'wk-cleared' }, h('summary', {}, glyph('check'), 'Cleared · ' + B.filtered.length + ' looked unusual, no action needed'),
          h('ul', {}, B.filtered.map((f) => h('li', {}, h('strong', {}, f.label + ' ' + f.value), h('span', {}, f.because ? 'Explained by: ' + f.because : 'Within normal range.')))))),
      trace ? traceDrawer() : null));
    const sc = pc.body.querySelector('.wk-main'); if (sc) sc.scrollTop = keep;
    pc.url(ERP_HOST + '/app/wake/today.nl');
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
  function toggle(id) { open[id] = !open[id]; rerender(); sfx.blip(); }
  const rerender = () => { if (app === 'erp') renderErp(); };
  function togglePick(id) {
    const before = game.state.picked.length, had = game.state.picked.includes(id);
    game.pick(id);
    if (!had && game.state.picked.length === before) { note('You can hand off up to ' + game.MAX_PICKS + '. Unassign one to swap it.'); return; }
    sfx[had ? 'back' : 'coin']();
    rerender(); drawTray(); badges();
    coach.emit('pick');
  }

  // Trace a line back to where it lived this morning, drawn the way that app shows it.
  function traceOf(iid, key) { trace = { iid, key }; game.traced(key); sfx.blip(); renderWake(); coach.emit('trace'); }
  // From a figure anywhere in the ERP straight to the insight it feeds, opened at that line.
  function goTrace(iid, key) {
    if (app !== 'erp') pc.open('erp');
    erpTab = 'wake'; erpDoc = null; open[iid] = true; trace = { iid, key }; game.traced(key); sfx.blip();
    renderWake(); badges(); coach.context('wake'); coach.emit('erp:wake'); coach.emit('trace');
    setTimeout(() => { const el = document.getElementById('in-' + iid); if (el) el.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); }, 60);
  }
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
    const appName = APP_NAME[where];
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
  // the insight a source feeds, opened at the line it gave
  const openTag = (id, rank) => { const it = game.insights()[rank - 1], k = it.sources.find((x) => (w.sources[id].lines || []).includes(x.key)); goTrace(it.id, (k || it.sources[0]).key); };
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
      above: h('div', { class: 'wk-banner' + (v.tags.length ? '' : ' dim') }, icon('wake', 'ico wk-b-ico'), h('span', {}, v.tags.length ? 'Already part of insight #' + v.tags.join(', #') + '. Nothing to copy or forward.' : 'Read. Not connected to anything that needs action.'), v.tags.length ? btn('Open in Wake', () => openTag(id, v.tags[0]), 'ob small tonal') : null),
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
  // ------------------------------------------------------------ Sample ERP, with Wake built in
  // The same dashboard, reports and scorecards as Round 1. Wake adds what was missing: what each
  // number means, which insight it feeds, and who owns it.
  const insOf = (sid) => game.insights().filter((it) => it.sources.some((x) => x.key === sid));
  const cleared = (sid) => B0.filtered.find((f) => f.key === sid);
  const tagsOf = (id) => { const lines = id === SCORE_FILE ? locIds.flatMap((x) => w.sources[x].lines || []) : (w.sources[id] || {}).lines || [];
    return game.insights().filter((it) => it.sources.some((x) => lines.includes(x.key))).map((it) => it.rank); };
  const first = (sid) => insOf(sid)[0];

  function frame(tab, main) {
    fill(erp({ company: w.shell.company, user: USER, role: w.role.label, tab, onTab: erpTo, main, wake: true, badge: erpBadge() }));
  }
  function renderErp() {
    if (erpTab === 'wake') return renderWake();
    if (erpDoc) return openErp(erpDoc, true);
    if (erpTab === 'reports') return erpReports();
    if (erpTab === 'documents') return erpFiles();
    erpHome();
  }
  function erpTo(tab) {
    erpTab = tab; erpDoc = null; if (tab !== 'wake') trace = null;
    renderErp(); badges(); sfx.blip(); coach.context(ctxOf(tab)); coach.emit('erp:' + tab);
  }
  function openErp(id, quiet) {
    const k = (w.sources[id] || {}).kind;
    if (id === SCORE_FILE || k === 'location') return openScorecards(id === SCORE_FILE ? sheetTab || locIds[0] : id, quiet);
    if (k === 'note') return openNote(id, quiet);
    if (STATEMENTS.includes(id) || wakeDocs().includes(id)) return openExec(id, quiet);
    return openReport(id, quiet);
  }

  // A figure: the same number, now marked with the insight it feeds.
  const fig = (sid, cls) => {
    const s = w.signals[sid], it = first(sid);
    if (!it) return h('span', { class: 'ns-fig ' + (cls || '') }, s.cell || s.value);
    return h('button', { type: 'button', class: 'figbtn wk-fig ' + (cls || ''), title: 'See why in Wake', onclick: () => goTrace(it.id, sid) }, s.cell || s.value, h('i', { class: 'wnum' }, '#' + it.rank));
  };
  const wakeCell = (c) => {
    if (!c.s) return null;
    const it = first(c.s); if (!it) return null;
    const b = h('button', { type: 'button', class: 'figbtn wk-fig', title: 'Feeds insight #' + it.rank + '. See why in Wake.', onclick: () => goTrace(it.id, c.s) }, c.t || '·', h('i', { class: 'wnum' }, '#' + it.rank));
    b.dataset.cls = 'wk-hit';
    return b;
  };
  // What Wake says about each indicator: why it moved, or why it needs nothing.
  const wakeCol = {
    row: (sid) => (first(sid) ? 'wk-row' : ''),
    cell: (sid) => {
      const it = first(sid), c = cleared(sid), s = w.signals[sid];
      if (it) return h('button', { class: 'ns-wnote hit', type: 'button', onclick: () => goTrace(it.id, sid) }, h('b', {}, '#' + it.rank), h('span', {}, it.headline));
      if (c) return h('span', { class: 'ns-wnote ok' }, glyph('check'), h('span', {}, c.because ? 'Explained: ' + c.because : 'Explained. No action.'));
      return h('span', { class: 'ns-wnote dim' }, s.kind === 'explainer' ? 'Explains another line. No action.' : 'Checked. No action needed.');
    },
    meter: (sid) => { const it = first(sid), c = cleared(sid);
      return h('span', { class: 'ns-wm' + (it ? ' hit' : '') }, icon('wake', 'ico ns-wk-ico'), it ? 'Insight #' + it.rank : c ? 'Explained' : 'Normal'); },
  };
  function wakePortlet() {
    const list = game.insights(), top = list.slice(0, 5);
    return portlet('Wake · what needs you this morning', h('div', { class: 'ns-wkb' },
      h('p', { class: 'ns-wks' }, n(B0.funnel.records) + ' records read at 7:48 AM. ' + B0.funnel.material + ' signals connected into ' + list.length + ' insights. ' + B0.filtered.length + ' unusual numbers explained, no action needed.'),
      h('ol', { class: 'ns-wkl' }, top.map((it) => h('li', { class: it.picked ? 'picked' : '' },
        h('span', { class: 'ns-wkr' }, String(it.rank)),
        h('button', { class: 'ns-wkh', type: 'button', onclick: () => goTrace(it.id, it.keys[0].key) }, h('em', {}, it.place), h('b', {}, it.headline)),
        h('span', { class: 'ns-wko' }, it.owners.slice(0, 2).map((o) => face(o.name, 22))),
        btn(h('span', {}, glyph(it.picked ? 'wi-check' : 'plus'), it.picked ? 'Assigned' : 'Assign'), () => togglePick(it.id), 'ob small pick' + (it.picked ? ' on' : ' primary'))))),
      h('button', { class: 'ns-link ns-wkall', type: 'button', onclick: () => erpTo('wake') }, 'See all ' + list.length + ' insights in Wake', glyph('chevR'))), { cls: 'ns-wkp', sub: 'Ranked by Wake' });
  }
  function erpHome() {
    frame('home', homePage({ w, model, fig, rolled: () => true, onOpen: (id) => openErp(id), wake: wakeCol, top: wakePortlet() }));
    pc.url(ERP_HOST + '/app/center/card.nl?sc=-29');
  }

  // Reports: the standard statements, current to this morning, the reports Wake prepared, and every
  // report from Round 1, now marked with what Wake found in it.
  function erpReports() {
    const mine = (id) => ({ id, title: w.sources[id].title, tag: w.sources[id].memo ? 'Draft for you' : 'Wake', cls: w.sources[id].memo ? 'wk memo' : 'wk' });
    const extra = [];
    if (statements.length) extra.push(['Financial statements · current to 7:48 AM', statements.map((id) => ({ id, title: w.sources[id].title, tag: 'Reconciled by Wake', cls: 'stmt' }))]);
    for (const [g, ids] of groups) { const keep = ids.filter((id) => w.sources[id] && !STATEMENTS.includes(id)); if (keep.length) extra.push(['Wake reports · ' + g, keep.map(mine)]); }
    const tag = (id) => { const t = tagsOf(id); return t.length ? 'Wake · #' + t.join(', #') : 'Wake · nothing new'; };
    frame('reports', reportList({ groups: reportGroups({ w, model, rolled: () => true, extra, tag }), onOpen: (id) => openErp(id),
      note: h('div', { class: 'wk-banner' }, icon('wake', 'ico wk-b-ico'), h('span', {}, 'Your standard reports are all still here. Wake read every one at 7:48 AM, and the statements are current to this morning, not month end.')) }));
    pc.url(ERP_HOST + '/app/reporting/reportcenter.nl');
  }
  const wakeBar = (id) => { const t = tagsOf(id);
    return h('div', { class: 'wk-banner' + (t.length ? '' : ' dim') }, icon('wake', 'ico wk-b-ico'),
      h('span', {}, t.length ? 'Wake read this at 7:48 AM. It feeds insight #' + t.join(', #') + '. Marked figures open the insight.' : 'Wake read this at 7:48 AM. Nothing in it needs you this week.')); };
  function openReport(id, quiet) {
    const v = game.openR2(id); if (!v) return;
    if (!quiet) sfx.blip();
    erpDoc = id; erpTab = 'reports';
    frame('reports', h('div', { class: 'ns-rep' },
      pageHead(v.title, { sub: 'Saved search · ' + sysOf(id) + ' · run ' + (v.run || v.when || '6:00 AM'), back: () => erpTo('reports') }),
      wakeBar(id),
      filters([['Period', 'This week'], ['Subsidiary', w.shell.company], [M ? 'Location' : 'Site', M ? 'All' : w.shell.company]]),
      v.intro ? h('p', { class: 'ns-intro' }, v.intro) : null,
      h('div', { class: 'ns-blocks' }, v.blocks.map((b) => h('section', { class: 'ns-block' }, b.title ? h('h3', {}, b.title) : null, b.note ? h('p', { class: 'ns-bnote' }, b.note) : null, h('div', { class: 'dscroll' }, dataTable(b, { cell: wakeCell, cls: 'ns-grid' }))))),
      h('p', { class: 'ns-foot' }, 'Owner: ' + v.from.name + ', ' + v.from.title + ' · synced from ' + sysOf(id))));
    pc.url(ERP_HOST + '/app/common/search/searchresults.nl?searchid=' + hashOf(id) % 900);
    if (!quiet) coach.emit('doc:report');
  }
  function openScorecards(tab, quiet) {
    sheetTab = tab;
    const v = game.openR2(tab); if (!v) return;
    if (!quiet) sfx.blip();
    erpDoc = SCORE_FILE; erpTab = 'reports';
    const { blocks, intro } = scoreBlocks(w, v, tab, person);
    const tabs = scoreTabs(w, locIds);
    frame('reports', h('div', { class: 'ns-rep' },
      pageHead(M ? 'Location scorecards' : 'Weekly scorecard', { sub: 'Week ending ' + w.shell.weekEnd.replace(/^\w+, /, '') + ' · updated ' + (v.when || ''), back: () => erpTo('reports') }),
      wakeBar(tab),
      tabs.length > 1 ? subtabs(tabs, tab, (t) => openScorecards(t)) : null,
      h('p', { class: 'ns-intro' }, intro),
      h('div', { class: 'ns-blocks' }, blocks.map((b) => h('section', { class: 'ns-block' }, b.title ? h('h3', {}, b.title) : null, h('div', { class: 'dscroll' }, dataTable(b, { cell: wakeCell, cls: 'ns-grid' })))))));
    pc.url(ERP_HOST + '/app/center/scorecard.nl?loc=' + (locIds.indexOf(tab) + 1));
  }
  // A statement or a Wake report, opened from Reports.
  function openExec(id, quiet) {
    const v = game.openR2(id); if (!v) return;
    erpDoc = id; erpTab = 'reports'; seenDoc[id] = true;
    if (!quiet) { sfx.blip(); coach.emit(v.memo ? 'doc:brief' : 'doc:exec'); }
    const back = () => { erpTo('reports'); };
    const d = v.doc || { company: w.shell.company, title: v.title, period: v.sub, systems: '' };
    if (v.memo) {
      frame('reports', docPage({ title: v.title, by: 'Drafted by Wake · ' + v.when + ' · for your review', back, page: [
        h('p', { class: 'doc-meta' }, 'To: ' + v.to + ' · From: You · Draft for your review'),
        h('blockquote', {}, h('b', {}, w.characters.boss.name + ' asked: '), '"' + v.ask + '"'),
        v.memo.map((p) => h('p', {}, p)),
        h('p', { class: 'doc-meta' }, 'Every figure in this draft comes from this morning\'s data. Open any insight in the Wake tab to see the lines behind it.')],
        aside: h('div', { class: 'ns-cmt' }, h('p', {}, icon('wake', 'ico wk-b-ico'), h('b', {}, 'Wake'), h('span', {}, v.when)), h('p', {}, 'Drafted from this morning\'s insights. Review and send when you\'re ready.')) }));
    } else {
      frame('reports', docPage({ title: d.title, by: (STATEMENTS.includes(id) ? 'Reconciled by Wake' : 'Prepared by Wake') + ' · ' + v.when + (d.systems ? ' · Source: ' + d.systems : ''), back, page: [
        h('p', { class: 'doc-meta' }, d.company + ' · ' + d.period), v.intro ? h('p', {}, v.intro) : null, h('div', { class: 'ns-exec' }, execBlocks(v)),
        h('p', { class: 'doc-meta' }, 'Confidential · for internal use')] }));
    }
    pc.url(ERP_HOST + '/app/reporting/reportrunner.nl?cr=' + (hashOf(id) % 400) + '&wake=1');
    badges();
  }
  function erpFiles() {
    const boss = w.characters.boss;
    frame('documents', fileCabinet({ folders: ['Management', 'Location managers', 'Templates', 'Exports', 'Contracts'], folder: 'Management',
      files: [{ id: 'note_role', name: 'Note from ' + boss.name, owner: boss.name, modified: 'Fri', size: '2 KB' }, { id: 'note_mine', name: '1:1 notes - last week', owner: 'You', modified: 'Fri', size: '4 KB' }],
      onOpen: (id) => openErp(id) }));
    pc.url(ERP_HOST + '/app/common/media/mediaitemfolders.nl');
  }
  function openNote(id, quiet) {
    const v = game.openR2(id); if (!v) return;
    if (!quiet) sfx.blip();
    erpDoc = id; erpTab = 'documents';
    const boss = w.characters.boss;
    const page = id === 'note_role'
      ? [h('p', { class: 'doc-meta' }, 'From ' + boss.name + ', ' + boss.title), h('h2', {}, 'Before Monday'), v.body.map((x) => h('p', {}, x))]
      : [h('p', { class: 'doc-meta' }, 'Your notes · last week\'s 1:1s'), h('h2', {}, '1:1 notes'), h('ul', {}, v.list.map((x) => h('li', {}, x)))];
    frame('documents', h('div', {}, docPage({ title: id === 'note_role' ? 'Note from ' + boss.name : '1:1 notes - last week', by: id === 'note_role' ? 'Shared by ' + boss.name : 'Last edited last week', back: () => erpTo('documents'), page, aside: wakeBar(id) })));
    pc.url(ERP_HOST + '/core/media/media.nl?id=' + hashOf(id) % 9000);
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
      const a = from.getBoundingClientRect(), d = document.querySelector('.dock-app[data-app="erp"]'), b = d ? d.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight };
      const fly = h('div', { class: 'flyer-os' }, icon('wake', 'ico'));
      Object.assign(fly.style, { left: a.left + 20 + 'px', top: a.top + 20 + 'px' });
      document.body.appendChild(fly);
      requestAnimationFrame(() => Object.assign(fly.style, { transform: 'translate(' + (b.left - a.left - 10) + 'px, ' + (b.top - a.top - 10) + 'px) scale(.6)', opacity: '0.2' }));
      await new Promise((res) => setTimeout(res, 650)); fly.remove();
    }
    sfx.credit();
    const nn = pc.notify({ app: 'erp', as: WAKE, title: r.finding ? 'Added to insight #' + r.rank : 'Wake read it', text: r.line, onclick: goWake }); nn.classList.add('wkn');
    if (r.also) setTimeout(() => { const n2 = pc.notify({ app: 'erp', as: WAKE, title: 'And to insight #' + r.also.rank, text: r.also.line, onclick: goWake }); n2.classList.add('wkn'); }, 500);
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
      btn(ok ? 'Lock in my briefing' : 'Assign ' + (game.MIN_PICKS - k) + ' more', ok ? briefCard : goWake, 'ob' + (ok ? ' primary' : ' quiet')));
  }
  function briefCard() {
    const list = game.insights().filter((x) => x.picked);
    sfx.blip();
    card('findings-card', h('h2', {}, 'Your briefing'),
      h('p', {}, list.length ? 'This is what you\'ll hand your team at 10:00, in Wake\'s priority order.' : 'Nothing assigned yet. Open the Wake tab in ' + ERP_NAME + ' and assign ' + game.MIN_PICKS + ' to ' + game.MAX_PICKS + ' insights.'),
      h('ol', { class: 'finding-list' }, list.map((it) => h('li', { class: 'finding-row' }, h('span', { class: 'fnum cy' }, String(it.rank)),
        h('div', {}, h('span', { class: 'fr-src' }, it.place), h('strong', {}, it.headline), h('p', {}, it.action), h('span', { class: 'quiet' }, 'Owner: ' + it.owners.map((o) => o.name).join(' and '))),
        h('div', { class: 'row-tools' }, btn('Remove', () => { game.pick(it.id); briefCard(); drawTray(); rerender(); badges(); }, 'chip'))))),
      h('div', { class: 'row' }, game.r2Ready() ? btn('Lock in my briefing', () => { closeCard(); lock(); }, 'ob primary') : h('span', { class: 'quiet' }, 'Assign at least ' + game.MIN_PICKS + ' to lock in.'), btn('Keep working', () => { closeCard(); sfx.back(); }, 'link')));
  }
  function lock() { if (!game.lockRound2()) return; sfx.start(); coach.stop(); onLock(); }

  function card(cls, ...kids) { overlay.hidden = false; overlay.replaceChildren(h('div', { class: 'dialog ' + cls, role: 'dialog' }, ...kids)); overlay.scrollTop = 0; }
  function closeCard() { overlay.hidden = true; overlay.replaceChildren(); }
  function note(text) { const el = h('div', { class: 'os-tip', role: 'status' }, text); document.querySelector('.os-desktop').appendChild(el); setTimeout(() => el.remove(), 5000); }
  function rulesCard() {
    card('rules-card', h('h2', {}, 'How this works'),
      h('ul', { class: 'mini-rules' },
        h('li', {}, 'Same ' + ERP_NAME + ', with Wake built in. The dashboard shows what needs you, and every indicator says why it moved.'),
        h('li', {}, 'The Wake tab has every insight, ranked. Click any source to see exactly what it said and where it came from.'),
        h('li', {}, 'Assign ' + game.MIN_PICKS + ' to ' + game.MAX_PICKS + ' insights. Owners are already matched.'),
        h('li', {}, 'Reports has your statements current to this morning, plus the reports Wake prepared.'),
        h('li', {}, 'Texts aren\'t in any system. Send one to Wake from Messages and it lands where it belongs.'),
        h('li', {}, 'Lock in your briefing before your ' + w.role.meetingName + ' at 10:00 AM.')),
      h('div', { class: 'row' }, btn('Back to work', closeCard, 'ob primary')));
  }

  // ------------------------------------------------------------ the tour
  function tour() {
    // One guided path everybody goes through, in order: the dashboard explained, the Wake tab, a
    // trace, an assignment, then the Wake reports (the drafted brief and a statement). Each step
    // holds the screen until it's done (`modal` waits for NEXT, `force` for the one click it asks
    // for). Then a short look at the rest of the dock, and the computer is yours.
    const boss = w.characters.boss.name.split(' ')[0];
    const after = () => coach.seen('erp:reports') && coach.seen('desk:back');
    const step = (text, target, next = 'NEXT ▶') => ({ text, target, next, modal: true, when: after });
    const doc = () => !!document.querySelector('.ns-doc');
    const memo = !!wakeDocs().find((id) => w.sources[id].memo);
    coach.chapters({
      desk: [
        { text: 'Same computer, same Monday, same 7:48 AM, same data. Same ' + ERP_NAME + '. The difference: Wake is built into it now, and it read everything before you sat down. A quick tour first.', target: '.os-dock', next: 'NEXT ▶', modal: true },
        { text: 'Open ' + ERP_NAME + '. It will look familiar.', target: '.dock-app[data-app="erp"]', wait: 'app:erp', hint: 'Open ' + ERP_NAME, force: true, skipIf: () => coach.seen('app:erp') },
        step('Texts still land in Messages, and they aren\'t in any system. Send one to Wake and it goes straight to the insight it belongs to.', '.dock-app[data-app="messages"]'),
        step('Gmail is connected too. Wake has read every email, and each one is labeled with the insight it feeds.', '.dock-app[data-app="gmail"]'),
        step('Your calendar carries Wake\'s suggested holds: the time today\'s decisions will need.', '.dock-app[data-app="calendar"]'),
        step('That\'s the tour. Assign ' + game.MIN_PICKS + ' to ' + game.MAX_PICKS + ' insights, then lock in your briefing. Your meeting is at 10:00 AM. The computer is yours.', '.wake-tray', 'LET\'S GO ▶'),
      ],
      erp: [
        { text: 'Your dashboard, exactly as you left it. One new portlet: what needs you this morning, ranked, out of ' + n(B0.funnel.records) + ' records.', target: '.ns-wkp', next: 'NEXT ▶', modal: true },
        { text: 'And every indicator now says why it moved: the insight it feeds, or why it needs nothing from you. Marked figures open the insight.', target: '.ns-kpi', next: 'NEXT ▶', modal: true },
        { text: 'You can assign right from the dashboard. For the full picture, open the Wake tab.', target: '.ns-tab[data-tab="wake"]', wait: 'erp:wake', hint: 'Open the Wake tab', force: true, skipIf: () => coach.seen('erp:wake') },
      ],
      wake: [
        { text: 'These are your insights, ranked. Each one starts with the data behind it: lines from your ERP, inbox and phone, already connected.', target: '.wi', next: 'NEXT ▶', modal: true },
        { text: 'Click any source to see exactly what it said and where it came from.', target: '.wi .wi-chip', wait: 'trace', hint: 'Click a source', force: true, skipIf: () => coach.seen('trace') },
        { text: 'That\'s the original line, where it lives in your systems, and how Wake read it. Close it when you\'re done.', target: '.wk-drawer', inline: true, wait: 'traceClosed', hint: 'Close it when you\'re done', force: true, when: () => !!document.querySelector('.wk-dbody') },
        { text: 'Your call now. Assign this one: it goes to its owner with the numbers attached. Each insight already has an owner.', target: '.wi .pick', wait: 'pick', hint: 'Assign one', force: true, skipIf: () => coach.seen('pick') },
        { text: 'Now the reports Wake prepared for you. Open Reports.', target: '.ns-tab[data-tab="reports"]', wait: 'erp:reports', hint: 'Open Reports', force: true, skipIf: () => coach.seen('erp:reports') },
      ],
      reports: [
        { text: 'Every standard report is still here, now tagged with what Wake found in it. At the top: your income statement, cash flow and balance sheet, current to this morning instead of month end, and the reports Wake prepared.', target: '.ns-rlg', next: 'NEXT ▶', modal: true },
        { text: memo ? 'Start with this one: Thursday\'s brief for ' + boss + ', already drafted by Wake.' : 'Open one of the reports Wake prepared.', target: memo ? '.ns-rli.memo' : '.ns-rli.wk', wait: ['doc:brief', 'doc:exec'], hint: 'Open it', force: true },
        { text: (memo ? 'Every figure in this draft comes from this morning\'s data, so you review it instead of writing it. ' : 'Wake builds these from the same lines as your insights. ') + 'Nothing to gather, reconcile or format.', target: '.ns-doc', next: 'NEXT ▶', modal: true, when: doc },
        { text: 'Back to Reports.', target: '.ns-back', wait: 'erp:reports', hint: 'Click Back', force: true, when: doc },
        { text: 'Now open your income statement.', target: '.ns-rli.stmt', wait: 'doc:exec', hint: 'Open it', force: true, skipIf: () => !statements.length },
        { text: 'Reconciled by Wake across your accounting, payroll and operations at 7:48 AM. The numbers you\'d normally wait for month end to see, current to this morning.', target: '.ns-doc', next: 'NEXT ▶', modal: true, when: doc, skipIf: () => !statements.length },
        { text: 'Close ' + ERP_NAME + ' for a quick look at the rest of your computer.', target: '.os-window .l-r', wait: 'desk', hint: 'Click the red button', force: true, skipIf: () => coach.seen('desk:back') },
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
  setTimeout(start, reduced ? 0 : 250);
}
