// SCENARIO GENERATOR
// Every game is a different company. One seed decides the number of locations, their names,
// the people, the date, every figure in every report, and which locations the problems land
// in. Everything downstream (reports, inbox, phone, calendar, Wake's briefing, the meeting,
// the week) is computed from that one scenario, so the data always agrees with itself.
// Tokens in {braces} are shell vocabulary, resolved later by the configuration engine.

// ---------------------------------------------------------------- seeded randomness
export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  const next = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const R = {
    next,
    u: (lo, hi) => lo + (hi - lo) * next(),
    i: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle: (arr) => { const o = arr.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; },
  };
  return R;
}
const hash = (s) => { let x = 2166136261; for (const ch of String(s)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };

// ---------------------------------------------------------------- pools
const FIRST = ['Grace', 'Marcus', 'Aiko', 'Derek', 'Noor', 'Eli', 'Priya', 'Mateo', 'Hannah', 'Kwame', 'Lena', 'Omar', 'Sofia', 'Jamal', 'Ingrid', 'Ravi', 'Tessa', 'Diego', 'Mei', 'Caleb', 'Amara', 'Felix', 'Rosa', 'Andre', 'Yuki', 'Nadia', 'Owen', 'Leila', 'Tomas', 'Zoe', 'Malik', 'Clara', 'Hugo', 'Imani', 'Rafael', 'Selin', 'Victor', 'June', 'Desmond', 'Farah', 'Gideon', 'Ines', 'Kofi', 'Lucia', 'Mason', 'Nia', 'Pavel', 'Quinn', 'Rhea', 'Sami', 'Theo', 'Uma', 'Wes', 'Yara', 'Bianca', 'Callum', 'Dalia', 'Emeka', 'Freya', 'Hiro', 'Jonah', 'Keira', 'Luis', 'Maya', 'Nikhil', 'Odette', 'Paolo', 'Rania', 'Soren', 'Talia', 'Vikram', 'Willa'];
const LAST = ['Bell', 'Tanaka', 'Shaw', 'Haddad', 'Brooks', 'Lindqvist', 'Okafor', 'Castillo', 'Vega', 'Whitlock', 'Hart', 'Anand', 'Patel', 'Moreno', 'Nguyen', 'Kowalski', 'Mensah', 'Fischer', 'Reyes', 'Sato', 'Adeyemi', 'Larsen', 'Romero', 'Chen', 'Duarte', 'Novak', 'Abbott', 'Ibrahim', 'Park', 'Quinlan', 'Ortiz', 'Byrne', 'Kaur', 'Dubois', 'Ferreira', 'Holm', 'Okoye', 'Silva', 'Varga', 'Mercer', 'Achebe', 'Lund', 'Marsh', 'Rossi', 'Takahashi', 'Wolfe', 'Yilmaz', 'Zhou', 'Calloway', 'Dimitrov', 'Esposito', 'Gallagher', 'Hollis', 'Iversen', 'Jaramillo', 'Kemp'];
const LEAVERS = ['Dana', 'Chris', 'Robin', 'Jesse', 'Morgan', 'Casey', 'Avery', 'Jordan', 'Riley', 'Sam'];
const PLACES = ['Harbor Street', 'Old Mill', 'Kingsley', 'Riverside', 'Ashford', 'Tanner Creek', 'Westgate', 'Cedar Park', 'Elm Row', 'Northpoint', 'Lakeview', 'Bridgeport', 'Maple Hill', 'Union Square', 'Foxhall', 'Briar Glen', 'Stonebridge', 'Market Street', 'Pine Ridge', 'Southgate', 'Canal Street', 'Hollis Park', 'Copper Hill', 'Fairmont', 'Mill Valley', 'Eastbrook'];
const SKIN = ['#F2D3BC', '#EDC9A8', '#E8BE9F', '#D6A27C', '#CFA07A', '#C99270', '#B98562', '#A8704E', '#8C5A3E', '#7A4E36', '#EBC4A6', '#DDB89A'];
const HAIR = ['#1E1A19', '#16110F', '#3A241B', '#2A1B16', '#A8552E', '#B08A4E', '#D9C28A', '#5A3A28', '#231814', '#6B6B6B', '#8A8A8A', '#14110F'];
const STYLES = ['short', 'fade', 'curly', 'bun', 'bob', 'long', 'wrap', 'bald', 'short', 'long'];
const SHIRT = ['#2F5D62', '#3D4F7A', '#8A4B5E', '#557A52', '#6A5A8C', '#B8733A', '#5A6B3F', '#7A3F4C', '#4A6E8C', '#8A6A2F', '#555F66', '#444C5E', '#30424A', '#6E3B5A'];
const CLOSURE = [['water main work on the street', 'water main work'], ['a power outage', 'power outage'], ['a burst pipe', 'burst pipe'], ['road resurfacing out front', 'road closure']];
const PERSONALITY = ['Direct. Asks for resources early.', 'Quiet. Rarely escalates anything.', 'Protective of the team.', 'Numbers person. Lives in the dashboards.', 'Hands-on. Usually on the floor, not at a desk.', 'Steady. Hits the plan most months.', 'Long-tenured. Knows the regulars by name.', 'Optimist. Every week is a good week.', 'Promoted from the floor two years ago.', 'Detail-oriented. Sends long emails.'];
const BOSS = { gm: ['Helen', 'the owner'], coo: ['Helen', 'CEO'], owner: ['Paul', 'your accountant'], partner: ['Arjun', 'the group CFO'], regional: ['Helen', 'COO'] };
const BOSS_NAMES = ['Helen', 'Paul', 'Arjun', 'Miriam', 'Graham', 'Ruth', 'Stefan', 'Joanne', 'Martin', 'Celeste'];

// Numbers and nouns that belong to an operating model, not to the vocabulary.
export const SHELL_DATA = {
  service: { names: [['Northline', 'Summit', 'Keystone', 'Ridgeway', 'Cardinal', 'Ironwood', 'Lakeshore', 'Bluestem'], ['Auto Care', 'Auto Service', 'Automotive', 'Tire and Auto']], rev: [95, 190], ticket: 385, days: 6, quote: [32, 44], equipCo: ['Hale Equipment', 'Apex Garage Systems', 'Rotary Lift Service'], supCo: ['Calder', 'Pinnacle', 'Midstate', 'Harlow', 'Crestline'], supSuffix: 'Parts Supply', system: 'Shop management',
    items: [['Brake pads, ceramic, front', 48.6], ['Synthetic oil 5W-30, case', 41.2], ['Oil filter, standard', 4.85], ['Rotor, front, pair', 96.4], ['Wiper blades, pair', 18.9], ['Cabin air filter', 11.7]], peak: ['afternoon', 'afternoons', 'morning', 'mornings', 'after 1 PM'] },
  clinical: { names: [['Meridian', 'Harborview', 'Clearwater', 'Brookside', 'Evergreen', 'Linden', 'Bayview'], ['Family Clinics', 'Health Partners', 'Family Medicine', 'Physical Therapy']], rev: [80, 165], ticket: 168, days: 5, quote: [58, 84], equipCo: ['Hale Medical Imaging', 'ClearScan Service', 'Northstar Imaging'], supCo: ['Calder', 'Pinnacle', 'Midstate', 'Harlow', 'Crestline'], supSuffix: 'Medical Supply', system: 'EHR + scheduling',
    items: [['Nitrile gloves, box of 100', 9.4], ['Exam table paper, case', 38.5], ['Syringes 3 mL, box', 14.2], ['Alcohol prep pads, box', 3.1], ['Gauze 4x4, sleeve', 6.8], ['Specimen cups, case', 27.9]], peak: ['afternoon', 'afternoons', 'morning', 'mornings', 'after 1 PM'] },
  consumer: { names: [['Copperline', 'Ironhouse', 'Tidewater', 'Foundry', 'Kinetic', 'Northbound', 'Elevate'], ['Studios', 'Fitness', 'Athletic Club', 'Training Co.']], rev: [42, 95], ticket: 44, days: 7, quote: [36, 52], equipCo: ['Hale Mechanical', 'AirWorks HVAC', 'Summit Climate'], supCo: ['Calder', 'Pinnacle', 'Midstate', 'Harlow', 'Crestline'], supSuffix: 'Wholesale', system: 'Booking system',
    items: [['Bottled water, case', 6.2], ['Protein bars, case', 31.5], ['Cleaning concentrate, gallon', 22.8], ['Towel service, per bin', 54.0], ['Retail tees, dozen', 61.0], ['Resistance bands, set', 17.4]], peak: ['evening', 'evenings', 'daytime', 'daytime shifts', 'after 5 PM'] },
  field: { names: [['Brightwater', 'Granite', 'Redline', 'Cornerstone', 'Tri-County', 'Allpoint'], ['Mechanical', 'Plumbing and Heating', 'Home Services', 'HVAC']], rev: [140, 290], ticket: 640, days: 5, quote: [64, 92], equipCo: ['Hale Fleet Equipment', 'Jetline Equipment', 'Prostar Truck'], supCo: ['Calder', 'Pinnacle', 'Midstate', 'Harlow', 'Crestline'], supSuffix: 'Industrial Supply', system: 'Dispatch system',
    items: [['Copper pipe 3/4 in, 10 ft', 38.2], ['PEX fittings, bag', 24.6], ['Ball valve 3/4 in', 17.9], ['Condensate pump', 64.0], ['Refrigerant R-454B, 25 lb', 212.0], ['PVC 2 in, 10 ft', 12.4]], peak: ['afternoon', 'afternoons', 'morning', 'mornings', 'booked after noon'] },
  multi: { names: [['Fieldstone', 'Juniper', 'Salt and Ember', 'Larder', 'Commonwealth', 'Hearth and Vine'], ['Kitchens', 'Hospitality', 'Eatery', 'Restaurant Group']], rev: [58, 120], ticket: 39, days: 7, quote: [18, 28], equipCo: ['Hale Kitchen Equipment', 'ProLine Foodservice Repair', 'Rational Service Partners'], supCo: ['Calder', 'Pinnacle', 'Midstate', 'Harlow', 'Crestline'], supSuffix: 'Foodservice', system: 'POS',
    items: [['Chicken breast, 40 lb case', 118.0], ['Fryer oil, 35 lb', 41.5], ['Romaine, case', 38.0], ['Mozzarella, 6 lb', 24.8], ['Flour, 50 lb', 26.5], ['To-go containers, case', 44.0]], peak: ['evening', 'evenings', 'daytime', 'daytime shifts', 'after 5 PM'] },
};

// ---------------------------------------------------------------- formatting
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const addDays = (d, n) => new Date(d.getTime() + n * 864e5);
const dShort = (d) => DAYS[d.getUTCDay()].slice(0, 3) + ', ' + MON[d.getUTCMonth()] + ' ' + d.getUTCDate();
const dNum = (d) => (d.getUTCMonth() + 1) + '/' + d.getUTCDate();
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const kmoney = (k) => '$' + k.toFixed(1) + 'k';
const pct1 = (x) => (x >= 0 ? '+' : '-') + Math.abs(x * 100).toFixed(1) + '%';
const pts = (x) => (x >= 0 ? '+' : '-') + Math.abs(x).toFixed(1) + ' pts';
const r1 = (x) => Math.round(x * 10) / 10;
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------- the generator
export function generateScenario(shell, role, seed) {
  const R = makeRng(seed);
  const SD = SHELL_DATA[shell.id];
  const [peak, peaks, offPeak, offPeaks, peakTime] = SD.peak;

  // ------------------------------------------------ size and date
  const minN = shell.id === 'multi' || role.id === 'regional' ? 3 : 1;
  const sizes = [1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7];
  let N = R.pick(sizes);
  if (N < minN) N = minN + R.i(0, 2);
  const M = N > 1;
  const monday = new Date(Date.UTC(2026, 0, 12 + 7 * R.i(0, 44)));
  const dayOf = (n) => addDays(monday, n);
  const lockMonth = (monday.getUTCMonth() + R.i(3, 6)) % 12;
  const lockYear = monday.getUTCFullYear() + (monday.getUTCMonth() + 6 > 11 && lockMonth < monday.getUTCMonth() ? 1 : 0);
  const lockDate = MONTH[lockMonth] + ' ' + new Date(Date.UTC(lockYear, lockMonth + 1, 0)).getUTCDate();

  // ------------------------------------------------ people
  const usedF = new Set(), usedL = new Set();
  const nameOf = () => {
    let f, l;
    do f = R.pick(FIRST); while (usedF.has(f)); usedF.add(f);
    do l = R.pick(LAST); while (usedL.has(l)); usedL.add(l);
    return f + ' ' + l;
  };
  const avOf = () => ({ skin: R.pick(SKIN), hair: R.pick(HAIR), style: R.pick(STYLES), shirt: R.pick(SHIRT) });
  const characters = {};
  const person = (key, title, extra = {}) => { characters[key] = { name: nameOf(), title, av: avOf(), ...extra }; return key; };

  const firstBase = R.pick(SD.names[0]);
  const company = firstBase + ' ' + R.pick(SD.names[1]);
  const supplier = R.pick(SD.supCo) + ' ' + SD.supSuffix;
  const equipCo = R.pick(SD.equipCo);
  const hq = R.pick(['Downtown', 'Midtown', 'the Northside', 'the West End', 'the Riverfront']);

  person('controller', R.pick(['Controller', 'Finance Manager', 'VP of Finance']), { since: 2026 - R.i(3, 11), owns: ['The weekly flash', 'Invoices and vendor payments', 'Budgets and lender reporting'], best: 'Anything with a dollar sign on it.' });
  person('opsdir', R.pick(['Director of Operations', 'VP of Operations', 'Operations Director']), { since: 2026 - R.i(2, 9), owns: ['Day-to-day operations at every {unit}', 'Maintenance and equipment vendors', 'Site visits'], best: 'On-site problems and equipment.' });
  person('analyst', R.pick(['Operations Analyst', 'Business Analyst', 'Data Analyst']), { since: 2026 - R.i(1, 4), owns: ['Labor and scheduling data', 'The throughput and wait report'], best: 'Digging into why a number moved.' });
  person('hr', R.pick(['People and HR', 'HR Manager', 'People Operations Lead']), { since: 2026 - R.i(2, 8), owns: ['Hiring and open roles', 'Exits and exit interviews', 'Time off and policy'], best: 'Hiring, exits and anything people-related.' });
  person('marketing', R.pick(['Marketing Manager', 'Marketing Lead', 'Growth and Marketing']), { since: 2026 - R.i(1, 6), owns: ['Promotions and offers', 'Reviews and {customer} outreach', 'The {customers} report'], best: 'Offers, reviews and bringing {customers} back.' });
  person('trainer', R.pick(['Training Manager', 'Training and Development Lead']), { since: 2026 - R.i(2, 9), owns: ['Onboarding and training', 'Coaching managers in their first year'], best: 'Getting a struggling team back on its feet.' });
  const CENTRAL = ['controller', 'opsdir', 'analyst', 'hr', 'marketing', 'trainer'];
  person('vendor', 'Account rep, ' + equipCo, { ext: true });
  person('suprep', 'Account rep, ' + supplier, { ext: true });
  characters.it = { name: 'IT Helpdesk', title: 'Systems', av: { skin: '#D9B595', hair: '#2B2B2B', style: 'curly', shirt: '#5F5F6E' }, ext: true };
  const bossName = BOSS_NAMES[hash(seed + 'boss') % BOSS_NAMES.length];
  characters.boss = { name: bossName, title: BOSS[role.id][1], av: avOf(), ext: true };
  const F = (k) => characters[k].name.split(' ')[0];

  // ------------------------------------------------ locations
  const placeNames = R.shuffle(PLACES).slice(0, N);
  let year = 2026 - R.i(12, 22);
  const locations = placeNames.map((name, i) => {
    if (i) year = Math.min(2025, year + R.i(1, 3));
    const id = 'L' + (i + 1), mk = 'm' + (i + 1);
    const staff = R.i(18, 44) + (i === 0 ? 6 : 0);
    const L = { id, name, manager: mk, opened: year, staff, tag: '', rev: R.u(SD.rev[0], SD.rev[1]) * (i === 0 && M ? 1.15 : 1) * (M ? 1 : 1.35), street: R.i(100, 4800) + ' ' + R.pick(['Main St', 'Oak Ave', 'Industrial Pkwy', 'Commerce Dr', 'Water St', 'Grand Ave', '5th St', 'Lincoln Blvd']) };
    person(mk, '{mgrTitle}' + (M ? ', ' + name : ''), { since: Math.max(year, 2026 - R.i(1, 9)), loc: id, owns: [M ? 'Everything at ' + name : 'Everything on site', staff + ' people', 'The schedule and the floor'], best: R.pick(PERSONALITY) });
    return L;
  });
  if (M) locations[0].tag = 'Flagship';
  if (N > 2 && locations[N - 1].opened >= 2022) locations[N - 1].tag = 'Newest';
  const mgr = (L) => L.manager;
  const atL = (L) => M ? ' at ' + L.name : '';
  const lab = (L, text) => L && M ? L.name + ' ' + text : cap(text);

  // ------------------------------------------------ which problems land where
  // Each problem claims metrics at its location. Core claims cannot collide. Optional
  // claims give way to higher priority problems, so every number has exactly one story.
  const CORE = { F1: ['labor', 'util', 'sched', 'wait', 'ot', 'pm'], F2: ['wo', 'down', 'age'], F2p: ['rev'], F3: ['repeat', 'fu', 'newc'], F5: ['exits', 'exitnote', 'post'], FAX: ['rev', 'labor', 'days', 'ot'], FAY: ['csat', 'complaints'] };
  const OPT = { F1: ['thru', 'csat', 'reviews', 'repeat', 'rev'], F2: ['rev', 'thru', 'util'], F2p: ['ot', 'util', 'wait', 'transfer'], F3: ['rev', 'ticket', 'deskreq', 'csat'], F5: ['ot', 'labor', 'train', 'req'] };
  let active = ['F1', 'F2', 'F3', 'F4', 'F5'];
  if (N >= 3 && R.chance(0.3)) { const drop = R.pick(['F2', 'F3', 'F5']); active = active.filter((x) => x !== drop); }
  const has = (f) => active.includes(f);
  const partnerWanted = has('F2') && M && R.chance(0.8);
  let wantX = R.chance(0.75), wantY = R.chance(0.75);
  let wantCash = R.chance(0.85);

  const coreOf = (k) => (k === 'F2' && !partner ? CORE.F2.concat(['turned']) : CORE[k]);
  let partner = partnerWanted;
  function tryPlace() {
    const oldest = locations[0], newest = locations[N - 1];
    const pickL = (prefer, p) => (prefer && R.chance(p) ? prefer : R.pick(locations));
    const a = {};
    if (has('F1')) a.F1 = pickL(null);
    if (has('F2')) a.F2 = pickL(null);
    if (has('F3')) a.F3 = pickL(oldest, 0.55);
    if (has('F5')) a.F5 = pickL(newest, 0.55);
    if (partner) a.F2p = pickL(null);
    if (wantX) a.FAX = pickL(null);
    if (wantY) a.FAY = pickL(null);
    // core collisions are not allowed
    const seen = {};
    for (const [k, L] of Object.entries(a)) for (const m of coreOf(k)) { const key = L.id + ':' + m; if (seen[key]) return null; seen[key] = k; }
    if (a.F2p && a.F2p === a.F2) return null;
    const main = ['F1', 'F2', 'F2p', 'F3', 'F5'].filter((k) => a[k]);
    let score = 0;
    for (let i = 0; i < main.length; i++) for (let j = i + 1; j < main.length; j++) if (a[main[i]] === a[main[j]]) score += 10;
    for (const fa of ['FAX', 'FAY']) if (a[fa]) for (const k of main) if (a[k] === a[fa]) score += 1;
    return { a, score };
  }
  let best = null;
  const search = () => { for (let t = 0; t < 400; t++) { const r = tryPlace(); if (r && (!best || r.score < best.score)) best = r; if (best && best.score === 0 && t > 40) break; } };
  // relax in order until everything fits: drop the overflow partner, then each false alarm
  for (const relax of [() => {}, () => { partner = false; }, () => { wantX = false; }, () => { wantY = false; }]) { relax(); search(); if (best) break; }
  const P = best.a;
  const A = P.F1, B = P.F2, C = P.F2p, D = P.F3, E = P.F5, X = P.FAX, Y = P.FAY;
  if (!X && !Y) wantCash = true;

  const claims = {}; // 'L1:rev' -> owner
  const claim = (k, L, m) => { const key = L.id + ':' + m; if (claims[key]) return false; claims[key] = k; return true; };
  for (const k of ['FAX', 'FAY', 'F1', 'F2', 'F2p', 'F3', 'F5']) if (P[k]) for (const m of coreOf(k)) claim(k, P[k], m);
  const opt = {};
  for (const k of ['F1', 'F2', 'F2p', 'F3', 'F5']) if (P[k]) opt[k] = new Set(OPT[k].filter((m) => claim(k, P[k], m)));
  const o = (k, m) => !!(opt[k] && opt[k].has(m));

  // ------------------------------------------------ baseline numbers for every location
  for (const L of locations) {
    L.b = {
      rev: L.rev, labor: R.u(28.0, 30.8), ticket: SD.ticket * R.u(0.9, 1.1), hrs: Math.round(L.staff * R.u(31, 36)), ot: R.i(8, 20), util: R.i(69, 74), thru: 100, wait: R.i(10, 15),
      pm: R.i(42, 50), vol: Math.round(L.rev * 1000 / SD.ticket), csat: r1(R.u(4.4, 4.8)), repeat: R.i(55, 62), newc: Math.round(L.rev * R.u(0.45, 0.8)), fu: R.i(84, 91),
      exits: R.i(0, 1), hires: R.i(0, 2), req: R.i(0, 2), reqDays: R.i(14, 32), train: R.i(86, 98), post: r1(R.u(6.5, 9)), turned: R.i(1, 4), complaints: R.i(1, 3), transfer: 0,
    };
    L.n = {}; // this week's numbers
    for (const [k, v] of Object.entries(L.b)) {
      const j = { rev: R.u(-0.025, 0.025), labor: R.u(-0.5, 0.5), ticket: R.u(-0.02, 0.02), hrs: R.u(-0.03, 0.03), ot: R.u(-0.25, 0.25), util: R.i(-2, 2), thru: R.i(-5, 5), wait: R.i(-2, 2), pm: R.i(-2, 2),
        vol: R.u(-0.03, 0.03), csat: R.pick([-0.1, 0, 0, 0.1]), repeat: R.i(-2, 1), newc: R.u(-0.12, 0.12), fu: R.i(-3, 2) }[k];
      if (j === undefined) L.n[k] = v;
      else if (['rev', 'ticket', 'hrs', 'vol', 'newc'].includes(k)) L.n[k] = v * (1 + j);
      else if (k === 'ot') L.n[k] = Math.max(2, Math.round(v * (1 + j)));
      else L.n[k] = typeof v === 'number' && !Number.isInteger(v) ? r1(v + j) : v + j;
    }
    L.n.days = SD.days; L.n.labor = r1(L.n.labor); L.b.labor = r1(L.b.labor);
  }

  // ------------------------------------------------ the problems, in numbers
  const V = {};
  if (A) {
    const b = A.b.labor, d = r1(R.u(3.4, 4.6)), weeks = R.i(4, 6);
    Object.assign(V, { f1Weeks: weeks, f1Target: Math.round(b) });
    A.n.labor = r1(b + d); A.n.rev = A.b.rev * (1 + R.u(-0.012, 0.004));
    A.n.ot = Math.round(A.b.ot * R.u(2.6, 3.1)); A.b.util = R.i(70, 73); A.n.util = A.b.util - R.i(11, 15);
    A.n.pm = A.b.pm + R.i(10, 13); A.n.thru = R.i(76, 82); A.n.wait = Math.round(A.b.wait * R.u(2.0, 2.4));
    if (o('F1', 'csat')) { A.b.csat = r1(R.u(4.5, 4.7)); A.n.csat = r1(A.b.csat - R.u(0.4, 0.6)); }
    if (o('F1', 'repeat')) A.n.repeat = A.b.repeat - R.i(6, 9);
    V.reviewsA = R.i(5, 7);
  }
  if (B) {
    Object.assign(V, { down: R.i(16, 22), age: 10 + R.i(1, 3), quote: R.i(SD.quote[0], SD.quote[1]) * 1000 + R.pick([0, 200, 400, 600, 800]), unanswered: R.i(16, 21) });
    if (o('F2', 'rev')) B.n.rev = B.b.rev * (1 - R.u(0.045, 0.07));
    if (o('F2', 'util')) B.n.util = B.b.util - R.i(9, 12);
    if (o('F2', 'thru')) B.n.thru = R.i(85, 90);
    if (!partner) { B.b.turned = R.i(2, 5); B.n.turned = R.i(24, 38); }
  }
  if (C) {
    C.n.rev = C.b.rev * (1 + R.u(0.08, 0.11));
    if (o('F2p', 'ot')) C.n.ot = Math.round(C.b.ot * R.u(2.6, 3.1));
    if (o('F2p', 'util')) C.n.util = C.b.util + R.i(7, 10);
    if (o('F2p', 'wait')) C.n.wait = C.b.wait + R.i(7, 10);
    if (o('F2p', 'transfer')) C.n.transfer = 2;
  }
  if (D) {
    if (o('F3', 'rev')) D.n.rev = D.b.rev * (1 + R.u(0.05, 0.075));
    D.n.newc = Math.round(D.b.newc * R.u(1.7, 1.9));
    D.b.repeat = R.i(59, 63); D.n.repeat = D.b.repeat - R.i(8, 10);
    if (o('F3', 'ticket')) D.n.ticket = D.b.ticket * (1 - R.u(0.045, 0.06));
    D.b.fu = R.i(85, 90); D.n.fu = R.i(28, 36);
    V.deskWeeks = R.i(8, 10); V.leaver = R.pick(LEAVERS);
    if (o('F3', 'csat')) { D.n.csat = D.b.csat; }
  }
  if (E) {
    E.n.exits = 3; E.n.post = r1(R.u(1.4, 1.9));
    if (o('F5', 'ot')) E.n.ot = Math.round(E.b.ot * R.u(2.2, 2.7));
    if (o('F5', 'labor')) E.n.labor = r1(E.b.labor + R.u(1.0, 1.5));
    if (o('F5', 'train')) E.n.train = R.i(50, 60);
    if (o('F5', 'req')) { E.n.req = 3; E.n.reqDays = R.i(28, 40); }
    E.n.hires = Math.max(E.n.hires, 3);
  }
  const closure = R.pick(CLOSURE);
  if (X) {
    const perDay = R.u(0.05, 0.08), dd = SD.days;
    X.n.rev = X.b.rev * ((dd - 1) / dd) * (1 + perDay); X.n.days = dd - 1; V.perDay = perDay;
    X.n.labor = r1(X.b.labor + R.u(1.8, 2.4)); X.n.ot = Math.max(2, Math.round(X.b.ot * 0.6));
    V.closureDay = R.pick(['Tuesday', 'Wednesday']);
  }
  if (Y) { Y.n.csat = Y.b.csat; Y.n.complaints = Y.b.complaints; }

  // purchasing
  const revTotal = locations.reduce((n, L) => n + L.n.rev, 0);
  const matBase = r1(R.u(25.5, 28.5)), share = R.u(0.5, 0.6), vr = r1(R.u(5.6, 7.8)) / 100, mix = r1(R.u(0.15, 0.3));
  const matUp = r1(matBase * share * vr + mix);
  const overWeek = revTotal * 1000 * (matBase / 100) * share * vr;
  Object.assign(V, { matBase, matNow: r1(matBase + matUp), matUp, mix, vr, over: Math.round(overWeek * 6 / 100) * 100, overWeek: Math.round(overWeek / 100) * 100, annual: Math.round(overWeek * 52 / 1000) * 1000 });
  const premium = Math.round(revTotal * R.u(0.18, 0.24)) * 1000;
  const cash = Math.round(revTotal * R.u(1.4, 1.9)) * 1000;

  // ------------------------------------------------ signals
  const S = {};
  const KD = { real: [0.7, 0.65, 0.65], buried: [0.65, 0.55, 0.65], supporting: [0.45, 0.45, 0.4], emerging: [0.45, 0.5, 0.45], contradictory: [0.35, 0.4, 0.3], falseAlarm: [0.2, 0.12, 0.1], explainer: [0.05, 0.05, 0.02], noise: [0.05, 0.05, 0.02] };
  const sig = (id, x) => {
    const kind = x.kind || 'noise', [sev, urg, impact] = KD[kind];
    S[id] = { id, loc: null, cat: 'general', kind, label: '', value: '', delta: '', cell: null, v: 0, base: 0, trend: kind === 'noise' ? 'flat' : 'moving', sev, urg, conf: 0.9, impact, links: [], ts: 'Mon 6:10 AM', action: false, ...x };
    return id;
  };
  const owner = (L, m) => claims[L.id + ':' + m] || null;
  const KIND = { // the role a claimed metric plays in its story
    F1: { labor: 'real', util: 'real', sched: 'buried', wait: 'real', ot: 'supporting', pm: 'supporting', thru: 'real', csat: 'real', reviews: 'supporting', repeat: 'emerging', rev: 'supporting' },
    F2: { wo: 'real', down: 'real', age: 'supporting', turned: 'real', rev: 'supporting', thru: 'supporting', util: 'supporting' },
    F2p: { rev: 'contradictory', ot: 'supporting', util: 'supporting', wait: 'emerging', transfer: 'emerging' },
    F3: { rev: 'supporting', newc: 'supporting', repeat: 'buried', ticket: 'supporting', fu: 'buried', deskreq: 'supporting', csat: 'contradictory' },
    F5: { exits: 'real', exitnote: 'buried', post: 'buried', ot: 'supporting', labor: 'supporting', train: 'supporting', req: 'supporting' },
    FAX: { rev: 'falseAlarm', labor: 'falseAlarm', days: 'explainer', ot: 'noise' },
    FAY: { csat: 'explainer', complaints: 'explainer' },
  };
  const kindAt = (L, m) => { const w = owner(L, m); return w ? KIND[w][m] || 'noise' : 'noise'; };
  const hide = (k) => (k === 'noise' ? { trend: 'flat' } : {});

  for (const L of locations) {
    const b = L.b, n = L.n, id = (m) => m + '.' + L.id;
    sig(id('rev'), { loc: L.id, cat: 'finance', kind: kindAt(L, 'rev'), label: lab(L, 'revenue'), value: kmoney(n.rev), cell: kmoney(n.rev), delta: pct1(n.rev / b.rev - 1), v: n.rev, base: b.rev });
    sig(id('labor'), { loc: L.id, cat: 'finance', kind: kindAt(L, 'labor'), label: lab(L, 'labor'), value: n.labor.toFixed(1) + '% of revenue', cell: n.labor.toFixed(1) + '%', delta: pts(n.labor - b.labor), v: n.labor, base: b.labor });
    sig(id('ticket'), { loc: L.id, cat: 'finance', kind: kindAt(L, 'ticket'), label: lab(L, 'revenue per {visit}'), value: money(n.ticket), cell: money(n.ticket), delta: pct1(n.ticket / b.ticket - 1), v: n.ticket, base: b.ticket });
    sig(id('hrs'), { loc: L.id, cat: 'labor', label: lab(L, 'paid hours'), value: Math.round(n.hrs).toLocaleString('en-US'), delta: pct1(n.hrs / b.hrs - 1), v: n.hrs, base: b.hrs });
    sig(id('ot'), { loc: L.id, cat: 'labor', kind: kindAt(L, 'ot'), label: lab(L, 'overtime'), value: n.ot + ' hours', cell: String(n.ot), delta: 'norm ' + b.ot, v: n.ot, base: b.ot });
    sig(id('util'), { loc: L.id, cat: 'labor', kind: kindAt(L, 'util'), label: lab(L, 'productive share of paid hours'), value: n.util + '%', delta: 'was ' + b.util + '%', v: n.util, base: b.util });
    sig(id('post'), { loc: L.id, cat: 'labor', kind: kindAt(L, 'post'), label: lab(L, 'schedules posted'), value: n.post.toFixed(1) + ' days ahead', cell: n.post.toFixed(1), delta: 'standard is 7 days', v: n.post, base: 7, ...hide(kindAt(L, 'post')) });
    sig(id('vol'), { loc: L.id, cat: 'operations', label: lab(L, '{visits}'), value: Math.round(n.vol).toLocaleString('en-US'), delta: pct1(n.vol / b.vol - 1), v: n.vol, base: b.vol });
    sig(id('thru'), { loc: L.id, cat: 'operations', kind: kindAt(L, 'thru'), label: lab(L, 'throughput per staffed hour'), value: n.thru + '% of norm', cell: n.thru + '%', delta: 'norm 100%', v: n.thru, base: 100 });
    sig(id('wait'), { loc: L.id, cat: 'operations', kind: kindAt(L, 'wait'), label: lab(L, '{waitLabel}'), value: n.wait + ' min', delta: 'norm ' + b.wait, v: n.wait, base: b.wait });
    sig(id('pm'), { loc: L.id, cat: 'operations', kind: kindAt(L, 'pm'), label: lab(L, '{visits} ' + peakTime), value: n.pm + '%', delta: 'was ' + b.pm + '% a year ago', v: n.pm, base: b.pm });
    sig(id('days'), { loc: L.id, cat: 'operations', kind: kindAt(L, 'days'), label: lab(L, 'open days last week'), value: n.days + ' of ' + SD.days, delta: n.days < SD.days ? 'revenue per open day ' + pct1(V.perDay) : '', v: n.days, base: SD.days });
    sig(id('turned'), { loc: L.id, cat: 'operations', kind: kindAt(L, 'turned'), label: lab(L, '{visits} turned away or referred out'), value: String(n.turned), delta: 'norm ' + b.turned, v: n.turned, base: b.turned });
    sig(id('csat'), { loc: L.id, cat: 'customer', kind: kindAt(L, 'csat'), label: lab(L, 'satisfaction'), value: n.csat.toFixed(1), delta: 'was ' + b.csat.toFixed(1), v: n.csat, base: b.csat });
    sig(id('repeat'), { loc: L.id, cat: 'customer', kind: kindAt(L, 'repeat'), label: lab(L, 'returning {customers}'), value: n.repeat + '%', delta: 'was ' + b.repeat + '%' + (owner(L, 'repeat') === 'F3' ? ' eight weeks ago' : ''), v: n.repeat, base: b.repeat });
    sig(id('newc'), { loc: L.id, cat: 'customer', kind: kindAt(L, 'newc'), label: lab(L, 'new {customers}, last four weeks'), value: String(n.newc), delta: 'norm ' + b.newc, v: n.newc, base: b.newc });
    sig(id('fu'), { loc: L.id, cat: 'customer', kind: kindAt(L, 'fu'), label: lab(L, '{followup} completed'), value: n.fu + '%', delta: 'was ' + b.fu + '%', v: n.fu, base: b.fu });
    const rv = owner(L, 'reviews') ? V.reviewsA : R.i(0, 1), rn = 9;
    sig(id('reviews'), { loc: L.id, cat: 'customer', kind: kindAt(L, 'reviews'), label: lab(L, 'reviews that mention the wait'), value: rv + ' of the last ' + rn, cell: rv + ' of ' + rn, delta: '', v: rv, base: 1 });
    sig(id('complaints'), { loc: L.id, cat: 'customer', kind: kindAt(L, 'complaints'), label: lab(L, 'formal complaints this month'), value: String(n.complaints), delta: 'monthly norm ' + b.complaints, v: n.complaints, base: b.complaints });
    sig(id('hc'), { loc: L.id, cat: 'people', label: lab(L, 'headcount'), value: String(L.staff), v: L.staff, base: L.staff });
    sig(id('hires'), { loc: L.id, cat: 'people', label: lab(L, 'hires in five weeks'), value: String(n.hires), v: n.hires, base: n.hires });
    sig(id('exits'), { loc: L.id, cat: 'people', kind: kindAt(L, 'exits'), label: lab(L, 'resignations in five weeks'), value: String(n.exits), delta: owner(L, 'exits') ? 'all within 90 days of hire' : '', v: n.exits, base: owner(L, 'exits') ? 0.5 : n.exits });
    sig(id('req'), { loc: L.id, cat: 'people', kind: kindAt(L, 'req'), label: lab(L, 'open roles'), value: String(n.req), delta: n.req ? 'open ' + n.reqDays + ' days on average' : '', v: n.req, base: owner(L, 'req') ? 1 : n.req });
    sig(id('train'), { loc: L.id, cat: 'people', kind: kindAt(L, 'train'), label: lab(L, 'training completed'), value: n.train + '%', delta: 'target 90%', v: n.train, base: owner(L, 'train') ? 90 : n.train });
    sig(id('transfer'), { loc: L.id, cat: 'people', kind: kindAt(L, 'transfer'), label: lab(L, 'transfer requests this month'), value: String(n.transfer), delta: 'norm 0', v: n.transfer, base: 0 });
  }
  // problem-specific lines
  if (A) sig('sched.' + A.id, { loc: A.id, cat: 'labor', kind: 'buried', label: lab(A, 'schedule template changed'), value: WORDS[V.f1Weeks] + ' weeks ago', delta: '{lead} coverage moved to the ' + offPeak + ' block', v: 1, base: 0, trend: 'stepped', sev: 0.8, urg: 0.75, impact: 0.75, ts: WORDS[V.f1Weeks] + ' weeks ago' });
  if (B) {
    sig('wo.' + B.id, { loc: B.id, cat: 'maintenance', kind: 'real', label: lab(B, '{equipment}: repair orders in six weeks'), value: '3', delta: 'each closed as repaired', v: 3, base: 0.3, sev: 0.75, urg: 0.8, impact: 0.7 });
    sig('down.' + B.id, { loc: B.id, cat: 'maintenance', kind: 'real', label: lab(B, '{equipment} downtime, last two weeks'), value: V.down + ' hours', delta: 'norm 3', v: V.down, base: 3, sev: 0.75, urg: 0.8, impact: 0.7 });
    sig('age.' + B.id, { loc: B.id, cat: 'maintenance', kind: 'supporting', label: lab(B, '{equipment} age'), value: V.age + ' years', delta: 'rated life 10', v: V.age, base: 10 });
  }
  if (E) sig('exitnote.' + E.id, { loc: E.id, cat: 'people', kind: 'buried', label: lab(E, 'exit notes that cite late schedules'), value: '2 of 3', v: 2, base: 0, sev: 0.55, urg: 0.45 });
  if (D) sig('deskreq.' + D.id, { loc: D.id, cat: 'people', kind: o('F3', 'deskreq') ? 'supporting' : 'noise', label: lab(D, '{desk} role'), value: 'open ' + V.deskWeeks * 7 + ' days', v: V.deskWeeks * 7, base: 30 });
  // company lines
  sig('mat', { cat: 'finance', kind: 'buried', label: '{Materials} cost' + (M ? ', all {units}' : ''), value: V.matNow.toFixed(1) + '% of revenue', cell: V.matNow.toFixed(1) + '%', delta: pts(V.matUp) + ' in six weeks', v: V.matNow, base: V.matBase, sev: 0.55, urg: 0.5, impact: 0.6 });
  sig('utilities', { cat: 'finance', label: 'Utilities' + (M ? ', all {units}' : ''), value: '2.1% of revenue', cell: '2.1%', delta: '+0.1 pts', v: 2.1, base: 2.0 });
  sig('uniform', { cat: 'finance', label: 'Uniforms and laundry', value: money(R.i(14, 26) * 100), delta: 'one-time reorder', v: 1, base: 1 });
  const cashFmt = cash >= 1e6 ? '$' + (cash / 1e6).toFixed(2) + 'M' : '$' + Math.round(cash / 1000) + 'k';
  sig('cash', { cat: 'finance', kind: wantCash ? 'falseAlarm' : 'noise', label: 'Operating cash', value: cashFmt, delta: wantCash ? '-$' + Math.round(premium / 1000) + 'k in a week' : '+$' + R.i(8, 40) + 'k in a week', v: cash, base: wantCash ? cash + premium : cash });
  sig('swap', { cat: 'labor', label: 'Shift swaps' + (M ? ', all {units}' : ''), value: String(R.i(18, 46)), delta: 'norm ' + R.i(18, 44), v: 1, base: 1 });
  sig('noshow', { cat: 'operations', label: 'No-show rate' + (M ? ', all {units}' : ''), value: '6.1%', delta: 'norm 5.9%', v: 6.1, base: 5.9 });
  sig('social', { cat: 'customer', label: 'Social followers', value: '+3.1%', delta: 'this month', v: 103.1, base: 100 });
  sig('pmc', { cat: 'maintenance', label: 'Preventive maintenance completed', value: R.i(91, 96) + '%', delta: 'target 95%', v: 93, base: 95 });
  sig('turnco', { cat: 'people', label: 'Turnover, annualized', value: R.i(26, 34) + '%', delta: 'was ' + R.i(26, 33) + '%', v: 31, base: 29 });
  sig('pto', { cat: 'people', label: 'Time off requests pending', value: String(R.i(8, 16)), delta: 'norm 12', v: 14, base: 12 });
  sig('ap.var', { cat: 'purchasing', kind: 'buried', label: '{supplier} invoice prices against contract, top 40 items', value: '+' + (V.vr * 100).toFixed(1) + '%', delta: 'since six weeks ago', v: 100 + V.vr * 100, base: 100, sev: 0.65, urg: 0.55, impact: 0.65 });
  sig('ap.total', { cat: 'purchasing', kind: 'real', label: 'Paid above contract, six weeks', value: money(V.over), delta: 'about ' + money(V.annual) + ' a year', v: V.over, base: 0, sev: 0.6, urg: 0.5, impact: 0.65 });
  sig('ap.lock', { cat: 'purchasing', kind: 'supporting', label: '{supplier} contract rate lock', value: 'through ' + lockDate, v: 1, base: 1 });
  sig('ap.mix', { cat: 'purchasing', kind: 'supporting', label: 'Share of the {materials} increase explained by mix', value: V.mix.toFixed(1) + ' of ' + V.matUp.toFixed(1) + ' pts', v: V.mix, base: V.matUp });
  sig('ap.vol', { cat: 'purchasing', label: 'Purchase volume', value: '+0.8%', delta: 'in line with {visits}', v: 100.8, base: 100 });
  sig('ap.other', { cat: 'purchasing', label: 'All other suppliers against contract', value: 'within 0.5%', v: 100.3, base: 100 });
  sig('ap.freight', { cat: 'purchasing', label: 'Freight surcharges', value: money(R.i(320, 520)), delta: 'norm $380', v: 410, base: 380 });

  // ------------------------------------------------ messages, emails, calendar: their signals
  const a = A && mgr(A), b = B && mgr(B), c = C && mgr(C), d = D && mgr(D), e = E && mgr(E), x = X && mgr(X), y = Y && mgr(Y);
  sig('note.mix', { cat: 'finance', kind: 'contradictory', label: F('controller') + ' reads the {materials} increase as mix', value: 'assumption', v: 0, base: 0, ts: 'Mon 6:52 AM' });
  if (A) sig('msg.hire', { loc: A.id, cat: 'labor', kind: 'contradictory', label: F(a) + ' asks for two more hires' + atL(A), value: 'request', v: 0, base: 0, ts: 'Sun 9:14 PM', sev: 0.5, urg: 0.6 });
  if (Y) sig('eml.angry', { loc: Y.id, cat: 'customer', kind: 'falseAlarm', label: (M ? Y.name + ' complaint' : 'Complaint') + ' copied to ' + bossName, value: '1 complaint', delta: 'refunded Friday', v: 1, base: 1, ts: 'Fri 4:40 PM' });
  if (D) sig('promo', { loc: D.id, cat: 'customer', kind: 'supporting', label: lab(D, 'intro offer results'), value: D.n.newc + ' new {customers}', delta: 'a record', v: D.n.newc, base: D.b.newc, sev: 0.3, urg: 0.3, ts: 'Fri 3:02 PM' });
  if (wantCash) sig('eml.bank', { cat: 'finance', kind: 'explainer', label: 'Annual insurance premium paid Thursday', value: kmoney(premium / 1000).replace('.0k', 'k'), delta: 'on schedule', v: 1, base: 1, ts: 'Thu 11:00 AM' });
  if (B) sig('eml.quote', { loc: B.id, cat: 'maintenance', kind: 'buried', label: 'Replacement quote for the {equipment}' + atL(B), value: money(V.quote), delta: 'unanswered ' + V.unanswered + ' days, three week lead time', v: V.unanswered, base: 0, sev: 0.7, urg: 0.85, impact: 0.7, ts: V.unanswered + ' days ago' });
  sig('eml.price', { cat: 'purchasing', kind: 'buried', label: '{supplier} sent an updated price list', value: 'six weeks ago', v: 1, base: 0, sev: 0.5, urg: 0.4, impact: 0.55, ts: 'six weeks ago' });
  sig('eml.it', { label: 'Password policy change', value: 'Friday' });
  sig('eml.party', { label: 'Holiday party venue vote', value: 'due Wednesday' });
  sig('eml.benefits', { cat: 'people', label: 'Benefits enrollment reminder', value: 'closes Friday' });
  if (C) sig('msg.record', { loc: C.id, cat: 'operations', kind: 'contradictory', label: F(c) + ' reports a record week' + atL(C), value: 'record week', v: 0, base: 0, ts: 'Sat 6:31 PM', sev: 0.35, urg: 0.4 });
  if (B) sig('msg.overflow', { loc: B.id, cat: 'operations', kind: 'supporting', label: partner ? F(b) + ' is sending ' + B.name + ' work to ' + C.name : F(b) + ' is pushing work back while the {equipment} is down', value: 'ongoing', v: 0, base: 0, ts: 'Fri 2:12 PM', sev: 0.55, urg: 0.6 });
  if (E) sig('msg.sat', { loc: E.id, cat: 'people', kind: 'emerging', label: F(e) + ' is covering shifts personally' + atL(E), value: 'this Saturday', v: 0, base: 0, ts: 'Fri 7:48 PM' });
  if (D) sig('msg.desk', { loc: D.id, cat: 'people', kind: 'supporting', label: (M ? D.name + ' desk' : 'The desk is') + ' short since ' + V.leaver + ' left', value: WORDS[V.deskWeeks] + ' weeks', v: V.deskWeeks, base: 0, ts: 'Fri 5:05 PM' });
  if (X) {
    sig('msg.closure', { loc: X.id, cat: 'operations', kind: 'explainer', label: (M ? X.name + ' was' : 'We were') + ' closed ' + V.closureDay + ' for ' + closure[0], value: 'one day', v: 0, base: 0, ts: 'Sat 9:20 AM' });
    sig('cal.closure', { loc: X.id, cat: 'operations', kind: 'explainer', label: (M ? X.name + ' closed, ' : 'Closed, ') + closure[1], value: 'last ' + V.closureDay, v: 0, base: 0 });
  }
  sig('cal.contract', { cat: 'purchasing', kind: 'supporting', label: '{supplier} contract review', value: 'next Monday', v: 0, base: 0 });
  sig('cal.meeting', { label: role.meetingName, value: '10:00 AM today' });
  sig('cal.misc', { label: 'Calendar items this week', value: '' });
  if (A) sig('cal.checkin', { loc: A.id, cat: 'labor', kind: 'supporting', label: 'Quarterly check-in with ' + characters[a].name, value: '3:00 PM today', v: 0, base: 0 });
  if (E) sig('cal.exit', { loc: E.id, cat: 'people', kind: 'supporting', label: 'Exit interview' + atL(E), value: 'last Friday', v: 0, base: 0 });
  if (wantCash) sig('cal.premium', { cat: 'finance', kind: 'explainer', label: 'Insurance premium autopay', value: 'last Thursday', v: 0, base: 0 });
  sig('note.role', { label: 'Note about Thursday' });
  sig('note.mine', { label: 'Your notes from last week' });
  if (B) sig('mnt.today', { loc: B.id, cat: 'maintenance', kind: 'emerging', label: '{Equipment}' + atL(B) + ' is down again this morning', value: 'today', v: 1, base: 0, ts: 'Mon 8:25 AM', sev: 0.7, urg: 0.85 });
  sig('msg.agenda', { label: F('controller') + ' is building the agenda', ts: 'Mon 9:05 AM' });
  sig('ping.social', { cat: 'customer', label: F('marketing') + ' wants to post this month\'s numbers', value: 'request' });
  sig('ping.lunch', { label: 'Uniform vendor lunch Wednesday', value: 'invite' });
  sig('ping.pto', { cat: 'people', label: 'Three time-off requests to approve', value: 'request' });
  sig('ping.visit', { cat: 'operations', label: F('opsdir') + ' plans a site visit this afternoon', value: 'plan' });
  sig('msg.small', { label: 'A quick personal text', value: '' });

  // explicit links between lines that explain or contradict each other
  const link = (from, ...to) => { if (S[from]) S[from].links.push(...to.filter((t) => S[t])); };
  if (X) { link('rev.' + X.id, 'days.' + X.id, 'cal.closure', 'msg.closure'); link('labor.' + X.id, 'days.' + X.id, 'rev.' + X.id); }
  if (wantCash) link('cash', 'eml.bank', 'cal.premium');
  if (Y) link('eml.angry', 'complaints.' + Y.id, 'csat.' + Y.id);
  if (A) { link('labor.' + A.id, 'ot.' + A.id, 'util.' + A.id, 'msg.hire'); link('sched.' + A.id, 'pm.' + A.id, 'util.' + A.id, 'wait.' + A.id, 'cal.checkin'); link('wait.' + A.id, 'csat.' + A.id, 'reviews.' + A.id); }
  if (B) { link('wo.' + B.id, 'down.' + B.id, 'eml.quote', 'age.' + B.id); link('down.' + B.id, 'msg.overflow', 'rev.' + B.id, 'turned.' + B.id); if (C) link('rev.' + C.id, 'msg.overflow', 'msg.record', 'ot.' + C.id); }
  if (D) { link('repeat.' + D.id, 'fu.' + D.id, 'newc.' + D.id, 'promo'); link('fu.' + D.id, 'msg.desk', 'deskreq.' + D.id); }
  link('mat', 'ap.var', 'ap.mix', 'note.mix'); link('ap.var', 'eml.price', 'ap.lock', 'cal.contract');
  if (E) { link('exits.' + E.id, 'exitnote.' + E.id, 'post.' + E.id, 'msg.sat'); link('exitnote.' + E.id, 'post.' + E.id, 'cal.exit'); }

  // ------------------------------------------------ findings (Wake's), with their evidence
  const L_ = (m, L) => m + '.' + L.id;
  const keepOpt = (k, m, L) => (o(k, m) ? [L_(m, L)] : []);
  const findings = [];
  const content = { briefing: {}, reactions: {}, week: {}, context: {}, quiet: {}, answers: {} };
  const ctrl = 'controller';

  if (A) {
    const ev = [L_('labor', A), ...keepOpt('F1', 'rev', A), L_('ot', A), L_('util', A), L_('sched', A), L_('pm', A), ...keepOpt('F1', 'thru', A), L_('wait', A), ...keepOpt('F1', 'csat', A), ...keepOpt('F1', 'reviews', A), ...keepOpt('F1', 'repeat', A), 'msg.hire'];
    const rp = o('F1', 'repeat'), wn = A.b.wait, wNow = A.n.wait;
    findings.push({ id: 'F1', loc: A.id, urgency: 0.9, impact: 0.85, topic: 'Labor and scheduling',
      title: M ? A.name + ' has a scheduling problem that looks like a labor problem.' : 'The labor problem is really a scheduling problem.',
      short: 'the hours are in the wrong half of the day',
      finding: (M ? A.name + ' is' : 'You are') + ' paying for more hours and getting less done with them. Labor is ' + A.n.labor.toFixed(1) + '% of revenue, up ' + (A.n.labor - A.b.labor).toFixed(1) + ' points in ' + WORDS[V.f1Weeks] + ' weeks' + (o('F1', 'rev') ? ', on flat volume.' : '.'),
      connection: cap(WORDS[V.f1Weeks]) + ' weeks ago the schedule template moved {lead} coverage to the ' + offPeak + ' block. Over the same period the work moved later: ' + A.n.pm + '% of {visits} now arrive ' + peakTime + '. Payroll, scheduling and waiting all bend in the same week.',
      interpretation: 'The hours are in the wrong half of the day. ' + cap(offPeaks) + ' are overstaffed and idle. ' + cap(peaks) + ' run long and spill into overtime. {Customers} feel it first: the {waitLabel} has doubled' + (rp ? ' and fewer of them are coming back' : '') + '. Cutting hours would deepen the ' + peak + ' shortage. Two more hires would add cost to a schedule that already has enough people in it.',
      action: 'Move {lead} coverage back to the ' + peak + ' peak this week. Hold the hire request. Recheck the wait and overtime in ten days.',
      core: [L_('labor', A), L_('util', A), L_('sched', A), L_('wait', A)], evidence: ev, rootConcepts: ['scheduling', 'inefficiency', 'capacity'],
      whyFirst: 'Labor cost is the last thing to move here. The schedule moved first, and reducing hours would make the ' + peaks + ' worse.' });
    content.briefing.F1 = { headline: M ? A.name + '\'s labor problem is a scheduling problem.' : 'Your labor problem is a scheduling problem.',
      why: '{Lead} coverage moved to ' + offPeaks + ' ' + WORDS[V.f1Weeks] + ' weeks ago. The work moved to ' + peaks + '. Overtime, wait times' + (rp ? ' and return visits' : '') + ' all broke the same week.',
      keys: [L_('util', A), L_('sched', A), L_('wait', A), rp ? L_('repeat', A) : L_('ot', A)],
      action: 'Move {lead} coverage back to the ' + peaks + '. Hold the two hires.', owner: [a], check: 'Wait under ' + (wn + 5) + ' minutes by Friday.',
      onIt: 'Moving the {leads} back to ' + peaks + ' today. I\'ll watch the wait.' };
    content.reactions.F1 = {
      aligned: [[a, 'Moving the {leads} back to ' + peaks + ' today. That\'s what\'s been hurting us.']],
      cut: [[a, 'If we cut hours, ' + peaks + ' get worse. We\'re already at a ' + wNow + ' minute wait.']],
      hire: [[ctrl, 'Payroll is up and volume is flat. Are we sure hiring is the fix?']],
      partial: [['analyst', 'I can dig in. It\'ll take me until Wednesday to pull it together.']],
      unclear: [[a, 'Okay. What do you want me to change first?']] };
    content.week.F1 = { label: M ? A.name + ' · wait time' : 'Wait time',
      aligned: ['Coverage moved back Tuesday. Wait fell from ' + wNow + ' to ' + (wn + 4) + ' minutes.', 'up'],
      partial: [F('analyst') + ' is still digging. Wait still ' + (wNow - 1) + ' minutes.', 'flat'],
      cut: ['Labor down 3 points. Wait up to ' + (wNow + 12) + ' minutes. Four bad reviews.', 'down'],
      hire: ['Two hires start in three weeks. Wait still ' + (wNow + 1) + ' minutes.', 'flat'],
      unclear: [F(a) + ' waited for direction. Wait still ' + wNow + ' minutes.', 'flat'],
      untouched: ['Nothing changed. Wait ' + (wNow + 2) + ' minutes, three more bad reviews.', 'down'] };
    content.context.F1 = M ? A.name + '\'s overtime and its wait times' : 'the overtime and the wait times';
    content.quiet.F1 = L_('sched', A);
    content.answers['F1.cost'] = [
      ['cut', 'cost', 'Labor is running hot. Trim hours' + atL(A) + ' until it\'s under ' + V.f1Target + '%.'],
      ['hire', 'invest', (M ? A.name + ' is' : 'The team is') + ' stretched thin. Approve the two hires ' + F(a) + ' requested.'],
      ['investigate', 'analyze', 'Labor jumped on flat sales. Have ' + F('analyst') + ' find out why first.'],
      ['schedule', 'process', 'Hours don\'t match demand. Rebuild the schedule around the ' + peak + ' peak.']];
    content.answers['F1.cx'] = [
      ['hire', 'invest', '{Customers} are waiting too long. Approve ' + F(a) + '\'s two new hires.'],
      ['cut', 'cost', 'Overtime isn\'t fixing the wait. Cap overtime' + atL(A) + ' this week.'],
      ['investigate', 'analyze', 'Service slipped' + atL(A) + '. Ask ' + F(a) + ' what changed and report back.'],
      ['schedule', 'process', 'The wait is in the ' + peaks + '. Move {lead} coverage to the peak.']];
  }

  if (B) {
    const ev = [L_('wo', B), L_('down', B), L_('age', B), 'eml.quote', ...keepOpt('F2', 'rev', B), ...keepOpt('F2', 'util', B), ...keepOpt('F2', 'thru', B), ...(partner ? [] : [L_('turned', B)]), 'msg.overflow'];
    if (partner) ev.push(L_('rev', C), 'msg.record', ...keepOpt('F2p', 'ot', C), ...keepOpt('F2p', 'util', C), ...keepOpt('F2p', 'wait', C), ...keepOpt('F2p', 'transfer', C));
    const revB = o('F2', 'rev'), q = money(V.quote), otC = partner && o('F2p', 'ot') ? C.n.ot : 0;
    const bPos = M ? B.name + '\'s' : 'The';
    findings.push({ id: 'F2', loc: B.id, urgency: 0.85, impact: 0.75, topic: 'Equipment',
      title: partner ? B.name + '\'s {equipment} is failing, and ' + C.name + '\'s record week is the evidence.' : bPos + ' {equipment} is failing, and the repairs are hiding it.',
      short: partner ? 'one failing unit is costing two {units}' : 'every repair hides a failing unit',
      finding: 'The {equipment}' + atL(B) + ' has been repaired three times in six weeks and was down ' + V.down + ' hours in the last two. Each repair was closed as fixed.',
      connection: partner
        ? C.name + '\'s revenue is up ' + ((C.n.rev / C.b.rev - 1) * 100).toFixed(1) + '%' + (revB ? ' while ' + B.name + '\'s is down ' + ((1 - B.n.rev / B.b.rev) * 100).toFixed(1) + '%' : '') + '. Those are largely the same {visits}. ' + F(b) + ' has been sending work across town, and ' + C.name + ' has covered it' + (otC ? ' with ' + otC + ' hours of overtime.' : ' by running past capacity.')
        : 'While it is down, work gets pushed back or turned away: ' + B.n.turned + ' {visits} were turned away or referred out, against a norm of ' + B.b.turned + '.' + (revB ? ' Revenue' + atL(B) + ' is down ' + ((1 - B.n.rev / B.b.rev) * 100).toFixed(1) + '%.' : ''),
      interpretation: partner
        ? 'One failing unit is quietly costing two {units}. ' + B.name + ' loses capacity. ' + C.name + '\'s best week on paper is a team running past its limit. The replacement quote has sat unanswered for ' + V.unanswered + ' days and carries a three week lead time.'
        : 'Each repair buys a week or so, then it fails again, and the lost work never shows up as a repair cost. The replacement quote has sat unanswered for ' + V.unanswered + ' days and carries a three week lead time.',
      action: 'Approve the ' + q + ' replacement today. ' + (partner ? 'Until it arrives, route ' + B.name + '\'s overflow on a plan and cap ' + C.name + '\'s overtime.' : 'Until it arrives, plan the backlog instead of turning work away.'),
      core: [L_('wo', B), L_('down', B), 'eml.quote', partner ? L_('rev', C) : L_('turned', B)], evidence: ev, rootConcepts: ['equipment', 'capacity'],
      whyFirst: 'Every week without a decision adds another week to a three week lead time' + (partner ? ', and ' + C.name + ' is paying for it in overtime.' : '.') });
    content.briefing.F2 = { headline: partner ? B.name + '\'s {equipment} is failing, and ' + C.name + ' is paying for it.' : bPos + ' {equipment} is failing. Repairs aren\'t holding.',
      why: 'Three repairs in six weeks and ' + V.down + ' hours down. ' + (partner ? B.name + '\'s lost work is ' + C.name + '\'s "record week", covered on overtime.' : B.n.turned + ' {visits} turned away while it was down.') + ' The replacement quote has sat for ' + V.unanswered + ' days.',
      keys: [L_('wo', B), 'eml.quote', partner ? L_('rev', C) : L_('down', B), partner ? (otC ? L_('ot', C) : 'msg.record') : L_('turned', B)],
      action: 'Approve the ' + q + ' replacement today.' + (partner ? ' Cap ' + C.name + '\'s overtime until it arrives.' : ' Plan the backlog until it arrives.'), owner: [b], check: 'Ordered today. Three week lead time.',
      onIt: 'Ordering it today. We\'ll plan the overflow until it\'s in.' };
    content.reactions.F2 = {
      aligned: [[b, 'Finally. I\'ll get the order in today.']],
      route: [partner ? [c, 'We can\'t keep absorbing ' + B.name + '\'s work on overtime. My team is done.'] : [b, 'Pushing work to Saturdays is burning the team out. It keeps failing anyway.']],
      repair: [[b, 'We\'ve repaired it three times. It keeps going down.']],
      recognize: [partner ? [c, 'Thanks. Honestly, a lot of that week was ' + B.name + '\'s work, and my team is exhausted.'] : [b, 'Thanks, but the {equipment} is the real problem here.']],
      partial: [[b, 'I can get you a recommendation by Friday. The quote\'s been sitting for ' + WORDS[Math.round(V.unanswered / 7)] + ' weeks, though.']],
      unclear: [[b, 'Do you want me to replace it or keep patching it?']] };
    content.week.F2 = { label: M ? B.name + ' · {equipment}' : 'The {equipment}',
      aligned: ['Replacement ordered Monday. Overflow was planned when it failed Thursday.', 'up'],
      partial: ['Recommendation due Friday. It went down again Thursday.', 'flat'],
      route: partner ? ['Still routing to ' + C.name + '. ' + C.name + ' hit ' + ((otC || 50) + 7) + ' overtime hours and one person quit.', 'down'] : ['Backlog pushed to Saturday. It failed again Thursday.', 'down'],
      repair: ['Repaired Wednesday. Down again Thursday.', 'down'],
      recognize: partner ? [C.name + ' celebrated. ' + B.name + ' went down again Thursday.', 'down'] : ['Down again Thursday.', 'down'],
      unclear: [F(b) + ' patched it again. Down again Thursday.', 'down'],
      untouched: partner ? ['Down again Thursday. ' + C.name + ' covered it on overtime.', 'down'] : ['Down again Thursday. More work turned away.', 'down'] };
    content.context.F2 = partner ? 'the repair log and ' + C.name + '\'s record week' : 'the repair log and the work being turned away';
    content.quiet.F2 = 'eml.quote';
    content.answers['F2.eq'] = [
      ['replace', 'invest', 'Repairs aren\'t holding. Approve the ' + q + ' replacement' + atL(B) + ' today.'],
      ['repair', 'cost', 'Get ' + equipCo + ' back out to fix it properly this time.'],
      ['route', 'process', partner ? 'Keep sending overflow to ' + C.name + ' until it\'s running reliably.' : 'Push the backlog to Saturday shifts until it\'s running reliably.'],
      ['investigate', 'analyze', 'Have ' + F('opsdir') + ' assess repair versus replace and recommend by Friday.']];
    content.answers['F2.rev'] = [
      ['investigate', 'analyze', (M ? B.name + ' sales are' : 'Sales are') + ' sliding. Have ' + F(b) + ' bring a recovery plan this week.'],
      ['cut', 'cost', 'Volume is down' + atL(B) + '. Trim hours to match until it recovers.'],
      ['route', 'process', partner ? 'Route ' + B.name + '\'s overflow to ' + C.name + ' so nothing walks out.' : 'Turn away less. Book the overflow into Saturday overtime.'],
      ['replace', 'invest', 'The lost work traces to the {equipment}. Approve the replacement now.']];
    if (partner) content.answers['F2.p'] = [
      ['recognize', 'people', 'Record week at ' + C.name + '. Recognize ' + F(c) + '\'s team and share what worked.'],
      ['hire', 'invest', C.name + ' is at capacity. Add a {frontline} to keep up.'],
      ['investigate', 'analyze', 'Find out why ' + C.name + ' is suddenly so busy before reacting.'],
      ['replace', 'invest', C.name + '\'s surge is ' + B.name + '\'s overflow. Replace the {equipment}.']];
  }

  {
    const ev = ['mat', 'note.mix', 'ap.var', 'ap.total', 'ap.lock', 'ap.mix', 'eml.price', 'cal.contract'];
    findings.push({ id: 'F4', loc: null, urgency: 0.6, impact: 0.7, topic: 'Purchasing',
      title: '{supplier} has been billing above contract for six weeks.',
      short: M ? 'a billing variance spread thin across every {unit}' : 'a billing variance hiding inside the {materials} line',
      finding: '{Materials} cost is up ' + V.matUp.toFixed(1) + ' points' + (M ? ' across the company' : '') + '. It has been explained as mix.',
      connection: 'Mix accounts for ' + V.mix.toFixed(1) + ' of the ' + V.matUp.toFixed(1) + ' points. Invoice prices on the top 40 items rose ' + (V.vr * 100).toFixed(1) + '% the same week {supplier} sent an updated price list. The contract locks rates through ' + lockDate + '.',
      interpretation: (M ? 'This is a billing variance, spread thinly enough across ' + N + ' {units} that no single manager would notice it. ' : 'This is a billing variance, not a usage problem. ') + money(V.over) + ' has been paid above contract so far. At this rate it is about ' + money(V.annual) + ' a year.',
      action: 'Dispute the invoices back to the effective date and recover the overage. Hold {supplier} to the contract price list.',
      core: ['mat', 'ap.var', 'ap.lock'], evidence: ev, rootConcepts: ['supplier', 'financial'],
      whyFirst: 'The cost increase is recoverable under the contract. Raising prices or trimming usage leaves the overbilling in place.' });
    content.briefing.F4 = { headline: '{supplier} is billing ' + (V.vr * 100).toFixed(1) + '% over contract.',
      why: 'The {materials} increase was read as product mix. Mix explains ' + V.mix.toFixed(1) + ' of the ' + V.matUp.toFixed(1) + ' points. Prices jumped the week a new price list arrived, and the contract locks rates through ' + lockDate + '.',
      keys: ['ap.var', 'ap.mix', 'eml.price', 'mat'], action: 'Dispute six weeks of invoices and recover ' + money(V.over) + '.', owner: [ctrl], check: 'Credit issued. Contract pricing restored.',
      onIt: 'Sending them the contract clause and six weeks of invoices today.' };
    const priceVoice = D ? d : locations[0].manager;
    content.reactions.F4 = {
      aligned: [[ctrl, 'The contract locks pricing through ' + lockDate.split(' ')[0] + '. I\'ll dispute the invoices today.']],
      raiseprice: [[priceVoice, 'Our {customers} will notice a price increase. Is that our only option?']],
      cut: [[ctrl, 'Usage is normal. The increase is in the price, not the volume.']],
      freeze: [[ctrl, 'Freezing spend won\'t touch it. The increase is in the price we\'re paying.']],
      partial: [[ctrl, 'I had it down as product mix. I\'ll go through the invoices this week.']],
      unclear: [[ctrl, 'I had it down as product mix. What do you want me to do with it?']] };
    content.week.F4 = { label: '{supplier} · invoices',
      aligned: [money(V.over) + ' credited Thursday. Contract pricing restored.', 'up'],
      partial: ['Invoices under review. Another ' + money(V.overWeek) + ' billed over contract.', 'flat'],
      raiseprice: ['Prices up 2%. {Customers} noticed. Still billed over contract.', 'down'],
      cut: ['Usage tightened. Cost unchanged. Still billed over contract.', 'flat'],
      freeze: ['Spending frozen. Still billed over contract.', 'flat'],
      unclear: ['Filed as mix. Another ' + money(V.overWeek) + ' billed over contract.', 'flat'],
      untouched: ['Another ' + money(V.overWeek) + ' billed over contract.', 'flat'] };
    content.context.F4 = 'the {materials} cost line and the contract\'s rate lock';
    content.quiet.F4 = 'ap.var';
    content.answers.F4 = [
      ['raiseprice', 'pricing', '{Materials} costs are up. Raise prices two percent to protect margin.'],
      ['cut', 'cost', 'Tighten {materials} usage everywhere until the cost line comes down.'],
      ['investigate', 'analyze', 'Have ' + F(ctrl) + ' review the cost increase line by line.'],
      ['dispute', 'process', 'Prices rose above contract. Dispute the invoices and recover the overage.']];
  }

  if (D) {
    const ev = [...keepOpt('F3', 'rev', D), 'promo', L_('newc', D), L_('repeat', D), ...keepOpt('F3', 'ticket', D), L_('fu', D), 'msg.desk', ...keepOpt('F3', 'deskreq', D), ...keepOpt('F3', 'csat', D)];
    const revD = o('F3', 'rev'), csD = o('F3', 'csat');
    const lead = revD ? (M ? D.name + '\'s revenue' : 'Revenue') + ' is up ' + ((D.n.rev / D.b.rev - 1) * 100).toFixed(1) + '%' + (csD ? ' and satisfaction is steady at ' + D.n.csat.toFixed(1) : '') + '. Underneath, returning' : 'Returning';
    findings.push({ id: 'F3', loc: D.id, urgency: 0.55, impact: 0.8, topic: '{Customers}',
      title: M ? D.name + ' is growing and losing its regulars at the same time.' : 'You are growing and losing your regulars at the same time.',
      short: 'new {customers} from the offer are covering for regulars who stopped coming back',
      finding: lead + ' {customers} have fallen from ' + D.b.repeat + '% to ' + D.n.repeat + '% in eight weeks.',
      connection: 'The intro offer brought in ' + D.n.newc + ' new {customers}, enough to cover for the regulars who stopped coming back. Completion of {followup} fell from ' + D.b.fu + '% to ' + D.n.fu + '% when the {desk} left ' + WORDS[V.deskWeeks] + ' weeks ago.' + (o('F3', 'deskreq') ? ' That role has been open ' + V.deskWeeks * 7 + ' days.' : ''),
      interpretation: 'The headline number is being held up by discounted first visits' + (o('F3', 'ticket') ? ', and revenue per {visit} is down ' + ((1 - D.n.ticket / D.b.ticket) * 100).toFixed(1) + '%' : '') + '. When the offer ends, the gap in returning {customers} shows up all at once' + (M ? ', in the {unit} everyone assumes is fine.' : '.'),
      action: 'Restart {followup} this week with cover from the central office. Fill the {desk} role. Judge the offer on second visits before extending it.',
      core: [L_('repeat', D), L_('fu', D), 'promo'], evidence: ev, rootConcepts: ['customer', 'staffing'],
      whyFirst: 'The offer is working as an offer. The regulars are the revenue, and they are the ones leaving.' });
    content.briefing.F3 = { headline: M ? D.name + ' is losing its regulars behind a record month.' : 'You are losing your regulars behind a record month.',
      why: 'New {customers} from the intro offer hide a ' + (D.b.repeat - D.n.repeat) + ' point drop in returning {customers}. {Followup} stopped when the {desk} left ' + WORDS[V.deskWeeks] + ' weeks ago.',
      keys: [L_('repeat', D), L_('fu', D), 'promo', o('F3', 'deskreq') ? L_('deskreq', D) : L_('newc', D)],
      action: 'Restart {followup} this week with cover from the central office.', owner: [d], check: 'Follow-up completion back over 70%.',
      onIt: 'Central office covers the calls until the desk is filled. Got it.' };
    content.reactions.F3 = {
      aligned: [[d, 'We stopped making those calls when ' + V.leaver + ' left. I\'ll get them going again.']],
      promoMore: [[d, 'The offer fills the book, but our regulars are coming back less. More discounts won\'t fix that.']],
      promoStop: [['marketing', 'If we end it, new {customers} drop. Is that really the problem?']],
      recognize: [[d, 'Thank you. Between us, fewer regulars are coming back than before.']],
      partial: [['marketing', 'I can pull the second-visit numbers. Give me a few days.']],
      unclear: [[d, 'We\'re having a record month. What do you want changed?']] };
    const calls = R.i(110, 170);
    content.week.F3 = { label: M ? D.name + ' · regulars' : 'Regulars',
      aligned: [calls + ' follow-up calls made. ' + Math.round(calls * R.u(0.24, 0.3)) + ' regulars rebooked.', 'up'],
      partial: ['Second-visit numbers due next week. Returning slips to ' + (D.n.repeat - 1) + '%.', 'flat'],
      promoMore: [(M ? 'Offer rolled out everywhere.' : 'Offer extended.') + ' Returning drops to ' + (D.n.repeat - 2) + '%.', 'down'],
      promoStop: ['Offer ended. New {customers} fell. Regulars still not back.', 'down'],
      recognize: ['Another record week. Returning slips to ' + (D.n.repeat - 1) + '%.', 'flat'],
      unclear: ['Another record week. Returning slips to ' + (D.n.repeat - 1) + '%.', 'flat'],
      untouched: ['Another record week. Returning slips to ' + (D.n.repeat - 1) + '%.', 'flat'] };
    content.context.F3 = 'the drop in returning {customers} and the open {desk} role';
    content.quiet.F3 = L_('fu', D);
    content.answers['F3.grow'] = [
      ['promoMore', 'growth', M ? 'The offer is working. Roll it out to every {unit} next month.' : 'The offer is working. Extend it and push it harder next month.'],
      ['recognize', 'people', 'Record month' + atL(D) + '. Recognize ' + F(d) + ' and the team publicly.'],
      ['investigate', 'analyze', 'Check whether new {customers} come back before extending the offer.'],
      ['followup', 'process', 'Regulars are slipping behind the new faces. Restart {followup} now.']];
    content.answers['F3.keep'] = [
      ['promoMore', 'growth', 'Fewer regulars returning. Run a win-back discount for lapsed {customers}.'],
      ['hire', 'invest', 'Fill the open {desk} role' + atL(D) + ' right away.'],
      ['investigate', 'analyze', 'Have ' + F('marketing') + ' pull second-visit data and explain the drop.'],
      ['followup', 'process', '{Followup} stopped. Cover the calls from the central office this week.']];
  }

  if (E) {
    const ev = [L_('exits', E), L_('exitnote', E), L_('post', E), 'msg.sat', ...keepOpt('F5', 'ot', E), ...keepOpt('F5', 'labor', E), ...keepOpt('F5', 'train', E), ...keepOpt('F5', 'req', E)];
    findings.push({ id: 'F5', loc: E.id, urgency: 0.5, impact: 0.5, topic: 'People',
      title: M ? E.name + ' is losing new hires because of when the schedule goes out.' : 'New hires are leaving because of when the schedule goes out.',
      short: 'late schedules are driving the exits, and each exit makes the schedule later',
      finding: 'Three people have resigned' + atL(E) + ' in five weeks. All three were within 90 days of hire.',
      connection: 'Schedules' + (M ? ' there' : '') + ' are posted ' + E.n.post.toFixed(1) + ' days ahead. The company standard is 7. Two of the three exit notes cite it. ' + F(e) + ' is covering shifts personally' + (o('F5', 'ot') ? ', overtime has more than doubled' : '') + (o('F5', 'train') ? ', and training completion is at ' + E.n.train + '%' : '') + '.',
      interpretation: 'This is early, and it compounds. Each exit makes the schedule harder to build, which makes it later, which drives the next exit. Pay and hiring speed are not what is holding ' + (M ? E.name : 'the team') + ' back.',
      action: 'Require schedules a week ahead' + atL(E) + ' and give ' + F(e) + ' help for two weeks to get there. Then revisit the open roles.',
      core: [L_('exits', E), L_('post', E), L_('exitnote', E)], evidence: ev, rootConcepts: ['scheduling', 'staffing', 'management'],
      whyFirst: 'The exits trace to schedule notice. More pay or more requisitions feed the same loop.' });
    content.briefing.F5 = { headline: M ? E.name + '\'s new hires are quitting over late schedules.' : 'New hires are quitting over late schedules.',
      why: 'Three exits in five weeks, all new hires. Two of three exit notes cite schedules posted ' + E.n.post.toFixed(1) + ' days ahead. The standard is seven.',
      keys: [L_('exits', E), L_('exitnote', E), L_('post', E), o('F5', 'ot') ? L_('ot', E) : 'msg.sat'],
      action: 'Post schedules a week ahead. Give ' + F(e) + ' help for two weeks to get there.', owner: [e], check: 'Next two weeks posted by Thursday.',
      onIt: 'Two weeks posted by Thursday. I\'d love the help.' };
    content.reactions.F5 = {
      aligned: [[e, 'If I can post a week ahead, people stay. I\'d love the help.']],
      pay: [['hr', 'Pay isn\'t what the exit notes say. Two of three cite late schedules.']],
      hire: [['hr', 'We can hire faster, but they\'re leaving within 90 days.']],
      partial: [['hr', 'I\'ll pull the exit notes together and get back to you.']],
      unclear: [[e, 'I\'m doing my best out here. What do you need from me?']] };
    content.week.F5 = { label: M ? E.name + ' · new hires' : 'New hires',
      aligned: ['Two weeks of schedules posted. No new exits.', 'up'],
      partial: ['Exit notes reviewed. A fourth new hire gives notice.', 'down'],
      pay: ['Pay up a dollar. Schedule still late. A fourth hire quits.', 'down'],
      hire: ['More roles opened. A fourth hire quits.', 'down'],
      unclear: [F(e) + ' covered two more shifts personally. A fourth hire quits.', 'down'],
      untouched: ['A fourth new hire gives notice Friday.', 'down'] };
    content.context.F5 = 'the exit notes and ' + F(e) + ' covering shifts';
    content.quiet.F5 = L_('exitnote', E);
    content.answers.F5 = [
      ['pay', 'invest', 'New hires keep quitting. Raise starting pay' + atL(E) + ' by a dollar.'],
      ['hire', 'invest', 'Open more roles' + atL(E) + ' so the team is never short again.'],
      ['investigate', 'analyze', 'Have ' + F('hr') + ' interview the leavers and report what\'s driving it.'],
      ['posting', 'process', 'Schedules go out too late. Require posting a full week ahead.']];
  }

  // false alarms: what the room says, and what you might decide
  content.reactions.falseAlarm = {};
  if (X) {
    content.reactions.falseAlarm['rev.' + X.id] = [[x, 'We were closed ' + V.closureDay + ' for ' + closure[0] + '. Per open day we were up ' + (V.perDay * 100).toFixed(1) + '%.']];
    content.reactions.falseAlarm['labor.' + X.id] = [[x, 'Same staff, one less open day because of the ' + closure[1] + '. It\'s back to normal.']];
    content.answers.FAX = [
      ['support', 'people', (M ? X.name + ' had' : 'We had') + ' a soft week. Ask ' + F(x) + ' for a recovery plan.'],
      ['cut', 'cost', 'Revenue is down' + atL(X) + '. Cut hours until sales recover.'],
      ['investigate', 'analyze', 'Check with ' + F(x) + ' what happened last week before acting.'],
      ['investigate', 'wait', 'Probably a one-off. Watch it again next week.']];
  }
  if (wantCash) {
    content.reactions.falseAlarm.cash = [[ctrl, 'That\'s the annual insurance premium. It went out on schedule Thursday.']];
    content.answers.FAcash = [
      ['freeze', 'cost', 'Cash dropped fast. Freeze discretionary spending until we know why.'],
      ['freeze', 'cost', 'Hold this week\'s vendor payments to protect the cash balance.'],
      ['investigate', 'analyze', 'Ask ' + F(ctrl) + ' what drove the cash drop this week.'],
      ['investigate', 'wait', 'Likely a timing item. Confirm with ' + F(ctrl) + ' and move on.']];
  }
  if (Y) content.reactions.falseAlarm['eml.angry'] = [[y, 'I refunded them Friday and called. It\'s one complaint. Our scores are steady.']];
  content.reactions.noise = [['opsdir', 'Is this one really a priority for this week?']];
  content.reactions.noOwner = ['opsdir', 'Who\'s taking this one?'];
  content.reactions.vague = ['analyst', 'What does done look like? Which number are we watching?'];

  // noise: a calm set of answers for anything that isn't part of a story
  const NOISE_OWNER = { finance: ctrl, labor: 'analyst', operations: 'opsdir', customer: 'marketing', maintenance: 'opsdir', people: 'hr', purchasing: ctrl, general: 'opsdir' };
  const noiseSet = (cat, L) => {
    const who = L ? L.manager : NOISE_OWNER[cat];
    return [
      ['investigate', 'wait', 'Within the normal range. Keep an eye on it next week.'],
      ['investigate', 'analyze', 'Ask ' + F(who) + ' for the detail behind this number' + (L ? atL(L) : '') + '.'],
      cat === 'maintenance' ? ['repair', 'cost', 'Get it serviced this week before it turns into a problem.'] : ['cut', 'cost', 'Tighten spending here before this turns into a trend.'],
      ['support', 'people', 'Raise it at the meeting and hear what the managers think.']];
  };

  // which answers go with which data point
  const ansKey = {};
  const F1cost = ['labor', 'ot', 'util', 'rev', 'thru', 'sched'];
  const keyAnswers = () => { for (const s of Object.values(S)) {
    const L = s.loc ? locations.find((l) => l.id === s.loc) : null;
    const parts = s.id.split('.'), m = parts[0];
    const ownerOf = L && parts.length === 2 && parts[1] === L.id ? owner(L, m) : null;
    let k = null;
    if (s.id === 'cash' && wantCash) k = 'FAcash';
    else if (ownerOf === 'FAX' && (m === 'rev' || m === 'labor')) k = 'FAX';
    else if (ownerOf === 'F1' || s.id === 'sched.' + (A && A.id)) k = F1cost.includes(m) ? 'F1.cost' : 'F1.cx';
    else if (ownerOf === 'F2' || (B && [L_('wo', B), L_('down', B), L_('age', B)].includes(s.id))) k = ['rev', 'util', 'thru'].includes(m) ? 'F2.rev' : 'F2.eq';
    else if (ownerOf === 'F2p') k = 'F2.p';
    else if (ownerOf === 'F3' || (D && m === 'deskreq')) k = ['rev', 'newc', 'ticket'].includes(m) ? 'F3.grow' : 'F3.keep';
    else if (ownerOf === 'F5' || (E && m === 'exitnote')) k = 'F5';
    else if (['mat', 'ap.var', 'ap.total', 'ap.lock', 'ap.mix'].includes(s.id)) k = 'F4';
    if (!k || !content.answers[k]) { k = 'noise.' + s.cat + (L ? '.' + L.id : ''); if (!content.answers[k]) content.answers[k] = noiseSet(s.cat, L); }
    ansKey[s.id] = k;
  } };

  // ------------------------------------------------ sources: reports
  const runAt = dShort(monday) + ', 6:10 AM';
  const weekEnd = dShort(dayOf(-1));
  const cellOf = (id, part = 'cell', tone, short) => { const s = S[id]; let t = part === 'cell' ? (s.cell || s.value) : s[part]; if (short && t) t = t.replace(/^(norm|was|target|standard is)\s+/i, '').replace(/ (a year ago|eight weeks ago)$/, ''); return { t: t || '', s: id, tone: tone && /^-/.test(t) ? 'neg' : '' }; };
  // A table with one row per location, or, for a single location, one row per measure.
  function byLoc(cols, opts = {}) {
    if (M) {
      const rows = locations.map((L) => ({ cells: [{ t: L.name }].concat(cols.map((c) => c.fn ? c.fn(L) : cellOf(c.m + '.' + L.id, c.part || 'cell', c.tone, c.part === 'delta'))) }));
      if (opts.total) rows.push({ total: true, cells: [{ t: 'Total' }].concat(opts.total) });
      return { cols: ['Location'].concat(cols.map((c) => c.h)), rows };
    }
    const L = locations[0], seenM = new Set(), rows = [];
    for (const c of cols) {
      if (c.fn) { rows.push({ cells: [{ t: c.h }, c.fn(L), { t: '' }] }); continue; }
      if (seenM.has(c.m)) continue; seenM.add(c.m);
      const id = c.m + '.' + L.id;
      rows.push({ cells: [{ t: c.single || c.h }, cellOf(id), cellOf(id, 'delta', c.tone)] });
    }
    return { cols: ['', 'This week', 'Compared with'], rows };
  }
  const kv = (rows, cols = ['', 'This week', 'Compared with']) => ({ cols, rows: rows.map(([label, id]) => ({ cells: [{ t: label }, cellOf(id), cellOf(id, 'delta')] })) });
  const revSum = locations.reduce((n, L) => n + L.n.rev, 0), revBase = locations.reduce((n, L) => n + L.b.rev, 0);
  const laborAvg = locations.reduce((n, L) => n + L.n.labor * L.n.rev, 0) / revSum, laborBase = locations.reduce((n, L) => n + L.b.labor * L.b.rev, 0) / revBase;
  const lines = (blocks) => [...new Set(blocks.flatMap((b) => b.rows.flatMap((r) => r.cells.map((c) => c.s).filter(Boolean))))];

  const sources = {};
  const report = (id, o2) => { const blocks = o2.blocks.filter(Boolean); sources[id] = { id, kind: 'report', when: 'Mon 6:10 AM', run: runAt, ...o2, blocks, lines: lines(blocks) }; };

  report('rep_fin', { from: ctrl, title: 'Weekly flash', sub: 'Revenue, labor, {materials}, cash', cat: 'finance', volume: 140 + N * 46, system: 'Accounting',
    intro: 'Week ending ' + weekEnd + '. Compared with the trailing eight week average.',
    blocks: [
      { title: M ? 'By location' : 'Results', ...byLoc([
        { h: 'Revenue', m: 'rev' }, { h: 'vs avg', m: 'rev', part: 'delta', tone: true },
        { h: 'Labor % of rev', single: 'Labor, % of revenue', m: 'labor' }, { h: 'vs avg', m: 'labor', part: 'delta' },
        { h: 'Rev per {visit}', single: 'Revenue per {visit}', m: 'ticket' }, { h: 'vs avg', m: 'ticket', part: 'delta', tone: true },
      ], { total: [{ t: kmoney(revSum) }, { t: pct1(revSum / revBase - 1), tone: revSum < revBase ? 'neg' : '' }, { t: laborAvg.toFixed(1) + '%' }, { t: pts(laborAvg - laborBase) }, { t: '' }, { t: '' }] }) },
      { title: 'Company lines', ...kv([['{Materials} cost, % of revenue', 'mat'], ['Utilities, % of revenue', 'utilities'], ['Uniforms and laundry', 'uniform'], ['Operating cash', 'cash']]) },
    ] });

  const changeLog = [];
  const logRow = (date, L, change, by, s) => changeLog.push({ cells: [{ t: dNum(date) }, { t: M ? (L ? L.name : 'All') : '' }, { t: change, s }, { t: by, s }] });
  const noiseChanges = R.shuffle([
    'Added a Saturday opener', 'Swapped two closing shifts', 'Moved inventory count to Thursday', 'Split one double shift', 'Extended Friday close by 30 minutes', 'Added on-call coverage for Sunday',
  ]).slice(0, R.i(3, 4));
  const changeDates = [];
  if (A) changeDates.push([dayOf(-7 * V.f1Weeks - 3), A, 'Template: {lead} coverage block moved to ' + offPeaks, F(a), 'sched.' + A.id]);
  for (const ch of noiseChanges) { const L = R.pick(locations); sig('chg.' + changeDates.length, { loc: L.id, cat: 'labor', label: lab(L, ch.toLowerCase()), value: '' }); changeDates.push([dayOf(-R.i(3, 40)), L, ch, F(L.manager), 'chg.' + changeDates.length]); }
  changeDates.sort((p, q) => q[0] - p[0]).forEach(([dt, L, ch, by, s]) => logRow(dt, L, ch, by, s));

  report('rep_labor', { from: 'analyst', title: 'Labor and scheduling', sub: 'Hours, overtime, how the time was used', cat: 'labor', volume: 420 + N * 260, system: 'Payroll + scheduling',
    intro: 'Payroll week ending ' + weekEnd + '. Norms are the trailing eight weeks.',
    blocks: [
      { title: 'Hours', ...byLoc([{ h: 'Paid hours', m: 'hrs' }, { h: 'Overtime hrs', single: 'Overtime hours', m: 'ot' }, { h: 'OT norm', m: 'ot', part: 'delta' }, { h: 'Productive share', single: 'Productive share of paid hours', m: 'util' }, { h: 'Norm', m: 'util', part: 'delta' }]) },
      { title: 'Next schedule posted', note: 'Company standard: 7 days ahead.', ...byLoc([{ h: 'Days ahead', single: 'Days posted ahead', m: 'post' }]) },
      { title: 'Schedule change log, last six weeks', cols: ['Date', M ? 'Location' : '', 'Change', 'By'], rows: changeLog },
      { title: 'Company', ...kv([['Shift swaps', 'swap']]) },
    ] });

  report('rep_ops', { from: 'analyst', title: 'Throughput and wait', sub: 'How much got done and how long people waited', cat: 'operations', volume: 600 + N * 380, system: SD.system,
    intro: 'Week ending ' + weekEnd + ', from the ' + SD.system.toLowerCase() + '. Norms are each {unit}\'s twelve week average.',
    blocks: [
      { title: 'Volume and throughput', ...byLoc([{ h: '{Visits}', m: 'vol' }, { h: 'vs avg', m: 'vol', part: 'delta' }, { h: 'Per staffed hr', single: 'Throughput per staffed hour', m: 'thru' }, { h: 'Open days', single: 'Open days', m: 'days' }]) },
      { title: 'Waiting and timing', ...byLoc([{ h: 'Avg wait (min)', single: '{WaitLabel}', m: 'wait' }, { h: 'Norm', m: 'wait', part: 'delta' }, { h: 'Share ' + peakTime, single: '{Visits} ' + peakTime, m: 'pm' }, { h: 'Year ago', m: 'pm', part: 'delta' }, { h: 'Turned away', single: 'Turned away or referred out', m: 'turned' }]) },
      { title: 'Company', ...kv([['No-show rate', 'noshow']]) },
    ] });

  const reviewQuotes = [];
  if (A) reviewQuotes.push([2, A, 'Waited almost 40 minutes past my time. Nobody said anything until I asked.', 'reviews.' + A.id], [3, A, 'Good people, but the ' + peak + ' wait is getting ridiculous.', 'reviews.' + A.id]);
  const happy = ['Friendly team, quick and easy. Will be back.', 'Always reliable. Explained everything clearly.', 'Clean, organized, and on time.', 'Best in the area. Been coming for years.'];
  for (let i = 0; i < 3; i++) { const L = R.pick(locations); reviewQuotes.push([5, L, happy[i], 'reviews.' + L.id]); }
  const reviewRows = R.shuffle(reviewQuotes).map(([stars, L, q, s], i) => ({ cells: [{ t: '★'.repeat(stars) + '☆'.repeat(5 - stars) }, { t: M ? L.name : '' }, { t: dNum(dayOf(-1 - i * 2)) }, { t: '"' + q + '"', s }] }));
  report('rep_cx', { from: 'marketing', title: '{Customers}', sub: 'Satisfaction, who comes back, what they say', cat: 'customer', volume: 120 + N * 90, system: 'CRM + reviews',
    intro: 'Last 30 days compared with the prior 90.',
    blocks: [
      { title: 'Satisfaction and return', ...byLoc([{ h: 'Satisfaction', m: 'csat' }, { h: 'Prior', m: 'csat', part: 'delta' }, { h: 'Returning', single: 'Returning {customers}', m: 'repeat' }, { h: 'Prior', m: 'repeat', part: 'delta' }, { h: 'New, 4 wks', single: 'New {customers}, four weeks', m: 'newc' }]) },
      { title: '{Followup}', ...byLoc([{ h: 'Completed', single: '{Followup} completed', m: 'fu' }, { h: 'Prior', m: 'fu', part: 'delta' }]) },
      { title: 'Review themes, last 30 days', ...byLoc([{ h: 'Mention the wait', m: 'reviews' }, { h: 'Formal complaints', m: 'complaints' }]) },
      { title: 'Recent reviews', cols: ['Rating', M ? 'Location' : '', 'Date', 'Excerpt'], rows: reviewRows },
      { title: 'Company', ...kv([['Social followers', 'social']]) },
    ] });

  const woRows = [];
  let wo = 4100 + R.i(0, 800);
  const woAdd = (date, L, asset, status, notes, s) => woRows.push({ cells: [{ t: 'WO-' + (wo += R.i(3, 19)) }, { t: M ? L.name : '' }, { t: asset }, { t: dNum(date) }, { t: status }, { t: notes, s }] });
  const woList = [];
  if (B) [[-40, 'Fault code, would not cycle. Reset and replaced sensor.'], [-23, 'Same fault. Replaced control board.'], [-9, 'Intermittent stop. Re-seated wiring harness.']].forEach(([dd, nt]) => woList.push([dayOf(dd), B, '{Equipment}', 'Closed, repaired', nt, 'wo.' + B.id]));
  const noiseWO = [['HVAC filters', 'Open, 9 days overdue', 'Quarterly filter change', 'hvac'], ['Parking lot', 'Scheduled', 'Resurfacing, Sunday', 'lot'], ['Entry door sensor', 'Closed', 'Replaced sensor', 'door'], ['Water heater', 'Closed', 'Pilot relit', 'heater'], ['Exterior lighting', 'Open', 'Two fixtures out', 'light']];
  for (const [asset, st, nt, k] of R.shuffle(noiseWO).slice(0, R.i(3, 4))) { const L = R.pick(locations); sig('wo.n.' + k, { loc: L.id, cat: 'maintenance', label: lab(L, asset.toLowerCase()), value: st.toLowerCase() }); woList.push([dayOf(-R.i(2, 30)), L, asset, st, nt, 'wo.n.' + k]); }
  woList.sort((p, q) => q[0] - p[0]).forEach((w) => woAdd(...w));
  const downRows = [];
  if (B) downRows.push({ cells: [{ t: '{Equipment}' }, { t: M ? B.name : '' }, cellOf('down.' + B.id), cellOf('down.' + B.id, 'delta'), cellOf('age.' + B.id), cellOf('age.' + B.id, 'delta')] });
  for (const L of R.shuffle(locations).slice(0, Math.min(2, N))) {
    const k = 'dn.' + L.id; const hrs = R.i(0, 4);
    sig(k, { loc: L.id, cat: 'maintenance', label: lab(L, 'main equipment downtime'), value: hrs + ' hours', delta: 'norm 3' });
    downRows.push({ cells: [{ t: R.pick(['Main unit', 'Compressor', 'Backup unit']) }, { t: M ? L.name : '' }, { t: hrs + ' hours', s: k }, { t: 'norm 3', s: k }, { t: R.i(2, 8) + ' years', s: k }, { t: 'rated life 10', s: k }] });
  }
  report('rep_mnt', { from: 'opsdir', title: 'Maintenance log', sub: 'Work orders and downtime', cat: 'maintenance', volume: 18 + N * 7, system: 'Maintenance',
    intro: 'Work orders opened or closed in the last six weeks.',
    blocks: [
      { title: 'Work orders', cols: ['WO', M ? 'Location' : '', 'Asset', 'Opened', 'Status', 'Notes'], rows: woRows },
      { title: 'Equipment downtime, last 14 days', cols: ['Asset', M ? 'Location' : '', 'Hours down', 'Norm', 'Age', 'Rated life'], rows: downRows },
      { title: 'Company', ...kv([['Preventive maintenance completed', 'pmc']]) },
    ] });

  const itemRows = R.shuffle(SD.items).slice(0, 5).map(([name, price]) => {
    const inv = price * (1 + V.vr * R.u(0.8, 1.2)), qty = Math.round(R.u(40, 180) * N);
    return { cells: [{ t: name, s: 'ap.var' }, { t: '$' + price.toFixed(2), s: 'ap.var' }, { t: '$' + inv.toFixed(2), s: 'ap.var' }, { t: pct1(inv / price - 1), s: 'ap.var' }, { t: String(qty), s: 'ap.var' }, { t: money((inv - price) * qty), s: 'ap.var' }] };
  });
  report('rep_ap', { from: ctrl, title: 'Purchasing and invoices', sub: 'What was bought and what it cost', cat: 'purchasing', volume: 110 + N * 36, system: 'Purchasing',
    intro: 'Six weeks of invoices matched against contract terms.',
    blocks: [
      { title: 'Suppliers against contract', cols: ['', 'Six weeks', 'Note'], rows: [
        { cells: [{ t: '{supplier}' }, cellOf('ap.var'), cellOf('ap.var', 'delta')] },
        { cells: [{ t: 'All other suppliers' }, cellOf('ap.other'), { t: '' }] },
        { cells: [{ t: 'Freight surcharges' }, cellOf('ap.freight'), cellOf('ap.freight', 'delta')] },
        { cells: [{ t: 'Purchase volume' }, cellOf('ap.vol'), cellOf('ap.vol', 'delta')] },
      ] },
      { title: '{supplier}, top items by spend', cols: ['Item', 'Contract', 'Invoiced', 'Var', 'Qty', 'Over contract'], rows: itemRows },
      { title: 'Summary', cols: ['', '', ''], rows: [
        { cells: [{ t: 'Paid above contract, six weeks' }, cellOf('ap.total'), cellOf('ap.total', 'delta')] },
        { cells: [{ t: 'Contract rate lock' }, cellOf('ap.lock'), { t: '' }] },
        { cells: [{ t: '{Materials} increase explained by mix' }, cellOf('ap.mix'), { t: '' }] },
      ] },
    ] });

  const exitRows = [];
  const tenure = (dd) => Math.round(dd / 7) + ' wks';
  if (E) {
    const notes = R.shuffle([['"Never knew my hours until the day before."', true], ['"Couldn\'t plan childcare around the schedule."', true], ['"Found something closer to home."', false]]);
    notes.forEach(([nt, sched], i) => { const hired = R.i(45, 85), left = R.i(3, 33); exitRows.push({ cells: [{ t: R.pick(FIRST) + ' ' + R.pick(LAST).charAt(0) + '.' }, { t: M ? E.name : '' }, { t: '{Frontline}' }, { t: dNum(dayOf(-left)) }, { t: tenure(hired - left) }, { t: nt, s: sched ? 'exitnote.' + E.id : 'exits.' + E.id }] }); void i; });
  }
  for (const L of locations) if (L !== E && L.n.exits > 0) { const k = 'ex.' + L.id; sig(k, { loc: L.id, cat: 'people', label: lab(L, 'resignation'), value: 'one' }); exitRows.push({ cells: [{ t: R.pick(FIRST) + ' ' + R.pick(LAST).charAt(0) + '.' }, { t: M ? L.name : '' }, { t: R.pick(['{Frontline}', 'Front desk', 'Assistant manager']) }, { t: dNum(dayOf(-R.i(3, 33))) }, { t: R.i(2, 6) + ' yrs' }, { t: R.pick(['"Relocating out of state."', '"Going back to school."', '"Took a role closer to family."']), s: k }] }); }
  const roleRows = [];
  if (D) roleRows.push({ cells: [{ t: '{Desk}' }, { t: M ? D.name : '' }, cellOf('deskreq.' + D.id), { t: R.pick(['Two candidates in process', 'Interviewing today']) }] });
  for (const L of locations) for (let i = 0; i < L.n.req; i++) { const k = 'role.' + L.id + '.' + i; sig(k, { loc: L.id, cat: 'people', label: lab(L, 'open {frontline} role'), value: 'open ' + (L.n.reqDays + i * 4) + ' days' }); roleRows.push({ cells: [{ t: '{Frontline}' }, { t: M ? L.name : '' }, { t: 'open ' + (L.n.reqDays + i * 4) + ' days', s: k }, { t: R.pick(['Posted', 'Screening', 'Offer out']) }] }); }
  report('rep_hr', { from: 'hr', title: 'People', sub: 'Headcount, hires, exits, open roles, training', cat: 'people', volume: 30 + N * 11, system: 'HR system',
    intro: 'Changes in the last five weeks.',
    blocks: [
      { title: 'Headcount', ...byLoc([{ h: 'Headcount', m: 'hc' }, { h: 'Hires', single: 'Hires, five weeks', m: 'hires' }, { h: 'Exits', single: 'Resignations, five weeks', m: 'exits' }, { h: 'Open roles', m: 'req' }, { h: 'Training done', single: 'Training completed', m: 'train' }, { h: 'Transfer requests', m: 'transfer' }]) },
      exitRows.length ? { title: 'Resignations', cols: ['Employee', M ? 'Location' : '', 'Role', 'Last day', 'Tenure', 'Exit note'], rows: exitRows } : null,
      roleRows.length ? { title: 'Open roles', cols: ['Role', M ? 'Location' : '', 'Open', 'Status'], rows: roleRows } : null,
      { title: 'Company', ...kv([['Turnover, annualized', 'turnco'], ['Time off requests pending', 'pto']]) },
    ] });

  // ------------------------------------------------ sources: locations
  const SCORE = [['rev', 'Revenue'], ['labor', 'Labor, % of revenue'], ['ot', 'Overtime hours'], ['wait', '{WaitLabel}, min'], ['csat', 'Satisfaction'], ['repeat', 'Returning {customers}'], ['thru', 'Throughput'], ['exits', 'Resignations, 5 wks']];
  const notes = {};
  for (const L of locations) notes[L.id] = R.pick(['Steady week. Nothing to flag.', 'Good week overall. Team is in a good rhythm.', 'Normal week. Working on the summer schedule.', 'Quiet week. Getting caught up on training.']);
  if (D) notes[D.id] = 'Busiest month we\'ve had. The intro offer keeps the book full. Still short at the desk since ' + V.leaver + ' left, but we\'re managing.';
  if (E) notes[E.id] = 'Short again. I covered Saturday myself. Next week\'s schedule is coming, I promise.';
  if (C) notes[C.id] = 'Record week. The team is proud and a little worn out.';
  if (B) notes[B.id] = 'The {equipment} has been in and out. Every time it gets fixed it holds for a week or so.' + (partner ? ' We send work to ' + C.name + ' when it\'s down.' : '');
  if (X) notes[X.id] = 'Lost ' + V.closureDay + ' to ' + closure[0] + '. Otherwise a normal week.';
  if (A) notes[A.id] = 'We\'re stretched. ' + cap(peaks) + ' are brutal and I\'m burning overtime to get through them. I need two more people.';
  const pins = [];
  for (const L of locations) {
    const ids = SCORE.map(([m]) => m + '.' + L.id);
    sources['loc_' + L.id] = { id: 'loc_' + L.id, kind: 'location', loc: L.id, from: L.manager, when: 'Mon 6:10 AM', title: M ? L.name : company, cat: 'location', volume: 0,
      sub: [L.tag, 'Opened ' + L.opened, L.staff + ' people'].filter(Boolean).join(' · '), address: L.street, note: notes[L.id],
      tiles: SCORE.map(([m, label]) => ({ label, id: m + '.' + L.id })), lines: ids };
  }
  // map positions: spread across the town, clear of the river and of each other
  const slots = R.shuffle([[14, 30], [38, 22], [63, 32], [86, 24], [24, 52], [50, 48], [77, 56], [12, 62], [90, 44]]);
  locations.forEach((L, i) => pins.push({ id: L.id, x: slots[i][0] + R.u(-2, 2), y: slots[i][1] + R.u(-2, 2) }));
  if (!M) pins[0] = { id: locations[0].id, x: 50, y: 48 };
  if (M) sources.loc_all = { id: 'loc_all', kind: 'location', loc: null, from: null, when: 'Mon 6:10 AM', title: 'All locations side by side', cat: 'location', volume: 0,
    sub: 'This week, every {unit}', rows: SCORE.map(([m, label]) => ({ label, ids: locations.map((L) => m + '.' + L.id) })), lines: SCORE.flatMap(([m]) => locations.map((L) => m + '.' + L.id)) };

  // ------------------------------------------------ sources: inbox
  const mail = (id, o2) => { sources[id] = { id, kind: 'email', to: 'You', cat: 'general', volume: 1, ...o2, lines: o2.signals || [] }; };
  const headlines = [];
  if (A) headlines.push((M ? A.name + ' labor' : 'Labor') + ' is over again, ' + WORDS[V.f1Weeks] + ' weeks running');
  if (C) headlines.push(C.name + ' had a huge week');
  if (X) headlines.push((M ? X.name : 'Revenue') + ' was soft');
  if (D && o('F3', 'rev')) headlines.push((M ? D.name : 'New business') + ' keeps growing');
  mail('eml_flash', { from: ctrl, when: '6:52 AM', title: 'Flash numbers are in', cat: 'finance', signals: ['note.mix'],
    body: ['Flash is in the reports folder.', (headlines.length ? 'Headlines: ' + headlines.join('. ') + '. ' : '') + '{Materials} cost is up again. Looks like mix to me.', 'I have ' + (A ? (M ? A.name + ' labor' : 'labor') : 'the cash position') + ' on the agenda for ten.'] });
  if (A) mail('eml_hire', { from: a, when: 'Sun 9:14 PM', title: 'Need two more people' + atL(A), cat: 'labor', signals: ['msg.hire'],
    body: ['I know labor looks high on paper. The reality on the floor is we are drowning every ' + peak + ' and I am paying overtime to get through it.', 'I need approval for two more {frontlines}. I have candidates ready. Can we get this done this week?'] });
  if (Y) mail('eml_angry', { from: y, when: 'Fri 4:40 PM', title: 'Fwd: Worst experience I have ever had', cat: 'customer', signals: ['eml.angry'], flag: 'Copied to ' + bossName, cc: bossName,
    body: ['Forwarding so you have it. This {customer} copied ' + bossName + ' and posted online.', '"I waited, I was ignored, and nobody apologized. I have been coming ' + (M ? 'to ' + Y.name + ' ' : 'here ') + 'for six years and I am done."', 'We refunded the full amount Friday and I called personally. They were calmer by the end. Flagging because ' + bossName + ' asked about it.'] });
  if (D) mail('eml_promo', { from: 'marketing', when: 'Fri 3:02 PM', title: 'Intro offer is crushing it' + atL(D), cat: 'customer', signals: ['promo'],
    body: [D.n.newc + ' new {customers}' + atL(D) + ' in four weeks. That is a record' + (M ? ' for any {unit} we have.' : '.'), (o('F3', 'rev') ? 'Revenue is up ' + ((D.n.rev / D.b.rev - 1) * 100).toFixed(1) + '% and ' : '') + F(d) + ' is thrilled. I would like to ' + (M ? 'roll this out to the other {units}' : 'extend it another month') + '. Can I get ten minutes this week?'] });
  mail('eml_hr', { from: 'hr', when: 'Fri 5:30 PM', title: 'People changes this week', cat: 'people', signals: E ? [L_('exits', E)] : [],
    body: E ? ['Short list this week. Full detail is in the People report.', 'One more resignation' + atL(E) + '. That makes three in five weeks, all people we hired this quarter. I have asked ' + F(e) + ' for exit notes.'] : ['Quiet week. Two hires started, no exits. Full detail is in the People report.'] });
  if (wantCash) mail('eml_bank', { from: ctrl, when: 'Thu 11:00 AM', title: 'Insurance premium went out', cat: 'finance', signals: ['eml.bank'],
    body: ['FYI, the annual insurance premium of ' + money(premium) + ' was paid today as scheduled. Cash will look light on Monday\'s flash. Nothing unusual.'] });
  mail('eml_it', { from: 'it', when: 'Thu 9:15 AM', title: 'Password policy changes Friday', signals: ['eml.it'], body: ['Starting Friday, passwords must be 14 characters and will expire every 180 days. You will be prompted at your next sign in.'] });
  mail('eml_party', { from: 'hr', when: 'Wed 2:20 PM', title: 'Holiday party: vote on a venue', signals: ['eml.party'], body: ['Three options this year. Please vote by Wednesday so we can book.'] });
  if (R.chance(0.6)) mail('eml_benefits', { from: 'hr', when: 'Tue 10:05 AM', title: 'Reminder: benefits enrollment closes Friday', signals: ['eml.benefits'], body: ['If you have changes for next year, submit them by Friday at 5 PM. No action needed if nothing is changing.'] });
  if (B) mail('eml_quote', { from: 'vendor', when: dShort(dayOf(-V.unanswered)), title: 'Quote: replacement {equipment}' + atL(B), cat: 'maintenance', signals: ['eml.quote'],
    body: ['As discussed with ' + F(b) + ', the {equipment}' + atL(B) + ' is past its rated life and the faults we keep repairing will keep coming back.', 'Replacement installed: ' + money(V.quote) + '. Lead time is three weeks from approval. This quote is good for 30 days.', 'Let me know how you would like to proceed.'] });
  mail('eml_price', { from: 'suprep', when: dShort(dayOf(-43)), title: 'Updated price list attached', cat: 'purchasing', signals: ['eml.price'],
    body: ['Please find our updated price list attached, effective immediately across all delivery points.', 'We appreciate your continued business.'] });

  // ------------------------------------------------ sources: phone
  const sharpen = {};
  const text = (id, from, when, body, signals, sh, cat = 'general') => { sources[id] = { id, kind: 'message', from, when, title: characters[from].name, cat, volume: 1, body, signals, lines: signals }; if (sh) sharpen[id] = sh; };
  const startTexts = [];
  const addText = (id, from, when, body, signals, sh, cat) => {
    const prev = startTexts.find((t) => sources[t].from === from);
    if (prev) { const p = sources[prev]; p.body = p.body.concat(body); p.signals = p.lines = p.signals.concat(signals); if (sh && sharpen[prev]) { if (sh.finding && sh.finding !== sharpen[prev].finding) sharpen[prev].also = sh; else sharpen[prev].line += ' ' + sh.line; } else if (sh) sharpen[prev] = sh; return; }
    text(id, from, when, body, signals, sh, cat); startTexts.push(id);
  };
  if (C) addText('msg_c', c, 'Sat 6:31 PM', ['Record week' + atL(C) + '!! Biggest since we opened.', 'Team is wiped but proud. Just wanted you to hear it from me first.'], ['msg.record'],
    { finding: 'F2', line: F(c) + '\'s record week was ' + B.name + '\'s overflow. Added: thank the team and cap ' + C.name + '\'s overtime.', addOwner: c, task: 'Cap ' + C.name + '\'s overtime and plan the overflow with ' + F(b) + '.' }, 'operations');
  if (B) addText('msg_b', b, 'Fri 2:12 PM', partner ? ['{Equipment} is down again. Sent this afternoon\'s work over to ' + F(c) + ' at ' + C.name + '.', 'Tech says it will be back up Monday.'] : ['{Equipment} is down again. Pushing today\'s work to next week and turning some away.', 'Tech says it will be back up Monday.'], ['msg.overflow'],
    { finding: 'F2', line: F(b) + ' confirms it went down again' + (partner ? ' and work is going to ' + C.name : '') + '. Urgency raised to today.', urgent: true }, 'operations');
  if (E) addText('msg_e', e, 'Fri 7:48 PM', ['Schedule is tight again. I\'m covering Saturday myself.', 'Will get next week posted as soon as I can.'], ['msg.sat'],
    { finding: 'F5', line: F(e) + ' is covering shifts personally. Added: ' + F('trainer') + ' goes' + (M ? ' to ' + E.name : ' on site') + ' this week.', addOwner: 'trainer', task: 'Spend two weeks' + atL(E) + ' helping ' + F(e) + ' post schedules ahead.' }, 'people');
  if (D) addText('msg_d', d, 'Fri 5:05 PM', ['Another full week here. The offer is really working.', 'Desk is still short since ' + V.leaver + ' left but we\'re managing. Any news on the replacement?'], ['msg.desk'],
    { finding: 'F3', line: F(d) + ' confirms the desk has been short since ' + V.leaver + ' left. Root cause confirmed.' }, 'people');
  if (X) addText('msg_x', x, 'Sat 9:20 AM', ['Back to normal after ' + V.closureDay + '\'s closure. The ' + closure[1] + ' is sorted.', 'Numbers will look light for the week. Per day we were fine.'], ['msg.closure'],
    { finding: null, line: 'Confirms ' + (M ? X.name + '\'s' : 'the') + ' soft week was the ' + closure[1] + '. Still filtered. No action needed.' }, 'operations');
  const smallTalk = locations.map((L) => L.manager).filter((k) => !startTexts.some((t) => sources[t].from === k));
  const smalls = [['Can we move our 1:1 to Thursday? Inventory count is Wednesday.'], ['Thanks for approving Friday off. Coverage is set.'], ['FYI the new uniforms came in. They look great.']];
  for (let i = 0; startTexts.length < 3 && i < smallTalk.length && i < smalls.length; i++) addText('msg_s' + i, smallTalk[i], R.pick(['Fri 11:40 AM', 'Sat 10:02 AM', 'Sun 4:15 PM']), smalls[i], ['msg.small'], { finding: null, line: 'Personal message. Not connected to any priority.' });
  const fillers = [['opsdir', 'Sun 6:20 PM', 'Back in town Monday. Let me know if you want me anywhere specific this week.'], ['trainer', 'Fri 1:15 PM', 'Next month\'s training calendar is posted. Shout if any dates clash.'], ['hr', 'Sat 8:40 AM', 'Handbook draft is in your inbox whenever you get a minute. No rush.']];
  for (const [k, when, line] of fillers) if (startTexts.length < 3) addText('msg_' + k + '0', k, when, [line], ['msg.small'], { finding: null, line: 'Not connected to any priority this week.' });

  // ------------------------------------------------ sources: calendar and notes
  const visitL = R.pick(locations);
  const att = (keys) => keys.filter((k) => characters[k]).map((k) => k);
  const today = [
    { id: 'ev_prep', start: '8:00', end: '8:30', title: 'Hold: prep for the ' + role.meetingName, place: 'Your office', kind: 'block' },
    { id: 'ev_meet', start: '10:00', end: '11:00', title: cap(role.meetingName), place: 'Conference room', kind: 'meeting', signals: ['cal.meeting'],
      detail: { people: att(CENTRAL.concat(locations.map((L) => L.manager))), lines: ['Agenda (draft from ' + F(ctrl) + '): ' + (A ? (M ? A.name + ' labor' : 'labor') : 'cash position') + (Y ? ', the ' + (M ? Y.name + ' ' : '') + 'complaint' : '') + ', open items.', (M ? 'Managers join by video.' : 'Your manager joins in person.'), 'Bring your briefing: what matters this week, and who owns it.'] } },
    { id: 'ev_11', start: '11:30', end: '12:00', title: '1:1 with ' + characters.opsdir.name, place: 'Your office', kind: 'meeting', detail: { people: ['opsdir'], lines: ['Site visit plan for the week. ' + F('opsdir') + ' is going to ' + (M ? visitL.name : 'the floor') + ' this afternoon.', 'Vendor scorecards are due at month end.'] } },
    { id: 'ev_lunch', start: '12:00', end: '1:00', title: 'Lunch', kind: 'block' },
    D && o('F3', 'deskreq')
      ? { id: 'ev_int', start: '1:30', end: '2:15', title: 'Interview: {desk} candidate' + atL(D), place: 'Video call', kind: 'meeting', signals: [L_('deskreq', D)], detail: { people: [d, 'hr'], lines: ['Candidate: ' + R.pick(FIRST) + ' ' + R.pick(LAST) + ', four years in a similar role.', 'Role open ' + V.deskWeeks * 7 + ' days. Replaces ' + V.leaver + '.', 'Interviewing with ' + F(d) + ' and ' + F('hr') + '.'] } }
      : { id: 'ev_int', start: '1:30', end: '2:15', title: 'Interview: {frontline} candidate', place: 'Video call', kind: 'meeting', detail: { people: ['hr'], lines: ['Second round. ' + F('hr') + ' recommends moving forward.'] } },
    A ? { id: 'ev_check', start: '3:00', end: '3:30', title: 'Quarterly check-in: ' + characters[a].name, place: M ? A.name : 'On site', kind: 'review', signals: ['cal.checkin'],
      detail: { people: [a], review: [['Labor, % of revenue', 'at or under ' + V.f1Target + '%', A.n.labor.toFixed(1) + '%'], ['{WaitLabel}', 'under ' + (A.b.wait + 2) + ' min', A.n.wait + ' min'], ['Overtime hours, weekly', 'under ' + (A.b.ot + 6), String(A.n.ot)]],
        lines: ['From last check-in, ' + WORDS[V.f1Weeks + 1] + ' weeks ago: "Refreshing the schedule template to give the {leads} a more consistent block."', 'Asked twice this year for more headcount.'] } }
      : { id: 'ev_check', start: '3:00', end: '3:30', title: 'Quarterly check-in: ' + characters[locations[0].manager].name, place: M ? locations[0].name : 'On site', kind: 'review', detail: { people: [locations[0].manager], lines: ['On plan for the quarter. Talk about summer staffing.'] } },
    { id: 'ev_pay', start: '4:30', end: '4:45', title: 'Approve payroll', kind: 'deadline', detail: { lines: ['Payroll locks at 5:00 PM.'] } },
  ];
  const thu = { gm: 'Lender review', coo: 'Board call', owner: 'Bank covenant check', partner: 'Quarterly review', regional: 'Labor review with ' + bossName }[role.id];
  const ev = (id, day, time, title, extra = {}) => ({ id, day, time, title, ...extra });
  const weeks = {
    last: [
      X ? ev('ev_closed', V.closureDay === 'Tuesday' ? 1 : 2, 'All day', (M ? X.name + ' closed: ' : 'Closed: ') + closure[1], { signals: ['cal.closure'], detail: { people: [x], lines: ['Closed for ' + closure[0] + '. Reopened the next morning.', 'Posted by ' + F(x) + '.'] } }) : ev('ev_safety', 2, '9:00 AM', 'Safety walk' + (M ? ', ' + R.pick(locations).name : '')),
      wantCash ? ev('ev_prem', 3, 'Autopay', 'Insurance premium, ' + money(premium), { signals: ['cal.premium'], detail: { lines: ['Annual premium. Paid on schedule.'] } }) : ev('ev_vend', 3, '2:00 PM', 'Vendor review: uniforms'),
      E ? ev('ev_exit', 4, '4:00 PM', 'Exit interview (phone)' + atL(E), { signals: ['cal.exit'], detail: { people: ['hr'], lines: ['Departing {frontline}, ' + R.i(6, 10) + ' weeks in.', 'Notes from ' + F('hr') + ': "Liked the team. Said the schedule always came out too late to plan around."'] } }) : ev('ev_fri', 4, '3:00 PM', 'Manager huddle'),
      ev('ev_mon0', 0, '10:00 AM', cap(role.meetingName)),
    ],
    this: [
      ev('ev_m', 0, '10:00 AM', cap(role.meetingName), { ref: 'ev_meet' }),
      ev('ev_visit', 1, '9:00 AM', F('opsdir') + ' on site' + (M ? ': ' + visitL.name : '')),
      ev('ev_sched', 1, '5:00 PM', 'Schedules due for next week', { detail: { lines: ['Every {unit} posts next week\'s schedule. Company standard is seven days ahead.'] } }),
      ev('ev_lunch2', 2, '12:00 PM', 'Uniform vendor lunch'),
      ev('ev_vote', 2, '5:00 PM', 'Party venue vote closes'),
      ev('ev_thu', 3, '2:00 PM', thu, { detail: { people: ['boss', ctrl], lines: [role.note.text.replace('{boss}', bossName), 'Prep pack due from ' + F(ctrl) + ' Wednesday.'] } }),
      ev('ev_payroll', 4, '5:00 PM', 'Payroll closes'),
      ev('ev_boss', 4, '10:00 AM', bossName + ' in the office'),
    ],
    next: [
      ev('ev_contract', 0, '1:00 PM', '{supplier} contract review', { signals: ['cal.contract'], detail: { people: ['suprep', ctrl], lines: ['Annual review with ' + characters.suprep.name + '.', 'Current terms: contract pricing on the top 40 items, rates locked through ' + lockDate + '.', 'Bring: volume forecast for next year.'] } }),
      ev('ev_reviews', 2, 'All week', 'Mid-year reviews begin'),
      ev('ev_train', 3, '9:00 AM', 'New manager training, ' + F('trainer')),
    ],
  };
  const calSignals = [...new Set(today.flatMap((t) => t.signals || []).concat(Object.values(weeks).flat().flatMap((t) => t.signals || [])))];
  sources.cal = { id: 'cal', kind: 'calendar', from: null, when: '', title: 'Calendar', cat: 'general', volume: 9, today, weeks, dates: [0, 1, 2, 3, 4].map((i) => dShort(dayOf(i))), lastDates: [0, 1, 2, 3, 4].map((i) => dShort(dayOf(i - 7))), nextDates: [0, 1, 2, 3, 4].map((i) => dShort(dayOf(i + 7))), lines: calSignals.length ? calSignals : ['cal.meeting'] };

  const myNotes = [];
  if (A) myNotes.push(F(a) + ': wants 2 more people. ' + cap(peaks) + ' rough?');
  if (B) myNotes.push(F(b) + ': {equipment} again. Quote coming?');
  myNotes.push(F(ctrl) + ': {materials} creeping up. Thinks it\'s mix.');
  if (D) myNotes.push(F(d) + ': desk role still open.');
  myNotes.push('Holiday party budget?', 'Ask ' + F('hr') + ' about the handbook update.');
  sources.note_role = { id: 'note_role', kind: 'note', from: 'boss', when: 'Left on your desk', title: 'Note from ' + bossName, cat: 'general', volume: 1, body: [role.note.text.replace('{boss}', bossName)], signals: ['note.role'], lines: ['note.role'] };
  sources.note_mine = { id: 'note_mine', kind: 'note', from: null, when: 'Last week', title: 'Your notes from last week', cat: 'general', volume: 1, list: R.shuffle(myNotes), body: [], signals: ['note.mine'], lines: ['note.mine'] };

  sources.team = { id: 'team', kind: 'team', from: null, when: '', title: 'Your team', cat: 'general', volume: 0, lines: [], central: CENTRAL, managers: locations.map((L) => L.manager) };

  // ------------------------------------------------ arrivals during the morning
  const T = (h, m) => h * 60 + m;
  const events = [];
  const arrive = (id, src, when, toast) => { sources[id] = { ...src, id, arrives: true, lines: src.signals || [] }; events.push({ id: 'ev.' + id, when, add: id, toast }); };
  if (B) arrive('msg_b2', { kind: 'message', from: b, when: '', title: characters[b].name, cat: 'maintenance', volume: 1, signals: ['mnt.today'], body: ['{Equipment} is down again this morning. Third time in six weeks.', (partner ? 'Sending today\'s overflow to ' + C.name + '.' : 'We\'re turning work away again.') + ' I would really like an answer on that replacement quote.'] }, { at: T(8, 22 + R.i(0, 6)) }, characters[b].name + ' sent a message');
  arrive('msg_agenda', { kind: 'message', from: ctrl, when: '', title: characters[ctrl].name, cat: 'general', volume: 1, signals: ['msg.agenda'], body: ['Building the agenda for ten. I have ' + (A ? (M ? A.name + ' labor' : 'labor') : 'the cash position') + (Y ? ' and the complaint' : '') + ' on it.', 'Bring whatever else you think matters.'] }, { at: T(9, 2 + R.i(0, 6)) }, characters[ctrl].name + ' sent a message');
  arrive('msg_social', { kind: 'message', from: 'marketing', when: '', title: characters.marketing.name, cat: 'general', volume: 1, signals: ['ping.social'], body: ['Can I post ' + (D && M ? D.name + '\'s' : 'this month\'s') + ' numbers on LinkedIn? Huge month!'] }, { at: T(8, 9 + R.i(0, 6)) }, characters.marketing.name + ' sent a message');
  arrive('eml_lunch', { kind: 'email', from: 'hr', to: 'You', when: '', title: 'Uniform vendor lunch Wednesday', cat: 'general', volume: 1, signals: ['ping.lunch'], body: ['Confirming lunch with the uniform vendor Wednesday at noon. Let me know if you want to join.'] }, { at: T(8, 38 + R.i(0, 6)) }, 'New email from ' + characters.hr.name);
  arrive('msg_pto', { kind: 'message', from: 'hr', when: '', title: characters.hr.name, cat: 'general', volume: 1, signals: ['ping.pto'], body: ['Approving three time-off requests for next week unless you object.'] }, { at: T(9, 15 + R.i(0, 6)) }, characters.hr.name + ' sent a message');
  arrive('msg_visit', { kind: 'message', from: 'opsdir', when: '', title: characters.opsdir.name, cat: 'general', volume: 1, signals: ['ping.visit'], body: ['Heading out to ' + (M ? visitL.name : 'the floor') + ' this afternoon unless you need me somewhere else.'] }, { at: T(9, 32 + R.i(0, 6)) }, characters.opsdir.name + ' sent a message');
  if (A) arrive('msg_analyst', { kind: 'message', from: 'analyst', when: '', title: characters.analyst.name, cat: 'labor', volume: 1, signals: [L_('util', A), L_('sched', A)], body: ['Saw you were in the ' + (M ? A.name + ' ' : '') + 'labor numbers. Two things from the labor report in case they help.', 'Productive share of paid hours there is ' + A.n.util + '%. It was ' + A.b.util + '%.', 'And the schedule template changed ' + WORDS[V.f1Weeks] + ' weeks ago. {Lead} coverage moved to the ' + offPeak + ' block.'] },
    { seenOf: [L_('labor', A), L_('ot', A), 'msg.hire'], count: 2, delay: 6 }, characters.analyst.name + ' sent a message');
  if (D) arrive('msg_mkt', { kind: 'message', from: 'marketing', when: '', title: characters.marketing.name, cat: 'customer', volume: 1, signals: [L_('fu', D)], body: ['Since you\'re in the {customer} numbers: one thing I can\'t explain.', (M ? D.name : 'We') + ' completed ' + D.n.fu + '% of ' + (M ? 'its' : 'our') + ' {followup} last month. It\'s usually ' + D.b.fu + '%.'] },
    { seenOf: [L_('csat', D), L_('repeat', D), L_('newc', D), 'promo', 'social'], count: 2, delay: 8 }, characters.marketing.name + ' sent a message');
  if (B) arrive('eml_quote2', { kind: 'email', from: 'vendor', to: 'You', when: '', title: 'Following up: quote expires in ' + (30 - V.unanswered) + ' days', cat: 'maintenance', volume: 1, signals: ['eml.quote'], body: ['Following up on the replacement quote I sent ' + V.unanswered + ' days ago for the {equipment}' + atL(B) + '.', money(V.quote) + ' installed, three weeks from approval. The quote expires in ' + (30 - V.unanswered) + ' days.'] },
    { seenOf: [L_('wo', B), L_('down', B), 'msg.overflow', 'mnt.today'], count: 1, delay: 10 }, 'New email from ' + characters.vendor.name);

  // ------------------------------------------------ Round 2 and the meeting
  const obvious = [A && L_('labor', A), A && 'msg.hire', X && L_('rev', X), X && L_('labor', X), Y && 'eml.angry', wantCash && 'cash', C && L_('rev', C), C && 'msg.record', D && 'promo', D && L_('rev', D)].filter(Boolean);
  const phone = startTexts.filter((t) => sharpen[t]);
  const live = (x) => !x.finding || findings.some((f) => f.id === x.finding);
  for (const t of phone) { if (sharpen[t].also && !live(sharpen[t].also)) delete sharpen[t].also; if (!live(sharpen[t])) sharpen[t] = sharpen[t].also || { finding: null, line: 'Not connected to any priority this week.' }; }
  const order = {
    email: ['eml_flash', 'eml_hire', 'eml_hr', 'eml_angry', 'eml_promo', 'eml_bank', 'eml_benefits', 'eml_it', 'eml_party', 'eml_quote', 'eml_price'].filter((k) => sources[k]),
    message: startTexts.slice(),
    report: ['rep_fin', 'rep_labor', 'rep_ops', 'rep_cx', 'rep_mnt', 'rep_ap', 'rep_hr'],
    location: locations.map((L) => 'loc_' + L.id).concat(M ? ['loc_all'] : []),
    calendar: ['cal'], note: ['note_role', 'note_mine'], team: ['team'],
  };

  // ------------------------------------------------ Round 2: what Wake adds to the desk
  // A text that arrives during the morning can be sent to Wake too.
  if (B) sharpen.msg_b2 = { finding: 'F2', line: F(b) + ' reports it failed again this morning. Urgency raised to today.', urgent: true };

  // Routine items: real, small, and lower priority. They sit below the problems so the
  // player still has to decide what goes on the list.
  const routine = [];
  const addRoutine = (r) => { routine.push({ urgency: R.u(0.15, 0.3), impact: R.u(0.15, 0.3), loc: null, ...r }); };
  const openWO = woList.filter((x) => /^Open/.test(x[3]));
  if (openWO.length) {
    const [, L0, asset0] = openWO[0];
    addRoutine({ id: 'R_mnt', topic: 'Maintenance', owner: 'opsdir', evidence: openWO.map((x) => x[5]).concat(['pmc']),
      headline: openWO.length > 1 ? openWO.length + ' work orders are still open.' : asset0 + (M ? ' at ' + L0.name : '') + ' is still open.',
      why: openWO.map((x) => x[2] + (M ? ' at ' + x[1].name : '') + ': ' + x[4].replace(/\.$/, '').toLowerCase() + ', ' + x[3].toLowerCase()).join('. ') + '. Preventive maintenance is at ' + S.pmc.value + ' against a 95% target.',
      action: 'Close the open work orders this week.', check: 'Closed by Friday.', onIt: 'I\'ll get them closed out this week.',
      week: ['Closed out Wednesday.', 'up'] });
  }
  const roleIds = Object.keys(S).filter((k) => k.startsWith('role.')).sort((p, q) => parseInt(S[q].value.replace(/\D/g, ''), 10) - parseInt(S[p].value.replace(/\D/g, ''), 10));
  if (roleIds.length >= 2) addRoutine({ id: 'R_roles', topic: 'Hiring', owner: 'hr', evidence: roleIds.slice(0, 3),
    headline: roleIds.length + ' {frontline} roles are open across the company.', why: 'The oldest has been ' + S[roleIds[0]].value + '. ' + (M ? 'Longest open: ' + roleIds.slice(0, 3).map((k) => locations.find((L) => L.id === S[k].loc).name + ', ' + S[k].value.replace('open ', '')).join('; ') + '. ' : '') + 'Every open shift is covered by overtime or a manager until they are filled.',
    action: 'Prioritize the two oldest roles and ask managers for referrals.', check: 'Two offers out within two weeks.', onIt: 'I\'ll push the oldest two and ask for referrals.', week: ['Two candidates moved to final interviews.', 'up'] });
  addRoutine({ id: 'R_pto', topic: 'Scheduling', owner: 'hr', evidence: ['pto', 'swap'],
    headline: S.pto.value + ' time-off requests are waiting on approval.', why: 'Next week\'s schedules are due Tuesday. Requests still pending then get built around late. Shift swaps are ' + S.swap.value + ' this week against a norm of ' + S.swap.delta.replace('norm ', '') + '.',
    action: 'Clear pending time-off requests before Tuesday\'s schedules.', check: 'All requests answered by Tuesday noon.', onIt: 'I\'ll clear the queue before schedules go out.', week: ['Requests cleared Tuesday. Schedules went out clean.', 'up'] });
  const praised = reviewQuotes.filter((q) => q[0] === 5);
  if (praised.length) { const L = praised[0][1]; addRoutine({ id: 'R_praise', topic: '{Customers}', owner: L.manager, evidence: ['reviews.' + L.id], loc: L.id,
    headline: (M ? L.name : 'The team') + ' is getting five-star reviews by name.', why: 'Recent reviews call out the team directly: ' + praised.filter((q) => q[1] === L).map((q) => '"' + q[2] + '"').join(' ') + ' Recognition is cheapest when it is specific.',
    action: 'Share the reviews with the team at this week\'s huddle.', check: 'Shared at the next huddle.', onIt: 'I\'ll read them out at the huddle. They\'ll love it.', week: ['Shared at Thursday\'s huddle.', 'up'] }); }
  const fNum = findings.length;
  const keepRoutine = Math.max(5 - fNum, Math.min(8 - fNum, R.i(2, 3)));
  const routineKept = R.shuffle(routine).slice(0, keepRoutine);
  for (const r of routineKept) {
    content.briefing[r.id] = { headline: r.headline, why: r.why, keys: r.evidence.slice(0, 4), action: r.action, owner: [r.owner], check: r.check, onIt: r.onIt };
    content.week[r.id] = { label: r.topic + ' · ' + r.headline.split(' ').slice(0, 4).join(' ').replace(/[.:]$/, ''), aligned: r.week, untouched: ['Not on the list this week.', 'flat'] };
  }

  // The calendar, annotated: what each meeting means now, plus holds Wake suggests.
  const allEv = today.concat(...Object.values(weeks));
  const note = (id, text) => { const e = allEv.find((x) => x.id === id); if (e) e.wake = text; };
  note('ev_meet', 'Your briefing is the agenda. Everything you assign this morning is on it.');
  if (A) note('ev_check', 'Bring the schedule fix. ' + F(a) + '\'s labor and wait goals trace to one template change.');
  if (D && o('F3', 'deskreq')) note('ev_int', 'This hire restarts {followup}' + atL(D) + '. Regulars are slipping while the role is open.');
  note('ev_contract', 'Settle the invoice overage before this review. ' + money(V.over) + ' billed above contract.');
  note('ev_thu', 'Your brief is drafted and on your desk.');
  if (X) note('ev_closed', 'This explains last week\'s soft numbers' + atL(X) + '. No action needed.');
  if (wantCash) note('ev_prem', 'This explains the dip in operating cash. No action needed.');
  if (E) note('ev_exit', 'Two of three exit notes say the same thing. It\'s in your priorities.');
  note('ev_sched', E ? (M ? E.name + ' has been posting 1 to 2 days ahead. ' : 'Schedules have been going out 1 to 2 days ahead. ') + 'Worth checking Tuesday.' : 'Every {unit} is on track to post on time.');
  const holds = [];
  if (B) holds.push({ id: 'ev_w_eq', start: '11:00', end: '11:15', title: 'Approve the {equipment} replacement', place: 'Call with ' + F(b), kind: 'wake', detail: { people: [b, 'vendor'], lines: ['Suggested by Wake. The quote expires in ' + (30 - V.unanswered) + ' days and carries a three week lead time.'] } });
  holds.push({ id: 'ev_w_ap', start: '4:00', end: '4:15', title: 'Invoice dispute to {supplier}', place: 'With ' + F(ctrl), kind: 'wake', detail: { people: [ctrl], lines: ['Suggested by Wake. Six weeks of invoices against the contract price list, ' + money(V.over) + ' to recover.'] } });
  sources.cal.wakeToday = holds;

  // Executive documents Wake keeps current. Built from the same numbers, nothing new.
  const k4 = 4.33;
  const kmoney2 = (k) => (k >= 1000 ? '$' + (k / 1000).toFixed(2) + 'M' : kmoney(k));
  const fc = locations.map((L) => ({ L, plan: L.b.rev * k4 * 1.02, proj: L.n.rev * k4 }));
  const planT = fc.reduce((n, r) => n + r.plan, 0), projT = fc.reduce((n, r) => n + r.proj, 0);
  const pct = (a, b2) => ((a / b2) * 100).toFixed(1) + '%';
  const levers = [];
  if (A) levers.push(['Labor' + atL(A) + ' back to its normal share', money((A.n.labor - A.b.labor) / 100 * A.n.rev * 1000 * k4) + ' a month', 'Schedule template fix, no headcount change']);
  if (B) levers.push([(M ? B.name + ' ' : '') + 'capacity lost to the {equipment}', money(o('F2', 'rev') ? (B.b.rev - B.n.rev) * 1000 * k4 : V.down * (B.b.rev * 1000 / (SD.days * 10)) * 0.5 * 2.16) + ' a month', 'Recovered once the replacement is in']);
  if (D) levers.push(['Returning {customers}' + atL(D) + ' at risk', money((D.b.repeat - D.n.repeat) / 100 * D.b.rev * 1000 * k4) + ' a month', 'Shows up when the intro offer ends']);
  levers.push(['{supplier} billing above contract', money(V.annual / 12) + ' a month', 'Recoverable now: ' + money(V.over)]);
  if (E) levers.push(['New-hire turnover' + atL(E), money(3 * 4200) + ' so far', 'Replacement hiring and training cost']);
  const projFlag = (r) => ({ t: pct(r.proj, r.plan), tone: r.proj < r.plan * 0.98 ? 'neg' : '' });
  sources.x_forecast = { id: 'x_forecast', kind: 'exec', r2: true, from: null, when: 'Updated 7:48 AM', title: 'Revenue and margin forecast', sub: 'Month pace against plan, and what moves it', cat: 'exec', volume: 0, lines: [],
    intro: 'Projected from this week\'s run rate. Plan is the monthly budget.',
    blocks: [
      { title: 'Month pace', cols: [M ? 'Location' : '', 'Plan', 'Projected', 'Pace'], rows: fc.map((r) => ({ cells: [{ t: M ? r.L.name : 'This month' }, { t: kmoney2(r.plan) }, { t: kmoney2(r.proj) }, projFlag(r)] })).concat(M ? [{ total: true, cells: [{ t: 'Total' }, { t: kmoney2(planT) }, { t: kmoney2(projT) }, { t: pct(projT, planT), tone: projT < planT * 0.98 ? 'neg' : '' }] }] : []) },
      { title: 'Margin lines', cols: ['', 'Now', 'Plan', ''], rows: [
        { cells: [{ t: 'Labor, % of revenue' }, { t: laborAvg.toFixed(1) + '%' }, { t: '30.0%' }, { t: laborAvg > 30.4 ? 'Above plan' : 'On plan', tone: laborAvg > 30.4 ? 'neg' : '' }] },
        { cells: [{ t: '{Materials}, % of revenue' }, { t: V.matNow.toFixed(1) + '%' }, { t: V.matBase.toFixed(1) + '%' }, { t: 'Above plan', tone: 'neg' }] },
      ] },
      { title: 'What moves the forecast', note: 'Wake estimates, from this week\'s numbers.', cols: ['', 'Size', 'Note'], rows: levers.map(([a1, b1, c1]) => ({ cells: [{ t: a1 }, { t: b1 }, { t: c1 }] })) },
    ] };
  const KPI = [
    ['Revenue vs plan', '≥ 98% pace', (L) => { const r = fc.find((z) => z.L === L); return [pct(r.proj, r.plan), r.proj >= r.plan * 0.98]; }],
    ['Labor, % of revenue', '≤ 30.5%', (L) => [L.n.labor.toFixed(1) + '%', L.n.labor <= 30.5]],
    ['{WaitLabel}', '≤ 15 min', (L) => [L.n.wait + ' min', L.n.wait <= 15]],
    ['Overtime hours', '≤ 20 a week', (L) => [String(L.n.ot), L.n.ot <= 20]],
    ['Satisfaction', '≥ 4.5', (L) => [L.n.csat.toFixed(1), L.n.csat >= 4.5]],
    ['Returning {customers}', '≥ 55%', (L) => [L.n.repeat + '%', L.n.repeat >= 55]],
    ['Schedules posted ahead', '≥ 6 days', (L) => [L.n.post.toFixed(1) + ' days', L.n.post >= 6]],
  ];
  let onPace = 0, cellsN = 0;
  const kRows = KPI.map(([label, target, fn]) => ({ cells: [{ t: label }, { t: target }].concat(locations.map((L) => { const [v, ok] = fn(L); cellsN += 1; if (ok) onPace += 1; return { t: (ok ? '● ' : '▲ ') + v, tone: ok ? 'pos' : 'neg' }; })) }));
  sources.x_pacing = { id: 'x_pacing', kind: 'exec', r2: true, from: null, when: 'Updated 7:48 AM', title: 'Targets and pacing', sub: 'Every {unit} against this quarter\'s targets', cat: 'exec', volume: 0, lines: [],
    intro: onPace + ' of ' + cellsN + ' measures on pace. ● on pace  ▲ off pace.',
    blocks: [{ title: 'This quarter', cols: ['Measure', 'Target'].concat(locations.map((L) => (M ? L.name : 'This week'))), rows: kRows }] };
  const para = [];
  para.push('Labor is ' + laborAvg.toFixed(1) + '% of revenue this week, ' + (laborAvg >= laborBase ? 'up ' : 'down ') + Math.abs(laborAvg - laborBase).toFixed(1) + ' points on the eight week average.' + (A ? ' The increase is concentrated' + atL(A) + ', and it is a scheduling problem, not a headcount problem: {lead} coverage moved to the ' + offPeak + ' block ' + WORDS[V.f1Weeks] + ' weeks ago while demand moved later. The fix is a schedule change this week, with no new hires. We expect labor back near ' + A.b.labor.toFixed(1) + '%' + atL(A) + ' within three weeks.' : ''));
  para.push('{Materials} cost is up ' + V.matUp.toFixed(1) + ' points. Most of it is {supplier} billing above our contract rate, which is locked through ' + lockDate + '. ' + money(V.over) + ' is recoverable and we are disputing it this week.');
  if (B) para.push('The {equipment}' + atL(B) + ' has failed three times in six weeks. We are replacing it (' + money(V.quote) + ', three week lead time) rather than repairing it again' + (partner ? ', which also takes the overtime pressure off ' + C.name : '') + '.');
  const watch = [];
  if (D) watch.push((M ? D.name + '\'s' : 'Our') + ' returning {customers} are down ' + (D.b.repeat - D.n.repeat) + ' points behind a strong month of new ones; {followup} restarts this week');
  if (E) watch.push('new-hire exits' + atL(E) + ' trace to late schedules; posting a week ahead from now on');
  if (wantCash) watch.push('the dip in cash is the annual insurance premium, paid on schedule');
  if (watch.length) para.push('Also on our list: ' + watch.join('; ') + '.');
  sources.x_brief = { id: 'x_brief', kind: 'exec', r2: true, from: null, when: 'Drafted 7:48 AM', title: 'Brief for Thursday\'s ' + thu.toLowerCase().replace(' with ' + bossName.toLowerCase(), ''), sub: 'Draft answer to ' + bossName + '\'s question', cat: 'exec', volume: 0, lines: [],
    to: bossName, ask: role.note.text, memo: para };
  sources.x_list = { id: 'x_list', kind: 'exec', r2: true, title: 'Executive briefs', cat: 'exec', volume: 0, lines: [] };

  keyAnswers();
  const headcount = locations.reduce((n, L) => n + L.staff, 0) + CENTRAL.length + R.i(2, 6);
  return {
    seed, company, supplier, equipCo, hq, headcount, N, M, monday: dShort(monday), mondayLong: DAYS[1] + ', ' + MONTH[monday.getUTCMonth()] + ' ' + monday.getUTCDate(), weekEnd, lockDate, bossName,
    vocabExtra: { supplier, peak, peaks, offPeak, offPeaks, peakTime },
    locations: locations.map(({ b: _b, n: _n, rev: _r, ...L }) => L), pins, characters, central: CENTRAL,
    signals: Object.values(S), sources, events, findings, routine: routineKept, order,
    briefing: content.briefing, reactions: content.reactions, weekText: { ...content.week,
      falseAlarm: { react: ['Time went into something that was already explained.', 'flat'], checked: ['Checked. Nothing needed.', 'flat'], wake: ['Filtered at 7:48 AM. No time spent.', 'flat'] },
      noise: { you: ['Time went into something that didn\'t move the week.', 'flat'], wake: ['Filtered at 7:48 AM. No time spent.', 'flat'] } },
    context: content.context, quiet: content.quiet, obvious, phone, sharpen,
    answers: content.answers, ansKey,
    owners: CENTRAL.concat(locations.map((L) => L.manager)),
    system: { rep_fin: 'Accounting', rep_labor: 'Payroll + scheduling', rep_ops: SD.system, rep_cx: 'CRM + reviews', rep_mnt: 'Maintenance', rep_ap: 'Purchasing', rep_hr: 'HR system', cal: 'Calendar', email: 'Inbox', message: 'Phone', note: 'Desk', location: 'Location scorecards' },
  };
}

// What the setup screen shows before the game starts: the same seed, the same company.
export function previewScenario(shell, role, seed) {
  const s = generateScenario(shell, role, seed);
  return { company: s.company, N: s.N, headcount: s.headcount, monday: s.mondayLong, locations: s.locations.map((L) => L.name) };
}
