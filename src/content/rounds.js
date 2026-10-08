// TWO ROUNDS
// Content for the head-to-head: what Wake hands you in Round 2, how the team reacts when you
// present, and how each plan plays out over the week. All of it is predetermined and keyed to
// the same signals the player had in Round 1. {tokens} resolve per shell.

// Signals that look like the obvious problem. Operators tend to act on these first.
export const OBVIOUS = ['fin.labor.L4', 'msg.hire.L4', 'fin.rev.L3', 'eml.angry.L3', 'fin.cash', 'fin.rev.L5', 'msg.record.L5', 'mkt.promo.L1', 'fin.rev.L1'];

// The quiet line in each finding: easy to read past, decisive once connected.
export const QUIET = { F1: 'sch.template.L4', F2: 'eml.quote.L2', F3: 'cx.followup.L1', F4: 'ap.var', F5: 'hr.exitnote.L6' };
// What the quiet line needed beside it before it meant anything.
export const CONTEXT = {
  F1: 'Riverside\'s overtime and its wait times', F2: 'the repair log and Ashford\'s record week', F3: 'the drop in returning {customers} and the open {desk} role',
  F4: 'the {materials} cost line and the contract\'s rate lock', F5: 'the exit notes and Eli\'s overtime',
};

// Where each source lives, named the way an operator would name the system.
export const SYSTEM = {
  rep_fin: 'Accounting', rep_labor: 'Payroll + scheduling', rep_ops: 'Service system', rep_cx: 'CRM + reviews',
  rep_mnt: 'Maintenance', rep_ap: 'Purchasing', rep_hr: 'HR system', cal: 'Calendar', email: 'Inbox', message: 'Phone', note: 'Desk',
};

// People the player can hand work to.
export const OWNERS = ['derek', 'marcus', 'noor', 'grace', 'eli', 'aiko', 'tom', 'ines', 'dev', 'renee', 'colin', 'marisol'];

// What Wake hands you at 7:48 AM in Round 2.
export const BRIEFING = {
  F1: { headline: 'Riverside\'s labor problem is a scheduling problem.',
    why: '{Lead} coverage moved to mornings five weeks ago. The work moved to afternoons. Overtime, wait times and return visits all broke the same week.',
    keys: ['lab.util.L4', 'sch.template.L4', 'ops.wait.L4', 'cx.repeat.L4'],
    action: 'Move {lead} coverage back to the afternoons. Hold the two hires.', owner: ['derek'], check: 'Wait under 20 minutes by Friday.',
    onIt: 'Moving the {leads} back to afternoons today. I\'ll watch the wait.' },
  F2: { headline: 'Old Mill\'s {equipment} is failing, and Ashford is paying for it.',
    why: 'Three repairs in six weeks and 19 hours down. Old Mill\'s lost work is Ashford\'s "record week", covered on overtime. The replacement quote has sat for 19 days.',
    keys: ['mnt.wo.L2', 'eml.quote.L2', 'fin.rev.L5', 'pay.ot.L5'],
    action: 'Approve the $38,400 replacement today. Cap Ashford\'s overtime until it arrives.', owner: ['marcus'], check: 'Ordered today. Three week lead time.',
    onIt: 'Ordering it today. We\'ll plan the overflow until it\'s in.' },
  F3: { headline: 'Harbor Street is losing its regulars behind a record month.',
    why: 'New {customers} from the intro offer hide a nine point drop in returning {customers}. {Followup} stopped when the {desk} left nine weeks ago.',
    keys: ['cx.repeat.L1', 'cx.followup.L1', 'mkt.promo.L1', 'hr.req.L1'],
    action: 'Restart {followup} this week with cover from the central office.', owner: ['grace'], check: 'Follow-up completion back over 70%.',
    onIt: 'Central office covers the calls until the desk is filled. Got it.' },
  F4: { headline: '{supplier} is billing 6.8% over contract.',
    why: 'The {materials} increase was read as product mix. Mix explains 0.2 of the 1.2 points. Prices jumped the week a new price list arrived, and the contract locks rates through March 31.',
    keys: ['ap.var', 'ap.mix', 'eml.price', 'fin.mat.all'],
    action: 'Dispute six weeks of invoices and recover $11,900.', owner: ['dev'], check: 'Credit issued. Contract pricing restored.',
    onIt: 'Sending them the contract clause and six weeks of invoices today.' },
  F5: { headline: 'Tanner Creek\'s new hires are quitting over late schedules.',
    why: 'Three exits in five weeks, all new hires. Two of three exit notes cite schedules posted 1.6 days ahead. The standard is seven.',
    keys: ['hr.exits.L6', 'hr.exitnote.L6', 'sch.post.L6', 'pay.ot.L6'],
    action: 'Post schedules a week ahead. Give Eli help for two weeks to get there.', owner: ['eli'], check: 'Next two weeks posted by Thursday.',
    onIt: 'Two weeks posted by Thursday. I\'d love the help.' },
};

