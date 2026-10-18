// THE OFFICE, IN PIXELS
// A three-quarter top-down pixel drawing of the company's building: the street and the front of
// the building at the bottom, the lobby and the operations floor, a hallway, and the meeting room,
// break room and your office at the back. People are outlined sprites that walk between rooms on
// fixed routes. The static drawing is made once; people, the car and speech bubbles move on top.
// Friday evening is the same building with the lights on and nobody in.

import { sfx } from '../arcade/sound.js';

// each role's shirt color on the map
export const ROLE_COLOR = { gm: '#FF4F8B', coo: '#22D3EE', owner: '#FFD23F', partner: '#A98BFF', regional: '#5BD66B' };

const S = 4;                 // offscreen canvas pixels per map pixel
export const MW = 384, MH = 240;

const C = {
  ink: '#15131F', grass: '#557A4A', grass2: '#4D7044', grass3: '#628A55', hedge: '#3E6B3F', hedge2: '#4F8450',
  road: '#3B3E4B', road2: '#373A46', lane: '#E9D27A', curb: '#A3A7B3', walk: '#CFC9BC', walk2: '#C4BDAE',
  lot: '#45485466', lotLine: '#D9D6CC',
  cap: '#2A2836', cap2: '#34313F', face: '#E9E3D8', face2: '#DCD5C8', base: '#A89A86',
  facade: '#D6D0C5', facade2: '#C8C1B4', trim: '#3A3846', glass: '#7FB4CF', glass2: '#A9D3E6', glassHi: '#E3F4FA',
  lobby: '#DAD3C6', lobby2: '#D0C8B9', wood: '#B78A60', wood2: '#AD8056', woodSeam: '#94693F',
  carpet: '#6F7FA0', carpet2: '#6A7A9A', meet: '#5E6C8C', meet2: '#596783', tile: '#E8E3DA', tile2: '#D9D3C7',
  rug: '#8E4A4A', rug2: '#7E3F41', rugEdge: '#C9A46A',
  deskTop: '#ECE8E0', deskEdge: '#C4BCAE', deskLeg: '#4A4A57', wTop: '#9C6B43', wTop2: '#B07B4F', wEdge: '#7A5233',
  monFrame: '#1F2230', screen: '#5FD3E8', screen2: '#A7EEF8', chair: '#2F3342', chair2: '#454B60',
  leaf: '#3F8F4E', leaf2: '#58AA5F', leaf3: '#2E6E3C', pot: '#C77A4C', pot2: '#A55F37',
  sofa: '#4B5C88', sofa2: '#5D6FA0', book: ['#C0504D', '#4F81BD', '#9BBB59', '#F2C14E', '#8064A2'],
  sign: '#141428', signText: '#7FE7F5', white: '#F4F1EA', metal: '#9AA0AC', red: '#E0524F',
};

// Rooms (map pixels) and the routes between them. Routes are lists of foot positions.
export const ROOMS = {
  meeting: { x: 60, y: 12, w: 104, h: 72 }, break: { x: 168, y: 12, w: 68, h: 72 }, office: { x: 240, y: 12, w: 132, h: 72 },
  hall: { x: 60, y: 88, w: 312, h: 24 }, lobby: { x: 60, y: 116, w: 88, h: 56 }, ops: { x: 152, y: 116, w: 220, h: 56 },
};
const P = (x, y) => ({ x, y });
export const SEAT = { office: P(320, 41), meeting: P(150, 52) };
export const ROUTES = {
  arrival: [P(104, 210), P(104, 186), P(104, 160), P(104, 104), P(260, 104), P(260, 66), P(282, 66), P(282, 34), P(320, 34), SEAT.office],
  toMeeting: [SEAT.office, P(320, 34), P(282, 34), P(282, 66), P(260, 66), P(260, 104), P(148, 104), P(148, 66), SEAT.meeting],
  toOffice: [SEAT.meeting, P(148, 66), P(148, 104), P(260, 104), P(260, 66), P(282, 66), P(282, 34), P(320, 34), SEAT.office],
};

