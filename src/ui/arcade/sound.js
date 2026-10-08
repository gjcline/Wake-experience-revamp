// Chiptune sound effects, synthesized on the fly. No audio files.
// The audio context starts on the player's first click (browsers require it).

let ctx = null;
let muted = false;
try { muted = localStorage.getItem('wx-muted') === '1'; } catch (e) { /* storage unavailable */ }

function ac() {
  if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, { type = 'square', vol = 0.06, slide = 0 } = {}) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime + start;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  unlock: () => ac(),
  isMuted: () => muted,
  setMuted(m) { muted = m; try { localStorage.setItem('wx-muted', m ? '1' : '0'); } catch (e) { /* ignore */ } },
  blip: () => tone(660, 0, 0.05, { vol: 0.035 }),
  select: () => { tone(880, 0, 0.06); tone(1320, 0.06, 0.09); },
  back: () => tone(330, 0, 0.08, { vol: 0.04 }),
  coin: () => { tone(988, 0, 0.08, { vol: 0.07 }); tone(1319, 0.08, 0.32, { vol: 0.07 }); },
  thunk: () => tone(140, 0, 0.12, { type: 'triangle', vol: 0.12, slide: -60 }),
  credit: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.1, { vol: 0.05 })),
  start: () => [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.085, i === 6 ? 0.35 : 0.09, { vol: 0.05 })),
  zoom: () => tone(220, 0, 0.6, { type: 'triangle', vol: 0.06, slide: 600 }),
  count: () => tone(440, 0, 0.14, { vol: 0.06 }),
  go: () => tone(880, 0, 0.45, { vol: 0.07 }),
  step: (i) => tone(i % 2 ? 180 : 150, 0, 0.03, { type: 'triangle', vol: 0.05 }),
  type: () => tone(1200 + Math.random() * 300, 0, 0.018, { vol: 0.015 }),
  door: () => { tone(300, 0, 0.05, { vol: 0.04 }); tone(450, 0.05, 0.07, { vol: 0.04 }); },
  car: () => tone(70, 0, 1.4, { type: 'sawtooth', vol: 0.025, slide: 40 }),
};
