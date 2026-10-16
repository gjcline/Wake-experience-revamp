// Sound, synthesized on the fly. No audio files.
// The audio context starts on the player's first click (browsers require it).
//
// Kept minimal on purpose: a faint tap when the player presses something (never on hover), and a
// soft two-note alert when a message or email is delivered. Everything else is silent; the other
// calls stay in place so the screens don't need to know.

let ctx = null, bus = null;
let muted = false;
try { muted = localStorage.getItem('wx-muted') === '1'; } catch (e) { /* storage unavailable */ }

function ac() {
  if (!ctx) {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
    ctx = new A(); bus = ctx.createGain(); bus.gain.value = 0.5; bus.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(c, freq, start, dur, vol, cutoff) {
  const t = c.currentTime + start, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
  f.type = 'lowpass'; f.frequency.setValueAtTime(cutoff, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
  return o;
}

// a faint tap
function click() {
  const c = ac(); if (!c || muted) return;
  const o = tone(c, 900, 0, 0.045, 0.014, 1500);
  o.frequency.exponentialRampToValueAtTime(480, c.currentTime + 0.03);
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

// a message arrived: two soft notes, like a phone on the desk
let lastAlert = 0;
function alert() {
  const c = ac(); if (!c || muted) return;
  const now = Date.now(); if (now - lastAlert < 1200) return; lastAlert = now;
  tone(c, 1047, 0, 0.32, 0.045, 2600);
  tone(c, 1397, 0.11, 0.45, 0.04, 2600);
}

const quiet = () => {};
export const sfx = {
  unlock: () => ac(),
  isMuted: () => muted,
  setMuted(m) { muted = m; try { localStorage.setItem('wx-muted', m ? '1' : '0'); } catch (e) { /* ignore */ } },
  click, alert,
  ambience: quiet,
  blip: quiet, select: quiet, back: quiet, coin: quiet, thunk: quiet, credit: quiet, start: quiet, zoom: quiet,
  count: quiet, go: quiet, step: quiet, type: quiet, door: quiet, car: quiet,
};