// Phone texts are not connected to Wake. In Round 2 the player can put each one through.
export const PHONE = ['msg_marcus', 'msg_noor', 'msg_eli', 'msg_grace', 'msg_aiko'];
export const SHARPEN = {
  msg_marcus: { finding: 'F2', line: 'Marcus confirms it went down again and work is going to Ashford. Urgency raised to today.', urgent: true },
  msg_noor: { finding: 'F2', line: 'Noor\'s record week was Old Mill\'s overflow. Added: thank her team and cap Ashford\'s overtime.', addOwner: 'noor', task: 'Cap Ashford\'s overtime and plan the overflow with Marcus.' },
  msg_eli: { finding: 'F5', line: 'Eli is covering shifts himself. Added: Ines goes to Tanner Creek this week.', addOwner: 'ines', task: 'Spend two weeks at Tanner Creek helping Eli post schedules ahead.' },
  msg_grace: { finding: 'F3', line: 'Grace confirms the desk has been short since Dana left. Root cause confirmed.' },
  msg_aiko: { finding: null, line: 'Confirms Kingsley\'s soft week was the water main closure. Still filtered. No action needed.' },
};

// Words that tell us what a written action intends. Freeform text never drives the
// simulation; it is mapped onto these intents and nothing else.
export const INTENTS = {
  cut: ['cut', 'reduce hours', 'reduce staff', 'reduce labor', 'reduce labour', 'lower labor', 'trim', 'fewer hours', 'send people home', 'cut back', 'lay off', 'layoff', 'scale back', 'reduce headcount', 'decrease hours', 'cut hours', 'reduce overtime', 'cut overtime', 'limit overtime', 'cap overtime', 'reduce ot', 'cut ot', 'tighten usage', 'reduce usage', 'cut usage', 'reduce waste'],
  hire: ['hire', 'hiring', 'recruit', 'add staff', 'more people', 'more staff', 'new employee', 'approve the two', 'add headcount', 'open roles', 'fill the role', 'fill the position', 'backfill'],
  schedule: ['schedule', 'shift', 'coverage', 'afternoon', 'template', 'rota', 'reallocat', 'realign', 'staffing pattern', 'peak', 'move the', 'redeploy', 'rebalance'],
  investigate: ['look into', 'investigate', 'dig', 'find out', 'review', 'analy', 'understand', 'why', 'check', 'audit', 'root cause', 'figure out', 'assess', 'evaluate', 'monitor', 'track', 'watch', 'report back', 'pull the', 'get data', 'deep dive', 'explore', 'research', 'verify', 'confirm', 'ask why', 'ask for'],
  replace: ['replace', 'replacement', 'approve the quote', 'purchase', 'buy a new', 'buy new', 'new unit', 'new rack', 'order a new', 'order the', 'approve the $', 'sign the quote', 'accept the quote'],
  repair: ['repair', 'fix', 'patch', 'service it', 'technician out', 'maintenance'],
  route: ['send work', 'route', 'reroute', 'redirect', 'keep sending', 'divert', 'send the overflow', 'shift work'],
  dispute: ['dispute', 'contract', 'invoice', 'overbill', 'overcharg', 'credit', 'rate lock', 'renegotiate', 'negotiate', 'price list', 'contract price', 'recover'],
  raiseprice: ['raise price', 'raise our price', 'increase price', 'price increase', 'pass through', 'pass it on', 'charge more', 'raise rates'],
  followup: ['follow up', 'follow-up', 'followup', 'call customers', 'call patients', 'call members', 'call clients', 'call guests', 'reminder', 'recall', 'outreach', 'reach out', 'win back', 'rebook', 'check-in calls', 'calls back', 'calling'],
  promoMore: ['roll out', 'rollout', 'roll it out', 'extend the offer', 'extend the promo', 'expand the offer', 'more promo', 'every location', 'all locations', 'all shops', 'all clinics', 'all studios', 'all branches', 'all restaurants', 'keep the offer', 'double down'],
  promoStop: ['end the offer', 'stop the offer', 'kill the offer', 'cancel the offer', 'end the promo', 'stop the promo', 'pause the offer', 'end it'],
  posting: ['post schedule', 'posted', 'week ahead', 'in advance', 'two weeks out', 'post the schedule', 'publish the schedule', 'advance notice', 'earlier schedule', 'schedules earlier', 'schedule earlier'],
  pay: ['raise pay', 'pay raise', 'increase pay', 'wage', 'bonus', 'incentive', 'pay more', 'starting pay', 'retention bonus'],
  support: ['support', 'help', 'send tom', 'send ines', 'coach', 'mentor', 'training', 'train'],
  recognize: ['congrat', 'recognize', 'celebrate', 'thank', 'shout out', 'great job', 'kudos', 'reward', 'well done', 'replicate', 'what they are doing right', 'learn from'],
  freeze: ['freeze', 'stop spending', 'hold spending', 'cut spending', 'halt spending', 'pause spending'],
  customer: ['apolog', 'refund', 'call the customer', 'call the patient', 'call the member', 'call the client', 'call the guest', 'make it right', 'retrain', 'reach out to the', 'respond'],
};

