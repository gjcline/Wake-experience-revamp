// THE CALL WITH YOUR LENDER
// The second 10:00 AM a player can choose: instead of the leadership meeting, your relationship
// manager at the bank calls ahead of the quarter's covenant check. Your controller is on the line.
// The banker goes down what you brought and asks what a lender asks: is it real, is it one-time
// or ongoing, what does it do to margin and cash, and will you stay inside the covenant.
//
// What each item comes to is decided exactly as in the meeting (meeting.js): what you brought
// decides whether you answer on the spot, answer on your read, or owe the bank a number. This
// file writes the call those outcomes make, and the call's own clock: three people on the line,
// shorter than a meeting, and every "I'll get back to you" goes in the bank's file.
// Everything is deterministic for a seed and a set of answers.

const BANKS = ['First Harbor Bank', 'Summit Commercial Bank', 'Keystone Business Bank', 'Northline Bank', 'Cedar Trust Bank', 'Prairie State Bank'];
const BANKERS = ['Dana Whitfield', 'Marcus Hale', 'Priya Raman', 'Owen Castillo', 'Leah Brennan', 'Victor Osei', 'Hannah Ruiz', 'Graham Price'];
const hash = (s) => { let x = 2166136261; for (const ch of String(s)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };

// who calls: the same bank and banker for a seed
export function lenderFor(seed) {
  const name = BANKERS[hash(seed + ':banker') % BANKERS.length];
  return { key: 'bank', name, first: name.split(' ')[0], title: 'Relationship Manager', bank: BANKS[hash(seed + ':bank') % BANKS.length] };
}

// how each outcome reads to the bank, and how long it takes on the phone: an answer you have is
// quick; one you don't takes the back-and-forth
export const CALL_STATUS = {
  decided: { label: 'Answered on the call', tone: 'decided', min: 3 },
  guess: { label: 'Answered · number to follow', tone: 'guess', min: 4 },
  pilot: { label: 'Answered · number to follow', tone: 'pilot', min: 4 },
  agreed: { label: 'Answered · numbers to follow', tone: 'guess', min: 4 },
  parked: { label: 'Owed to the bank', tone: 'parked', min: 4 },
  next: { label: 'Owed to the bank', tone: 'next', min: 4 },
  dropped: { label: 'Not a concern', tone: 'dropped', min: 2 },
  busy: { label: 'Not a concern', tone: 'busy', min: 2 },
};
const OPEN_MIN = 2, CLOSE_MIN = 2, WAKE_MIN = 2, ON_LINE = 3;

export function createLenderCall({ world, who }) {
  const L = world.lender;
  const thu = world.sources.x_brief ? world.sources.x_brief.title.replace(/^Brief for /, '') : 'Thursday\'s covenant check';
  const topic = (fid) => (fid && world.findingById[fid] ? world.t(world.findingById[fid].topic).toLowerCase() : '');
  const fig = (what) => what.label + (what.value ? ' (' + what.value + ')' : '');
  const plain = (x) => String(x || '').trim().replace(/\.$/, '');

  // what a lender asks about each kind of problem
  function question(fid, what, n) {
    const f = fid ? world.findingById[fid] : null, id = f ? f.id : '';
    const pick = (list) => list[hash(world.seed + ':q:' + id + ':' + n) % list.length];
    if (id === 'F1') return pick(['Labor is the number we watch. What\'s behind that, and does it hold through the quarter?', 'Is that a new cost level, or something you can pull back this month?']);
    if (id === 'F2') return pick(['Is that a one-time hit, or is there capital spending coming that I should know about?', 'Does that turn into an equipment purchase this quarter?']);
    if (id === 'F3') return pick(['Is revenue at risk there? I need to know if the top line holds.', 'Is that a blip, or are you losing customers?']);
    if (id === 'F4') return pick(['Is that margin you get back, or the new price of doing business?', 'Can you recover that, or does it stay in your cost base?']);
    if (id === 'F5') return pick(['Does that turn into a service problem, or more hiring cost?', 'Is that going to show up in labor next month?']);
    return 'What\'s driving that, and what does it do to margin this quarter?';
  }

  // ------------------------------------------------------------ the call on your own
  // `r` is the meeting result for what you brought; `agenda` has the evidence you attached.
  function yours(r, agenda) {
    const lines = [], items = [];
    let minutes = OPEN_MIN, owed = 0, answered = 0, asked = 0;
    const say = (who, text, extra) => lines.push({ who, text, ...extra });
    say('bank', 'Thanks for making the time. Ahead of ' + thu + ', I want to go through what\'s moving in the business this week.', { at: 0 });
    say('me', 'Sure. I have ' + r.items.length + (r.items.length === 1 ? ' thing' : ' things') + ' to walk you through.', { at: 1 });
    for (const c of r.items) {
      const a = agenda.find((x) => x.n === c.n) || {};
      const st = CALL_STATUS[c.decision] || CALL_STATUS.decided;
      const what = c.what || a.what || { label: 'This one' };
      const start = minutes;
      say('me', (c.n === 1 ? 'First: ' : c.n === r.items.length && c.n > 1 ? 'Last one: ' : 'Next: ') + fig(what) + '.', { item: c.n, kind: 'present', at: start });
      if (c.kind !== 'finding') {
        asked += 1;
        say('bank', 'Is that one something the bank should worry about?', { item: c.n, kind: 'q' });
        say('me', 'Probably not. I flagged it this morning, but I haven\'t confirmed it\'s anything.', { item: c.n });
        say('bank', 'Then let\'s not spend time on it.', { item: c.n });
      } else {
        asked += 1;
        say('bank', question(c.fid, what, c.n), { item: c.n, kind: 'q' });
        const plan = plain(c.text);
        const owner = c.owner && c.owner.key !== 'me' ? ' ' + c.owner.first + ' owns it, starting Tuesday.' : '';
        if (c.decision === 'decided') {
          answered += 1;
          say('me', (a.costEv ? a.costEv + '. ' : a.ev ? 'I traced it: ' + a.ev + '. ' : '') + 'It\'s understood and it\'s handled. ' + plan + '.' + owner, { item: c.n, kind: 'a', ok: true });
          say('bank', 'Good. That\'s what I needed.', { item: c.n });
        } else if (c.decision === 'guess' || c.decision === 'pilot') {
          answered += 1; owed += 1;
          say('me', 'My read: ' + plan + '. I don\'t have the exact figure in front of me.', { item: c.n, kind: 'a' });
          say('bank', 'Okay. Send me the number before Thursday.', { item: c.n, owe: 'Send the bank the ' + (topic(c.fid) || 'figure') + ' numbers' });
        } else if (c.decision === 'agreed') {
          answered += 1; owed += 1;
          say('me', 'We\'re acting on it this week. ' + plan + '. I\'ll send you the numbers once they land.', { item: c.n, kind: 'a' });
          say('bank', 'Please do, before Thursday.', { item: c.n, owe: 'Send the bank the ' + (topic(c.fid) || 'figure') + ' numbers' });
        } else {
          owed += 1;
          say('me', 'I\'d rather not guess on that one. Let me get back to you.', { item: c.n, kind: 'a' });
          say('ctrl', 'I can pull it together this afternoon.', { item: c.n });
          say('bank', 'Okay. I\'ll mark it open until Thursday.', { item: c.n, owe: 'Answer the bank on ' + (topic(c.fid) || 'this item') });
        }
      }
      minutes += st.min;
      say(null, '', { item: c.n, kind: 'stamp', stamp: st, at: minutes });
      items.push({ n: c.n, decision: c.decision, label: st.label, minutes: st.min, what });
    }
    const real = r.items.filter((c) => c.kind === 'finding').length;
    const full = r.items.filter((c) => c.kind === 'finding' && c.decision === 'decided').length;
    asked += 1;
    say('bank', 'Last one. Are you comfortable you\'ll stay inside the covenant this quarter?', { kind: 'q' });
    if (owed === 0) say('me', 'Yes. Nothing on today\'s list changes that.', { kind: 'a', ok: true });
    else say('me', 'I believe so. I\'ll confirm once I\'ve sent you ' + (owed === 1 ? 'that number' : 'those ' + owed + ' numbers') + '.', { kind: 'a' });
    const read = readOf(full, real, owed);
    say('bank', read.reply);
    minutes += CLOSE_MIN;
    return { lines, items, minutes, owed, answered, asked, read, full, real, attendees: ON_LINE, hours: Math.round(minutes * ON_LINE / 6) / 10 };
  }

  // how the bank leaves the call: never alarmed, but it notices what's still open
  function readOf(full, real, owed) {
    const r = real ? full / real : 1;
    if (owed === 0 && r >= 0.99) return { key: 'confident', label: 'Confident', reply: 'That\'s the clearest covenant call I\'ve had this quarter. Thank you.' };
    if (r >= 0.5) return { key: 'waiting', label: 'Comfortable, waiting on numbers', reply: 'Okay. Send those over and I\'ll finish my notes for Thursday.' };
    return { key: 'watching', label: 'Watching closely', reply: 'Okay. I\'ll hold my notes until I have those numbers.' };
  }

  // ------------------------------------------------------------ the call with Wake
  // `k` is Wake's meeting: every item with its evidence, an owner and the number to watch.
  function wake(k) {
    const lines = [];
    const say = (who, text, extra) => lines.push({ who, text, ...extra });
    let minutes = OPEN_MIN - 1, asked = 0;
    say('bank', 'Thanks for making the time. Ahead of ' + thu + ', I want to go through what\'s moving in the business this week.', { at: 0 });
    say('me', 'Sure. I have ' + k.items.length + ' things, ranked, each with the numbers behind it.', { at: 1 });
    for (const it of k.items) {
      const what = { label: it.headline };
      say('me', it.headline + ' ' + it.action, { item: it.n, kind: 'present', at: minutes });
      asked += 1;
      say('bank', question(it.fid, what, it.n), { item: it.n, kind: 'q' });
      const why = it.qs[0], cost = it.qs[1];
      say('me', why ? why.answer : it.action, { item: it.n, kind: 'a', ok: true, chips: why && why.chips });
      if (cost) say('me', cost.answer, { item: it.n, kind: 'a', ok: true });
      say('bank', 'Clear. Thank you.', { item: it.n });
      minutes += WAKE_MIN;
      say(null, '', { item: it.n, kind: 'stamp', stamp: CALL_STATUS.decided, at: minutes });
    }
    asked += 1;
    say('bank', 'Last one. Are you comfortable you\'ll stay inside the covenant this quarter?', { kind: 'q' });
    say('me', 'Yes. Wake drafted ' + thu + ' brief this morning with today\'s numbers. I\'ll send it to you after this call.', { kind: 'a', ok: true });
    const read = readOf(1, 1, 0);
    say('bank', read.reply);
    minutes += CLOSE_MIN - 1;
    return { lines, items: k.items.map((it) => ({ n: it.n, decision: 'decided', label: CALL_STATUS.decided.label, minutes: WAKE_MIN })), minutes, owed: 0, answered: asked, asked, read, full: k.items.length, real: k.items.length, attendees: ON_LINE, hours: Math.round(minutes * ON_LINE / 6) / 10 };
  }

  return { L, thu, yours, wake, who };
}
