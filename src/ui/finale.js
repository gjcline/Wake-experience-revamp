// THE FINALE
// The meeting twice (on your own, then with Wake), the result, the week as a two-player
// match on the city map, the final score and the report. Everything shown is read from the
// engine. The screens show what happened; the player draws the conclusions.

import { h, avatar } from './art.js';
import { sfx } from './arcade/sound.js';
import { citySVG, hqPin } from './arcade/citymap.js';

const money = (v) => (v < 0 ? '-$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US');
const kmoney = (v) => { const a = Math.abs(v); const s = a >= 1e6 ? '$' + (a / 1e6).toFixed(2) + 'M' : a >= 1e4 ? '$' + Math.round(a / 1000) + 'k' : money(a); return (v < 0 ? '-' : '') + s.replace('-', ''); };
const clockAt = (min) => { const t = 600 + min, hh = Math.floor(t / 60), mm = t % 60; return ((hh + 11) % 12 + 1) + ':' + String(mm).padStart(2, '0') + ' ' + (hh < 12 ? 'AM' : 'PM'); };
const hrs = (x) => x + (x === 1 ? ' hr' : ' hrs');
const DECISION = { decided: 'DECIDED', guess: 'DECIDED ON YOUR WORD', pilot: 'DECIDED · SMALLER START', agreed: 'AGREED · NUMBERS TO FOLLOW', parked: 'PARKED', next: 'PARKED TO NEXT WEEK', dropped: 'DROPPED', busy: 'KEPT ON THE LIST' };
const STATUS = { open: 'OPEN', waiting: 'WAITING', working: 'IN PROGRESS', fixed: 'RESOLVED', worse: 'WORSE' };

