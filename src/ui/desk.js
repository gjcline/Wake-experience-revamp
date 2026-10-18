// THE DESK
// Your actual desk: the photo from the art pack with the live computer mounted in the monitor and
// a live phone on its stand. The phone lights up and buzzes when a text lands; pick it up and it
// opens full size with Messages. "Bigger screen" moves in until the monitor fills the view. On a
// small screen the desk steps aside and the computer fills the window.

import { h } from './art.js';
import { ART, SHOT, createView } from './scenes.js';
import { ICONS, GLYPH } from './os/icons.js';

const CW = 1280; // the computer's own width; it is scaled to the monitor

export function createDesk({ tidy, computer, onPhone }) {
  const art = tidy ? ART.deskTidy : ART.desk;
  const narrow = () => window.innerWidth < 820;
  const [, , mw, mh] = art.monitor;
  const CH = Math.round(CW * mh / mw);
  computer.classList.add('dk-computer');
  computer.style.setProperty('--cw', CW + 'px'); computer.style.setProperty('--ch', CH + 'px'); computer.style.setProperty('--k', String(mw / CW));

  // the phone on the stand: a dim lock screen that wakes up for a text
  const time = h('b', { class: 'dkp-time' }, '7:48');
  const mini = h('div', { class: 'dkp-note' });
  const badge = h('i', { class: 'dkp-badge', hidden: true });
  const standPhone = h('button', { class: 'dk-phone', type: 'button', 'aria-label': 'Pick up your phone', onclick: () => open() }, h('div', { class: 'dkp-lock' }, time, mini), badge);

  // the phone in your hand
  const pTime = h('b', {}, '7:48');
  const body = h('div', { class: 'ph-body' });
  const over = h('div', { class: 'ph-over', hidden: true, onclick: (e) => { if (e.target === over) close(); } },
    h('div', { class: 'ph' },
      h('div', { class: 'ph-bar' }, pTime, h('span', { class: 'ph-island' }), h('span', { class: 'ph-ic' }, h('i', { html: GLYPH.wifi }), h('i', { html: GLYPH.battery }))),
      body, h('span', { class: 'ph-home' })),
    h('button', { class: 'ph-down', type: 'button', onclick: () => close() }, 'Put the phone down'));
  const fab = h('button', { class: 'dk-fab', type: 'button', 'aria-label': 'Your phone', onclick: () => open() }, h('span', { html: ICONS.messages }), h('i', { class: 'dkp-badge', hidden: true }));

  const toggle = h('button', { class: 'dk-zoom', type: 'button', onclick: () => setFocus(!focus) }, 'Bigger screen');
  let v = null, focus = false;
  const el = h('div', { class: 'dk' });
  function build() {
    if (v) { v.destroy(); v = null; }
    el.classList.toggle('narrow', narrow());
    if (narrow()) { el.replaceChildren(computer, fab, over); return; }
    v = createView(art, { cover: false });
    v.pin(art.monitor, computer, 'dk-mon');
    v.pin(art.phone, standPhone, 'dk-ph');
    el.replaceChildren(v.el, toggle, over);
    requestAnimationFrame(() => v.go(focus ? SHOT.monitor : SHOT.desk));
  }
  function setFocus(on) { focus = on; toggle.textContent = on ? 'Show the desk' : 'Bigger screen'; el.classList.toggle('focus', on); if (v) v.go(on ? SHOT.monitor : SHOT.desk, 600); }
  let wasNarrow = narrow();
  const onResize = () => { if (narrow() !== wasNarrow) { wasNarrow = narrow(); build(); } };
  window.addEventListener('resize', onResize);
  build();

  function open() { over.hidden = false; el.classList.add('phone-up'); standPhone.classList.remove('lit', 'buzz'); if (onPhone) onPhone(true); }
  function close() { over.hidden = true; el.classList.remove('phone-up'); if (onPhone) onPhone(false); }

  const phone = {
    body,
    open, close,
    get isOpen() { return !over.hidden; },
    setTime(label) { const t = String(label).replace(/\s?[AP]M$/i, ''); time.textContent = t; pTime.textContent = t; },
    setBadge(n) { for (const b of [badge, fab.querySelector('.dkp-badge')]) { b.hidden = !n; b.textContent = String(n || ''); } },
    // a text lands: the phone lights up, shows who it's from, and buzzes on the desk
    buzz({ title, text }) {
      mini.replaceChildren(h('span', { class: 'dkp-ni', html: ICONS.messages }), h('div', {}, h('b', {}, title), h('p', {}, text)));
      for (const p of [standPhone, fab]) { p.classList.remove('buzz'); void p.offsetWidth; p.classList.add('buzz', 'lit'); }
      setTimeout(() => standPhone.classList.remove('buzz'), 1200);
    },
  };
  return { el, phone, setFocus, destroy() { window.removeEventListener('resize', onResize); if (v) v.destroy(); } };
}
