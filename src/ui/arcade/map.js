// BIRD'S-EYE MAP
// A pixel floor plan of the company's head office, a walking player avatar, and a camera.
// Rooms and routes are data, so any screen can call walk('toMeeting') later and get the
// same animation between rooms.

import { sfx } from './sound.js';

const S = 4;                    // offscreen resolution: 4 canvas pixels per map pixel
const MW = 320, MH = 200;       // map size in map pixels

const C = {
  grass: '#2B5E3B', grass2: '#23502F', road: '#2F2E3D', lane: '#F2C94C', curb: '#77748A', walk: '#8E8BA0',
  lot: '#3A3949', lotLine: '#C9C6D6', wall: '#141224', wallTop: '#3B3560',
  lobby: '#C7A979', lobby2: '#BC9D6C', hall: '#7C83A3', hall2: '#737A99', ops: '#5F6F99', ops2: '#58678F',
  meet: '#6B5A8E', meet2: '#634F87', brk: '#BFC8CC', brk2: '#AEB8BD', mine: '#3F7F86', mine2: '#397379',
  desk: '#8B5A2B', deskTop: '#A86E37', screen: '#39E5E0', plant: '#3FA34D', pot: '#C2643A', chair: '#26233D',
  label: '#F4F1DE', sign: '#0B0A16', signText: '#FFD23F', car: '#FF4F8B', car2: '#FFD23F', car3: '#39E5E0', glass: '#9FE8F0',
};

// Rooms (map pixels). Doors are gaps in walls; routes run through them.
export const ROOMS = {
  lobby: { x: 100, y: 68, w: 64, h: 56, floor: ['lobby', 'lobby2'], label: 'LOBBY' },
  ops: { x: 168, y: 68, w: 140, h: 56, floor: ['ops', 'ops2'], label: 'OPERATIONS', labelY: 73 },
  hall: { x: 100, y: 128, w: 208, h: 16, floor: ['hall', 'hall2'], label: '' },
  meeting: { x: 100, y: 148, w: 88, h: 44, floor: ['meet', 'meet2'], label: 'MEETING ROOM' },
  break: { x: 192, y: 148, w: 40, h: 44, floor: ['brk', 'brk2'], label: 'BREAK' },
  office: { x: 236, y: 148, w: 72, h: 44, floor: ['mine', 'mine2'], label: 'YOUR OFFICE' },
};

const P = (x, y) => ({ x, y });
export const ROUTES = {
  arrival: [P(124, 38), P(132, 46), P(132, 66), P(132, 84), P(156, 90), P(156, 114), P(132, 118), P(132, 136), P(264, 136), P(264, 152), P(252, 152), P(252, 180), P(284, 180)],
  toMeeting: [P(284, 180), P(252, 180), P(252, 152), P(264, 152), P(264, 136), P(144, 136), P(144, 154), P(110, 160), P(110, 178)],
  toOffice: [P(110, 178), P(110, 160), P(144, 154), P(144, 136), P(264, 136), P(264, 152), P(252, 152), P(252, 180), P(284, 180)],
};

// 7 x 10 sprites. H hair, S skin, C shirt, P pants, K shoes.
const DOWN = ['..HHH..', '.HHHHH.', '.HSSSH.', '..SSS..', '.CCCCC.', 'SCCCCCS', '.CCCCC.'];
const UP = ['..HHH..', '.HHHHH.', '.HHHHH.', '..HHH..', '.CCCCC.', 'SCCCCCS', '.CCCCC.'];
const LEGS = [['.PP.PP.', '.PP.PP.', '.KK.KK.'], ['.PPPP..', '.PP.PP.', 'KK...KK'], ['.PP.PP.', '.PP.PP.', '.KK.KK.'], ['..PPPP.', '.PP.PP.', 'KK...KK']];

function sprite(ctx, rows, x, y, pal, px) {
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
    const k = rows[r][c]; if (k === '.') continue;
    ctx.fillStyle = pal[k]; ctx.fillRect(x + c * px, y + r * px, px, px);
  }
}

export function personPal(av, shirt) { return { H: av.hair, S: av.skin, C: shirt || av.shirt, P: '#2B2A3A', K: '#0E0D18' }; }

