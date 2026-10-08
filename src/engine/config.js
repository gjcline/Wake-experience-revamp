// BUSINESS CONFIGURATION ENGINE + ROLE CONFIGURATION ENGINE
// Turns one shell + one role + one seed into a resolved world. The seed generates the
// company (scenario.js); the shell supplies vocabulary; the role supplies perspective.
// Engines downstream only ever see the world. They never see a shell, a seed or a token.

import { SHELLS } from '../content/shells.js';
import { ROLES } from '../content/roles.js';
import { generateScenario } from '../content/scenario.js';
import { CONCEPTS, DAY } from '../content/business.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function makeResolver(vocab) {
  return (str) => {
    if (typeof str !== 'string' || str.indexOf('{') === -1) return str;
    const out = str.replace(/\{([A-Za-z]+)\}/g, (m, key) => {
      if (key in vocab) return vocab[key];
      const lower = key.charAt(0).toLowerCase() + key.slice(1);
      if (lower in vocab) return cap(vocab[lower]);
      return m;
    });
    // a sentence that begins with a token should begin with a capital
    return str.charAt(0) === '{' ? cap(out) : out;
  };
}

function deep(value, t) {
  if (typeof value === 'string') return t(value);
  if (Array.isArray(value)) return value.map((v) => deep(v, t));
  if (value && typeof value === 'object') {
    const o = {};
    for (const k of Object.keys(value)) o[k] = k === 'id' || k === 's' ? value[k] : deep(value[k], t);
    return o;
  }
  return value;
}

export const randomSeed = () => (Math.floor(Math.random() * 2 ** 31) ^ Date.now()) >>> 0;

export function buildWorld(shellId, roleId, seed = 1) {
  const shell = SHELLS[shellId];
  const role = ROLES[roleId];
  if (!shell || !role) throw new Error('Unknown shell or role');
  const sc = generateScenario(shell, role, seed);
  const vocab = { ...shell.vocab, ...sc.vocabExtra };
  const t = makeResolver(vocab);
  const r = deep(role, t);

  const world = { t, seed, shell: { id: shell.id, label: shell.label, company: sc.company, headcount: sc.headcount, vocab, size: sc.N, multi: sc.M, monday: sc.monday, mondayLong: sc.mondayLong, weekEnd: sc.weekEnd } };
  world.role = r;
  world.locations = deep(sc.locations, t);
  world.pins = sc.pins;
  world.characters = deep(sc.characters, t);
  world.central = sc.central;
  world.findings = deep(sc.findings, t);
  world.events = sc.events;
  world.briefing = deep(sc.briefing, t);
  world.reactions = deep(sc.reactions, t);
  world.weekText = deep(sc.weekText, t);
  world.sharpen = deep(sc.sharpen, t);
  world.context = deep(sc.context, t);
  world.quiet = sc.quiet;
  world.obvious = sc.obvious;
  world.phone = sc.phone;
  world.owners = sc.owners;
  world.system = sc.system;
  world.concepts = CONCEPTS;
  world.day = DAY;
  // the multiple-choice answers: intents and style are fixed, the words are resolved
  world.answers = Object.fromEntries(Object.entries(sc.answers).map(([k, list]) => [k, list.map(([intent, style, text], i) => ({ id: k + ':' + i, intent, style, text: t(text) }))]));
  world.ansKey = sc.ansKey;

  world.signals = {};
  for (const s of deep(sc.signals, t)) world.signals[s.id] = { ...s, sources: [] };

  world.sources = {};
  for (const src of Object.values(deep(sc.sources, t))) world.sources[src.id] = { ...src, lines: src.lines || [] };
  for (const src of Object.values(world.sources)) {
    for (const id of src.lines) {
      if (!world.signals[id]) throw new Error('Source ' + src.id + ' references unknown signal ' + id);
      world.signals[id].sources.push(src.id);
    }
  }
  world.order = sc.order;
  world.locById = Object.fromEntries(world.locations.map((l) => [l.id, l]));
  world.findingById = Object.fromEntries(world.findings.map((f) => [f.id, f]));
  // emphasis: the role's lens orders the reports the way this seat would reach for them
  const rank = (cat) => { const i = r.lens.indexOf(cat); return i === -1 ? 99 : i; };
  world.order.report = world.order.report.slice().sort((a, b) => rank(world.sources[a].cat) - rank(world.sources[b].cat));
  return world;
}

export const fmtClock = (min) => {
  const h24 = Math.floor(min / 60), m = min % 60;
  const h = ((h24 + 11) % 12) + 1;
  return h + ':' + String(m).padStart(2, '0') + ' ' + (h24 < 12 ? 'AM' : 'PM');
};
