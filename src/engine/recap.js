// RECAP: REPORT ENGINE
// The ending and the take-home report. Short by design: a few honest numbers, one moment
// taken from this player's own morning, and a one-page record they can keep.

import { fmtClock } from './config.js';

const span = (mins) => { const h = Math.floor(mins / 60), m = mins % 60; return (h ? h + ' h ' : '') + m + ' min'; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ARROW = { up: '▲', flat: '■', down: '▼' };

export function buildRecap(world, state, { delivery, week, QUIET }) {
  const D = world.day, W = state.wake;
  const findings = W.findings;
  const yours = delivery.yours;
  const found = [...new Set(yours.filter((y) => y.finding).map((y) => y.finding))];
  const handed = (list) => list.filter((x) => x.status === 'handed').length;
  const youMins = state.submittedAt - D.start;

  const stats = {
    you: { ready: fmtClock(state.submittedAt), took: state.submittedAt >= D.meetingAt ? 'the whole morning' : span(youMins), flags: yours.length,
      real: found.length, falseAlarms: yours.filter((y) => y.kind !== 'finding').length, handed: handed(yours) },
    wake: { ready: fmtClock(state.wakeDoneAt), findings: findings.length, filtered: W.funnel.dismissed, signals: W.funnel.material, records: W.funnel.records, systems: W.systems, handed: delivery.wake.length },
  };

  // The moment: the first of Wake's priorities the player did not fully land, told through
  // its quietest line, using the player's own morning.
  const rowOf = (fid) => week.find((r) => r.id === fid);
  const target = findings.find((f) => rowOf(f.id).you.handled !== 'aligned');
  let moment;
  if (!target) {
    const n = ['zero', 'one', 'two', 'three', 'four', 'five'][findings.length] || String(findings.length);
    moment = { title: 'You found all ' + n + '.', lines: ['That is rare. Your instincts were right on every one.', 'It took you until ' + stats.you.ready + '. Wake had the same ' + n + ' at 7:48 AM, ranked, with owners attached.'] };
  } else {
    const q = QUIET[target.id], s = world.signals[q], st = state.signals[q];
    const home = world.sources[s.sources.find((x) => world.sources[x].kind !== 'location') || s.sources[0]];
    const value = [s.value, s.delta].filter((x) => x && !['call', 'request', 'assumption'].includes(x)).join(', ');
    const quote = '"' + s.label + (value ? ': ' + value : '') + '."';
    const sender = home.from ? world.characters[home.from].name : '';
    let opener;
    if (home.kind === 'email') opener = st.seen ? 'At ' + fmtClock(st.seenAt) + ' you read an email from ' + sender + '. It said ' + quote : 'An email from ' + sender + ' sat unopened in your inbox. It said ' + quote;
    else if (home.kind === 'message') opener = st.seen ? 'At ' + fmtClock(st.seenAt) + ' you read a text from ' + sender + '. It said ' + quote : 'A text from ' + sender + ' sat unread on your phone. It said ' + quote;
    else if (home.kind === 'calendar') opener = 'Your calendar had it: ' + quote;
    else opener = st.seen ? 'At ' + fmtClock(st.seenAt) + ' you had the ' + home.title + ' report open. One line read ' + quote : 'The ' + home.title + ' report had one line you never got to. ' + quote;
    moment = {
      title: target.title,
      lines: [opener, 'On its own, it looks like nothing.', 'Next to ' + world.context[target.id] + ', it was the whole story: ' + world.findingById[target.id].short + '.'],
      wake: 'Wake connected it at 7:48 AM, with ' + (target.evidence.length - 1) + ' other signals from ' + target.systems + ' systems.',
    };
  }

  const closer = 'Wake read all ' + W.funnel.records.toLocaleString('en-US') + ' records across ' + W.systems + ' systems at once. You only had to decide.';

  // ---------------------------------------------------------------- report
  const yourLines = yours.map((y) => y.n + '. ' + (y.what.label || '') + (y.what.value ? ' (' + y.what.value + ')' : '') + '. You said: "' + y.text + '"' + (y.owner ? ' Owner: ' + y.owner.name + '.' : ' No owner named.') + (y.attached && y.attached.length ? ' Backed by: ' + y.attached.map((a) => a.label).join(', ') + '.' : '') + ' In the room: ' + y.statusLabel + '.');
  const wakeLines = delivery.wake.map((w) => w.n + '. ' + w.headline + ' ' + w.text + ' Owner: ' + w.owners.map((o) => o.name).join(' and ') + '. ' + w.check);
  const weekLines = week.map((r) => r.label + '. You: ' + ARROW[r.you.dir] + ' ' + r.you.text + ' Wake: ' + ARROW[r.wake.dir] + ' ' + r.wake.text);
  const sections = [
    { title: 'The setup', lines: [world.role.label + ' · ' + world.shell.label + ' · ' + world.shell.company + '. ' + (world.shell.multi ? world.shell.size + ' ' + world.shell.vocab.units : 'One ' + world.shell.vocab.unit) + ', one Monday morning, a 10:00 AM ' + world.role.meetingName + '.'] },
    { title: 'Round 1: on your own', lines: ['Ready at ' + stats.you.ready + '. ' + stats.you.flags + ' data points flagged, ' + stats.you.real + ' tied to a real issue.'].concat(yourLines) },
    { title: 'Round 2: with Wake', lines: ['Briefing waiting at 7:48 AM. Decisions done by ' + stats.wake.ready + '. ' + stats.wake.signals + ' signals connected across ' + stats.wake.systems + ' systems, ' + stats.wake.filtered + ' false alarms filtered.'].concat(wakeLines) },
    { title: 'The meeting', lines: ['Your briefing: ' + stats.you.handed + ' of ' + stats.you.flags + ' handed off cleanly.', 'Wake\'s briefing: ' + stats.wake.handed + ' of ' + stats.wake.handed + ' handed off cleanly.'] },
    { title: 'The week', lines: weekLines },
    { title: 'The moment', lines: [moment.title].concat(moment.lines, moment.wake ? [moment.wake] : []) },
  ];
  const meta = world.role.label + ' · ' + world.shell.label + ' · ' + world.shell.company;
  const toText = () => 'THE WAKE EXPERIENCE\n' + meta + '\n\n' + sections.map((s) => s.title.toUpperCase() + '\n' + s.lines.join('\n')).join('\n\n');
  const toHTML = () => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>The Wake Experience: ' + esc(world.shell.company) + '</title><style>body{font:17px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;color:#14121f;background:#fff;max-width:44rem;margin:0 auto;padding:3rem 1.25rem}h1{font-size:1.8rem;margin:0}h2{font-size:1.05rem;margin:2rem 0 .4rem}.meta{color:#666}p{margin:.35rem 0}</style></head><body><h1>The Wake Experience</h1><p class="meta">' + esc(meta) + '</p>' + sections.map((s) => '<h2>' + esc(s.title) + '</h2>' + s.lines.map((l) => '<p>' + esc(l) + '</p>').join('')).join('') + '</body></html>';

  return { stats, moment, closer, report: { meta, sections, toText, toHTML } };
}
