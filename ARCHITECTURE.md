# The Wake Experience: architecture

A two-round business simulation that replaces a product demo. Content is data. Engines are
pure JavaScript with no knowledge of the screen. The interface renders what engines return
and narrates the player through it with a live guide.

## The flow

1. Intro: the arcade cabinet, then a stage select (the business) and a character select (the
   role), then Player 1 ready with the company and the mode: Quick run (about 5 minutes) or
   Full picture (about 15). Then the pixel office: the car pulls up and you walk to your desk.
   Quick mode plays Round 1 and your own meeting for you the way most owners do it
   (game.autopilotRound1 and autopilotMeeting: the loudest numbers, the first read, no owners),
   shows that baseline, and goes straight to Round 2. Everything after compares the two as usual.
2. Round 1, on your own. The desk is a realistic computer: a menu bar, a dock and a browser
   window holding the apps a team actually uses. QuickBooks has the finance reports (weekly flash,
   labor, purchasing); Google Drive has the exports from every other system as Sheets, the location
   scorecards (one tab per location) and the notes as Docs; Gmail, Messages, Google Calendar and
   Google Contacts hold the inbox, texts, calendar and team. The
   clock runs 7:48 to 10:00 by itself (one minute every two seconds). Nothing costs time.
   The player flags 3 to 5 data points. Each finding is four short steps, each its own color:
   pick one of four reads (with the action beneath it), say it in their own words, name an
   owner, say how sure they are. Words and confidence are kept for the sales team.
3. Rewind to 7:48. Round 2, with Wake. Same computer, with Wake added to the dock. Gmail is
   labeled by insight, QuickBooks carries statements current to the morning, Drive carries the
   executive briefs and the drafted Thursday brief, the calendar carries Wake's holds, and texts
   can be sent to Wake from Messages. Wake reads every system, then hands over five ranked
   cards with cross-system evidence, an action, an owner and a check. The player reorders,
   assigns, and can put phone texts (not connected to Wake) through Wake to sharpen cards.
4. The meeting, twice. The room asks what any leadership team asks: what is driving it, what
   it is costing us, who owns it, how we will know. On your own, what you brought decides
   what you can answer; the rest becomes follow-ups in people's queues, and each item acts the
   day after its last follow-up lands. Without the evidence, each item also gets talked around
   (another theory, what done looks like, is it bigger, who signs off, what if we're wrong, the
   history, the data, "what are we doing?"): topics rotate through the meeting, every option set
   rotates its wording and its order, and most of these turns leave someone a follow-up. With Wake, the same questions are answered in the room.
   Then the result: two meeting timelines, the duel, and the work each meeting created.
5. The week. Both plans run Monday afternoon to Friday on a dashboard, each with its own Slack
   channel of daily updates, and a
   six-measure scoreboard (profit impact, run-rate added, problems resolved, time to action,
   team hours, open follow-ups) and each problem's own measure. On your own, the team on site
   handles the most visible problem by itself and every day logs something, so a decent week
   resolves one or two. With Wake, owners act with the numbers attached and everything is
   resolved by Tuesday or Wednesday.
