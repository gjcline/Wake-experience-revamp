# The Wake Experience

A playable business simulation that replaces the traditional product demo. The player runs one
Monday morning at a generated company on their own, then runs the same morning again with Wake,
then watches both meetings and both weeks play out side by side, and ends with a report.

One static page. Vanilla JavaScript (ES modules), bundled with esbuild. No backend, no framework.

## Getting started

    npm install
    npm test              # path and fairness tests (node --test)
    npm run build         # writes dist/index.html (web) and dist/artifact.html
    npx serve dist        # or open dist/index.html directly

Add `?seed=123` to the URL to replay the same company.

## Where things live

    src/content/   the company generator and all the words a player reads
                   scenario.js  one seed decides the company, its people, every figure and every problem
                   exec.js      the Round 2 executive library (statements, reports, scorecards)
                   shells.js, roles.js, business.js, rounds.js   vocabulary and fixed rules
    src/engine/    pure logic, no DOM: the game, Wake's analysis, the meeting director,
                   the week model, the final score and the report
    src/ui/        the screens: Round 1 and 2 desks, the meeting, the week, the final score,
                   the live guide (app.js), the title screen and the setup questions (scenes.js)
    src/ui/pixel/  the pixel office the walks happen in (office.js)
    src/ui/os/     the computer both desks run on: Sample ERP, an unbranded NetSuite-style ERP
                   (erp.js, erp.css; Wake is built into it in Round 2), and look-alike Gmail,
                   Google Calendar, Messages and Contacts
    src/ui/wakeworks.js  the ten seconds of Wake at work between the rounds
    src/ui/intro.js      plays the intro video (media/wake-intro.mp4, .webm fallback) full screen with
                         sound after the Start screen (scenes.js), then the title (?intro=0 skips both)
    src/dashboard.html  the team's runs dashboard, served at /dashboard
    api/           Vercel functions: /api/track (store a run), /api/runs (dashboard data), /api/cal (Cal.com bookings)
    test/          paths.test.mjs (run on every change) and audit.mjs (balance across thousands of games)
    dist/          built output, committed so the page can be opened or hosted without a build

ARCHITECTURE.md explains how the pieces fit, the balance rules, and what the sales team gets.

## Before you push

    npm test                     # must pass
    node test/audit.mjs 1500     # should list only the known edge cases, nothing new
    npm run build                # commit the rebuilt dist/

The audit plays random games and reports any game where the numbers stop telling one story
(for example, the player's own week going negative, or Wake not being ahead).

## Deploy

Vercel: `vercel.json` runs `npm run build`, serves `dist/` and the functions in `api/`. Pushing to
`main` deploys experience.wakepe.com. Environment variables: `BLOB_READ_WRITE_TOKEN`,
`DASHBOARD_KEY`, `WAKE_BOOK_URL`, and optionally `CAL_WEBHOOK_SECRET` (see ARCHITECTURE.md).
Any static host can serve `dist/index.html`; tracking needs the functions.

## Notes

- Everything a player sees is generated from a seed, so the data always agrees with itself.
  Avoid adding new random draws to the generator: use the hash helpers so existing seeds stay stable.
- Sound: the game is silent except for a soft alert when a message arrives (src/ui/arcade/sound.js).
- `window.WakeExperience.session()` returns the full event log and summary for each session.
