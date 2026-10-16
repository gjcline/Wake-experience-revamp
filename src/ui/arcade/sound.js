// Sound, synthesized on the fly. No audio files.
// The audio context starts on the player's first click (browsers require it).
//
// Three layers, all quiet and all rounded off with low-pass filters so nothing is sharp:
//   - a barely-there tap when the player presses something (never on hover)
//   - a few soft moments: something lands, news arrives, a round locks in, the week comes in
//   - an office in the background while they work: room tone, the air handling, and someone
//     typing a few desks away now and then. It fades in at the desk and out when the work is done.

let ctx = null, fxBus = null, ambBus = null;
let muted = false;
try { muted = localStorage.getItem('wx-muted') === '1'; } catch (e) { /* storage unavailable */ }

function ac() {
  if (!ctx) {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
    ctx = new A();
    fxBus = ctx.createGain(); fxBus.gain.value = 0.5; fxBus.connect(ctx.destination);
    ambBus = ctx.createGain(); ambBus.gain.value = 0; ambBus.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// ------------------------------------------------------------ the tap
function click() {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = 'sine'; o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(480, t + 0.03);
  f.type = 'lowpass'; f.frequency.setValueAtTime(1500, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.014, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  o.connect(f).connect(g).connect(fxBus); o.start(t); o.stop(t + 0.06);
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

// ------------------------------------------------------------ the moments
// Sine tones with a slow, soft attack. Each is rate-limited so a run of them never stacks.
function voice(freq, start, dur, vol, c, t0) {
  const t = t0 + start, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
  f.type = 'lowpass'; f.frequency.setValueAtTime(1800, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(fxBus); o.start(t); o.stop(t + dur + 0.05);
}
const lastAt = {};
function play(name, gap, notes) {
  const c = ac(); if (!c || muted) return;
  const now = Date.now(); if (lastAt[name] && now - lastAt[name] < gap) return; lastAt[name] = now;
  const t0 = c.currentTime;
  for (const [f, st, d, v] of notes) voice(f, st, d, v, c, t0);
}
function noiseBuffer(c, secs, brown) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * secs), c.sampleRate), d = buf.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { lastOut = (lastOut + 0.02 * w) / 1.02; d[i] = lastOut * 3.5; } else d[i] = w; }
  return buf;
}
function air() {
  const c = ac(); if (!c || muted) return;
  const now = Date.now(); if (lastAt.air && now - lastAt.air < 1500) return; lastAt.air = now;
  const t = c.currentTime, len = 0.9;
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = noiseBuffer(c, len); f.type = 'bandpass'; f.Q.value = 0.7; f.frequency.setValueAtTime(350, t); f.frequency.exponentialRampToValueAtTime(1200, t + len);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.012, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f).connect(g).connect(fxBus); src.start(t); src.stop(t + len);
}

