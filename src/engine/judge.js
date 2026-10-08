// JUDGE: COMPARISON ENGINE
// Reads a flag the player wrote (a data point plus an action in their own words) and decides,
// deterministically, what it targets, how the action lands, what the room says when it is
// presented, and how the week goes. Freeform text only ever maps onto predetermined intents.

import { INTENTS, HANDLING, OBVIOUS, QUIET } from '../content/rounds.js';

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RX = Object.fromEntries(Object.entries(INTENTS).map(([k, stems]) => [k, stems.map((st) => new RegExp((/^\w/.test(st) ? '\\b' : '') + escape(st), 'i'))]));

export function intentsOf(text) {
  const t = String(text || '');
  return Object.keys(RX).filter((k) => RX[k].some((r) => r.test(t)));
}

// What does a flagged data point point at?
export function targetOf(world, signalIds) {
  const sigs = signalIds.map((id) => world.signals[id]);
  const inFinding = sigs.find((s) => s.findings && s.findings.length);
  if (inFinding) return { kind: 'finding', finding: inFinding.findings[0], signal: inFinding.id };
  const fa = sigs.find((s) => s.kind === 'falseAlarm');
  if (fa) return { kind: 'falseAlarm', finding: null, signal: fa.id };
  return { kind: 'noise', finding: null, signal: sigs[0].id };
}

const RANK = { aligned: 4, partial: 3, unclear: 2, counter: 1 };
export const bestHandling = (judged) => judged.slice().sort((a, b) => (RANK[b.handling] || 0) - (RANK[a.handling] || 0))[0];

export function judgeFlag(world, flag) {
  const t = targetOf(world, flag.signals);
  const ints = intentsOf(flag.text);
  const words = String(flag.text || '').trim().split(/\s+/).filter(Boolean).length;
  let handling, key, lines;
  if (t.kind === 'finding') {
    const H = HANDLING[t.finding];
    const pick = (list) => list.find((i) => ints.includes(i));
    let k;
    if (pick(H.aligned)) { handling = 'aligned'; key = 'aligned'; }
    // a counter move framed as a question ("look into cutting hours") gets the benefit of the doubt
    else if ((k = pick(H.counter)) && !ints.includes('investigate')) { handling = 'counter'; key = k; }
    else if (pick(H.partial)) { handling = 'partial'; key = 'partial'; }
    else { handling = 'unclear'; key = 'unclear'; }
    const R = world.reactions[t.finding];
    lines = R[key] || R[handling] || R.partial;
  } else if (t.kind === 'falseAlarm') {
    const reacts = ['freeze', 'customer', 'support', 'hire', 'cut', 'recognize', 'schedule', 'followup', 'pay'].some((i) => ints.includes(i));
    handling = !reacts && ints.includes('investigate') ? 'checked' : 'react'; key = handling;
    lines = world.reactions.falseAlarm[t.signal] || world.reactions.noise;
  } else {
    handling = 'noise'; key = 'noise'; lines = world.reactions.noise;
  }
  let status = t.kind === 'falseAlarm' ? 'explained' : t.kind === 'noise' ? 'offTarget'
    : handling === 'aligned' ? 'handed' : handling === 'counter' ? 'pushback' : 'questions';
  const reactions = lines.map(([who, line]) => ({ who, line }));
  if (t.kind === 'finding') {
    if (!flag.owner && status === 'handed') status = 'questions';
    if (!flag.owner) reactions.push({ who: world.reactions.noOwner[0], line: world.reactions.noOwner[1] });
    if (words < 5 && handling !== 'counter') reactions.push({ who: world.reactions.vague[0], line: world.reactions.vague[1] });
  }
  return {
    ...t, intents: ints, handling, key, status, reactions,
    quiet: !!(t.finding && flag.signals.includes(QUIET[t.finding])), obvious: flag.signals.some((id) => OBVIOUS.includes(id)),
  };
}

export const STATUS = {
  handed: 'Handed off', questions: 'Questions', pushback: 'Pushback', explained: 'Already explained', offTarget: 'Not a priority',
};
