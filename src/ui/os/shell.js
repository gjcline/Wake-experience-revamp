// THE COMPUTER
// A laptop desktop the player works on: menu bar with the clock, a dock of the apps the team
// uses, one window that holds whichever app is open (browser chrome for web apps, a plain
// title bar for native ones), and notification banners. Apps fill the window; this file only
// draws the machine around them.

import { h } from '../art.js';
import { ICONS, GLYPH } from './icons.js';

export const icon = (id, cls = 'ico') => h('span', { class: cls, html: ICONS[id] || '' });
export const glyph = (id, cls = 'gl') => h('span', { class: cls, html: GLYPH[id] || '' });

// Initials in a colored circle, the way Google and most SaaS show people without photos.
const TONES = ['#1A73E8', '#D93025', '#188038', '#E37400', '#9334E6', '#007B83', '#C5221F', '#1E8E3E', '#B06000', '#5F6368', '#A142F4', '#12B5CB'];
export function face(name, size = 32, tone) {
  const s = String(name || '?').trim();
  const parts = s.split(/\s+/).filter(Boolean);
  const ini = (parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '');
  let hsh = 0; for (const c of s) hsh = (hsh * 31 + c.charCodeAt(0)) >>> 0;
  return h('span', { class: 'face', 'aria-hidden': 'true', style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.42) + 'px', background: tone || TONES[hsh % TONES.length] } }, ini.toUpperCase());
}

// Email addresses and a web domain derived from the company name.
export const slug = (s) => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
export function addressOf(person, company) {
  const name = String(person.name || 'team');
  const parts = name.toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter(Boolean);
  const local = parts.length > 1 ? parts[0] + '.' + parts[parts.length - 1] : (parts[0] || 'team');
  if (person.ext) {
    const m = String(person.title || '').match(/,\s*(.+)$/);
    if (m) return local + '@' + slug(m[1]) + '.com';
    if (/helpdesk|it /i.test(name + ' ')) return 'helpdesk@' + slug(company) + '.com';
  }
  return local + '@' + slug(company) + '.com';
}