// How each kind of action lands on each finding. First match wins, in this order.
export const HANDLING = {
  F1: { aligned: ['schedule'], counter: ['cut', 'hire'], partial: ['investigate', 'support', 'followup', 'customer', 'posting'] },
  F2: { aligned: ['replace'], counter: ['route', 'repair', 'recognize'], partial: ['investigate', 'support', 'cut', 'schedule', 'hire'] },
  F3: { aligned: ['followup'], counter: ['promoMore', 'promoStop', 'recognize'], partial: ['investigate', 'hire', 'support', 'customer'] },
  F4: { aligned: ['dispute'], counter: ['raiseprice', 'cut', 'freeze'], partial: ['investigate'] },
  F5: { aligned: ['posting', 'schedule'], counter: ['pay', 'hire'], partial: ['investigate', 'support', 'cut'] },
};

// What the room says when you present. Picked by finding, handling and intent.
export const REACTIONS = {
  F1: {
    aligned: [['derek', 'Moving the {leads} back to afternoons today. That\'s what\'s been hurting us.']],
    cut: [['derek', 'If we cut hours, afternoons get worse. We\'re already at a 31 minute wait.']],
    hire: [['dev', 'Payroll is already up 9% on flat volume. Are we sure hiring is the fix?']],
    partial: [['marisol', 'I can dig in. It\'ll take me until Wednesday to pull it together.']],
    unclear: [['derek', 'Okay. What do you want me to change first?']],
  },
  F2: {
    aligned: [['marcus', 'Finally. I\'ll get the order in today.']],
    route: [['noor', 'We can\'t keep absorbing Old Mill\'s work on overtime. My team is done.']],
    repair: [['marcus', 'We\'ve repaired it three times. It keeps going down.']],
    recognize: [['noor', 'Thanks. Honestly, a third of that week was Old Mill\'s work and my team is exhausted.']],
    partial: [['marcus', 'I can get you a recommendation by Friday. The quote\'s been sitting for three weeks, though.']],
    unclear: [['marcus', 'Do you want me to replace it or keep patching it?']],
  },
  F3: {
    aligned: [['grace', 'We stopped making those calls when Dana left. I\'ll get them going again.']],
    promoMore: [['grace', 'The offer fills the book, but our regulars are coming back less. More discounts won\'t fix that.']],
    promoStop: [['colin', 'If we end it, new {customers} drop. Is that really the problem?']],
    recognize: [['grace', 'Thank you. Between us, fewer regulars are coming back than before.']],
    partial: [['colin', 'I can pull the second-visit numbers. Give me a few days.']],
    unclear: [['grace', 'We\'re having a record month. What do you want changed?']],
  },
  F4: {
    aligned: [['dev', 'The contract locks pricing through March. I\'ll dispute the invoices today.']],
    raiseprice: [['grace', 'Our {customers} will notice a price increase. Is that our only option?']],
    cut: [['dev', 'Usage is normal. The increase is in the price, not the volume.']],
    freeze: [['dev', 'Freezing spend won\'t touch it. The increase is in the price we\'re paying.']],
    partial: [['dev', 'I had it down as product mix. I\'ll go through the invoices this week.']],
    unclear: [['dev', 'I had it down as product mix. What do you want me to do with it?']],
  },
  F5: {
    aligned: [['eli', 'If I can post a week ahead, people stay. I\'d love the help.']],
    pay: [['renee', 'Pay isn\'t what the exit notes say. Two of three cite late schedules.']],
    hire: [['renee', 'We can hire faster, but they\'re leaving within 90 days.']],
    partial: [['renee', 'I\'ll pull the exit notes together and get back to you.']],
    unclear: [['eli', 'I\'m doing my best out here. What do you need from me?']],
  },
  falseAlarm: {
    'fin.rev.L3': [['aiko', 'We were closed Tuesday for the water main. Per open day we were up 6.6%.']],
    'fin.labor.L3': [['aiko', 'Same staff, one less open day because of the water main. It\'s back to normal.']],
    'eml.angry.L3': [['aiko', 'I refunded them Friday and called. It\'s one complaint. Our scores are steady.']],
    'fin.cash': [['dev', 'That\'s the annual insurance premium. It went out on schedule Thursday.']],
  },
  noise: [['tom', 'Is this one really a priority for this week?']],
  noOwner: ['tom', 'Who\'s taking this one?'],
  vague: ['marisol', 'What does done look like? Which number are we watching?'],
};