function drawStatic(company, npcs) {
  const off = document.createElement('canvas');
  off.width = MW * S; off.height = MH * S;
  const g = off.getContext('2d');
  g.imageSmoothingEnabled = false;
  const rect = (x, y, w, h, c) => { g.fillStyle = C[c] || c; g.fillRect(x * S, y * S, w * S, h * S); };
  const checker = (x, y, w, h, a, b, n = 8) => { for (let i = 0; i < w; i += n) for (let j = 0; j < h; j += n) rect(x + i, y + j, Math.min(n, w - i), Math.min(n, h - j), ((i + j) / n) % 2 ? b : a); };
  const text = (str, x, y, size, color, align = 'center') => { g.font = size + 'px "Press Start 2P", monospace'; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(str, x * S, y * S); };

  // outside
  checker(0, 0, MW, MH, 'grass', 'grass2', 16);
  rect(0, 0, MW, 40, 'road');
  for (let x = 4; x < MW; x += 20) rect(x, 19, 10, 2, 'lane');
  rect(0, 40, MW, 2, 'curb'); rect(0, 42, MW, 10, 'walk');
  for (let x = 0; x < MW; x += 12) rect(x, 42, 1, 10, 'curb');
  // parking lot
  rect(0, 60, 90, 140, 'lot');
  for (let y = 70; y < 196; y += 22) { rect(6, y, 30, 1, 'lotLine'); rect(54, y, 30, 1, 'lotLine'); }
  [[10, 74, 'car2'], [58, 96, 'car3'], [10, 140, 'car'], [58, 162, 'car2'], [10, 184, 'car3']].forEach(([x, y, c]) => { rect(x, y, 22, 12, c); rect(x + 4, y + 2, 14, 8, 'glass'); rect(x + 7, y + 3, 8, 6, c); });
  // bushes and sign
  for (let x = 96; x < 312; x += 14) { rect(x, 54, 8, 6, 'plant'); }
  rect(150, 52, 108, 10, 'sign'); text(company.toUpperCase(), 204, 57.5, 13, C.signText);

  // building shell
  rect(96, 64, 216, 132, 'wall');
  for (const r of Object.values(ROOMS)) checker(r.x, r.y, r.w, r.h, r.floor[0], r.floor[1], 8);
  // doors (gaps in walls)
  rect(124, 64, 16, 4, 'lobby');                      // front entrance
  rect(124, 124, 16, 4, 'hall');                      // lobby to hall
  rect(136, 144, 16, 4, 'hall');                      // hall to meeting room
  rect(204, 144, 16, 4, 'hall');                      // hall to break room
  rect(256, 144, 16, 4, 'hall');                      // hall to your office
  rect(164, 100, 4, 16, 'lobby');                     // lobby to operations
  rect(124, 63, 16, 1, '#FFD23F');                    // door mat light

  // lobby: reception desk and plants
  rect(112, 96, 36, 8, 'desk'); rect(112, 96, 36, 2, 'deskTop'); rect(118, 97, 6, 3, 'screen');
  rect(102, 70, 6, 6, 'plant'); rect(103, 76, 4, 3, 'pot'); rect(156, 70, 6, 6, 'plant'); rect(157, 76, 4, 3, 'pot');
  // operations floor: desk pods
  for (const [x, y] of [[180, 78], [214, 78], [248, 78], [180, 104], [214, 104], [248, 104]]) {
    rect(x, y, 26, 7, 'desk'); rect(x, y, 26, 2, 'deskTop'); rect(x + 4, y + 1, 6, 3, 'screen'); rect(x + 16, y + 1, 6, 3, 'screen');
  }
  rect(290, 72, 12, 46, '#2C2A45'); for (let y = 76; y < 116; y += 8) rect(292, y, 8, 5, '#4E4A78');   // file wall
  // meeting room: long table and chairs
  rect(116, 162, 60, 14, 'desk'); rect(116, 162, 60, 2, 'deskTop');
  for (let x = 120; x < 174; x += 12) { rect(x, 157, 6, 4, 'chair'); rect(x, 177, 6, 4, 'chair'); }
  rect(104, 152, 2, 34, '#F4F1DE'); // whiteboard
  // break room
  rect(196, 152, 12, 8, '#4E4A78'); rect(199, 153, 6, 3, '#FF4F8B'); rect(214, 168, 14, 10, 'desk'); rect(214, 168, 14, 2, 'deskTop');
  // your office: desk, monitor, chair, plant, window
  rect(266, 160, 38, 12, 'desk'); rect(266, 160, 38, 3, 'deskTop'); rect(276, 161, 14, 5, 'screen'); rect(296, 163, 4, 4, '#FFD23F');
  rect(280, 176, 8, 6, 'chair'); rect(240, 152, 6, 6, 'plant'); rect(241, 158, 4, 3, 'pot');
  rect(250, 194, 40, 2, '#9FE8F0');
  // labels
  for (const r of Object.values(ROOMS)) if (r.label && r !== ROOMS.office) text(r.label, r.x + r.w / 2, r.labelY || r.y + r.h - 5, 10, 'rgba(244,241,222,.85)');
  text('YOUR OFFICE', 272, 188, 10, '#F4F1DE');
  // seated people
  for (const n of npcs.filter((n) => n.seated)) sprite(g, n.facing === 'up' ? UP : DOWN, n.x * S - 14, n.y * S - 20, personPal(n.av), S);
  return off;
}

