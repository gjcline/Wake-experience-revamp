// THE FINALE
// The meeting twice (on your own, then prepared with Wake) in person, in the conference room, the
// result, the week as a
// live dashboard with each plan's updates coming in over Slack, and the final score as a report.
// Everything shown is read from the engine. The screens show what happened; the player draws
// the conclusions.

import { h } from './art.js';
import { sfx } from './arcade/sound.js';
import { ICONS, GLYPH } from './os/icons.js';
import { face, glyph } from './os/shell.js';
import { createOffice, SEAT, ROLE_COLOR } from './pixel/office.js';

const money = (v) => (v < 0 ? '-$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US');
const kmoney = (v) => { const a = Math.abs(v); const s = a >= 1e6 ? '$' + (a / 1e6).toFixed(2) + 'M' : a >= 1e4 ? '$' + Math.round(a / 1000) + 'k' : money(a); return (v < 0 ? '-' : '') + s.replace('-', ''); };
const clockAt = (min) => { const t = 600 + min, hh = Math.floor(t / 60), mm = t % 60; return ((hh + 11) % 12 + 1) + ':' + String(mm).padStart(2, '0') + ' ' + (hh < 12 ? 'AM' : 'PM'); };
const hrs = (x) => x + (x === 1 ? ' hr' : ' hrs');
const DECISION = { decided: 'Decided', guess: 'Decided on your word', pilot: 'Decided · smaller start', agreed: 'Agreed · numbers to follow', parked: 'Parked', next: 'Parked to next week', dropped: 'Dropped', busy: 'Kept on the list' };
const STATUS = { open: 'Open', waiting: 'Waiting', working: 'In progress', fixed: 'Resolved', worse: 'Worse' };
const mark = (id, cls) => h('span', { class: cls || 'fm', html: ICONS[id] || '' });
// Around the conference table: the central team where the walk-in showed them, the managers in
// the open seats. You sit at the head of the table.
const SEATS = { controller: [86, 42, 'down'], opsdir: [100, 42, 'down'], trainer: [114, 42, 'down'], hr: [100, 70, 'up'], analyst: [114, 70, 'up'], marketing: [128, 70, 'up'] };
const OPEN = [[128, 42, 'down'], [86, 70, 'up'], [72, 47, 'right'], [72, 58, 'right']];

