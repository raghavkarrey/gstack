# Raghavtracker — Spec v1 (signed off 2026-07-04)

**What it is:** A fully-local personal tracker. One app, four features, wired
together: daily tasks checked off like a habit tracker, a calendar showing
history, a timer that runs against a task, and notes that link to tasks.
No accounts, no network calls, no external servers. Single user: Raghav.

**Stack (built to last):** Zero-dependency Node.js — one `server.js` using
only Node built-ins, serving a vanilla HTML/CSS/JS single-page frontend.
Start with `node server.js`, open `http://localhost:7777`. No npm install,
ever.

**Data:** One pretty-printed, human-readable JSON file at
`data/raghavtracker.json`. Atomic writes (temp file + rename) plus a rolling
copy in `data/backups/` on each day's first write. Backup = copy one folder.

## Features

1. **Tasks** — add a task with a name; *daily* tasks repeat every day,
   *one-off* tasks live on a single date; archive when done forever.
   (Sign-off decision: support BOTH daily and one-off.)
2. **Habit tracker (Today view)** — today's checklist; tap to complete or
   uncomplete for that day; per-task current streak.
3. **Calendar** — month grid; each day shows its tasks and completion state
   (done / missed / pending), time logged, and note markers.
4. **Timer** — count-up stopwatch attached to a task, with optional presets
   (15/25/50 min) that alert when time is up; stopping logs a session.
   (Sign-off decision: stopwatch + presets.)
5. **Notes** — freeform text notes, each linked to a task, timestamped to
   the day written.

## Connections (the product)

- **Task → Calendar:** every task appears on every day it's scheduled;
  checking off in Today updates the calendar instantly; past days can be
  checked from the calendar's day view too.
- **Timer → Task → Calendar:** timer must be attached to a task; sessions
  show as focus time on the task, in Today, and on that calendar day.
- **Note → Task → Calendar:** notes attach to a task; the task detail shows
  its notes; the calendar day shows a note marker.
- **Completions → Streaks:** streaks compute from the same per-day
  completion records the calendar reads. One source of truth.

## Acceptance (verified in one run)

Open app → add real task → see it on the calendar → start timer against it →
attach a note → zero errors, zero placeholders → restart server → data intact.