export function createMap(holder, { company, playerShirt, npcs = [], reduced = false, onClock, start = null }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'map-canvas';
  holder.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let off = null, W = 0, H = 0, dpr = 1, raf = 0, dead = false, skipping = false;
  const player = { x: start ? start.x : 124, y: start ? start.y : 38, dir: 'up', frame: 0, visible: !!start, pal: personPal({ hair: '#2A1C14', skin: '#D9A07A' }, playerShirt) };
  const car = { x: -30, y: 24, visible: !start };
  const cam = start && start.z ? { x: start.x, y: start.y, z: start.z, tx: start.x, ty: start.y, tz: start.z, follow: false } : { x: MW / 2, y: MH / 2, z: 1, tx: MW / 2, ty: MH / 2, tz: 1, follow: false };
  const bubbles = [];
  const walkers = npcs.filter((n) => !n.seated);

  function size() {
    const r = holder.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.round(r.width * dpr); H = Math.round(r.height * dpr);
    canvas.width = W; canvas.height = H;
  }

  function clampCam() {
    const hw = MW / 2 / cam.z, hh = MH / 2 / cam.z;
    cam.x = Math.min(MW - hw, Math.max(hw, cam.x)); cam.y = Math.min(MH - hh, Math.max(hh, cam.y));
  }

  function frame(t) {
    if (dead) return;
    if (cam.follow) { cam.tx = player.x; cam.ty = player.y; }
    const k = reduced || skipping ? 1 : 0.06;
    cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k; cam.z += (cam.tz - cam.z) * k;
    clampCam();
    const scale = (W / MW) * cam.z;               // canvas px per map px
    const left = cam.x - W / scale / 2, top = cam.y - H / scale / 2;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#07060F'; ctx.fillRect(0, 0, W, H);
    if (off) ctx.drawImage(off, left * S, top * S, (W / scale) * S, (H / scale) * S, 0, 0, W, H);
    const px = scale;                               // one sprite pixel = one map pixel
    const at = (x, y) => [(x - left) * scale, (y - top) * scale];
    if (car.visible) {
      const [cx, cy] = at(car.x, car.y);
      ctx.fillStyle = C.car; ctx.fillRect(cx, cy, 24 * px, 11 * px);
      ctx.fillStyle = C.glass; ctx.fillRect(cx + 15 * px, cy + 2 * px, 6 * px, 7 * px); ctx.fillRect(cx + 3 * px, cy + 2 * px, 5 * px, 7 * px);
      ctx.fillStyle = '#0E0D18'; [[3, -1], [16, -1], [3, 10], [16, 10]].forEach(([x, y]) => ctx.fillRect(cx + x * px, cy + y * px, 5 * px, 2 * px));
    }
    const bob = Math.floor(t / 500) % 2;
    for (const n of walkers) { const [nx, ny] = at(n.x - 3.5, n.y - 9 - bob * 0.5); sprite(ctx, DOWN.concat(LEGS[0]), nx, ny, personPal(n.av), px); }
    if (player.visible) {
      const [x, y] = at(player.x - 3.5, player.y - 9);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x + px, y + 9.5 * px, 5 * px, 1.2 * px);
      const body = player.dir === 'up' ? UP : DOWN;
      ctx.save();
      if (player.dir === 'left') { ctx.translate(x * 2 + 7 * px, 0); ctx.scale(-1, 1); }
      sprite(ctx, body.concat(LEGS[player.frame % 4]), x, y, player.pal, px);
      ctx.restore();
      // the 1P marker
      const my = y - 5 * px - (Math.floor(t / 300) % 2) * px * 0.6;
      ctx.fillStyle = '#FFD23F'; ctx.fillRect(x + 2 * px, my, 3 * px, px); ctx.fillRect(x + 3 * px, my + px, px, px);
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]; if (t > b.until) { bubbles.splice(i, 1); continue; }
      const [bx, by] = at(b.x, b.y - 14);
      const fs = Math.max(9, Math.round(2.4 * scale));
      ctx.font = fs + 'px "Press Start 2P", monospace';
      const tw = ctx.measureText(b.text).width + fs;
      ctx.fillStyle = '#F4F1DE'; ctx.fillRect(bx - tw / 2, by - fs * 1.6, tw, fs * 1.9);
      ctx.fillRect(bx - fs * 0.3, by + fs * 0.3, fs * 0.6, fs * 0.5);
      ctx.fillStyle = '#07060F'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.text, bx, by - fs * 0.62);
    }
    raf = requestAnimationFrame(frame);
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, reduced || skipping ? 0 : ms));
  function camTo(x, y, z, follow = false) { cam.tx = x; cam.ty = y; cam.tz = z; cam.follow = follow; }
  function say(x, y, text, ms = 1600) { if (!skipping) { bubbles.push({ x, y, text, until: performance.now() + ms }); sfx.blip(); } }

  async function walk(points, { speed = 52, onPoint } = {}) {
    player.visible = true;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
      player.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      if (reduced || skipping) { player.x = b.x; player.y = b.y; if (onPoint) onPoint(i); continue; }
      await new Promise((res) => {
        const t0 = performance.now(), dur = (dist / speed) * 1000;
        let lastStep = -1;
        const tick = (now) => {
          if (dead) return res();
          const p = skipping ? 1 : Math.min(1, (now - t0) / dur);
          player.x = a.x + dx * p; player.y = a.y + dy * p;
          const step = Math.floor((now - t0) / 140);
          if (step !== lastStep) { lastStep = step; player.frame = step; if (step % 2 === 0) sfx.step(step / 2); }
          if (p < 1) requestAnimationFrame(tick); else res();
        };
        requestAnimationFrame(tick);
      });
      if (onPoint) await onPoint(i);
    }
    player.frame = 0; player.dir = points.length > 1 ? 'up' : player.dir;
  }

  async function arrive() {
    const clock = (m) => onClock && onClock(m);
    clock(42); camTo(MW / 2, MH / 2, 1);
    if (!reduced) sfx.car();
    // the car pulls up to the curb
    await new Promise((res) => {
      if (reduced || skipping) { car.x = 108; return res(); }
      const t0 = performance.now();
      const tick = (now) => { const p = skipping ? 1 : Math.min(1, (now - t0) / 1600); car.x = -30 + (108 + 30) * (1 - Math.pow(1 - p, 3)); if (p < 1 && !dead) requestAnimationFrame(tick); else res(); };
      requestAnimationFrame(tick);
    });
    sfx.door(); await sleep(350);
    player.visible = true; await sleep(250);
    // drive away while the player heads in
    if (!reduced) { const t0 = performance.now(); const drive = (now) => { car.x = 108 + (now - t0) / 6; if (car.x < MW + 30 && !dead) requestAnimationFrame(drive); else car.visible = false; }; requestAnimationFrame(drive); } else car.visible = false;
    camTo(132, 70, 1.7, true);
    await walk(ROUTES.arrival, {
      onPoint: async (i) => {
        if (i === 2) { clock(43); sfx.door(); camTo(132, 90, 2.2, true); }
        if (i === 3) { say(130, 112, 'MORNING!'); await sleep(900); clock(44); }
        if (i === 7) clock(45);
        if (i === 8) clock(46);
        if (i === 9) { sfx.door(); clock(47); camTo(272, 170, 3, false); }
      },
    });
    clock(48);
  }

  function skip() { skipping = true; }

  size();
  window.addEventListener('resize', size);
  const fontReady = (document.fonts && document.fonts.load) ? Promise.race([document.fonts.load('16px "Press Start 2P"'), new Promise((r) => setTimeout(r, 1200))]) : Promise.resolve();
  const ready = fontReady.then(() => { off = drawStatic(company, npcs); raf = requestAnimationFrame(frame); });

  return {
    ready, arrive, skip, say,
    walk: (name, opts) => walk(ROUTES[name], opts),
    follow: (z) => camTo(player.x, player.y, z, true),
    view: (x, y, z) => camTo(x, y, z, false),
    focus: (room, z = 3) => { const r = ROOMS[room]; camTo(r.x + r.w / 2, r.y + r.h / 2, z); },
    destroy() { dead = true; cancelAnimationFrame(raf); window.removeEventListener('resize', size); canvas.remove(); },
  };
}
