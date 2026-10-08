// THE FINALE
// The meeting (two presentations and the head-to-head), the week as a two-player versus
// screen, and the final score with the report. Everything shown is read from the engine:
// delivery(), week(), finale(), recap(). The visuals do the arguing; the words stay short.

import { h, avatar } from './art.js';
import { sfx } from './arcade/sound.js';

const money = (v) => (v < 0 ? '-$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US');
const clockAt = (min) => { const t = 600 + min, hh = Math.floor(t / 60), mm = t % 60; return ((hh + 11) % 12 + 1) + ':' + String(mm).padStart(2, '0') + ' ' + (hh < 12 ? 'AM' : 'PM'); };

export function createFinale({ game, show, root, reduced, setCleanup, onWalkBack, onRestart, post, HOST }) {
  const w = () => game.world;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const btn = (label, onclick, cls = 'btn') => h('button', { class: cls, type: 'button', onclick }, label);
  const ME = { skin: '#D9A07A', hair: '#2A1C14', style: 'short', shirt: '#FFD23F' };
  const av = (key, size) => avatar(key === 'me' ? ME : (w().characters[key] || {}).av, size);
  const first = (name) => String(name).split(' ')[0];

  // ============================================================ THE MEETING
  function meeting() {
    const W = w(), Dl = game.delivery();
    const ROOM = W.central.concat(W.locations.map((l) => l.manager));
    const tiles = {};
    const board = h('div', { class: 'room-board' }, ROOM.concat(['me', 'none']).map((k) => {
      const p = k === 'none' ? { name: 'Nobody' } : game.person(k);
      const pips = h('span', { class: 'pips' });
      const el = h('div', { class: 'rtile' + (k === 'none' ? ' nobody' : '') }, k === 'none' ? h('span', { class: 'avwrap q' }, '?') : av(k, 34), h('b', {}, k === 'me' ? 'You' : first(p.name)), pips);
      tiles[k] = { el, pips };
      return el;
    }));
    const mclock = h('b', { class: 'mclock' }, '10:00 AM');
    const mtime = h('span', { class: 'mtime' }, '0 MIN');
    const head = h('div', { class: 'meet-head' });
    const stage = h('div', { class: 'meet-stage' });
    const tag = h('span', { class: 'round-tag' }, 'THE MEETING');
    show('day', 'meeting mtg', h('header', { class: 'bar' }, h('div', { class: 'when' }, tag, mclock, mtime, h('span', { class: 'co' }, W.shell.company))), head, board, stage);
    let used = 0;
    const tick = async (mins) => { for (let i = 0; i < mins; i++) { used += 1; mclock.textContent = clockAt(used); mtime.textContent = used + ' MIN'; await wait(70); } };
    const resetBoard = () => Object.values(tiles).forEach((t) => { t.pips.replaceChildren(); t.el.classList.remove('hit', 'you', 'wake'); });
    const land = (key, side, ok) => { const t = tiles[key] || tiles.none; t.pips.appendChild(h('i', { class: side + (ok ? '' : ' weak') })); t.el.classList.remove('hit'); void t.el.offsetWidth; t.el.classList.add('hit', side); };
    const stamp = (status, label) => h('span', { class: 'status s-' + status }, label.toUpperCase());

    // the readiness strip: what each item walked into the room with
    function ready(r, side, ownerName, check) {
      const cell = (k, v, state) => h('div', { class: 'rd ' + state }, h('span', {}, k), h('b', {}, v));
      return h('div', { class: 'ready ' + side },
        cell('EVIDENCE', r.lines + (r.lines === 1 ? ' line' : ' lines') + ' · ' + r.systems + (r.systems === 1 ? ' system' : ' systems'), r.lines >= 4 ? 'ok' : r.lines > 1 ? 'weak' : 'miss'),
        cell('OWNER', ownerName || 'None named', r.owner ? 'ok' : 'miss'),
        cell('ACTION', r.action === 'clear' ? 'Clear' : r.action === 'vague' ? 'Vague' : 'Off target', r.action === 'clear' ? 'ok' : r.action === 'vague' ? 'weak' : 'miss'),
        cell('NUMBER TO WATCH', check || 'None', r.check ? 'ok' : 'miss'));
    }

    // ---------------------------------------------------------- presentation 1: yours
    async function presentYours(i) {
      const Y = Dl.yours;
      head.replaceChildren(h('h1', {}, 'PRESENTATION 1 OF 2 · YOUR BRIEFING'), h('p', { class: 'lede' }, 'You hand over each finding exactly as you prepared it. Watch what it walks into the room with, and how long it takes.'));
      if (i >= Y.length) return yoursDone();
      const y = Y[i];
      const reacts = h('div', { class: 'reacts' });
      const nextB = btn(i === Y.length - 1 ? 'FINISH YOUR BRIEFING ▶' : 'NEXT FINDING ▶', () => presentYours(i + 1), 'btn primary'); nextB.hidden = true;
      const cost = h('span', { class: 'cost y' });
      stage.replaceChildren(h('article', { class: 'deliver you' },
        h('div', { class: 'dl-top' }, h('span', { class: 'rank' }, y.n + '/' + Y.length), h('span', { class: 'quiet' }, 'You flagged: ' + y.what.label + (y.what.value ? ' (' + y.what.value + ')' : '')), cost),
        ready(y.ready, 'y', y.owner ? y.owner.name : '', ''),
        h('div', { class: 'said-you' }, av('me', 36), h('p', {}, '"' + y.text + '"')),
        reacts, nextB));
      sfx.blip();
      for (const r of y.reactions) { await wait(650); reacts.appendChild(h('div', { class: 'react-line' }, av(r.who, 32), h('div', {}, h('b', {}, first(r.name)), h('p', {}, r.line)))); sfx.type(); }
      await wait(400);
      reacts.appendChild(stamp(y.status, y.statusLabel));
      cost.textContent = '+' + y.minutes + ' MIN'; cost.classList.add('on');
      land(y.owner ? y.owner.key : 'none', 'you', y.status === 'handed');
      sfx[y.status === 'handed' ? 'coin' : 'back']();
      await tick(y.minutes);
      nextB.hidden = false; nextB.focus({ preventScroll: true });
    }
    function yoursDone() {
      game.presented('yours');
      const t = Dl.tally.yours;
      stage.replaceChildren(h('div', { class: 'summary meet-sum y' },
        h('p', { class: 'stamp' }, 'YOUR BRIEFING'),
        h('div', { class: 'sum-row' }, h('div', {}, h('b', {}, Dl.minutes.yours + ' MIN'), h('span', {}, 'in the room')), h('div', {}, h('b', {}, t.handed + ' OF ' + Dl.yours.length), h('span', {}, 'handed off cleanly')), h('div', {}, h('b', {}, String(t.questions + t.pushback)), h('span', {}, 'questions or pushback'))),
        h('p', { class: 'lede' }, 'Same room, same 10:00 AM. Now run it with Wake\'s briefing.'),
        btn('PRESENT WAKE\'S BRIEFING ▶', () => { resetBoard(); presentWake(); }, 'btn primary')));
      sfx.credit();
    }

    // ---------------------------------------------------------- presentation 2: Wake's
    async function presentWake() {
      root.className = 'wx arcade wake';
      tag.textContent = 'THE MEETING · WITH WAKE'; tag.classList.add('cyan');
      used = 0; mclock.textContent = '10:00 AM'; mtime.textContent = '0 MIN';
      head.replaceChildren(h('h1', {}, 'PRESENTATION 2 OF 2 · WAKE\'S BRIEFING'), h('p', { class: 'lede' }, 'Each item arrives with its evidence, its owner, and the number to watch.'));
      const current = h('div', {}), done = h('ul', { class: 'done-list' });
      let fast = reduced;
      const skip = btn('SKIP ▶', () => { fast = true; }, 'btn small');
      stage.replaceChildren(current, done, h('div', { class: 'row' }, skip));
      for (const x of Dl.wake) {
        const cost = h('span', { class: 'cost w' });
        current.replaceChildren(h('article', { class: 'deliver wk' },
          h('div', { class: 'dl-top' }, h('span', { class: 'rank' }, x.n + '/' + Dl.wake.length), h('strong', {}, x.headline), cost),
          ready(x.ready, 'w', x.owners.map((o) => o.name).join(' + '), x.check),
          h('p', { class: 'wk-do' }, x.text),
          h('div', { class: 'react-line' }, av(x.reactions[0].who, 32), h('div', {}, h('b', {}, first(x.reactions[0].name)), h('p', {}, x.reactions[0].line))), stamp('handed', 'Handed off')));
        cost.textContent = '+' + x.minutes + ' MIN'; cost.classList.add('on');
        x.owners.forEach((o) => land(o.key, 'wake', true)); sfx.coin();
        if (!fast) await tick(x.minutes); else { used += x.minutes; mclock.textContent = clockAt(used); mtime.textContent = used + ' MIN'; }
        await wait(fast ? 0 : 1300);
        done.appendChild(h('li', {}, h('span', { class: 'status s-handed' }, '✓'), h('b', {}, x.owners.map((o) => first(o.name)).join(' + ')), ' ' + x.text));
      }
      current.replaceChildren(); skip.remove();
      game.presented('wake');
      await wait(300);
      result();
    }

    // ---------------------------------------------------------- the head-to-head
    function result() {
      const ty = Dl.tally.yours, tw = Dl.tally.wake;
      const maxMin = Math.max(Dl.minutes.yours, Dl.minutes.wake);
      const side = (cls, label, minutes, handed, total, friction) => h('div', { class: 'hh-side ' + cls },
        h('p', { class: 'hh-k' }, label),
        h('div', { class: 'hh-clock' }, h('span', {}, 'MEETING ENDED'), h('b', {}, clockAt(minutes))),
        h('div', { class: 'hh-bar' }, h('i', { style: { width: Math.round(minutes / maxMin * 100) + '%' } }), h('span', {}, minutes + ' min')),
        h('div', { class: 'hh-pips' }, h('span', {}, 'HANDED OFF CLEANLY'), h('div', {}, Array.from({ length: total }, (_, i) => h('i', { class: i < handed ? 'on' : '' }))), h('b', {}, handed + ' of ' + total)),
        h('div', { class: 'hh-line' }, h('span', {}, 'QUESTIONS OR PUSHBACK'), h('b', {}, String(friction))));
      // who walked out with clear work
      const people = Dl.board.slice().sort((a, b) => (b.wake.length + b.you.length) - (a.wake.length + a.you.length));
      const clearYou = new Set(people.filter((p) => p.person.key !== 'none' && p.you.some((x) => x.status === 'handed')).map((p) => p.person.key)).size;
      const clearWake = new Set(people.filter((p) => p.person.key !== 'none' && p.wake.length).map((p) => p.person.key)).size;
      const grid = h('div', { class: 'wgw-grid' }, people.map((p) => h('div', { class: 'wg' + (p.person.key === 'none' ? ' nobody' : '') },
        p.person.key === 'none' ? h('span', { class: 'avwrap q' }, '?') : av(p.person.key, 34),
        h('div', {}, h('b', {}, p.person.key === 'me' ? 'You' : p.person.name),
          h('div', { class: 'wg-y' }, p.you.length ? p.you.map((x) => h('p', { class: x.status === 'handed' ? 'ok' : 'weak' }, h('i', {}), '"' + x.text + '"')) : h('p', { class: 'none' }, 'Nothing from your briefing')),
          h('div', { class: 'wg-w' }, p.wake.length ? p.wake.map((x) => h('p', { class: 'ok' }, h('i', {}), x.text)) : h('p', { class: 'none' }, 'Nothing from Wake\'s briefing'))))));
      show('wake', 'meeting hh', h('header', { class: 'bar' }, h('div', { class: 'when' }, h('span', { class: 'round-tag cyan' }, 'THE MEETING · RESULT'), h('span', { class: 'co' }, W.shell.company))),
        h('h1', {}, 'SAME ROOM. TWO MEETINGS.'),
        h('div', { class: 'hh-vs' }, side('y', 'ON YOUR OWN', Dl.minutes.yours, ty.handed, Dl.yours.length, ty.questions + ty.pushback), h('div', { class: 'hh-mid' }, 'VS'), side('w', 'WITH WAKE', Dl.minutes.wake, tw.handed, Dl.wake.length, tw.questions + tw.pushback)),
        h('div', { class: 'wgw-head' }, h('h2', {}, 'WHO LEFT THE ROOM WITH CLEAR WORK'), h('p', { class: 'lede' }, h('b', { class: 'ty' }, clearYou + (clearYou === 1 ? ' person' : ' people')), ' from your briefing. ', h('b', { class: 'tw' }, clearWake + (clearWake === 1 ? ' person' : ' people')), ' from Wake\'s.')),
        h('div', { class: 'wg-legend' }, h('span', { class: 'y' }, h('i', {}), 'Your briefing'), h('span', { class: 'w' }, h('i', {}), 'Wake\'s briefing'), h('span', { class: 'k' }, h('i', {}), 'Hollow: left with questions')),
        grid,
        h('div', { class: 'row' }, btn('BACK TO YOUR OFFICE ▶', onWalkBack, 'btn primary')));
      sfx.credit();
    }

    presentYours(0);
  }

  // ============================================================ THE WEEK: VERSUS
  function week() {
    const rows = game.week(), F = game.finale();
    const main = rows.filter((r) => !r.extra), extra = rows.filter((r) => r.extra);
    const DAYS = ['TUE', 'WED', 'THU', 'FRI'];
    const scoreY = h('b', { class: 'score' }, '$0'), scoreW = h('b', { class: 'score' }, '$0');
    const tug = h('div', { class: 'tug' }, h('i', { class: 'tug-y' }), h('i', { class: 'tug-w' }), h('span', { class: 'tug-mark' }));
    const dayEls = DAYS.map((d) => h('span', {}, d));
    const banner = h('div', { class: 'vs-banner', hidden: true });
    const next = btn('SEE THE FINAL SCORE ▶', ending, 'btn primary'); next.hidden = true;
    let fast = reduced;
    const skip = btn('SKIP ▶', () => { fast = true; }, 'btn small');

    const spark = (series, good) => {
      const lo = Math.min(...series), hi = Math.max(...series), span = hi - lo || 1;
      const pts = series.map((v, i) => (i * 100 / (series.length - 1)).toFixed(1) + ',' + (26 - ((v - lo) / span) * 22).toFixed(1)).join(' ');
      return h('span', { class: 'spark', html: '<svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>' });
    };
    const cell = (side) => h('div', { class: 'vcell ' + side }, h('div', { class: 'vc-top' }, h('i', { class: 'arrow' }), h('b', { class: 'vval' }, ''), h('span', { class: 'vmoney' }, '')), h('p', { class: 'vtext' }, ''), h('span', { class: 'vspark' }));
    const rowEls = rows.map((r) => {
      const y = cell('y'), wk = cell('w');
      const el = h('div', { class: 'vrow' + (r.extra ? ' extra' : '') + (r.distraction ? ' distraction' : '') }, y, h('div', { class: 'vlabel' }, h('b', {}, r.label), r.you.label ? h('span', {}, r.you.label) : null), wk);
      return { r, el, y, wk };
    });
    show('wake', 'versus',
      h('div', { class: 'vs-hud' },
        h('div', { class: 'hud-p y' }, h('span', {}, 'PLAYER 1 · ON YOUR OWN'), scoreY, h('small', {}, 'value captured')),
        h('div', { class: 'hud-mid' }, h('p', {}, 'THE WEEK'), h('div', { class: 'days' }, dayEls)),
        h('div', { class: 'hud-p w' }, h('span', {}, 'PLAYER 2 · WITH WAKE'), scoreW, h('small', {}, 'value captured'))),
      tug, banner,
      h('div', { class: 'vrows' }, rowEls.map((x) => x.el)),
      h('p', { class: 'vs-note' }, 'Dollar figures are Wake\'s estimates from this company\'s own numbers, compared with doing nothing.'),
      h('div', { class: 'row vs-ctl' }, skip, next));

    let sy = 0, sw = 0;
    const setTug = () => {
      const tot = Math.abs(sy) + Math.abs(sw) + 1, pos = 50 - ((sw - sy) / tot) * 42;
      tug.style.setProperty('--p', Math.max(6, Math.min(94, pos)) + '%');
    };
    setTug();
    const count = async (el, from, to) => { const steps = fast ? 1 : 12; for (let i = 1; i <= steps; i++) { el.textContent = money(from + (to - from) * i / steps); await wait(28); } };
    const paint = (c, lane, d) => {
      const day = lane.days[d];
      c.classList.remove('up', 'down', 'flat', 'flip'); void c.offsetWidth; c.classList.add(day.dir, 'flip');
      c.querySelector('.arrow').textContent = { up: '▲', down: '▼', flat: '■' }[day.dir];
      c.querySelector('.vval').textContent = day.shown || '';
      c.querySelector('.vtext').textContent = day.text;
      const m = c.querySelector('.vmoney'); m.textContent = day.money ? money(day.money) : ''; m.className = 'vmoney' + (day.money > 0 ? ' pos' : day.money < 0 ? ' neg' : '');
      if (lane.series) c.querySelector('.vspark').replaceChildren(spark(lane.series.slice(0, d + 2), lane.good));
    };
    (async () => {
      await wait(500);
      for (let d = 0; d < 4; d++) {
        dayEls.forEach((e, i) => e.classList.toggle('on', i <= d)); sfx.blip();
        let ny = 0, nw = 0;
        for (const x of rowEls) {
          paint(x.y, x.r.you, d); paint(x.wk, x.r.wake, d);
          ny += x.r.you.days[d].money || 0; nw += x.r.wake.days[d].money || 0;
          if (!fast) await wait(140);
        }
        const py = sy, pw = sw; sy = ny; sw = nw;
        await Promise.all([count(scoreY, py, sy), count(scoreW, pw, sw)]);
        scoreY.classList.toggle('neg', sy < 0); setTug();
        sfx[sw > pw ? 'coin' : 'type']();
        await wait(fast ? 0 : 1300);
      }
      const diff = sw - sy;
      banner.hidden = false;
      banner.replaceChildren(h('p', { class: 'stamp' }, 'FRIDAY · WEEK OVER'),
        h('h2', {}, diff > 0 ? 'Wake\'s plan captured ' + money(diff) + ' more this week.' : diff < 0 ? 'Your plan captured ' + money(-diff) + ' more this week.' : 'Both plans captured the same this week.'),
        h('p', {}, money(F.value.youLeft) + ' left on the table on your own. ' + money(F.value.wakeLeft) + ' with Wake.' + (extra.some((r) => r.distraction) ? ' Your team also spent ' + F.hours + ' hours chasing items that did not need it.' : '')));
      sfx.go();
      skip.remove(); next.hidden = false; next.focus({ preventScroll: true });
      banner.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    })();
    void main;
  }

  // ============================================================ THE FINAL SCORE
  function ending() {
    const R = game.recap();
    game.complete(); post();
    const S = R.finale;
    const rows = h('div', { class: 'fs-rows' });
    const verdict = h('div', { class: 'fs-verdict', hidden: true });
    const rest = h('div', { class: 'fs-rest', hidden: true });
    const status = h('span', { class: 'quiet', 'aria-live': 'polite' });
    const reportEl = h('div', { class: 'report-wrap', hidden: true });
    show('wake', 'final',
      h('p', { class: 'stage-k cy' }, 'GAME OVER'),
      h('h1', { class: 'fs-title' }, 'FINAL SCORE'),
      h('p', { class: 'fs-sub' }, 'SAME COMPANY. SAME DATA. SAME MORNING.'),
      h('div', { class: 'fs-head' }, h('span', { class: 'y' }, 'PLAYER 1', h('b', {}, 'ON YOUR OWN')), h('span'), h('span', { class: 'w' }, 'PLAYER 2', h('b', {}, 'WITH WAKE'))),
      rows, verdict, rest, reportEl);
    (async () => {
      await wait(400);
      for (const r of S.rows) {
        const wakeWins = !r.youWins && !r.tie;
        rows.appendChild(h('div', { class: 'fs-row' + (wakeWins ? ' ww' : r.youWins ? ' yw' : ' tie') },
          h('div', { class: 'fs-y' }, r.youWins ? h('i', { class: 'star' }, '★') : null, h('b', {}, r.you)),
          h('div', { class: 'fs-l' }, r.label),
          h('div', { class: 'fs-w' }, h('b', {}, r.wake), wakeWins ? h('i', { class: 'star' }, '★') : null)));
        sfx[wakeWins ? 'coin' : 'blip'](); await wait(520);
      }
      verdict.hidden = false;
      verdict.replaceChildren(h('h2', {}, R.verdict.toUpperCase()), h('p', {}, 'Value captured this week: ', h('b', { class: 'ty' }, money(S.value.you)), ' on your own, ', h('b', { class: 'tw' }, money(S.value.wake)), ' with Wake.'));
      sfx.go(); await wait(700);
      rest.hidden = false; renderRest();
    })();

    function renderRest() {
      const m = R.moment, t = m.excerpt;
      let seen = null;
      if (t) {
        const ex = t.excerpt;
        const body = ex.kind === 'report' ? h('table', { class: 'dtable mini' }, h('thead', {}, h('tr', {}, ex.cols.map((c) => h('th', {}, c)))), h('tbody', {}, ex.rows.slice(0, 2).map((r) => h('tr', {}, r.map((c) => h('td', { class: c.hl ? 'tr-hl' : '' }, c.t))))))
          : h('div', { class: 'quote-src ' + ex.kind }, ex.title && ex.kind === 'email' ? h('strong', {}, ex.title) : null, (ex.list || ex.body || ex.lines || []).slice(0, 3).map((x) => h('p', {}, x)));
        seen = h('div', { class: 'mo-card saw' }, h('p', { class: 'mo-k' }, 'WHAT YOU SAW'), h('p', { class: 'mo-src' }, t.source.title + ' · ' + t.source.system), body,
          h('p', { class: 'mo-cap' }, t.r1.flagged ? 'You flagged it. You didn\'t connect it.' : t.r1.seen ? 'You had it open at ' + t.r1.at + '. On its own, it looked like nothing.' : 'You never opened it.'));
      }
      const meant = m.connected ? h('div', { class: 'mo-card meant' }, h('p', { class: 'mo-k' }, 'WHAT IT MEANT'), h('h3', {}, m.title),
        h('div', { class: 'src-row' }, m.connected.map((c) => h('span', { class: 'src-chip' }, h('span', { class: 'sc-sys' }, c.where), h('span', { class: 'sc-l' }, c.label + (c.value ? ': ' + c.value : ''))))),
        h('p', { class: 'mo-cap w' }, m.wake), m.stake ? h('p', { class: 'mo-stake' }, money(m.stake) + ' at stake this week') : null) : null;
      const copy = async () => {
        try { await navigator.clipboard.writeText(R.report.toText()); status.textContent = 'Report copied.'; game.exported('copy'); }
        catch (e) { const ta = h('textarea', { class: 'copybox', rows: '8', readonly: true }); ta.value = R.report.toText(); reportEl.hidden = false; reportEl.prepend(ta); ta.select(); status.textContent = 'Select all and copy.'; }
      };
      const download = () => { const a = h('a', { href: URL.createObjectURL(new Blob([R.report.toHTML()], { type: 'text/html' })), download: 'wake-experience-' + w().shell.company.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.html' }); document.body.appendChild(a); a.click(); a.remove(); game.exported('download'); status.textContent = 'Report downloaded.'; };
      const email = () => { window.location.href = 'mailto:?subject=' + encodeURIComponent('The Wake Experience: ' + w().shell.company) + '&body=' + encodeURIComponent(R.report.toText().slice(0, 1800)); game.exported('email'); };
      const view = btn('VIEW YOUR REPORT ▼', () => {
        if (!reportEl.childElementCount) reportEl.replaceChildren(h('style', {}, R.report.css), h('div', { class: 'report-paper', html: R.report.fragment() }));
        reportEl.hidden = !reportEl.hidden; view.textContent = reportEl.hidden ? 'VIEW YOUR REPORT ▼' : 'HIDE YOUR REPORT ▲';
        if (!reportEl.hidden) { game.exported('view'); reportEl.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }
      }, 'btn primary');
      const actions = HOST === 'artifact' ? [btn('COPY REPORT', copy, 'btn small')] : [btn('DOWNLOAD', download, 'btn small'), btn('EMAIL', email, 'btn small'), btn('COPY', copy, 'btn small')];
      rest.replaceChildren(
        h('section', { class: 'moment2' }, h('p', { class: 'stamp' }, 'THE MOMENT THAT MATTERED'),
          seen && meant ? h('div', { class: 'mo-grid' }, seen, h('div', { class: 'mo-arrow' }, '▶'), meant) : h('div', {}, h('h2', {}, m.title), m.lines.map((l) => h('p', {}, l)))),
        h('p', { class: 'closer' }, R.closer),
        h('div', { class: 'row fs-actions' }, view, h('span', { class: 'row' }, actions, status)),
        h('div', { class: 'row end' }, btn('PLAY AGAIN', onRestart, 'link'), h('a', { class: 'link', href: 'https://wakepe.com', target: '_blank', rel: 'noopener' }, 'wakepe.com')));
      rest.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    }
  }

  return { meeting, week, ending, setCleanup };
}
