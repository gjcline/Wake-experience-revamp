// Sound, synthesized on the fly. No audio files.
// The audio context starts on the player's first click (browsers require it).

let ctx = null;
let muted = false;
try { muted = localStorage.getItem('wx-muted') === '1'; } catch (e) { /* storage unavailable */ }

function ac() {
  if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// A faint, soft click when the player presses something. Nothing plays on hover, typing or footsteps.
function click() {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = 'sine'; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.035);
  f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(f).connect(g).connect(c.destination); o.start(t); o.stop(t + 0.06);
}
const CLICKABLE = 'button, a[href], [role="button"], [role="radio"], .spot, .sel, .figbtn, .item, summary, label';
let last = 0;
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !e.target.closest || !e.target.closest(CLICKABLE)) return;
    const now = Date.now(); if (now - last < 40) return; last = now;
    click();
  }, true);
}

// A few soft moments, all sine tones under a low-pass so nothing is sharp: a chime when something
// lands (a finding stored, a decision made), a bell when news arrives, a rising three-note when a
// round is locked in, a warm chord when the week comes in, and a breath of air on transitions.
// Each one is rate-limited so a run of them never stacks into noise.
function voice(freq, start, dur, vol, c, t0) {
  const t = t0 + start, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
  f.type = 'lowpass'; f.frequency.setValueAtTime(2200, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
}
const lastAt = {};
function play(name, gap, notes) {
  const c = ac(); if (!c || muted) return;
  const now = Date.now(); if (lastAt[name] && now - lastAt[name] < gap) return; lastAt[name] = now;
  const t0 = c.currentTime;
  for (const [f, st, d, v] of notes) voice(f, st, d, v, c, t0);
}
function air() {
  const c = ac(); if (!c || muted) return;
  const now = Date.now(); if (lastAt.air && now - lastAt.air < 1200) return; lastAt.air = now;
  const t = c.currentTime, len = 0.7, buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = buf; f.type = 'bandpass'; f.Q.value = 0.8; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(1600, t + len);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.018, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f).connect(g).connect(c.destination); src.start(t); src.stop(t + len);
}

const quiet = () => {};
export const sfx = {
  unlock: () => ac(),
  isMuted: () => muted,
  setMuted(m) { muted = m; try { localStorage.setItem('wx-muted', m ? '1' : '0'); } catch (e) { /* ignore */ } },
  click,
  // something landed: two soft notes, a fifth apart
  coin: () => play('coin', 450, [[659, 0, 0.25, 0.026], [988, 0.07, 0.4, 0.02]]),
  // news arrived: one small bell
  credit: () => play('credit', 1500, [[784, 0, 0.5, 0.02], [1568, 0, 0.3, 0.005]]),
  // a round locked in, or the game begins: a gentle rise
  start: () => play('start', 1500, [[523, 0, 0.3, 0.024], [659, 0.1, 0.3, 0.024], [784, 0.2, 0.6, 0.026]]),
  // the week is in: a warm chord that swells and fades
  go: () => play('go', 1500, [[392, 0, 1.2, 0.018], [494, 0.03, 1.2, 0.016], [587, 0.06, 1.2, 0.016], [784, 0.12, 1.0, 0.012]]),
  // the countdown: a soft tick
  count: () => play('count', 300, [[523, 0, 0.12, 0.02]]),
  // transitions: a breath of air
  zoom: air,
  blip: quiet, select: quiet, back: quiet, thunk: quiet, step: quiet, type: quiet, door: quiet, car: quiet,
};
