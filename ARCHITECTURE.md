# The Wake Experience: architecture

A two-round business simulation that replaces a product demo. Content is data. Engines are
pure JavaScript with no knowledge of the screen. The interface renders what engines return
and narrates the player through it with a live guide.

## The flow

Every step card between scenes carries a "How Wake does it" line: Wake reads everything before
anyone asks, and never waits for a prompt.

0. A Start screen: the Wake mark, "Welcome to the Wake Experience" and Start, all centered. Start plays the 15-second intro video (intro.js, media/)
   full screen with sound, then the title. Skip is always there; the title has
   "Watch the 15-second intro" to replay it. The video fades to dark into the title. The Wake
   mark is traced from media/wake-logo.png into a vector (os/icons.js) and used for every Wake
   app icon (black on a white tile).
1. Intro: a title screen over the pixel office, then three short questions, one per screen: the kind of business,
   your role, and your company (with a three-line "how it works"). No time estimates anywhere.
   Then the pixel office: the car pulls up and you walk to your desk.
2. Round 1, on your own. The pitch is not "replace your ERP": the company already runs on one,
   and all its data is in one place. The desk is a realistic computer whose main app is
   Sample ERP, an unbranded NetSuite-style ERP: a dashboard of portlets (reminders, saved
   searches, KPI meters, a 26-row KPI grid), a report center with every report (live ones among
   dozens of standard ones), location scorecards and a File Cabinet for notes. Everything is
   there and nothing explains itself. Gmail, Messages, Google Calendar and Google Contacts hold
   the inbox, texts, calendar and team. The
   clock runs 7:48 to 10:00 by itself (one minute every two seconds). Nothing costs time.
   The clock holds at 7:48 while the guide shows the player around and starts when the tour
   ends (or at the second finding). The guide walks the player from the dashboard into Reports and
   one report, then lets them pick their own first finding (nothing is filled in for them). After
   it, the guide closes the ERP for a short look at the rest of the desktop (Gmail, Calendar,
   Messages, Contacts) before the clock starts. Sample ERP is introduced on the arrival card as a
   stand-in for the ERP the business already runs on. The player flags 3 to 5 data points. Each finding is four short steps, each its own color:
   pick one of four reads (with the action beneath it), say it in their own words, name an
   owner, say how sure they are. Words and confidence are kept for the sales team.
3. Rewind to 7:48, then about ten seconds of Wake at work (wakeworks.js): the ERP's modules,
   the inbox, the calendar and texts connect, with the wider stack around them, and the counts
   fall from thousands of records to a handful of insights. Round 2: the same computer and the
   same Sample ERP, with Wake built into it. The dashboard gains a Wake portlet (ranked insights,
   assign in place) and a Wake column on every KPI (the insight it feeds, or why it needs
   nothing); a Wake tab holds every insight with its trace; Reports keeps every standard report,
   tagged with what Wake found, beside the statements current to the morning and the reports Wake
   prepared (briefs and the drafted Thursday brief). Gmail is labeled by insight, the calendar
   carries Wake's holds, and texts can be sent to Wake from Messages. Round 2 opens with a guided tour
   everybody goes through (forced guide steps block every other click): the Wake portlet and KPI
   column, the Wake tab, a trace, an assignment, the drafted brief and a statement in Reports. The
   clock holds until the tour's last step; the rest of the desktop was toured in Round 1. Wake reads every system, then hands over five ranked
   cards with cross-system evidence, an action, an owner and a check. The player reorders,
   assigns, and can put phone texts (not connected to Wake) through Wake to sharpen cards.
4. The meeting, twice, in person in the pixel conference room (no video call). Wake never
   speaks in the room: with Wake, you answer from the briefing you prepared. A full-screen agenda tees the meeting up first (what
   it is, why we demo it, your agenda, who is in the room, what to watch). Both meetings play
   through on their own (Fast forward and Skip are there; after each item's first exchange the
   rest is summed up in one line): on your own, you answer with what you
   brought (autoPick in engine/meeting.js: the evidence if you have it, your read if you have one,
   otherwise a follow-up). The room asks what any leadership team asks: what is driving it, what
   it is costing us, who owns it, how we will know. On your own, what you brought decides
   what you can answer; the rest becomes follow-ups in people's queues, and each item acts the
   day after its last follow-up lands. Without the evidence, each item also gets talked around
   (another theory, what done looks like, is it bigger, who signs off, what if we're wrong, the
   history, the data, "what are we doing?"): topics rotate through the meeting, every option set
   rotates its wording and its order, and most of these turns leave someone a follow-up. With Wake, the same questions are answered in the room.
   Then the result: two meeting timelines, the duel, and the work each meeting created.