// ------------------------------------------------------------------ people
// 8 x 12 sprites, outlined when drawn. H hair, S skin, E eyes, C shirt, c shirt shade, P pants, K shoes.
const BODY = {
  down: ['..HHHH..', '.HHHHHH.', '.HSSSSH.', '.SESSES.', '..SSSS..', '.CCCCCC.', 'SCCCCCCS', 'SCCCCCCS', '.cccccc.'],
  up: ['..HHHH..', '.HHHHHH.', '.HHHHHH.', '.HHHHHH.', '..SSSS..', '.CCCCCC.', 'SCCCCCCS', 'SCCCCCCS', '.cccccc.'],
  side: ['..HHHH..', '.HHHHHH.', '.HHHSSS.', '.HHSSES.', '..SSSS..', '..CCCC..', '..CCSC..', '..CCSC..', '..cccc..'],
};
const LEGS = {
  fb: [['.PPPPPP.', '.PP..PP.', '.KK..KK.'], ['.PPPPPP.', '.PP..PP.', '.KK.....'], ['.PPPPPP.', '.PP..PP.', '.KK..KK.'], ['.PPPPPP.', '.PP..PP.', '.....KK.']],
  side: [['..PPPP..', '..PPPP..', '..KKKK..'], ['..PPPP..', '.PP..PP.', '.KK..KK.'], ['..PPPP..', '..PPPP..', '..KKKK..'], ['..PPPP..', '.PP..PP.', '.KK..KK.']],
};
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join(''); };
export function personPal(av, shirt) { const c = shirt || av.shirt || '#5B7BD5'; return { H: av.hair || '#2A1C14', S: av.skin || '#D9A07A', E: '#1B1A24', C: c, c: shade(c, 0.78), P: '#2E2D3D', K: '#14131C' }; }

// Draws a person with their feet at (fx, fy) in map pixels. `at` turns map pixels into canvas
// pixels and `px` is the size of one map pixel on that canvas.
function person(g, at, px, fx, fy, pal, { dir = 'down', frame = 0, seated = false } = {}) {
  const body = BODY[dir === 'left' || dir === 'right' ? 'side' : dir];
  const legs = seated ? [] : (dir === 'left' || dir === 'right' ? LEGS.side : LEGS.fb)[frame % 4];
  const rows = body.concat(legs);
  const flip = dir === 'left';
  const top = fy - (seated ? 10 : rows.length);
  const left = fx - 4;
  const cells = [];
  rows.forEach((row, r) => [...row].forEach((k, c) => { if (k !== '.') cells.push([flip ? 7 - c : c, r, k]); }));
  // soft shadow, then outline, then the sprite
  const [sx, sy] = at(left + 1, fy - 1);
  if (!seated) { g.fillStyle = 'rgba(10,10,20,.28)'; g.fillRect(sx, sy, 6 * px, 2 * px); }
  g.fillStyle = C.ink;
  for (const [c, r] of cells) { const [x, y] = at(left + c, top + r); g.fillRect(x - px, y, px * 3, px); g.fillRect(x, y - px, px, px * 3); }
  for (const [c, r, k] of cells) { const [x, y] = at(left + c, top + r); g.fillStyle = pal[k]; g.fillRect(x, y, px + 0.5, px + 0.5); }
}