6. Friday evening, then the final score: your week rated ("a solid week", "a good week") next
   to the week with Wake ("a terrific week"), your numbers as the base bar with Wake's extra on
   top, nine measures with an "ahead by" column (no points, no winner), thirteen weeks at this
   pace, one moment taken from the player's own morning, and a dark one-page report.

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
                   exec.js      the executive library for Round 2: income statement, cash flow, balance
                                sheet, quarterly earnings, location trends, labor report, manager
                                scorecards, expansion outlook. Every figure ties to the company's weekly
                                revenue, labor, materials and cash.
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
    src/ui/        os/              the computer both desks run on: shell.js (menu bar, dock, browser window,
                                    notifications, the game strip), apps.js (Gmail, QuickBooks, Drive, Sheets,
                                    Docs, Google Calendar, Messages, Contacts as plain builders), icons.js, os.css
                   round1.js        the desk: reports in QuickBooks and Sheets, scorecards as a Sheet with a tab per
                                    location, Gmail, Messages, Calendar, notes as Docs, Contacts, connected data,
                                    the composer, attaching context, the guide steps
                   round2.js        the Wake desk: Wake connecting, the Wake app (5 to 8 insights, pick 3 to 5),
                                    the trace drawer back to the Round 1 originals, statements in QuickBooks, briefs
                                    and the drafted Thursday brief in Drive, Gmail labeled by insight, Messages with
                                    send to Wake, Wake's calendar holds, Contacts with assignments, the guided tour
                   finale.js        the meeting as a Google Meet call (questions, answers, follow-ups), Wake's meeting,
                                    the result, the week as a dashboard with two Slack channels, the final score and the report
                   app.js           the Round 1 complete screen, the reset, Wake reading the morning, the walks,
                                    plus the live guide: chapters per place. Leave a step and it pauses; enter
                                    a place with its own chapter and that plays; return and the first resumes.
                                    Modal steps (the Round 2 suite tour) hold the desk until NEXT.
                   scenes.js        the arcade home, the stage select (business) and character select (role) with
                                    stat bars, Player 1 ready, and the office scenes. Every step opens with one
                                    card: "what you're doing", "why it matters", one button.
                   pixel/office.js  the building in three-quarter top-down pixel art: street, lobby, operations
                                    floor, hallway, meeting room, break room, your office. People walk fixed
                                    routes (arrival, to the meeting, back); Friday is the same map after dark.
                   pixel/sprites.js storefronts for the stage select and stand-in role portraits, used until
                                    art/roles/<gm|coo|owner|partner|regional>.webp exist
                   scenes.css       styles for the arcade, the select screens, the office scenes and the step card
                   clean.css        styles for every screen outside the two desks
                   arcade/sound.js  sound
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
- On your own is a thriving business having a steady week, never a losing one: the people on
  site handle part of every problem they can see, the team fully fixes the costliest visible
  problem the room didn't redirect, a move against the grain costs ground on that problem but
  never more than the team makes back, and the owner works from meeting notes (85% precision).
  The audit checks that the week, run-rate and quarter are always positive on your own, that
  Wake is always ahead, and how far: on your own lands around a third of the week with Wake for
  a typical player and about half for a sharp one.

## Tracking and the runs dashboard

Every visit is a run (src/ui/track.js). The page sends the run to `/api/track` at each step
(home, select, ready, arrive, round1, round2, meeting, week, score), every 30 seconds while the
player is active, and when the tab is hidden: mode, business, role, company, furthest step,
active seconds, finished, email (if given on the final score), Book a call clicked, UTM source,
referrer, device and country, plus the headline result. Each run is one private JSON file in
Vercel Blob (`runs/<id>.json`).

- `api/track.js` stores a run. `api/runs.js` returns all runs and bookings for the dashboard.
- `api/cal.js` is the Cal.com webhook: Book a call opens `WAKE_BOOK_URL` with
  `metadata[runId]=<run id>` (and the email if given), so each booking lands next to its run.
- `/dashboard` (src/dashboard.html) is the team's view: visits, played, finished, median time,
  emails, bookings, how far people get, quick vs full, every run, CSV export.

Vercel environment variables: `BLOB_READ_WRITE_TOKEN` (the store), `DASHBOARD_KEY` (opens the
dashboard), `WAKE_BOOK_URL` (the booking page; the button is hidden until it is set),
`CAL_WEBHOOK_SECRET` (optional, checks the Cal.com signature). Tracking is off when opened
from a file or as an artifact, or when `WAKE_CONFIG.track` is false.

## What the sales team gets

`window.WakeExperience.session()` returns the full event log and a summary: sources opened,
categories looked at, each flag with its text, owner, target, whether it was the obvious or
the quiet signal, how it landed, which real issues were found, false alarms flagged, Round 1
time, texts put through Wake, and reorders. Set `window.WAKE_CONFIG.logEndpoint` in
`build.mjs` to receive it as a JSON POST when a session finishes.

## Not built yet

Emailing the report as an attachment. Editorial tuning of
the four non-reference shells. Sound beyond simple effects.
