// WAKE AT WORK
// About ten seconds between the rounds: the same Monday, and this time Wake gets there first. Every
// source the business runs on lights up (the ERP's modules, the inbox, the calendar, the phone, and
// the dozens of other systems Wake connects to), records stream into Wake, and the counts fall from
// thousands of records to a handful of insights. Nothing to read; it shows the work being done.

import { h } from './art.js';
import { icon } from './os/shell.js';

const SVG = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs) => { const el = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; };
// Other systems a business like this runs on. Not connected in this demo; shown so the ERP reads as
// one source among many.
const MORE = ['Bank feeds', 'POS', 'CRM', 'Reviews', 'Scheduling', 'Inventory', 'Payroll provider', 'Spreadsheets', 'Phone system', 'Help desk', 'E-commerce', 'Time clock'];

export function wakeAtWork({ mount, game, reduced, sfx, erpName }) {
  const B = game.briefing(), w = game.world, F = B.funnel;
  const insights = B.cards.length;
  const live = B.systems.map((s) => ({ name: s.name, sub: erpName, ico: 'erp', n: s.n }))
    .concat([{ name: 'Gmail', sub: 'Inbox', ico: 'gmail' }, { name: 'Calendar', sub: 'Google', ico: 'calendar' }, { name: 'Texts', sub: 'Phone', ico: 'messages' }]);
  const nodes = live.map((x) => ({ ...x, live: true })).concat(MORE.map((name) => ({ name, live: false })));

  // Sources on an ellipse around Wake, live ones on the inner ring.
  const W = 1000, H = 560, cx = W / 2, cy = H / 2;
  const place = (list, rx, ry, off) => list.forEach((n, i) => { const a = off + (i / list.length) * Math.PI * 2; n.x = cx + Math.cos(a) * rx; n.y = cy + Math.sin(a) * ry; });
  const inner = nodes.filter((n) => n.live), outer = nodes.filter((n) => !n.live);
  place(inner, 300, 170, -Math.PI / 2);
  place(outer, 455, 250, -Math.PI / 2 + 0.26);

  const stage = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'ww-svg', preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true' });
  const lines = svg('g', {}), dots = svg('g', {}), labels = svg('g', {});
  stage.append(lines, dots, labels);
  for (const n of nodes) {
    n.line = svg('line', { x1: n.x, y1: n.y, x2: cx, y2: cy, class: 'ww-ln' + (n.live ? '' : ' far') });
    lines.appendChild(n.line);
    const g = svg('g', { class: 'ww-node' + (n.live ? ' live' : ' far'), transform: 'translate(' + n.x + ' ' + n.y + ')' });
    const wd = Math.max(86, n.name.length * 7.4 + 26);
    g.append(svg('rect', { x: -wd / 2, y: -15, width: wd, height: 30, rx: 8 }));
    const t = svg('text', { x: 0, y: 5, 'text-anchor': 'middle' }); t.textContent = n.name; g.appendChild(t);
    if (n.live) { const s = svg('text', { x: 0, y: -21, 'text-anchor': 'middle', class: 'ww-sub' }); s.textContent = n.sub; g.appendChild(s); }
    labels.appendChild(g); n.g = g;
  }

  const caption = h('p', { class: 'ww-cap' }, '');
  const stat = (label) => { const b = h('b', {}, '0'); return { el: h('div', { class: 'ww-st' }, b, h('span', {}, label)), b }; };
  const S = { rec: stat('records read'), sig: stat('signals worth a look'), con: stat('connected across sources'), exp: stat('explained, no action'), ins: stat('insights for you') };
  const core = h('div', { class: 'ww-core' }, icon('wake', 'ico ww-logo'), h('span', {}, 'Wake'));
  const go = h('button', { class: 'ab primary ww-go', type: 'button', hidden: true }, 'Open your computer');
  const skip = h('button', { class: 'ww-skip', type: 'button' }, 'Skip');
  mount(h('main', { class: 'sc-screen ww' },
    h('div', { class: 'ww-top' }, h('p', { class: 'ww-k' }, w.shell.company + ' · ' + w.shell.mondayLong + ' · 7:48 AM'), caption, skip),
    h('div', { class: 'ww-stage' }, stage, core),
    h('div', { class: 'ww-stats' }, Object.values(S).map((x) => x.el)),
    h('div', { class: 'ww-foot' }, go)));

  return new Promise((resolve) => {
    let raf = 0, done = false, t0 = performance.now();
    const fmt = (x) => Math.round(x).toLocaleString('en-US');
    const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
    const say = (text) => { if (caption.textContent !== text) { caption.classList.remove('in'); void caption.offsetWidth; caption.textContent = text; caption.classList.add('in'); } };
    const flying = [];
    let lastSpawn = 0, beeps = 0;
    const finish = () => {
      if (done) return; done = true; cancelAnimationFrame(raf);
      for (const n of nodes) { n.g.classList.add('on'); n.line.classList.add('on'); }
      dots.replaceChildren();
      S.rec.b.textContent = fmt(F.records); S.sig.b.textContent = fmt(F.surfaced); S.con.b.textContent = fmt(F.material); S.exp.b.textContent = fmt(F.dismissed); S.ins.b.textContent = String(insights);
      for (const x of Object.values(S)) x.el.classList.add('on');
      core.classList.add('done');
      say('Done before you sat down. ' + insights + ' insights, ranked, each with the evidence and an owner.');
      skip.hidden = true; go.hidden = false; go.focus({ preventScroll: true });
      if (sfx) sfx.credit();
    };
    const end = () => { finish(); resolve(); };
    go.onclick = end; skip.onclick = end;
    if (reduced) { finish(); return; }

    const T = 10000;
    const frame = (now) => {
      const t = now - t0;
      // 0 to 2.6 s: sources connect, one by one, then the wider stack
      inner.forEach((n, i) => { if (t > 300 + i * 220) { n.g.classList.add('on'); n.line.classList.add('on'); } });
      outer.forEach((n, i) => { if (t > 1700 + i * 70) n.g.classList.add('on'); });
      if (t < 2600) say('Wake connects to everything ' + w.shell.company + ' runs on. ' + erpName + ' is one source.');
      else if (t < 6000) say('It reads every record from this morning: the ERP, the inbox, the calendar.');
      else if (t < 8600) say('It connects signals across systems, and explains what\'s normal.');
      // records stream in from the live sources
      if (t > 900 && t < 7600 && now - lastSpawn > 55) {
        lastSpawn = now;
        const n = inner[Math.floor(Math.random() * inner.length)];
        const d = svg('circle', { r: 3, cx: n.x, cy: n.y, class: 'ww-dot' }); dots.appendChild(d);
        flying.push({ d, n, s: now });
      }
      for (let i = flying.length - 1; i >= 0; i--) {
        const f = flying[i], p = (now - f.s) / 900;
        if (p >= 1) { f.d.remove(); flying.splice(i, 1); core.classList.remove('pulse'); void core.offsetWidth; core.classList.add('pulse'); continue; }
        const e = ease(p); f.d.setAttribute('cx', f.n.x + (cx - f.n.x) * e); f.d.setAttribute('cy', f.n.y + (cy - f.n.y) * e);
      }
      // the counts fall from thousands of records to a handful of insights
      S.rec.b.textContent = fmt(F.records * ease((t - 1000) / 5600));
      S.sig.b.textContent = fmt(F.surfaced * ease((t - 3600) / 2400));
      S.con.b.textContent = fmt(F.material * ease((t - 5800) / 1800));
      S.exp.b.textContent = fmt(F.dismissed * ease((t - 6800) / 1200));
      S.ins.b.textContent = fmt(insights * ease((t - 7800) / 900));
      [[S.rec, 1000], [S.sig, 3600], [S.con, 5800], [S.exp, 6800], [S.ins, 7800]].forEach(([x, at]) => { if (t > at) x.el.classList.add('on'); });
      if (sfx && t > 1000 + beeps * 1600 && t < 8000) { beeps += 1; sfx.blip(); }
      if (t >= T) { finish(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  });
}
