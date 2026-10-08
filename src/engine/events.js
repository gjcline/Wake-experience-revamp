// EVENT ENGINE
// Scheduled events fire at a time. Triggered events arm when the user has seen enough of a
// set of signals, wait a short delay, then fire. An event can only make an existing source
// available. It can never create or alter information.

import { fmtClock } from './config.js';

export function createEventEngine(world) {
  function tick(state) {
    const fired = [];
    for (const ev of world.events) {
      const es = state.events[ev.id] || (state.events[ev.id] = { armedAt: null, firedAt: null });
      if (es.firedAt !== null) continue;
      let due = null;
      if (ev.when.at !== undefined) due = ev.when.at;
      else {
        if (es.armedAt === null) {
          const n = ev.when.seenOf.filter((id) => state.signals[id].seen).length;
          if (n >= ev.when.count) es.armedAt = state.clock;
        }
        if (es.armedAt !== null) due = es.armedAt + (ev.when.delay || 0);
      }
      if (due !== null && state.clock >= due && state.phase === 'morning') {
        es.firedAt = state.clock;
        const st = state.sources[ev.add];
        st.available = true; st.arrivedAt = Math.max(due, world.day.start);
        world.sources[ev.add].when = fmtClock(st.arrivedAt);
        fired.push({ id: ev.id, source: ev.add, toast: ev.toast });
      }
    }
    return fired;
  }
  return { tick };
}
