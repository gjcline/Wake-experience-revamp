// TWO ROUNDS: FIXED RULES
// The per-game content (briefing, reactions, the week) is generated with the company in
// scenario.js. What stays fixed is how an action is read and how it lands on each problem.

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

