// WAKE AT WORK
// About ten seconds between the rounds, told left to right in three numbered steps so anyone can
// follow it: 1. Wake reads everything (the ERP, the inbox, the calendar, texts), 2. it connects
// the dots (thousands of records down to the signals that belong together), 3. it hands you what
// matters (this morning's actual insights, ranked, each with an owner). Then one button.

import { h } from './art.js';
import { icon, face } from './os/shell.js';

const SVG = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs) => { const el = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; };
const fmt = (x) => Math.round(x).toLocaleString('en-US');

export function wakeAtWork({ mount, game, reduced, sfx, erpName }) {
  const B = game.briefing(), F = B.funnel, cards = B.cards, total = cards.length;
  const SHOW = 4;

  // ---- the three columns: where it reads, Wake, what it hands you
  const erpCard = h('div', { class: 'w2-src erp' },
    h('div', { class: 'w2-sh' }, icon('erp', 'ico w2-ico'), h('b', {}, erpName)),
    h('div', { class: 'w2-mods' }, B.systems.map((s) => h('span', {}, s.name))));
  const small = (ico, name, note) => h('div', { class: 'w2-src' }, h('div', { class: 'w2-sh' }, icon(ico, 'ico w2-ico'), h('b', {}, name), h('em', {}, note)));
  const sources = [erpCard, small('gmail', 'Gmail', 'every email'), small('calendar', 'Calendar', 'every meeting'), small('messages', 'Texts', 'sent to Wake')];
  const more = h('div', { class: 'w2-more' }, '+ the other systems you run on');
  const left = h('div', { class: 'w2-col left' }, sources, more);

  const num = h('b', { class: 'w2-num' }, '0'), unit = h('span', { class: 'w2-unit' }, 'records read');
  const core = h('div', { class: 'w2-core' }, h('div', { class: 'w2-ring' }, icon('wake', 'ico w2-logo')), h('div', { class: 'w2-count' }, num, unit));
  const mid = h('div', { class: 'w2-col mid' }, core);

  const results = cards.slice(0, SHOW).map((c) => h('div', { class: 'w2-res' },
    h('em', {}, String(c.rank)),
    h('div', {}, h('small', {}, c.place), h('b', {}, c.headline)),
    c.owners[0] ? h('span', { class: 'w2-own' }, face(c.owners[0].name, 26), h('i', {}, c.owners[0].name.split(' ')[0])) : null));
  const rest = total > SHOW ? h('div', { class: 'w2-more right' }, '+ ' + (total - SHOW) + ' more') : null;
  const right = h('div', { class: 'w2-col right' }, results, rest);

  const wires = svg('svg', { class: 'w2-wires', 'aria-hidden': 'true' });
  const flow = h('div', { class: 'w2-flow' }, wires, left, mid, right);

  // ---- the words: a numbered step bar, one headline, one line under it
  const STEPS = [['1', 'Reads everything'], ['2', 'Connects the dots'], ['3', 'Hands you what matters']];
  const pills = STEPS.map(([n, t]) => h('li', {}, h('i', {}, n), h('span', {}, t)));
  const title = h('h1', { class: 'w2-h' }), sub = h('p', { class: 'w2-sub' });
  const go = h('button', { class: 'w2-go', type: 'button', hidden: true }, 'Open your computer  →');
  const skip = h('button', { class: 'w2-skip', type: 'button' }, 'Skip');
  const root = h('main', { class: 'sc-screen w2' },
    h('header', { class: 'w2-top' }, h('ol', { class: 'w2-steps' }, pills), skip),
    h('div', { class: 'w2-words' }, title, sub),
    flow,
    h('div', { class: 'w2-foot' }, go));
  mount(root);

  const say = (t, s) => { title.textContent = t; sub.textContent = s; title.classList.remove('in'); sub.classList.remove('in'); void title.offsetWidth; title.classList.add('in'); sub.classList.add('in'); };
  const step = (i) => { pills.forEach((p, j) => { p.classList.toggle('on', j === i); p.classList.toggle('done', j < i); }); root.dataset.step = String(i + 1); };

  // ---- wires from each source into Wake, and from Wake out to each insight
  const paths = { into: [], out: [] };
  function draw() {
    const box = flow.getBoundingClientRect();
    wires.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    wires.replaceChildren();
    const c = core.querySelector('.w2-ring').getBoundingClientRect();
    const cx = c.left + c.width / 2 - box.left, cy = c.top + c.height / 2 - box.top, r = c.width / 2;
    const curve = (x1, y1, x2, y2) => 'M' + x1 + ',' + y1 + ' C' + (x1 + (x2 - x1) * 0.5) + ',' + y1 + ' ' + (x1 + (x2 - x1) * 0.5) + ',' + y2 + ' ' + x2 + ',' + y2;
    paths.into = sources.map((el) => { const b = el.getBoundingClientRect(); const p = svg('path', { d: curve(b.right - box.left, b.top + b.height / 2 - box.top, cx - r, cy), class: 'w2-wire in' }); wires.appendChild(p); return p; });
    paths.out = results.map((el) => { const b = el.getBoundingClientRect(); const p = svg('path', { d: curve(cx + r, cy, b.left - box.left, b.top + b.height / 2 - box.top), class: 'w2-wire out' }); wires.appendChild(p); return p; });
  }
  const onResize = () => draw();
  window.addEventListener('resize', onResize);

  return new Promise((resolve) => {
    let raf = 0, done = false;
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
    const countTo = (from, to, ms, label) => {
      unit.textContent = label;
      const t0 = performance.now();
      const tick = (now) => { const p = ease((now - t0) / ms); num.textContent = fmt(from + (to - from) * p); if (p < 1 && !done) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    };
    const end = () => {
      if (done) return; done = true;
      timers.forEach(clearTimeout); cancelAnimationFrame(raf); window.removeEventListener('resize', onResize);
      resolve();
    };
    const finalState = () => {
      step(2); root.classList.add('s1', 's2', 's3', 'fin');
      num.textContent = String(total); unit.textContent = total === 1 ? 'insight for you' : 'insights for you';
      say('Ready before you sat down.', total + ' things that need you, ranked, each with an owner. Now it\'s your call.');
      skip.hidden = true; go.hidden = false; go.focus({ preventScroll: true });
      if (sfx) sfx.credit();
    };
    go.onclick = end;
    skip.onclick = () => { finalState(); end(); };
    if (reduced) { requestAnimationFrame(() => { draw(); finalState(); }); return; }

    // the dots: records travelling along the wires
    const dots = svg('g', {}); let flying = [], last = 0;
    const frame = (now) => {
      if (done) return;
      const spawn = (list, cls) => { const p = list[Math.floor(Math.random() * list.length)]; if (!p) return; const d = svg('circle', { r: 3.2, class: 'w2-dot ' + cls }); dots.appendChild(d); flying.push({ d, p, s: now, len: p.getTotalLength() }); };
      if (now - last > 90) { last = now; if (root.classList.contains('s1') && !root.classList.contains('s3')) spawn(paths.into, 'in'); if (root.classList.contains('s3') && !root.classList.contains('fin')) spawn(paths.out, 'out'); }
      flying = flying.filter((f) => { const t = (now - f.s) / 1100; if (t >= 1) { f.d.remove(); return false; } const pt = f.p.getPointAtLength(f.len * ease(t)); f.d.setAttribute('cx', pt.x); f.d.setAttribute('cy', pt.y); return true; });
      raf = requestAnimationFrame(frame);
    };

    requestAnimationFrame(() => {
      draw(); wires.appendChild(dots);
      // 1. reads everything
      step(0); root.classList.add('s1');
      say('Wake reads everything.', 'Your ' + erpName + ', inbox, calendar and texts. Every record from this morning.');
      countTo(0, F.records, 3000, 'records read');
      raf = requestAnimationFrame(frame);
      // 2. connects the dots
      at(3600, () => {
        step(1); root.classList.add('s2');
        say('It connects the dots.', 'Numbers from different systems that point to the same problem.');
        countTo(F.records, F.material, 1600, 'signals that matter');
        if (sfx) sfx.blip();
      });
      // 3. hands you what matters
      at(7000, () => {
        step(2); root.classList.add('s3');
        say('It hands you what matters.', total + ' things that need you, ranked, each with an owner.');
        countTo(F.material, total, 900, total === 1 ? 'insight for you' : 'insights for you');
        if (sfx) sfx.blip();
      });
      at(10200, finalState);
    });
  });
}