export function createFinale({ game, show, root, reduced, setCleanup, onWalkBack, onFriday, onRestart, post, HOST }) {
  const w = () => game.world;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const btn = (label, onclick, cls = 'btn') => h('button', { class: cls, type: 'button', onclick }, label);
  const ME = { skin: '#D9A07A', hair: '#2A1C14', style: 'short', shirt: '#FFD23F' };
  const av = (key, size) => avatar(key === 'me' ? ME : (w().characters[key] || {}).av, size);
  const first = (k) => (k === 'me' ? 'You' : String((w().characters[k] || { name: '' }).name).split(' ')[0]);
  let alive = true;
  // each screen owns the page until the next one replaces it
  const own = () => { alive = true; setCleanup(() => { alive = false; document.onkeydown = null; }); };

  // ============================================================ THE MEETING (shared stage)
  function stage(side) {
    const W = w();
    const room = W.central.concat(W.locations.map((l) => l.manager));
    const seats = {};
    const seat = (k) => { const el = h('div', { class: 'fx-seat' + (k === 'me' ? ' me' : '') }, av(k, 30), h('span', {}, first(k))); seats[k] = el; return el; };
    const half = Math.ceil(room.length / 2);
    const table = h('div', { class: 'fx-table' },
      h('div', { class: 'fx-row top' }, room.slice(0, half).map(seat)),
      h('div', { class: 'fx-board' }, h('span', { class: 'fx-head' }, seat('me'))),
      h('div', { class: 'fx-row bot' }, room.slice(half).map(seat)));
    const screen = h('div', { class: 'fx-screen ' + side }, h('p', { class: 'fx-scr-k' }, side === 'wake' ? 'WAKE' : 'YOUR NOTES'), h('div', { class: 'fx-scr-body' }));
    const clock = h('b', { class: 'fx-clock' }, '10:00 AM'), elapsed = h('span', { class: 'fx-el' }, '0 MIN');
    const pips = h('div', { class: 'fx-pips' });
    const cnt = (label, cls) => { const b = h('b', {}, '0'); return { el: h('div', { class: 'fx-cnt ' + cls }, b, h('span', {}, label)), b }; };
    const C = { hrs: cnt('LEADERSHIP HOURS IN THE ROOM', 'ans'), owed: cnt('FOLLOW-UPS OWED', 'owed'), dec: cnt('DECIDED', 'dec') };
    const people = room.length + 1;
    const hoursAt = (m) => (m * people / 60).toFixed(1);
    const log = h('div', { class: 'fx-log', 'aria-live': 'polite' });
    const choices = h('div', { class: 'fx-choices' });
    const ctl = h('div', { class: 'fx-ctl' });
    const tag = h('span', { class: 'round-tag' + (side === 'wake' ? ' cyan' : '') }, side === 'wake' ? 'THE MEETING · WITH WAKE' : 'THE MEETING · ON YOUR OWN');
    const el = show(side === 'wake' ? 'wake' : 'day', 'fx-meet ' + side,
      h('header', { class: 'bar' }, h('div', { class: 'when' }, tag, clock, elapsed, h('span', { class: 'co' }, W.shell.company))),
      h('div', { class: 'fx-hud' }, h('div', { class: 'fx-agenda' }, h('span', {}, 'AGENDA'), pips), C.hrs.el, C.owed.el, C.dec.el),
      h('div', { class: 'fx-mgrid' }, h('div', { class: 'fx-roomcol' }, table, screen), h('div', { class: 'fx-talk' }, log, choices, ctl)));
    own();
    let used = 0;
    C.hrs.b.textContent = '0.0';
    const S = {
      el, seats, screen, log, choices, ctl, C, pips, people,
      set(m) { used = m; clock.textContent = clockAt(m); elapsed.textContent = m + ' MIN'; C.hrs.b.textContent = hoursAt(m); },
      async tick(m, fast) { const steps = fast ? 1 : Math.max(1, Math.round(m)); for (let i = 0; i < steps; i++) { used += m / steps; clock.textContent = clockAt(Math.round(used)); elapsed.textContent = Math.round(used) + ' MIN'; C.hrs.b.textContent = hoursAt(used); if (!fast) await wait(60); } },
      async to(m, fast) { if (m > used) await S.tick(m - used, fast); },
      out(keys) { keys.forEach((k) => seats[k] && seats[k].classList.add('out')); },
      count(k, v) { C[k].b.textContent = String(v); C[k].el.classList.remove('bump'); void C[k].el.offsetWidth; C[k].el.classList.add('bump'); },
      talk(k) { Object.values(seats).forEach((s) => s.classList.remove('talk')); if (seats[k]) seats[k].classList.add('talk'); },
      say(k, text, cls = '') {
        S.talk(k);
        const line = h('div', { class: 'fx-line ' + cls + (k === 'me' ? ' me' : '') }, k === 'wake' ? h('span', { class: 'fx-wk' }, 'W') : av(k, 28), h('div', {}, h('b', {}, k === 'wake' ? 'WAKE' : first(k)), h('p', {}, text)));
        log.appendChild(line); log.scrollTop = log.scrollHeight; sfx.blip();
        return line;
      },
      note(node) { log.appendChild(node); log.scrollTop = log.scrollHeight; return node; },
      agenda(n, i) { pips.replaceChildren(...Array.from({ length: n }, (_, j) => h('i', { class: j < i ? 'done' : j === i ? 'on' : '' }, String(j + 1)))); },
    };
    return S;
  }
  const stampEl = (decision, extra) => h('div', { class: 'fx-stamp s-' + decision }, h('b', {}, DECISION[decision] || 'DECIDED'), extra ? h('span', {}, extra) : null);

  // ------------------------------------------------------------ meeting 1: on your own
  // The engine directs the room one beat at a time; this screen plays each beat as it comes.
  function meeting() {
    const S = stage('you');
    let owed = 0, decided = 0, lastItem = -1;
    const choose = (b) => new Promise((resolve) => {
      const opts = b.opts.map((o, i) => h('button', { class: 'fx-opt' + (o.effect === 'answer' ? ' ev' : ''), type: 'button', onclick: () => pick(o) }, h('i', {}, String.fromCharCode(65 + i)), h('span', {}, o.label), h('em', {}, o.meta || '')));
      const pick = (o) => { document.onkeydown = null; S.choices.replaceChildren(); sfx.select(); resolve(o); };
      S.choices.replaceChildren(h('p', { class: 'fx-ask' }, 'Your answer'), ...opts);
      document.onkeydown = (e) => { const i = '123'.indexOf(e.key) >= 0 ? '123'.indexOf(e.key) : 'abc'.indexOf(e.key.toLowerCase()); if (i >= 0 && b.opts[i]) pick(b.opts[i]); };
      try { opts[0].focus({ preventScroll: true }); } catch (e) { /* fine */ }
      S.choices.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    });
    const owe = (task) => { owed += 1; S.count('owed', owed); S.note(h('div', { class: 'fx-iou' }, h('b', {}, 'FOLLOW-UP'), h('span', {}, first(task.who) + ': ' + task.what))); };
    const notes = (it, total) => S.screen.querySelector('.fx-scr-body').replaceChildren(
      h('p', { class: 'fx-scr-n' }, it.n + ' / ' + total), h('p', { class: 'fx-scr-t' }, it.what.label + (it.what.value ? ': ' + it.what.value : '')), h('p', { class: 'fx-scr-s' }, '"' + it.text + '"'),
      h('div', { class: 'fx-scr-meta' }, h('span', {}, it.what.where || ''), h('span', {}, it.owner ? 'Owner: ' + it.owner.name : 'No owner named')));
    const outcomeText = (o) => {
      const fu = o.follow + (o.follow === 1 ? ' follow-up' : ' follow-ups');
      if (o.decision === 'agreed') return 'Starts Tuesday · ' + fu + ' to land';
      if (['parked', 'next'].includes(o.decision)) return o.follow ? fu + ' first' : 'Back on next week\'s agenda';
      if (!['decided', 'guess', 'pilot'].includes(o.decision)) return '';
      return (o.owner ? o.owner.name : 'No owner') + (o.dated ? '' : ' · no start date');
    };

    (async () => {
      for (let guard = 0; guard < 400 && alive; guard++) {
        const st = game.meetingStep();
        if (st.done) break;
        const b = st.beat;
        await S.to(st.tally.minutes);
        if (st.item && st.item.n !== lastItem) { lastItem = st.item.n; S.agenda(st.total, st.item.n - 1); notes(st.item, st.total); }
        if (b.first) S.agenda(st.total, 0);
        if (b.type === 'stamp') {
          const moved = ['decided', 'guess', 'agreed', 'pilot'].includes(b.outcome.decision);
          if (moved) { decided += 1; S.count('dec', decided); }
          S.note(stampEl(b.outcome.decision, outcomeText(b.outcome))); sfx[moved ? 'coin' : 'back']();
          game.answerQ(b.id, 'ok'); await wait(650); continue;
        }
        if (b.type === 'present') { await wait(250); S.say('me', b.line, 'pres'); game.answerQ(b.id, 'ok'); await wait(650); continue; }
        if (b.auto) {
          S.say(b.who.key, b.line, b.effect === 'trust' ? 'ok' : '');
          if (b.leave) S.out(b.leave);
          const res = game.answerQ(b.id, b.opts[0].id);
          if (b.first) S.note(h('p', { class: 'fx-hint' }, 'The room will ask questions. Answer with what you brought.'));
          if (res && res.reply) { await wait(450); S.say(res.reply.by.key, res.reply.line); }
          await wait(700); continue;
        }
        S.say(b.who.key, b.line, 'q'); await wait(300);
        const o = await choose(b);
        if (!alive) return;
        const res = game.answerQ(b.id, o.id);
        S.say('me', o.label, 'a');
        if (res && res.reply) { await wait(380); S.say(res.reply.by.key, res.reply.line, o.effect === 'answer' ? 'ok' : ''); }
        if (o.task && !['keep', 'watch'].includes(o.effect)) owe(o.task);
        await wait(380);
      }
      if (!alive) return;
      const Y = game.meetingYours();
      S.set(Y.minutes); S.talk(null); S.agenda(Y.items.length, Y.items.length);
      game.presented('yours');
      await wait(500);
      S.choices.replaceChildren(h('div', { class: 'fx-done y' },
        h('p', { class: 'fx-done-k' }, 'MEETING OVER · ' + clockAt(Y.minutes)),
        h('div', { class: 'fx-done-row' },
          h('div', {}, h('b', {}, Y.hours.toFixed(1)), h('span', {}, 'leadership hours')),
          h('div', {}, h('b', {}, Y.ownerDate + '/' + Y.items.length), h('span', {}, 'with an owner and a date')),
          h('div', {}, h('b', {}, String(Y.ious)), h('span', {}, 'follow-ups owed'))),
        h('p', {}, 'Same room. Same 10:00 AM. Now run it with the briefing you built with Wake.'),
        btn('RUN IT WITH WAKE ▶', meetingWake, 'btn primary')));
      sfx.credit();
      S.choices.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    })();
  }

  // ------------------------------------------------------------ meeting 2: with Wake
  function meetingWake() {
    const K = game.meetingWake();
    const S = stage('wake');
    let fast = reduced, skipped = false, answered = 0, decided = 0;
    const ff = btn('FAST FORWARD ▶▶', () => { fast = true; ff.disabled = true; }, 'btn small');
    const sk = btn('SKIP TO RESULT', () => { skipped = true; fast = true; }, 'btn small ghost');
    S.ctl.replaceChildren(ff, sk);
    const body = S.screen.querySelector('.fx-scr-body');
    const pause = (ms) => wait(fast ? 40 : ms);
    const card = (it) => body.replaceChildren(
      h('p', { class: 'fx-scr-n' }, it.n + ' / ' + K.items.length + (it.place ? ' · ' + it.place : '')), h('p', { class: 'fx-scr-t' }, it.headline), h('p', { class: 'fx-scr-s' }, it.action),
      h('div', { class: 'fx-scr-meta' }, h('span', {}, 'Owner: ' + it.owners.map((o) => o.name).join(' + ')), h('span', {}, 'Watching: ' + it.check)),
      h('p', { class: 'fx-scr-src' }, it.signals + ' lines from ' + it.systems + (it.systems === 1 ? ' system' : ' systems')));
    (async () => {
      S.agenda(K.items.length, 0);
      S.say('opsdir', 'Let\'s get started. What have you got for us?');
      body.replaceChildren(h('p', { class: 'fx-scr-t' }, 'Briefing loaded'), h('p', { class: 'fx-scr-s' }, K.items.length + ' items, ranked. Every one with its evidence, owner and the number to watch.'));
      await S.tick(3, fast);
      for (const it of K.items) {
        if (!alive) return;
        if (skipped) break;
        S.agenda(K.items.length, it.n - 1); card(it);
        S.say('me', it.headline + ' ' + it.action, 'pres'); await pause(900);
        for (const q of it.qs) {
          S.say(q.asker.key, q.asker.line, 'q'); await pause(650);
          const a = S.say('wake', q.answer, 'wake');
          if (q.chips) a.querySelector('div').appendChild(h('div', { class: 'fx-chips' }, q.chips.map((c) => h('span', {}, h('b', {}, c.sys), ' ' + c.label))));
          answered += 1; await pause(900);
        }
        S.say(it.owner.key, it.onIt, 'ok'); await pause(500);
        decided += 1; S.count('dec', decided);
        S.note(stampEl('decided', it.owners.map((o) => o.name).join(' + ') + ' · watching: ' + it.check)); sfx.coin();
        await S.tick(2, fast); await pause(500);
      }
      if (!alive) return;
      S.agenda(K.items.length, K.items.length);
      if (!skipped) { S.say(K.wrap.asker.key, K.wrap.asker.line, 'q'); await pause(600); S.say('wake', K.wrap.answer, 'wake'); answered += 1; await S.tick(1, fast); }
      S.set(K.minutes); S.count('dec', K.decided);
      game.presented('wake');
      await pause(700);
      result();
    })();
  }

  // ------------------------------------------------------------ the result
  function result() {
    const Y = game.meetingYours(), K = game.meetingWake(), A = game.afterMeeting();
    const max = Math.max(Y.minutes, K.minutes, 15);
    const axis = h('div', { class: 'fx-axis' }, [0, 15, 30, 45, 60, 75, 90].filter((m) => m <= max + 4).map((m) => h('span', { style: { left: (m / max * 100) + '%' } }, clockAt(m).replace(' AM', ''))));
    const seg = (min, cls, label) => h('i', { class: 'seg ' + cls, style: { width: (min / max * 100) + '%' }, title: label }, h('span', {}, label));
    const yBar = h('div', { class: 'fx-tl y' }, seg(3, 'open', ''), Y.items.map((it) => seg(it.minutes, it.decision, String(it.n))), seg(Y.minutes - 3 - Y.items.reduce((n, x) => n + x.minutes, 0), 'open', ''));
    const kBar = h('div', { class: 'fx-tl w' }, seg(3, 'open', ''), K.items.map((it) => seg(it.minutes, 'decided', String(it.n))), seg(1, 'open', ''));
    const duel = ([label, sub], yv, kv, yb, kb) => h('div', { class: 'fx-duel' }, h('b', { class: 'y' + (yb ? ' win' : '') }, yv), h('span', {}, label, h('small', {}, sub)), h('b', { class: 'w' + (kb ? ' win' : '') }, kv));
    const P = game.meetingPrep(), T = game.week().tta;
    const dur = (m) => (m >= 60 ? Math.floor(m / 60) + ' hr ' + (m % 60) + ' min' : m + ' min');
    const fmtT = (x) => (x === null ? 'None this week' : x === 0 ? 'Same day' : x + (x === 1 ? ' day' : ' days'));
    const task = (x) => h('li', {}, av(x.who.key, 26), h('div', {}, h('b', {}, x.who.key === 'me' ? 'You' : x.who.name), h('p', {}, x.what)), h('em', {}, hrs(x.hrs)));
    show('wake', 'fx-result',
      h('header', { class: 'bar' }, h('div', { class: 'when' }, h('span', { class: 'round-tag cyan' }, 'THE MEETING · RESULT'), h('span', { class: 'co' }, w().shell.company))),
      h('h1', { class: 'fx-h' }, 'Same room. Two meetings.'),
      h('section', { class: 'fx-tls' },
        h('div', { class: 'fx-tlrow' }, h('p', { class: 'fx-tlk y' }, 'ON YOUR OWN', h('b', {}, Y.minutes + ' min')), yBar),
        h('div', { class: 'fx-tlrow' }, h('p', { class: 'fx-tlk w' }, 'WITH WAKE', h('b', {}, K.minutes + ' min')), kBar),
        h('div', { class: 'fx-tlrow' }, h('span'), axis),
        h('div', { class: 'fx-legend' }, h('span', { class: 'decided' }, h('i'), 'Decided'), h('span', { class: 'guess' }, h('i'), 'Decided on your word'), h('span', { class: 'agreed' }, h('i'), 'Agreed, numbers to follow'), h('span', { class: 'parked' }, h('i'), 'Parked for follow-ups'), h('span', { class: 'dropped' }, h('i'), 'Dropped or not a priority'))),
      h('section', { class: 'fx-duels' },
        h('div', { class: 'fx-duel head' }, h('b', { class: 'y' }, 'ON YOUR OWN'), h('span'), h('b', { class: 'w' }, 'WITH WAKE')),
        duel(['Prep before the meeting', '7:48 AM to briefing locked'], dur(P.you), dur(P.wake), P.you <= P.wake, P.wake <= P.you),
        duel(['Leadership hours in the room', Y.attendees + ' people × meeting length'], Y.hours.toFixed(1) + ' hrs', K.hours.toFixed(1) + ' hrs', Y.hours <= K.hours, K.hours <= Y.hours),
        duel(['Decisions with an owner and a start date', 'Out of every item on the agenda'], Y.ownerDate + ' of ' + Y.items.length, K.ownerDate + ' of ' + K.items.length, Y.ownerDate / Y.items.length >= 1, true),
        duel(['Items carried to another meeting', 'Parked, or waiting on numbers'], String(Y.deferred), '0', Y.deferred === 0, true),
        duel(['Time to first action', 'Average, from Monday\'s meeting'], fmtT(T.you), fmtT(T.wake), T.you !== null && T.you <= T.wake, true)),
      h('section', { class: 'fx-after' },
        h('div', { class: 'fx-acol y' }, h('h2', {}, 'Your afternoon'), h('p', { class: 'fx-asub' }, hrs(A.hours) + ' of work the meeting created'), h('ul', { class: 'fx-tasks' }, A.mine.map(task))),
        h('div', { class: 'fx-acol w' }, h('h2', {}, 'With Wake, by 10:16 AM'), h('p', { class: 'fx-asub' }, 'Done before anyone was back at their desk'), h('ul', { class: 'fx-done-list' }, A.done.map((d) => h('li', {}, h('i', {}, '✓'), h('div', {}, h('b', {}, d.at), h('p', {}, d.what))))))),
      h('div', { class: 'row' }, btn('BACK TO YOUR OFFICE ▶', onWalkBack, 'btn primary')));
    own(); sfx.credit();
  }

  // ============================================================ THE WEEK
  function week() {
    const W = w(), WK = game.week();
    const rows = WK.rows, n = rows.length;
    const pins = W.pins.slice(), hq = hqPin(pins);
    const usesHQ = rows.some((r) => !r.loc);
    const locName = (id) => (id === 'hq' ? 'Head office' : W.shell.multi ? W.locById[id].name : W.shell.company);
    const GLYPH = { open: '!', waiting: '…', working: '▶', fixed: '✓', worse: '▼' };
    const badgeFor = (r) => h('i', { class: 'fx-bdg open', title: r.label }, GLYPH.open);
    const map = (side) => {
      const badges = {};
      const pinEls = pins.concat(usesHQ ? [hq] : []).map((p) => {
        const mine = rows.filter((r) => (r.loc || 'hq') === p.id);
        const stack = h('span', { class: 'fx-stack' }, mine.map((r) => { const b = badgeFor(r); badges[r.id] = b; return b; }));
        return h('div', { class: 'fx-pin' + (mine.length ? ' has' : '') + (p.id === 'hq' ? ' hq' : ''), style: { left: p.x + '%', top: p.y + '%' } }, h('i', { class: 'dot' }), stack, h('span', { class: 'nm' }, locName(p.id)));
      });
      const art = h('div', { class: 'fx-map ' + side }, h('div', { class: 'fx-map-art', html: citySVG() }), pinEls);
      const log = h('ul', { class: 'fx-wlog' });
      return { art, log, badges };
    };
    const MY = map('y'), MW = map('w');
    const dayEls = WK.days.map((d) => h('span', {}, d));
    const prof = { y: h('b', { class: 'fx-big' }, '$0'), w: h('b', { class: 'fx-big' }, '$0') };
    const recov = { y: h('small', { class: 'fx-rec' }, ''), w: h('small', { class: 'fx-rec' }, '') };
    const tug = h('div', { class: 'fx-tug' }, h('i', { class: 'ty' }), h('i', { class: 'tw' }), h('span', { class: 'mk' }));
    const tugLabel = h('p', { class: 'fx-tug-l' }, 'EVEN');
    // the scoreboard: six measures, mirrored
    const MEAS = [
      { k: 'profit', label: 'Operating profit impact', fmt: money, hi: true },
      { k: 'runRate', label: 'Run-rate added, annualized', fmt: kmoney, hi: true },
      { k: 'resolved', label: 'Problems resolved', fmt: (v) => v + ' of ' + n, hi: true, max: n },
      { k: 'tta', label: 'Time to action', fmt: (v) => (v === null ? 'None' : v === 0 ? 'Same day' : v + (v === 1 ? ' day' : ' days')), hi: false, max: 5 },
      { k: 'hours', label: 'Team hours on follow-up', fmt: hrs, hi: false },
      { k: 'open', label: 'Follow-ups still open', fmt: String, hi: false },
    ];
    const brow = MEAS.map((m) => { const yv = h('b', { class: 'v' }), wv = h('b', { class: 'v' }), yb = h('i'), wb = h('i'); return { m, el: h('div', { class: 'fx-bf' }, h('div', { class: 'l' }, yv, h('span', { class: 'bar' }, yb)), h('p', {}, m.label), h('div', { class: 'r' }, h('span', { class: 'bar' }, wb), wv)), yv, wv, yb, wb }; });
    const valOf = (side, d, k) => (k === 'tta' ? WK.tta[side] : WK.board[side][d][k]);
    // problem by problem
    const spark = (series, good) => {
      const lo = Math.min(...series), hi = Math.max(...series), span = hi - lo || 1;
      const pts = series.map((v, i) => (i * 100 / (series.length - 1)).toFixed(1) + ',' + (26 - ((v - lo) / span) * 22).toFixed(1)).join(' ');
      return h('span', { class: 'fx-spark', html: '<svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>' });
    };
    const pcell = (side) => h('div', { class: 'fx-pc ' + side }, h('span', { class: 'st open' }, 'OPEN'), h('b', { class: 'mv' }, ''), h('span', { class: 'pm' }, ''), h('span', { class: 'sp' }));
    const prow = rows.map((r) => { const y = pcell('y'), k = pcell('w'); return { r, y, k, el: h('div', { class: 'fx-pr' }, y, h('div', { class: 'fx-pl' }, h('b', {}, r.label), h('span', {}, r.metric.label + (r.metric.unit === '$' ? '' : ''))), k) }; });
    const routine = WK.routine.length ? h('div', { class: 'fx-small' }, h('p', {}, 'Smaller items'), WK.routine.map((x) => h('div', { class: 'fx-sm' }, h('span', { class: 'y' }, x.you.text), h('b', {}, x.label), h('span', { class: 'w' }, x.wake.text)))) : null;
    const banner = h('div', { class: 'fx-banner', hidden: true });
    const next = btn('SEE THE FINAL SCORE ▶', () => onFriday(ending), 'btn primary'); next.hidden = true;
    let fast = reduced;
    const ff = btn('FAST FORWARD ▶▶', () => { fast = true; ff.disabled = true; }, 'btn small');
    show('wake', 'fx-week',
      h('div', { class: 'fx-whud' },
        h('div', { class: 'p y' }, h('span', {}, 'PLAYER 1 · ON YOUR OWN'), prof.y, h('small', {}, 'operating profit impact'), recov.y),
        h('div', { class: 'mid' }, h('p', {}, 'THE WEEK'), h('div', { class: 'fx-days' }, dayEls)),
        h('div', { class: 'p w' }, h('span', {}, 'PLAYER 2 · WITH WAKE'), prof.w, h('small', {}, 'operating profit impact'), recov.w)),
      tug, tugLabel,
      h('div', { class: 'fx-maps' }, h('div', { class: 'fx-side y' }, MY.art, MY.log), h('div', { class: 'fx-side w' }, MW.art, MW.log)),
      h('div', { class: 'fx-legend2' }, ['open', 'waiting', 'working', 'fixed', 'worse'].map((s) => h('span', {}, h('i', { class: 'fx-bdg ' + s }, GLYPH[s]), STATUS[s].toLowerCase()))),
      h('section', { class: 'fx-score' }, h('div', { class: 'fx-bf head' }, h('b', { class: 'y' }, 'ON YOUR OWN'), h('p', {}, 'SCOREBOARD'), h('b', { class: 'w' }, 'WITH WAKE')), brow.map((b) => b.el)),
      h('section', { class: 'fx-probs' }, h('h2', { class: 'fx-h2' }, 'Problem by problem'), prow.map((p) => p.el), routine),
      banner,
      h('p', { class: 'fx-note' }, 'Dollar figures are estimates from this company\'s own numbers: payroll, revenue, invoices and tickets. Profit impact is operating profit against doing nothing; one-time recoveries are shown on their own. Run-rate is the yearly value of the fixes in place by Friday.'),
      h('div', { class: 'row fx-wctl' }, ff, next));
    own();

    const paintCell = (c, L, d, r) => {
      const day = L.days[d];
      const st = c.querySelector('.st'); st.className = 'st ' + day.status; st.textContent = STATUS[day.status];
      c.querySelector('.mv').textContent = day.shown;
      const cum = L.days.slice(0, d + 1).reduce((s, x) => s + x.profit, 0), back = L.days.slice(0, d + 1).reduce((s, x) => s + x.credit, 0);
      const pm = c.querySelector('.pm'); pm.replaceChildren(cum ? (cum > 0 ? '+' : '') + money(cum) : '', back ? h('small', {}, '+' + kmoney(back) + ' back') : ''); pm.className = 'pm' + (cum > 0 ? ' pos' : cum < 0 ? ' neg' : '');
      c.querySelector('.sp').replaceChildren(spark(L.series.slice(0, d + 2), r.metric.good));
      c.classList.remove('flip'); void c.offsetWidth; c.classList.add('flip');
    };
    const paintBadge = (b, L, d, side, r) => {
      const day = L.days[d]; b.className = 'fx-bdg ' + day.status; b.textContent = GLYPH[day.status]; b.title = r.label + ': ' + STATUS[day.status].toLowerCase();
      if (day.profit > 0 && !fast) { const pop = h('span', { class: 'fx-pop ' + side }, '+' + kmoney(day.profit)); b.parentElement.appendChild(pop); setTimeout(() => pop.remove(), 1400); }
    };
    const paintLog = (el, lines, d) => {
      el.replaceChildren(h('li', { class: 'dk' }, WK.days[d]), ...(lines.length ? lines : [{ t: 'Nothing new.', k: 'info' }]).map((l) => h('li', { class: l.k }, l.t)));
    };
    const paintBoard = (d) => {
      let yl = 0, wl = 0;
      for (const b of brow) {
        const yv = valOf('you', d, b.m.k), wv = valOf('wake', d, b.m.k);
        b.yv.textContent = b.m.fmt(yv); b.wv.textContent = b.m.fmt(wv);
        const top = b.m.max || Math.max(1, Math.abs(yv || 0), Math.abs(wv || 0));
        const len = (v) => Math.max(v === null ? 0 : 2, Math.min(100, Math.abs((v === null ? b.m.max || 0 : v)) / top * 100));
        b.yb.style.width = len(b.m.k === 'tta' && yv === null ? 5 : yv) + '%'; b.wb.style.width = len(wv) + '%';
        const yBetter = b.m.hi ? yv > wv : (yv === null ? false : wv === null ? true : yv < wv), wBetter = b.m.hi ? wv > yv : (wv === null ? false : yv === null ? true : wv < yv);
        b.el.classList.toggle('yw', yBetter); b.el.classList.toggle('ww', wBetter);
        if (yBetter) yl += 1; if (wBetter) wl += 1;
      }
      const pos = 50 - ((wl - yl) / MEAS.length) * 44;
      tug.style.setProperty('--p', pos + '%');
      tugLabel.textContent = wl > yl ? 'WITH WAKE · AHEAD ON ' + wl + ' OF ' + MEAS.length + ' MEASURES' : yl > wl ? 'ON YOUR OWN · AHEAD ON ' + yl + ' OF ' + MEAS.length : 'EVEN';
      tugLabel.className = 'fx-tug-l' + (wl > yl ? ' w' : yl > wl ? ' y' : '');
    };
    const count = async (el, from, to) => { const steps = fast ? 1 : 14; for (let i = 1; i <= steps; i++) { el.textContent = money(from + (to - from) * i / steps); await wait(26); } };
    tug.style.setProperty('--p', '50%');
    (async () => {
      await wait(600);
      let py = 0, pw = 0;
      for (let d = 0; d < 5; d++) {
        if (!alive) return;
        dayEls.forEach((e, i) => { e.classList.toggle('on', i === d); e.classList.toggle('past', i < d); });
        sfx.blip();
        paintLog(MY.log, WK.log.you[d], d); paintLog(MW.log, WK.log.wake[d], d);
        for (const p of prow) {
          paintBadge(MY.badges[p.r.id], p.r.you, d, 'y', p.r); paintBadge(MW.badges[p.r.id], p.r.wake, d, 'w', p.r);
          paintCell(p.y, p.r.you, d, p.r); paintCell(p.k, p.r.wake, d, p.r);
          if (!fast) await wait(120);
        }
        paintBoard(d);
        const ny = WK.board.you[d].profit, nw = WK.board.wake[d].profit;
        for (const [k, b] of [['y', WK.board.you[d]], ['w', WK.board.wake[d]]]) recov[k].textContent = b.oneTime ? '+ ' + money(b.oneTime) + ' recovered, one time' : '';
        await Promise.all([count(prof.y, py, ny), count(prof.w, pw, nw)]);
        sfx[nw > pw ? 'coin' : 'type']();
        py = ny; pw = nw;
        await wait(fast ? 60 : 2300);
      }
      if (!alive) return;
      const fy = WK.board.you[4], fw = WK.board.wake[4];
      const DAYNAME = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const allBy = WK.board.wake.findIndex((x) => x.resolved === n);
      banner.hidden = false;
      banner.replaceChildren(h('p', { class: 'k' }, 'FRIDAY · THE WEEK IS IN'),
        h('div', { class: 'fx-bn2' },
          h('div', { class: 'y' }, h('span', {}, 'ON YOUR OWN'), h('b', {}, fy.resolved + ' of ' + n), h('em', {}, 'resolved by Friday')),
          h('div', { class: 'w' }, h('span', {}, 'WITH WAKE'), h('b', {}, fw.resolved + ' of ' + n), h('em', {}, allBy >= 0 ? 'resolved by ' + DAYNAME[allBy] : 'resolved by Friday'))),
        h('p', {}, (fy.profit > 0 ? 'A solid week on your own: ' + money(fy.profit) + ' in operating profit, and the business ran well. ' : 'The business ran well on its own. ') +
          'With Wake, the same week reached ' + money(fw.profit) + (allBy >= 0 && allBy < 4 ? ', and from ' + DAYNAME[Math.min(4, allBy + 1)] + ' on, the time was yours.' : '.')));
      sfx.go(); ff.remove(); next.hidden = false; next.focus({ preventScroll: true });
      banner.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    })();
  }

  // ============================================================ THE FINAL SCORE
  function ending() {
    const R = game.recap();
    game.complete(); post();
    const S = R.score;
    const rows = h('div', { class: 'fs-rows' });
    const verdict = h('div', { class: 'fs-verdict', hidden: true });
    const rest = h('div', { class: 'fs-rest', hidden: true });
    const status = h('span', { class: 'quiet', 'aria-live': 'polite' });
    const reportEl = h('div', { class: 'report-wrap', hidden: true });
    const RT = S.rating, FY = S.final.you, FW = S.final.wake, n = S.n;
    const stat = (big, label) => h('p', {}, h('b', {}, big), h('span', {}, label));
    const card = (side, title, rating, stats) => h('div', { class: 'fs-card ' + side }, h('span', { class: 'fs-ck' }, title), h('strong', {}, rating.toUpperCase()), h('div', { class: 'fs-cs' }, stats));
    // your week is the base; Wake's week is the same bar, carried further
    const stack = (label, yv, wv, fmtv) => {
      const top = Math.max(1, wv), yp = Math.max(0, Math.min(100, yv / top * 100));
      return h('div', { class: 'fs-stack' }, h('p', { class: 'fs-sl' }, label),
        h('div', { class: 'fs-sb' }, h('i', { class: 'y', style: { width: yp + '%' } }, h('span', {}, fmtv(yv))), h('i', { class: 'w', style: { width: (100 - yp) + '%' } }, h('span', {}, '+' + fmtv(wv - yv)))),
        h('div', { class: 'fs-sk' }, h('span', { class: 'y' }, 'Your week'), h('span', { class: 'w' }, 'With Wake, on top of it')));
    };
    const pips = h('div', { class: 'fs-stack' }, h('p', { class: 'fs-sl' }, 'Problems resolved by Friday'),
      h('div', { class: 'fs-pips' }, Array.from({ length: n }, (_, i) => h('i', { class: i < FY.resolved ? 'y' : i < FW.resolved ? 'w' : '' }))),
      h('div', { class: 'fs-sk' }, h('span', { class: 'y' }, FY.resolved + ' on your own'), h('span', { class: 'w' }, (FW.resolved - FY.resolved > 0 ? '+' + (FW.resolved - FY.resolved) + ' with Wake' : '') + (S.by.wake ? ', all by ' + S.by.wake : ''))));
    const cards = h('div', { class: 'fs-cards', hidden: true },
      card('y', 'ON YOUR OWN', RT.you, [stat(money(FY.profit), 'operating profit'), stat(FY.resolved + ' of ' + n, 'resolved by Friday'), stat(kmoney(FY.runRate), 'run-rate added')]),
      card('w', 'WITH WAKE', RT.wake, [stat(money(FW.profit), 'operating profit'), stat(FW.resolved + ' of ' + n, S.by.wake ? 'resolved by ' + S.by.wake : 'resolved by Friday'), stat(kmoney(FW.runRate), 'run-rate added')]));
    const stacks = h('div', { class: 'fs-stacks', hidden: true }, stack('Operating profit this week', Math.max(0, FY.profit), FW.profit, kmoney), stack('Run-rate added, annualized', Math.max(0, FY.runRate), FW.runRate, kmoney), pips);
    show('wake', 'fx-final',
      h('p', { class: 'fs-k' }, 'GAME OVER'),
      h('h1', { class: 'fs-title' }, 'FINAL SCORE'),
      h('p', { class: 'fs-sub' }, 'Same company. Same data. Same Monday.'),
      cards, stacks,
      h('div', { class: 'fs-head' }, h('span', {}, ''), h('span', { class: 'y' }, 'ON YOUR OWN'), h('span', { class: 'w' }, 'WITH WAKE'), h('span', { class: 'a' }, 'AHEAD BY')),
      rows, verdict, rest, reportEl);
    own();
    (async () => {
      await wait(500);
      cards.hidden = false; sfx.blip(); await wait(900);
      stacks.hidden = false; sfx.coin(); await wait(900);
      for (const r of S.rows) {
        if (!alive) return;
        rows.appendChild(h('div', { class: 'fs-row' + (r.ahead ? ' up' : '') },
          h('div', { class: 'fs-l' }, r.label),
          h('div', { class: 'fs-y' }, h('b', {}, r.you)),
          h('div', { class: 'fs-w' }, h('b', {}, r.wake)),
          h('div', { class: 'fs-a' + (r.youWins ? ' yours' : '') }, r.ahead ? h('b', {}, r.ahead) : h('span', {}, r.youWins ? 'Yours this time' : 'Even'))));
        await wait(330);
      }
      verdict.hidden = false;
      verdict.replaceChildren(h('p', { class: 'fs-v' }, R.verdict), R.credit ? h('p', { class: 'fs-credit' }, R.credit) : null);
      sfx.start(); await wait(800);
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
        h('p', { class: 'mo-cap w' }, m.wake), m.stake ? h('p', { class: 'mo-stake' }, money(m.stake) + ' a week at stake') : null) : null;
      const Q = S.quarter;
      const tile = (big, label, yours) => h('div', {}, h('b', {}, big), h('span', {}, label), h('em', {}, yours));
      const quarter = h('section', { class: 'fs-q' }, h('h2', {}, 'Thirteen weeks like this one'),
        h('div', { class: 'fs-qrow' },
          tile(kmoney(Q.wake.total), 'operating profit with Wake', 'On your own: ' + kmoney(Q.you.total)),
          tile(kmoney(Q.wake.runRate), 'yearly run-rate by week 13', 'On your own: ' + kmoney(Q.you.runRate)),
          tile(Q.hours.toLocaleString('en-US') + ' hrs', 'of team time back', 'On your own: ' + Math.round(Q.you.hours).toLocaleString('en-US') + ' hrs on follow-up')));
      const copy = async () => {
        try { await navigator.clipboard.writeText(R.report.toText()); status.textContent = 'Report copied.'; game.exported('copy'); }
        catch (e) { const ta = h('textarea', { class: 'copybox', rows: '8', readonly: true }); ta.value = R.report.toText(); reportEl.hidden = false; reportEl.prepend(ta); ta.select(); status.textContent = 'Select all and copy.'; }
      };
      const download = () => { const a = h('a', { href: URL.createObjectURL(new Blob([R.report.toHTML()], { type: 'text/html' })), download: 'wake-experience-' + w().shell.company.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.html' }); document.body.appendChild(a); a.click(); a.remove(); game.exported('download'); status.textContent = 'Report downloaded.'; };
      const email = () => { window.location.href = 'mailto:?subject=' + encodeURIComponent('The Wake Experience: ' + w().shell.company) + '&body=' + encodeURIComponent(R.report.toText().slice(0, 1800)); game.exported('email'); };
      const view = btn('VIEW YOUR REPORT ▼', () => {
        if (!reportEl.querySelector('.wxr')) reportEl.append(h('style', {}, R.report.css), h('div', { class: 'report-paper', html: R.report.fragment() }));
        reportEl.hidden = !reportEl.hidden; view.textContent = reportEl.hidden ? 'VIEW YOUR REPORT ▼' : 'HIDE YOUR REPORT ▲';
        if (!reportEl.hidden) { game.exported('view'); reportEl.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }
      }, 'btn primary');
      const actions = HOST === 'artifact' ? [btn('COPY REPORT', copy, 'btn small')] : [btn('DOWNLOAD', download, 'btn small'), btn('EMAIL', email, 'btn small'), btn('COPY', copy, 'btn small')];
      rest.replaceChildren(
        quarter,
        h('section', { class: 'moment2' }, h('h2', { class: 'fx-h2' }, 'The moment that mattered'),
          seen && meant ? h('div', { class: 'mo-grid' }, seen, h('div', { class: 'mo-arrow' }, '▶'), meant) : h('div', { class: 'mo-card meant' }, h('h3', {}, m.title), m.lines.map((l) => h('p', {}, l)))),
        h('p', { class: 'closer' }, R.closer),
        h('div', { class: 'row fs-actions' }, view, h('span', { class: 'row' }, actions, status)),
        h('div', { class: 'row end' }, btn('PLAY AGAIN', onRestart, 'link'), h('a', { class: 'link', href: 'https://wakepe.com', target: '_blank', rel: 'noopener' }, 'wakepe.com')));
      rest.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    }
  }

  return { meeting, week, ending, setCleanup };
}