// The week, in two lanes. One short line and a direction per row.
export const WEEK = {
  F1: { label: 'Riverside · wait time',
    aligned: ['Coverage moved back Tuesday. Wait fell from 31 to 18 minutes.', 'up'],
    partial: ['Marisol is still digging. Wait still 30 minutes.', 'flat'],
    cut: ['Labor down 3 points. Wait up to 43 minutes. Four bad reviews.', 'down'],
    hire: ['Two hires start in three weeks. Wait still 32 minutes.', 'flat'],
    unclear: ['Derek waited for direction. Wait still 31 minutes.', 'flat'],
    untouched: ['Nothing changed. Wait 33 minutes, three more bad reviews.', 'down'] },
  F2: { label: 'Old Mill · {equipment}',
    aligned: ['Replacement ordered Monday. Overflow was planned when it failed Thursday.', 'up'],
    partial: ['Recommendation due Friday. It went down again Thursday.', 'flat'],
    route: ['Still routing to Ashford. Ashford hit 61 overtime hours and one person quit.', 'down'],
    repair: ['Repaired Wednesday. Down again Thursday.', 'down'],
    recognize: ['Ashford celebrated. Old Mill went down again Thursday.', 'down'],
    unclear: ['Marcus patched it again. Down again Thursday.', 'down'],
    untouched: ['Down again Thursday. Ashford covered it on overtime.', 'down'] },
  F3: { label: 'Harbor Street · regulars',
    aligned: ['140 follow-up calls made. 38 regulars rebooked.', 'up'],
    partial: ['Second-visit numbers due next week. Returning slips to 51%.', 'flat'],
    promoMore: ['Offer rolled out to all six. Returning drops to 50%.', 'down'],
    promoStop: ['Offer ended. New {customers} fell. Regulars still not back.', 'down'],
    recognize: ['Another record week. Returning slips to 51%.', 'flat'],
    unclear: ['Another record week. Returning slips to 51%.', 'flat'],
    untouched: ['Another record week. Returning slips to 51%.', 'flat'] },
  F4: { label: '{supplier} · invoices',
    aligned: ['$11,900 credited Thursday. Contract pricing restored.', 'up'],
    partial: ['Invoices under review. Another $2,000 billed over contract.', 'flat'],
    raiseprice: ['Prices up 2%. {Customers} noticed. Still billed over contract.', 'down'],
    cut: ['Usage tightened. Cost unchanged. Still billed over contract.', 'flat'],
    freeze: ['Spending frozen. Still billed over contract.', 'flat'],
    unclear: ['Filed as mix. Another $2,000 billed over contract.', 'flat'],
    untouched: ['Another $2,000 billed over contract.', 'flat'] },
  F5: { label: 'Tanner Creek · new hires',
    aligned: ['Two weeks of schedules posted. No new exits.', 'up'],
    partial: ['Exit notes reviewed. A fourth new hire gives notice.', 'down'],
    pay: ['Pay up a dollar. Schedule still late. A fourth hire quits.', 'down'],
    hire: ['Two more roles open. A fourth hire quits.', 'down'],
    unclear: ['Eli covered two more shifts himself. A fourth hire quits.', 'down'],
    untouched: ['A fourth new hire gives notice Friday.', 'down'] },
  falseAlarm: {
    react: ['Time went into something that was already explained.', 'flat'],
    checked: ['Checked. Nothing needed.', 'flat'],
    wake: ['Filtered at 7:48 AM. No time spent.', 'flat'],
  },
  noise: { you: ['Time went into something that didn\'t move the week.', 'flat'], wake: ['Filtered at 7:48 AM. No time spent.', 'flat'] },
};
