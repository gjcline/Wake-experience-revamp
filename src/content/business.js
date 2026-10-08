// THE BUSINESS
// One company, six locations, one Monday. Everything here is content, written once and
// shared by every shell and role. Engines read it; screens never hard-code any of it.
// Tokens in {braces} are resolved by the Business Configuration Engine.

// ---------------------------------------------------------------- locations
export const LOCATIONS = [
  { id: 'L1', name: 'Harbor Street', manager: 'grace', opened: 2011, staff: 46, tag: 'Flagship',
    note: 'Busiest month we have had. The intro offer keeps the book full. Still short at the desk since Dana left, but we are managing.',
    state: { labor: 28.4, wait: 11, sat: 4.7, repeat: 52, ot: 12 } },
  { id: 'L2', name: 'Old Mill', manager: 'marcus', opened: 2014, staff: 33, tag: '',
    note: 'The {equipment} has been in and out. Every time it gets fixed it holds for a week or so. We send work to Ashford when it is down.',
    state: { labor: 29.6, wait: 13, sat: 4.5, repeat: 58, ot: 9 } },
  { id: 'L3', name: 'Kingsley', manager: 'aiko', opened: 2016, staff: 29, tag: '',
    note: 'Lost Tuesday to the water main work on our street. Otherwise a normal week.',
    state: { labor: 30.2, wait: 12, sat: 4.6, repeat: 60, ot: 8 } },
  { id: 'L4', name: 'Riverside', manager: 'derek', opened: 2018, staff: 38, tag: '',
    note: 'We are stretched. Afternoons are brutal and I am burning overtime to get through them. I need two more people.',
    state: { labor: 34.1, wait: 31, sat: 4.1, repeat: 48, ot: 62 } },
  { id: 'L5', name: 'Ashford', manager: 'noor', opened: 2019, staff: 36, tag: '',
    note: 'Record week. The team is proud and a little worn out.',
    state: { labor: 30.9, wait: 22, sat: 4.5, repeat: 59, ot: 54 } },
  { id: 'L6', name: 'Tanner Creek', manager: 'eli', opened: 2024, staff: 24, tag: 'Newest',
    note: 'Short again. I covered Saturday myself. Next week\'s schedule is coming, I promise.',
    state: { labor: 31.8, wait: 17, sat: 4.4, repeat: 56, ot: 38 } },
];

// ---------------------------------------------------------------- characters
// Avatars are drawn from these parameters. No photographs, no generated faces.
export const CHARACTERS = {
  dev:     { name: 'Dev Anand',      title: 'Controller',                 av: { skin: '#B98562', hair: '#1E1A19', style: 'short',  shirt: '#2F5D62' } },
  tom:     { name: 'Tom Okafor',     title: 'Director of Operations',     av: { skin: '#7A4E36', hair: '#16110F', style: 'fade',   shirt: '#3D4F7A' } },
  ines:    { name: 'Ines Castillo',  title: 'Training Manager',           av: { skin: '#D6A27C', hair: '#3A241B', style: 'bun',    shirt: '#8A4B5E' } },
  marisol: { name: 'Marisol Vega',   title: 'Operations Analyst',         av: { skin: '#C99270', hair: '#2A1B16', style: 'long',   shirt: '#557A52' } },
  renee:   { name: 'Renee Whitlock', title: 'People and HR',              av: { skin: '#EBC4A6', hair: '#A8552E', style: 'bob',    shirt: '#6A5A8C' } },
  colin:   { name: 'Colin Hart',     title: 'Marketing',                  av: { skin: '#F0CDB2', hair: '#B08A4E', style: 'short',  shirt: '#B8733A' } },
  grace:   { name: 'Grace Lindqvist', title: '{mgrTitle}, Harbor Street', av: { skin: '#F2D3BC', hair: '#D9C28A', style: 'long',   shirt: '#2F5D62' } },
  marcus:  { name: 'Marcus Bell',    title: '{mgrTitle}, Old Mill',       av: { skin: '#8C5A3E', hair: '#1A1513', style: 'bald',   shirt: '#5A6B3F' } },
  aiko:    { name: 'Aiko Tanaka',    title: '{mgrTitle}, Kingsley',       av: { skin: '#EDC9A8', hair: '#14110F', style: 'bob',    shirt: '#7A3F4C' } },
  derek:   { name: 'Derek Shaw',     title: '{mgrTitle}, Riverside',      av: { skin: '#E8BE9F', hair: '#5A3A28', style: 'short',  shirt: '#3D4F7A' } },
  noor:    { name: 'Noor Haddad',    title: '{mgrTitle}, Ashford',        av: { skin: '#CFA07A', hair: '#231814', style: 'wrap',   shirt: '#4A6E8C' } },
  eli:     { name: 'Eli Brooks',     title: '{mgrTitle}, Tanner Creek',   av: { skin: '#A8704E', hair: '#1C1614', style: 'curly',  shirt: '#8A6A2F' } },
  vendor:  { name: 'Hale Equipment', title: 'Vendor',                     av: { skin: '#DDB89A', hair: '#6B6B6B', style: 'short',  shirt: '#555F66' } },
  calder:  { name: '{supplier}',     title: 'Supplier',                   av: { skin: '#E3C0A2', hair: '#3B2C22', style: 'fade',   shirt: '#444C5E' } },
  it:      { name: 'IT Helpdesk',    title: 'Systems',                    av: { skin: '#D9B595', hair: '#2B2B2B', style: 'curly',  shirt: '#5F5F6E' } },
  boss:    { name: '',               title: '',                           av: { skin: '#E6C2A4', hair: '#7A7A7A', style: 'bob',    shirt: '#30424A' } },
};

// ---------------------------------------------------------------- signals
// kind: real | supporting | buried | emerging | contradictory | falseAlarm | explainer | noise
// v / base are the numeric value and its baseline. Deviation, direction and magnitude are
// derived by the Signal Engine. sev, urg, conf, impact are 0..1.
const sig = (id, loc, cat, kind, label, value, delta, v, base, m = {}) => ({
  id, loc, cat, kind, label, value, delta, v, base,
  trend: m.trend || (kind === 'noise' ? 'flat' : 'moving'),
  sev: m.sev ?? (kind === 'noise' ? 0.05 : 0.5),
  urg: m.urg ?? (kind === 'noise' ? 0.05 : 0.4),
  conf: m.conf ?? 0.9,
  impact: m.impact ?? (kind === 'noise' ? 0.02 : 0.4),
  links: m.links || [],
  ts: m.ts || 'Mon 6:10 AM',
  action: m.action || false,
});

