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
};

const sky = (p) => {
  // dawn to full morning, in hard bands
  const top = [[43, 45, 110], [70, 120, 190]], bot = [[244, 154, 108], [242, 212, 146]];
  const mix = (a, b) => a.map((v, i) => Math.round(v + (b[i] - v) * p));
  const t = mix(top[0], top[1]), b = mix(bot[0], bot[1]);
  return Array.from({ length: 6 }, (_, i) => { const k = i / 5; return 'rgb(' + t.map((v, j) => Math.round(v + (b[j] - v) * k)).join(',') + ')'; });
};

export function drawDesk(canvas, progress) {
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
  [[160, 20], [196, 18], [172, 38], [212, 28], [205, 48], [160, 52]].forEach(([x, y]) => { r(x - 2, y - 3, 5, 5, '#FF4F8B'); r(x, y + 2, 1, 3, '#F4F1DE'); });
  // desk
  r(0, 92, DW, 32, '#6B4220'); r(0, 90, DW, 4, '#A86E37'); r(0, 94, DW, 2, '#4E2F17');
  // monitor
  r(92, 50, 58, 36, '#0B0A16'); r(95, 53, 52, 30, '#0E1B2A');
  r(98, 57, 20, 2, '#39E5E0'); [61, 65, 69, 73, 77].forEach((y, i) => r(98, y, [44, 36, 40, 30, 42][i], 1, '#39E5E099'));
  r(98, 68, 26, 3, '#FFD23F'); r(117, 86, 8, 4, '#2C2650'); r(110, 89, 22, 2, '#2C2650');
  r(98, 96, 46, 5, '#2C2650'); for (let x = 100; x < 142; x += 4) r(x, 97, 3, 1, '#4E4A78');
  // inbox tray
  r(18, 84, 44, 8, '#6E6A8E'); r(18, 92, 44, 2, '#4E4A78');
  r(22, 80, 36, 4, '#F4F1DE'); r(24, 77, 34, 3, '#DCD8EC'); r(21, 74, 36, 3, '#F4F1DE'); r(26, 75, 14, 1, '#A6A2C4');
  // mug
  r(68, 80, 10, 12, '#FF4F8B'); r(78, 83, 3, 6, '#FF4F8B'); r(79, 84, 1, 4, '#6B4220');
  if (Math.floor(Date.now() / 600) % 2) { r(70, 74, 1, 4, '#F4F1DE88'); r(74, 72, 1, 4, '#F4F1DE88'); } else { r(71, 73, 1, 4, '#F4F1DE88'); r(75, 74, 1, 4, '#F4F1DE88'); }
  // phone
  r(160, 74, 16, 24, '#0B0A16'); r(162, 77, 12, 17, '#16313A'); r(164, 79, 8, 3, '#F4F1DE'); r(166, 84, 8, 3, '#39E5E0'); r(164, 89, 6, 3, '#F4F1DE');
  // note
  r(184, 80, 18, 18, '#FFD23F'); r(187, 85, 12, 1, '#7A5A10'); r(187, 89, 10, 1, '#7A5A10'); r(187, 93, 11, 1, '#7A5A10');
  // plant
  r(214, 76, 16, 14, '#C2643A'); r(214, 76, 16, 2, '#9A4E2C');
  [[216, 62, 3, 14], [221, 56, 3, 20], [226, 64, 3, 12], [211, 66, 5, 3], [228, 60, 5, 3], [218, 58, 4, 3]].forEach(([x, y, w, h]) => r(x, y, w, h, '#3FA34D'));
}