// ------------------------------------------------------------ the office
let amb = null, ambLevel = 0, typingTimer = null;
function buildOffice(c) {
  // room tone: a low, steady body of air
  const room = c.createBufferSource(); room.buffer = noiseBuffer(c, 6, true); room.loop = true;
  const roomF = c.createBiquadFilter(); roomF.type = 'lowpass'; roomF.frequency.value = 260;
  const roomG = c.createGain(); roomG.gain.value = 0.026;
  room.connect(roomF).connect(roomG).connect(ambBus);
  // the air handling: a soft hiss up high, breathing slowly
  const hvac = c.createBufferSource(); hvac.buffer = noiseBuffer(c, 5); hvac.loop = true;
  const hvacF = c.createBiquadFilter(); hvacF.type = 'bandpass'; hvacF.frequency.value = 700; hvacF.Q.value = 0.4;
  const hvacG = c.createGain(); hvacG.gain.value = 0.0024;
  const lfo = c.createOscillator(), lfoG = c.createGain(); lfo.frequency.value = 0.05; lfoG.gain.value = 0.0008;
  lfo.connect(lfoG).connect(hvacG.gain);
  hvac.connect(hvacF).connect(hvacG).connect(ambBus);
  // a faint electrical hum under it all, like lights and screens
  const hum = c.createOscillator(); hum.type = 'sine'; hum.frequency.value = 120;
  const humG = c.createGain(); humG.gain.value = 0.0009;
  hum.connect(humG).connect(ambBus);
  room.start(); hvac.start(); lfo.start(); hum.start();
  return { stop: () => { for (const n of [room, hvac, lfo, hum]) { try { n.stop(); } catch (e) { /* already stopped */ } } } };
}
// someone typing a few desks away: short runs of muffled keys, then a pause
function typeRun() {
  const c = ctx; if (!c || !amb) return;
  let t = c.currentTime + 0.05;
  const keys = 6 + Math.floor(Math.random() * 22);
  const tap = noiseBuffer(c, 0.02);
  const pan = c.createStereoPanner ? c.createStereoPanner() : null; if (pan) pan.pan.value = Math.random() * 1.2 - 0.6;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1700 + Math.random() * 600; f.Q.value = 1.1;
  const far = c.createBiquadFilter(); far.type = 'lowpass'; far.frequency.value = 2600;
  const out = c.createGain(); out.gain.value = 1;
  f.connect(far).connect(out); (pan ? out.connect(pan).connect(ambBus) : out.connect(ambBus));
  for (let i = 0; i < keys; i++) {
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = tap;
    const v = 0.0035 + Math.random() * 0.0025 + (Math.random() < 0.08 ? 0.002 : 0);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    s.connect(g).connect(f); s.start(t); s.stop(t + 0.04);
    t += 0.07 + Math.random() * 0.13 + (Math.random() < 0.12 ? 0.3 : 0);
  }
}
function scheduleTyping() {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => { if (amb && !muted) typeRun(); if (amb) scheduleTyping(); }, 5000 + Math.random() * 14000);
}
// level: 1 at the desk, lower in the meeting room, 0 fades it out
function ambience(level = 1) {
  const c = ac(); if (!c) return;
  ambLevel = level;
  const t = c.currentTime;
  if (level > 0 && !amb) { amb = buildOffice(c); scheduleTyping(); }
  ambBus.gain.cancelScheduledValues(t);
  ambBus.gain.setValueAtTime(ambBus.gain.value, t);
  ambBus.gain.linearRampToValueAtTime(muted ? 0 : level, t + (level > 0 ? 2.5 : 1.8));
  if (level === 0 && amb) {
    const was = amb; amb = null; clearTimeout(typingTimer);
    setTimeout(() => { if (!amb) was.stop(); else was.stop(); }, 2000);
  }
}

const quiet = () => {};
export const sfx = {
  unlock: () => ac(),
  isMuted: () => muted,
  setMuted(m) {
    muted = m; try { localStorage.setItem('wx-muted', m ? '1' : '0'); } catch (e) { /* ignore */ }
    if (ctx) { const t = ctx.currentTime; ambBus.gain.cancelScheduledValues(t); ambBus.gain.setValueAtTime(ambBus.gain.value, t); ambBus.gain.linearRampToValueAtTime(m ? 0 : ambLevel, t + 0.6); }
  },
  click,
  ambience,
  // something landed: two soft notes, a fifth apart
  coin: () => play('coin', 600, [[659, 0, 0.35, 0.016], [988, 0.08, 0.5, 0.01]]),
  // news arrived: one small bell
  credit: () => play('credit', 2500, [[784, 0, 0.6, 0.011], [1568, 0, 0.35, 0.003]]),
  // a round locked in, or the game begins: a gentle rise
  start: () => play('start', 2000, [[523, 0, 0.4, 0.014], [659, 0.12, 0.4, 0.014], [784, 0.24, 0.8, 0.015]]),
  // the week is in: a warm chord that swells and fades
  go: () => play('go', 2000, [[392, 0, 1.4, 0.011], [494, 0.04, 1.4, 0.009], [587, 0.08, 1.4, 0.009], [784, 0.14, 1.2, 0.006]]),
  // the countdown: a soft tick
  count: () => play('count', 300, [[523, 0, 0.14, 0.011]]),
  // transitions: a breath of air
  zoom: air,
  blip: quiet, select: quiet, back: quiet, thunk: quiet, step: quiet, type: quiet, door: quiet, car: quiet,
};
