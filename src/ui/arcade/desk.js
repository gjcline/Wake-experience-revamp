// YOUR DESK
// The office seen from the chair, drawn as pixel art. Objects are data: each one has the
// rectangle it occupies, so the clickable spots always line up with the drawing.

export const DW = 240, DH = 124;

export const OBJECTS = {
  calendar: { rect: [112, 12, 26, 36] },
  location: { rect: [148, 8, 80, 54] },
  report: { rect: [88, 48, 66, 46] },
  email: { rect: [16, 70, 48, 24] },
  message: { rect: [158, 72, 20, 28] },
  note: { rect: [182, 78, 22, 22] },
  team: { rect: [209, 62, 28, 32] },
};

const sky = (p) => {
  // dawn to full morning, in hard bands
  const top = [[43, 45, 110], [70, 120, 190]], bot = [[244, 154, 108], [242, 212, 146]];
  const mix = (a, b) => a.map((v, i) => Math.round(v + (b[i] - v) * p));
  const t = mix(top[0], top[1]), b = mix(bot[0], bot[1]);
  return Array.from({ length: 6 }, (_, i) => { const k = i / 5; return 'rgb(' + t.map((v, j) => Math.round(v + (b[j] - v) * k)).join(',') + ')'; });
};

export function drawDesk(canvas, progress, pins = 3, mode = 'r1', glow = 0) {
  canvas.width = DW; canvas.height = DH;
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  // wall
  r(0, 0, DW, DH, '#1B1838');
  for (let x = 0; x < DW; x += 24) r(x, 0, 1, 80, '#221E44');
  r(0, 76, DW, 2, '#2C2650');
  // window and sky
  r(12, 8, 92, 60, '#3B3560');
  const bands = sky(progress);
  bands.forEach((c, i) => r(15, 11 + i * 9, 86, 9, c));
  const sx = 30 + Math.round(progress * 46), sy = 52 - Math.round(progress * 34);
  r(sx - 4, sy - 6, 8, 12, '#FFE58A'); r(sx - 6, sy - 4, 12, 8, '#FFE58A'); r(sx - 3, sy - 3, 6, 6, '#FFD23F');
  const bl = [[15, 44, 12], [29, 36, 10], [41, 48, 14], [57, 32, 8], [67, 42, 13], [82, 38, 10], [94, 50, 7]];
  for (const [x, y, w] of bl) { r(x, y, w, 65 - y, '#2A2650'); for (let wy = y + 3; wy < 62; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4) if ((wx * 7 + wy * 3) % 5 < 2) r(wx, wy, 2, 2, '#FFD23F66'); }
  r(57, 11, 3, 54, '#3B3560'); r(15, 37, 86, 3, '#3B3560');
  // calendar
  r(112, 12, 26, 36, '#F4F1DE'); r(112, 12, 26, 8, '#FF4F8B');
  for (let y = 0; y < 4; y++) for (let x = 0; x < 5; x++) r(115 + x * 4.6, 23 + y * 6, 3, 4, '#C9C4DE');
  r(115 + 1 * 4.6, 23 + 2 * 6, 3, 4, '#FFD23F');
  // location board
  r(148, 8, 80, 54, '#3B3560'); r(151, 11, 74, 48, '#24473F');
  r(151, 30, 74, 4, '#3E6B60'); r(180, 11, 4, 48, '#3E6B60'); r(151, 46, 30, 3, '#3E6B60');
  if (mode === 'wake') {
    // the executive board: a forecast line, pacing bars, a brief pinned to it
    r(151, 11, 74, 48, '#1C1A3A');
    r(155, 15, 30, 2, '#39E5E0'); r(155, 19, 22, 1, '#ABA7C8');
    const line = [[156, 46], [162, 42], [168, 44], [174, 36], [180, 34], [186, 28], [192, 26]];
    for (let i = 1; i < line.length; i++) { const [x0, y0] = line[i - 1], [x1, y1] = line[i]; for (let t = 0; t <= 6; t++) r(Math.round(x0 + (x1 - x0) * t / 6), Math.round(y0 + (y1 - y0) * t / 6), 2, 2, '#39E5E0'); }
    r(155, 50, 40, 1, '#4E4A78');
    [[200, 30, 8, '#39E5E0'], [206, 24, 14, '#39E5E0'], [212, 34, 4, '#FF4F8B'], [218, 28, 10, '#FFD23F']].forEach(([x, , hh, c]) => r(x, 50 - hh, 4, hh, c));
    r(198, 14, 24, 10, '#F4F1DE'); r(200, 17, 18, 1, '#2C2650'); r(200, 20, 14, 1, '#2C2650');
  } else {
    [[196, 22], [160, 20], [172, 40], [212, 30], [205, 50], [160, 53], [190, 50]].slice(0, Math.max(1, Math.min(7, pins))).forEach(([x, y]) => { r(x - 2, y - 3, 5, 5, '#FF4F8B'); r(x, y + 2, 1, 3, '#F4F1DE'); });
  }
  // desk
  r(0, 92, DW, 32, '#6B4220'); r(0, 90, DW, 4, '#A86E37'); r(0, 94, DW, 2, '#4E2F17');
  // monitor
  r(92, 50, 58, 36, '#0B0A16'); r(95, 53, 52, 30, '#0E1B2A');
  if (mode === 'wake') {
    r(95, 53, 52, 30, glow ? 'rgb(' + Math.round(14 + 40 * glow) + ',' + Math.round(27 + 160 * glow) + ',' + Math.round(42 + 150 * glow) + ')' : '#0E1B2A');
    r(98, 56, 6, 2, '#39E5E0'); r(106, 56, 16, 2, '#F4F1DE');
    [[59, '#FF4F8B', 40], [64, '#39E5E0', 34], [69, '#39E5E0', 38], [74, '#39E5E0', 28], [79, '#4E7A8A', 30]].forEach(([y, c, ww]) => { r(98, y, 3, 3, c); r(103, y, ww, 1, '#39E5E099'); r(103, y + 2, ww - 10, 1, '#39E5E055'); });
  } else {
    r(98, 57, 20, 2, '#39E5E0'); [61, 65, 69, 73, 77].forEach((y, i) => r(98, y, [44, 36, 40, 30, 42][i], 1, '#39E5E099'));
    r(98, 68, 26, 3, '#FFD23F');
  } r(117, 86, 8, 4, '#2C2650'); r(110, 89, 22, 2, '#2C2650');
  r(98, 96, 46, 5, '#2C2650'); for (let x = 100; x < 142; x += 4) r(x, 97, 3, 1, '#4E4A78');
  // inbox tray
  r(18, 84, 44, 8, '#6E6A8E'); r(18, 92, 44, 2, '#4E4A78');
  if (mode === 'wake') { r(22, 80, 36, 4, '#F4F1DE'); r(26, 81, 14, 1, '#39E5E0'); }
  else { r(22, 80, 36, 4, '#F4F1DE'); r(24, 77, 34, 3, '#DCD8EC'); r(21, 74, 36, 3, '#F4F1DE'); r(26, 75, 14, 1, '#A6A2C4'); }
  // mug
  r(68, 80, 10, 12, '#FF4F8B'); r(78, 83, 3, 6, '#FF4F8B'); r(79, 84, 1, 4, '#6B4220');
  if (Math.floor(Date.now() / 600) % 2) { r(70, 74, 1, 4, '#F4F1DE88'); r(74, 72, 1, 4, '#F4F1DE88'); } else { r(71, 73, 1, 4, '#F4F1DE88'); r(75, 74, 1, 4, '#F4F1DE88'); }
  // phone
  r(160, 74, 16, 24, '#0B0A16'); r(162, 77, 12, 17, '#16313A'); r(164, 79, 8, 3, '#F4F1DE'); r(166, 84, 8, 3, '#39E5E0'); r(164, 89, 6, 3, '#F4F1DE');
  // note
  if (mode === 'wake') { r(184, 78, 18, 22, '#F4F1DE'); r(184, 78, 18, 3, '#39E5E0'); [84, 87, 90, 93, 96].forEach((y, i) => r(187, y, [12, 10, 12, 8, 11][i], 1, '#6E6A8E')); }
  else { r(184, 80, 18, 18, '#FFD23F'); r(187, 85, 12, 1, '#7A5A10'); r(187, 89, 10, 1, '#7A5A10'); r(187, 93, 11, 1, '#7A5A10'); }
  // team: the org chart on a clipboard
  r(211, 66, 24, 28, '#A86E37'); r(213, 69, 20, 23, '#F4F1DE'); r(219, 63, 8, 5, '#6E6A8E');
  r(220, 71, 6, 3, '#FF4F8B'); r(222, 74, 1, 3, '#2C2650'); r(216, 77, 14, 1, '#2C2650');
  r(216, 78, 1, 2, '#2C2650'); r(222, 78, 1, 2, '#2C2650'); r(229, 78, 1, 2, '#2C2650');
  r(214, 80, 5, 3, '#39E5E0'); r(220, 80, 5, 3, '#39E5E0'); r(227, 80, 5, 3, '#39E5E0');
  r(215, 86, 15, 1, '#A6A2C4'); r(215, 89, 11, 1, '#A6A2C4');
}
