// INTELLIGENCE ENGINE
// Wake processes exactly the signal set the user had: same company, same period, same data.
// Findings are predetermined, but a finding is only surfaced if its evidence really is in
// that set and really does deviate. Nothing is added, altered, or hidden for Wake's benefit.

export const STAGES = ['Gather', 'Normalize', 'Connect', 'Detect', 'Filter', 'Interpret', 'Prioritize', 'Recommend'];

export function runWake(world, signalEngine, state) {
  // 1. Gather: every source that existed in the user's morning, opened or not.
  const sources = Object.values(world.sources).filter((s) => state.sources[s.id].available);
  const ids = new Set();
  for (const src of sources) for (const id of src.lines) ids.add(id);
  const gathered = Array.from(ids).map((id) => world.signals[id]);
  const records = sources.reduce((n, s) => n + (s.volume || 0), 0);
  const systems = new Set(sources.filter((s) => s.kind !== 'location' && s.kind !== 'team' && s.kind !== 'exec' && s.cat !== 'general').map((s) => s.cat));

  // 2. Normalize + 4. Detect: deviation from each signal's own baseline (Signal Engine).
  const moved = gathered.filter((s) => s.outOfRange);

  // 3. Connect + 5. Filter: a finding stands only if its evidence is present, deviates,
  // and spans several sources. False alarms are dismissed by the signal that explains them.
  const dismissed = gathered.filter((s) => s.kind === 'falseAlarm').map((s) => {
    const why = s.links.map((l) => world.signals[l]).filter((x) => x && x.kind === 'explainer' && ids.has(x.id));
    return { key: s.id, label: s.label, value: s.value, delta: s.delta, because: why.map((x) => x.label + (x.value && x.value !== 'call' ? ': ' + x.value : '') + (x.delta ? ', ' + x.delta : '')) };
  });

  const findings = [];
  for (const f of world.findings) {
    const present = f.evidence.filter((id) => ids.has(id));
    const srcs = new Set(present.map((id) => world.signals[id].sources.find((sid) => world.sources[sid].kind !== 'location')));
    const cats = new Set(present.map((id) => world.signals[id].cat));
    const coreOk = f.core.every((id) => ids.has(id) && world.signals[id].outOfRange);
    const supported = present.length === f.evidence.length && coreOk && present.length >= 4 && srcs.size >= 3;
    if (!supported) continue;
    const conf = present.reduce((n, id) => n + world.signals[id].conf, 0) / present.length;
    // 7. Prioritize: urgency first, then business impact, then confidence and breadth.
    const score = 0.5 * f.urgency + 0.3 * f.impact + 0.15 * conf + 0.05 * Math.min(1, cats.size / 5);
    findings.push({
      id: f.id, place: world.shell.multi ? (f.loc ? world.locById[f.loc].name : 'All ' + world.shell.vocab.units) : f.topic,
      title: f.title, finding: f.finding, connection: f.connection, interpretation: f.interpretation, action: f.action,
      score, systems: cats.size, sources: srcs.size,
      evidence: present.map((id) => {
        const s = world.signals[id], st = state.signals[id];
        const home = world.sources[s.sources.find((sid) => world.sources[sid].kind !== 'location')];
        const quiet = ['call', 'request', 'assumption'].includes(s.value) ? '' : s.value;
        return { key: id, label: s.label, value: quiet, delta: s.delta, where: home.title, whereKind: home.kind, seen: st.seen, seenAt: st.seenAt, pinned: st.pinned,
          seenIn: st.seen ? (world.sources[st.seenIn].kind === 'location' ? 'the ' + world.sources[st.seenIn].title + ' scorecard' : world.sources[st.seenIn].title) : '' };
      }),
    });
  }
  findings.sort((a, b) => b.score - a.score);
  findings.forEach((f, i) => { f.rank = i + 1; });

  const material = new Set(findings.flatMap((f) => f.evidence.map((e) => e.key)));
  const opened = sources.filter((s) => state.sources[s.id].opened > 0);
  const openedRecords = opened.reduce((n, s) => n + (s.volume || 0), 0);
  const seenLines = gathered.filter((s) => state.signals[s.id].seen).length;
  const pinned = gathered.filter((s) => state.signals[s.id].pinned).length;

  return {
    stages: STAGES,
    funnel: { records, surfaced: gathered.length, moved: moved.length, material: material.size, dismissed: dismissed.length, findings: findings.length },
    you: { sourcesOpened: opened.length, sourcesTotal: sources.length, records: openedRecords, lines: seenLines, pinned },
    systems: systems.size, findings, dismissed,
    // proportions the signal field uses to draw the morning honestly
    field: sources.filter((s) => s.volume > 1).map((s) => ({ title: s.title, volume: s.volume, opened: state.sources[s.id].opened > 0 })),
  };
}
