# Raghavtracker

Your personal daily tracker. Fully local, no accounts, no network, no
dependencies — built to keep running long after anyone stops maintaining it.

## Run it

```bash
node server.js
```

Open http://localhost:7777. That's the whole setup. Requires Node 18+ and
nothing else — no `npm install`, ever.

To have it always running on your machine, add it to your login items /
crontab / systemd user service, e.g.:

```bash
# crontab -e
@reboot cd /path/to/raghavtracker && node server.js >> tracker.log 2>&1
```

## What it does

- **Today** — your daily checklist. Add tasks that repeat every day (habits)
  or one-time tasks on a date. Check them off; streaks build automatically.
- **Calendar** — month view of your history: done/missed per day, focus time
  logged, note markers. Click any day to see (and fix) it — past days can be
  checked off too.
- **Timer** — count-up stopwatch attached to a task, with 15/25/50-minute
  presets that alert when time is up. Every session is logged to the task
  and the day. Survives a page reload mid-session.
- **Notes** — write notes on any task from its detail drawer (click a task
  name anywhere). Notes show up on the calendar day they were written.

Everything is connected: tasks feed the calendar, the timer feeds tasks and
days, notes link tasks to days, and streaks are computed from the same
records the calendar shows. One source of truth (`public/store.js`).

## Your data

Everything lives in **one human-readable file**: `data/raghavtracker.json`
(pretty-printed JSON). Back it up by copying the `data/` folder — that's it.

- Writes are atomic (temp file + rename), so a crash can't corrupt it.
- The first save of each day snapshots the previous state to
  `data/backups/raghavtracker-YYYY-MM-DD.json` (last 30 kept).
- If the file is ever unreadable, the server moves it aside as
  `raghavtracker.corrupt-<timestamp>.json` instead of overwriting it.

## Layout

```
raghavtracker/
├── server.js        # zero-dependency Node server (static files + state API)
├── public/          # the app: vanilla HTML/CSS/JS
│   ├── store.js     # shared state + all domain logic (the connections)
│   ├── app.js       # shell: tabs, drawer, toasts
│   └── tasks/calendar/timer/notes .js + .css  # one module per feature
├── data/            # YOUR data (gitignored): raghavtracker.json + backups/
├── SPEC.md          # the signed-off one-page spec
└── CONTRACT.md      # module contract the app is built against
```

Change the port with `PORT=8888 node server.js`. The server binds
127.0.0.1 only — nothing is ever reachable from outside your machine.
