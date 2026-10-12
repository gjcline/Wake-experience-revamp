// THE MEETING DIRECTOR
// Runs the leadership meeting you prepared on your own, the way real ones run. Each item is a
// short scene built from the problem itself, the people in the room who have a stake in it,
// what you brought, and how the meeting has gone so far:
//   - the person closest to the problem reacts first, in their own words
//   - the room tests the cause, the size and the owner, in the language of that problem
//   - stakeholders push back with their own constraints, and offer their own fixes
//   - what you showed earlier builds trust; guessing costs it, and the room notices
//   - a related item gets connected by someone in the room
//   - the clock matters: a tangent, a time check, people stepping out, a rushed close
// Anything left open becomes a follow-up in someone's queue; the room can still agree to move.
//
// The script is a generator: each beat is yielded, the answer comes back in, and the next beat
// depends on it. Replaying the recorded answers rebuilds the meeting exactly, so the screens,
// the week and the report all read the same outcome.

import { judgeFlag } from './judge.js';

const money = (v) => '$' + Math.abs(Math.round(v)).toLocaleString('en-US');
const kmoney = (v) => (v >= 10000 ? '$' + Math.round(v / 1000) + 'k' : money(v));
export const MOVED = ['decided', 'guess', 'agreed', 'pilot'];
const NEXT_WEEK = 9;

// minutes each kind of answer takes in the room
const MIN = {
  none: 0, present: 2, say: 1, answer: 1, guess: 3, iou: 3, bounce: 4, self: 2, later: 2, assign: 1, volunteer: 1, late: 2, reroute: 2, brief: 1,
  pilot: 3, push: 3, anyway: 3, ask: 2, adopt: 2, rethink: 3, clarify: 2, vague: 1, alt: 2, interim: 3, waitlook: 2, longer: 1, approve: 2, review: 2,
  drop: 1, watch: 1, keep: 3, offline: 1, park: 1, go: 6, speed: 1, time: 1, merge: 1, link: 2, separate: 2, now: 3, wait: 1, quick: 1, date: 2, skip: 1,
  manual: 2, monday: 1, tracker: 2, accept: 1, swap: 2, trust: 0, reason: 2,
  hold: 2, loop: 2, circle: 3, move: 1, chime: 2,
};
const EFFECT_META = {
  answer: 'answers it', guess: 'on your word', iou: 'adds a follow-up', bounce: 'a ballpark', self: 'you own it', later: 'adds a follow-up', assign: 'names an owner',
  pilot: 'smaller start', push: 'full plan', anyway: 'your call', ask: 'hear them out', adopt: 'their fix', rethink: 'adds a follow-up', clarify: 'their idea',
  vague: 'no specifics', alt: 'a different move', interim: 'starts now', waitlook: 'waits for the answer', longer: 'next week', approve: 'approves it', review: 'adds a follow-up',
  drop: 'moves on', watch: 'light touch', keep: 'keeps a team on it', offline: 'after the meeting', park: 'stays on track', go: 'takes the time',
  speed: 'faster', time: 'full discussion', merge: 'one plan', link: 'one owner', separate: 'separate plans', now: 'starts Tuesday', wait: 'nothing moves yet',
  quick: 'no date', date: 'owner and date', skip: 'next week', manual: 'your time, midweek', monday: 'no check until Monday', tracker: 'your time, weekly',
  accept: 'starts later', swap: 'someone else', late: 'starts later', reason: 'in your words',
  hold: 'holds the line', loop: 'adds a follow-up', circle: 'more discussion', move: 'moves on',
};

