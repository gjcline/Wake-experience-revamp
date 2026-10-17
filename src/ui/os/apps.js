// THE APPS
// Gmail, QuickBooks Online, Google Calendar, Messages, Google Drive with Sheets and Docs, and
// Google Contacts, drawn to look and behave like the real thing. Each builder takes plain data
// and callbacks and returns DOM; the rounds decide what goes in them. No game logic here.

import { h } from '../art.js';
import { icon, glyph, face } from './shell.js';

const btn = (label, onclick, cls) => h('button', { class: cls, type: 'button', onclick }, label);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// "Mon, Jun 1" + "Sun 9:14 PM" -> "May 31". Today's items keep their time, like Gmail.
export function mailDate(when, monday) {
  const s = String(when || '');
  if (/^\d{1,2}:\d{2}\s?[AP]M$/i.test(s.trim())) return s.trim();
  const full = s.match(/^[A-Z][a-z]{2},\s*([A-Z][a-z]{2})\s+(\d+)/);
  if (full) return full[1] + ' ' + full[2];
  const dm = s.match(/^([A-Z][a-z]{2})\b/);
  const m = String(monday).match(/([A-Z][a-z]{2})\s+(\d+)/);
  if (!dm || !m || DAYS.indexOf(dm[1]) < 0) return s;
  const back = (1 - DAYS.indexOf(dm[1]) + 7) % 7 || 7;
  const d = new Date(2026, MONTHS.indexOf(m[1]), Number(m[2]) - back);
  return MONTHS[d.getMonth()] + ' ' + d.getDate();
}
export const monthTitle = (monday) => { const m = String(monday).match(/([A-Z][a-z]{2})\s+\d+/); const full = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']; return m ? full[MONTHS.indexOf(m[1])] + ' 2026' : ''; };

// ------------------------------------------------------------------ Gmail
export function gmail({ user, inboxCount, nav = 'inbox', labels = [], list, view, toolbarExtra }) {
  return h('div', { class: 'gm' },
    h('header', { class: 'gm-head' },
      h('span', { class: 'gm-burger' }, glyph('menu')),
      h('span', { class: 'gm-logo' }, icon('gmail', 'ico gm-mark'), h('span', {}, 'Gmail')),
      h('label', { class: 'gm-search' }, glyph('search'), h('span', {}, 'Search mail')),
      h('span', { class: 'gm-hright' }, glyph('grid', 'gl gm-hg'), face(user.name, 32, '#5F6368'))),
    h('div', { class: 'gm-main' },
      h('aside', { class: 'gm-nav' },
        h('span', { class: 'gm-compose' }, glyph('note'), 'Compose'),
        [['inbox', 'Inbox', inboxCount], ['star', 'Starred'], ['clock', 'Snoozed'], ['send', 'Sent'], ['file', 'Drafts']].map(([g, l, c]) =>
          h('span', { class: 'gm-ni' + (g === nav ? ' on' : '') }, glyph(g), h('span', {}, l), c ? h('b', {}, String(c)) : null)),
        labels.length ? h('p', { class: 'gm-lh' }, 'Labels') : null,
        labels.map((l) => h('span', { class: 'gm-ni lab' }, h('i', { class: 'gm-ldot', style: { background: l.color } }), h('span', {}, l.name)))),
      h('section', { class: 'gm-pane' }, view || h('div', { class: 'gm-listwrap' },
        h('div', { class: 'gm-tools' }, h('span', { class: 'gm-cb' }), glyph('refresh'), glyph('more'), toolbarExtra || null, h('span', { class: 'gm-count' }, '1–' + list.length + ' of ' + list.length)),
        h('div', { class: 'gm-tabs' }, h('span', { class: 'on' }, glyph('inbox'), 'Primary'), h('span', {}, glyph('tag'), 'Promotions'), h('span', {}, glyph('people'), 'Social')),
        h('div', { class: 'gm-list', role: 'list' }, list)))));
}
export function gmailRow({ name, subject, snippet, when, unread, on, chips = [], onclick, attach }) {
  return h('button', { class: 'gm-row' + (unread ? ' unread' : '') + (on ? ' on' : ''), type: 'button', role: 'listitem', onclick },
    h('span', { class: 'gm-cb' }), glyph('star', 'gl gm-star'),
    h('span', { class: 'gm-from' }, name),
    h('span', { class: 'gm-subj' }, chips.map((c) => h('em', { class: 'gm-chip ' + (c.tone || '') }, c.text)), h('b', {}, subject), h('span', { class: 'gm-snip' }, ' - ' + snippet)),
    attach ? glyph('attach', 'gl gm-clip') : null,
    h('time', {}, when));
}
export function gmailMessage({ subject, chips = [], from, to, cc, when, body, sig, above, below, onBack }) {
  return h('article', { class: 'gm-msg' },
    h('div', { class: 'gm-tools' }, h('button', { class: 'gm-ib', type: 'button', onclick: onBack, 'aria-label': 'Back to Inbox' }, glyph('back')), glyph('archive'), glyph('flag'), glyph('trash'), glyph('more')),
    above || null,
    h('h2', { class: 'gm-msubj' }, subject, h('em', { class: 'gm-chip inbox' }, 'Inbox'), chips.map((c) => h('em', { class: 'gm-chip ' + (c.tone || '') }, c.text))),
    h('div', { class: 'gm-mfrom' }, face(from.name, 40),
      h('div', { class: 'gm-mwho' }, h('p', {}, h('b', {}, from.name), h('span', {}, ' <' + from.email + '>')), h('p', { class: 'gm-to' }, 'to ' + to + (cc ? ', cc: ' + cc : '') + ' ▾')),
      h('span', { class: 'gm-mwhen' }, when, glyph('star'), glyph('reply'), glyph('more'))),
    h('div', { class: 'gm-body' }, body.map((p) => h('p', {}, p)), sig ? h('p', { class: 'gm-sig' }, '--', h('br'), ...sig.flatMap((l, i) => (i ? [h('br'), l] : [l]))) : null),
    below || null,
    h('div', { class: 'gm-reply' }, h('span', { class: 'gm-rb' }, glyph('reply'), 'Reply'), h('span', { class: 'gm-rb' }, glyph('send'), 'Forward')));
}

// ------------------------------------------------------------------ QuickBooks Online
export const QBO_NAV = [['home', 'Dashboard'], ['bank', 'Banking'], ['receipt', 'Sales'], ['tag', 'Expenses'], ['people', 'Payroll'], ['chart', 'Reports'], ['file', 'Taxes'], ['grid', 'Accounting']];
export function qbo({ company, user, nav, onNav, main, banner }) {
  return h('div', { class: 'qb' },
    h('aside', { class: 'qb-nav' },
      h('div', { class: 'qb-brand' }, icon('qbo', 'ico qb-mark'), h('span', {}, 'quickbooks')),
      h('span', { class: 'qb-new' }, glyph('plus'), 'New'),
      QBO_NAV.map(([g, l]) => h('button', { class: 'qb-ni' + (nav === l ? ' on' : ''), type: 'button', onclick: () => onNav && onNav(l) }, glyph(g), h('span', {}, l)))),
    h('div', { class: 'qb-main' },
      h('header', { class: 'qb-head' }, h('b', { class: 'qb-co' }, company), h('label', { class: 'qb-search' }, glyph('search'), h('span', {}, 'Navigate or search for transactions, contacts, reports, and more')), h('span', { class: 'qb-hr' }, glyph('more'), face(user.name, 30, '#2CA01C'))),
      banner || null,
      h('div', { class: 'qb-content' }, main)));
}
export function qboReportList({ groups, onOpen }) {
  return h('div', { class: 'qb-rl' },
    h('h1', {}, 'Reports'),
    h('div', { class: 'qb-rtabs' }, h('span', { class: 'on' }, 'Standard'), h('span', {}, 'Custom reports'), h('span', {}, 'Management reports')),
    groups.map(([title, items]) => h('section', { class: 'qb-rg' }, h('h2', {}, glyph('chevD'), title),
      h('div', { class: 'qb-rgrid' }, items.map((it) => h('button', { class: 'qb-ritem' + (it.unread ? ' unread' : ''), type: 'button', onclick: () => onOpen(it.id) }, h('span', { class: 'qb-rname' }, it.title), it.unread ? h('i', { class: 'qb-new-dot' }, 'New') : null, h('span', { class: 'qb-rsub' }, it.sub), glyph('star', 'gl qb-rstar')))))));
}
export function qboReport({ company, title, period, run, by, intro, onBack, content, footer, above }) {
  return h('div', { class: 'qb-rep' },
    h('button', { class: 'qb-back', type: 'button', onclick: onBack }, glyph('chevL'), 'Back to report list'),
    h('div', { class: 'qb-rbar' },
      h('div', { class: 'qb-field' }, h('label', {}, 'Report period'), h('span', { class: 'qb-sel' }, 'This week', glyph('chevD'))),
      h('div', { class: 'qb-field' }, h('label', {}, 'Accounting method'), h('span', { class: 'qb-radio' }, h('i', {}), 'Cash'), h('span', { class: 'qb-radio on' }, h('i', {}), 'Accrual')),
      h('span', { class: 'qb-run' }, 'Run report'),
      h('span', { class: 'qb-rtools' }, glyph('print'), glyph('send'), glyph('file'), h('span', { class: 'qb-cust' }, 'Customize'), h('span', { class: 'qb-save' }, 'Save customization'))),
    above || null,
    h('div', { class: 'qb-paper' },
      h('header', { class: 'qb-ph' }, h('p', { class: 'qb-pco' }, company), h('h1', {}, title), h('p', {}, period)),
      intro ? h('p', { class: 'qb-intro' }, intro) : null,
      content,
      h('p', { class: 'qb-pfoot' }, [run, by].filter(Boolean).join('  ·  ')),
      footer || null));
}

// A data table shared by QuickBooks reports, Sheets and Docs. `cell(c, i, num)` returns the
// inside of a figure cell (or null for plain text).
const isNum = (t) => /^[-+$(●▲≥≤]?\s?\$?\d/.test(String(t).trim());
export function dataTable(b, { cell, cls = '' } = {}) {
  const keep = b.cols.map((c, i) => c !== '' || b.rows.some((r) => r.cells[i] && r.cells[i].t));
  const num = b.cols.map((_, i) => { const vals = b.rows.map((r) => r.cells[i] && r.cells[i].t).filter(Boolean); return i > 0 && vals.length && vals.filter(isNum).length >= vals.length / 2; });
  return h('table', { class: 'dt ' + cls },
    h('thead', {}, h('tr', {}, b.cols.map((c, i) => keep[i] ? h('th', { class: num[i] ? 'n' : '' }, c) : null))),
    h('tbody', {}, b.rows.map((r) => h('tr', { class: ['total', 'head', 'indent', 'grand'].filter((k) => r[k]).join(' ') },
      r.head ? h('td', { colspan: b.cols.length }, r.cells[0].t) : r.cells.map((c, i) => {
        if (!keep[i]) return null;
        const inner = cell ? cell(c, i, num[i]) : null;
        return h('td', { class: [num[i] ? 'n' : '', c.tone].filter(Boolean).join(' ') + (inner && inner.dataset && inner.dataset.cls ? ' ' + inner.dataset.cls : '') }, inner || c.t);
      })))));
}

// ------------------------------------------------------------------ Google Drive
export function drive({ user, crumbs, files, onOpen, section = 'Shared with me', note }) {
  return h('div', { class: 'gd' },
    h('header', { class: 'gm-head' }, h('span', { class: 'gm-burger' }, glyph('menu')), h('span', { class: 'gm-logo' }, icon('drive', 'ico gm-mark'), h('span', {}, 'Drive')),
      h('label', { class: 'gm-search' }, glyph('search'), h('span', {}, 'Search in Drive')), h('span', { class: 'gm-hright' }, glyph('grid', 'gl gm-hg'), face(user.name, 32, '#5F6368'))),
    h('div', { class: 'gm-main' },
      h('aside', { class: 'gm-nav' }, h('span', { class: 'gm-compose gd-new' }, glyph('plus'), 'New'),
        ['Home', 'My Drive', 'Shared with me', 'Recent', 'Starred', 'Trash'].map((l) => h('span', { class: 'gm-ni' + (l === section ? ' on' : '') }, h('span', {}, l)))),
      h('section', { class: 'gm-pane gd-pane' },
        h('h1', { class: 'gd-crumbs' }, crumbs.map((c, i) => [i ? glyph('chevR') : null, h('span', {}, c)])),
        note || null,
        h('div', { class: 'gd-chips' }, ['Type', 'People', 'Modified', 'Source'].map((c) => h('span', {}, c, glyph('chevD')))),
        h('div', { class: 'gd-table', role: 'list' },
          h('div', { class: 'gd-th' }, h('span', {}, 'Name'), h('span', {}, 'Owner'), h('span', {}, 'Last modified'), h('span', {}, 'File size')),
          files.map((f) => f.group ? h('p', { class: 'gd-group' }, f.group) : h('button', { class: 'gd-row' + (f.unread ? ' unread' : '') + (f.on ? ' on' : ''), type: 'button', role: 'listitem', onclick: () => onOpen(f.id) },
            h('span', { class: 'gd-name' }, icon(f.type, 'ico gd-ico'), h('b', {}, f.name), f.tag ? h('em', { class: 'gm-chip ' + (f.tagTone || '') }, f.tag) : null),
            h('span', { class: 'gd-owner' }, face(f.owner, 22), h('span', {}, f.owner)),
            h('span', {}, f.modified), h('span', {}, f.size || '—')))))));
}

// Google Sheets. Blocks become stacked ranges on one grid with column letters and row numbers.
const COLS = 'ABCDEFGHIJKLMNOP';
export function sheets({ title, blocks, cell, tabs, tab, onTab, onBack, intro, topNote, by }) {
  const width = Math.max(...blocks.map((b) => b.cols.length), 2);
  const fx = h('span', { class: 'gs-fx-v' });
  const nameBox = h('span', { class: 'gs-name' }, 'A1');
  let r = 0;
  const rows = [];
  const row = (cells, cls = '') => { r += 1; rows.push(h('tr', { class: cls }, h('th', { class: 'gs-rn' }, String(r)), cells)); };
  const blank = (n) => Array.from({ length: n }, () => h('td', {}));
  const pick = (td, ref, text) => { const prev = grid.querySelector('td.sel'); if (prev) prev.classList.remove('sel'); td.classList.add('sel'); nameBox.textContent = ref; fx.textContent = text; };
  if (intro) row([h('td', { class: 'gs-intro', colspan: width }, intro)]);
  blocks.forEach((b) => {
    row(blank(width));
    if (b.title) row([h('td', { class: 'gs-btitle', colspan: width }, b.title)]);
    if (b.note) row([h('td', { class: 'gs-bnote', colspan: width }, b.note)]);
    const num = b.cols.map((_, i) => { const vals = b.rows.map((x) => x.cells[i] && x.cells[i].t).filter(Boolean); return i > 0 && vals.length && vals.filter(isNum).length >= vals.length / 2; });
    row(b.cols.map((c, i) => h('td', { class: 'gs-hdr' + (num[i] ? ' n' : '') }, c)).concat(blank(width - b.cols.length)));
    b.rows.forEach((x) => {
      const ri = r + 1;
      row(x.cells.map((c, i) => {
        const inner = cell ? cell(c, i, num[i]) : null;
        const td = h('td', { class: [num[i] ? 'n' : '', c.tone, inner ? 'fig' : '', inner && inner.dataset && inner.dataset.cls].filter(Boolean).join(' ') }, inner || c.t || '');
        td.addEventListener('click', () => pick(td, COLS[i] + ri, String(c.t || '')), true);
        return td;
      }).concat(blank(width - x.cells.length)), x.total ? 'total' : '');
    });
  });
  for (let k = 0; k < 6; k++) row(blank(width));
  const grid = h('table', { class: 'gs-grid' }, h('thead', {}, h('tr', {}, h('th', { class: 'gs-corner' }), Array.from({ length: width }, (_, i) => h('th', {}, COLS[i])))), h('tbody', {}, rows));
  return h('div', { class: 'gs' },
    editorHead({ kind: 'sheets', title, onBack, menus: ['File', 'Edit', 'View', 'Insert', 'Format', 'Data', 'Tools', 'Extensions', 'Help'], by }),
    h('div', { class: 'gs-toolbar' }, ['↶', '↷', '🖶', '100%', '$', '%', '.0', '123', 'Arial', '10', 'B', 'I', 'S', 'A'].map((t) => h('span', {}, t))),
    h('div', { class: 'gs-fx' }, nameBox, h('span', { class: 'gs-fxl' }, 'fx'), fx),
    topNote || null,
    h('div', { class: 'gs-scroll' }, grid),
    h('div', { class: 'gs-tabs' }, h('span', { class: 'gs-tplus' }, '+'), h('span', { class: 'gs-tplus' }, '≡'),
      (tabs || [{ id: 'Sheet1', name: 'Sheet1' }]).map((t) => h('button', { class: 'gs-tab' + ((tab || 'Sheet1') === t.id ? ' on' : ''), type: 'button', onclick: () => onTab && onTab(t.id) }, t.name))));
}

export function docs({ title, onBack, page, by, aside }) {
  return h('div', { class: 'gdoc' },
    editorHead({ kind: 'docs', title, onBack, menus: ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Extensions', 'Help'], by }),
    h('div', { class: 'gs-toolbar' }, ['↶', '↷', '🖶', '100%', 'Normal text', 'Arial', '11', 'B', 'I', 'U', 'A'].map((t) => h('span', {}, t))),
    h('div', { class: 'gdoc-canvas' }, h('div', { class: 'gdoc-page' }, page), aside || null));
}
function editorHead({ kind, title, onBack, menus, by }) {
  return h('header', { class: 'ed-head' },
    h('button', { class: 'ed-home', type: 'button', onclick: onBack, title: 'Back to Drive' }, icon(kind, 'ico ed-ico')),
    h('div', { class: 'ed-tm' }, h('p', { class: 'ed-title' }, title, glyph('star', 'gl ed-star')), h('p', { class: 'ed-menus' }, menus.map((m) => h('span', {}, m)), by ? h('span', { class: 'ed-by' }, by) : null)),
    h('span', { class: 'ed-share' }, glyph('lock'), 'Share'));
}

// ------------------------------------------------------------------ Google Calendar
const toMin = (t) => { const m = String(t).match(/(\d+):(\d+)\s*([AP]M)?/i); if (!m) return null; let hh = Number(m[1]); const mm = Number(m[2]); if (m[3]) { if (/pm/i.test(m[3]) && hh < 12) hh += 12; if (/am/i.test(m[3]) && hh === 12) hh = 0; } else if (hh < 7) hh += 12; return hh * 60 + mm; };
const hourLabel = (hh) => (hh % 12 || 12) + ' ' + (hh < 12 ? 'AM' : 'PM');
export function gcal({ user, monthLabel, dates, columns, nowMin, todayIndex, onPrev, onNext, onToday, popover, side }) {
  const H0 = 7, H1 = 19, PX = 48;
  const top = (m) => (m - H0 * 60) / 60 * PX;
  const grid = h('div', { class: 'gc-grid' },
    h('div', { class: 'gc-hours' }, Array.from({ length: H1 - H0 }, (_, i) => h('span', { style: { top: i * PX + 'px' } }, i ? hourLabel(H0 + i) : ''))),
    columns.map((evs, d) => h('div', { class: 'gc-col' + (d === todayIndex ? ' today' : '') },
      Array.from({ length: H1 - H0 }, (_, i) => h('i', { class: 'gc-line', style: { top: i * PX + 'px' } })),
      evs.filter((e) => !e.allDay).map((e) => { const s = toMin(e.start), en = e.end ? toMin(e.end) : s + 45;
        if (s === null) return null;
        const tall = (en - s) / 60 * PX - 3;
        return h('button', { class: 'gc-ev ' + (e.tone || '') + (e.onclick ? '' : ' plain') + (tall < 38 ? ' short' : ''), type: 'button', style: { top: top(s) + 1 + 'px', height: Math.max(18, tall) + 'px' }, onclick: e.onclick, disabled: !e.onclick, title: e.title },
          h('b', {}, e.title + (tall < 38 ? ',' : '')), h('span', {}, (e.end && tall >= 38 ? e.start + ' – ' + e.end : e.start) + (e.place && tall >= 38 ? ', ' + e.place : '')), e.badge ? h('em', {}, e.badge) : null); }),
      d === todayIndex && nowMin ? h('div', { class: 'gc-now', style: { top: top(nowMin) + 'px' } }) : null)));
  const allDay = columns.some((evs) => evs.some((e) => e.allDay));
  return h('div', { class: 'gc' },
    h('header', { class: 'gm-head gc-head' }, h('span', { class: 'gm-burger' }, glyph('menu')), h('span', { class: 'gm-logo' }, icon('calendar', 'ico gm-mark'), h('span', {}, 'Calendar')),
      btn('Today', onToday, 'gc-today'), h('button', { class: 'gm-ib', type: 'button', onclick: onPrev, 'aria-label': 'Previous week' }, glyph('chevL')), h('button', { class: 'gm-ib', type: 'button', onclick: onNext, 'aria-label': 'Next week' }, glyph('chevR')),
      h('b', { class: 'gc-month' }, monthLabel), h('span', { class: 'gc-view' }, 'Week', glyph('chevD')), h('span', { class: 'gm-hright' }, glyph('grid', 'gl gm-hg'), face(user.name, 32, '#5F6368'))),
    h('div', { class: 'gc-main' },
      h('aside', { class: 'gc-side' }, h('span', { class: 'gm-compose' }, glyph('plus'), 'Create'), side || null,
        h('p', { class: 'gc-cals' }, 'My calendars'), h('span', { class: 'gc-cal' }, h('i', { style: { background: '#039BE5' } }), user.name), h('span', { class: 'gc-cal' }, h('i', { style: { background: '#33B679' } }), 'Tasks'), h('span', { class: 'gc-cal' }, h('i', { style: { background: '#E67C73' } }), 'Holidays')),
      h('section', { class: 'gc-pane' },
        h('div', { class: 'gc-days' }, h('span', { class: 'gc-tz' }, 'GMT-05'), dates.map((d, i) => { const [dw, md] = d.split(', '); return h('div', { class: 'gc-dh' + (i === todayIndex ? ' today' : '') }, h('span', {}, dw.toUpperCase()), h('b', {}, (md || '').replace(/^[A-Za-z]+\s/, ''))); })),
        allDay ? h('div', { class: 'gc-allday' }, h('span', { class: 'gc-tz' }), columns.map((evs) => h('div', {}, evs.filter((e) => e.allDay).map((e) => h('button', { class: 'gc-ad ' + (e.tone || ''), type: 'button', onclick: e.onclick, disabled: !e.onclick }, e.title))))) : null,
        h('div', { class: 'gc-scroll' }, grid),
        popover || null)));
}
export function gcalPopover({ title, when, place, color = '#039BE5', people = [], lines = [], extra, onClose }) {
  return h('div', { class: 'gc-pop', role: 'dialog' },
    h('div', { class: 'gc-ptools' }, glyph('note'), glyph('trash'), glyph('more'), h('button', { class: 'gm-ib', type: 'button', onclick: onClose, 'aria-label': 'Close' }, '✕')),
    h('div', { class: 'gc-pt' }, h('i', { style: { background: color } }), h('div', {}, h('h3', {}, title), h('p', {}, when + (place ? ' · ' + place : '')))),
    people.length ? h('div', { class: 'gc-prow' }, glyph('people'), h('div', {}, h('p', {}, people.length + ' guest' + (people.length === 1 ? '' : 's')), h('ul', {}, people.map((p) => h('li', {}, face(p.name, 24), h('span', {}, p.name, h('em', {}, p.title))))))) : null,
    lines.length || extra ? h('div', { class: 'gc-prow' }, glyph('file'), h('div', { class: 'gc-plines' }, lines, extra || null)) : null);
}

// ------------------------------------------------------------------ Messages (desktop)
export function messages({ threads, current, header, bubbles }) {
  return h('div', { class: 'im' },
    h('aside', { class: 'im-side' }, h('label', { class: 'im-search' }, glyph('search'), h('span', {}, 'Search')), h('div', { class: 'im-list', role: 'list' }, threads)),
    h('section', { class: 'im-pane' }, current ? [h('header', { class: 'im-head' }, header), h('div', { class: 'im-scroll' }, bubbles), h('div', { class: 'im-input' }, h('span', { class: 'im-plus' }, '+'), h('span', { class: 'im-field' }, 'iMessage'))]
      : h('p', { class: 'im-empty' }, 'No conversation selected')));
}
export function imThread({ name, preview, when, unread, on, tag, onclick }) {
  return h('button', { class: 'im-th' + (unread ? ' unread' : '') + (on ? ' on' : ''), type: 'button', role: 'listitem', onclick },
    h('i', { class: 'im-dot' }), face(name, 40, '#8E8E93'),
    h('span', { class: 'im-tt' }, h('span', { class: 'im-top' }, h('b', {}, name), h('time', {}, when)), h('span', { class: 'im-prev' }, preview), tag || null));
}

// ------------------------------------------------------------------ Google Contacts
export function contacts({ user, rows, detail, title = 'Contacts', note }) {
  return h('div', { class: 'gco' },
    h('header', { class: 'gm-head' }, h('span', { class: 'gm-burger' }, glyph('menu')), h('span', { class: 'gm-logo' }, icon('contacts', 'ico gm-mark'), h('span', {}, 'Contacts')),
      h('label', { class: 'gm-search' }, glyph('search'), h('span', {}, 'Search')), h('span', { class: 'gm-hright' }, glyph('grid', 'gl gm-hg'), face(user.name, 32, '#5F6368'))),
    h('div', { class: 'gm-main' },
      h('aside', { class: 'gm-nav' }, h('span', { class: 'gm-compose' }, glyph('plus'), 'Create contact'), h('span', { class: 'gm-ni on' }, glyph('people'), h('span', {}, 'Contacts'), h('b', {}, String(rows.flat(Infinity).filter((r) => r.classList && r.classList.contains('gco-row')).length))), h('span', { class: 'gm-ni' }, glyph('clock'), h('span', {}, 'Frequent')), h('span', { class: 'gm-ni' }, glyph('grid'), h('span', {}, 'Directory'))),
      h('section', { class: 'gm-pane gco-pane' }, detail || [h('h1', { class: 'gco-h' }, title, h('span', {}, '(' + rows.flat(Infinity).filter((r) => r.classList && r.classList.contains('gco-row')).length + ')')), note || null,
        h('div', { class: 'gco-table' }, h('div', { class: 'gco-th' }, h('span', {}, 'Name'), h('span', {}, 'Email'), h('span', {}, 'Job title & company'), h('span', {}, 'Labels')), rows)])));
}
export function contactRow({ name, email, job, labels = [], extra, onclick }) {
  return h(onclick ? 'button' : 'div', { class: 'gco-row', type: onclick ? 'button' : null, onclick },
    h('span', { class: 'gco-name' }, face(name, 32), h('b', {}, name)), h('span', {}, email), h('span', {}, job),
    h('span', { class: 'gco-labels' }, labels.map((l) => h('em', { class: 'gm-chip' }, l)), extra || null));
}