export function createFinale({ game, show, reduced, setCleanup, onWalkBack, onFriday, onRestart, post, HOST, onFinished, onEmail, onBook }) {
  const w = () => game.world;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const btn = (label, onclick, cls = 'cb') => h('button', { class: cls, type: 'button', onclick }, label);
  const nameOf = (k) => (k === 'me' ? 'You' : (w().characters[k] || { name: '' }).name);
  const first = (k) => (k === 'me' ? 'You' : String(nameOf(k)).split(' ')[0]);
  const fc = (k, size) => (k === 'wake' ? mark('wake', 'fm wk') : face(k === 'me' ? 'You' : nameOf(k), size, k === 'me' ? '#5F6368' : undefined));
  let alive = true;
  // each screen owns the page until the next one replaces it
  const own = (also) => { alive = true; setCleanup(() => { alive = false; document.onkeydown = null; if (also) also(); }); };

  // ============================================================ THE MEETING: in the room
  function stage(side) {
    const W = w();
    const room = W.central.concat(W.locations.map((l) => l.manager));
    const seat = {}; let o = 0;
    for (const k of room) seat[k] = SEATS[k] || OPEN[o++] || [76, 52, 'right'];
    const tiles = {};
    const tile = (k) => { const el = h('div', { class: 'mt-p' + (k === 'me' ? ' me' : '') }, fc(k, 30), h('span', {}, k === 'me' ? 'You' : first(k))); tiles[k] = el; return el; };
    const screenBody = h('div', { class: 'mt-scr-body' });
    const paper = h('div', { class: 'mt-paper ' + side },
      h('div', { class: 'mt-scr-bar' }, side === 'wake' ? mark('wake', 'fm sm') : mark('docs', 'fm sm'), h('b', {}, side === 'wake' ? 'Your briefing · prepared with Wake' : 'Your notes'), h('span', {}, side === 'wake' ? 'Printed 9:52 AM' : 'Printed 9:55 AM')),
      screenBody);
    const holder = h('div', { class: 'mt-map' });
    const clock = h('b', {}, '10:00 AM'), elapsed = h('span', {}, '0 min');
    const pips = h('div', { class: 'mt-pips' });
    const cnt = (label, cls) => { const b = h('b', {}, '0'); return { el: h('div', { class: 'mt-cnt ' + cls }, b, h('span', {}, label)), b }; };
    const C = { hrs: cnt('leadership hours', 'ans'), owed: cnt('follow-ups owed', 'owed'), dec: cnt('decided', 'dec') };
    const people = room.length + 1;
    const hoursAt = (m) => (m * people / 60).toFixed(1);
    const log = h('div', { class: 'mt-log', 'aria-live': 'polite' });
    const choices = h('div', { class: 'mt-choices' });
    const ctl = h('div', { class: 'mt-ctl2' });
    const title = (W.role.meetingName[0].toUpperCase() + W.role.meetingName.slice(1));
    const el = show(side === 'wake' ? 'wake' : 'day', 'cl-screen mt room ' + side,
      h('div', { class: 'mt-main' },
        h('div', { class: 'mt-stage' },
          h('div', { class: 'mt-head' }, h('span', { class: 'mt-tag ' + side }, side === 'wake' ? 'Prepared with Wake' : 'On your own'), h('div', { class: 'mt-agenda' }, h('span', {}, 'Agenda'), pips), C.hrs.el, C.owed.el, C.dec.el),
          h('div', { class: 'mt-roomv' }, holder, paper),
          h('div', { class: 'mt-ppl' }, tile('me'), room.map(tile))),
        h('aside', { class: 'mt-panel' },
          h('div', { class: 'mt-ph' }, h('b', {}, 'In the room'), h('span', {}, 'Conference room · in person')),
          log, choices, ctl)),
      h('footer', { class: 'mt-bar' },
        h('div', { class: 'mt-bl' }, clock, h('i'), h('span', {}, title), h('i'), elapsed),
        h('div', { class: 'mt-bc' }, h('span', { class: 'mt-loc' }, W.shell.company + ' · conference room')),
        h('div', { class: 'mt-br' }, glyph('people'), h('span', {}, people + ' in the room'))));
    const npcs = room.map((k) => ({ av: W.characters[k].av, x: seat[k][0], y: seat[k][1], facing: seat[k][2], seated: true }));
    const map = createOffice(holder, { company: W.shell.company, playerShirt: ROLE_COLOR[W.role.id] || ROLE_COLOR.gm, npcs, reduced, start: { x: SEAT.meeting.x, y: SEAT.meeting.y, dir: 'left', seated: true, z: 3 } });
    map.ready.then(() => map.view(106, 50, 3));
    const bubble = (k, cls) => { const at = k === 'me' ? [SEAT.meeting.x, SEAT.meeting.y] : seat[k]; if (!at) return; map.say(at[0], at[1] - 2, cls === 'q' ? '?' : cls === 'ok' ? 'OK' : cls === 'pres' ? '!' : '...', 1300); };
    own(() => map.destroy());
    let used = 0;
    C.hrs.b.textContent = '0.0';
    const S = {
      el, tiles, screen: screenBody, log, choices, ctl, C, pips, people,
      set(m) { used = m; clock.textContent = clockAt(m); elapsed.textContent = m + ' min'; C.hrs.b.textContent = hoursAt(m); },
      async tick(m, fast) { const steps = fast ? 1 : Math.max(1, Math.round(m)); for (let i = 0; i < steps; i++) { used += m / steps; clock.textContent = clockAt(Math.round(used)); elapsed.textContent = Math.round(used) + ' min'; C.hrs.b.textContent = hoursAt(used); if (!fast) await wait(60); } },
      async to(m, fast) { if (m > used) await S.tick(m - used, fast); },
      out(keys) { keys.forEach((k) => tiles[k] && tiles[k].classList.add('out')); },
      count(k, v) { C[k].b.textContent = String(v); C[k].el.classList.remove('bump'); void C[k].el.offsetWidth; C[k].el.classList.add('bump'); },
      talk(k) { Object.values(tiles).forEach((s) => s.classList.remove('talk')); if (tiles[k]) tiles[k].classList.add('talk'); },
      say(k, text, cls = '') {
        S.talk(k); bubble(k, cls);
        const line = h('div', { class: 'mt-msg ' + cls + (k === 'me' ? ' me' : '') }, fc(k, 28), h('div', {}, h('b', {}, k === 'me' ? 'You' : nameOf(k)), h('p', {}, text)));
        log.appendChild(line); log.scrollTop = log.scrollHeight; sfx.blip();
        return line;
      },
      note(node) { log.appendChild(node); log.scrollTop = log.scrollHeight; return node; },
      agenda(n, i) { pips.replaceChildren(...Array.from({ length: n }, (_, j) => h('i', { class: j < i ? 'done' : j === i ? 'on' : '' }, String(j + 1)))); },
    };
    return S;
  }
  const stampEl = (decision, extra) => h('div', { class: 'mt-stamp s-' + decision }, h('b', {}, DECISION[decision] || 'Decided'), extra ? h('span', {}, extra) : null);

  // ------------------------------------------------------------ meeting 1: on your own
  // The engine directs the room one beat at a time; this screen plays each beat as it comes.
  function meeting() {
    sfx.ambience(0.6);
    const S = stage('you');
    let owed = 0, decided = 0, lastItem = -1;
    const choose = (b) => new Promise((resolve) => {
      const opts = b.opts.map((o, i) => h('button', { class: 'mt-opt' + (o.effect === 'answer' ? ' ev' : ''), type: 'button', onclick: () => pick(o) }, h('i', {}, String.fromCharCode(65 + i)), h('span', {}, o.label), o.meta ? h('em', {}, o.meta) : null));
      const pick = (o) => { document.onkeydown = null; S.choices.replaceChildren(); sfx.select(); resolve(o); };
      S.choices.replaceChildren(h('p', { class: 'mt-ask' }, 'Your answer'), ...opts);
      document.onkeydown = (e) => { const i = '123'.indexOf(e.key) >= 0 ? '123'.indexOf(e.key) : 'abc'.indexOf(e.key.toLowerCase()); if (i >= 0 && b.opts[i]) pick(b.opts[i]); };
      try { opts[0].focus({ preventScroll: true }); } catch (e) { /* fine */ }
    });
    const owe = (task) => { owed += 1; S.count('owed', owed); S.note(h('div', { class: 'mt-iou' }, h('b', {}, 'Follow-up'), h('span', {}, first(task.who) + ': ' + task.what))); };
    const notes = (it, total) => S.screen.replaceChildren(
      h('p', { class: 'mt-sn' }, 'Item ' + it.n + ' of ' + total + (it.what.where ? ' · ' + it.what.where : '')), h('h2', {}, it.what.label + (it.what.value ? ': ' + it.what.value : '')), h('p', { class: 'mt-sq' }, '"' + it.text + '"'),
      h('p', { class: 'mt-sm' }, it.owner ? 'Owner: ' + it.owner.name : 'No owner named'));
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
          if (b.first) S.note(h('p', { class: 'mt-hint' }, 'The room will ask questions. Answer with what you brought.'));
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
      S.choices.replaceChildren(h('div', { class: 'mt-done' },
        h('p', { class: 'mt-dk' }, 'Meeting over · ' + clockAt(Y.minutes)),
        h('div', { class: 'mt-drow' },
          h('div', {}, h('b', {}, Y.hours.toFixed(1)), h('span', {}, 'leadership hours')),
          h('div', {}, h('b', {}, Y.ownerDate + '/' + Y.items.length), h('span', {}, 'with an owner and a date')),
          h('div', {}, h('b', {}, String(Y.ious)), h('span', {}, 'follow-ups owed'))),
        h('p', {}, 'Same room. Same people. Same 10:00 AM. Now run it again, with the briefing you prepared with Wake.'),
        btn('Run it prepared with Wake', meetingWake, 'cb wake')));
      sfx.credit();
    })();
  }

  // ------------------------------------------------------------ meeting 2: with Wake
  function meetingWake() {
    sfx.ambience(0.6);
    const K = game.meetingWake();
    const S = stage('wake');
    let fast = reduced, skipped = false, answered = 0, decided = 0;
    const ff = btn('Fast forward', () => { fast = true; ff.disabled = true; }, 'cb small ghost');
    const sk = btn('Skip to result', () => { skipped = true; fast = true; }, 'cb small ghost');
    S.ctl.replaceChildren(ff, sk);
    const pause = (ms) => wait(fast ? 40 : ms);
    const card = (it) => S.screen.replaceChildren(
      h('p', { class: 'mt-sn' }, 'Insight ' + it.n + ' of ' + K.items.length + (it.place ? ' · ' + it.place : '')), h('h2', {}, it.headline), h('p', { class: 'mt-sdo' }, h('b', {}, 'Recommended'), it.action),
      h('p', { class: 'mt-sm' }, 'Owner: ' + it.owners.map((o) => o.name).join(' + ') + ' · Watching: ' + it.check),
      h('p', { class: 'mt-src' }, it.signals + ' lines from ' + it.systems + (it.systems === 1 ? ' system' : ' systems')));
    (async () => {
      S.agenda(K.items.length, 0);
      S.say('opsdir', 'Let\'s get started. What have you got for us?');
      S.screen.replaceChildren(h('h2', {}, 'Your briefing'), h('p', { class: 'mt-sq' }, K.items.length + ' items, ranked, prepared with Wake this morning. Every one with its evidence, an owner and the number to watch.'));
      await S.tick(3, fast);
      for (const it of K.items) {
        if (!alive) return;
        if (skipped) break;
        S.agenda(K.items.length, it.n - 1); card(it);
        S.say('me', it.headline + ' ' + it.action, 'pres'); await pause(900);
        for (const q of it.qs) {
          S.say(q.asker.key, q.asker.line, 'q'); await pause(650);
          const a = S.say('me', q.answer, 'a prep');
          if (q.chips) a.querySelector('div').appendChild(h('div', { class: 'mt-chips' }, h('em', {}, 'From your briefing'), q.chips.map((c) => h('span', {}, h('b', {}, c.sys), ' ' + c.label))));
          answered += 1; await pause(900);
        }
        S.say(it.owner.key, it.onIt, 'ok'); await pause(500);
        decided += 1; S.count('dec', decided);
        S.note(stampEl('decided', it.owners.map((o) => o.name).join(' + ') + ' · watching: ' + it.check)); sfx.coin();
        await S.tick(2, fast); await pause(500);
      }
      if (!alive) return;
      S.agenda(K.items.length, K.items.length);
      if (!skipped) { S.say(K.wrap.asker.key, K.wrap.asker.line, 'q'); await pause(600); S.say('me', K.wrap.answer, 'a prep'); answered += 1; await S.tick(1, fast); }
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
    const axis = h('div', { class: 'rs-axis' }, [0, 15, 30, 45, 60, 75, 90].filter((m) => m <= max + 4).map((m) => h('span', { style: { left: (m / max * 100) + '%' } }, clockAt(m).replace(' AM', ''))));
    const seg = (min, cls, label) => h('i', { class: 'seg ' + cls, style: { width: (min / max * 100) + '%' }, title: label }, h('span', {}, label));
    const yBar = h('div', { class: 'rs-tl y' }, seg(3, 'open', ''), Y.items.map((it) => seg(it.minutes, it.decision, String(it.n))), seg(Y.minutes - 3 - Y.items.reduce((n, x) => n + x.minutes, 0), 'open', ''));
    const kBar = h('div', { class: 'rs-tl w' }, seg(3, 'open', ''), K.items.map((it) => seg(it.minutes, 'decided', String(it.n))), seg(1, 'open', ''));
    const duel = ([label, sub], yv, kv, yb, kb) => h('tr', {}, h('th', {}, label, h('small', {}, sub)), h('td', { class: 'y' + (yb ? ' win' : '') }, yv), h('td', { class: 'w' + (kb ? ' win' : '') }, kv));
    const P = game.meetingPrep(), T = game.week().tta;
    const dur = (m) => (m >= 60 ? Math.floor(m / 60) + ' hr ' + (m % 60) + ' min' : m + ' min');
    const fmtT = (x) => (x === null ? 'None this week' : x === 0 ? 'Same day' : x + (x === 1 ? ' day' : ' days'));
    const task = (x) => h('li', {}, fc(x.who.key, 28), h('div', {}, h('b', {}, x.who.key === 'me' ? 'You' : x.who.name), h('p', {}, x.what)), h('em', {}, hrs(x.hrs)));
    show('wake', 'cl-screen rs',
      h('div', { class: 'rs-page' },
        h('p', { class: 'rs-k' }, 'The meeting · result · ' + w().shell.company),
        h('h1', {}, 'Same room. Two meetings.'),
        h('section', { class: 'rs-card' },
          h('div', { class: 'rs-tlrow' }, h('p', { class: 'rs-tlk y' }, 'On your own', h('b', {}, Y.minutes + ' min')), yBar),
          h('div', { class: 'rs-tlrow' }, h('p', { class: 'rs-tlk w' }, 'Prepared with Wake', h('b', {}, K.minutes + ' min')), kBar),
          h('div', { class: 'rs-tlrow' }, h('span'), axis),
          h('div', { class: 'rs-legend' }, h('span', { class: 'decided' }, h('i'), 'Decided'), h('span', { class: 'guess' }, h('i'), 'Decided on your word'), h('span', { class: 'agreed' }, h('i'), 'Agreed, numbers to follow'), h('span', { class: 'parked' }, h('i'), 'Parked for follow-ups'), h('span', { class: 'dropped' }, h('i'), 'Dropped or not a priority'))),
        h('section', { class: 'rs-card' }, h('table', { class: 'rs-duel' },
          h('thead', {}, h('tr', {}, h('th'), h('th', { class: 'y' }, 'On your own'), h('th', { class: 'w' }, 'With Wake'))),
          h('tbody', {},
            duel(['Prep before the meeting', '7:48 AM to briefing locked'], dur(P.you), dur(P.wake), P.you <= P.wake, P.wake <= P.you),
            duel(['Leadership hours in the room', Y.attendees + ' people × meeting length'], Y.hours.toFixed(1) + ' hrs', K.hours.toFixed(1) + ' hrs', Y.hours <= K.hours, K.hours <= Y.hours),
            duel(['Decisions with an owner and a start date', 'Out of every item on the agenda'], Y.ownerDate + ' of ' + Y.items.length, K.ownerDate + ' of ' + K.items.length, Y.ownerDate / Y.items.length >= 1, true),
            duel(['Items carried to another meeting', 'Parked, or waiting on numbers'], String(Y.deferred), '0', Y.deferred === 0, true),
            duel(['Time to first action', 'Average, from Monday\'s meeting'], fmtT(T.you), fmtT(T.wake), T.you !== null && T.you <= T.wake, true)))),
        h('div', { class: 'rs-after' },
          h('section', { class: 'rs-card y' }, h('h2', {}, 'Your afternoon'), h('p', { class: 'rs-sub' }, hrs(A.hours) + ' of work the meeting created'), h('ul', { class: 'rs-tasks' }, A.mine.map(task))),
          h('section', { class: 'rs-card w' }, h('h2', {}, 'With Wake, by 10:16 AM'), h('p', { class: 'rs-sub' }, 'Done before anyone was back at their desk'), h('ul', { class: 'rs-done' }, A.done.map((d) => h('li', {}, h('i', {}, '✓'), h('div', {}, h('b', {}, d.at), h('p', {}, d.what))))))),
        h('div', { class: 'rs-next' }, btn('Back to your office', onWalkBack, 'cb primary big'))));
    own(); sfx.credit();
  }

  // ============================================================ THE WEEK: a dashboard, and Slack
  function week() {
    sfx.ambience(0);
    const W = w(), WK = game.week();
    const rows = WK.rows, n = rows.length;
    const DAYNAME = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const dayEls = WK.days.map((d) => h('span', { class: 'wd-day' }, d));
    const prof = { y: h('b', {}, '$0'), w: h('b', {}, '$0') };
    const recov = { y: h('small', {}, ''), w: h('small', {}, '') };
    const lead = h('p', { class: 'wd-lead' }, 'Even');
    const MEAS = [
      { k: 'profit', label: 'Operating profit impact', fmt: money, hi: true },
      { k: 'runRate', label: 'Run-rate added, annualized', fmt: kmoney, hi: true },
      { k: 'resolved', label: 'Problems resolved', fmt: (v) => v + ' of ' + n, hi: true, max: n },
      { k: 'tta', label: 'Time to action', fmt: (v) => (v === null ? 'None' : v === 0 ? 'Same day' : v + (v === 1 ? ' day' : ' days')), hi: false, max: 5 },
      { k: 'hours', label: 'Team hours on follow-up', fmt: hrs, hi: false },
      { k: 'open', label: 'Follow-ups still open', fmt: String, hi: false },
    ];
    const brow = MEAS.map((m) => { const yv = h('b'), wv = h('b'), yb = h('i'), wb = h('i'); return { m, el: h('tr', {}, h('th', {}, m.label), h('td', { class: 'y' }, h('span', { class: 'wd-bar' }, yb), yv), h('td', { class: 'w' }, h('span', { class: 'wd-bar' }, wb), wv)), yv, wv, yb, wb }; });
    const valOf = (side, d, k) => (k === 'tta' ? WK.tta[side] : WK.board[side][d][k]);
    const spark = (series) => {
      const lo = Math.min(...series), hi = Math.max(...series), span = hi - lo || 1;
      const pts = series.map((v, i) => (i * 100 / Math.max(1, series.length - 1)).toFixed(1) + ',' + (26 - ((v - lo) / span) * 22).toFixed(1)).join(' ');
      return h('span', { class: 'wd-spark', html: '<svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>' });
    };
    const pcell = () => h('td', { class: 'wd-pc' }, h('span', { class: 'st open' }, 'Open'), h('b', { class: 'mv' }, ''), h('span', { class: 'pm' }, ''), h('span', { class: 'sp' }));
    const prow = rows.map((r) => { const y = pcell(), k = pcell(); return { r, y, k, el: h('tr', {}, h('th', {}, h('b', {}, r.label), h('span', {}, r.metric.label)), y, k) }; });
    // two Slack channels, one per plan
    const slack = (side) => {
      const feed = h('div', { class: 'sl-feed' });
      const el = h('div', { class: 'sl ' + side },
        h('aside', { class: 'sl-side' }, h('div', { class: 'sl-ws' }, W.shell.company.split(' ').map((x) => x[0]).join('').slice(0, 2)),
          h('p', { class: 'sl-h' }, 'Channels'), h('span', { class: 'sl-ch on' }, '# leadership'), h('span', { class: 'sl-ch' }, '# ops'), h('span', { class: 'sl-ch' }, '# general')),
        h('section', { class: 'sl-main' }, h('header', { class: 'sl-top' }, h('b', {}, '# leadership'), h('span', {}, side === 'w' ? 'The plan that left Wake\'s meeting' : 'The plan that left your meeting')), feed));
      return { el, feed };
    };
    const SY = slack('y'), SW = slack('w');
    const postDay = (S, side, d, lines) => {
      S.feed.appendChild(h('div', { class: 'sl-day' }, h('span', {}, DAYNAME[d])));
      const who = side === 'w' ? { n: 'Wake', icon: mark('wake', 'fm sl-av') } : { n: 'Weekly check-in', icon: h('span', { class: 'sl-av bot' }, '✓') };
      S.feed.appendChild(h('div', { class: 'sl-msg' }, who.icon, h('div', {}, h('p', { class: 'sl-who' }, h('b', {}, who.n), h('em', {}, 'APP'), h('span', {}, '5:30 PM')),
        h('ul', {}, (lines.length ? lines : [{ t: 'Nothing new.', k: 'info' }]).map((l) => h('li', { class: 'k-' + l.k }, l.t))))));
      S.feed.scrollTop = S.feed.scrollHeight;
    };
    const routine = WK.routine.length ? h('section', { class: 'rs-card' }, h('h2', {}, 'Smaller items'), h('table', { class: 'wd-small' }, h('tbody', {}, WK.routine.map((x) => h('tr', {}, h('th', {}, x.label), h('td', { class: 'y' }, x.you.text), h('td', { class: 'w' }, x.wake.text)))))) : null;
    const banner = h('section', { class: 'wd-banner', hidden: true });
    const next = btn('See the final score', () => onFriday(ending), 'cb primary big'); next.hidden = true;
    let fast = reduced;
    const ff = btn('Fast forward', () => { fast = true; ff.disabled = true; }, 'cb small ghost');
    show('wake', 'cl-screen wd',
      h('div', { class: 'rs-page wide' },
        h('header', { class: 'wd-head' }, h('div', {}, h('p', { class: 'rs-k' }, 'The week · ' + W.shell.company), h('h1', {}, 'Both plans, Monday to Friday')), h('div', { class: 'wd-days' }, dayEls), ff),
        h('div', { class: 'wd-kpis' },
          h('div', { class: 'wd-kpi y' }, h('span', {}, 'On your own · operating profit impact'), prof.y, recov.y),
          h('div', { class: 'wd-kpi w' }, h('span', {}, 'With Wake · operating profit impact'), prof.w, recov.w)),
        lead,
        h('div', { class: 'wd-slacks' }, SY.el, SW.el),
        h('section', { class: 'rs-card' }, h('h2', {}, 'Scoreboard'), h('table', { class: 'wd-board' }, h('thead', {}, h('tr', {}, h('th'), h('th', { class: 'y' }, 'On your own'), h('th', { class: 'w' }, 'With Wake'))), h('tbody', {}, brow.map((b) => b.el)))),
        h('section', { class: 'rs-card' }, h('h2', {}, 'Problem by problem'), h('table', { class: 'wd-probs' }, h('thead', {}, h('tr', {}, h('th'), h('th', { class: 'y' }, 'On your own'), h('th', { class: 'w' }, 'With Wake'))), h('tbody', {}, prow.map((p) => p.el)))),
        routine, banner,
        h('p', { class: 'wd-note' }, 'Dollar figures are estimates from this company\'s own numbers: payroll, revenue, invoices and tickets. Profit impact is operating profit against doing nothing; one-time recoveries are shown on their own. Run-rate is the yearly value of the fixes in place by Friday.'),
        h('div', { class: 'rs-next' }, next)));
    own();

    const paintCell = (c, L, d) => {
      const day = L.days[d];
      const st = c.querySelector('.st'); st.className = 'st ' + day.status; st.textContent = STATUS[day.status];
      c.querySelector('.mv').textContent = day.shown;
      const cum = L.days.slice(0, d + 1).reduce((s, x) => s + x.profit, 0), back = L.days.slice(0, d + 1).reduce((s, x) => s + x.credit, 0);
      const pm = c.querySelector('.pm'); pm.replaceChildren(cum ? (cum > 0 ? '+' : '') + money(cum) : '', back ? h('small', {}, ' +' + kmoney(back) + ' back') : ''); pm.className = 'pm' + (cum > 0 ? ' pos' : cum < 0 ? ' neg' : '');
      c.querySelector('.sp').replaceChildren(spark(L.series.slice(0, d + 2)));
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
      lead.textContent = wl > yl ? 'With Wake is ahead on ' + wl + ' of ' + MEAS.length + ' measures' : yl > wl ? 'On your own is ahead on ' + yl + ' of ' + MEAS.length + ' measures' : 'Even so far';
      lead.className = 'wd-lead' + (wl > yl ? ' w' : yl > wl ? ' y' : '');
    };
    const count = async (el, from, to) => { const steps = fast ? 1 : 14; for (let i = 1; i <= steps; i++) { el.textContent = money(from + (to - from) * i / steps); await wait(26); } };
    (async () => {
      await wait(600);
      let py = 0, pw = 0;
      for (let d = 0; d < 5; d++) {
        if (!alive) return;
        dayEls.forEach((e, i) => { e.classList.toggle('on', i === d); e.classList.toggle('past', i < d); });
        sfx.blip();
        postDay(SY, 'y', d, WK.log.you[d]); postDay(SW, 'w', d, WK.log.wake[d]);
        for (const p of prow) { paintCell(p.y, p.r.you, d); paintCell(p.k, p.r.wake, d); }
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
      const allBy = WK.board.wake.findIndex((x) => x.resolved === n);
      banner.hidden = false;
      banner.replaceChildren(h('p', { class: 'rs-k' }, 'Friday · the week is in'),
        h('div', { class: 'wd-bn2' },
          h('div', { class: 'y' }, h('span', {}, 'On your own'), h('b', {}, fy.resolved + ' of ' + n), h('em', {}, 'resolved by Friday')),
          h('div', { class: 'w' }, h('span', {}, 'With Wake'), h('b', {}, fw.resolved + ' of ' + n), h('em', {}, allBy >= 0 ? 'resolved by ' + DAYNAME[allBy] : 'resolved by Friday'))),
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
    const rows = h('tbody');
    const verdict = h('div', { class: 'fs2-verdict', hidden: true });
    const rest = h('div', { class: 'fs2-rest', hidden: true });
    const status = h('span', { class: 'cl-muted', 'aria-live': 'polite' });
    const reportEl = h('div', { class: 'report-wrap', hidden: true });
    const RT = S.rating, FY = S.final.you, FW = S.final.wake, n = S.n;
    if (onFinished) onFinished({ profitYou: FY.profit, profitWake: FW.profit, resolvedYou: FY.resolved, resolvedWake: FW.resolved, problems: n });
    const stat = (big, label) => h('p', {}, h('b', {}, big), h('span', {}, label));
    const card = (side, title, rating, stats) => h('div', { class: 'fs2-card ' + side }, h('span', { class: 'fs2-ck' }, title), h('strong', {}, rating[0].toUpperCase() + rating.slice(1)), h('div', { class: 'fs2-cs' }, stats));
    // your week is the base; Wake's week is the same bar, carried further
    const stack = (label, yv, wv, fmtv) => {
      const top = Math.max(1, wv), yp = Math.max(0, Math.min(100, yv / top * 100));
      return h('div', { class: 'fs2-stack' }, h('p', { class: 'fs2-sl' }, label),
        h('div', { class: 'fs2-sb' }, h('i', { class: 'y', style: { width: yp + '%' } }, h('span', {}, fmtv(yv))), h('i', { class: 'w', style: { width: (100 - yp) + '%' } }, h('span', {}, '+' + fmtv(wv - yv)))),
        h('div', { class: 'fs2-sk' }, h('span', { class: 'y' }, 'Your week'), h('span', { class: 'w' }, 'With Wake, on top of it')));
    };
    const pips = h('div', { class: 'fs2-stack' }, h('p', { class: 'fs2-sl' }, 'Problems resolved by Friday'),
      h('div', { class: 'fs2-pips' }, Array.from({ length: n }, (_, i) => h('i', { class: i < FY.resolved ? 'y' : i < FW.resolved ? 'w' : '' }))),
      h('div', { class: 'fs2-sk' }, h('span', { class: 'y' }, FY.resolved + ' on your own'), h('span', { class: 'w' }, (FW.resolved - FY.resolved > 0 ? '+' + (FW.resolved - FY.resolved) + ' with Wake' : '') + (S.by.wake ? ', all by ' + S.by.wake : ''))));
    const cards = h('div', { class: 'fs2-cards', hidden: true },
      card('y', 'On your own', RT.you, [stat(money(FY.profit), 'operating profit'), stat(FY.resolved + ' of ' + n, 'resolved by Friday'), stat(kmoney(FY.runRate), 'run-rate added')]),
      card('w', 'With Wake', RT.wake, [stat(money(FW.profit), 'operating profit'), stat(FW.resolved + ' of ' + n, S.by.wake ? 'resolved by ' + S.by.wake : 'resolved by Friday'), stat(kmoney(FW.runRate), 'run-rate added')]));
    const stacks = h('section', { class: 'rs-card fs2-stacks', hidden: true }, stack('Operating profit this week', Math.max(0, FY.profit), FW.profit, kmoney), stack('Run-rate added, annualized', Math.max(0, FY.runRate), FW.runRate, kmoney), pips);
    const table = h('section', { class: 'rs-card', hidden: true }, h('table', { class: 'fs2-table' }, h('thead', {}, h('tr', {}, h('th'), h('th', { class: 'y' }, 'On your own'), h('th', { class: 'w' }, 'With Wake'), h('th', { class: 'a' }, 'Ahead by'))), rows));
    show('wake', 'cl-screen fs2',
      h('div', { class: 'rs-page' },
        h('p', { class: 'rs-k' }, 'Final score · ' + w().shell.company),
        h('h1', {}, 'Same company. Same data. Same Monday.'),
        cards, stacks, table, verdict, rest, reportEl));
    own();
    (async () => {
      await wait(400);
      cards.hidden = false; sfx.blip(); await wait(700);
      stacks.hidden = false; sfx.coin(); await wait(700);
      table.hidden = false;
      for (const r of S.rows) {
        if (!alive) return;
        rows.appendChild(h('tr', { class: r.ahead ? 'up' : '' }, h('th', {}, r.label), h('td', { class: 'y' }, r.you), h('td', { class: 'w' }, r.wake),
          h('td', { class: 'a' + (r.youWins ? ' yours' : '') }, r.ahead ? h('b', {}, r.ahead) : h('span', {}, r.youWins ? 'Yours this time' : 'Even'))));
        await wait(240);
      }
      verdict.hidden = false;
      verdict.replaceChildren(h('p', { class: 'fs2-v' }, R.verdict), R.credit ? h('p', { class: 'fs2-credit' }, R.credit) : null);
      sfx.start(); await wait(600);
      rest.hidden = false; renderRest();
    })();

    function renderRest() {
      const m = R.moment, t = m.excerpt;
      let seen = null;
      if (t) {
        const ex = t.excerpt;
        const body = ex.kind === 'report' ? h('div', { class: 'dscroll' }, h('table', { class: 'dt mini' }, h('thead', {}, h('tr', {}, ex.cols.map((c) => h('th', {}, c)))), h('tbody', {}, ex.rows.slice(0, 2).map((r) => h('tr', {}, r.map((c) => h('td', { class: c.hl ? 'wt-hl' : '' }, c.t)))))))
          : h('div', { class: 'mo2-quote' }, ex.title && ex.kind === 'email' ? h('strong', {}, ex.title) : null, (ex.list || ex.body || ex.lines || []).slice(0, 3).map((x) => h('p', {}, x)));
        seen = h('div', { class: 'mo2-card saw' }, h('p', { class: 'mo2-k' }, 'What you saw'), h('p', { class: 'mo2-src' }, t.source.title + ' · ' + t.source.system), body,
          h('p', { class: 'mo2-cap' }, t.r1.flagged ? 'You flagged it. You didn\'t connect it.' : t.r1.seen ? 'You had it open at ' + t.r1.at + '. On its own, it looked like nothing.' : 'You never opened it.'));
      }
      const meant = m.connected ? h('div', { class: 'mo2-card meant' }, h('p', { class: 'mo2-k' }, 'What it meant'), h('h3', {}, m.title),
        h('div', { class: 'mo2-chips' }, m.connected.map((c) => h('span', {}, h('b', {}, c.where), ' ' + c.label + (c.value ? ': ' + c.value : '')))),
        h('p', { class: 'mo2-cap w' }, m.wake), m.stake ? h('p', { class: 'mo2-stake' }, money(m.stake) + ' a week at stake') : null) : null;
      const Q = S.quarter;
      const tile = (big, label, yours) => h('div', {}, h('b', {}, big), h('span', {}, label), h('em', {}, yours));
      const quarter = h('section', { class: 'rs-card' }, h('h2', {}, 'Thirteen weeks like this one'),
        h('div', { class: 'fs2-q' },
          tile(kmoney(Q.wake.total), 'operating profit with Wake', 'On your own: ' + kmoney(Q.you.total)),
          tile(kmoney(Q.wake.runRate), 'yearly run-rate by week 13', 'On your own: ' + kmoney(Q.you.runRate)),
          tile(Q.hours.toLocaleString('en-US') + ' hrs', 'of team time back', 'On your own: ' + Math.round(Q.you.hours).toLocaleString('en-US') + ' hrs on follow-up')));
      const copy = async () => {
        try { await navigator.clipboard.writeText(R.report.toText()); status.textContent = 'Report copied.'; game.exported('copy'); }
        catch (e) { const ta = h('textarea', { class: 'copybox', rows: '8', readonly: true }); ta.value = R.report.toText(); reportEl.hidden = false; reportEl.prepend(ta); ta.select(); status.textContent = 'Select all and copy.'; }
      };
      const download = () => { const a = h('a', { href: URL.createObjectURL(new Blob([R.report.toHTML()], { type: 'text/html' })), download: 'wake-experience-' + w().shell.company.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.html' }); document.body.appendChild(a); a.click(); a.remove(); game.exported('download'); status.textContent = 'Report downloaded.'; };
      const email = () => { window.location.href = 'mailto:?subject=' + encodeURIComponent('The Wake Experience: ' + w().shell.company) + '&body=' + encodeURIComponent(R.report.toText().slice(0, 1800)); game.exported('email'); };
      const view = btn('View your report', () => {
        if (!reportEl.querySelector('.wxr')) reportEl.append(h('style', {}, R.report.css), h('div', { class: 'report-paper', html: R.report.fragment() }));
        reportEl.hidden = !reportEl.hidden; view.textContent = reportEl.hidden ? 'View your report' : 'Hide your report';
        if (!reportEl.hidden) { game.exported('view'); reportEl.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }
      }, 'cb primary');
      const actions = HOST === 'artifact' ? [btn('Copy report', copy, 'cb small ghost')] : [btn('Download', download, 'cb small ghost'), btn('Email', email, 'cb small ghost'), btn('Copy', copy, 'cb small ghost')];
      rest.replaceChildren(
        quarter,
        h('section', { class: 'rs-card' }, h('h2', {}, 'The moment that mattered'),
          seen && meant ? h('div', { class: 'mo2-grid' }, seen, h('div', { class: 'mo2-arrow' }, '→'), meant) : h('div', { class: 'mo2-card meant' }, h('h3', {}, m.title), m.lines.map((l) => h('p', {}, l)))),
        h('p', { class: 'fs2-closer' }, R.closer),
        nextStep(),
        h('div', { class: 'fs2-actions' }, view, actions, status),
        h('div', { class: 'fs2-end' }, btn('Play again', onRestart, 'cb ghost'), h('a', { class: 'cl-link', href: 'https://wakepe.com', target: '_blank', rel: 'noopener' }, 'wakepe.com')));
      rest.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    }

    // What to do next: a call about their own numbers, or the report by email.
    function nextStep() {
      if (!onEmail && !onBook) return null;
      const note = h('p', { class: 'fs2-nnote', 'aria-live': 'polite' });
      const input = h('input', { class: 'fs2-in', type: 'email', placeholder: 'you@company.com', autocomplete: 'email', 'aria-label': 'Your email' });
      const saveEmail = (e) => {
        e.preventDefault();
        const v = input.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { note.textContent = 'That email doesn\'t look right.'; return; }
        onEmail(v); input.disabled = true; note.textContent = 'Thanks. The Wake team will send your report to ' + v + '.';
      };
      return h('section', { class: 'rs-card fs2-next' },
        h('div', {}, h('h2', {}, 'See this on your own numbers'), h('p', { class: 'rs-sub' }, 'A 30-minute call: we connect Wake to a week of your real data and walk you through what it finds.')),
        h('div', { class: 'fs2-nact' },
          onBook ? btn('Book a call', () => onBook(input.value.trim()), 'cb wake') : null,
          onEmail ? h('form', { class: 'fs2-form', onsubmit: saveEmail }, input, h('button', { class: 'cb ghost', type: 'submit' }, 'Send me the report')) : null,
          note));
    }
  }

  return { meeting, week, ending, setCleanup };
}
