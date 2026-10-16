// The game is silent except for one sound: a soft two-note alert when a message or email is
// delivered at the desk, like a phone buzzing next to you. Every other call is a no-op.

let ctx = null, bus = null, lastAlert = 0;
function ac() {
  if (!ctx) {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
    ctx = new A(); bus = ctx.createGain(); bus.gain.value = 0.5; bus.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(c, freq, start, dur, vol) {
  const t = c.currentTime + start, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
  f.type = 'lowpass'; f.frequency.setValueAtTime(2600, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
function alert() {
  const c = ac(); if (!c) return;
  const now = Date.now(); if (now - lastAlert < 1200) return; lastAlert = now;
  tone(c, 1047, 0, 0.32, 0.045);
  tone(c, 1397, 0.11, 0.45, 0.04);
}
// browsers only allow audio after the player has interacted, so wake it on the first press
if (typeof document !== 'undefined') document.addEventListener('pointerdown', () => { if (!ctx) ac(); }, { capture: true, once: true });

const quiet = () => {};
export const sfx = new Proxy({ alert, unlock: () => ac(), isMuted: () => false }, { get: (o, k) => (k in o ? o[k] : quiet) });
