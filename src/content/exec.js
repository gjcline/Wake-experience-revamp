// THE EXECUTIVE LIBRARY
// The documents on an executive's desk, drafted by Wake at 7:48 AM from the same systems the
// morning came from: the income statement, cash flow, balance sheet, the quarter so far, the
// locations, labor, the managers, and the plan. Every figure ties back to this company's own
// weekly numbers (revenue, labor, materials, cash); where a statement needs a structural line
// (occupancy, depreciation, debt), it uses a typical share for the industry, fixed per company.
//
// Blocks: { type: 'kpis', items } · { type: 'text', title, paras, bullets } ·
//         { title, note, cols, rows: [{ head | indent | total | grand, cells: [{ t, tone, spark }] }] }

const OCC = { service: 7, clinical: 8, consumer: 11, field: 4, multi: 8 };
const MKT = { service: 2.5, clinical: 1.8, consumer: 4, field: 2, multi: 3 };
const AR_DAYS = { service: 6, clinical: 28, consumer: 2, field: 34, multi: 1 };
const BUILD = { service: 0.18, clinical: 0.25, consumer: 0.35, field: 0.1, multi: 0.4 };

export function buildExecLibrary(c) {
  const { shellId, company, M, N, locations, characters, revSum, revBase, laborAvg, laborBase, V, premium, cash, wantCash, monday, bossName, A, B, D, E, X, seed } = c;
  // a small deterministic generator for structural shares, so nothing upstream shifts
  let s = (seed * 2654435761) >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const u = (a, b) => a + (b - a) * rnd();
  const F = (k) => characters[k].name.split(' ')[0];
  const K = 1000, W = 4.33;
  const usd = (v, d = 0) => { const n = Math.round(Math.abs(v)); const t = '$' + n.toLocaleString('en-US'); return v < -0.5 ? '(' + t + ')' : t; };
  const kusd = (v) => { const a = Math.abs(v); const t = a >= 1e6 ? '$' + (a / 1e6).toFixed(2) + 'M' : '$' + Math.round(a / K).toLocaleString('en-US') + 'k'; return v < 0 ? '(' + t + ')' : t; };
  const pct = (v, d = 1) => v.toFixed(d) + '%';
  const pts = (v) => (v >= 0 ? '+' : '-') + Math.abs(v).toFixed(1) + ' pts';
  const chg = (v) => (v >= 0 ? '+' : '-') + Math.abs(v * 100).toFixed(1) + '%';
  const neg = (bad) => (bad ? 'neg' : '');
  const at = (L) => (M ? ' at ' + L.name : '');
  const month = monday.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const q = Math.floor(monday.getUTCMonth() / 3) + 1, qStart = new Date(Date.UTC(monday.getUTCFullYear(), (q - 1) * 3, 1));
  const qWeeks = Math.max(2, Math.round((monday - qStart) / (7 * 864e5)));
  const asOf = new Date(monday.getTime() - 864e5).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const head = (title, period, systems) => ({ company, period, systems, title });

  // ------------------------------------------------------------ the income statement
  const revM = revSum * K * W, revPlan = revBase * K * W * 1.02, revPrior = revBase * K * W;
  const otPct = 1.0 + (A ? 0.9 : 0.2), wagesPct = laborAvg - otPct, benPct = laborAvg * 0.12;
  const occPct = OCC[shellId] + u(-0.6, 0.6), mktPct = MKT[shellId] + u(-0.3, 0.3), rmPct = 1.4 + (B ? 0.7 : 0);
  const planMargin = u(12.5, 15);
  const plan = { mat: V.matBase, wages: 30 - 1.0, ot: 1.0, ben: 30 * 0.12, occ: occPct, mkt: mktPct, rm: 1.4 };
  const gaPlanPct = 100 - plan.mat - plan.wages - plan.ot - plan.ben - plan.occ - plan.mkt - plan.rm - planMargin;
  const gaFixed = gaPlanPct / 100 * revPlan;
  const lineM = (p, r = revM) => p / 100 * r;
  const act = { rev: revM, mat: lineM(V.matNow), wages: lineM(wagesPct), ot: lineM(otPct), ben: lineM(benPct), occ: lineM(occPct, revPlan), mkt: lineM(mktPct), rm: lineM(rmPct), ga: gaFixed };
  const pln = { rev: revPlan, mat: lineM(plan.mat, revPlan), wages: lineM(plan.wages, revPlan), ot: lineM(plan.ot, revPlan), ben: lineM(plan.ben, revPlan), occ: lineM(plan.occ, revPlan), mkt: lineM(plan.mkt, revPlan), rm: lineM(plan.rm, revPlan), ga: gaFixed };
  const pri = { rev: revPrior, mat: lineM(V.matBase, revPrior), wages: lineM(laborBase - 1.0, revPrior), ot: lineM(1.0, revPrior), ben: lineM(laborBase * 0.12, revPrior), occ: lineM(occPct, revPlan), mkt: lineM(mktPct, revPrior), rm: lineM(1.4, revPrior), ga: gaFixed * 0.99 };
  const sum = (o, keys) => keys.reduce((n, k) => n + o[k], 0);
  const OPEX = ['wages', 'ot', 'ben', 'occ', 'mkt', 'rm', 'ga'];
  const gp = (o) => o.rev - o.mat, opex = (o) => sum(o, OPEX), ebitda = (o) => gp(o) - opex(o);
  const plRow = (label, k, opts = {}) => {
    const a = typeof k === 'function' ? k(act) : act[k], p = typeof k === 'function' ? k(pln) : pln[k], r = typeof k === 'function' ? k(pri) : pri[k];
    const isCost = opts.cost, v = a - p, bad = isCost ? v > 0 : v < 0;
    return { ...opts.row, cells: [{ t: label }, { t: usd(a) }, { t: usd(p) }, { t: (v >= 0 ? '+' : '-') + usd(Math.abs(v)).replace(/[()]/g, ''), tone: Math.abs(v) / Math.max(1, p) > 0.01 ? neg(bad) : '' }, { t: usd(r) }, { t: pct(a / act.rev * 100) }] };
  };
  const revRows = M ? locations.map((L) => ({ indent: true, cells: [{ t: L.name }, { t: usd(L.n.rev * K * W) }, { t: usd(L.b.rev * K * W * 1.02) }, { t: (L.n.rev >= L.b.rev * 1.02 ? '+' : '-') + usd(Math.abs(L.n.rev - L.b.rev * 1.02) * K * W).replace(/[()]/g, ''), tone: neg(L.n.rev < L.b.rev * 0.995) }, { t: usd(L.b.rev * K * W) }, { t: pct(L.n.rev / revSum * 100) }] }))
    : [['Services', 0.82], ['Products and other', 0.18]].map(([l, f]) => ({ indent: true, cells: [{ t: l }, { t: usd(revM * f) }, { t: usd(revPlan * f) }, { t: (revM >= revPlan ? '+' : '-') + usd(Math.abs(revM - revPlan) * f).replace(/[()]/g, ''), tone: neg(revM < revPlan * 0.995) }, { t: usd(revPrior * f) }, { t: pct(f * 100) }] }));
  const eb = ebitda(act), ebP = ebitda(pln), ebR = ebitda(pri), mA = eb / act.rev * 100, mP = ebP / pln.rev * 100;
  const pl = {
    id: 'x_pl', group: 'Financial statements', doc: head('Income statement', month + ', projected from month to date', 'Accounting · Payroll · ' + c.system),
    title: 'Income statement (P&L)', sub: month + ', projected · against plan and prior month', intro: 'Unaudited. Projected from month-to-date actuals at this week\'s run rate.',
    blocks: [
      { type: 'kpis', items: [{ label: 'Revenue, projected', value: kusd(act.rev), sub: pct(act.rev / pln.rev * 100) + ' of plan', tone: neg(act.rev < pln.rev * 0.98) }, { label: 'EBITDA, projected', value: kusd(eb), sub: (eb >= ebP ? '+' : '-') + kusd(Math.abs(eb - ebP)) + ' vs plan', tone: neg(eb < ebP) }, { label: 'EBITDA margin', value: pct(mA), sub: pts(mA - mP) + ' vs plan', tone: neg(mA < mP) }, { label: 'Labor, % of revenue', value: pct(laborAvg), sub: pts(laborAvg - 30) + ' vs plan', tone: neg(laborAvg > 30.4) }] },
      { title: 'Statement of operations', cols: ['', 'Projected', 'Plan', 'Variance', 'Prior month', '% of rev.'], rows: [
        { head: true, cells: [{ t: 'Revenue' }] }, ...revRows,
        plRow('Total revenue', 'rev', { row: { total: true } }),
        { head: true, cells: [{ t: 'Cost of sales' }] },
        plRow('{Materials}', 'mat', { cost: true, row: { indent: true } }),
        plRow('Gross profit', gp, { row: { total: true } }),
        { head: true, cells: [{ t: 'Operating expenses' }] },
        plRow('Wages', 'wages', { cost: true, row: { indent: true } }), plRow('Overtime premium', 'ot', { cost: true, row: { indent: true } }), plRow('Payroll taxes and benefits', 'ben', { cost: true, row: { indent: true } }),
        plRow('Occupancy', 'occ', { cost: true, row: { indent: true } }), plRow('Marketing', 'mkt', { cost: true, row: { indent: true } }), plRow('Repairs and maintenance', 'rm', { cost: true, row: { indent: true } }), plRow('General and administrative', 'ga', { cost: true, row: { indent: true } }),
        plRow('Total operating expenses', opex, { cost: true, row: { total: true } }),
        plRow('EBITDA', ebitda, { row: { grand: true } }),
      ] },
      { type: 'text', title: 'What moved the month', bullets: [
        'Labor is ' + pts(laborAvg - 30) + ' against plan' + (A ? ', concentrated' + at(A) + ', where overtime has climbed while volume held flat.' : '.'),
        '{Materials} are running ' + pts(V.matNow - V.matBase) + ' over plan. Pricing from {supplier} accounts for most of it.',
        B ? 'Repairs and maintenance are over plan on repeat {equipment} work' + at(B) + '.' : 'Repairs and maintenance are on plan.',
        'Revenue is pacing at ' + pct(act.rev / pln.rev * 100) + ' of plan' + (D ? ', with ' + (M ? D.name : 'new {customers}') + ' carrying the month.' : '.'),
      ] },
    ],
  };

  // ------------------------------------------------------------ cash flow
  const wk4 = revSum * K * 4, ni = wk4 * (mA - 2.5 - 0.6 - 3) / 100, da = wk4 * 0.025;
  const dAR = -wk4 * 0.004, dInv = -wk4 * (V.matNow - V.matBase) / 100 * 0.6, dAP = wk4 * 0.005, prem = wantCash ? -premium : 0;
  const cfo = ni + da + dAR + dInv + dAP + prem;
  const capex = -wk4 * 0.012, cfi = capex;
  const principal = -wk4 * 0.011, dist = -wk4 * 0.02, cff = principal + dist;
  const net = cfo + cfi + cff, begin = cash - net;
  const cf = {
    id: 'x_cash', group: 'Financial statements', doc: head('Statement of cash flows', 'Trailing four weeks, through ' + asOf, 'Accounting · Bank feeds'),
    title: 'Cash flow statement', sub: 'Trailing four weeks · operating, investing, financing', intro: 'Unaudited. Bank balances reconciled through ' + asOf + '.',
    blocks: [
      { type: 'kpis', items: [{ label: 'Operating cash flow', value: kusd(cfo), sub: 'trailing four weeks', tone: neg(cfo < 0) }, { label: 'Ending cash', value: kusd(cash), sub: (net >= 0 ? '+' : '-') + kusd(Math.abs(net)) + ' in four weeks', tone: neg(net < 0 && !wantCash) }, { label: 'Free cash flow', value: kusd(cfo + capex), sub: 'after maintenance capex', tone: neg(cfo + capex < 0) }, { label: 'Days cash on hand', value: String(Math.round(cash / (opex(act) / 30))), sub: 'at this month\'s spend' }] },
      { title: 'Cash flows', cols: ['', 'Trailing 4 weeks'], rows: [
        { head: true, cells: [{ t: 'Operating activities' }] },
        { indent: true, cells: [{ t: 'Net income' }, { t: usd(ni) }] }, { indent: true, cells: [{ t: 'Depreciation and amortization' }, { t: usd(da) }] },
        { indent: true, cells: [{ t: 'Accounts receivable' }, { t: usd(dAR) }] }, { indent: true, cells: [{ t: 'Inventory' }, { t: usd(dInv) }] }, { indent: true, cells: [{ t: 'Accounts payable' }, { t: usd(dAP) }] },
        ...(wantCash ? [{ indent: true, cells: [{ t: 'Prepaid insurance (annual premium, paid on schedule)' }, { t: usd(prem) }] }] : []),
        { total: true, cells: [{ t: 'Net cash from operating activities' }, { t: usd(cfo) }] },
        { head: true, cells: [{ t: 'Investing activities' }] },
        { indent: true, cells: [{ t: 'Maintenance capital expenditures' }, { t: usd(capex) }] },
        ...(B ? [{ indent: true, cells: [{ t: '{Equipment} replacement' + at(B) + ' (quote ' + usd(V.quote) + ', not yet approved)' }, { t: '$0' }] }] : []),
        { total: true, cells: [{ t: 'Net cash from investing activities' }, { t: usd(cfi) }] },
        { head: true, cells: [{ t: 'Financing activities' }] },
        { indent: true, cells: [{ t: 'Term loan principal' }, { t: usd(principal) }] }, { indent: true, cells: [{ t: 'Distributions' }, { t: usd(dist) }] },
        { total: true, cells: [{ t: 'Net cash from financing activities' }, { t: usd(cff) }] },
        { total: true, cells: [{ t: 'Net change in cash' }, { t: usd(net) }] },
        { indent: true, cells: [{ t: 'Cash, beginning of period' }, { t: usd(begin) }] },
        { grand: true, cells: [{ t: 'Cash, end of period' }, { t: usd(cash) }] },
      ] },
      { type: 'text', title: 'Notes', bullets: [wantCash ? 'The drop in cash this week is the annual insurance premium, paid on schedule. It is prepaid, not spent.' : 'No unusual items this period.', 'Inventory is building with {materials} pricing, not usage.' + (B ? ' The {equipment} replacement' + at(B) + ' would be the period\'s largest capital item.' : '')] },
    ],
  };

  // ------------------------------------------------------------ balance sheet
  const ann = revSum * K * 52, wkMat = revSum * K * V.matNow / 100, wkLab = revSum * K * laborAvg / 100;
  const ar = revSum * K / 7 * AR_DAYS[shellId], inv = wkMat * 2.4, prepaid = wantCash ? premium * 11 / 12 : ann * 0.004, ppe = ann * 0.24;
  const ap = wkMat * 2.8, accr = wkLab * 0.85, curDebt = -principal * 12, loc = ann * u(0, 0.005), term = ann * u(0.1, 0.16);
  const ca = cash + ar + inv + prepaid, ta = ca + ppe, cl = ap + accr + curDebt + loc, tl = cl + term, eq = ta - tl;
  const ttmEbitda = ann * planMargin / 100 * 0.97;
  const bs = {
    id: 'x_bs', group: 'Financial statements', doc: head('Balance sheet', 'As of ' + asOf, 'Accounting'),
    title: 'Balance sheet', sub: 'As of ' + asOf + ' · liquidity and leverage', intro: 'Unaudited. Debt balances per lender statements.',
    blocks: [
      { type: 'kpis', items: [{ label: 'Current ratio', value: (ca / cl).toFixed(2) + 'x', sub: 'covenant floor 1.20x', tone: neg(ca / cl < 1.2) }, { label: 'Total debt / EBITDA', value: ((curDebt + loc + term) / ttmEbitda).toFixed(2) + 'x', sub: 'trailing twelve months' }, { label: 'Working capital', value: kusd(ca - cl), sub: 'current assets less current liabilities' }, { label: 'Owners\' equity', value: kusd(eq), sub: pct(eq / ta * 100, 0) + ' of total assets' }] },
      { title: 'Statement of financial position', cols: ['', 'Balance'], rows: [
        { head: true, cells: [{ t: 'Assets' }] },
        { indent: true, cells: [{ t: 'Cash' }, { t: usd(cash) }] }, { indent: true, cells: [{ t: 'Accounts receivable' }, { t: usd(ar) }] }, { indent: true, cells: [{ t: 'Inventory' }, { t: usd(inv) }] }, { indent: true, cells: [{ t: 'Prepaid expenses' }, { t: usd(prepaid) }] },
        { total: true, cells: [{ t: 'Total current assets' }, { t: usd(ca) }] },
        { indent: true, cells: [{ t: 'Property and equipment, net' }, { t: usd(ppe) }] },
        { grand: true, cells: [{ t: 'Total assets' }, { t: usd(ta) }] },
        { head: true, cells: [{ t: 'Liabilities and equity' }] },
        { indent: true, cells: [{ t: 'Accounts payable' }, { t: usd(ap) }] }, { indent: true, cells: [{ t: 'Accrued payroll' }, { t: usd(accr) }] }, { indent: true, cells: [{ t: 'Current portion of long-term debt' }, { t: usd(curDebt) }] }, { indent: true, cells: [{ t: 'Line of credit' }, { t: usd(loc) }] },
        { total: true, cells: [{ t: 'Total current liabilities' }, { t: usd(cl) }] },
        { indent: true, cells: [{ t: 'Term loan, less current portion' }, { t: usd(term) }] },
        { total: true, cells: [{ t: 'Total liabilities' }, { t: usd(tl) }] },
        { indent: true, cells: [{ t: 'Owners\' equity' }, { t: usd(eq) }] },
        { grand: true, cells: [{ t: 'Total liabilities and equity' }, { t: usd(tl + eq) }] },
      ] },
    ],
  };

  // ------------------------------------------------------------ the quarter so far
  const growth = u(0.03, 0.07);
  const qRev = revBase * K * qWeeks * 1.01, qPrior = qRev / (1 + growth), qEb = qRev * (planMargin - 0.6) / 100, qEbPrior = qPrior * (planMargin - 1.4) / 100;
  const qRow = (label, a, b, money = true) => ({ cells: [{ t: label }, { t: money ? usd(a) : a }, { t: money ? usd(b) : b }, { t: money ? chg(a / b - 1) : '', tone: money ? neg(a < b) : '' }] });
  const earn = {
    id: 'x_earn', group: 'Performance', doc: head('Quarterly earnings summary', 'Q' + q + ' to date · ' + qWeeks + ' weeks', 'Accounting · ' + c.system),
    title: 'Quarterly earnings summary', sub: 'Q' + q + ' to date against the same weeks last year', intro: 'Same-store figures exclude locations open less than twelve months.',
    blocks: [
      { type: 'kpis', items: [{ label: 'Revenue, Q' + q + ' to date', value: kusd(qRev), sub: chg(growth) + ' year over year' }, { label: 'EBITDA, Q' + q + ' to date', value: kusd(qEb), sub: chg(qEb / qEbPrior - 1) + ' year over year' }, { label: 'EBITDA margin', value: pct(qEb / qRev * 100), sub: pts((qEb / qRev - qEbPrior / qPrior) * 100) + ' year over year' }, { label: M ? 'Same-store sales' : 'Visits', value: chg(growth - 0.008), sub: 'year over year' }] },
      { title: 'Summary', cols: ['', 'Q' + q + ' to date', 'Prior year', 'Change'], rows: [qRow('Revenue', qRev, qPrior), qRow('Gross profit', qRev * (1 - V.matNow / 100 + 0.004), qPrior * (1 - V.matBase / 100)), qRow('EBITDA', qEb, qEbPrior), { cells: [{ t: 'EBITDA margin' }, { t: pct(qEb / qRev * 100) }, { t: pct(qEbPrior / qPrior * 100) }, { t: pts((qEb / qRev - qEbPrior / qPrior) * 100) }] }] },
      ...(M ? [{ title: 'By location', cols: ['', 'Revenue, Q' + q + ' to date', 'Year over year', 'Share'], rows: locations.map((L) => { const g = growth + (L === D ? 0.04 : L === B ? -0.03 : u(-0.02, 0.02)); return { cells: [{ t: L.name }, { t: usd(L.b.rev * K * qWeeks) }, { t: chg(g), tone: neg(g < 0) }, { t: pct(L.b.rev / revBase * 100) }] }; }) }] : []),
      { type: 'text', title: 'What drove the quarter', bullets: [
        'Revenue growth of ' + chg(growth) + ' came mostly from price and new {customers}' + (D ? ', led by the intro offer' + at(D) : '') + '.',
        'Margin expansion is being held back by labor' + (A ? at(A) : '') + ' and {materials} pricing.',
        X ? 'One closure day' + at(X) + ' last week softened the weekly flash; per open day, that location grew.' : 'No closures this quarter.',
      ] },
    ],
  };

  // ------------------------------------------------------------ the locations, eight weeks
  const series = (from, to, wob = 0.012) => Array.from({ length: 8 }, (_, i) => from + (to - from) * Math.pow(i / 7, 1.6) + from * u(-wob, wob));
  const trendRows = M
    ? locations.map((L) => {
      const rs = series(L.b.rev, L.n.rev), ls = series(L.b.labor, L.n.labor, 0.01);
      return { cells: [{ t: L.name }, { t: kusd(L.n.rev * K) }, { spark: rs, t: chg(L.n.rev / L.b.rev - 1), tone: neg(L.n.rev < L.b.rev * 0.99) }, { spark: ls, t: pct(L.n.labor), tone: neg(L.n.labor > 30.5) }, { t: L.n.repeat + '%', tone: neg(L.n.repeat < 55) }, { t: L.n.csat.toFixed(1) }, { t: String(L.n.ot) }] };
    })
    : (() => { const L = locations[0]; return [['Weekly revenue', series(L.b.rev, L.n.rev), kusd(L.n.rev * K), L.n.rev < L.b.rev * 0.99], ['Labor, % of revenue', series(L.b.labor, L.n.labor, 0.01), pct(L.n.labor), L.n.labor > 30.5], ['Returning {customers}', series(L.b.repeat, L.n.repeat, 0.01), L.n.repeat + '%', L.n.repeat < 55], ['{WaitLabel}', series(L.b.wait, L.n.wait, 0.03), L.n.wait + ' min', L.n.wait > 15], ['Overtime hours', series(L.b.ot, L.n.ot, 0.05), String(L.n.ot), L.n.ot > 20]].map(([l, sp, v, bad]) => ({ cells: [{ t: l }, { t: v, tone: neg(bad) }, { spark: sp, t: '' }] })); })();
  const trends = {
    id: 'x_trends', group: 'Performance', doc: head(M ? 'Location trends' : 'Operating trends', 'Last eight weeks, through ' + asOf, c.system + ' · Payroll · CRM'),
    title: M ? 'Location trends' : 'Operating trends', sub: 'Eight weeks of revenue, labor and {customers}' + (M ? ', by location' : ''), intro: 'Each line runs from eight weeks ago to last week.',
    blocks: [
      { title: M ? 'By location' : 'Key measures', cols: M ? ['', 'Last week', 'Revenue, 8 wks', 'Labor %, 8 wks', 'Returning', 'Satisfaction', 'Overtime hrs'] : ['', 'Last week', '8-week trend'], rows: trendRows },
      { type: 'text', title: 'Read across', bullets: [M ? 'Revenue is ' + (revSum >= revBase ? 'up ' : 'down ') + Math.abs((revSum / revBase - 1) * 100).toFixed(1) + '% across the portfolio over eight weeks.' : 'Revenue is ' + (revSum >= revBase ? 'up ' : 'down ') + Math.abs((revSum / revBase - 1) * 100).toFixed(1) + '% over eight weeks.', A ? 'Labor has drifted up' + at(A) + ' every week for six weeks.' : 'Labor is steady.', D ? 'Returning {customers} are sliding' + at(D) + ' while new ones fill the book.' : 'Returning {customers} are steady.'] },
    ],
  };

  // ------------------------------------------------------------ labor
  const totHrs = locations.reduce((n, L) => n + L.n.hrs, 0), totOt = locations.reduce((n, L) => n + L.n.ot, 0);
  const labor = {
    id: 'x_labor', group: 'Performance', doc: head('Labor report', 'Week ending ' + asOf, 'Payroll · Scheduling · HR'),
    title: 'Labor and staffing report', sub: 'Hours, overtime, open roles, turnover and schedule lead time', intro: 'Labor percentage includes wages and overtime; benefits are reported on the income statement.',
    blocks: [
      { type: 'kpis', items: [{ label: 'Labor, % of revenue', value: pct(laborAvg), sub: pts(laborAvg - laborBase) + ' vs eight-week average', tone: neg(laborAvg > 30.4) }, { label: 'Hours worked', value: totHrs.toLocaleString('en-US'), sub: 'last week' }, { label: 'Overtime hours', value: String(totOt), sub: pct(totOt / totHrs * 100) + ' of hours', tone: neg(totOt / totHrs > 0.035) }, { label: 'Open roles', value: String(locations.reduce((n, L) => n + L.n.req, 0)), sub: 'across the company' }] },
      { title: M ? 'By location' : 'This week', cols: ['', 'Hours', 'Overtime', 'Labor %', 'Labor %, 8 wks', 'Open roles', 'Exits, 5 wks', 'Schedule posted'], rows: locations.map((L) => ({ cells: [{ t: M ? L.name : company }, { t: L.n.hrs.toLocaleString('en-US') }, { t: String(L.n.ot), tone: neg(L.n.ot > 20) }, { t: pct(L.n.labor), tone: neg(L.n.labor > 30.5) }, { spark: series(L.b.labor, L.n.labor, 0.01), t: '' }, { t: String(L.n.req) }, { t: String(L.n.exits), tone: neg(L.n.exits >= 2) }, { t: L.n.post.toFixed(1) + ' days', tone: neg(L.n.post < 6) }] })) },
      { type: 'text', title: 'Watch list', bullets: [A ? 'Overtime' + at(A) + ' is concentrated in the ' + c.peaks + '.' : 'Overtime is within normal range.', E ? 'Three new-hire exits' + at(E) + ' in five weeks; schedules there post ' + E.n.post.toFixed(1) + ' days ahead against a standard of seven.' : 'Turnover is in line with last year.'] },
    ],
  };

  // ------------------------------------------------------------ the managers
  const mark = (ok) => (ok ? '● On target' : '▲ Off target');
  const reviews = {
    id: 'x_reviews', group: 'Performance', doc: head('Manager scorecards', 'Q' + q + ' review cycle', 'Payroll · ' + c.system + ' · CRM · HR'),
    title: 'Manager scorecards', sub: 'Quarterly reviews due · every {mgrTitle} against the same measures', intro: 'Reviews are due by the end of the quarter. Each scorecard uses last week\'s numbers against quarterly targets.',
    blocks: locations.map((L) => {
      const k = L.manager, p = characters[k];
      const notes = [];
      if (L === A) notes.push('Working long hours to cover the ' + c.peaks + '; has asked for two more hires.');
      if (L === B) notes.push('Managing repeat {equipment} failures and the overflow that comes with them.');
      if (L === D) notes.push('Strongest revenue month on record; desk role open since a departure.');
      if (L === E) notes.push('Covering shifts personally; schedule lead time well under standard.');
      if (!notes.length) notes.push('Steady quarter. Strong team rhythm.');
      return { title: p.name + ' · ' + '{mgrTitle}' + (M ? ', ' + L.name : ''), note: 'In role since ' + (p.since || L.opened) + ' · ' + L.staff + ' people · ' + notes.join(' '), cols: ['Measure', 'Target', 'Last week', ''], rows: [
        { cells: [{ t: 'Revenue vs plan' }, { t: '≥ 98%' }, { t: pct(L.n.rev / (L.b.rev * 1.02) * 100) }, { t: mark(L.n.rev >= L.b.rev * 1.02 * 0.98), tone: L.n.rev >= L.b.rev * 1.02 * 0.98 ? 'pos' : 'neg' }] },
        { cells: [{ t: 'Labor, % of revenue' }, { t: '≤ 30.5%' }, { t: pct(L.n.labor) }, { t: mark(L.n.labor <= 30.5), tone: L.n.labor <= 30.5 ? 'pos' : 'neg' }] },
        { cells: [{ t: 'Satisfaction' }, { t: '≥ 4.5' }, { t: L.n.csat.toFixed(1) }, { t: mark(L.n.csat >= 4.5), tone: L.n.csat >= 4.5 ? 'pos' : 'neg' }] },
        { cells: [{ t: 'Returning {customers}' }, { t: '≥ 55%' }, { t: L.n.repeat + '%' }, { t: mark(L.n.repeat >= 55), tone: L.n.repeat >= 55 ? 'pos' : 'neg' }] },
        { cells: [{ t: 'Schedule posted ahead' }, { t: '≥ 6 days' }, { t: L.n.post.toFixed(1) + ' days' }, { t: mark(L.n.post >= 6), tone: L.n.post >= 6 ? 'pos' : 'neg' }] },
      ] };
    }),
  };

  // ------------------------------------------------------------ growth
  const avgRev = revBase / N, build = ann / N * BUILD[shellId], ss = avgRev * K * 52 * 0.92, ssEb = ss * (planMargin + 1) / 100;
  const payback = build / (ssEb / 12) + 4;
  const ready = [];
  if (A) ready.push(['Labor model', 'Fix the scheduling template' + at(A) + ' before copying it to a new site.', false]);
  if (E) ready.push(['Hiring and retention', 'Hold new-hire exits' + at(E) + ' before staffing a new team.', false]);
  ready.push(['Unit economics', 'Plan EBITDA margin of ' + pct(planMargin) + ' per {unit}; this month is running at ' + pct(mA) + '.', mA >= planMargin - 2.5]);
  ready.push(['Balance sheet', 'Debt / EBITDA ' + ((curDebt + loc + term) / ttmEbitda).toFixed(2) + 'x leaves room for build-out financing.', (curDebt + loc + term) / ttmEbitda < 2.5]);
  const growthDoc = {
    id: 'x_growth', group: 'Planning', doc: head(M ? 'Expansion outlook' : 'Second-location feasibility', 'Prepared ' + asOf, 'Accounting · ' + c.system + ' · Market data'),
    title: M ? 'Expansion outlook' : 'Second-location feasibility', sub: 'Pro forma for the next {unit}, and what has to be true first', intro: 'Based on the average performance of ' + (M ? 'current {units}' : 'the current ' + '{unit}') + '. Market inputs are directional.',
    blocks: [
      { type: 'kpis', items: [{ label: 'Build-out', value: kusd(build), sub: 'equipment, fit-out, opening' }, { label: 'Year-two revenue', value: kusd(ss), sub: 'at 92% of the average ' + '{unit}' }, { label: 'Year-two EBITDA', value: kusd(ssEb), sub: pct(planMargin + 1) + ' margin' }, { label: 'Payback', value: Math.round(payback) + ' months', sub: 'including ramp' }] },
      { title: 'Ramp', cols: ['', 'Months 1-3', 'Months 4-6', 'Months 7-12', 'Year two'], rows: [
        { cells: [{ t: 'Revenue, % of mature' }, { t: '45%' }, { t: '70%' }, { t: '85%' }, { t: '100%' }] },
        { cells: [{ t: 'Revenue' }, { t: usd(ss / 12 * 3 * 0.45) }, { t: usd(ss / 12 * 3 * 0.7) }, { t: usd(ss / 12 * 6 * 0.85) }, { t: usd(ss) }] },
        { cells: [{ t: 'EBITDA' }, { t: usd(-build * 0.04) }, { t: usd(ss / 12 * 3 * 0.7 * 0.05) }, { t: usd(ss / 12 * 6 * 0.85 * 0.11) }, { t: usd(ssEb) }] },
      ] },
      { title: 'Readiness', cols: ['', 'What has to be true', ''], rows: ready.map(([a, b2, ok]) => ({ cells: [{ t: a }, { t: b2 }, { t: ok ? '● Ready' : '▲ Not yet', tone: ok ? 'pos' : 'neg' }] })) },
    ],
  };

  return { pl, cf, bs, earn, trends, labor, reviews, growthDoc, bossName };
}