// ------------------------------------------------------------------ the building
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function drawStatic(company, npcs, night) {
  const off = document.createElement('canvas');
  off.width = MW * S; off.height = MH * S;
  const g = off.getContext('2d');
  g.imageSmoothingEnabled = false;
  const R = rng(7);
  const rect = (x, y, w, h, c) => { g.fillStyle = C[c] || c; g.fillRect(x * S, y * S, w * S, h * S); };
  const speck = (x, y, w, h, a, b, p = 0.18) => { rect(x, y, w, h, a); g.fillStyle = C[b] || b; for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) if (R() < p) g.fillRect(i * S, j * S, S, S); };
  const at = (x, y) => [x * S, y * S];

  // ---- outside: grass, parking lot, sidewalk, road
  speck(0, 0, MW, MH, 'grass', 'grass2', 0.3);
  speck(0, 0, 52, 172, 'road', 'road2', 0.25);
  for (let y = 18; y < 168; y += 22) { rect(4, y, 18, 1, 'lotLine'); rect(30, y, 18, 1, 'lotLine'); }
  car(g, at, S, 6, 22, '#C0504D'); car(g, at, S, 30, 66, '#4F81BD'); car(g, at, S, 6, 132, '#E4E1D8');
  for (let y = 4; y < 172; y += 6) { rect(52, y, 4, 5, 'hedge'); rect(53, y + 1, 2, 2, 'hedge2'); }
  speck(0, 190, MW, 14, 'walk', 'walk2', 0.12);
  for (let x = 0; x < MW; x += 12) rect(x, 190, 1, 14, 'walk2');
  rect(0, 197, MW, 1, 'walk2');
  rect(0, 204, MW, 2, 'curb');
  speck(0, 206, MW, 34, 'road', 'road2', 0.25);
  for (let x = 6; x < MW; x += 24) rect(x, 222, 12, 2, 'lane');
  for (let x = 0; x < 24; x += 5) rect(14 + x, 207, 3, 32, '#D9D6CC');            // crosswalk
  // ---- the building's floors
  speck(60, 12, 104, 72, 'meet', 'meet2', 0.2);
  for (let i = 0; i < 68; i += 8) for (let j = 0; j < 72; j += 8) if (((i + j) / 8) % 2) rect(168 + i, 12 + j, Math.min(8, 68 - i), 8, 'tile2'); else rect(168 + i, 12 + j, Math.min(8, 68 - i), 8, 'tile');
  planks(240, 12, 132, 72); planks(60, 84, 312, 32);
  for (let i = 0; i < 88; i += 12) for (let j = 0; j < 56; j += 12) rect(60 + i, 116 + j, Math.min(12, 88 - i), Math.min(12, 56 - j), ((i + j) / 12) % 2 ? 'lobby2' : 'lobby');
  speck(152, 116, 220, 56, 'carpet', 'carpet2', 0.22);
  function planks(x, y, w, h) { rect(x, y, w, h, 'wood'); for (let j = 0; j < h; j += 4) { rect(x, y + j, w, 1, 'woodSeam'); const o = (j / 4) % 2 ? 9 : 21; for (let i = o; i < w; i += 30) rect(x + i, y + j, 1, 4, 'woodSeam'); for (let i = 0; i < w; i++) if (R() < 0.08) rect(x + i, y + j + 1 + Math.floor(R() * 3), 1, 1, 'wood2'); } }

  // ---- walls: a dark cap on top, and a light face on walls that face the camera
  const DOORS_A = [[140, 156], [194, 210], [252, 268]], DOORS_B = [[84, 124], [212, 236], [320, 344]];
  const hwall = (x0, x1, y, doors, faced = true) => {
    for (let x = x0; x < x1; x++) {
      if (doors.some(([a, b]) => x >= a && x < b)) continue;
      rect(x, y, 1, 4, 'cap');
      if (faced) { rect(x, y + 4, 1, 8, x % 16 < 1 ? 'face2' : 'face'); rect(x, y + 11, 1, 1, 'base'); }
    }
    rect(x0, y, x1 - x0, 1, 'cap2');
  };
  hwall(56, 376, 8, [], true);
  hwall(60, 372, 84, DOORS_A); hwall(60, 372, 112, DOORS_B);
  for (const [x, y0, y1] of [[56, 8, 176], [372, 8, 176], [164, 12, 84], [236, 12, 84], [148, 124, 172]]) rect(x, y0, 4, y1 - y0, 'cap');
  rect(148, 140, 4, 16, 'lobby');                                                     // lobby to the floor
  for (const [a, b] of DOORS_A) { rect(a - 1, 84, 1, 12, 'cap'); rect(b, 84, 1, 12, 'cap'); rect(a, 86, b - a, 2, 'wood2'); }
  // north windows: daylight on the back wall
  for (let x = 72; x < 360; x += 26) { if (x > 160 && x < 176) continue; if (x > 228 && x < 248) continue; rect(x, 12, 14, 7, 'trim'); rect(x + 1, 13, 12, 5, 'glass'); rect(x + 1, 13, 5, 2, 'glassHi'); rect(x + 7, 13, 1, 5, 'trim'); }
  // wall art in the hall
  for (const [x, c] of [[90, '#C9A46A'], [176, '#7FB4CF'], [300, '#C0504D'], [346, '#9BBB59']]) { rect(x, 115, 10, 7, 'trim'); rect(x + 1, 116, 8, 5, c); }
  // south wall: cap, then the front of the building facing the street
  for (let x = 56; x < 376; x++) if (x < 96 || x >= 112) rect(x, 172, 1, 4, 'cap');
  speck(56, 176, 320, 14, 'facade', 'facade2', 0.1);
  rect(56, 176, 320, 1, 'trim'); rect(56, 189, 320, 1, '#9E978A');
  for (let x = 62; x < 372; x += 18) { if (x > 84 && x < 118) continue; if (x > 120 && x < 252) continue; rect(x, 179, 12, 8, 'trim'); rect(x + 1, 180, 10, 6, 'glass'); rect(x + 1, 180, 4, 2, 'glassHi'); rect(x + 6, 180, 1, 6, 'trim'); }
  rect(94, 176, 20, 14, 'trim'); rect(96, 177, 7, 13, 'glass2'); rect(105, 177, 7, 13, 'glass2'); rect(96, 177, 2, 13, 'glassHi');
  rect(92, 190, 24, 6, '#6B5F52'); rect(93, 191, 22, 4, '#7D7062');                   // doormat
  // the sign with the company's name
  rect(122, 177, 128, 11, 'sign'); rect(122, 177, 128, 1, '#2E2E52');
  const name = company.toUpperCase();
  let fs = 26;
  g.font = fs + 'px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  while (fs > 8 && g.measureText(name).width > 118 * S) { fs -= 1; g.font = fs + 'px "Press Start 2P", monospace'; }
  g.fillStyle = night ? '#BFF6FF' : C.signText; g.fillText(name, 186 * S, 182.8 * S);
  // sidewalk trees and lamps
  for (const x of [36, 262, 352]) tree(x, 196);
  for (const x of [72, 300, 368]) { rect(x, 186, 2, 12, '#2E2D3D'); rect(x - 2, 185, 6, 2, '#2E2D3D'); rect(x - 1, 186, 4, 1, '#F6E7A6'); }
  function tree(x, y) { rect(x - 3, y + 2, 6, 3, 'rgba(0,0,0,.18)'); rect(x - 1, y - 2, 2, 6, '#5B3E2B'); circle(x, y - 7, 9, 'leaf3'); circle(x - 1, y - 8, 7, 'leaf'); circle(x - 3, y - 10, 3, 'leaf2'); }
  function circle(cx, cy, r, c) { for (let j = -r; j <= r; j++) { const w = Math.round(Math.sqrt(r * r - j * j)); rect(cx - w, cy + j, w * 2, 1, c); } }

  // ---- furniture
  const shadow = (x, y, w, h) => rect(x + 1, y + h, w, 2, 'rgba(10,10,20,.22)');
  const plant = (x, y) => { rect(x, y + 5, 6, 5, 'pot'); rect(x, y + 9, 6, 1, 'pot2'); circle(x + 3, y + 2, 4, 'leaf3'); circle(x + 2, y + 1, 3, 'leaf'); rect(x + 1, y - 1, 2, 1, 'leaf2'); rect(x + 4, y + 1, 1, 2, 'leaf2'); };
  const chair = (x, y) => { rect(x, y, 7, 6, 'chair'); rect(x + 1, y + 1, 5, 2, 'chair2'); };
  const desk = (x, y, w, h = 6) => { shadow(x, y, w, h + 3); rect(x, y, w, h, 'deskTop'); rect(x, y + h, w, 3, 'deskEdge'); rect(x + 1, y + h + 3, 1, 1, 'deskLeg'); rect(x + w - 2, y + h + 3, 1, 1, 'deskLeg'); };
  const monitor = (x, y, on = true) => { rect(x, y, 8, 6, 'monFrame'); rect(x + 1, y + 1, 6, 4, on ? 'screen' : '#2A3348'); if (on) { rect(x + 1, y + 1, 6, 1, 'screen2'); rect(x + 2, y + 3, 3, 1, '#2C6E87'); } rect(x + 3, y + 6, 2, 1, 'monFrame'); };

  // meeting room: long table, chairs, the wall screen
  rect(84, 13, 46, 9, 'trim'); rect(85, 14, 44, 7, '#1B2032');
  for (let i = 0; i < 4; i++) rect(87 + i * 11, 15, 9, 5, ['#3E5C8A', '#5A4B7E', '#3F7D6E', '#7E5A4B'][i]);
  shadow(78, 42, 64, 16); rect(78, 42, 64, 14, 'wTop'); rect(79, 43, 62, 2, 'wTop2'); rect(78, 56, 64, 3, 'wEdge');
  for (const x of [86, 100, 114, 128]) { chair(x - 4, 34); chair(x - 4, 61); }
  rect(108, 46, 6, 4, '#2A2836'); rect(100, 50, 4, 3, C.white);
  plant(62, 24); plant(152, 72);
  // break room: counter, coffee, fridge, a round table
  rect(170, 22, 52, 8, '#D8D2C6'); rect(170, 30, 52, 3, '#B9B1A2'); rect(176, 23, 8, 4, '#8A93A3'); rect(190, 21, 7, 8, '#2A2836'); rect(192, 23, 3, 2, 'red');
  rect(224, 14, 11, 20, 'white'); rect(224, 23, 11, 1, '#C9C3B8'); rect(233, 17, 1, 4, 'metal');
  circle(200, 62, 8, '#C9A46A'); circle(200, 61, 7, '#D9B47A'); chair(186, 58); chair(208, 58);
  plant(228, 72);
  // your office: rug, desk, chair, bookshelf, plant, a sofa
  rect(278, 28, 80, 40, 'rugEdge'); rect(279, 29, 78, 38, 'rug'); for (let i = 0; i < 78; i += 6) rect(279 + i, 29, 3, 38, 'rug2');
  rect(312, 30, 16, 12, 'chair'); rect(313, 31, 14, 6, 'chair2');                          // your chair, behind the desk
  shadow(292, 46, 56, 9); rect(292, 46, 56, 9, 'wTop'); rect(293, 47, 54, 2, 'wTop2'); rect(292, 55, 56, 3, 'wEdge');
  rect(314, 43, 14, 4, 'monFrame'); rect(315, 43, 12, 1, '#3A3F52');                      // the back of your monitor
  rect(298, 49, 8, 4, C.white); rect(299, 50, 6, 1, '#C9C3B8'); rect(338, 48, 5, 5, '#E8E1D0'); rect(339, 48, 3, 1, '#7A5233'); // papers, a mug
  rect(244, 13, 30, 10, '#6E4B33'); for (let i = 0; i < 26; i += 3) rect(246 + i, 14 + (i % 2), 2, 7 - (i % 2), C.book[(i / 3) % 5]);
  rect(246, 68, 26, 10, 'sofa'); rect(247, 69, 24, 4, 'sofa2'); rect(246, 66, 26, 3, 'sofa');
  plant(358, 70); plant(360, 22);
  // hall: a long runner and plants at either end
  rect(70, 101, 292, 6, '#7A5A6E'); rect(70, 101, 292, 1, '#93708A');
  plant(62, 96); plant(362, 96);
  // lobby: reception desk, sofa, plants
  shadow(64, 140, 34, 8); rect(64, 140, 34, 6, 'wTop'); rect(65, 141, 32, 2, 'wTop2'); rect(64, 146, 34, 4, 'wEdge'); monitor(74, 134);
  rect(120, 150, 24, 8, 'sofa'); rect(121, 151, 22, 3, 'sofa2'); rect(120, 148, 24, 3, 'sofa');
  plant(64, 158); plant(138, 160); plant(90, 124);
  // operations floor: two rows of desks with screens on
  for (const y of [126, 150]) for (const x of [160, 202, 246, 290, 332]) { desk(x, y, 32); monitor(x + 4, y - 5); monitor(x + 20, y - 5, R() > 0.25); chair(x + 5, y + 10); chair(x + 20, y + 10); }
  rect(356, 120, 12, 8, '#D8D2C6'); rect(357, 121, 10, 3, '#8A93A3');                    // printer
  rect(156, 118, 5, 10, '#BFE3F2'); rect(156, 125, 5, 3, '#8A93A3');                      // water cooler

  // seated people are part of the picture
  for (const n of npcs.filter((x) => x.seated)) person(g, at, S, n.x, n.y, personPal(n.av), { dir: n.facing || 'down', seated: true });
  return off;
}

