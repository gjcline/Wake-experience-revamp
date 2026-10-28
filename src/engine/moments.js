// THE OTHER 10:00 AMS
// After both rounds the player picks where to see Wake work. The weekly meeting runs in the room
// (meeting.js). Every other moment is a call: someone outside the leadership team asks about the
// same morning, in their own terms.
//   lender  your relationship manager at the bank, ahead of the covenant check
//   board   the monthly update to the board, on video
//   vendor  your biggest supplier's account rep, before next quarter's pricing is locked
//   buyer   a partner at a firm looking to invest, doing due diligence
//
// What each item comes to is decided exactly as in the meeting: what you brought decides whether
// you answer on the spot, answer on your read, or owe them a number. This file writes the call
// those outcomes make for each moment: who asks, what they ask about each kind of problem, what
// they say back, how they leave the call, and every word the screens use for it. Three people on
// the line, shorter than a meeting. Deterministic for a seed and a set of answers.

const hash = (s) => { let x = 2166136261; for (const ch of String(s)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
const pickOf = (seed, key, list) => list[hash(seed + ':' + key) % list.length];
const OPEN_MIN = 2, CLOSE_MIN = 2, WAKE_MIN = 2, ON_LINE = 3;
// how long each outcome takes on the line: an answer you have is quick; one you don't takes the back-and-forth
const MINUTES = { decided: 3, guess: 4, pilot: 4, agreed: 4, parked: 4, next: 4, dropped: 2, busy: 2 };
const BUCKET = { decided: 'answered', guess: 'follow', pilot: 'follow', agreed: 'follow', parked: 'owed', next: 'owed', dropped: 'none', busy: 'none' };
const TONE = { answered: 'decided', follow: 'guess', owed: 'parked', none: 'dropped' };

export const CALL_MOMENTS = ['lender', 'board', 'vendor', 'buyer'];
export const MOMENTS = ['meeting'].concat(CALL_MOMENTS);

// ------------------------------------------------------------------ each moment, in its own words
// `P` is who you're talking to; `thu` names this week's review ("Thursday's lender review").
const SPECS = {
  lender: {
    medium: 'Phone call', step: 'The call', title: 'Call with your lender', icon: 'call',
    pick: { name: 'A call with your lender', line: 'Your relationship manager at the bank calls ahead of the covenant check. Every answer you don\'t have goes in the bank\'s file.' },
    who(seed) {
      const name = pickOf(seed, 'banker', ['Dana Whitfield', 'Mark Hale', 'Jennifer Ramsey', 'Owen Carlisle', 'Leah Brennan', 'Victor Olsen', 'Hannah Reed', 'Graham Price']);
      return { name, title: 'Relationship Manager', org: pickOf(seed, 'bank', ['First Harbor Bank', 'Summit Commercial Bank', 'Keystone Business Bank', 'Northline Bank', 'Cedar Trust Bank', 'Prairie State Bank']), them: 'the bank' };
    },
    status: { answered: 'Answered on the call', follow: 'Answered · number to follow', owed: 'Owed to the bank', none: 'Not a concern' },
    owedShort: 'Owed to the bank', owedCounter: 'owed to the bank', readName: 'The bank\'s read',
    open: (P, thu) => 'Thanks for making the time. Ahead of ' + thu + ', I want to go through what\'s moving in the business this week.',
    q: {
      F1: ['Labor is the number we watch. What\'s behind that, and does it hold through the quarter?', 'Is that a new cost level, or something you can pull back this month?'],
      F2: ['Is that a one-time hit, or is there capital spending coming that I should know about?', 'Does that turn into an equipment purchase this quarter?'],
      F3: ['Is revenue at risk there? I need to know if the top line holds.', 'Is that a blip, or are you losing customers?'],
      F4: ['Is that margin you get back, or the new price of doing business?', 'Can you recover that, or does it stay in your cost base?'],
      F5: ['Does that turn into a service problem, or more hiring cost?', 'Is that going to show up in labor next month?'],
      other: ['What\'s driving that, and what does it do to margin this quarter?'],
    },
    noise: ['Is that one something the bank should worry about?', 'Probably not. I flagged it this morning, but I haven\'t confirmed it\'s anything.', 'Then let\'s not spend time on it.'],
    reply: { decided: 'Good. That\'s what I needed.', guess: 'Okay. Send me the number before Thursday.', agreed: 'Please do, before Thursday.', parked: 'Okay. I\'ll mark it open until Thursday.' },
    owe: (t) => 'Send the bank the ' + t + ' numbers', oweOpen: (t) => 'Answer the bank on ' + t,
    closeQ: 'Last one. Are you comfortable you\'ll stay inside the covenant this quarter?',
    closeYes: 'Yes. Nothing on today\'s list changes that.',
    closeOwed: (n) => 'I believe so. I\'ll confirm once I\'ve sent you ' + (n === 1 ? 'that number' : 'those ' + n + ' numbers') + '.',
    wakeClose: (P, thu) => 'Yes. Wake drafted ' + thu + ' brief this morning with today\'s numbers. I\'ll send it to you after this call.',
    reads: {
      confident: ['Confident', 'That\'s the clearest covenant call I\'ve had this quarter. Thank you.'],
      waiting: ['Comfortable, waiting on numbers', 'Okay. Send those over and I\'ll finish my notes for Thursday.'],
      watching: ['Watching closely', 'Okay. I\'ll hold my notes until I have those numbers.'],
    },
    card: {
      title: 'The bank is calling.',
      what: (P, ctrl) => P.name + ' from ' + P.org + ' is calling ahead of the covenant check. ' + ctrl.name + ' (' + ctrl.title + ') is on the line with you. The call runs twice: first with what you found on your own, then with what you prepared with Wake.',
      why: 'A lender asks the hardest questions about your numbers: is it real, is it one-time, what does it do to margin and cash. Every answer you have on the call builds the bank\'s confidence; every "let me get back to you" goes in their file.',
      watch: ['on the call, with the numbers', 'when you have to get back to them', 'at the end of the call'],
      wake: 'Wake isn\'t on the call. It did its work before ten: every answer you give has its numbers behind it, and the covenant brief for the bank is already drafted.',
      cta: 'Take the call',
    },
    intro: { h1: (P) => 'Your call with ' + P.org, lead: (P) => P.name + ', your relationship manager, is calling ahead of the covenant check. They\'ll go down what you brought, then ask what every lender asks: will you stay inside the covenant this quarter?', agenda: 'What you\'ll walk the bank through' },
    again: 'Same banker, same 10:00 AM.',
    result: { k: 'The call', h1: 'Same bank. Two calls.', owedRow: 'Numbers owed to the bank', scoreRow: 'Time on the call with the bank' },
    after: { first: 'Write up the call and brief the team on what you told the bank', brief: (thu, P) => 'Build ' + thu + ' brief for ' + P.first + ' at the bank', done: (thu, P) => thu.charAt(0).toUpperCase() + thu.slice(1) + ' brief for ' + P.first + ' at ' + P.org + ' sent, with today\'s numbers' },
    week: { what: 'The rest of the week plays out twice, side by side: the plan you gave the bank on your own, and the plan you gave it with Wake.', why: 'What you told the bank only counts once it moves the numbers. This is where you see how far each plan gets by Friday.', wake: 'After the call Wake keeps watching. Each owner gets an alert the moment their measure drifts, and the bank\'s numbers stay current without anyone pulling them.', you: 'The plan you gave the bank', withWake: 'The plan you gave the bank with Wake' },
    report: { h2: 'The call with your lender', sub: 'Same bank, same banker, same questions. Prep, time on the call, and how much you could answer with the numbers.', owed: 'numbers owed to the bank', done: 'answered on the call with the bank' },
  },

  board: {
    medium: 'Video call', step: 'The update', title: 'Monthly update to the board', icon: 'chart',
    pick: { name: 'Your monthly update to the board', line: 'Present the month to the board and answer for every number. What you can\'t answer becomes a follow-up in their pack.' },
    who(seed) {
      const name = pickOf(seed, 'chair', ['Richard Dawson', 'Susan Whitaker', 'Martin Hayes', 'Carol Bennett', 'Graham Ellis', 'Joanne Pryor']);
      return { name, title: 'Board chair', org: 'the board', them: 'the board' };
    },
    status: { answered: 'Answered for the board', follow: 'Answered · figure to follow', owed: 'Owed to the board', none: 'Not board-level' },
    owedShort: 'Owed to the board', owedCounter: 'owed to the board', readName: 'The board\'s read',
    open: () => 'Thanks, everyone. Walk us through the month: what\'s moving, and what you\'re doing about it.',
    q: {
      F1: ['Labor is running above plan. Is that a people problem or a planning problem?', 'Does that labor number come back next month, or is it the new normal?'],
      F2: ['Is that a repair, or are we buying equipment? I don\'t want to find out in next month\'s numbers.', 'What does that cost us if it fails again?'],
      F3: ['Are we losing customers? That\'s the number I care about most.', 'Is that a bad month, or a trend?'],
      F4: ['Are we paying more than we agreed to? Who\'s on top of that?', 'Is that money we get back?'],
      F5: ['Is turnover going to cost us more than the hires?', 'Is that a pay problem or a management problem?'],
      other: ['What\'s behind that, and what\'s it worth to the month?'],
    },
    noise: ['Is that worth the board\'s time?', 'Probably not. I flagged it this morning, but I haven\'t confirmed it\'s anything.', 'Then let\'s move on.'],
    reply: { decided: 'Good. That\'s clear.', guess: 'Send us the figure before next month\'s pack.', agreed: 'Fine. Put the numbers in the follow-up.', parked: 'Okay. We\'ll want that in writing this week.' },
    owe: (t) => 'Send the board the ' + t + ' numbers', oweOpen: (t) => 'Answer the board on ' + t,
    closeQ: 'Last one. What should we expect next month?',
    closeYes: 'Every one of these has an owner and a number to watch. You\'ll see them move in next month\'s pack.',
    closeOwed: (n) => 'Better than this month. I\'ll send ' + (n === 1 ? 'that follow-up' : 'those ' + n + ' follow-ups') + ' this week and we\'ll know more.',
    wakeClose: () => 'Each of these has an owner and a number on daily watch. Wake keeps next month\'s pack current as they move, so you won\'t wait for it.',
    reads: {
      confident: ['Confident', 'That\'s the clearest monthly update we\'ve had. Thank you.'],
      waiting: ['Satisfied, wants the follow-ups', 'Okay. Send the follow-ups and we\'ll pick it up next month.'],
      watching: ['Wants a closer look', 'Let\'s schedule a follow-up before next month.'],
    },
    card: {
      title: 'The board is on the line.',
      what: (P, ctrl) => 'Your monthly update to the board, on video. ' + P.name + ' (' + P.title + ') runs it; ' + ctrl.name + ' (' + ctrl.title + ') joins you. The update runs twice: first with what you found on your own, then with what you prepared with Wake.',
      why: 'A board wants the month in a few minutes: what moved, why, and what you\'re doing about it. Every answer you have builds confidence; every "I\'ll follow up" lands in next month\'s pack.',
      watch: ['for the board, with the numbers', 'when you have to follow up', 'at the end of the update'],
      wake: 'Wake isn\'t on the call. It did its work before ten: every number you present has its reason and its owner, and next month\'s pack is already updating.',
      cta: 'Join the call',
    },
    intro: { h1: () => 'Your monthly update to the board', lead: (P) => P.name + ', the board chair, runs the call. They\'ll go down what you brought, then ask what every board asks: what should we expect next month?', agenda: 'What you\'ll present' },
    again: 'Same board, same 10:00 AM.',
    result: { k: 'The update', h1: 'Same board. Two updates.', owedRow: 'Follow-ups owed to the board', scoreRow: 'Time on the board call' },
    after: { first: 'Write up the update and brief the team on what you told the board', brief: (thu, P) => 'Build the follow-up pack for ' + P.first + ' and the board', done: (thu, P) => 'Follow-up pack for ' + P.first + ' and the board sent, with today\'s numbers' },
    week: { what: 'The rest of the week plays out twice, side by side: the plan you gave the board on your own, and the plan you gave it with Wake.', why: 'What you told the board only counts once it moves the numbers. This is where you see how far each plan gets by Friday.', wake: 'After the call Wake keeps watching. Each owner gets an alert the moment their measure drifts, and next month\'s pack builds itself as the numbers move.', you: 'The plan you gave the board', withWake: 'The plan you gave the board with Wake' },
    report: { h2: 'The monthly update to the board', sub: 'Same board, same questions. Prep, time on the call, and how much you could answer with the numbers.', owed: 'follow-ups owed to the board', done: 'answered for the board' },
  },

  vendor: {
    medium: 'Phone call', step: 'The call', title: 'Call with your biggest supplier', icon: 'receipt',
    pick: { name: 'A call with your biggest supplier', line: 'Their account rep calls before next quarter\'s pricing is set. Push back on what they overbilled, if you know about it.' },
    who(seed, world) {
      const rep = world.characters.suprep || { name: 'Nate Foster', title: 'Account rep, Midstate Supply' };
      return { name: rep.name, title: 'Account rep', org: String(rep.title).replace(/^Account rep, /, ''), them: 'the supplier' };
    },
    status: { answered: 'Settled on the call', follow: 'Settled · details to follow', owed: 'Still open with the supplier', none: 'Not their business' },
    owedShort: 'Still open', owedCounter: 'still open', readName: 'Where it landed',
    open: () => 'Thanks for taking the call. Before we set next quarter\'s pricing and volumes, I wanted to check in. How\'s business?',
    q: {
      F1: ['Are you cutting hours? That changes what you\'ll order from us.', 'Is that going to slow your orders this quarter?'],
      F2: ['Is that equipment replacement coming through us? We can quote it.', 'Are you buying new, or should I send a service quote?'],
      F3: ['Is volume holding? Your pricing tier depends on it.', 'Should I plan on less volume from you next quarter?'],
      F4: ['You think we\'ve been billing over contract? Which invoices?', 'What makes you say we\'re over the contract rate?'],
      F5: ['Is that going to slow your orders?', 'Is that going to change who orders on your side?'],
      other: ['Does that change what you\'ll need from us?'],
    },
    noise: ['Does that one change your orders?', 'Probably not. I flagged it this morning, but I haven\'t confirmed it\'s anything.', 'Okay, no problem.'],
    reply: { decided: 'Got it. That helps our forecast.', guess: 'Okay. Send me the details when you have them.', agreed: 'Sure, send it over once you\'ve got it.', parked: 'No problem. Send it when you can.' },
    replyF4: { decided: 'You\'re right. The contract rate is locked. I\'ll credit the overage this week.', guess: 'I\'ll need the invoice numbers before I can credit anything.', agreed: 'Send me the invoice list and I\'ll look into it.', parked: 'Then I can\'t do anything on our side yet.' },
    owe: (t, fid) => (fid === 'F4' ? 'Send the supplier the invoice list' : 'Send the supplier your ' + t + ' forecast'), oweOpen: (t, fid) => (fid === 'F4' ? 'Find which invoices were over contract' : 'Get back to the supplier on ' + t),
    closeQ: 'Last thing. Next quarter\'s price list goes out Friday. Anything you want me to look at before then?',
    closeYes: 'Yes. Hold us to the contract rate until it ends, and credit what you billed over it.',
    closeOwed: () => 'Not right now. Send it over and we\'ll take a look.',
    wakeClose: (P, thu, w) => 'Yes. Every invoice matched against the contract: ' + (w.model.F4 ? '$' + Math.round(w.model.F4.credit).toLocaleString('en-US') + ' billed over the locked rate in six weeks' : 'the overage is itemized') + '. I\'ll send you the list now. We\'d like that credited.',
    reads: {
      confident: ['Credit agreed', 'I\'ll put the credit through this week. Thanks for catching it.'],
      waiting: ['Credit waiting on your invoices', 'Send me the invoice list and I\'ll get it moving.'],
      watching: ['Nothing recovered', 'Sounds good. You\'ll see the new price list Friday.'],
    },
    // where a supplier call lands is about the overbilling, not how many answers you had
    readOf(r, owed, w) {
      const f4 = r.items.find((c) => c.fid === 'F4' && c.kind === 'finding');
      if (!w.model.F4) return owed ? 'waiting' : 'confident';
      if (!f4) return 'watching';
      return f4.decision === 'decided' ? 'confident' : 'waiting';
    },
    card: {
      title: 'Your supplier is calling.',
      what: (P, ctrl) => P.name + ', your account rep at ' + P.org + ', is calling before next quarter\'s pricing is set. ' + ctrl.name + ' (' + ctrl.title + ') is on the line with you. The call runs twice: first with what you found on your own, then with what you prepared with Wake.',
      why: 'A supplier call is money on the table: what they billed, what the contract says, and what next quarter costs. You only recover what you can prove on the call.',
      watch: ['on the call, with the numbers', 'when you have to get back to them', 'whether you recover the overage'],
      wake: 'Wake isn\'t on the call. It did its work before ten: every invoice is matched against the contract, so you walk in with the overage itemized.',
      cta: 'Take the call',
    },
    intro: { h1: (P) => 'Your call with ' + P.org, lead: (P) => P.name + ', your account rep, is calling before next quarter\'s pricing is set. They\'ll ask how business is going, and you\'ll find out whether you can recover what they billed over contract.', agenda: 'What you\'ll bring up' },
    again: 'Same supplier, same 10:00 AM.',
    result: { k: 'The call', h1: 'Same supplier. Two calls.', owedRow: 'Items still open with the supplier', scoreRow: 'Time on the call with the supplier' },
    after: { first: 'Write up the call and tell purchasing what was agreed', brief: (thu, P) => 'Pull the invoices ' + P.first + ' asked for', done: (thu, P) => 'Invoice list matched to the contract sent to ' + P.first + ' at ' + P.org },
    week: { what: 'The rest of the week plays out twice, side by side: the plan you left the supplier call with on your own, and the plan you left it with using Wake.', why: 'A credit only counts once it lands, and the rest of the plan has to move the numbers. This is where you see how far each gets by Friday.', wake: 'After the call Wake keeps watching. Every new invoice is checked against the contract the day it arrives, and each owner gets an alert when their measure drifts.', you: 'The plan after the supplier call', withWake: 'The plan after the supplier call, with Wake' },
    report: { h2: 'The call with your supplier', sub: 'Same supplier, same questions. Prep, time on the call, and what you could prove.', owed: 'items still open with the supplier', done: 'settled on the call with the supplier' },
  },

  buyer: {
    medium: 'Video call', step: 'The call', title: 'Due diligence call', icon: 'file',
    pick: { name: 'A due diligence call with a buyer', line: 'A firm looking to invest asks for the story behind every number. Every gap becomes an open item in diligence.' },
    who(seed) {
      const name = pickOf(seed, 'buyer', ['Brian Mercer', 'Laura Kemp', 'Daniel Porter', 'Rachel Collins', 'Scott Hale', 'Megan Carlisle']);
      return { name, title: 'Partner', org: pickOf(seed, 'firm', ['Ridgeline Capital', 'Harbor Point Partners', 'Stonebridge Equity', 'Northgate Capital', 'Oak Hollow Partners']), them: 'the buyer' };
    },
    status: { answered: 'Answered with support', follow: 'Answered · support to follow', owed: 'Open in diligence', none: 'One-time item' },
    owedShort: 'Open in diligence', owedCounter: 'open in diligence', readName: 'The buyer\'s read',
    open: () => 'Thanks for making the time. Before we go further, we want to understand the numbers behind this year. Walk me through what\'s moving.',
    q: {
      F1: ['Is that labor cost structural? If it is, it comes off the earnings we\'d pay for.', 'Is that a staffing problem or a scheduling problem? It changes how we model it.'],
      F2: ['Is there deferred maintenance? Capital we\'d have to put in comes off the price.', 'Is that a one-time repair, or are we buying equipment after close?'],
      F3: ['Customer retention is what we\'re paying for. Is it slipping?', 'Are those customers coming back, or are they gone?'],
      F4: ['Are your supplier contracts actually enforced?', 'Is that overage recoverable, or is it in the run-rate?'],
      F5: ['Is turnover a culture problem or a hiring problem?', 'Does that turnover follow a particular manager?'],
      other: ['Is that a one-time item, or does it recur?'],
    },
    noise: ['Is that a one-time item? I\'d rather not adjust for it.', 'Likely one-time. I flagged it this morning, but I haven\'t confirmed it.', 'Fine. We\'ll leave it out.'],
    reply: { decided: 'That\'s a clean answer. Thank you.', guess: 'We\'ll need the support for that in the data room.', agreed: 'Put the numbers in the data room when they land.', parked: 'Okay. We\'ll flag it as open in diligence.' },
    owe: (t) => 'Put the ' + t + ' numbers in the data room', oweOpen: (t) => 'Answer the buyer on ' + t,
    closeQ: 'Last one. How confident are you in this year\'s numbers?',
    closeYes: 'Very. Every figure ties back to the systems, and the fixes are already in motion.',
    closeOwed: (n) => 'Confident. I\'ll get you ' + (n === 1 ? 'the open item' : 'the ' + n + ' open items') + ' this week.',
    wakeClose: () => 'Very. Every figure I gave you ties back to its source, and Wake can put the support in the data room today.',
    reads: {
      confident: ['Moving forward', 'This is the kind of call that moves a deal forward. Thank you.'],
      waiting: ['Wants the open items', 'Send the open items and we\'ll keep going.'],
      watching: ['Wants more diligence', 'We\'ll need to dig further before we can move.'],
    },
    card: {
      title: 'The buyer is on the line.',
      what: (P, ctrl) => P.name + ', a partner at ' + P.org + ', is doing due diligence on the business. ' + ctrl.name + ' (' + ctrl.title + ') is on with you. The call runs twice: first with what you found on your own, then with what you prepared with Wake.',
      why: 'A buyer pays for earnings they believe. Every number you can explain holds its value; every gap becomes an open item, and open items come off the price.',
      watch: ['with the support behind it', 'when you can\'t back it up yet', 'at the end of the call'],
      wake: 'Wake isn\'t on the call. It did its work before ten: every number you give traces to its source, ready for the data room.',
      cta: 'Join the call',
    },
    intro: { h1: (P) => 'Due diligence with ' + P.org, lead: (P) => P.name + ', a partner at the firm, wants the story behind this year\'s numbers. They\'ll go down what you brought, then ask what every buyer asks: how confident are you in these numbers?', agenda: 'What you\'ll walk the buyer through' },
    again: 'Same buyer, same 10:00 AM.',
    result: { k: 'The call', h1: 'Same buyer. Two calls.', owedRow: 'Items left open in diligence', scoreRow: 'Time on the call with the buyer' },
    after: { first: 'Write up the call and brief the team on what the buyer asked', brief: (thu, P) => 'Build the support for ' + P.first + '\'s open items', done: (thu, P) => 'Support for every number sent to the data room for ' + P.first + ' at ' + P.org },
    week: { what: 'The rest of the week plays out twice, side by side: the plan you gave the buyer on your own, and the plan you gave them with Wake.', why: 'A buyer watches what happens after the call. This is where you see how far each plan gets by Friday.', wake: 'After the call Wake keeps watching. Each owner gets an alert the moment their measure drifts, and the data room stays current without anyone pulling numbers.', you: 'The plan you gave the buyer', withWake: 'The plan you gave the buyer with Wake' },
    report: { h2: 'The due diligence call', sub: 'Same buyer, same questions. Prep, time on the call, and how much you could support with the numbers.', owed: 'items left open in diligence', done: 'answered with support for the buyer' },
  },
};

export const specOf = (moment) => SPECS[moment] || null;

// who you'll be talking to, for a seed (the same person every time)
export function callerFor(moment, seed, world) {
  const S = SPECS[moment]; if (!S) return null;
  const p = S.who(seed, world);
  return { key: 'ext', ...p, first: p.name.split(' ')[0], bank: p.org };
}

// ------------------------------------------------------------------ the call
export function createCall({ world, who }) {
  const S = SPECS[world.moment], P = world.caller;
  const thu = world.sources.x_brief ? world.sources.x_brief.title.replace(/^Brief for /, '') : 'Thursday\'s review';
  const topic = (fid) => (fid && world.findingById[fid] ? world.t(world.findingById[fid].topic).toLowerCase() : '');
  const fig = (what) => what.label + (what.value ? ' (' + what.value + ')' : '');
  const plain = (x) => String(x || '').trim().replace(/\.$/, '');
  const stamp = (bucket) => ({ label: S.status[bucket], tone: TONE[bucket] });
  const question = (fid, n) => { const list = S.q[fid] || S.q.other; return list[hash(world.seed + ':q:' + (fid || '') + ':' + n) % list.length]; };
  const reply = (fid, d) => (fid === 'F4' && S.replyF4 ? S.replyF4[d] : S.reply[d]);
  const readOf = (key) => ({ key, label: S.reads[key][0], reply: S.reads[key][1] });
  // how they leave the call: confident when everything was answered with the numbers, waiting when
  // most was answered with figures to follow, watching when most is still open. Never alarmed.
  const generalRead = (full, answered, real, owed) => { if (!real) return 'confident'; return owed === 0 && full >= real ? 'confident' : answered / real >= 0.5 ? 'waiting' : 'watching'; };

  // ------------------------------------------------------------ on your own
  // `r` is the meeting result for what you brought; `agenda` has the evidence you attached.
  function yours(r, agenda) {
    const lines = [], items = [];
    let minutes = OPEN_MIN, owed = 0, answered = 0, asked = 0;
    const say = (k, text, extra) => lines.push({ who: k, text, ...extra });
    say('ext', S.open(P, thu), { at: 0 });
    say('me', 'Sure. I have ' + r.items.length + (r.items.length === 1 ? ' thing' : ' things') + ' to walk you through.', { at: 1 });
    for (const c of r.items) {
      const a = agenda.find((x) => x.n === c.n) || {};
      const bucket = BUCKET[c.decision] || 'answered';
      const what = c.what || a.what || { label: 'This one' };
      say('me', (c.n === 1 ? 'First: ' : c.n === r.items.length && c.n > 1 ? 'Last one: ' : 'Next: ') + fig(what) + '.', { item: c.n, kind: 'present', at: minutes });
      asked += 1;
      if (c.kind !== 'finding') {
        say('ext', S.noise[0], { item: c.n, kind: 'q' });
        say('me', S.noise[1], { item: c.n });
        say('ext', S.noise[2], { item: c.n });
      } else {
        say('ext', question(c.fid, c.n), { item: c.n, kind: 'q' });
        const plan = plain(c.text), t = topic(c.fid) || 'that';
        const owner = c.owner && c.owner.key !== 'me' ? ' ' + c.owner.first + ' owns it, starting Tuesday.' : '';
        if (c.decision === 'decided') {
          answered += 1;
          say('me', (a.costEv ? a.costEv + '. ' : a.ev ? 'I traced it: ' + a.ev + '. ' : '') + 'It\'s understood and it\'s handled. ' + plan + '.' + owner, { item: c.n, kind: 'a', ok: true });
          say('ext', reply(c.fid, 'decided'), { item: c.n });
        } else if (c.decision === 'guess' || c.decision === 'pilot') {
          answered += 1; owed += 1;
          say('me', 'My read: ' + plan + '. I don\'t have the exact figure in front of me.', { item: c.n, kind: 'a' });
          say('ext', reply(c.fid, 'guess'), { item: c.n, owe: S.owe(t, c.fid) });
        } else if (c.decision === 'agreed') {
          answered += 1; owed += 1;
          say('me', 'We\'re acting on it this week. ' + plan + '. I\'ll send you the numbers once they land.', { item: c.n, kind: 'a' });
          say('ext', reply(c.fid, 'agreed'), { item: c.n, owe: S.owe(t, c.fid) });
        } else {
          owed += 1;
          say('me', 'I\'d rather not guess on that one. Let me get back to you.', { item: c.n, kind: 'a' });
          say('ctrl', 'I can pull it together this afternoon.', { item: c.n });
          say('ext', reply(c.fid, 'parked'), { item: c.n, owe: S.oweOpen(t, c.fid) });
        }
      }
      minutes += MINUTES[c.decision] || 3;
      say(null, '', { item: c.n, kind: 'stamp', stamp: stamp(bucket), at: minutes });
      items.push({ n: c.n, decision: c.decision, label: S.status[bucket], minutes: MINUTES[c.decision] || 3, what });
    }
    const real = r.items.filter((c) => c.kind === 'finding').length;
    const full = r.items.filter((c) => c.kind === 'finding' && c.decision === 'decided').length;
    asked += 1;
    const read = readOf(S.readOf ? S.readOf(r, owed, world) : generalRead(full, answered, real, owed));
    say('ext', S.closeQ, { kind: 'q' });
    if (read.key === 'confident') say('me', S.closeYes, { kind: 'a', ok: true });
    else say('me', S.closeOwed(owed), { kind: 'a' });
    say('ext', read.reply);
    minutes += CLOSE_MIN;
    return { lines, items, minutes, owed, answered, asked, read, full, real, attendees: ON_LINE, hours: Math.round(minutes * ON_LINE / 6) / 10 };
  }

  // ------------------------------------------------------------ with Wake
  // `k` is Wake's meeting: every item with its evidence, an owner and the number to watch.
  function wake(k) {
    const lines = [];
    const say = (kk, text, extra) => lines.push({ who: kk, text, ...extra });
    let minutes = OPEN_MIN - 1, asked = 0;
    say('ext', S.open(P, thu), { at: 0 });
    say('me', 'Sure. I have ' + k.items.length + ' things, ranked, each with the numbers behind it.', { at: 1 });
    for (const it of k.items) {
      say('me', it.headline + ' ' + it.action, { item: it.n, kind: 'present', at: minutes });
      asked += 1;
      say('ext', question(it.fid, it.n), { item: it.n, kind: 'q' });
      const why = it.qs[0], cost = it.qs[1];
      say('me', why ? why.answer : it.action, { item: it.n, kind: 'a', ok: true, chips: why && why.chips });
      if (cost) say('me', cost.answer, { item: it.n, kind: 'a', ok: true });
      say('ext', it.fid === 'F4' && S.replyF4 ? S.replyF4.decided : 'Clear. Thank you.', { item: it.n });
      minutes += WAKE_MIN;
      say(null, '', { item: it.n, kind: 'stamp', stamp: stamp('answered'), at: minutes });
    }
    asked += 1;
    say('ext', S.closeQ, { kind: 'q' });
    say('me', S.wakeClose(P, thu, world), { kind: 'a', ok: true });
    const read = readOf('confident');
    say('ext', read.reply);
    minutes += CLOSE_MIN - 1;
    return { lines, items: k.items.map((it) => ({ n: it.n, decision: 'decided', label: S.status.answered, minutes: WAKE_MIN })), minutes, owed: 0, answered: asked, asked, read, full: k.items.length, real: k.items.length, attendees: ON_LINE, hours: Math.round(minutes * ON_LINE / 6) / 10 };
  }

  return { S, P, L: P, thu, yours, wake, who };
}