export const SIGNALS = [
  // -------- finance: weekly flash
  sig('fin.rev.L1', 'L1', 'finance', 'supporting', 'Harbor Street revenue', '$212k', '+6.1%', 212, 199.8, { links: ['mkt.promo.L1', 'cx.new.L1', 'cx.repeat.L1'] }),
  sig('fin.rev.L2', 'L2', 'finance', 'supporting', 'Old Mill revenue', '$139k', '-5.8%', 139, 147.6, { links: ['mnt.down.L2', 'fin.rev.L5', 'msg.overflow.L2'] }),
  sig('fin.rev.L3', 'L3', 'finance', 'falseAlarm', 'Kingsley revenue', '$118k', '-11.2%', 118, 132.9, { sev: 0.2, urg: 0.1, links: ['ops.days.L3', 'cal.closure.L3', 'msg.closure.L3'] }),
  sig('fin.rev.L4', 'L4', 'finance', 'supporting', 'Riverside revenue', '$148k', '-0.6%', 148, 148.9, { links: ['fin.labor.L4', 'ops.thru.L4'] }),
  sig('fin.rev.L5', 'L5', 'finance', 'contradictory', 'Ashford revenue', '$171k', '+9.4%', 171, 156.3, { links: ['fin.rev.L2', 'msg.record.L5', 'pay.ot.L5'] }),
  sig('fin.rev.L6', 'L6', 'finance', 'noise', 'Tanner Creek revenue', '$96k', '+1.9%', 96, 94.2),
  sig('fin.labor.L1', 'L1', 'finance', 'noise', 'Harbor Street labor', '28.4% of revenue', '+0.2 pts', 28.4, 28.2),
  sig('fin.labor.L2', 'L2', 'finance', 'noise', 'Old Mill labor', '29.6% of revenue', '+0.9 pts', 29.6, 28.7),
  sig('fin.labor.L3', 'L3', 'finance', 'falseAlarm', 'Kingsley labor', '30.2% of revenue', '+2.1 pts', 30.2, 28.1, { sev: 0.15, urg: 0.1, links: ['ops.days.L3', 'fin.rev.L3'] }),
  sig('fin.labor.L4', 'L4', 'finance', 'real', 'Riverside labor', '34.1% of revenue', '+4.1 pts', 34.1, 30.0, { sev: 0.75, urg: 0.7, impact: 0.7, links: ['pay.ot.L4', 'lab.util.L4', 'msg.hire.L4'], action: true }),
  sig('fin.labor.L5', 'L5', 'finance', 'supporting', 'Ashford labor', '30.9% of revenue', '+1.6 pts', 30.9, 29.3, { links: ['pay.ot.L5'] }),
  sig('fin.labor.L6', 'L6', 'finance', 'supporting', 'Tanner Creek labor', '31.8% of revenue', '+1.2 pts', 31.8, 30.6, { links: ['pay.ot.L6'] }),
  sig('fin.mat.all', null, 'finance', 'buried', '{Materials} cost, all {units}', '27.3% of revenue', '+1.2 pts in six weeks', 27.3, 26.1, { sev: 0.55, urg: 0.5, impact: 0.6, links: ['ap.var', 'ap.mix', 'note.mix'], action: true }),
  sig('fin.ticket.L1', 'L1', 'finance', 'supporting', 'Harbor Street revenue per {visit}', 'down 5.2%', 'eight weeks', 94.8, 100, { links: ['mkt.promo.L1', 'cx.new.L1'] }),
  sig('fin.util.all', null, 'finance', 'noise', 'Utilities, all {units}', '2.1% of revenue', '+0.1 pts', 2.1, 2.0),
  sig('fin.uniform', null, 'finance', 'noise', 'Uniforms and laundry', '$1.9k', 'one-time reorder', 1.9, 1.9),
  sig('fin.cash', null, 'finance', 'falseAlarm', 'Operating cash', '$1.42M', '-$186k in a week', 1420, 1606, { sev: 0.2, urg: 0.1, links: ['eml.bank'] }),

  // -------- labor and scheduling
  sig('pay.ot.L1', 'L1', 'labor', 'noise', 'Harbor Street overtime', '12 hours', 'norm 11', 12, 11),
  sig('pay.ot.L2', 'L2', 'labor', 'noise', 'Old Mill overtime', '9 hours', 'norm 14', 9, 14),
  sig('pay.ot.L3', 'L3', 'labor', 'noise', 'Kingsley overtime', '8 hours', 'norm 12', 8, 12),
  sig('pay.ot.L4', 'L4', 'labor', 'supporting', 'Riverside overtime', '62 hours', 'norm 21', 62, 21, { sev: 0.6, urg: 0.6, links: ['fin.labor.L4', 'ops.demand.L4', 'sch.template.L4'] }),
  sig('pay.ot.L5', 'L5', 'labor', 'supporting', 'Ashford overtime', '54 hours', 'norm 18', 54, 18, { sev: 0.55, urg: 0.55, links: ['msg.overflow.L2', 'lab.util.L5', 'hr.transfer.L5'] }),
  sig('pay.ot.L6', 'L6', 'labor', 'supporting', 'Tanner Creek overtime', '38 hours', 'norm 15', 38, 15, { links: ['hr.exits.L6', 'msg.sat.L6'] }),
  sig('lab.util.L4', 'L4', 'labor', 'real', 'Riverside productive share of paid hours', '58%', 'was 71%', 58, 71, { sev: 0.8, urg: 0.7, impact: 0.7, links: ['sch.template.L4', 'ops.thru.L4', 'pay.ot.L4'], action: true }),
  sig('lab.util.L2', 'L2', 'labor', 'supporting', 'Old Mill productive share of paid hours', '61%', 'was 72%', 61, 72, { links: ['mnt.down.L2'] }),
  sig('lab.util.L5', 'L5', 'labor', 'supporting', 'Ashford productive share of paid hours', '83%', 'was 74%', 83, 74, { links: ['pay.ot.L5', 'ops.wait.L5'] }),
  sig('lab.util.co', null, 'labor', 'noise', 'Company productive share of paid hours', '70%', 'was 72%', 70, 72),
  sig('sch.template.L4', 'L4', 'labor', 'buried', 'Riverside schedule template changed', 'five weeks ago', '{lead} coverage moved to the morning block', 1, 0, { sev: 0.8, urg: 0.75, impact: 0.75, trend: 'stepped', links: ['ops.demand.L4', 'lab.util.L4', 'ops.wait.L4'], ts: 'five weeks ago', action: true }),
  sig('sch.post.L6', 'L6', 'labor', 'buried', 'Tanner Creek schedules posted', '1.6 days ahead', 'standard is 7 days', 1.6, 7, { sev: 0.6, urg: 0.5, impact: 0.5, links: ['hr.exitnote.L6', 'hr.exits.L6'], action: true }),
  sig('sch.swap.co', null, 'labor', 'noise', 'Shift swaps, all {units}', '41', 'norm 38', 41, 38),

  // -------- operations
  sig('ops.thru.L1', 'L1', 'operations', 'noise', 'Harbor Street throughput per staffed hour', '101% of norm', '', 101, 100),
  sig('ops.thru.L2', 'L2', 'operations', 'supporting', 'Old Mill throughput per staffed hour', '88% of norm', '', 88, 100, { links: ['mnt.down.L2'] }),
  sig('ops.thru.L3', 'L3', 'operations', 'noise', 'Kingsley throughput per staffed hour', '99% of norm', 'per open day', 99, 100),
  sig('ops.thru.L4', 'L4', 'operations', 'real', 'Riverside throughput per staffed hour', '79% of norm', '', 79, 100, { sev: 0.7, urg: 0.65, impact: 0.65, links: ['lab.util.L4', 'ops.wait.L4'] }),
  sig('ops.thru.L5', 'L5', 'operations', 'supporting', 'Ashford throughput per staffed hour', '112% of norm', '', 112, 100, { links: ['msg.overflow.L2'] }),
  sig('ops.thru.L6', 'L6', 'operations', 'noise', 'Tanner Creek throughput per staffed hour', '96% of norm', '', 96, 100),
  sig('ops.wait.L1', 'L1', 'operations', 'noise', 'Harbor Street {waitLabel}', '11 min', 'norm 10', 11, 10),
  sig('ops.wait.L4', 'L4', 'operations', 'real', 'Riverside {waitLabel}', '31 min', 'norm 14', 31, 14, { sev: 0.75, urg: 0.75, impact: 0.7, links: ['cx.sat.L4', 'cx.reviews.L4', 'ops.thru.L4'], action: true }),
  sig('ops.wait.L5', 'L5', 'operations', 'emerging', 'Ashford {waitLabel}', '22 min', 'norm 13', 22, 13, { sev: 0.45, urg: 0.5, links: ['lab.util.L5', 'msg.overflow.L2'] }),
  sig('ops.wait.L6', 'L6', 'operations', 'noise', 'Tanner Creek {waitLabel}', '17 min', 'norm 14', 17, 14),
  sig('ops.demand.L4', 'L4', 'operations', 'supporting', 'Riverside {visits} arriving after 1 PM', '58%', 'was 46% a year ago', 58, 46, { sev: 0.5, urg: 0.5, links: ['sch.template.L4', 'pay.ot.L4'] }),
  sig('ops.days.L3', 'L3', 'operations', 'explainer', 'Kingsley open days last week', '5 of 6', 'revenue per open day +6.6%', 5, 6, { sev: 0.05, urg: 0.05, links: ['fin.rev.L3', 'cal.closure.L3'] }),
  sig('ops.noshow.co', null, 'operations', 'noise', 'No-show rate, all {units}', '6.1%', 'norm 5.9%', 6.1, 5.9),

  // -------- customers
  sig('cx.sat.L1', 'L1', 'customer', 'contradictory', 'Harbor Street satisfaction', '4.7', 'was 4.7', 4.7, 4.7, { sev: 0.2, urg: 0.2, links: ['cx.repeat.L1'] }),
  sig('cx.sat.L3', 'L3', 'customer', 'explainer', 'Kingsley satisfaction', '4.6', 'was 4.6', 4.6, 4.6, { sev: 0.05, urg: 0.05, links: ['eml.angry.L3'] }),
  sig('cx.sat.L4', 'L4', 'customer', 'real', 'Riverside satisfaction', '4.1', 'was 4.6', 4.1, 4.6, { sev: 0.7, urg: 0.65, impact: 0.65, links: ['ops.wait.L4', 'cx.repeat.L4'] }),
  sig('cx.sat.L5', 'L5', 'customer', 'noise', 'Ashford satisfaction', '4.5', 'was 4.6', 4.5, 4.6),
  sig('cx.repeat.L1', 'L1', 'customer', 'buried', 'Harbor Street returning {customers}', '52%', 'was 61% eight weeks ago', 52, 61, { sev: 0.7, urg: 0.5, impact: 0.7, links: ['cx.followup.L1', 'cx.new.L1', 'fin.rev.L1'], action: true }),
  sig('cx.repeat.L4', 'L4', 'customer', 'emerging', 'Riverside returning {customers}', '48%', 'was 55%', 48, 55, { sev: 0.6, urg: 0.55, impact: 0.6, links: ['cx.sat.L4', 'ops.wait.L4'] }),
  sig('cx.repeat.co', null, 'customer', 'noise', 'Returning {customers}, all {units}', '57%', 'was 59%', 57, 59),
  sig('cx.new.L1', 'L1', 'customer', 'supporting', 'Harbor Street new {customers}, last four weeks', '212', 'norm 118', 212, 118, { links: ['mkt.promo.L1', 'fin.rev.L1'] }),
  sig('cx.followup.L1', 'L1', 'customer', 'buried', 'Harbor Street {followup} completed', '31%', 'was 88%', 31, 88, { sev: 0.7, urg: 0.55, impact: 0.6, links: ['msg.desk.L1', 'hr.req.L1', 'cx.repeat.L1'], action: true }),
  sig('cx.followup.co', null, 'customer', 'noise', '{Followup} completed, other five {units}', '86%', 'was 87%', 86, 87),
  sig('cx.reviews.L4', 'L4', 'customer', 'supporting', 'Riverside reviews that mention the wait', '6 of the last 9', '', 6, 1, { sev: 0.55, urg: 0.6, links: ['ops.wait.L4', 'cx.sat.L4'] }),
  sig('cx.complaints.L3', 'L3', 'customer', 'explainer', 'Kingsley formal complaints this month', '2', 'monthly norm 2', 2, 2, { sev: 0.05, urg: 0.05, links: ['eml.angry.L3'] }),
  sig('cx.social', null, 'customer', 'noise', 'Social followers', '+3.1%', 'this month', 103.1, 100),

  // -------- maintenance
  sig('mnt.wo.L2', 'L2', 'maintenance', 'real', 'Old Mill {equipment}: repair orders in six weeks', '3', 'each closed as repaired', 3, 0.3, { sev: 0.75, urg: 0.8, impact: 0.7, links: ['mnt.down.L2', 'eml.quote.L2', 'mnt.age.L2'], action: true }),
  sig('mnt.down.L2', 'L2', 'maintenance', 'real', 'Old Mill {equipment} downtime, last two weeks', '19 hours', 'norm 3', 19, 3, { sev: 0.75, urg: 0.8, impact: 0.7, links: ['fin.rev.L2', 'lab.util.L2', 'msg.overflow.L2'] }),
  sig('mnt.age.L2', 'L2', 'maintenance', 'supporting', 'Old Mill {equipment} age', '11 years', 'rated life 10', 11, 10, { links: ['mnt.wo.L2'] }),
  sig('mnt.hvac.L3', 'L3', 'maintenance', 'noise', 'Kingsley HVAC filter change', '9 days overdue', '', 9, 0),
  sig('mnt.lot.L1', 'L1', 'maintenance', 'noise', 'Harbor Street lot resurfacing', 'scheduled', 'Sunday the 26th', 0, 0),
  sig('mnt.pm.co', null, 'maintenance', 'noise', 'Preventive maintenance completed, all {units}', '93%', 'target 95%', 93, 95),
  sig('mnt.door.L5', 'L5', 'maintenance', 'noise', 'Ashford entry door sensor', 'replaced', 'Thursday', 0, 0),

  // -------- purchasing
  sig('ap.var', null, 'purchasing', 'buried', '{supplier} invoice prices against contract, top 40 items', '+6.8%', 'since six weeks ago', 106.8, 100, { sev: 0.65, urg: 0.55, impact: 0.65, links: ['eml.price', 'ap.lock', 'fin.mat.all'], action: true }),
  sig('ap.total', null, 'purchasing', 'real', 'Paid above contract, six weeks, all {units}', '$11,900', 'about $103k a year', 11.9, 0, { sev: 0.6, urg: 0.5, impact: 0.65, links: ['ap.var'] }),
  sig('ap.lock', null, 'purchasing', 'supporting', '{supplier} contract rate lock', 'through March 31', '', 1, 1, { links: ['ap.var', 'cal.contract'] }),
  sig('ap.mix', null, 'purchasing', 'supporting', 'Share of the {materials} increase explained by mix', '0.2 of 1.2 pts', '', 0.2, 1.2, { links: ['note.mix', 'fin.mat.all'] }),
  sig('ap.vol', null, 'purchasing', 'noise', 'Purchase volume', '+0.8%', 'in line with {visits}', 100.8, 100),
  sig('ap.other', null, 'purchasing', 'noise', 'All other suppliers against contract', 'within 0.5%', '', 100.3, 100),
  sig('ap.freight', null, 'purchasing', 'noise', 'Freight surcharges', '$410', 'norm $380', 410, 380),

  // -------- people
  sig('hr.exits.L6', 'L6', 'people', 'real', 'Tanner Creek resignations in five weeks', '3', 'all within 90 days of hire', 3, 0.5, { sev: 0.6, urg: 0.5, impact: 0.5, links: ['hr.exitnote.L6', 'sch.post.L6', 'pay.ot.L6'], action: true }),
  sig('hr.exitnote.L6', 'L6', 'people', 'buried', 'Tanner Creek exit notes that cite late schedules', '2 of 3', '', 2, 0, { sev: 0.55, urg: 0.45, links: ['sch.post.L6'] }),
  sig('hr.train.L6', 'L6', 'people', 'supporting', 'Tanner Creek training completed', '54%', 'target 90%', 54, 90, { links: ['hr.exits.L6'] }),
  sig('hr.req.L6', 'L6', 'people', 'supporting', 'Tanner Creek open roles', '3', 'open 34 days on average', 3, 1, { links: ['hr.exits.L6'] }),
  sig('hr.req.L1', 'L1', 'people', 'supporting', 'Harbor Street {desk} role', 'open 63 days', '', 63, 30, { links: ['cx.followup.L1', 'msg.desk.L1'] }),
  sig('hr.turn.co', null, 'people', 'noise', 'Turnover, all {units}, annualized', '31%', 'was 29%', 31, 29),
  sig('hr.pto', null, 'people', 'noise', 'Time off requests pending', '14', 'norm 12', 14, 12),
  sig('hr.transfer.L5', 'L5', 'people', 'emerging', 'Ashford transfer inquiries this month', '2', 'norm 0', 2, 0, { sev: 0.45, urg: 0.45, links: ['pay.ot.L5'] }),

  // -------- inbox, messages, calendar (each item carries its own signal)
  sig('note.mix', null, 'finance', 'contradictory', 'Dev reads the {materials} increase as mix', 'assumption', '', 0, 0, { sev: 0.3, urg: 0.3, links: ['ap.mix', 'fin.mat.all'], ts: 'Mon 6:52 AM' }),
  sig('msg.hire.L4', 'L4', 'labor', 'contradictory', 'Derek asks for two more hires at Riverside', 'request', '', 0, 0, { sev: 0.5, urg: 0.6, links: ['lab.util.L4', 'fin.labor.L4'], ts: 'Sun 9:14 PM', action: true }),
  sig('eml.angry.L3', 'L3', 'customer', 'falseAlarm', 'Kingsley complaint copied to the CEO', '1 complaint', 'refunded Friday', 1, 1, { sev: 0.2, urg: 0.15, links: ['cx.complaints.L3', 'cx.sat.L3'], ts: 'Fri 4:40 PM' }),
  sig('mkt.promo.L1', 'L1', 'customer', 'supporting', 'Harbor Street intro offer results', '212 new {customers}', 'a record', 212, 118, { sev: 0.3, urg: 0.3, links: ['cx.new.L1', 'fin.ticket.L1', 'cx.repeat.L1'], ts: 'Fri 3:02 PM' }),
  sig('eml.bank', null, 'finance', 'explainer', 'Annual insurance premium paid Thursday', '$201k', 'on schedule', 201, 201, { sev: 0.05, urg: 0.05, links: ['fin.cash'], ts: 'Thu 11:00 AM' }),
  sig('eml.quote.L2', 'L2', 'maintenance', 'buried', 'Replacement quote for the Old Mill {equipment}', '$38,400', 'unanswered 19 days, three week lead time', 19, 0, { sev: 0.7, urg: 0.85, impact: 0.7, links: ['mnt.wo.L2', 'mnt.down.L2'], ts: '19 days ago', action: true }),
  sig('eml.price', null, 'purchasing', 'buried', '{supplier} sent an updated price list', 'six weeks ago', '', 1, 0, { sev: 0.5, urg: 0.4, impact: 0.55, links: ['ap.var', 'ap.lock'], ts: 'six weeks ago' }),
  sig('eml.it', null, 'general', 'noise', 'Password policy change', 'Friday', '', 0, 0),
  sig('eml.party', null, 'general', 'noise', 'Holiday party venue vote', 'due Wednesday', '', 0, 0),
  sig('msg.record.L5', 'L5', 'operations', 'contradictory', 'Noor reports a record week at Ashford', 'record week', '', 0, 0, { sev: 0.35, urg: 0.4, links: ['fin.rev.L5', 'msg.overflow.L2', 'pay.ot.L5'], ts: 'Sat 6:31 PM' }),
  sig('msg.overflow.L2', 'L2', 'operations', 'supporting', 'Marcus is sending Old Mill work to Ashford', 'ongoing', '', 0, 0, { sev: 0.55, urg: 0.6, links: ['fin.rev.L5', 'fin.rev.L2', 'mnt.down.L2'], ts: 'Fri 2:12 PM' }),
  sig('msg.sat.L6', 'L6', 'people', 'emerging', 'Eli is covering shifts himself at Tanner Creek', 'this Saturday', '', 0, 0, { sev: 0.45, urg: 0.45, links: ['hr.exits.L6', 'sch.post.L6'], ts: 'Fri 7:48 PM' }),
  sig('msg.desk.L1', 'L1', 'people', 'supporting', 'Harbor Street desk short since Dana left', 'nine weeks', '', 9, 0, { sev: 0.45, urg: 0.4, links: ['cx.followup.L1', 'hr.req.L1'], ts: 'Fri 5:05 PM' }),
  sig('msg.closure.L3', 'L3', 'operations', 'explainer', 'Kingsley was closed Tuesday for water main work', 'one day', '', 0, 0, { sev: 0.05, urg: 0.05, links: ['fin.rev.L3', 'ops.days.L3'], ts: 'Sat 9:20 AM' }),
  sig('cal.meeting', null, 'general', 'noise', 'Leadership meeting', '10:00 AM today', '', 0, 0),
  sig('cal.closure.L3', 'L3', 'operations', 'explainer', 'Kingsley closed, water main work', 'last Tuesday', '', 0, 0, { sev: 0.05, urg: 0.05, links: ['fin.rev.L3', 'ops.days.L3'] }),
  sig('cal.contract', null, 'purchasing', 'supporting', '{supplier} contract review', 'in two weeks', '', 0, 0, { sev: 0.3, urg: 0.3, links: ['ap.lock', 'ap.var'] }),
  sig('cal.board', null, 'general', 'noise', 'Thursday review', 'Thursday 2:00 PM', '', 0, 0),
  sig('cal.lunch', null, 'general', 'noise', 'Vendor lunch, uniforms', 'Wednesday noon', '', 0, 0),
  sig('note.role', null, 'general', 'noise', 'Note about Thursday', '', '', 0, 0),

  // -------- arrives during the morning
  sig('mnt.today.L2', 'L2', 'maintenance', 'emerging', 'Old Mill {equipment} is down again this morning', 'today', '', 1, 0, { sev: 0.7, urg: 0.85, links: ['mnt.wo.L2', 'eml.quote.L2'], ts: 'Mon 8:25 AM' }),
  sig('msg.agenda', null, 'general', 'noise', 'Dev is building the agenda', '', '', 0, 0, { ts: 'Mon 9:05 AM' }),
  sig('ping.social', 'L1', 'customer', 'noise', 'Colin wants to post Harbor Street\'s numbers', 'request', '', 0, 0, { ts: 'Mon 8:12 AM' }),
  sig('ping.lunch', null, 'general', 'noise', 'Uniform vendor lunch Wednesday', 'invite', '', 0, 0, { ts: 'Mon 8:41 AM' }),
  sig('ping.pto', null, 'people', 'noise', 'Three time-off requests to approve', 'request', '', 0, 0, { ts: 'Mon 9:18 AM' }),
  sig('ping.tom', 'L3', 'operations', 'noise', 'Tom plans to visit Kingsley this afternoon', 'plan', '', 0, 0, { ts: 'Mon 9:36 AM' }),

];