function car(g, at, px, x, y, color, dir = 'right') {
  const r = (dx, dy, w, h, c) => { const [cx, cy] = at(x + dx, y + dy); g.fillStyle = c; g.fillRect(cx, cy, w * px, h * px); };
  r(1, 12, 24, 2, 'rgba(10,10,20,.25)');
  r(0, 1, 26, 11, '#15131F'); r(1, 2, 24, 9, color); r(1, 2, 24, 2, shade(color, 1.18));
  const front = dir === 'right';
  r(front ? 15 : 5, 3, 6, 7, '#7FB4CF'); r(front ? 4 : 17, 3, 5, 7, '#6A9DB8'); r(front ? 9 : 10, 3, 7, 7, shade(color, 0.92));
  r(front ? 25 : 0, 3, 1, 2, '#F6E7A6'); r(front ? 25 : 0, 8, 1, 2, '#F6E7A6');
  r(4, 0, 4, 1, '#15131F'); r(18, 0, 4, 1, '#15131F'); r(4, 12, 4, 1, '#15131F'); r(18, 12, 4, 1, '#15131F');
}

// ------------------------------------------------------------------ the live map
export function createOffice(holder, { company, playerShirt, npcs = [], reduced = false, night = false, onClock, start = null }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'px-canvas';
  holder.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let off = null, W = 0, H = 0, raf = 0, dead = false, skipping = false;
  const player = { x: start ? start.x : 104, y: start ? start.y : 210, dir: start ? start.dir || 'down' : 'up', frame: 0, seated: !!(start && start.seated), visible: !!start, pal: personPal({ hair: '#2A1C14', skin: '#D9A07A' }, playerShirt) };
  const carState = { x: -40, y: 208, visible: !start };
  const cam = { x: MW / 2, y: MH / 2, z: 1 };
  Object.assign(cam, { tx: cam.x, ty: cam.y, tz: cam.z, follow: false });
  const bubbles = [];
  const walkers = npcs.filter((n) => !n.seated);

  function size() {
    const r = holder.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H;
  }
  const base = () => Math.max(W / MW, H / MH);         // canvas px per map px at zoom 1 (fills the view)
  function clampCam() {
    const s = base() * cam.z, hw = W / s / 2, hh = H / s / 2;
    cam.x = hw * 2 >= MW ? MW / 2 : Math.min(MW - hw, Math.max(hw, cam.x));
    cam.y = hh * 2 >= MH ? MH / 2 : Math.min(MH - hh, Math.max(hh, cam.y));
  }

  function frame(t) {
    if (dead) return;
    if (cam.follow) { cam.tx = player.x; cam.ty = player.y - 6; }
    const k = reduced || skipping ? 1 : 0.07;
    cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k; cam.z += (cam.tz - cam.z) * k;
    clampCam();
    const scale = base() * cam.z;
    const left = cam.x - W / scale / 2, top = cam.y - H / scale / 2;
    const at = (x, y) => [Math.round((x - left) * scale), Math.round((y - top) * scale)];
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0B0A14'; ctx.fillRect(0, 0, W, H);
    if (off) ctx.drawImage(off, left * S, top * S, (W / scale) * S, (H / scale) * S, 0, 0, W, H);
    if (carState.visible) car(ctx, at, scale, carState.x, carState.y, '#3E6FB0');
    const bob = Math.floor(t / 600) % 2;
    for (const n of walkers) person(ctx, at, scale, n.x, n.y - bob * 0.3, personPal(n.av), { dir: n.facing || 'down', frame: 0 });
    if (player.visible) {
      person(ctx, at, scale, player.x, player.y, player.pal, { dir: player.dir, frame: player.frame, seated: player.seated });
      // the 1P marker
      const [mx, my] = at(player.x - 2, player.y - (player.seated ? 15 : 17) - (Math.floor(t / 320) % 2) * 0.7);
      ctx.fillStyle = C.ink; ctx.fillRect(mx - scale, my - scale, scale * 6, scale * 4);
      ctx.fillStyle = '#22D3EE'; ctx.fillRect(mx, my, scale * 4, scale); ctx.fillRect(mx + scale, my + scale, scale * 2, scale);
    }
    if (night) lights(at, scale);
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]; if (t > b.until) { bubbles.splice(i, 1); continue; }
      const [bx, by] = at(b.x, b.y - 18);
      const fs = Math.max(10, Math.round(2.6 * scale));
      ctx.font = fs + 'px "Press Start 2P", monospace';
      const tw = ctx.measureText(b.text).width + fs * 1.4;
      ctx.fillStyle = C.ink; ctx.fillRect(bx - tw / 2 - 3, by - fs * 1.7 - 3, tw + 6, fs * 2.1 + 6);
      ctx.fillStyle = C.white; ctx.fillRect(bx - tw / 2, by - fs * 1.7, tw, fs * 2.1);
      ctx.fillRect(bx - fs * 0.3, by + fs * 0.4, fs * 0.6, fs * 0.6);
      ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.text, bx, by - fs * 0.62);
    }
    raf = requestAnimationFrame(frame);
  }

  // Friday evening: the building after dark, lamps and screens still glowing
  function lights(at, scale) {
    ctx.fillStyle = 'rgba(10,12,38,.66)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, c) => { const [cx, cy] = at(x, y); const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * scale); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(cx - r * scale, cy - r * scale, r * scale * 2, r * scale * 2); };
    for (const x of [72, 300, 368]) glow(x + 1, 192, 26, 'rgba(255,214,140,.45)');
    for (const [x, y] of [[320, 52], [104, 100], [210, 100], [320, 100], [200, 56], [104, 140]]) glow(x, y, 30, 'rgba(255,190,110,.32)');
    for (const y of [124, 148]) for (const x of [164, 206, 250, 294, 336]) glow(x + 8, y, 9, 'rgba(95,211,232,.22)');
    glow(186, 182, 40, 'rgba(127,231,245,.25)');
    ctx.globalCompositeOperation = 'source-over';
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, reduced || skipping ? 0 : ms));
  function camTo(x, y, z, follow = false) { cam.tx = x; cam.ty = y; cam.tz = Math.max(1, z * (W < H ? 0.6 : 1)); cam.follow = follow; }
  function say(x, y, text, ms = 1700) { if (!skipping) { bubbles.push({ x, y, text, until: performance.now() + ms }); sfx.blip(); } }

  async function walk(points, { speed = 46, onPoint } = {}) {
    player.visible = true; player.seated = false;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
      player.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      if (reduced || skipping) { player.x = b.x; player.y = b.y; if (onPoint) await onPoint(i); continue; }
      await new Promise((res) => {
        const t0 = performance.now(), dur = (dist / speed) * 1000;
        let lastStep = -1;
        const tick = (now) => {
          if (dead) return res();
          const p = skipping ? 1 : Math.min(1, (now - t0) / dur);
          player.x = a.x + dx * p; player.y = a.y + dy * p;
          const step = Math.floor((now - t0) / 150);
          if (step !== lastStep) { lastStep = step; player.frame = step; if (step % 2 === 0) sfx.step(step / 2); }
          if (p < 1) requestAnimationFrame(tick); else res();
        };
        requestAnimationFrame(tick);
      });
      if (onPoint) await onPoint(i);
    }
    player.frame = 0;
  }
  const sit = (dir) => { player.seated = true; player.dir = dir; player.frame = 0; };
  const face = (dir) => { player.dir = dir; player.frame = 0; };

  async function arrive() {
    const clock = (m) => onClock && onClock(m);
    clock(42); camTo(MW / 2, MH / 2, 1);
    if (!reduced) sfx.car();
    await new Promise((res) => {
      if (reduced || skipping) { carState.x = 91; return res(); }
      const t0 = performance.now();
      const tick = (now) => { const p = skipping ? 1 : Math.min(1, (now - t0) / 1800); carState.x = -40 + (91 + 40) * (1 - Math.pow(1 - p, 3)); if (p < 1 && !dead) requestAnimationFrame(tick); else res(); };
      requestAnimationFrame(tick);
    });
    sfx.door(); await sleep(350);
    player.visible = true; await sleep(250);
    if (!reduced) { const t0 = performance.now(); const drive = (now) => { carState.x = 91 + (now - t0) / 7; if (carState.x < MW + 30 && !dead) requestAnimationFrame(drive); else carState.visible = false; }; requestAnimationFrame(drive); } else carState.visible = false;
    camTo(104, 180, 1.8, true);
    await walk(ROUTES.arrival, {
      onPoint: async (i) => {
        if (i === 1) { clock(43); sfx.door(); }
        if (i === 2) { say(80, 138, 'MORNING!'); await sleep(700); clock(44); }
        if (i === 3) clock(45);
        if (i === 4) clock(46);
        if (i === 5) { sfx.door(); clock(47); camTo(306, 48, 2.1, false); }
      },
    });
    sit('down');
    clock(48);
  }

  size();
  window.addEventListener('resize', size);
  if (start && start.z) { camTo(start.x, start.y - 6, start.z); cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; }
  const fontReady = (document.fonts && document.fonts.load) ? Promise.race([document.fonts.load('16px "Press Start 2P"'), new Promise((r) => setTimeout(r, 1200))]) : Promise.resolve();
  const ready = fontReady.then(() => { off = drawStatic(company, npcs, night); raf = requestAnimationFrame(frame); });

  return {
    ready, arrive, say, sit, face,
    skip() { skipping = true; },
    walk: (name, opts) => walk(ROUTES[name], opts),
    follow: (z) => camTo(player.x, player.y, z, true),
    view: (x, y, z) => camTo(x, y, z, false),
    destroy() { dead = true; cancelAnimationFrame(raf); window.removeEventListener('resize', size); canvas.remove(); },
  };
}
