// THE CITY MAP
// A quiet pixel street map: river, parks, a grid of roads. Round 1 pins the locations on it;
// the week uses the same map to show each plan playing out where it happens.

export function citySVG() {
  let r = '';
  for (let x = 0; x <= 100; x += 12.5) r += `<rect x="${x}" y="0" width="1.1" height="70" fill="#2A2550"/>`;
  for (let y = 4; y <= 70; y += 11) r += `<rect x="0" y="${y}" width="100" height="1.1" fill="#2A2550"/>`;
  r += '<path d="M0 52 C20 46 30 60 50 54 S80 40 100 46 L100 52 C80 47 70 62 50 60 S20 52 0 58 Z" fill="#1E3B5C"/>';
  r += '<rect x="64" y="12" width="14" height="9" fill="#1F3A2A"/><rect x="8" y="26" width="9" height="7" fill="#1F3A2A"/>';
  r += '<rect x="0" y="33" width="100" height="2" fill="#3B3570"/><rect x="45" y="0" width="2" height="70" fill="#3B3570"/>';
  return `<svg viewBox="0 0 100 70" preserveAspectRatio="none" shape-rendering="crispEdges" aria-hidden="true"><rect width="100" height="70" fill="#15122B"/>${r}</svg>`;
}

// Where head office sits: the free slot farthest from every location pin.
const SLOTS = [[14, 30], [38, 22], [63, 32], [86, 24], [24, 52], [50, 48], [77, 56], [12, 62], [90, 44], [30, 12], [70, 10]];
export function hqPin(pins) {
  let best = SLOTS[0], far = -1;
  for (const s of SLOTS) { const d = Math.min(...pins.map((p) => Math.hypot(p.x - s[0], (p.y - s[1]) * 1.4))); if (d > far) { far = d; best = s; } }
  return { id: 'hq', x: best[0], y: best[1] };
}
