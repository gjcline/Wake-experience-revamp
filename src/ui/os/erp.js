// NETSUITE
// The one system the company already runs on, with every report, scorecard and number in one
// place, laid out the way NetSuite is: a dark header with global search, a row of top tabs, a
// dashboard of portlets, saved searches, a report list, reports with a filter bar, a File Cabinet.
// Round 1 shows it as it is on any Monday: everything is there, nothing is explained. Round 2 is
// the same system with Wake built into it. These are the building blocks; the rounds fill them.

import { h } from '../art.js';
import { face, glyph, icon } from './shell.js';

export const ERP_NAME = 'Sample ERP';
export const ERP_HOST = 'app.sample-erp.com';

// Small deterministic numbers for the filler (reminder counts, record numbers, chart bars).
export function hashOf(s) { let x = 2166136261; for (const c of String(s)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; }
export const pick = (seed, n, lo, hi) => Array.from({ length: n }, (_, i) => lo + (hashOf(seed + ':' + i) % (hi - lo + 1)));

const TABS = [['home', 'Home'], ['activities', 'Activities'], ['transactions', 'Transactions'], ['lists', 'Lists'], ['reports', 'Reports'], ['analytics', 'Analytics'], ['documents', 'Documents'], ['setup', 'Setup']];

// The frame: header, tabs, page. `live` lists the tabs that open something; the rest show the
// "not part of this demo" note. `wake` adds the Wake tab (Round 2).
export function erp({ company, user, role, tab, onTab, main, wake = false, live = ['home', 'reports', 'documents'], badge = {} }) {
  const tabs = TABS.slice();
  if (wake) tabs.splice(1, 0, ['wake', 'Wake']);
  return h('div', { class: 'ns' + (wake ? ' with-wake' : '') },
    h('header', { class: 'ns-head' },
      h('span', { class: 'ns-brand' }, icon('erp', 'ico ns-mark'), h('b', {}, ERP_NAME)),
      h('label', { class: 'ns-search' }, glyph('search'), h('span', {}, 'Search')),
      h('span', { class: 'ns-hr' },
        h('span', { class: 'ns-help' }, 'Help'),
        h('span', { class: 'ns-role' }, h('b', {}, company), h('em', {}, role)),
        face(user.name, 28, '#5F6368'))),
    h('nav', { class: 'ns-tabs', role: 'tablist' }, tabs.map(([id, label]) => {
      const on = live.includes(id) || id === 'wake';
      return h('button', { class: 'ns-tab' + (tab === id ? ' on' : '') + (on ? '' : ' dead') + (id === 'wake' ? ' wk' : ''), type: 'button', role: 'tab', 'data-tab': id, 'aria-selected': String(tab === id), onclick: on ? () => onTab(id) : null },
        id === 'home' ? glyph('home') : id === 'wake' ? icon('wake', 'ico ns-wk-ico') : null, id === 'home' ? null : h('span', {}, label), badge[id] ? h('i', { class: 'ns-badge' }, String(badge[id])) : null);
    })),
    h('div', { class: 'ns-page' + (tab === 'wake' ? ' flush' : '') }, main));
}

// A dashboard portlet: a titled box with a small toolbar.
export function portlet(title, body, { cls = '', sub, tools = true } = {}) {
  return h('section', { class: 'ns-pt ' + cls },
    h('header', { class: 'ns-pth' }, h('b', {}, title), sub ? h('span', { class: 'ns-pts' }, sub) : null, tools ? h('span', { class: 'ns-ptt' }, glyph('refresh'), glyph('more')) : null),
    h('div', { class: 'ns-ptb' }, body));
}

// A page title row with a few buttons the suites always have.
export function pageHead(title, { sub, actions = ['Customize', 'Export', 'Print'], back, backTo = 'Reports' } = {}) {
  return h('div', { class: 'ns-ph' },
    back ? h('button', { class: 'ns-back', type: 'button', onclick: back }, glyph('chevL'), 'Back to ' + backTo) : null,
    h('div', { class: 'ns-pht' }, h('h1', {}, title), sub ? h('p', {}, sub) : null),
    h('span', { class: 'ns-pha' }, actions.map((a) => h('span', { class: 'ns-btn dead' }, a))));
}

// The filter bar above a report.
export function filters(list) {
  return h('div', { class: 'ns-flt' }, list.map(([k, v]) => h('span', { class: 'ns-fl' }, h('label', {}, k), h('span', { class: 'ns-sel' }, v, glyph('chevD')))), h('span', { class: 'ns-btn dead ns-refresh' }, 'Refresh'));
}

// The report list: groups of report links. Items with an id open; the rest are the dozens of
// standard reports every company has and nobody opens on a Monday.
export function reportList({ groups, onOpen, note }) {
  return h('div', { class: 'ns-rl' },
    pageHead('Reports', { sub: 'Standard and saved reports', actions: ['New saved search'] }),
    note || null,
    h('div', { class: 'ns-rlg' }, groups.map(([title, items]) => h('section', { class: 'ns-rlc' },
      h('h2', {}, title),
      h('ul', {}, items.map((it) => h('li', {}, it.id
        ? h('button', { class: 'ns-rli live' + (it.unread ? ' unread' : '') + (it.tone ? ' ' + it.tone : '') + (it.cls ? ' ' + it.cls : ''), type: 'button', onclick: () => onOpen(it.id) }, h('span', {}, it.title), it.unread ? h('i', { class: 'ns-new' }, 'New') : null, it.tag ? h('em', { class: 'ns-tag' }, it.tag) : null)
        : h('span', { class: 'ns-rli dead' }, it.title))))))));
}

// Subtabs, used for the scorecards (one per location).
export function subtabs(list, on, onPick) {
  return h('div', { class: 'ns-sub' }, list.map((t) => h('button', { class: 'ns-subt' + (t.id === on ? ' on' : ''), type: 'button', onclick: () => onPick(t.id) }, t.name)));
}

// The File Cabinet: folders on the left, files on the right.
export function fileCabinet({ folders, folder, files, onOpen }) {
  return h('div', { class: 'ns-fc' },
    pageHead('File Cabinet', { sub: 'Documents shared with you', actions: ['Add file', 'New folder'] }),
    h('div', { class: 'ns-fcb' },
      h('ul', { class: 'ns-fct' }, folders.map((f) => h('li', { class: f === folder ? 'on' : 'dead' }, glyph('file'), f))),
      h('table', { class: 'ns-grid' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Name'), h('th', {}, 'Owner'), h('th', {}, 'Modified'), h('th', {}, 'Size'))),
        h('tbody', {}, files.map((f) => h('tr', { class: f.unread ? 'unread' : '' },
          h('td', {}, h('button', { class: 'ns-link', type: 'button', onclick: () => onOpen(f.id) }, glyph('file'), f.name, f.unread ? h('i', { class: 'ns-new' }, 'New') : null)),
          h('td', {}, f.owner), h('td', {}, f.modified), h('td', {}, f.size)))))));
}

// A document opened from the File Cabinet, or a brief.
export function docPage({ title, by, back, backTo, page, aside }) {
  return h('div', { class: 'ns-docw' },
    pageHead(title, { sub: by, actions: ['Download', 'Share'], back, backTo }),
    h('div', { class: 'ns-docb' }, h('article', { class: 'ns-doc' }, page), aside || null));
}

// ------------------------------------------------------------------ the company's ERP, filled in
// Both rounds show the same system with the same numbers. Round 2 passes a `wake` column and a
// Wake portlet; nothing else moves.
export const SCORE_FILE = 'scorecards';
export function erpModel(w) {
  const reportIds = w.order.report || [], locIds = w.order.location || [];
  const where = (sid) => (w.signals[sid].sources || []).find((x) => w.sources[x] && ['report', 'location'].includes(w.sources[x].kind) && x !== 'loc_all');
  const sysOf = (id) => w.system[id] || w.system[(w.sources[id] || {}).kind] || 'ERP';
  // The dashboard's indicators: the numbers that matter this week are in there, among everything else.
  const want = new Set();
  for (const f of w.findings) { const c = (f.core || []).concat(f.evidence || []).find((id) => w.signals[id] && where(id)); if (c) want.add(c); }
  for (const id of w.obvious || []) if (w.signals[id] && where(id)) want.add(id);
  const rest = Object.keys(w.signals).filter((id) => !want.has(id) && where(id) && w.signals[id].value && !/request|assumption|invite|plan/.test(w.signals[id].value));
  rest.sort((x, y) => hashOf(x) - hashOf(y));
  const KPIS = [...want, ...rest.slice(0, Math.max(0, 26 - want.size))].sort((x, y) => hashOf(w.shell.company + x) - hashOf(w.shell.company + y));
  const METERS = (w.obvious || []).filter((id) => w.signals[id] && where(id)).slice(0, 4);
  // Every report the business runs, grouped the way the suites group them.
  const GROUP = (id) => { const sy = sysOf(id); return /account/i.test(sy) ? 'Financial' : /purchas/i.test(sy) ? 'Purchasing' : /payroll|hr|people/i.test(sy) ? 'People' : /crm|review|customer/i.test(sy) ? 'Customers' : 'Operations'; };
  const FILLER = { Financial: ['Income statement', 'Balance sheet', 'Trial balance', 'General ledger', 'A/R aging', 'Budget vs. actual'], Purchasing: ['Open purchase orders', 'Vendor spend', 'Receiving log'], People: ['Payroll register', 'Headcount by department', 'Time-off balances'], Customers: ['Sales by customer', 'Customer balance detail', 'Open cases'], Operations: ['Inventory valuation', 'Work orders', 'Asset register'] };
  return { reportIds, locIds, where, sysOf, KPIS, METERS, GROUP, FILLER };
}
export const tone = (d) => (/^-/.test(String(d || '')) ? 'dn' : /^\+/.test(String(d || '')) ? 'up' : '');

// The Home dashboard. `fig(sid, cls)` draws a figure; `wake` adds a column to the indicators;
// `top` goes above the meters.
export function homePage({ w, model, fig, onOpen, rolled, wake, top }) {
  const M = w.shell.multi, V = w.shell.vocab, seed = w.shell.company, { reportIds, locIds, KPIS, METERS, where, sysOf } = model;
  const rem = ['Purchase orders to approve', 'Bills past due', 'Time cards to review', 'Items below reorder point', 'Open support cases', 'Journal entries to post', 'Customer returns to process', 'Expense reports to approve']
    .map((t, i) => [pick(seed + 'rem', 8, 2, 24)[i], t]);
  const bars = pick(seed + 'rev', 8, 58, 100);
  const chart = h('div', { class: 'ns-chart' }, bars.map((v, i) => h('span', { style: { height: v + '%' } }, h('em', {}, 'W' + (i + 1)))));
  const kpiRows = KPIS.map((sid) => { const s = w.signals[sid];
    return h('tr', { class: wake ? wake.row(sid) : '' }, h('td', {}, s.label), h('td', { class: 'n' }, fig(sid)), h('td', { class: 'n ' + tone(s.delta) }, s.delta || ''), h('td', { class: 'ns-dim' }, sysOf(where(sid))), wake ? h('td', { class: 'ns-wcell' }, wake.cell(sid)) : null); });
  const scoreName = M ? 'Location scorecards' : 'Weekly scorecard';
  const saved = reportIds.map((id) => h('li', {}, h('button', { class: 'ns-link' + (rolled(id) ? '' : ' unread'), type: 'button', onclick: () => onOpen(id) }, glyph('chart'), w.sources[id].title)))
    .concat(locIds.length ? [h('li', {}, h('button', { class: 'ns-link' + (locIds.some((id) => !rolled(id)) ? ' unread' : ''), type: 'button', onclick: () => onOpen(SCORE_FILE) }, glyph('chart'), scoreName))] : [])
    .concat(['Open sales orders', 'Inventory valuation', 'Customer balance detail', 'Payroll register', 'Vendor spend by month'].map((t) => h('li', {}, h('span', { class: 'ns-link dead' }, glyph('chart'), t))));
  const recs = pick(seed + 'rec', 6, 1000, 9999);
  const recent = ['Invoice', 'Purchase order', 'Bill', 'Sales order', 'Journal', 'Item receipt'].map((t, i) => h('li', {}, h('span', { class: 'ns-link dead' }, t + ' #' + recs[i]), h('em', {}, ['6:52 AM', '6:40 AM', 'Fri', 'Fri', 'Fri', 'Thu'][i])));
  return h('div', { class: 'ns-dash' },
    h('div', { class: 'ns-dh' }, h('h1', {}, 'Home'), h('p', {}, w.shell.mondayLong + ' · ' + w.role.label + ' dashboard · data as of 6:00 AM')),
    h('div', { class: 'ns-cols' + (wake ? ' wk' : '') },
      h('div', { class: 'ns-col ns-side' },
        portlet('Reminders', h('ul', { class: 'ns-rem' }, rem.map(([n, t]) => h('li', {}, h('b', {}, String(n)), h('span', { class: 'dead' }, t))))),
        portlet('Saved searches', h('ul', { class: 'ns-list' }, saved)),
        portlet('Recent records', h('ul', { class: 'ns-list rec' }, recent))),
      h('div', { class: 'ns-col ns-main' },
        top || null,
        portlet('KPI meters', h('div', { class: 'ns-meters' }, METERS.map((sid) => { const s = w.signals[sid]; return h('div', { class: 'ns-meter' }, h('span', {}, s.label), fig(sid, 'big'), h('em', { class: tone(s.delta) }, s.delta || ''), wake ? wake.meter(sid) : null); }))),
        portlet('Key performance indicators', h('div', { class: 'dscroll' }, h('table', { class: 'ns-grid ns-kpi' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Indicator'), h('th', { class: 'n' }, 'This week'), h('th', { class: 'n' }, 'Change'), h('th', {}, 'Source'), wake ? h('th', { class: 'ns-wth' }, icon('wake', 'ico ns-wk-ico'), 'Wake') : null)),
          h('tbody', {}, kpiRows))), { sub: KPIS.length + ' indicators' })),
      h('div', { class: 'ns-col ns-side' },
        portlet('Revenue by week', chart, { sub: 'Last 8 weeks' }),
        locIds.length > 1 ? portlet(M ? 'Locations' : 'Scorecard', h('ul', { class: 'ns-list' }, locIds.map((id) => h('li', {}, h('button', { class: 'ns-link' + (rolled(id) ? '' : ' unread'), type: 'button', onclick: () => onOpen(id) }, glyph('pin'), id === 'loc_all' ? 'All ' + V.units : w.sources[id].title))))) : null,
        portlet('Announcements', h('p', { class: 'ns-ann' }, 'Q3 close calendar is posted. Period 7 locks Friday at 5:00 PM.')))));
}

// The standard report groups. `extra` groups go first (Round 2 puts Wake's there).
export function reportGroups({ w, model, rolled, extra = [], tag }) {
  const { reportIds, locIds, GROUP, FILLER } = model, M = w.shell.multi;
  const groups = Object.keys(FILLER).map((g) => [g, reportIds.filter((id) => GROUP(id) === g).map((id) => ({ id, title: w.sources[id].title, unread: !rolled(id), tag: tag ? tag(id) : null })).concat(FILLER[g].map((t) => ({ title: t })))]);
  if (locIds.length) groups.push(['Scorecards', [{ id: SCORE_FILE, title: M ? 'Location scorecards' : 'Weekly scorecard', unread: locIds.some((id) => !rolled(id)), tag: tag ? tag(SCORE_FILE) : null }, { title: 'Scorecard history' }, { title: 'Targets by location' }]]);
  return extra.concat(groups);
}

// A scorecard tab as report blocks.
export function scoreBlocks(w, v, tab, person) {
  const M = w.shell.multi, V = w.shell.vocab;
  const sig = (key, value) => (w.signals[key] && w.signals[key].cell) || value;
  if (tab === 'loc_all') return { intro: 'Same measures as each scorecard. This week.',
    blocks: [{ title: 'All ' + V.units + ' side by side', cols: ['Measure'].concat(w.locations.map((L) => L.name)), rows: v.rows.map((r) => ({ cells: [{ t: r.label }].concat(r.cells.map((c) => ({ t: sig(c.key, c.value) + (c.delta ? '  (' + c.delta + ')' : ''), s: c.key, flag: c.flag }))) })) }] };
  const L = w.locById[w.sources[tab].loc], p = person(L.manager);
  return { intro: L.street + ' · ' + v.sub + ' · ' + p.name + ', ' + p.title,
    blocks: [
      { title: (M ? L.name : w.shell.company) + ' · weekly scorecard', cols: ['Measure', 'This week', 'Compared with'], rows: v.tiles.map((t) => ({ cells: [{ t: t.label }, { t: sig(t.key, t.value), s: t.key, flag: t.flag }, { t: t.delta || '' }] })) },
      { title: 'Manager\'s note for the week', cols: ['From', 'Note'], rows: [{ cells: [{ t: p.name }, { t: '"' + v.note + '"' }] }] },
    ] };
}
export const scoreTabs = (w, locIds) => locIds.map((id) => ({ id, name: id === 'loc_all' ? 'All ' + w.shell.vocab.units : w.sources[id].title }));
