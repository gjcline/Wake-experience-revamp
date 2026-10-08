// The signal field. One dot for every operating record the business generated that week.
// The counts come straight from the Intelligence Engine; nothing here is decorative math.
// Yellow is what crossed the user's desk. The rest is what did not.

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function createField(canvas, wake, reduced) {
  const ctx = canvas.getContext('2d');
  const rand = rng(4817);
  let W = 0, H = 0, dpr = 1, raf = 0, stage = 0, dead = false;
  const P = [];
  const clusters = wake.field;
  const total = clusters.reduce((n, c) => n + c.volume, 0);

  // which particles carry which role
  const evidence = wake.findings.flatMap((f, fi) => f.evidence.map((e) => ({ fi, seen: e.seen, pinned: e.pinned })));
  const extraMoved = Math.max(0, wake.funnel.moved - wake.funnel.material);
  clusters.forEach((c, ci) => { for (let i = 0; i < c.volume; i++) P.push({ ci, opened: c.opened, role: 0, fi: -1, seen: false, x: 0, y: 0, tx: 0, ty: 0, a: 0, ta: 0, r: 1, jx: rand(), jy: rand(), k: i }); });
  // spread the special particles evenly through the field so they come from everywhere
  const step = Math.floor(P.length / (evidence.length + extraMoved + 1));
  evidence.forEach((e, i) => { const p = P[(i + 1) * step - 3]; p.role = 2; p.fi = e.fi; p.seen = e.seen || e.pinned; p.ei = i; });
  for (let i = 0; i < extraMoved; i++) { const p = P[(evidence.length + i + 1) * step - 3]; if (p.role === 0) p.role = 1; }

  function layout() {
    const cols = W > 700 ? 4 : 2, rows = Math.ceil(clusters.length / cols);
    const padX = W * 0.06, padY = H * 0.1, cw = (W - padX * 2) / cols, ch = (H - padY * 2) / rows;
    const groupN = wake.findings.map((f) => f.evidence.length);
    const counters = wake.findings.map(() => 0);
    for (const p of P) {
      const cx = padX + cw * ((p.ci % cols) + 0.5), cy = padY + ch * (Math.floor(p.ci / cols) + 0.5);
      const spread = Math.sqrt(clusters[p.ci].volume / total);
      const ang = p.jx * Math.PI * 2, rad = Math.sqrt(p.jy) * Math.min(cw, ch) * (0.2 + spread * 0.55);
      p.home = [cx + Math.cos(ang) * rad * 1.25, cy + Math.sin(ang) * rad];
      const side = Math.ceil(Math.sqrt(clusters[p.ci].volume)), g = Math.min(cw, ch) * 0.8 / side;
      p.grid = [cx + ((p.k % side) - side / 2) * g, cy + (Math.floor(p.k / side) - side / 2) * g];
      if (p.role === 2) {
        const n = groupN[p.fi], i = counters[p.fi]++;
        const a = i * 2.39996, r = Math.sqrt(i + 0.5) * (W > 700 ? 9 : 7);
        const gx = W * (0.14 + 0.72 * (p.fi / Math.max(1, groupN.length - 1))), gy = H * 0.5;
        p.group = [gx + Math.cos(a) * r, gy + Math.sin(a) * r];
        const perRow = W > 700 ? 14 : 7;
        p.rank = [W * (W > 700 ? 0.16 : 0.12) + (i % perRow) * (W > 700 ? 13 : 11), H * (0.14 + 0.18 * p.fi) + Math.floor(i / perRow) * 12];
        void n;
      }
    }
  }

  function targets() {
    for (const p of P) {
      p.r = 1; let t = p.home, a = 0.5;
      if (stage >= 1) t = p.grid;
      if (stage >= 3) a = p.role > 0 ? 0.95 : 0.07;
      if (stage >= 4) a = p.role === 2 ? 0.95 : p.role === 1 ? 0 : 0.05;
      if (stage >= 5) { a = p.role === 2 ? 1 : 0.03; if (p.role === 2) { t = p.group; p.r = 2.6; } }
      if (stage >= 6 && p.role === 2) t = p.rank;
      if (p.role > 0 && stage >= 3 && stage < 5) p.r = 2.2;
      p.tx = t[0]; p.ty = t[1]; p.ta = a;
    }
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr;
    layout(); targets();
    if (reduced || !P[0].x) for (const p of P) { p.x = p.tx; p.y = p.ty; p.a = reduced ? p.ta : 0; }
  }

  function draw() {
    if (dead) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (stage === 2) { // Connect: faint threads between the evidence of each finding
      ctx.lineWidth = 0.6;
      for (let fi = 0; fi < wake.findings.length; fi++) {
        const g = P.filter((p) => p.fi === fi);
        ctx.strokeStyle = 'rgba(165,236,223,.28)'; ctx.beginPath();
        for (let i = 1; i < g.length; i++) { ctx.moveTo(g[i - 1].x, g[i - 1].y); ctx.lineTo(g[i].x, g[i].y); }
        ctx.stroke();
      }
    }
    for (const p of P) {
      p.x += (p.tx - p.x) * 0.075; p.y += (p.ty - p.y) * 0.075; p.a += (p.ta - p.a) * 0.06;
      if (p.a < 0.012) continue;
      const yellow = stage >= 5 ? p.seen : p.opened;
      ctx.globalAlpha = p.a;
      ctx.fillStyle = yellow ? '#F4C531' : '#A5ECDF';
      const s = p.r;
      if (s <= 1.2) ctx.fillRect(p.x, p.y, 1.4, 1.4);
      else { ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, 6.2832); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  if (reduced) { draw(); } else raf = requestAnimationFrame(draw);

  return {
    setStage(n) { stage = n; targets(); if (reduced) { for (const p of P) { p.x = p.tx; p.y = p.ty; p.a = p.ta; } } },
    rankY: (fi) => H * (0.14 + 0.18 * fi),
    rankX: () => W * (W > 700 ? 0.16 : 0.12),
    destroy() { dead = true; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); },
  };
}
