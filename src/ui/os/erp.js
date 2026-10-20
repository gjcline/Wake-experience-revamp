// LEDGERLINE ERP
// The one system the company already runs on: a NetSuite-style ERP with every report, scorecard
// and number in one place. Unbranded on purpose (it's a demo company's system), but laid out the
// way the big suites are: a dark header with global search, a row of top tabs, a dashboard of
// portlets, saved searches, a report list, reports with a filter bar, and a File Cabinet.
// Round 1 shows it as it is on any Monday: everything is there, nothing is explained. Round 2 is
// the same system with Wake built into it. These are the building blocks; the rounds fill them.

import { h } from '../art.js';
import { face, glyph, icon } from './shell.js';

export const ERP_NAME = 'Ledgerline';
export const ERP_HOST = 'app.ledgerline.com';

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
    h('div', { class: 'ns-page' }, main));
}

// A dashboard portlet: a titled box with a small toolbar.
export function portlet(title, body, { cls = '', sub, tools = true } = {}) {
  return h('section', { class: 'ns-pt ' + cls },
    h('header', { class: 'ns-pth' }, h('b', {}, title), sub ? h('span', { class: 'ns-pts' }, sub) : null, tools ? h('span', { class: 'ns-ptt' }, glyph('refresh'), glyph('more')) : null),
    h('div', { class: 'ns-ptb' }, body));
}

// A page title row with a few buttons the suites always have.
export function pageHead(title, { sub, actions = ['Customize', 'Export', 'Print'], back } = {}) {
  return h('div', { class: 'ns-ph' },
    back ? h('button', { class: 'ns-back', type: 'button', onclick: back }, glyph('chevL'), 'Back') : null,
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
        ? h('button', { class: 'ns-rli live' + (it.unread ? ' unread' : '') + (it.tone ? ' ' + it.tone : ''), type: 'button', onclick: () => onOpen(it.id) }, h('span', {}, it.title), it.unread ? h('i', { class: 'ns-new' }, 'New') : null, it.tag ? h('em', { class: 'ns-tag' }, it.tag) : null)
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
export function docPage({ title, by, back, page, aside }) {
  return h('div', { class: 'ns-docw' },
    pageHead(title, { sub: by, actions: ['Download', 'Share'], back }),
    h('div', { class: 'ns-docb' }, h('article', { class: 'ns-doc' }, page), aside || null));
}
