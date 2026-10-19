// "NOT PART OF THIS DEMO"
// The apps carry the buttons the real ones have (Compose, Reply, Banking, Customize, the call
// controls...). The ones that don't lead anywhere in the story show a short note instead of
// doing nothing, so nobody wonders whether they missed something.

const DEAD = [
  '.gm-compose', '.gm-tabs span:not(.on)', '.gm-rb', '.gm-ni:not(.on)',
  '.qb-new', '.qb-run', '.qb-cust', '.qb-save', '.qb-rtabs span:not(.on)',
  '.ed-menus span:not(.ed-by)', '.ed-share', '.mt-b',
].join(', ');
const LIVE_QBO = ['Reports'];

export function installDemoNote(root) {
  let el = null, timer = 0;
  const show = () => {
    if (!el) { el = document.createElement('div'); el.className = 'demo-note'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = 'Not part of this demo. Everything you need is in the reports, inbox and texts.';
    el.classList.add('on');
    clearTimeout(timer); timer = setTimeout(() => el.classList.remove('on'), 2600);
  };
  root.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    const qb = t.closest('.qb-ni');
    const dead = t.closest(DEAD) || (qb && !qb.classList.contains('on') && !LIVE_QBO.includes(qb.textContent.trim()) ? qb : null);
    if (!dead) return;
    e.preventDefault(); e.stopPropagation();
    show();
  }, true);
}
