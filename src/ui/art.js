// Illustration. Characters and the office are drawn from parameters: stylized, flat,
// deliberately designed. No photographs and no generated faces anywhere.

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
  }
  return el;
}

// Pixel portraits, 12 x 12, built from each character's parameters.
const BASE = [
  '....HHHH....',
  '..HHHHHHHH..',
  '.HHHHHHHHHH.',
  '.HHSSSSSSHH.',
  '.HSSSSSSSSH.',
  '.HSSESSESSH.',
  '..SSSSSSSS..',
  '..SSSMMSSS..',
  '...SSSSSS...',
  '....SSSS....',
  '..CCCCCCCC..',
  '.CCCCCCCCCC.',
];
function faceRows(style) {
  const r = BASE.map((x) => x.split(''));
  const set = (y, x, k) => { r[y][x] = k; };
  if (style === 'bald') { for (let y = 0; y < 3; y++) for (let x = 0; x < 12; x++) if (r[y][x] === 'H') set(y, x, y === 0 ? '.' : 'S'); set(3, 2, 'S'); set(3, 9, 'S'); set(4, 1, 'S'); set(4, 10, 'S'); set(5, 1, 'S'); set(5, 10, 'S'); }
  if (style === 'short' || style === 'fade') { set(5, 1, 'S'); set(5, 10, 'S'); if (style === 'fade') { set(4, 1, 'S'); set(4, 10, 'S'); } }
  if (style === 'curly') { r[0] = '..HH.HH.HH..'.split(''); set(1, 0, 'H'); set(1, 11, 'H'); set(2, 0, 'H'); set(2, 11, 'H'); }
  if (style === 'bun') { r[0] = '....HHHH....'.split(''); set(5, 1, 'S'); set(5, 10, 'S'); }
  if (style === 'bob' || style === 'long' || style === 'wrap') {
    const to = style === 'bob' ? 7 : 9;
    for (let y = 3; y <= to; y++) { set(y, 0, 'H'); set(y, 1, 'H'); set(y, 10, 'H'); set(y, 11, 'H'); }
    if (style === 'wrap') { r[8] = '.HHSSSSSSHH.'.split(''); r[9] = '..HHSSSSHH..'.split(''); }
  }
  return r.map((x) => x.join(''));
}
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); const c = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return '#' + [c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join(''); }

export function avatarSVG(av, size = 44) {
  const a = av || { skin: '#D9B595', hair: '#333333', style: 'short', shirt: '#444455' };
  const pal = { H: a.hair, S: a.skin, E: '#14111F', M: shade(a.skin, 0.78), C: a.shirt };
  let rects = '';
  faceRows(a.style).forEach((row, y) => [...row].forEach((k, x) => { if (k !== '.') rects += `<rect x="${x + 1}" y="${y + 2}" width="1.02" height="1.02" fill="${pal[k]}"/>`; }));
  return `<svg class="av" width="${size}" height="${size}" viewBox="0 0 14 14" shape-rendering="crispEdges" aria-hidden="true"><rect width="14" height="14" fill="${shade(a.shirt, 0.42)}"/>${rects}</svg>`;
}

export const avatar = (av, size) => h('span', { class: 'avwrap', html: avatarSVG(av, size) });
