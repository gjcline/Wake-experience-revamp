// TRACKING
// One record per run: how far the player got, how long they were actively on it, whether they
// finished, who they are (name, email, phone from the sign-up at Play), whether they already had
// a meeting with Wake, and whether they opened the booking page. It goes to
// /api/track at every step, every 30 seconds while they are active, and when the page is hidden.
// Off inside preview hosts, when opened from a file, and when WAKE_CONFIG.track is false.

export const STEP_NAMES = ['home', 'select', 'ready', 'arrive', 'round1', 'round2', 'meeting', 'week', 'score'];

export function createTracker({ host }) {
  const cfg = window.WAKE_CONFIG || {};
  const on = host !== 'artifact' && /^https?:$/.test(window.location.protocol) && cfg.track !== false;
  const endpoint = cfg.trackEndpoint || '/api/track';
  const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12));
  let visitor = null;
  try { visitor = localStorage.getItem('wx-visitor'); if (!visitor) { visitor = uid(); localStorage.setItem('wx-visitor', visitor); } } catch (e) { visitor = uid(); }
  const q = new URLSearchParams(window.location.search);
  const utm = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref']) if (q.get(k)) utm[k.replace('utm_', '')] = q.get(k);
  let referrer = null;
  try { referrer = document.referrer ? new URL(document.referrer).host : null; } catch (e) { /* fine */ }
  const device = window.matchMedia && window.matchMedia('(pointer: coarse)').matches ? 'mobile' : 'desktop';

  let run = null, activeMs = 0, lastInput = Date.now(), lastSent = '';
  // time counts while the page is visible and the player has done something in the last 2 minutes
  const TICK = 5000;
  setInterval(() => { if (run && document.visibilityState === 'visible' && Date.now() - lastInput < 120000) activeMs += TICK; }, TICK);
  for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) window.addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true });
  setInterval(() => send(), 30000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') send(true); });
  window.addEventListener('pagehide', () => send(true));

  function send(beacon) {
    if (!on || !run) return;
    run.activeSeconds = Math.round(activeMs / 1000);
    const body = JSON.stringify(run);
    if (body === lastSent) return;
    lastSent = body;
    try {
      if (beacon && navigator.sendBeacon) navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
      else fetch(endpoint, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
    } catch (e) { /* never block the experience */ }
  }

  return {
    get id() { return run ? run.id : null; },
    // a new run: the page loads, or Play again
    begin() {
      if (run) send(true);
      activeMs = 0; lastInput = Date.now();
      run = { id: uid(), visitor, startedAt: new Date().toISOString(), step: 0, stepName: 'home', steps: [{ name: 'home', at: 0 }], mode: null, shell: null, role: null, company: null, finished: false, name: null, email: null, phone: null, hasMeeting: null, bookClicked: false, utm, referrer, device, result: null };
      send();
    },
    step(name, extra) {
      if (!run) return;
      const i = STEP_NAMES.indexOf(name);
      if (i > run.step) { run.step = i; run.stepName = name; }
      run.steps.push({ name, at: Math.round(activeMs / 1000) });
      if (extra) Object.assign(run, extra);
      send();
    },
    set(fields) { if (run) { Object.assign(run, fields); send(); } },
  };
}
