// THE INK LOOK
// The pieces every screen between the action shares: corner brackets around a card (they spread
// when you point at it), headings with one muted run, and a small live diagram of what Wake does
// (your systems flowing through Wake into a brief, with packets moving along the lines).

import { h } from './art.js';
import { MARK_PATH } from './os/icons.js';

export const brackets = () => ['tl', 'tr', 'bl', 'br'].map((k) => h('span', { class: 'ik-c ik-c-' + k, 'aria-hidden': 'true' }));

// "Where do you want to see *Wake work?*": the starred run is set in the muted tone
export const tone = (text) => String(text).split('*').map((t, i) => (i % 2 ? h('span', { class: 'ik-mute' }, t) : t)).filter((x) => x !== '');

// sources → Wake → the brief. Built as one SVG string; the packets are SMIL, hidden for reduced motion.
export function flow(sources = ['ERP', 'Mail', 'Calendar'], out = 'Brief') {
  const ys = [14, 35, 56];
  const into = ys.map((y) => 'M62,' + y + ' C104,' + y + ' 104,35 144,35');
  const outPath = 'M180,35 C204,35 210,35 234,35';
  const node = (x, y, w, label) => '<g transform="translate(' + x + ',' + (y - 8) + ')"><rect width="' + w + '" height="16" rx="3" class="ik-node"/><text x="' + w / 2 + '" y="10.6" text-anchor="middle" class="ik-lbl">' + label + '</text></g>';
  const pkt = (d, i) => '<circle r="1.9" class="ik-pkt"><animateMotion dur="' + (2 + (i % 2) * 0.5) + 's" begin="' + i * 0.4 + 's" repeatCount="indefinite" path="' + d + '"/></circle>';
  const sheet = (k) => '<g transform="translate(' + (236 + k * 6) + ',' + (14 - k * 5) + ')" opacity="' + (1 - k * 0.3) + '"><rect width="62" height="44" rx="2" class="ik-sheet"/>' +
    (k === 0 ? '<text x="6" y="10" class="ik-lbl ik-mono">' + out.toUpperCase() + '</text><rect x="6" y="15" width="30" height="3" rx="1" class="ik-ink"/><rect x="6" y="21" width="44" height="2" rx="1" class="ik-ln"/>' +
      [9, 13, 7, 15, 11].map((bh, j) => '<rect x="' + (6 + j * 7) + '" y="' + (40 - bh) + '" width="4" height="' + bh + '" class="ik-ink" opacity="' + (0.3 + j * 0.14) + '"/>').join('') : '') + '</g>';
  const svg = '<svg viewBox="0 0 320 70" class="ik-flow" role="img" aria-label="Your systems flow through Wake into a brief">' +
    into.map((d, i) => '<path d="' + d + '" class="ik-line' + (i === 1 ? ' ik-dash' : '') + '"/>').join('') +
    '<path d="' + outPath + '" class="ik-line ik-dash"/>' +
    sources.map((s, i) => node(4, ys[i], 58, s)).join('') +
    into.concat(outPath).map(pkt).join('') +
    '<g transform="translate(144,22)"><rect x="-3" y="-3" width="42" height="32" rx="7" class="ik-halo"/><rect width="36" height="26" rx="5" class="ik-node"/>' +
    '<path transform="translate(7,7) scale(0.066)" d="' + MARK_PATH + '" class="ik-mark"/></g>' +
    [2, 1, 0].map(sheet).join('') + '</svg>';
  return h('div', { class: 'ik-flowbox', html: svg });
}