export function createMeeting({ world, state, person }) {
  const t = world.t, model = world.model;
  const first = (k) => (k === 'me' ? 'You' : (world.characters[k] ? world.characters[k].name.split(' ')[0] : ''));
  const who = (k) => { const p = person(k); return { key: k, name: p.name, first: first(k), title: p.title }; };
  const mgrOf = (loc) => (loc && world.locById[loc] ? world.locById[loc].manager : null);
  const ROOM = world.central.concat(world.locations.map((l) => l.manager));
  const inRoom = (k) => ROOM.includes(k);
  const placeOf = (fid) => { const f = world.findingById[fid]; return world.shell.multi && f.loc ? world.locById[f.loc].name : ''; };
  const at = (fid) => (placeOf(fid) ? ' at ' + placeOf(fid) : '');
  const topicOf = (fid) => t(world.findingById[fid].topic).toLowerCase();
  const natural = (fid) => world.briefing[fid].owner[0];
  const thu = world.sources.x_brief ? world.sources.x_brief.title.replace(/^Brief for /, '') : 'Thursday\'s review';
  const V = world.shell.vocab;
  const chair = 'opsdir', ctrl = 'controller';
  const hash = (s) => { let x = 2166136261; for (const ch of String(s)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
  const pickBy = (key, list) => list[hash(world.seed + ':' + key) % list.length];
  if (!state.meet) state.meet = { answers: {} };

  // ------------------------------------------------------------ the problem, in its own words
  // What the room says about each problem, who says it, and the moves they offer.
  function script(fid) {
    const M = model[fid], f = world.findingById[fid], own = natural(fid), loc = mgrOf(f.loc), P = placeOf(fid) || 'here';
    if (fid === 'F1') return {
      why: [[loc || chair, 'We\'re slammed in the ' + V.peaks + '. I don\'t see how the schedule is the problem.'], [ctrl, 'Payroll is up ' + M.pts + ' points' + at(fid) + '. Before we move people around, is this just overtime getting out of hand?']],
      assert: ['The template moved ' + V.lead + ' coverage to the ' + V.offPeaks + '. The work didn\'t move with it.', 'The overtime is all in the ' + V.peaks + '. The hours are in the wrong half of the day.'],
      cost: [[ctrl, 'What is it doing to margin' + at(fid) + '?'], [chair, 'How big is this, in dollars?']],
      guessCost: 'Call it ' + M.pts + ' points of payroll. A few thousand a week.',
      concern: loc ? [loc, 'If you move my ' + V.leads + ' to the ' + V.peaks + ', who covers the morning?'] : null,
      pilot: 'Keep one ' + V.lead + ' on mornings and move the rest.', push: 'Mornings are overstaffed. Move them.',
      proposal: [loc || own, 'Before you cut anything, put the ' + V.leads + ' back on the ' + V.peaks + '. That\'s where the overtime comes from.'],
      idea: [loc || own, 'Honestly? Put the ' + V.leads + ' back on the ' + V.peaks + '. That\'s where we\'re short.'],
      alt: 'Cap overtime' + at(fid) + ' this week.', altKey: 'cut',
      step: 'move one ' + V.lead + ' to the ' + V.peak + ' shift', meantime: 'shift one ' + V.lead + ' to the ' + V.peaks + ' while we look',
    };
    if (fid === 'F2') {
      const cover = M.cover ? mgrOf(M.cover) : null;
      return {
        why: [[chair, 'Is it the ' + V.equipment + ' itself, or how we\'re running it?'], [loc || own, 'It\'s been fixed three times. Every time they tell me it\'s good.']],
        assert: ['Three repairs in six weeks. Repairs aren\'t holding, so it\'s done.', 'Every repair buys a week, then it fails again. It needs replacing.'],
        cost: [[ctrl, 'That\'s ' + money(M.quote) + ' we didn\'t budget. What is the downtime actually costing us?']],
        guessCost: 'More than ' + money(M.quote) + ', within a couple of months.', gate: true,
        concern: cover && inRoom(cover) ? [cover, 'Fine, but until it arrives my team can\'t keep covering on overtime.'] : null,
        pilot: 'Cap the overtime and push some of the work to the weekend.', push: 'Order it today and plan the overflow properly.',
        proposal: [loc || own, 'Just replace it. The quote has been sitting for weeks.'],
        idea: [loc || own, 'If it were up to me, we\'d stop patching it and get the replacement ordered.'],
        alt: 'Get ' + M.equipCo + ' back out for a proper repair.', altKey: 'repair',
        step: 'get the order in and plan the overflow', meantime: 'plan the overflow before the next failure',
      };
    }
    if (fid === 'F3') return {
      why: [['marketing', P + ' is having its best month. Why would we change anything?'], [loc || own, 'The book is full. I don\'t see a problem with our regulars.']],
      assert: ['The new ' + V.customers + ' are hiding a drop in regulars.', 'The offer fills the book with first visits. The regulars aren\'t coming back.'],
      cost: [[ctrl, 'What is a regular worth to us?']],
      guessCost: 'About ' + money(M.ticket) + ' ' + (/^[aeiou]/i.test(V.visit) ? 'an ' : 'a ') + V.visit + ', every few weeks. It adds up fast.',
      concern: loc ? [loc, 'We\'re short at the desk. Who\'s making the calls?'] : null,
      pilot: 'Start with the regulars who haven\'t been in for sixty days.', push: 'Central office covers the calls until the desk is filled.',
      proposal: ['marketing', 'Don\'t touch the offer. Get the ' + V.followup + ' going again.'],
      idea: [loc || own, 'We used to call people back. We stopped when the desk emptied out.'],
      alt: 'Run a win-back discount for lapsed ' + V.customers + '.', altKey: 'promoMore',
      step: 'restart the calls with central office cover', meantime: 'have central office make the calls while we look',
    };
    if (fid === 'F4') return {
      why: [[ctrl, 'I had that down as product mix. What makes it something else?'], [chair, 'Couldn\'t that just be prices going up everywhere?']],
      assert: ['Prices jumped the week their new price list came in.', 'Our contract locks pricing through ' + M.lock + '. This is billing, not mix.'],
      cost: [[chair, 'How much are we talking about?']],
      guessCost: 'It\'s thousands, and it\'s every week.', gate: true,
      concern: [chair, 'Do we really want a fight with our main supplier?'],
      pilot: 'Raise it with our rep first and give them a week.', push: 'It\'s in the contract. We\'re asking for what we agreed.',
      proposal: [ctrl, 'If it\'s pricing, we have a contract. Let me check the invoices against it.'],
      idea: [ctrl, 'If you want my read, check the invoices against the contract price list.'],
      alt: 'Tighten usage everywhere until the cost comes down.', altKey: 'cut',
      step: 'send the dispute with six weeks of invoices', meantime: 'pull six weeks of invoices against the contract',
    };
    return {
      why: [['hr', 'People leave. What makes these three different?'], [loc || own, 'Hiring is hard everywhere. I\'m not sure it\'s us.']],
      assert: ['Two of the three exit notes say the same thing: the schedule.', 'Schedules go out ' + M.post + ' days ahead. The standard is seven.'],
      cost: [[ctrl, 'What does each exit cost us?']],
      guessCost: 'Recruiting and training, a few thousand each.',
      concern: loc ? [loc, 'I\'m already covering shifts myself. Posting a week ahead takes hours I don\'t have.'] : null,
      pilot: 'Post next week early, then see how it goes.', push: first('trainer') + ' helps you build the next two weeks.',
      proposal: ['hr', 'It\'s not the pay. Two of the exit notes are about late schedules.'],
      idea: [loc || own, 'If I could post the schedule a week out, I think people would stay.'],
      alt: 'Raise starting pay by a dollar.', altKey: 'pay',
      step: 'post next week\'s schedule early', meantime: 'get next week\'s schedule out early while we look',
    };
  }

  // varied wording for the moves people make more than once in a meeting
  const POOL = {
    iouWhy: ['I\'ll pull the history and send it round.', 'Give me until Wednesday to put numbers behind it.', 'Let me get ' + first('analyst') + ' to confirm it and circle back.', 'I\'ll have the detail to you tomorrow.'],
    iouCost: ['I\'ll get you a number by Wednesday.', 'Let me cost it out properly and send it.', 'I\'ll have ' + first('analyst') + ' size it this week.', 'I don\'t have it yet. I\'ll get it to you.'],
    commitQ: [[chair, 'So do we move on this now, or wait for the numbers?'], [ctrl, 'Can anything start this week, or are we waiting?'], [chair, 'What happens between now and when the numbers land?'], [chair, 'Are we doing this or not?']],
    now: ['Start now. The numbers can follow.', 'Get the first step going Tuesday.', 'Move on it. We\'ll firm it up when the numbers land.', 'Start small this week.'],
    wait: ['Let\'s wait for the numbers.', 'Hold it until we know.', 'Let\'s not move until it\'s sized.', 'Bring it back when we have the detail.'],
    skep: ['Before we get into it, do you have numbers on this one? We\'ve been taking a lot on faith this morning.', 'Same question as before. Is there anything behind this one yet?', 'Do we have data on this, or is it a feeling?'],
    costOk: ['Okay. Rough is fine for now.', 'Fine. Let\'s go with that.', 'I\'ll take that as a starting point.', 'Close enough to start.'],
    pushOk: ['Okay. We\'ll make it work.', 'Understood. I\'ll sort it out.', 'Alright. It\'ll be tight, but fine.'],
    pilotOk: ['That I can do.', 'That works for me.', 'I can live with that.'],
    iouOk: ['Okay. Send it round.', 'Fine. Wednesday, then.', 'Sounds good. Copy me on it.', 'Okay, we\'ll wait for that.'],
    anyway: ['Noted. Let\'s do it anyway.', 'I hear you, but I want to try it.', 'Understood. We\'re still doing it.'],
    askAlt: ['What would you do instead?', 'Okay. What would you do?', 'Then what\'s the better move?'],
    rethink: ['Fair point. Let me rethink it and come back.', 'You may be right. Let me take another look.', 'Let me go back to the numbers on that.'],
    meanQ: ['How long until we know, and what happens in the meantime?', 'When do we get an answer, and does anything move before then?', 'What\'s the timeline on that, and do we just wait?'],
    load: ['That\'s my second thing from this meeting. I can start it Wednesday.', 'I\'m already carrying one from today. Realistically, Wednesday.', 'I can take it, but not before Wednesday.'],
    loadOk: ['Wednesday is fine.', 'Okay, Wednesday.', 'That works. Start Wednesday.'],
    selfOwn: ['I\'ll take it myself.', 'Put it on me.', 'I\'ll own this one.'],
    laterOwn: ['Let\'s sort out owners after the meeting.', 'I\'ll figure out who owns it after this.', 'Let me think about who\'s best placed.'],
    rushQ: ['Quick one. Who owns it, and when does it start?', 'Short version on this one: owner and start date?', 'Thirty seconds on this one. Who has it, and when?'],
    skip: ['Let\'s take it properly next week.', 'Hold it for next week\'s meeting.', 'Park it until next Monday.'],
    waitlook: ['Answer by Wednesday. Nothing changes until then.', 'We wait for the answer before we touch anything.', 'Nothing changes until we know.'],
    longer: ['Give it a week. Let\'s not rush it.', 'Bring it back next Monday.', 'Let\'s take a full week on it.'],
    vol: ['I\'ll take it. It\'s mine anyway.', 'Put my name on it.', 'That one\'s mine. I\'ll own it.', 'I\'ve got it.'],
    adopt: ['Good. Let\'s do that.', 'That\'s better than mine. Go with it.', 'Agreed. Do that instead.'],
    later2: ['Let me think about it and come back.', 'Give me a day to think it through.', 'I want to sleep on it.'],
    noiseQ: [['analyst', 'Isn\'t that inside its normal range?'], [chair, 'Is this one for this room?'], [ctrl, 'I looked at that one. It moves around every month.'], [chair, 'Is that a trend, or just a week?']],
    faQ: ['So do we still need to do anything with it?', 'Anything left to act on there?', 'Can we take that one off the list?', 'Are we good on that one, then?'],
    clarify: ['Let\'s do that. It\'s your call on the ground.', 'Good. Do that.', 'That makes sense. Go with it.', 'You know it best. Let\'s do it your way.'],
    vague: ['Use your judgment. Just get it moving.', 'Whatever you think is best. Just start.', 'Figure out what works and go.'],
    interimPre: ['We look into it by Wednesday, and ', 'We dig in this week, and in the meantime ', 'We get the full picture by Wednesday. Until then, '],
    faDrop: ['Good to know. Let\'s drop it.', 'Then it\'s off the list.', 'Okay. Nothing to do there.'],
    faWatch: ['Let\'s just keep an eye on it next week.', 'Let\'s watch it for a week.', 'Keep it on the radar.'],
    faKeep: ['Pull the numbers on it anyway.', 'I\'d still like to see the detail.', 'Let\'s confirm it properly.'],
    nzDrop: ['Fair. Let\'s drop it.', 'Okay. It can come off the list.', 'Then let\'s move on.'],
    nzOff: ['Let\'s take it offline after the meeting.', 'I\'ll follow up on it separately.', 'Let me look at it after this.'],
    nzKeep: ['I\'d still like someone on it.', 'Can someone dig into it anyway?', 'I want it looked at.'],
    park: ['Let\'s take that offline after the meeting.', 'Can we come back to that after?', 'Hold that for after the meeting.'],
    goOn: ['Go ahead.', 'Sure, quickly.', 'Okay, what is it?'],
    merge: ['Yes. One plan covers both.', 'Same thing. Let\'s treat them as one.', 'Right. Fold them together.'],
    link: ['Yes. Same fix, applied there too.', 'Same root. Same fix.', 'Good catch. Apply the same fix.'],
    separate: ['They\'re different. Let\'s take it separately.', 'I\'d keep them apart.', 'Not quite. Let\'s treat it on its own.'],
    ownerQ: [[chair, 'Who\'s taking this one?'], [ctrl, 'Whose name goes next to this?'], [chair, 'Who owns it?'], ['hr', 'Who\'s going to drive it?']],
  };
  const vary = (ctx, key) => { const list = POOL[key]; const i = (ctx.used[key] = (ctx.used[key] || 0) + 1) - 1; return list[(i + hash(world.seed + key)) % list.length]; };

  // ------------------------------------------------------------ the conversation that goes around
  // Without the evidence in hand, each item gets talked around: another theory, what done looks
  // like, whether it's bigger than it looks, who has to sign off, what happens if it's wrong.
  // Every turn costs minutes and most of them leave someone a follow-up. Topics rotate through
  // the meeting so no item gets the same conversation, and the options rotate with them.
  function sideOf(fid) {
    const boss = world.characters.boss ? world.characters.boss.name.split(' ')[0] : 'the board';
    const P = placeOf(fid);
    const S = {
      F1: { theory: [['trainer', 'Could it be the newer people being slower? That would look like a schedule problem too.'], ['analyst', 'Isn\'t this just seasonal? It always gets busier this time of year.']], wide: 'If the template is wrong' + (P ? ' at ' + P : '') + ', is it wrong everywhere? Should we look at every schedule?', past: 'We changed that template for a reason. Wasn\'t it to cut morning overtime?', done: 'Overtime and the ' + V.waitLabel + ' both come down by Friday.', sign: 'hr' },
      F2: { theory: [['analyst', 'Is it the ' + V.equipment + ', or how it\'s being run? Maybe it\'s an operator issue.'], [ctrl, 'Could it be the parts ' + (model.F2 ? model.F2.equipCo : 'the vendor') + ' is using on the repairs?']], wide: 'Are the others the same age? Should we be looking at all of them?', past: 'Didn\'t we replace one of these a couple of years ago and still have trouble?', done: 'No unplanned downtime between now and delivery.', sign: ctrl },
      F3: { theory: [['marketing', 'Couldn\'t the regulars just be seasonal? People travel this time of year.'], [chair, 'Maybe someone opened nearby. Has anyone checked the competition?']], wide: 'Should we look at returning ' + V.customers + ' across every ' + V.unit + ' while we\'re at it?', past: 'We tried a loyalty program once. It didn\'t move much.', done: 'Returning ' + V.customers + ' back up a couple of points within the month.', sign: 'marketing' },
      F4: { theory: [[chair, 'Could it be our own usage? Waste, or over-ordering?'], ['analyst', 'Does the contract have an escalation clause? Has anyone actually read it?']], wide: 'Should we audit every vendor while we\'re at it?', past: 'We had a billing dispute with them before. It took months.', done: 'A credit from the supplier, and invoices back at contract price.', sign: ctrl },
      F5: { theory: [[ctrl, 'Could it be pay? Everyone around us is raising wages.'], ['trainer', 'Maybe it\'s onboarding, not the schedule. Are new people getting trained properly?']], wide: 'Is this happening everywhere, or just' + (P ? ' at ' + P : ' here') + '?', past: 'We tried posting schedules early once. It lasted two weeks.', done: 'No new-hire exits for the next month.', sign: 'hr' },
    }[fid] || { theory: [[chair, 'Are we sure that\'s the real cause?']], wide: 'Is this bigger than it looks?', past: 'Haven\'t we seen this before?', done: 'It stops showing up in the numbers.', sign: chair };
    return { ...S, boss };
  }
  const DRAG_POOL = {
    holdTheory: ['I don\'t think so. The timing lines up with what I said.', 'Possible, but I\'d still start with my read.', 'I hear that, but I think it\'s what I said.', 'Maybe partly. I\'d still go with my explanation.'],
    loopTheory: ['Worth ruling out. Can someone check it this week?', 'Fair. Let\'s get that checked before we commit.', 'Good question. Let\'s look into it after.', 'We should check that. Who can take it?'],
    circleTheory: ['Could be both, honestly. What does everyone think?', 'Let\'s talk that through. Anyone else seeing it?', 'Hmm. Let\'s hear from the room on that.'],
    doneQ: [[chair, 'How will we know when this is actually fixed?'], [ctrl, 'What does done look like on this one?'], [chair, 'What number are we watching to know it worked?'], ['analyst', 'What\'s the measure of success here?']],
    holdDone: ['', 'We\'ll know when ', 'The test is simple: '],
    vagueDone: ['We\'ll know when we see it.', 'It\'ll be obvious when it\'s working.', 'When people stop complaining about it.', 'We\'ll feel it on the floor.'],
    loopDone: ['Let me define that properly after the meeting.', 'I\'ll come back with a target.', 'Good question. Let me think about the right measure.'],
    wideQ: [chair, ctrl, 'analyst', 'hr'],
    narrow: ['Just this one for now. Let\'s not boil the ocean.', 'Let\'s fix this one first, then look wider.', 'One thing at a time. Just this one.'],
    widen: ['Yes, let\'s look everywhere while we\'re at it.', 'Good idea. Let\'s widen it.', 'Probably worth it. Let\'s check all of them.'],
    listIt: ['Let\'s add it to the list for another week.', 'Park it on the list. Separate conversation.', 'Let\'s note it and come back to it.'],
    pastQ: ['analyst', 'hr', chair, ctrl, 'marketing'],
    holdPast: ['This time is different. The cause is different.', 'That was a different problem.', 'Maybe, but the numbers say something else this time.'],
    circlePast: ['What happened last time? Does anyone remember?', 'Who was here for that? What went wrong?', 'Let\'s hear what happened before we decide.'],
    loopPast: ['Let me find out what we did last time and come back.', 'I\'ll dig up the history on that.', 'Let\'s check what we learned last time first.'],
    signQ: ['Do we need to run this by ', 'Should ', 'Does '],
    noSign: ['No. It\'s within what we can decide here.', 'We can make this call in this room.', 'It doesn\'t need sign-off. It\'s an operating decision.'],
    runBy: ['Let\'s run it by them first, to be safe.', 'Better to get their sign-off before we move.', 'I\'d rather check with them first.'],
    loopIn: ['Let\'s loop them in after.', 'We\'ll keep them posted.', 'I\'ll send them a note after this.'],
    riskQ: [[ctrl, 'And if we\'re wrong about this?'], [chair, 'What\'s the downside if it doesn\'t work?'], ['hr', 'What happens to people if this backfires?'], [ctrl, 'What does it cost us if we\'re wrong?']],
    reversible: ['Then we change it back. It\'s reversible.', 'We\'d know within a week and undo it.', 'Low risk. We can walk it back.'],
    downside: ['Let\'s write up the downside before we commit.', 'Fair. Let me think through the risks properly.', 'Let me map out what could go wrong first.'],
    worth: ['Then we\'ve learned something. Still worth trying.', 'Doing nothing has a downside too.', 'It\'s a risk either way. I\'d rather act.'],
    recapQ: ['Sorry, I\'ve lost the thread. What are we actually doing on this one?', 'Can someone summarize where we landed on this?', 'Wait, so what did we decide here?', 'I\'m confused. Is this decided or not?'],
    restate: ['We ', 'To be clear: we ', 'The plan is: we '],
    notes: ['Let\'s capture it in the notes and move on.', 'I\'ll write it up and send it round.', 'Let me summarize it in an email after.'],
    endOf: ['Let\'s come back to it at the end.', 'Hold that thought. We\'ll circle back.', 'Let\'s revisit it once we\'ve been through everything.'],
    dataQ: [['analyst', 'Are we confident in these numbers? That report had issues last month.'], [ctrl, 'Which report is that from? I want to make sure we\'re looking at the same thing.'], [chair, 'Is that number right? It doesn\'t match what I saw last week.']],
    trustData: ['They\'re right. I checked them.', 'It\'s the same report we always use.', 'I\'m confident in them.'],
    checkData: ['Let\'s double-check them before we act.', 'Fair. Let\'s reconcile it first.', 'Let\'s get ' + first('analyst') + ' to verify it.'],
    closeData: ['Close enough to work with.', 'Directionally, it\'s right.', 'Even if it\'s off a little, the trend is the same.'],
    chime: ['I think we\'re overthinking this.', 'Can I add one thing? We talked about something like this in the spring and never landed it.', 'For what it\'s worth, I\'d want to see the numbers before we go much further.', 'I\'m not sure we have enough to decide this today.', 'We keep coming back to this one.', 'Can we take this offline? We\'re going in circles.', 'I\'d just add that my team is already stretched.', 'Honestly, I see it both ways.'],
    moveOn: ['Okay. Moving on.', 'Fair enough.', 'Alright.', 'Let\'s keep going.'],
  };
  const dv = (ctx, key) => { const list = DRAG_POOL[key]; const i = (ctx.used['d:' + key] = (ctx.used['d:' + key] || 0) + 1) - 1; return list[(i + hash(world.seed + 'd' + key)) % list.length]; };
  const TOPICS = ['theory', 'done', 'wide', 'risk', 'sign', 'past', 'data', 'recap'];
  const loopTask = (who, what, hrs = 1) => ({ task: { who, what, hrs, kind: 'loop' } });
  function nextTopic(ctx, it, skip) {
    if (!ctx.deck) { const d = TOPICS.slice(); for (let i = d.length - 1; i > 0; i--) { const j = hash(world.seed + 'deck' + i) % (i + 1); [d[i], d[j]] = [d[j], d[i]]; } ctx.deck = d; ctx.deckAt = 0; }
    for (let n = 0; n < ctx.deck.length; n++) { const k = ctx.deck[(ctx.deckAt + n) % ctx.deck.length]; if (!skip.has(k)) { ctx.deckAt = (ctx.deckAt + n + 1) % ctx.deck.length; return k; } }
    return null;
  }
  const speak = (ctx, it, k, fallback) => (k && inRoom(k) && !ctx.out.has(k) && k !== ctx.lastSpeaker ? k : fallback && inRoom(fallback) && !ctx.out.has(fallback) ? fallback : chair);
  function* drag(ctx, it, count) {
    const S = script(it.fid), X = sideOf(it.fid), topic = topicOf(it.fid), had = new Set(ctx.dragOn[it.id] || []);
    for (let n = 0; n < count; n++) {
      const k = nextTopic(ctx, it, had); if (!k) return; had.add(k); ctx.dragOn[it.id] = [...had];
      const id = it.id + ':d' + n;
      let speaker, line, opts;
      if (k === 'theory') {
        const [sk, sl] = X.theory[(hash(world.seed + it.id + 'th') + n) % X.theory.length];
        speaker = speak(ctx, it, sk, 'analyst'); line = sl;
        opts = [opt('hold', dv(ctx, 'holdTheory'), 'hold', dv(ctx, 'moveOn')), opt('loop', dv(ctx, 'loopTheory'), 'loop', 'I can look at it.', { replyBy: 'analyst', ...loopTask('analyst', 'Rule out the other theory on ' + topic, 2) }), opt('circle', dv(ctx, 'circleTheory'), 'circle', null)];
      } else if (k === 'done') {
        const [qk, ql] = dv(ctx, 'doneQ'); speaker = speak(ctx, it, qk, chair); line = ql;
        const lead = dv(ctx, 'holdDone');
        opts = [opt('hold', lead ? lead + lcFirst(X.done) : X.done, 'hold', pickBy(id + 'ok', ['Okay. Let\'s hold to that.', 'Good. Write that down.', 'Fair.'])), opt('circle', dv(ctx, 'vagueDone'), 'circle', pickBy(id + 'vg', ['That\'s not really a measure.', 'Hmm. We\'ll need something firmer than that.', 'I\'d want a number.'])), opt('loop', dv(ctx, 'loopDone'), 'loop', 'Okay. Send it round.', loopTask('me', 'Define the success measure for ' + topic, 0.5))];
      } else if (k === 'wide') {
        speaker = speak(ctx, it, dv(ctx, 'wideQ'), ctrl); line = X.wide;
        opts = [opt('hold', dv(ctx, 'narrow'), 'hold', dv(ctx, 'moveOn')), opt('loop', dv(ctx, 'widen'), 'loop', 'That\'s a bigger job. I\'ll need a week.', { replyBy: 'analyst', ...loopTask('analyst', 'Check the rest of the business for ' + topic, 3) }), opt('loop', dv(ctx, 'listIt'), 'loop', 'Okay.', loopTask('me', 'Add the wider review of ' + topic + ' to next week', 0.5))];
        opts[2].id = 'list';
      } else if (k === 'risk') {
        const [qk, ql] = dv(ctx, 'riskQ'); speaker = speak(ctx, it, qk, ctrl); line = ql;
        opts = [opt('hold', dv(ctx, 'reversible'), 'hold', pickBy(id + 'rv', ['Okay. As long as we watch it.', 'Fine.', 'Fair enough.'])), opt('circle', dv(ctx, 'worth'), 'circle', null), opt('loop', dv(ctx, 'downside'), 'loop', 'Good. I\'d like to see that.', loopTask('me', 'Write up the downside of the ' + topic + ' plan', 1))];
      } else if (k === 'sign') {
        speaker = speak(ctx, it, X.sign !== chair ? X.sign : ctrl, ctrl);
        const q = dv(ctx, 'signQ'), b = X.boss;
        line = q === 'Should ' ? 'Should ' + b + ' see this before we commit?' : q === 'Does ' ? 'Does ' + b + ' need to sign off on this first?' : 'Do we need to run this by ' + b + ' before we do anything?';
        opts = [opt('hold', dv(ctx, 'noSign'), 'hold', pickBy(id + 'ns', ['Okay. As long as we\'re covered.', 'Fine by me.', 'Alright.'])), opt('loop', dv(ctx, 'runBy'), 'loop', 'Probably wise.', loopTask('me', 'Run the ' + topic + ' plan by ' + b, 0.5)), opt('move', dv(ctx, 'loopIn'), 'move', 'Okay.')];
      } else if (k === 'past') {
        speaker = speak(ctx, it, dv(ctx, 'pastQ'), 'hr'); line = X.past;
        opts = [opt('hold', dv(ctx, 'holdPast'), 'hold', pickBy(id + 'hp', ['Okay. I hope so.', 'Fair.', 'If you say so.'])), opt('circle', dv(ctx, 'circlePast'), 'circle', null), opt('loop', dv(ctx, 'loopPast'), 'loop', 'Okay.', loopTask('me', 'Find out what happened last time with ' + topic, 1))];
      } else if (k === 'data') {
        if (it.ev) continue;
        const [qk, ql] = dv(ctx, 'dataQ'); speaker = speak(ctx, it, qk, 'analyst'); line = ql;
        opts = [opt('hold', dv(ctx, 'trustData'), 'hold', pickBy(id + 'td', ['Okay.', 'Alright. I\'ll trust that.', 'Fine.'])), opt('loop', dv(ctx, 'checkData'), 'loop', 'I\'ll reconcile it today.', { replyBy: 'analyst', ...loopTask('analyst', 'Reconcile the numbers behind ' + topic, 1.5) }), opt('circle', dv(ctx, 'closeData'), 'circle', pickBy(id + 'cd', ['I\'m not sure that\'s good enough.', 'Hmm. Directionally isn\'t a decision.', 'Okay, but I\'d still like it checked.']))];
      } else {
        speaker = speak(ctx, it, chair, ctrl); line = dv(ctx, 'recapQ');
        opts = [opt('hold', dv(ctx, 'restate') + lcFirst(S.step) + '.', 'hold', pickBy(id + 'rc', ['Got it. Thanks.', 'Okay, that\'s clear.', 'Right.'])), opt('loop', dv(ctx, 'notes'), 'loop', 'Please do.', loopTask('me', 'Write up where we landed on ' + topic, 0.5)), opt('circle', dv(ctx, 'endOf'), 'circle', null)];
      }
      const o = yield beat(id, 'ask', speaker, line, opts, { item: it.n });
      ctx.lastSpeaker = speaker;
      if (o.effect === 'circle') {
        const others = ROOM.filter((m) => m !== speaker && !ctx.out.has(m) && m !== chair);
        const ck = others[hash(world.seed + id + 'ch') % others.length] || chair;
        yield say(id + ':ch', ck, dv(ctx, 'chime'), { item: it.n, effect: 'chime' });
        ctx.lastSpeaker = ck;
      }
    }
  }
  // the options never sit in the same order twice
  function rotate(opts, id) { if (opts.length < 3) return opts; const r = hash(world.seed + 'rot' + id) % opts.length; return opts.slice(r).concat(opts.slice(0, r)); }
  // how long the room talks an item around, before the money and the owner
  function dragCount(ctx, it) {
    if (ctx.rushed || ctx.cur.linked) return 0;
    let n = 2;
    if (it.ev) n -= 1;
    if (it.costEv) n -= 1;
    if (it.own) n -= 0;
    if (['unclear', 'partial'].includes(it.handling)) n += 1;
    if (ctx.trust >= 2) n -= 1;
    if (ctx.minutes > 40) n -= 1;
    return Math.max(it.ev ? 0 : 1, Math.min(3, n));
  }

  // ------------------------------------------------------------ the agenda
  function agenda() {
    return state.flags.map((f, i) => {
      const j = judgeFlag(world, f);
      const fits = j.attached.filter((a) => a.fits);
      const fid = j.finding || null;
      const flagged = f.signals.concat(...fits.map((a) => a.signals));
      const ev = !fid ? '' : fits[0] ? fits[0].label : j.quiet ? f.what.label + (f.what.value ? ': ' + f.what.value : '') : '';
      const mSig = fid ? flagged.find((s) => model[fid].money.includes(s)) : null;
      const note = String(f.note || '').trim();
      return { id: 'i' + (i + 1), n: i + 1, flag: f.id, kind: j.kind, fid, what: f.what, text: f.text, owner: f.owner ? who(f.owner) : null, handling: j.handling, key: j.key,
        own: note.split(/\s+/).filter(Boolean).length >= 5 ? note : '',
        reactions: j.reactions, signal: j.signal, ev, costEv: mSig ? world.signals[mSig].label + ': ' + world.signals[mSig].value : '' };
    });
  }

  // ------------------------------------------------------------ beats
  const beat = (id, type, speaker, line, opts, extra = {}) => ({ id, type, who: speaker ? who(speaker) : null, line, opts: type === 'ask' ? rotate(opts, id) : opts, ...extra });
  const say = (id, speaker, line, extra) => beat(id, 'say', speaker, line, [{ id: 'ok', effect: 'say' }], { auto: true, ...extra });
  const opt = (id, label, effect, reply, more = {}) => ({ id, label, effect, reply, meta: EFFECT_META[effect] || '', ...more });

  function* flow(ctx) {
    const items = agenda();
    ctx.items = items;
    yield say('open', chair, pickBy('open', ['Let\'s get started. What have you got for us?', 'Okay, let\'s go. What\'s on the list this week?', 'Let\'s start. Walk us through it.']), { first: true });
    const tangentAt = world.routine.length && items.length >= 3 && hash(world.seed + 'tangent') % 3 !== 0 ? 1 + (hash(world.seed + 'tat') % Math.max(1, items.length - 2)) : -1;
    for (const [i, it] of items.entries()) {
      if (i === tangentAt) yield* tangent(ctx, it);
      if (!ctx.timeChecked && ctx.minutes >= 26 && i >= 2 && items.length - i >= 2) yield* timeCheck(ctx, items.length - i);
      const out = ctx.begin(it);
      yield beat(it.id + ':present', 'present', 'me', '"' + it.text + '"', [{ id: 'ok', effect: 'present' }], { item: it.n, auto: true });
      if (it.kind === 'falseAlarm') yield* falseAlarm(ctx, it);
      else if (it.kind === 'noise') yield* noise(ctx, it);
      else {
        const twin = items.slice(0, i).find((x) => x.fid && x.fid === it.fid) || items.slice(0, i).find((x) => x.fid && related(x.fid, it.fid));
        let merged = false;
        if (twin && ctx.outOf(twin) && (ctx.linksAsked = (ctx.linksAsked || 0) + 1) <= 2) merged = yield* connect(ctx, it, twin);
        if (!merged) {
          if (ctx.rushed) yield* rushed(ctx, it);
          else yield* discuss(ctx, it);
          if (ctx.pending(out)) {
            const [ak, line] = vary(ctx, 'commitQ');
            const S = script(it.fid);
            yield beat(it.id + ':go', 'ask', ak, line, [
              opt('now', vary(ctx, 'now') + ' First step: ' + S.step + '.', 'now', 'Okay. Get it going, and send the numbers when they land.'),
              opt('wait', vary(ctx, 'wait'), 'wait', 'Fine. We\'ll pick it up when they land.')], { item: it.n });
          }
        }
      }
      ctx.end(it);
      yield beat(it.id + ':stamp', 'stamp', null, '', [{ id: 'ok', effect: 'none' }], { item: it.n, auto: true, outcome: { decision: out.decision, owner: out.owner, dated: out.dated, follow: out.tasks.filter((x) => x.kind !== 'keep').length } });
    }
    const [ak, line] = [chair, 'How will we know any of this is working before ' + thu + '?'];
    yield beat('wrap', 'ask', ak, line, [
      opt('manual', 'I\'ll check in with each owner on Wednesday.', 'manual', 'Okay. Wednesday it is.'),
      opt('tracker', 'I\'ll put a tracker together and send it round each week.', 'tracker', 'Good. Send it before Thursday.'),
      opt('monday', 'Let\'s review it all next Monday.', 'monday', 'Next Monday, then.')], { item: 0 });
  }
  const related = (a, b) => a !== b && ['F1', 'F5'].includes(a) && ['F1', 'F5'].includes(b);

  // the item, discussed properly
  function* discuss(ctx, it) {
    const S = script(it.fid), out = ctx.cur, own = natural(it.fid);
    const reaction = it.reactions[0] && inRoom(it.reactions[0].who) && !ctx.out.has(it.reactions[0].who) ? it.reactions[0] : null;
    if (it.handling === 'counter') {
      const x = reaction || { who: own, line: 'Are we sure that fixes it?' };
      const o = yield beat(it.id + ':ct', 'ask', x.who, x.line, [
        opt('anyway', vary(ctx, 'anyway'), 'anyway', pickBy(it.id + 'ay', ['Okay. Your call.', 'Alright. On you, then.', 'Fine. We\'ll try it.'])),
        opt('ask', vary(ctx, 'askAlt'), 'ask', null),
        opt('rethink', vary(ctx, 'rethink'), 'rethink', pickBy(it.id + 'rt', ['Thanks. That\'s the right call.', 'I think that\'s smart.', 'Appreciate it.']), { task: { who: 'me', what: 'Rework the plan for ' + topicOf(it.fid), hrs: 1.5 } })], { item: it.n });
      if (o.effect === 'ask') {
        const [pk, pl] = S.proposal;
        yield beat(it.id + ':prop', 'ask', pk, pl, [
          opt('adopt', vary(ctx, 'adopt'), 'adopt', 'I can start on it tomorrow.', { replyBy: own }),
          opt('rethink', vary(ctx, 'later2'), 'rethink', 'Sure.', { task: { who: 'me', what: 'Rework the plan for ' + topicOf(it.fid), hrs: 1.5 } })], { item: it.n });
      }
      yield* drag(ctx, it, Math.min(1, dragCount(ctx, it)));
      if (out.handling !== 'counter') yield* sizeIt(ctx, it);
      yield* ownerBeats(ctx, it);
      return;
    }
    if (reaction) {
      // the person closest to it speaks first; if it's the natural owner agreeing, they've taken it
      const takes = it.handling === 'aligned' && reaction.who === own && !out.owner;
      yield say(it.id + ':react', reaction.who, reaction.line, { item: it.n, effect: takes ? 'volunteer' : undefined, owner: takes ? own : undefined });
    }
    if (it.handling === 'unclear') {
      const [ik, il] = S.idea;
      yield beat(it.id + ':clar', 'ask', ik, 'What do you want changed first? ' + il, [
        opt('clarify', vary(ctx, 'clarify'), 'clarify', 'Okay. I\'ll get it moving.'),
        opt('alt', S.alt, 'alt', 'If you say so.'),
        opt('vague', vary(ctx, 'vague'), 'vague', 'Okay. I\'ll figure something out.')], { item: it.n });
      yield* drag(ctx, it, dragCount(ctx, it));
      if (out.handling !== 'counter') yield* ownerBeats(ctx, it);
      return;
    }
    if (it.handling === 'partial') {
      yield beat(it.id + ':mean', 'ask', pickBy(it.id + 'mean', [chair, ctrl]), vary(ctx, 'meanQ'), [
        opt('interim', vary(ctx, 'interimPre') + S.meantime + '.', 'interim', 'Good. That\'s something this week.'),
        opt('waitlook', vary(ctx, 'waitlook'), 'waitlook', 'Okay. Wednesday.'),
        opt('longer', vary(ctx, 'longer'), 'longer', 'Next Monday, then.')], { item: it.n });
      yield* drag(ctx, it, dragCount(ctx, it));
      yield* ownerBeats(ctx, it);
      return;
    }
    // aligned: the right move; the room tests it. A linked item carries the reasoning over.
    if (out.linked) {
      yield say(it.id + ':same', chair, 'Same pattern as before, then. Let\'s not relitigate it.', { item: it.n, effect: 'trust' });
      yield* ownerBeats(ctx, it);
      return;
    }
    if (ctx.trust <= -2 && !it.ev) {
      yield beat(it.id + ':skep', 'ask', ctrl, vary(ctx, 'skep'), [
        opt('iou', vary(ctx, 'iouWhy'), 'iou', 'Then let\'s get them.', { task: { who: 'analyst', what: 'Pull the history behind ' + topicOf(it.fid), hrs: 2.5 } }),
        it.own ? opt('reason', 'Not yet. Here\'s my thinking: "' + it.own + '"', 'reason', 'Okay. That\'s at least a reason.') : opt('guess', 'Not yet. But the pattern is clear: ' + lcFirst(S.assert[0]), 'guess', 'Okay. I\'ll hold you to it.')], { item: it.n });
    } else {
      // the challenge comes from someone who hasn't just spoken
      const whys = S.why.filter(([k]) => !reaction || k !== reaction.who);
      const [wk, wl] = (whys.length ? whys : S.why)[hash(world.seed + it.id) % (whys.length || S.why.length)];
      const opts = [];
      if (it.ev) opts.push(opt('show', 'Show: ' + it.ev, 'answer', pickBy(it.id + 'ok', ['Okay. That\'s clear.', 'Fair enough. I can see it.', 'That makes sense.'])));
      if (it.own) opts.push(opt('reason', 'In my words: "' + it.own + '"', 'reason', pickBy(it.id + 'rs', ['That\'s a reasonable read.', 'Okay, I follow the logic.', 'Fair. I\'d still like to see it in the numbers.'])));
      opts.push(opt('assert', S.assert[hash(world.seed + it.id + 'a') % S.assert.length], 'guess', pickBy(it.id + 'g', ['Maybe. I\'d want to see it.', 'Could be. Do you have it in the numbers?', 'Okay. I\'ll take your word for now.'])));
      opts.push(opt('iou', vary(ctx, 'iouWhy'), 'iou', vary(ctx, 'iouOk'), { task: { who: 'analyst', what: 'Pull the history behind ' + topicOf(it.fid), hrs: 2.5 } }));
      yield beat(it.id + ':why', 'ask', wk, wl, opts, { item: it.n });
    }
    // a stakeholder with their own constraint
    if (S.concern && hash(world.seed + it.id + 'c') % 2 === 0 && !ctx.out.has(S.concern[0])) {
      const [ck, cl] = S.concern;
      yield beat(it.id + ':conc', 'ask', ck, cl, [
        opt('push', S.push, 'push', vary(ctx, 'pushOk')),
        opt('pilot', S.pilot, 'pilot', vary(ctx, 'pilotOk')),
        opt('iou', 'Let\'s work out the details together after this.', 'iou', 'Okay.', { task: { who: ck, what: 'Work out the plan for ' + topicOf(it.fid), hrs: 1.5 } })], { item: it.n });
    }
    yield* drag(ctx, it, dragCount(ctx, it));
    yield* sizeIt(ctx, it);
    yield* ownerBeats(ctx, it);
  }

  // the money question, in the voice of whoever asks it
  function* sizeIt(ctx, it) {
    const S = script(it.fid);
    const [ck, cl] = S.cost[hash(world.seed + it.id + 'k') % S.cost.length];
    if (ctx.trust >= 2) { yield say(it.id + ':costok', ck, 'Given what you\'ve shown us so far, I\'m comfortable sizing it later.', { item: it.n, effect: 'trust' }); return; }
    const opts = [];
    if (it.costEv) opts.push(opt('show', 'Show: ' + it.costEv, 'answer', 'Good. That\'s enough to act on.'));
    opts.push(opt('guess', S.guessCost, S.gate && it.handling === 'aligned' && !it.costEv ? 'bounce' : 'guess',
      S.gate && it.handling === 'aligned' && !it.costEv ? 'I can\'t sign off on that. I need the actual number.' : vary(ctx, 'costOk'),
      S.gate && it.handling === 'aligned' && !it.costEv ? { task: { who: ctrl, what: 'Size the cost of ' + topicOf(it.fid), hrs: 2 } } : {}));
    opts.push(opt('iou', vary(ctx, 'iouCost'), 'iou', 'Get it to me and I\'ll sign off.', { task: { who: ck === ctrl ? ctrl : 'analyst', what: 'Size the cost of ' + topicOf(it.fid), hrs: 2 } }));
    yield beat(it.id + ':cost', 'ask', ck, cl, opts, { item: it.n });
  }

  // who owns it, and whether they can actually start
  function* ownerBeats(ctx, it) {
    const out = ctx.cur, nat = natural(it.fid);
    if (!out.owner) {
      const present = inRoom(nat) && !ctx.out.has(nat);
      if (present && out.handling !== 'counter' && hash(world.seed + it.id + 'v') % 2 === 0) {
        yield say(it.id + ':vol', nat, vary(ctx, 'vol'), { item: it.n, effect: 'volunteer', owner: nat });
      } else {
        const [qk, ql] = vary(ctx, 'ownerQ');
        const opts = [];
        if (inRoom(nat)) opts.push(opt('assign', 'Ask ' + first(nat) + ' to own it.', 'assign', ctx.out.has(nat) ? null : 'Okay. I\'ve got it.', { owner: nat, replyBy: nat }));
        opts.push(opt('self', vary(ctx, 'selfOwn'), 'self', 'Okay. It\'s yours.'));
        opts.push(opt('later', vary(ctx, 'laterOwn'), 'later', 'Don\'t let it drop.', { task: { who: 'me', what: 'Find an owner for ' + topicOf(it.fid), hrs: 0.5 } }));
        yield beat(it.id + ':own', 'ask', qk, ql, opts, { item: it.n });
      }
    } else if (out.owner.key !== 'me' && !world.briefing[it.fid].owner.includes(out.owner.key) && inRoom(out.owner.key) && !ctx.out.has(out.owner.key)) {
      const r = who(nat), line = 'That\'s really ' + r.first + '\'s area. I can help, but ' + r.first + ' should own it.';
      yield beat(it.id + ':rr', 'say', out.owner.key, line, [opt('ok', 'Okay. ' + r.first + ' takes it.', 'reroute', 'Got it.', { replyBy: nat, owner: nat })], { item: it.n, auto: true });
    }
    // the owner may already be carrying something from this meeting, or may have stepped out
    const o = ctx.cur.owner;
    if (o && o.key !== 'me' && ctx.out.has(o.key)) yield say(it.id + ':brief', chair, o.first + ' has stepped out. Someone will need to brief them after.', { item: it.n, effect: 'brief' });
    else if (o && o.key !== 'me' && ctx.load[o.key] >= 1 && !ctx.cur.pilot) {
      yield beat(it.id + ':load', 'ask', o.key, vary(ctx, 'load'), [
        opt('accept', vary(ctx, 'loadOk'), 'accept', 'Thanks.'),
        opt('swap', 'Let ' + first(chair) + ' take it so it starts tomorrow.', 'swap', 'I can do that.', { owner: chair, replyBy: chair })], { item: it.n });
    }
  }

  // late in a long meeting: the short version
  function* rushed(ctx, it) {
    const nat = natural(it.fid), owner = ctx.cur.owner || (inRoom(nat) && !ctx.out.has(nat) ? who(nat) : null);
    const name = owner ? (owner.key === 'me' ? 'I' : owner.first) : 'Someone';
    const owns = name + (owner && owner.key === 'me' ? ' own it' : ' owns it');
    const n = ctx.used.rushQ || 0;
    yield beat(it.id + ':rush', 'ask', n % 2 ? ctrl : chair, vary(ctx, 'rushQ'), [
      opt('quick', owns + (n % 2 ? '. Sometime this week.' : '. This week.'), 'quick', n % 2 ? 'Fine.' : 'Okay. Moving on.', { owner: owner ? owner.key : 'me' }),
      opt('date', owns + (n % 2 ? ', starting tomorrow. Check-in Thursday.' : ', starting Tuesday. Update on Thursday.'), 'date', 'Good.', { owner: owner ? owner.key : 'me' }),
      opt('skip', vary(ctx, 'skip'), 'skip', 'Fine.')], { item: it.n });
  }

  // someone in the room connects it to an earlier item
  function* connect(ctx, it, twin) {
    const same = twin.fid === it.fid;
    const speaker = same ? pickBy(it.id + 'cn', ['analyst', chair]) : 'analyst';
    const line = same ? pickBy(it.id + 'ln', ['Isn\'t this the same thing as item ' + twin.n + '?', 'Didn\'t we just cover this with item ' + twin.n + '?'])
      : 'This looks like the same root as item ' + twin.n + ': the schedule. Same fix?';
    const o = yield beat(it.id + ':link', 'ask', speaker, line, [
      opt(same ? 'merge' : 'link', vary(ctx, same ? 'merge' : 'link'), same ? 'merge' : 'link', 'Good catch.'),
      opt('separate', vary(ctx, 'separate'), 'separate', 'Okay.')], { item: it.n });
    if (o.effect === 'merge') return true;
    if (o.effect === 'link') ctx.cur.linked = true;
    return false;
  }

  function* falseAlarm(ctx, it) {
    const r = it.reactions[0] && inRoom(it.reactions[0].who) ? it.reactions[0] : { who: chair, line: 'That one has an explanation already.' };
    yield say(it.id + ':fa', r.who, r.line, { item: it.n });
    yield beat(it.id + ':faq', 'ask', chair, vary(ctx, 'faQ'), [
      opt('drop', vary(ctx, 'faDrop'), 'drop', 'Thanks. Moving on.'),
      opt('watch', vary(ctx, 'faWatch'), 'watch', 'Fine.', { task: { who: r.who === chair ? 'analyst' : r.who, what: 'Check ' + it.what.label + ' next week', hrs: 0.5 } }),
      opt('keep', vary(ctx, 'faKeep'), 'keep', 'Okay. We\'ll pull it.', { task: { who: r.who === chair ? 'analyst' : r.who, what: 'Pull numbers on ' + it.what.label, hrs: 3 } })], { item: it.n });
  }

  function* noise(ctx, it) {
    const s = world.signals[it.signal];
    const local = s && s.loc ? mgrOf(s.loc) : null;
    const [k, line] = local && inRoom(local) && !ctx.localNoise ? (ctx.localNoise = true, [local, 'That\'s normal for us this time of year.']) : vary(ctx, 'noiseQ');
    yield beat(it.id + ':nz', 'ask', k, line, [
      opt('drop', vary(ctx, 'nzDrop'), 'drop', 'Moving on.'),
      opt('offline', vary(ctx, 'nzOff'), 'offline', 'Sure.', { task: { who: 'me', what: 'Follow up on ' + it.what.label, hrs: 1 } }),
      opt('keep', vary(ctx, 'nzKeep'), 'keep', 'Okay. I\'ll find someone.', { task: { who: 'analyst', what: 'Look into ' + it.what.label, hrs: 3 } })], { item: it.n });
  }

  function* tangent(ctx, it) {
    const r = world.routine[hash(world.seed + 'tr') % world.routine.length];
    const raiser = r.loc && inRoom(mgrOf(r.loc)) ? mgrOf(r.loc) : r.owner && inRoom(r.owner) && r.owner !== chair ? r.owner : pickBy('raiser', ['hr', 'marketing', 'trainer']);
    yield beat('tangent', 'ask', raiser, 'Before we move on, can I raise something? ' + t(r.headline), [
      opt('park', vary(ctx, 'park'), 'park', 'Sure, no problem.'),
      opt('go', vary(ctx, 'goOn'), 'go', 'Thanks. So, here\'s the situation...')], { item: 0 });
  }

  function* timeCheck(ctx, left) {
    ctx.timeChecked = true;
    const o = yield beat('time', 'ask', chair, 'We\'re ' + Math.round(ctx.minutes) + ' minutes in with ' + left + (left === 1 ? ' item' : ' items') + ' to go. Can we pick up the pace?', [
      opt('speed', 'Yes. Owner and start date only from here.', 'speed', 'Thank you.'),
      opt('time', 'These matter. Let\'s take the time.', 'time', 'Okay.')], { item: 0 });
    if (o.effect === 'time' && ctx.minutes >= 30) {
      const rest = ctx.items.slice(ctx.items.length - left).map((x) => x.fid && mgrOf(world.findingById[x.fid].loc)).filter(Boolean);
      const leaving = world.locations.map((l) => l.manager).filter((m) => rest.includes(m)).slice(0, 2);
      const gone = leaving.length ? leaving : world.locations.map((l) => l.manager).slice(0, 1);
      if (gone.length && world.locations.length > 1) {
        yield say('leave', gone[0], 'Sorry, I have to step out' + (gone[1] ? ', and so does ' + first(gone[1]) : '') + '. We have ' + pickBy('lv', ['a vendor call', 'a shift starting', 'an inspection at eleven']) + '.', { item: 0, effect: 'leave', leave: gone });
      }
    }
  }
  const lcFirst = (x) => x.charAt(0).toLowerCase() + x.slice(1);

  // ------------------------------------------------------------ the replay
  // Runs the meeting with the answers on record. With `open`, it stops at the first beat that
  // has no answer yet and returns it; otherwise unanswered beats take their default.
  function replay(open) {
    const answers = state.meet.answers;
    const ctx = {
      minutes: 3, trust: 0, rushed: false, timeChecked: false, used: {}, dragOn: {}, lastSpeaker: null, out: new Set(), load: {}, items_out: [], cur: null, wrap: 'manual', tasks: [],
      begin(it) { this.cur = { n: it.n, id: it.id, kind: it.kind, fid: it.fid, what: it.what, text: it.text, handling: it.handling, key: it.key, owner: it.owner, tasks: [], minutes: 0, asked: 0, answered: 0, guess: 0, mult: 1, decision: null, dated: true, pilot: false, self: false, s: 1, pre: null, interim: false, longer: false, late: false, commit: null, rushed: this.rushed, merged: false, linked: false, skip: false }; this.items_out.push(this.cur); return this.cur; },
      end() { const c = this.cur; settle(c, this); if (c.owner && c.owner.key !== 'me' && MOVED.concat(['parked']).includes(c.decision)) this.load[c.owner.key] = (this.load[c.owner.key] || 0) + 1; },
      pending(c) { return c.tasks.some((x) => !['keep', 'watch', 'loop'].includes(x.kind)); },
      outOf(twin) { return this.items_out.find((x) => x.n === twin.n); },
    };
    const gen = flow(ctx);
    let r = gen.next(), current = null, log = [];
    while (!r.done) {
      const b = r.value;
      const chosen = answers[b.id];
      if (chosen === undefined && open && !current) { current = { beat: b, ctx: snapshot(ctx) }; break; }
      const o = b.opts.find((x) => x.id === chosen) || defaultOpt(b);
      apply(ctx, b, o);
      log.push({ beat: b, opt: o });
      r = gen.next(o);
    }
    return { ctx, current, log, done: r.done };
  }
  const defaultOpt = (b) => b.opts.find((x) => x.effect === 'answer') || b.opts.find((x) => ['iou', 'assign', 'now', 'manual', 'drop', 'park', 'time', 'merge', 'link', 'interim', 'clarify', 'push', 'adopt', 'accept', 'date'].includes(x.effect)) || b.opts[0];
  const snapshot = (ctx) => ({ minutes: Math.round(ctx.minutes), owed: ctx.items_out.reduce((n, c) => n + c.tasks.filter((x) => !['keep', 'watch'].includes(x.kind) && x.who !== undefined).length, 0), decided: ctx.items_out.filter((c) => c.decision && MOVED.includes(c.decision)).length });

  function apply(ctx, b, o) {
    const c = b.item ? ctx.cur : null, e = o.effect || b.effect || 'say';
    const inc = b.type === 'present' ? MIN.present : b.type === 'stamp' ? 0 : (MIN[e] !== undefined ? MIN[e] : 1);
    ctx.minutes += inc;
    if (c) c.minutes += inc; else ctx.other = (ctx.other || 0) + inc;
    if (b.type === 'say' && b.effect) {
      if (b.effect === 'volunteer' && c) c.owner = who(b.owner);
      if (b.effect === 'brief' && c) c.tasks.push({ who: 'me', what: 'Brief ' + c.owner.first + ' on ' + topicOf(c.fid), hrs: 0.5, kind: 'brief' });
      if (b.effect === 'leave') b.leave.forEach((m) => ctx.out.add(m));
      if (b.effect === 'trust' && c) c.answered += 1;
    }
    if (b.type !== 'ask' && !(b.type === 'say' && b.opts[0].effect === 'reroute')) return;
    if (!c) { // meeting-level beats
      if (e === 'speed') ctx.rushed = true;
      if (['manual', 'monday', 'tracker'].includes(e)) ctx.wrap = e === 'tracker' ? 'manual' : e;
      if (e === 'tracker') ctx.trackerHours = 1.5;
      return;
    }
    if (b.type === 'ask') c.asked += 1;
    if (o.task) c.tasks.push({ ...o.task, kind: e, item: c.n, fid: c.fid });
    if (o.owner) c.owner = who(o.owner);
    switch (e) {
      case 'answer': c.answered += 1; ctx.trust += 1; break;
      case 'guess': c.answered += 1; c.guess += 1; ctx.trust -= 1; break;
      case 'reason': c.answered += 1; c.reasoned = true; break;
      case 'bounce': ctx.trust -= 1; break;
      case 'self': c.owner = who('me'); c.self = true; break;
      case 'pilot': c.pilot = true; break;
      case 'push': c.push = true; break;
      case 'adopt': c.handling = 'aligned'; c.adopted = true; break;
      case 'rethink': c.handling = 'aligned'; c.guess += 1; break;
      case 'clarify': c.handling = 'aligned'; c.adopted = true; break;
      case 'alt': c.handling = 'counter'; c.key = script(c.fid).altKey; break;
      case 'vague': c.dated = false; break;
      case 'interim': c.interim = true; break;
      case 'longer': c.longer = true; break;
      case 'accept': c.late = true; break;
      case 'swap': c.swapped = true; break;
      case 'quick': c.dated = false; break;
      case 'skip': c.skip = true; break;
      case 'merge': c.merged = true; break;
      case 'now': c.commit = 'now'; break;
      case 'wait': c.commit = 'wait'; break;
      default: break;
    }
  }

  // what an item adds up to once the room is done with it
  function settle(c, ctx) {
    if (c.kind !== 'finding') {
      c.decision = c.tasks.some((x) => x.kind === 'keep') ? 'busy' : 'dropped';
      c.s = NEXT_WEEK; c.mult = 0; c.dated = false; return;
    }
    if (c.merged) {
      const twin = ctx.items_out.find((x) => x.fid === c.fid && x !== c && x.decision);
      Object.assign(c, { decision: twin ? twin.decision : 'decided', owner: twin ? twin.owner : c.owner, dated: twin ? twin.dated : true, merged: true, mult: twin ? twin.mult : 1, handling: twin ? twin.handling : c.handling });
      return;
    }
    if (c.skip) { c.decision = 'next'; c.dated = false; return; }
    const open = ctx.pending(c);
    let mult = (c.guess ? 0.85 : c.reasoned ? 0.95 : 1) * (c.self ? 0.8 : 1) * (c.pilot ? 0.65 : 1) * (c.push ? 0.95 : 1) * (c.adopted ? 0.9 : 1) * (c.swapped ? 0.85 : 1) * (!c.dated ? 0.9 : 1);
    if (c.handling === 'counter') mult = 1;
    c.mult = mult;
    if (c.longer) { c.decision = 'next'; c.dated = false; return; }
    c.decision = open ? (c.commit === 'wait' ? 'parked' : 'agreed') : c.pilot ? 'pilot' : c.guess ? 'guess' : 'decided';
    if (!c.owner) c.dated = false;
  }

  // ------------------------------------------------------------ results
  function result() {
    const { ctx, log } = replay(false);
    const items = ctx.items_out;
    const wrapEffect = ctx.wrap;
    if (wrapEffect === 'monday') for (const c of items) if (c.kind === 'finding' && c.handling !== 'counter') c.mult *= 0.85;
    // follow-ups land in people's queues; each person turns around about two a day from Tuesday
    const seen = new Set(), tasks = [];
    for (const c of items) for (const x of c.tasks.concat(c.self ? [{ who: 'me', what: 'Run the ' + topicOf(c.fid) + ' fix yourself', hrs: 3, kind: 'self', item: c.n, fid: c.fid }] : [])) {
      const k = x.who + '|' + x.what; if (seen.has(k)) continue; seen.add(k); tasks.push(x);
    }
    const queue = {};
    for (const x of tasks) { if (['keep', 'self', 'watch', 'brief'].includes(x.kind)) { x.day = 1; continue; } if (x.kind === 'loop') { x.day = 2; continue; } const k = (queue[x.who] = (queue[x.who] || 0) + 1); x.day = 1 + Math.floor((k - 1) / 2); }
    const dayOf = (x) => (tasks.find((y) => y.who === x.who && y.what === x.what) || x).day;
    for (const c of items) {
      if (c.kind !== 'finding' || c.merged) continue;
      for (const x of c.tasks) x.day = dayOf(x);
      const follow = c.tasks.filter((x) => !['keep', 'watch', 'brief', 'loop'].includes(x.kind));
      const last = follow.length ? Math.max(...follow.map(dayOf)) : 0;
      let s = Math.max(1, last + 1);
      if (c.late || c.tasks.some((x) => x.kind === 'brief') || !c.dated) s = Math.max(s, 2);
      c.s = s > 4 || c.decision === 'next' ? NEXT_WEEK : s;
      if (c.s === NEXT_WEEK && c.decision === 'parked') c.decision = 'next';
      // agreed ahead of the numbers, or a first step while we look: something moves Tuesday
      if (c.decision === 'agreed' && c.handling === 'aligned' && c.s > 1) c.pre = { start: c.late ? 2 : 1, e: 0.6 * c.mult };
      if (c.interim && c.handling === 'partial' && !['parked', 'next'].includes(c.decision)) c.pre = { start: 1, e: 0.4 * c.mult };
      if (c.decision === 'agreed' && c.handling !== 'aligned') c.s = 1;
    }
    for (const c of items) if (c.merged) { const twin = items.find((x) => x.fid === c.fid && !x.merged); if (twin) Object.assign(c, { s: twin.s, pre: twin.pre }); }
    const real = items.filter((c) => c.kind === 'finding');
    const moved = items.filter((c) => MOVED.includes(c.decision));
    const ownerDate = moved.filter((c) => c.owner && c.dated);
    const deferred = items.filter((c) => ['parked', 'next'].includes(c.decision)).length;
    const attendees = ROOM.length + 1;
    const minutes = Math.round(ctx.minutes);
    const asked = items.reduce((n, c) => n + c.asked, 0), answered = items.reduce((n, c) => n + c.answered, 0);
    const clear = new Set(ownerDate.filter((c) => c.owner.key !== 'me').map((c) => c.owner.key));
    return {
      items, log, wrap: wrapEffect, minutes, attendees, hours: Math.round(minutes * attendees / 6) / 10, asked, answered, tasks,
      decided: moved.length, ownerDate: ownerDate.length, real: real.length, deferred, ious: tasks.filter((x) => !['keep', 'self', 'watch', 'brief'].includes(x.kind)).length,
      people: clear.size, trackerHours: ctx.trackerHours || 0,
    };
  }

  // the screens ask for one beat at a time
  function step() {
    const { current, ctx, done } = replay(true);
    const items = agenda();
    if (!current) return { done: true, total: items.length };
    const b = current.beat;
    return { done: false, beat: b, item: b.item ? items[b.item - 1] : null, total: items.length, tally: current.ctx };
  }
  function answer(id, optId) {
    const { current } = replay(true);
    if (!current || current.beat.id !== id) {
      // answering out of order (tests, audits): record it anyway
      state.meet.answers[id] = optId; return null;
    }
    const b = current.beat, o = b.opts.find((x) => x.id === optId) || b.opts[0];
    state.meet.answers[id] = o.id;
    const reply = o.reply ? { by: who(o.replyBy || (b.who ? b.who.key : chair)), line: o.reply } : null;
    return { ...o, reply, by: reply ? reply.by : null, beat: b };
  }

  return { step, answer, result, agenda, MIN, NEXT_WEEK };
}