4b. Or the call with your lender. In setup the player picks which 10:00 AM to play: the role's
   own meeting, or a call from the company's relationship manager at the bank ahead of the
   covenant check (world.moment 'lender'; the bank and banker come from the seed). The morning
   and both rounds are the same. What each item comes to is decided exactly as in the meeting
   (meeting.js runs underneath); engine/lender.js writes the call those outcomes make: the banker
   asks what a lender asks (is it real, one-time or ongoing, what does it do to margin), you
   answer with the numbers, on your read, or owe the bank a number, and the bank's read at the
   end. Three people on the line, shorter than a meeting. The call screens, the result ("Same
   bank. Two calls."), the scorecard row and the report read the call instead of the room.
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
                   lender.js        the call with your lender: the bank, the banker's questions, the call's
                                    script and clock, written from the meeting's outcomes
                   meeting.js       the meeting director: each item is a scene built from the problem, the people
                                    with a stake in it, what you brought and how the meeting has gone (trust,
                                    stakeholder pushback and their own fixes, connections, tangents, a time check,
                                    people stepping out, the rushed close). A generator: answers replay exactly.
                   finale.js        follow-up queues, Wake's meeting, the
                                    afternoon after, the week model (per-problem measure, weekly value from the
                                    company's own numbers, what happens when nobody is assigned), the score
                   recap.js         the verdict, the moment, and the one-page report (screen + download)
    src/ui/        os/              the computer both desks run on: shell.js (menu bar, dock, browser window,
                                    notifications, the game strip), erp.js and erp.css (Sample ERP: the frame,
                                    portlets, report center, File Cabinet, and the dashboard both rounds share),
                                    apps.js (Gmail, Google Calendar, Messages, Contacts, data tables), icons.js, os.css
                   round1.js        the desk: Sample ERP (dashboard, reports, scorecards, File Cabinet), Gmail,
                                    Messages, Calendar, Contacts, connected data,
                                    the composer, attaching context, the guide steps
                   round2.js        the Wake desk: Sample ERP with Wake built in (Wake portlet and KPI column, the
                                    Wake tab with 5 to 8 insights, pick 3 to 5, the trace drawer back to the Round 1
                                    originals, statements and Wake reports in Reports), Gmail labeled by insight, Messages with
                                    send to Wake, Wake's calendar holds, Contacts with assignments, the guided tour
                   wakeworks.js     the ten seconds of Wake at work between the rounds
                   finale.js        the meeting in person in the pixel conference room (questions, answers,
                                    follow-ups), the meeting prepared with Wake,
                                    the result, the week as a dashboard with two Slack channels, the final score and the report
                   app.js           the Round 1 complete screen, the reset, Wake reading the morning, the walks,
                                    plus the live guide: chapters per place. Leave a step and it pauses; enter
                                    a place with its own chapter and that plays; return and the first resumes.
                                    Modal steps (the Round 2 suite tour) hold the desk until NEXT.
                   scenes.js        the title screen, the three setup questions (business, role, your company
                                    and mode), and the office scenes. Every step opens with one
                                    card: "what you're doing", "why it matters", one button.
                   pixel/office.js  the building in three-quarter top-down pixel art: street, lobby, operations
                                    floor, hallway, meeting room, break room, your office. People walk fixed
                                    routes (arrival, to the meeting, back); Friday is the same map after dark.
                   scenes.css       styles for the title screen, the setup questions, the office scenes and the step card
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
player is active, and when the tab is hidden: business, role, company, furthest step,
active seconds, finished, name / email / phone (all required when they hit Play; remembered on that
browser), whether they already have a meeting (the last question on the final score), whether
they opened the booking page, UTM source,
referrer, device and country, plus the headline result. Each run is one private JSON file in
Vercel Blob (`runs/<id>.json`).

- `api/track.js` stores a run. `api/runs.js` returns all runs and bookings for the dashboard.
- `api/cal.js` is the Cal.com webhook. Answering "No" to "Do you already have a meeting
  scheduled?" opens `WAKE_BOOK_URL` (https://cal.com/bliztic/wake by default) in a new tab with
  `metadata[runId]=<run id>`, name and email filled in, so each booking lands next to its run.
- `/dashboard` (src/dashboard.html) is the team's view: visits, played, finished, median time,
  sign-ups (name, email, phone), meeting answers, bookings, how far people get, quick vs full, every run, CSV export.

Vercel environment variables: `BLOB_READ_WRITE_TOKEN` (the store), `DASHBOARD_KEY` (opens the
dashboard), `WAKE_BOOK_URL` (the booking page; defaults to https://cal.com/bliztic/wake),
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

## Tuning the money

engine/finale.js holds the three dials. REALIZE (0.5): a fix started this week wins back only part
of a problem's weekly cost before Friday, and of its yearly value in the run-rate, on both sides.
WAKE_DONE / WAKE_ALERT (0.95 / 0.55): how far Wake carries a problem you handed off, and one it only
flagged; Wake never does less than your own plan for the same problem. NEW_RATE (0.08): new
problems found per week over the quarter. With these, `node test/audit.mjs 1500` prints the gaps:
the week gap is typically a few thousand dollars (90th percentile about $10k), and Wake usually
resolves four of five problems. The problem sizes themselves come from the company's own reported
numbers and are left alone so the reports, the meeting and the week agree.

