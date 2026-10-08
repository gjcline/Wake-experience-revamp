// BEHAVIORAL TRACKING ENGINE
// Records everything the player does as a flat event log. The Simulation Engine summarizes it
// for the sales team (session()). Nothing here is ever shown to the player.

const STEMS_NEEDS_WORD = new Set(['short', 'wait', 'cost', 'price', 'staff', 'slow', 'busy', 'hours', 'people', 'service']);

export function classifyText(text, concepts) {
  const s = ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ') + ' ';
  const hits = [];
  for (const [concept, stems] of Object.entries(concepts)) {
    if (stems.some((stem) => (STEMS_NEEDS_WORD.has(stem) ? s.includes(' ' + stem) : s.includes(stem)))) hits.push(concept);
  }
  return hits;
}

export function createTracker(now) {
  const t0 = now();
  const log = [];
  return {
    log,
    record(type, clock, data = {}) { log.push({ n: log.length, type, ms: now() - t0, clock, ...data }); },
    count: (type) => log.filter((e) => e.type === type).length,
    of: (type) => log.filter((e) => e.type === type),
  };
}