export function createComputer({ apps, user, company, onOpen, onHome }) {
  let active = null;
  const badges = {};
  const menuApp = h('b', { class: 'mb-app' }, 'Finder');
  const menuClock = h('span', { class: 'mb-clock' });
  const menubar = h('div', { class: 'os-menubar' },
    h('div', { class: 'mb-left' }, h('span', { class: 'mb-logo', 'aria-hidden': 'true' }, '◆'), menuApp, h('span', {}, 'File'), h('span', {}, 'Edit'), h('span', {}, 'View'), h('span', { class: 'mb-hide' }, 'History'), h('span', { class: 'mb-hide' }, 'Window'), h('span', { class: 'mb-hide' }, 'Help')),
    h('div', { class: 'mb-right' }, glyph('battery', 'gl mb-g'), glyph('wifi', 'gl mb-g'), glyph('search', 'gl mb-g'), menuClock));

  const tabs = h('div', { class: 'br-tabs', role: 'tablist' });
  const urlText = h('span', { class: 'br-url-t' });
  const browserBar = h('div', { class: 'br-chrome' },
    h('div', { class: 'br-top' }, h('span', { class: 'lights' }, h('i', { class: 'l-r', onclick: () => home() }), h('i', { class: 'l-y', onclick: () => home() }), h('i', { class: 'l-g' })), tabs),
    h('div', { class: 'br-bar' },
      h('span', { class: 'br-nav' }, glyph('chevL'), glyph('chevR'), glyph('refresh')),
      h('div', { class: 'br-url' }, glyph('lock', 'gl br-lock'), urlText),
      h('span', { class: 'br-me' }, face(user.name, 24, '#5F6368'))));
  const nativeBar = h('div', { class: 'nat-chrome' }, h('span', { class: 'lights' }, h('i', { class: 'l-r', onclick: () => home() }), h('i', { class: 'l-y', onclick: () => home() }), h('i', { class: 'l-g' })), h('b', { class: 'nat-title' }));
  const body = h('div', { class: 'win-body' });
  const win = h('section', { class: 'os-window', hidden: true, 'aria-label': 'Application window' }, browserBar, nativeBar, body);
  const notes = h('div', { class: 'os-notes', 'aria-live': 'polite' });
  const wallpaper = h('div', { class: 'os-wall' }, h('div', { class: 'wall-co' }, h('b', {}, company), h('span', {}, user.email)));
  const dock = h('nav', { class: 'os-dock', 'aria-label': 'Apps' });
  const desktop = h('div', { class: 'os-desktop' }, wallpaper, win, notes, dock);
  const el = h('div', { class: 'os-computer' }, menubar, desktop);

  function drawDock() {
    dock.replaceChildren(...apps.map((a) => h('button', { class: 'dock-app' + (active === a.id ? ' on' : '') + (a.hero ? ' hero' : ''), type: 'button', 'data-app': a.id, title: a.name, 'aria-label': a.name + (badges[a.id] ? ', ' + badges[a.id] + ' new' : ''), onclick: () => open(a.id) },
      icon(a.icon, 'ico dock-ico'), badges[a.id] ? h('i', { class: 'dock-badge' }, String(badges[a.id])) : null, h('span', { class: 'dock-tip' }, a.name), h('span', { class: 'dock-dot' }))));
  }
  function drawTabs() {
    tabs.replaceChildren(...apps.filter((a) => a.chrome !== 'native').map((a) => h('button', { class: 'br-tab' + (active === a.id ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': String(active === a.id), onclick: () => open(a.id) },
      icon(a.tabIcon || a.icon, 'ico tab-ico'), h('span', { class: 'tab-t' }, (badges[a.id] && a.id === 'gmail' ? 'Inbox (' + badges[a.id] + ') - ' : '') + a.title))));
  }
  function setUrl(u) { u = u || ''; urlText.replaceChildren(h('span', { class: 'u-host' }, u.split('/')[0]), u.slice(u.split('/')[0].length)); }

  // Open an app. Returns the window body for the app to fill.
  function open(id) {
    const a = apps.find((x) => x.id === id); if (!a) return null;
    const switched = active !== id;
    active = id;
    win.hidden = false;
    win.className = 'os-window app-' + id + (a.chrome === 'native' ? ' native' : '');
    browserBar.hidden = a.chrome === 'native'; nativeBar.hidden = a.chrome !== 'native';
    nativeBar.querySelector('.nat-title').textContent = a.title;
    menuApp.textContent = a.chrome === 'native' ? a.name : 'Chrome';
    setUrl(a.url);
    drawDock(); drawTabs();
    if (onOpen) onOpen(id, switched);
    return body;
  }
  function home() {
    if (!active) return;
    active = null; win.hidden = true; menuApp.textContent = 'Finder';
    drawDock(); drawTabs();
    if (onHome) onHome();
  }
  function badge(id, n) { if ((badges[id] || 0) === (n || 0)) return; badges[id] = n || 0; drawDock(); drawTabs(); }
  // `as` shows the note under another name and mark (Wake speaks through the ERP in Round 2)
  function notify({ app, title, text, onclick, ms = 8000, as }) {
    const a = as || apps.find((x) => x.id === app) || {};
    const n = h('button', { class: 'os-note', type: 'button', onclick: () => { n.remove(); if (onclick) onclick(); } },
      icon(a.icon || 'gmail', 'ico note-ico'),
      h('span', { class: 'note-main' }, h('span', { class: 'note-top' }, h('b', {}, (a.name || '').toUpperCase()), h('span', {}, 'now')), title ? h('strong', {}, title) : null, text ? h('span', { class: 'note-text' }, text) : null));
    notes.prepend(n);
    while (notes.children.length > 3) notes.lastChild.remove();
    setTimeout(() => n.remove(), ms);
    return n;
  }
  function setClock(label) { menuClock.textContent = label; }
  function url(u) { setUrl(u); }

  drawDock(); drawTabs();
  return { el, body, open, home, badge, notify, setClock, url, get active() { return active; } };
}

// The game strip above the computer: which round, what to do, and the briefing so far.
export function gameStrip({ round, tone, task, onRules }) {
  const right = h('div', { class: 'gs-right' });
  const alert = h('div', { class: 'gs-alert', hidden: true });
  const el = h('header', { class: 'game-strip ' + (tone || '') },
    h('div', { class: 'gs-left' }, h('span', { class: 'gs-round' }, round), h('span', { class: 'gs-task' }, task)),
    alert, right,
    onRules ? h('button', { class: 'gs-help', type: 'button', onclick: onRules, 'aria-label': 'How this works' }, '?') : null);
  return { el, right, alert };
}