// ---------------------------------------------------------------- sources
// cost is minutes of the morning. volume is how many underlying records the source summarizes.
export const SOURCES = [
  // inbox
  { id: 'eml_flash', kind: 'email', from: 'dev', when: '6:52 AM', title: 'Flash numbers are in', cost: 4, cat: 'finance', volume: 1, signals: ['note.mix'],
    body: ['Flash is in the reports folder.', 'Headlines: Riverside labor is over again, fifth week running. Ashford had a huge week. Kingsley was soft. {Materials} cost is up again, looks like mix to me.', 'I have Riverside labor on the agenda for ten.'] },
  { id: 'eml_hire', kind: 'email', from: 'derek', when: 'Sun 9:14 PM', title: 'Need two more people at Riverside', cost: 4, cat: 'labor', volume: 1, signals: ['msg.hire.L4'],
    body: ['I know labor looks high on paper. The reality on the floor is we are drowning every afternoon and I am paying overtime to get through it.', 'I need approval for two more {frontlines}. I have candidates ready. Can we get this done this week?'] },
  { id: 'eml_angry', kind: 'email', from: 'aiko', when: 'Fri 4:40 PM', title: 'Fwd: Worst experience I have ever had', cost: 4, cat: 'customer', volume: 1, signals: ['eml.angry.L3'], flag: 'Copied to the CEO',
    body: ['Forwarding so you have it. This {customer} copied Helen and posted online.', '"I waited, I was ignored, and nobody apologized. I have been coming to Kingsley for six years and I am done."', 'We refunded the full amount Friday and I called personally. They were calmer by the end. Flagging because Helen asked about it.'] },
  { id: 'eml_promo', kind: 'email', from: 'colin', when: 'Fri 3:02 PM', title: 'Intro offer is crushing it at Harbor Street', cost: 4, cat: 'customer', volume: 1, signals: ['mkt.promo.L1'],
    body: ['212 new {customers} at Harbor Street in four weeks. That is a record for any {unit} we have.', 'Revenue there is up 6% and Grace is thrilled. I would like to roll this out to the other five. Can I get ten minutes this week?'] },
  { id: 'eml_hr', kind: 'email', from: 'renee', when: 'Fri 5:30 PM', title: 'People changes this week', cost: 4, cat: 'people', volume: 1, signals: ['hr.exits.L6'],
    body: ['Short list this week. Full detail is in the People report.', 'One more resignation at Tanner Creek. That makes three there in five weeks, all people we hired this quarter. I have asked Eli for exit notes.'] },
  { id: 'eml_bank', kind: 'email', from: 'dev', when: 'Thu 11:00 AM', title: 'Insurance premium went out', cost: 3, cat: 'finance', volume: 1, signals: ['eml.bank'],
    body: ['FYI, the annual insurance premium of $201k was paid today as scheduled. Cash will look light on Monday\'s flash. Nothing unusual.'] },
  { id: 'eml_it', kind: 'email', from: 'it', when: 'Thu 9:15 AM', title: 'Password policy changes Friday', cost: 2, cat: 'general', volume: 1, signals: ['eml.it'],
    body: ['Starting Friday, passwords must be 14 characters and will expire every 180 days. You will be prompted at your next sign in.'] },
  { id: 'eml_party', kind: 'email', from: 'renee', when: 'Wed 2:20 PM', title: 'Holiday party: vote on a venue', cost: 2, cat: 'general', volume: 1, signals: ['eml.party'],
    body: ['Three options this year. Please vote by Wednesday so we can book.'] },
  { id: 'eml_quote', kind: 'email', from: 'vendor', when: '19 days ago', title: 'Quote: replacement {equipment}, Old Mill', cost: 5, cat: 'maintenance', volume: 1, signals: ['eml.quote.L2'],
    body: ['As discussed with Marcus, the {equipment} at Old Mill is past its rated life and the faults we keep repairing will keep coming back.', 'Replacement installed: $38,400. Lead time is three weeks from approval. This quote is good for 30 days.', 'Let me know how you would like to proceed.'] },
  { id: 'eml_price', kind: 'email', from: 'calder', when: 'Six weeks ago', title: 'Updated price list attached', cost: 5, cat: 'purchasing', volume: 1, signals: ['eml.price'],
    body: ['Please find our updated price list attached, effective immediately across all delivery points.', 'We appreciate your continued business.'] },

  // messages
  { id: 'msg_noor', kind: 'message', from: 'noor', when: 'Sat 6:31 PM', title: 'Noor Haddad', cost: 3, cat: 'operations', volume: 1, signals: ['msg.record.L5'],
    body: ['Record week at Ashford!! Biggest since we opened.', 'Team is wiped but proud. Just wanted you to hear it from me first.'] },
  { id: 'msg_marcus', kind: 'message', from: 'marcus', when: 'Fri 2:12 PM', title: 'Marcus Bell', cost: 3, cat: 'operations', volume: 1, signals: ['msg.overflow.L2'],
    body: ['{Equipment} is down again. Sent this afternoon\'s work over to Noor at Ashford.', 'Tech says it will be back up Monday.'] },
  { id: 'msg_eli', kind: 'message', from: 'eli', when: 'Fri 7:48 PM', title: 'Eli Brooks', cost: 3, cat: 'people', volume: 1, signals: ['msg.sat.L6'],
    body: ['Schedule is tight again. I am covering Saturday myself.', 'Will get next week posted as soon as I can.'] },
  { id: 'msg_grace', kind: 'message', from: 'grace', when: 'Fri 5:05 PM', title: 'Grace Lindqvist', cost: 3, cat: 'people', volume: 1, signals: ['msg.desk.L1'],
    body: ['Another full week here. The offer is really working.', 'Desk is still short since Dana left but we are managing. Any news on the replacement?'] },
  { id: 'msg_aiko', kind: 'message', from: 'aiko', when: 'Sat 9:20 AM', title: 'Aiko Tanaka', cost: 3, cat: 'operations', volume: 1, signals: ['msg.closure.L3'],
    body: ['Back to normal after Tuesday\'s closure. Water main work is finished on our street.', 'Numbers will look light for the week. Per day we were fine.'] },

  // reports
  { id: 'rep_fin', kind: 'report', from: 'dev', when: 'Mon 6:10 AM', title: 'Weekly flash', sub: 'Revenue, labor, {materials}, cash', cost: 16, cat: 'finance', volume: 318,
    intro: 'Last week against the eight week average.',
    sections: [
      { title: 'Revenue', lines: ['fin.rev.L1', 'fin.rev.L2', 'fin.rev.L3', 'fin.rev.L4', 'fin.rev.L5', 'fin.rev.L6'] },
      { title: 'Labor', lines: ['fin.labor.L1', 'fin.labor.L2', 'fin.labor.L3', 'fin.labor.L4', 'fin.labor.L5', 'fin.labor.L6'] },
      { title: '{Materials} and other costs', lines: ['fin.mat.all', 'fin.ticket.L1', 'fin.util.all', 'fin.uniform'] },
      { title: 'Cash', lines: ['fin.cash'] },
    ] },
  { id: 'rep_labor', kind: 'report', from: 'marisol', when: 'Mon 6:10 AM', title: 'Labor and scheduling', sub: 'Hours, overtime, how the time was used', cost: 16, cat: 'labor', volume: 1486,
    intro: 'Last week against the eight week norm.',
    sections: [
      { title: 'Overtime', lines: ['pay.ot.L1', 'pay.ot.L2', 'pay.ot.L3', 'pay.ot.L4', 'pay.ot.L5', 'pay.ot.L6'] },
      { title: 'How paid hours were used', lines: ['lab.util.co', 'lab.util.L2', 'lab.util.L4', 'lab.util.L5'] },
      { title: 'Schedule changes and posting', lines: ['sch.swap.co', 'sch.template.L4', 'sch.post.L6'] },
    ] },
  { id: 'rep_ops', kind: 'report', from: 'marisol', when: 'Mon 6:10 AM', title: 'Throughput and wait', sub: 'How much got done and how long people waited', cost: 15, cat: 'operations', volume: 2164,
    intro: 'Last week against each {unit}\'s twelve week norm.',
    sections: [
      { title: 'Throughput', lines: ['ops.thru.L1', 'ops.thru.L2', 'ops.thru.L3', 'ops.thru.L4', 'ops.thru.L5', 'ops.thru.L6'] },
      { title: 'Waiting', lines: ['ops.wait.L1', 'ops.wait.L4', 'ops.wait.L5', 'ops.wait.L6'] },
      { title: 'When the work arrives', lines: ['ops.demand.L4', 'ops.days.L3', 'ops.noshow.co'] },
    ] },
  { id: 'rep_cx', kind: 'report', from: 'colin', when: 'Mon 6:10 AM', title: '{Customers}', sub: 'Satisfaction, who comes back, what they say', cost: 15, cat: 'customer', volume: 412,
    intro: 'Last 30 days against the prior 90.',
    sections: [
      { title: 'Satisfaction', lines: ['cx.sat.L1', 'cx.sat.L3', 'cx.sat.L4', 'cx.sat.L5'] },
      { title: 'Who comes back', lines: ['cx.repeat.co', 'cx.repeat.L1', 'cx.repeat.L4', 'cx.new.L1'] },
      { title: 'Follow-up', lines: ['cx.followup.co', 'cx.followup.L1'] },
      { title: 'What they say', lines: ['cx.reviews.L4', 'cx.complaints.L3', 'cx.social'] },
    ] },
  { id: 'rep_mnt', kind: 'report', from: 'tom', when: 'Mon 6:10 AM', title: 'Maintenance log', sub: 'Repair orders and downtime', cost: 12, cat: 'maintenance', volume: 37,
    intro: 'Open and recently closed items.',
    sections: [
      { title: 'Equipment', lines: ['mnt.pm.co', 'mnt.wo.L2', 'mnt.down.L2', 'mnt.age.L2'] },
      { title: 'Buildings', lines: ['mnt.hvac.L3', 'mnt.lot.L1', 'mnt.door.L5'] },
    ] },
  { id: 'rep_ap', kind: 'report', from: 'dev', when: 'Mon 6:10 AM', title: 'Purchasing and invoices', sub: 'What was bought and what it cost', cost: 13, cat: 'purchasing', volume: 284,
    intro: 'Six weeks of invoices against contract terms.',
    sections: [
      { title: 'Volume', lines: ['ap.vol', 'ap.freight'] },
      { title: 'Price against contract', lines: ['ap.other', 'ap.var', 'ap.total', 'ap.lock', 'ap.mix'] },
    ] },
  { id: 'rep_hr', kind: 'report', from: 'renee', when: 'Mon 6:10 AM', title: 'People', sub: 'Hires, exits, open roles, training', cost: 13, cat: 'people', volume: 61,
    intro: 'Changes in the last five weeks.',
    sections: [
      { title: 'Company', lines: ['hr.turn.co', 'hr.pto'] },
      { title: 'Exits and open roles', lines: ['hr.exits.L6', 'hr.exitnote.L6', 'hr.req.L6', 'hr.req.L1', 'hr.transfer.L5'] },
      { title: 'Training', lines: ['hr.train.L6'] },
    ] },

  // calendar
  { id: 'cal', kind: 'calendar', from: null, when: '', title: 'Calendar', cost: 3, cat: 'general', volume: 9,
    intro: 'Last week, this week, and what is coming.',
    sections: [
      { title: 'Today', lines: ['cal.meeting'] },
      { title: 'Last week', lines: ['cal.closure.L3'] },
      { title: 'Coming up', lines: ['cal.lunch', 'cal.board', 'cal.contract'] },
    ] },

  // the note on the desk (text comes from the role)
  { id: 'note_role', kind: 'note', from: 'boss', when: 'Left on your desk', title: 'Note', cost: 1, cat: 'general', volume: 1, signals: ['note.role'], body: [] },

  // arrive during the morning (Event Engine makes them available)
  { id: 'msg_marcus2', kind: 'message', from: 'marcus', when: '8:25 AM', title: 'Marcus Bell', cost: 3, cat: 'maintenance', volume: 1, signals: ['mnt.today.L2'], arrives: true,
    body: ['{Equipment} is down again this morning. Third time in six weeks.', 'Sending today\'s overflow to Ashford. I would really like an answer on that replacement quote.'] },
  { id: 'msg_dev', kind: 'message', from: 'dev', when: '9:05 AM', title: 'Dev Anand', cost: 2, cat: 'general', volume: 1, signals: ['msg.agenda'], arrives: true,
    body: ['Building the agenda for ten. I have Riverside labor and the Kingsley complaint on it.', 'Bring whatever else you think matters.'] },
  { id: 'msg_marisol', kind: 'message', from: 'marisol', when: '', title: 'Marisol Vega', cost: 4, cat: 'labor', volume: 1, signals: ['lab.util.L4', 'sch.template.L4'], arrives: true,
    body: ['Saw you were in the Riverside labor numbers. Two things from the labor report in case they help.', 'Productive share of paid hours there is 58%. It was 71%.', 'And Riverside changed its schedule template five weeks ago. {Lead} coverage moved to the morning block.'] },
  { id: 'msg_colin', kind: 'message', from: 'colin', when: '', title: 'Colin Hart', cost: 3, cat: 'customer', volume: 1, signals: ['cx.followup.L1'], arrives: true,
    body: ['Since you are in the customer numbers: one thing I can\'t explain.', 'Harbor Street completed 31% of its {followup} last month. It is usually 88%.'] },
  { id: 'msg_colin_social', kind: 'message', from: 'colin', when: '', title: 'Colin Hart', cost: 0, cat: 'general', volume: 1, signals: ['ping.social'], arrives: true,
    body: ['Can I post the Harbor Street numbers on LinkedIn? Huge month!'] },
  { id: 'eml_lunch', kind: 'email', from: 'renee', when: '', title: 'Uniform vendor lunch Wednesday', cost: 0, cat: 'general', volume: 1, signals: ['ping.lunch'], arrives: true,
    body: ['Confirming lunch with the uniform vendor Wednesday at noon. Let me know if you want to join.'] },
  { id: 'msg_renee_pto', kind: 'message', from: 'renee', when: '', title: 'Renee Whitlock', cost: 0, cat: 'general', volume: 1, signals: ['ping.pto'], arrives: true,
    body: ['Approving three time-off requests for next week unless you object.'] },
  { id: 'msg_tom', kind: 'message', from: 'tom', when: '', title: 'Tom Okafor', cost: 0, cat: 'general', volume: 1, signals: ['ping.tom'], arrives: true,
    body: ['Heading out to Kingsley this afternoon unless you need me somewhere else.'] },
  { id: 'eml_quote2', kind: 'email', from: 'vendor', when: '', title: 'Following up: Old Mill quote expires in 11 days', cost: 3, cat: 'maintenance', volume: 1, signals: ['eml.quote.L2'], arrives: true,
    body: ['Following up on the replacement quote I sent 19 days ago for the {equipment} at Old Mill.', '$38,400 installed, three weeks from approval. The quote expires in 11 days.'] },
];

