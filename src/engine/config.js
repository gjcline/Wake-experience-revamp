// BUSINESS CONFIGURATION ENGINE + ROLE CONFIGURATION ENGINE
// Turns shared content + one shell + one role into a resolved world.
// Engines downstream only ever see the world. They never see a shell or a token.

import { SHELLS } from '../content/shells.js';
import { ROLES } from '../content/roles.js';
import * as B from '../content/business.js';
import * as R from '../content/rounds.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function makeResolver(vocab) {
  return (str) => {
    if (typeof str !== 'string' || str.indexOf('{') === -1) return str;
    const out = str.replace(/\{([A-Za-z]+)\}/g, (m, key) => {
      if (key in vocab) return vocab[key];
      const lower = key.charAt(0).toLowerCase() + key.slice(1);
      if (lower in vocab) return cap(vocab[lower]);
      return m; // unknown tokens ({P}) are left for a later pass
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
    for (const k of Object.keys(value)) o[k] = k === 'id' ? value[k] : deep(value[k], t);
    return o;
  }
  return value;
}

export function applyRole(world, role) {
  // Role Configuration Engine: perspective, language, emphasis, framing, available context.
  const t = world.t;
  const r = deep(role, t);
  world.role = r;
  const [who, ...rest] = r.note.from.split(',');
  world.characters.boss = { ...world.characters.boss, name: who.trim(), title: rest.join(',').trim() };
  const note = world.sources.note_role;
  note.title = 'Note from ' + who.trim();
  note.body = [r.note.text];
  // emphasis: the role's lens orders the reports the way this seat would reach for them
  const rank = (cat) => { const i = r.lens.indexOf(cat); return i === -1 ? 99 : i; };
  world.order.report = world.order.report.slice().sort((a, b) => rank(world.sources[a].cat) - rank(world.sources[b].cat));
  return world;
}

export function buildWorld(shellId, roleId) {
  const shell = SHELLS[shellId];
  const role = ROLES[roleId];
  if (!shell || !role) throw new Error('Unknown shell or role');
  const t = makeResolver(shell.vocab);

  const world = { t, shell: { id: shell.id, label: shell.label, company: shell.company, headcount: shell.headcount, vocab: shell.vocab } };
  world.locations = deep(B.LOCATIONS, t);
  world.characters = deep(B.CHARACTERS, t);
  world.findings = deep(B.FINDINGS, t);
  world.events = B.EVENTS;
  world.briefing = deep(R.BRIEFING, t);
  world.reactions = deep(R.REACTIONS, t);
  world.weekText = deep(R.WEEK, t);
  world.sharpen = deep(R.SHARPEN, t);
  world.context = deep(R.CONTEXT, t);
  world.concepts = B.CONCEPTS;
  world.day = B.DAY;

  world.signals = {};
  for (const s of deep(B.SIGNALS, t)) world.signals[s.id] = { ...s, sources: [] };

  world.sources = {};
  const reportLines = new Set();
  for (const src of deep(B.SOURCES, t)) {
    const lines = src.sections ? src.sections.flatMap((x) => x.lines) : (src.signals || []);
    world.sources[src.id] = { ...src, lines };
    if (src.kind === 'report') lines.forEach((id) => reportLines.add(id));
  }
  // Location files: the same signals, sliced by location. No new information is created.
  for (const loc of world.locations) {
    const lines = Object.values(world.signals).filter((s) => s.loc === loc.id && reportLines.has(s.id)).map((s) => s.id);
    world.sources['loc_' + loc.id] = {
      id: 'loc_' + loc.id, kind: 'location', loc: loc.id, from: loc.manager, when: '', title: loc.name, cost: 10, cat: 'location', volume: 0,
      sub: [loc.tag, 'Opened ' + loc.opened, loc.staff + ' people'].filter(Boolean).join(' · '),
      intro: '', note: loc.note, sections: [{ title: 'This week', lines }], lines,
    };
  }
  for (const src of Object.values(world.sources)) {
    for (const id of src.lines) {
      if (!world.signals[id]) throw new Error('Source ' + src.id + ' references unknown signal ' + id);
      world.signals[id].sources.push(src.id);
    }
  }
  world.order = {
    email: ['eml_flash', 'eml_hire', 'eml_hr', 'eml_angry', 'eml_promo', 'eml_bank', 'eml_it', 'eml_party', 'eml_quote', 'eml_price'],
    message: ['msg_noor', 'msg_aiko', 'msg_eli', 'msg_grace', 'msg_marcus'],
    report: ['rep_fin', 'rep_labor', 'rep_ops', 'rep_cx', 'rep_mnt', 'rep_ap', 'rep_hr'],
    location: world.locations.map((l) => 'loc_' + l.id),
    calendar: ['cal'],
    note: ['note_role'],
  };
  world.locById = Object.fromEntries(world.locations.map((l) => [l.id, l]));
  world.findingById = Object.fromEntries(world.findings.map((f) => [f.id, f]));
  return applyRole(world, role);
}

export const fmtClock = (min) => {
  const h24 = Math.floor(min / 60), m = min % 60;
  const h = ((h24 + 11) % 12) + 1;
  return h + ':' + String(m).padStart(2, '0') + ' ' + (h24 < 12 ? 'AM' : 'PM');
};
