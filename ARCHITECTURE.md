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
4. The meeting. Walk to the meeting room. Present your briefing: the room reacts to exactly
   what you wrote. Present Wake's: every item lands on an owner. Then see who left with what.
5. The week. Walk back. Both plans run side by side through Friday, one line per issue.
6. The ending. Three honest comparisons, one moment taken from the player's own morning,
   and a one-page report.

## Layout

    src/content/   shells.js    five operating shells (vocabulary and context only)
                   roles.js     five roles (perspective, emphasis, the note on the desk)
                   business.js  the company: locations, characters, 104 signals, sources, events, findings
                   rounds.js    the head-to-head: obvious and quiet signals, Wake's briefing cards,
                                phone texts and what they sharpen, action intents, how each kind of
                                action lands, the room's reactions, the week in two lanes
    src/engine/    config.js        content + shell + role -> one resolved world
                   signals.js       deviation, direction, the signal graph, related sources
                   events.js        timed and attention-triggered arrivals (texts, emails)
                   behavior.js      the event log
                   intelligence.js  Wake's pass over the same signal set: gather, detect, connect, filter, rank
                   judge.js         reads a flag + the player's words: target, intent, handling, reactions, status
                   game.js          the Simulation Engine: rounds, clock, flags, briefing, delivery, week
                   recap.js         the ending and the report
    src/ui/        app.js           every screen after the arrival, plus the live guide
                   arcade/          attract screen, coin, setup, map and walking avatar, pixel desk, sound
    test/          paths.test.mjs   paths A to J, all 25 shell and role combinations, fairness checks

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