// ---------------------------------------------------------------- events
// when.at: minutes after midnight. when.seenAny / seenCount: fires after the user has seen
// those signals, then waits `delay` minutes. Effects only ever reveal what already exists.
export const EVENTS = [
  { id: 'ev.marcus2', when: { at: 8 * 60 + 25 }, add: 'msg_marcus2', toast: 'Marcus Bell sent a message' },
  { id: 'ev.social', when: { at: 8 * 60 + 12 }, add: 'msg_colin_social', toast: 'Colin Hart sent a message' },
  { id: 'ev.lunch', when: { at: 8 * 60 + 41 }, add: 'eml_lunch', toast: 'New email from Renee Whitlock' },
  { id: 'ev.pto', when: { at: 9 * 60 + 18 }, add: 'msg_renee_pto', toast: 'Renee Whitlock sent a message' },
  { id: 'ev.tom', when: { at: 9 * 60 + 36 }, add: 'msg_tom', toast: 'Tom Okafor sent a message' },
  { id: 'ev.agenda', when: { at: 9 * 60 + 5 }, add: 'msg_dev', toast: 'Dev Anand sent a message' },
  { id: 'ev.util', when: { seenOf: ['fin.labor.L4', 'pay.ot.L4', 'msg.hire.L4'], count: 2, delay: 6 }, add: 'msg_marisol', toast: 'Marisol Vega sent a message' },
  { id: 'ev.cx', when: { seenOf: ['cx.sat.L1', 'cx.repeat.co', 'cx.repeat.L1', 'cx.new.L1', 'mkt.promo.L1'], count: 2, delay: 8 }, add: 'msg_colin', toast: 'Colin Hart sent a message' },
  { id: 'ev.quote', when: { seenOf: ['mnt.wo.L2', 'mnt.down.L2', 'msg.overflow.L2', 'mnt.today.L2'], count: 1, delay: 10 }, add: 'eml_quote2', toast: 'New email from Hale Equipment' },
];

