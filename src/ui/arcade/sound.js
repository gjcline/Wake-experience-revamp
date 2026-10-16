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

// The only sound is a faint, soft click when the player presses something. Everything else the
// screens used to play (hover blips, typing, coins, fanfares, footsteps) is silent; the calls
// stay in place so nothing else has to change.
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

const quiet = () => {};
export const sfx = {
  unlock: () => ac(),
  isMuted: () => muted,
  setMuted(m) { muted = m; try { localStorage.setItem('wx-muted', m ? '1' : '0'); } catch (e) { /* ignore */ } },
  click,
  blip: quiet, select: quiet, back: quiet, coin: quiet, thunk: quiet, credit: quiet, start: quiet, zoom: quiet,
  count: quiet, go: quiet, step: quiet, type: quiet, door: quiet, car: quiet,
};
