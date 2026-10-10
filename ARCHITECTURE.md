# The Wake Experience: architecture

A two-round business simulation that replaces a product demo. Content is data. Engines are
pure JavaScript with no knowledge of the screen. The interface renders what engines return
and narrates the player through it with a live guide.

## The flow

1. Arcade front end: attract screen, coin, how to play, choose business and role, countdown,
   bird's-eye arrival at the office.
2. Round 1, on your own. The desk holds every report, email, text and location file. The
   clock runs 7:48 to 10:00 by itself (one minute every two seconds). Nothing costs time.
   The player flags 3 to 5 data points and writes the action for the team, with an optional
   owner, then locks in a briefing.
3. Rewind to 7:48. Round 2, with Wake. Wake reads every system, then hands over five ranked
   cards with cross-system evidence, an action, an owner and a check. The player reorders,
   assigns, and can put phone texts (not connected to Wake) through Wake to sharpen cards.
4. The meeting, twice. The room asks what any leadership team asks: what is driving it, what
   it is costing us, who owns it, how we will know. On your own, what you brought decides
   what you can answer; the rest becomes follow-ups in people's queues, and each item acts the
   day after its last follow-up lands. With Wake, the same questions are answered in the room.
   Then the result: two meeting timelines, the duel, and the work each meeting created.
5. The week. Walk back. Both plans run Monday afternoon to Friday on the city map, with a
   six-measure scoreboard (profit impact, run-rate added, problems resolved, time to action,
   team hours, open follow-ups) and each problem's own measure.
6. Friday evening, then the final score (nine measures), thirteen weeks at this pace, one
   moment taken from the player's own morning, and a dark one-page after-action report.

## Layout

    src/content/   shells.js    five operating shells (vocabulary and context only)
                   roles.js     five roles (perspective, emphasis, the note on the desk)
                   scenario.js  the company generator. One seed decides the size (1 to 7 locations), names,
                                people and what they own, the date, every figure, and where each problem
                                lands. It builds the reports (as tables), scorecards, inbox, phone, calendar,
                                notes, team, arrivals, Wake's findings and briefing, the common answers,
                                the room's reactions and the week. Problems claim metrics at a location;
                                core claims never collide and optional ones give way, so every number has
                                exactly one story. ?seed=123 in the URL replays a company.
                   business.js  fixed constants: the shape of the morning, the concept map
                   rounds.js    fixed rules: action intents and how each kind of action lands
    src/engine/    config.js        content + shell + role -> one resolved world
                   signals.js       deviation, direction, the signal graph, related sources
                   events.js        timed and attention-triggered arrivals (texts, emails)
                   behavior.js      the event log
                   intelligence.js  Wake's pass over the same signal set: gather, detect, connect, filter, rank
                   judge.js         reads a finding: the picked answer (fixed intent), any words written,
                                    the owner and attached context -> handling, reactions, status
                   game.js          the Simulation Engine: rounds, clock, flags, briefing
                   meeting.js       the meeting director: each item is a scene built from the problem, the people
                                    with a stake in it, what you brought and how the meeting has gone (trust,
                                    stakeholder pushback and their own fixes, connections, tangents, a time check,
                                    people stepping out, the rushed close). A generator: answers replay exactly.
                   finale.js        follow-up queues, Wake's meeting, the
                                    afternoon after, the week model (per-problem measure, weekly value from the
                                    company's own numbers, what happens when nobody is assigned), the score
                   recap.js         the verdict, the moment, and the one-page report (screen + download)
    src/ui/        round1.js        the desk: reports, location map and scorecards, inbox, phone, calendar,
                                    notes, team, connected data, the composer, attaching context, the guide steps
                   round2.js        the Wake desk: the load-in, insights on the computer (5 to 8, pick 3 to 5),
                                    source trace pop-ups back to the Round 1 originals, exec briefs, the drafted
                                    Thursday brief, inbox tagged by insight, phone with send to Wake, the annotated
                                    calendar, team assignments, and the guided tour
                   finale.js        the meeting room (questions, answers, follow-ups), Wake's meeting, the result,
                                    the week as a two-player match on the city map, the final score and the report
                   app.js           the Round 1 complete screen, the reset, Wake reading the morning, the walks,
                                    plus the live guide
                   arcade/          attract screen, coin, setup, map and walking avatar, pixel desk, sound
    test/          paths.test.mjs   paths A to J, all 25 shell and role combinations, fairness checks
                   audit.mjs        thousands of random games: flags the moment any number stops telling one story

## How a written action is judged

The player's text is never interpreted freely. `judge.js` maps it onto fixed intents (cut,
hire, schedule, investigate, replace, repair, route, dispute, raise price, follow up, promo
more or less, posting, pay, support, recognize, freeze, customer). Each Wake finding has an
ordered rule: aligned intents, counter intents, partial intents. A counter move phrased as
an investigation gets the benefit of the doubt. Flags on false alarms are "checked" or
"reacted". Flags on noise are noise. No owner and very short actions draw questions in the
room. Every outcome, reaction and week line is predetermined content.

## Fairness rules the tests enforce

- Every piece of evidence on every Wake card was on the desk at 7:48 AM.
- Wake's briefing is identical whatever the player does.
- Every false alarm has an explanation the player could have found.
- The clock never passes 10:00, opening things never costs time, flags are capped at 5.
- No tokens, internal labels or em dashes reach the screen or the report.

## What the sales team gets

`window.WakeExperience.session()` returns the full event log and a summary: sources opened,
categories looked at, each flag with its text, owner, target, whether it was the obvious or
the quiet signal, how it landed, which real issues were found, false alarms flagged, Round 1
time, texts put through Wake, and reorders. Set `window.WAKE_CONFIG.logEndpoint` in
`build.mjs` to receive it as a JSON POST when a session finishes.

## Not built yet

Server-side collection of sessions. Emailing the report as an attachment. Editorial tuning of
the four non-reference shells. Sound beyond simple effects.