// ---------------------------------------------------------------- Wake findings
// Predetermined. Each one must be supported by its evidence in the same signal set the
// user had. The Intelligence Engine verifies that before it will surface a finding.
export const FINDINGS = [
  { id: 'F1', loc: 'L4', urgency: 0.9, impact: 0.85,
    title: 'Riverside has a scheduling problem that looks like a labor problem.',
    short: 'the hours are in the wrong half of the day',
    finding: 'Riverside is paying for more hours and getting less done with them. Labor is 34.1% of revenue, up 4.1 points in five weeks, on flat volume.',
    connection: 'Five weeks ago the schedule template moved {lead} coverage to the morning. Over the same period the work moved to the afternoon, and 58% of {visits} now arrive after 1 PM. Payroll, scheduling, throughput, waiting, reviews, and return visits all bend in the same week.',
    interpretation: 'The hours are in the wrong half of the day. Mornings are overstaffed and idle. Afternoons run long and spill into overtime. {Customers} feel it first: the {waitLabel} has doubled and seven points fewer of them are coming back. Cutting hours would deepen the afternoon shortage. Two more hires would add cost to a schedule that already has enough people in it.',
    action: 'Move {lead} coverage back to match the afternoon peak this week. Hold the hire request. Recheck the wait and overtime in ten days.',
    core: ['fin.labor.L4', 'lab.util.L4', 'sch.template.L4', 'ops.wait.L4'],
    evidence: ['fin.labor.L4', 'fin.rev.L4', 'pay.ot.L4', 'lab.util.L4', 'sch.template.L4', 'ops.demand.L4', 'ops.thru.L4', 'ops.wait.L4', 'cx.sat.L4', 'cx.reviews.L4', 'cx.repeat.L4', 'msg.hire.L4'],
    rootConcepts: ['scheduling', 'inefficiency', 'capacity'],
    whyFirst: 'Labor cost is the last thing to move here. The schedule moved first, and reducing hours would make the afternoons worse.' },
  { id: 'F2', loc: 'L2', urgency: 0.85, impact: 0.75,
    title: 'Old Mill\'s {equipment} is failing, and Ashford\'s record week is the evidence.',
    short: 'one failing unit is costing two {units}',
    finding: 'The {equipment} at Old Mill has been repaired three times in six weeks and was down 19 hours in the last two. Each repair was closed as fixed.',
    connection: 'Old Mill\'s revenue is down 5.8%. Ashford\'s is up 9.4%. Those are largely the same {visits}. Marcus has been sending work across town, and Ashford has covered it with 54 hours of overtime.',
    interpretation: 'One failing unit is quietly costing two {units}. Old Mill loses capacity. Ashford\'s best week on paper is a team running past its limit: the wait there is up and two people have asked about transfers. The replacement quote has sat unanswered for 19 days and carries a three week lead time.',
    action: 'Approve the $38,400 replacement today. Until it arrives, route Old Mill\'s overflow on a plan and cap Ashford\'s overtime.',
    core: ['mnt.wo.L2', 'mnt.down.L2', 'eml.quote.L2', 'fin.rev.L5'],
    evidence: ['mnt.wo.L2', 'mnt.down.L2', 'mnt.age.L2', 'eml.quote.L2', 'fin.rev.L2', 'lab.util.L2', 'ops.thru.L2', 'msg.overflow.L2', 'fin.rev.L5', 'msg.record.L5', 'pay.ot.L5', 'lab.util.L5', 'ops.wait.L5', 'hr.transfer.L5'],
    rootConcepts: ['equipment', 'capacity'],
    whyFirst: 'Every week without a decision adds another week to a three week lead time, and Ashford is paying for it in overtime.' },
  { id: 'F4', loc: null, urgency: 0.6, impact: 0.7,
    title: '{supplier} has been billing above contract for six weeks.',
    short: 'a billing variance spread thin across all six {units}',
    finding: '{Materials} cost is up 1.2 points across the company. It has been explained as mix.',
    connection: 'Mix accounts for 0.2 of the 1.2 points. Invoice prices on the top 40 items rose 6.8% the same week {supplier} sent an updated price list. The contract locks rates through March 31.',
    interpretation: 'This is a billing variance, spread thinly enough across six {units} that no single manager would notice it. $11,900 has been paid above contract so far. At this rate it is about $103,000 a year.',
    action: 'Dispute the invoices back to the effective date and recover the overage. Hold {supplier} to the contract price list.',
    core: ['fin.mat.all', 'ap.var', 'ap.lock'],
    evidence: ['fin.mat.all', 'note.mix', 'ap.var', 'ap.total', 'ap.lock', 'ap.mix', 'eml.price', 'cal.contract'],
    rootConcepts: ['supplier', 'financial'],
    whyFirst: 'The cost increase is recoverable under the contract. Raising prices or trimming usage leaves the overbilling in place.' },
  { id: 'F3', loc: 'L1', urgency: 0.55, impact: 0.8,
    title: 'Harbor Street is growing and losing its regulars at the same time.',
    short: 'new {customers} from the offer are covering for regulars who stopped coming back',
    finding: 'Harbor Street\'s revenue is up 6.1% and satisfaction is steady at 4.7. Underneath, returning {customers} have fallen from 61% to 52% in eight weeks.',
    connection: 'The intro offer brought in 212 new {customers}, enough to cover for the regulars who stopped coming back. Completion of {followup} fell from 88% to 31% when the {desk} left nine weeks ago. That role has been open 63 days.',
    interpretation: 'The headline number is being held up by discounted first visits, and revenue per {visit} is down 5.2%. When the offer ends, the gap in returning {customers} shows up all at once, in the {unit} everyone assumes is fine.',
    action: 'Restart {followup} this week with cover from the central office. Fill the {desk} role. Judge the offer on second visits before extending it.',
    core: ['cx.repeat.L1', 'cx.followup.L1', 'mkt.promo.L1'],
    evidence: ['fin.rev.L1', 'mkt.promo.L1', 'cx.new.L1', 'cx.repeat.L1', 'fin.ticket.L1', 'cx.followup.L1', 'msg.desk.L1', 'hr.req.L1', 'cx.sat.L1'],
    rootConcepts: ['customer', 'staffing'],
    whyFirst: 'The offer is working as an offer. The regulars are the revenue, and they are the ones leaving.' },
  { id: 'F5', loc: 'L6', urgency: 0.5, impact: 0.5,
    title: 'Tanner Creek is losing new hires because of when the schedule goes out.',
    short: 'late schedules are driving the exits, and each exit makes the schedule later',
    finding: 'Three people have resigned from Tanner Creek in five weeks. All three were within 90 days of hire.',
    connection: 'Schedules there are posted 1.6 days ahead. The company standard is 7. Two of the three exit notes cite it. Eli is covering shifts himself, overtime has more than doubled, and training completion is at 54%.',
    interpretation: 'This is early, and it compounds. Each exit makes the schedule harder to build, which makes it later, which drives the next exit. Pay and hiring speed are not what is holding Tanner Creek back.',
    action: 'Require schedules a week ahead at Tanner Creek and give Eli help for two weeks to get there. Then revisit the three open roles.',
    core: ['hr.exits.L6', 'sch.post.L6', 'hr.exitnote.L6'],
    evidence: ['hr.exits.L6', 'hr.exitnote.L6', 'sch.post.L6', 'msg.sat.L6', 'pay.ot.L6', 'fin.labor.L6', 'hr.train.L6', 'hr.req.L6'],
    rootConcepts: ['scheduling', 'staffing', 'management'],
    whyFirst: 'The exits trace to schedule notice. More pay or more requisitions feed the same loop.' },
];

