// SIGNAL ENGINE
// Owns signal metadata and the signal graph: deviation, direction, magnitude,
// relationships, supporting evidence, contradictions, and traversal.

export function createSignalEngine(world) {
  const S = world.signals;
  const adj = {};
  const link = (a, b) => { (adj[a] = adj[a] || new Set()).add(b); (adj[b] = adj[b] || new Set()).add(a); };

  for (const s of Object.values(S)) {
    const base = Math.abs(s.base);
    s.dev = base > 0 ? (s.v - s.base) / base : (s.v !== 0 ? 1 : 0);
    s.direction = s.dev > 0.005 ? 'up' : s.dev < -0.005 ? 'down' : 'flat';
    s.magnitude = Math.min(1, Math.abs(s.dev));
    s.outOfRange = s.kind !== 'noise' && (Math.abs(s.dev) >= 0.03 || s.trend === 'stepped' || s.sev >= 0.3);
    for (const l of s.links) { if (!S[l]) throw new Error('Signal ' + s.id + ' links to unknown ' + l); link(s.id, l); }
  }
  // signals that support the same finding are related even without a direct link
  for (const f of world.findings) for (let i = 1; i < f.evidence.length; i++) link(f.evidence[0], f.evidence[i]);
  for (const s of Object.values(S)) {
    s.findings = world.findings.filter((f) => f.evidence.includes(s.id)).map((f) => f.id);
    s.contradicts = s.kind === 'contradictory' ? s.links.slice() : [];
  }

  const neighbors = (id) => Array.from(adj[id] || []);

  // Breadth-first walk of the graph from a set of signals.
  function reach(startIds, depth = 2) {
    const seen = new Set(startIds); let frontier = startIds.slice();
    for (let d = 0; d < depth; d++) {
      const next = [];
      for (const id of frontier) for (const n of neighbors(id)) if (!seen.has(n)) { seen.add(n); next.push(n); }
      frontier = next;
    }
    return Array.from(seen);
  }

  // Connected data: given what is on this page, which other sources carry signals one step
  // away in the graph, and which lines in them make the connection? Unopened sources and
  // anything the player has flagged count for more.
  function related(sourceId, state, limit = 3) {
    const src = world.sources[sourceId];
    const score = {}, via = {};
    const affinity = state.attention || {};
    for (const id of src.lines) {
      const pinned = state.signals[id] && state.signals[id].pinned;
      for (const n of neighbors(id)) {
        for (const sid of S[n].sources) {
          const st = state.sources[sid];
          if (sid === sourceId || !st || !st.available || sid === 'loc_all') continue;
          if (world.sources[sid].kind === 'location' && !S[n].loc) continue;
          const cat = world.sources[sid].cat;
          score[sid] = (score[sid] || 0) + 1 + (pinned ? 2 : 0) + Math.min(2, (affinity[cat] || 0) / 15) + S[n].magnitude + (st.opened ? 0 : 0.5);
          (via[sid] = via[sid] || new Set()).add(n);
        }
      }
    }
    return Object.entries(score).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([id]) => ({ id, via: Array.from(via[id]) }));
  }

  const byKind = () => {
    const out = {};
    for (const s of Object.values(S)) out[s.kind] = (out[s.kind] || 0) + 1;
    return out;
  };

  return { neighbors, reach, related, byKind, get: (id) => S[id] };
}
