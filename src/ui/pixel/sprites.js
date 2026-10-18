// PIXEL PIECES FOR THE SELECT SCREENS
// The storefront for each business (the "stage" you pick) and an emblem for each role. Both are
// drawn on small canvases and scaled up with crisp pixels.

export const ROLE_COLOR = { gm: '#FF4F8B', coo: '#22D3EE', owner: '#FFD23F', partner: '#A98BFF', regional: '#5BD66B' };

// 8 x 8 signs for each business, as in the original arcade
const Y = '#FFD23F', K = '#22D3EE', M = '#FF4F8B', W = '#F4F1DE';
const ICON = {
  service: [['.....YY.', '....Y..Y', '....Y.YY', '...YYY..', '..YYY...', '.YYY....', 'YYY.....', 'YY......'], { Y }],
  clinical: [['...MM...', '...MM...', '...MM...', 'MMMMMMMM', 'MMMMMMMM', '...MM...', '...MM...', '...MM...'], { M }],
  consumer: [['...YY...', '...YY...', 'YYYYYYYY', '.YYYYYY.', '..YYYY..', '.YY..YY.', 'YY....YY', '........'], { Y }],
  field: [['........', 'KKKKK...', 'KKKKKKK.', 'KKKKKKKK', 'KKKKKKKK', '.WW..WW.', '.WW..WW.', '........'], { K, W }],
  multi: [['M.....M.', 'MM...MM.', 'M..M..M.', '..MMM...', '...M....', 'M.....M.', 'MM...MM.', 'M.....M.'], { M }],
};
const LOOK = {
  service: { wall: '#C9C2B6', awning: ['#C0504D', '#F4F1EA'], door: 'bay' },
  clinical: { wall: '#E6EEF0', awning: ['#4F9DB8', '#F4F1EA'], door: 'glass' },
  consumer: { wall: '#D8C3B0', awning: ['#8064A2', '#F4F1EA'], door: 'glass' },
  field: { wall: '#B9B2A4', awning: ['#3E7D5A', '#E9E3D8'], door: 'bay' },
  multi: { wall: '#C9A98A', awning: ['#D27A3A', '#F4F1EA'], door: 'glass' },
};

function canvas(w, hgt) { const c = document.createElement('canvas'); c.width = w; c.height = hgt; c.className = 'px-art'; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); }]; }

// A little street-corner storefront: sky, building, awning, sign, door or service bay.
export function storefront(id) {
  const L = LOOK[id] || LOOK.service;
  const [c, r] = canvas(64, 48);
  r(0, 0, 64, 48, '#1A2140'); r(0, 30, 64, 18, '#232B4D');
  for (let i = 0; i < 9; i++) r((i * 23) % 61, (i * 7) % 18 + 1, 1, 1, '#4A5590');
  r(6, 10, 52, 30, '#15131F'); r(7, 11, 50, 29, L.wall); r(7, 11, 50, 2, '#00000022');
  r(4, 9, 56, 3, '#2A2836');
  r(14, 13, 36, 9, '#15131F'); r(15, 14, 34, 7, '#141428');
  const [rows, pal] = ICON[id] || ICON.service;
  rows.forEach((row, y) => [...row].forEach((k, x) => { if (k !== '.') r(28 + x, 13 + y, 1, 1, pal[k]); }));
  for (let x = 7; x < 57; x += 4) { r(x, 22, 2, 4, L.awning[0]); r(x + 2, 22, 2, 4, L.awning[1]); }
  r(7, 26, 50, 1, '#15131F');
  if (L.door === 'bay') { r(10, 28, 22, 12, '#15131F'); for (let y = 29; y < 40; y += 2) r(11, y, 20, 1, '#8A93A3'); r(36, 28, 16, 8, '#7FB4CF'); r(37, 29, 5, 2, '#E3F4FA'); }
  else { r(11, 28, 18, 8, '#7FB4CF'); r(12, 29, 6, 2, '#E3F4FA'); r(35, 28, 10, 12, '#15131F'); r(36, 29, 8, 11, '#A9D3E6'); r(36, 29, 2, 11, '#E3F4FA'); r(47, 28, 7, 8, '#7FB4CF'); }
  r(0, 40, 64, 8, '#CFC9BC'); r(0, 40, 64, 1, '#A3A7B3');
  return c;
}

// Each role's emblem: a pixel badge in the role's color, used on the character select.
// X role color, D a darker shade, W white.
const EMBLEM = {
  gm: ['....DDDD....', '..XXDWWDXX..', '..XWWWWWWX..', '..XWDDDDWX..', '..XWWWWWWX..', '..XWDDDWWX..', '..XWWWWWWX..', '..XWDDDDWX..', '..XWWWWWWX..', '..XWDDWWWX..', '..XXXXXXXX..', '............'],
  coo: ['............', '.........XX.', '.........XX.', '......XX.XX.', '......XX.XX.', '...XX.XX.XX.', '...XX.XX.XX.', 'XX.XX.XX.XX.', 'XX.XX.XX.XX.', 'XX.XX.XX.XX.', 'WWWWWWWWWWWW', '............'],
  owner: ['.....XX.....', '....XXXX....', '...XXXXXX...', '..XXXXXXXX..', '.XXXXXXXXXX.', 'XXXXXXXXXXXX', '.XWWXXXXWWX.', '.XWWXDDXWWX.', '.XXXXDDXXXX.', '.XXXXDDXXXX.', '.XXXXDDXXXX.', '............'],
  partner: ['............', '....DDDD....', '....D..D....', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.DDDDWWDDDD.', '.XXXXWWXXXX.', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '.XXXXXXXXXX.', '............'],
  regional: ['...XXXXXX...', '..XXXXXXXX..', '.XXXWWWWXXX.', '.XXWWDDWWXX.', '.XXWWDDWWXX.', '.XXXWWWWXXX.', '..XXXXXXXX..', '...XXXXXX...', '....XXXX....', '.....XX.....', '.....XX.....', '............'],
};
export function emblem(roleId) {
  const rows = EMBLEM[roleId] || EMBLEM.gm;
  const col = ROLE_COLOR[roleId] || ROLE_COLOR.gm;
  const pal = { X: col, D: shade(col, 0.62), W: '#F4F1EA' };
  const [c, r] = canvas(16, 16);
  const at = (x, y) => (rows[y] || '')[x];
  rows.forEach((row, y) => [...row].forEach((k, x) => { if (k === '.') return; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const n = at(x + dx, y + dy); if (!n || n === '.') r(2 + x + dx, 2 + y + dy, 1, 1, '#15131F'); } }));
  rows.forEach((row, y) => [...row].forEach((k, x) => { if (k !== '.') r(2 + x, 2 + y, 1, 1, pal[k]); }));
  return c;
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.round(v * k); return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')'; }