// ---------------------------------------------------------------- freeform concept map
// Freeform text is mapped onto these predetermined concepts. It never drives the simulation.
export const CONCEPTS = {
  labor: ['labor', 'payroll', 'wage', 'overtime', 'hours', 'headcount', 'overstaff'],
  staffing: ['staff', 'hire', 'hiring', 'short', 'understaff', 'turnover', 'people', 'quit', 'resign'],
  scheduling: ['schedul', 'shift', 'coverage', 'afternoon', 'morning', 'template', 'roster', 'rota'],
  demand: ['demand', 'volume', 'traffic', 'busy', 'slow', 'bookings'],
  capacity: ['capacity', 'throughput', 'bottleneck', 'backlog', 'overflow', 'utiliz'],
  customer: ['customer', 'client', 'patient', 'guest', 'member', 'wait', 'review', 'satisf', 'retention', 'repeat', 'returning', 'complain', 'experience', 'service'],
  financial: ['cost', 'margin', 'revenue', 'cash', 'budget', 'price', 'profit', 'expense', 'money'],
  inefficiency: ['efficien', 'productiv', 'idle', 'waste', 'process', 'wrong time', 'misalign'],
  management: ['manager', 'management', 'leadership', 'derek', 'training', 'accountab', 'new manager'],
  equipment: ['equipment', 'machine', 'broken', 'repair', 'maintenance', 'downtime', 'replace'],
  supplier: ['supplier', 'vendor', 'invoice', 'contract', 'calder', 'overbill', 'purchas'],
};

export const DAY = { start: 7 * 60 + 48, callAt: 9 * 60 + 25, meetingAt: 10 * 60, lastStart: 9 * 60 + 50 };
