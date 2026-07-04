# Raghavtracker — Integration Contract

Every module is built against this contract. The connections between
features flow through `Store` (shared state + domain logic) and a tiny
event bus. No module touches another module's DOM container.

## File assignments

| File | Owner | Job |
|------|-------|-----|
| `server.js` | server agent | Node-builtins-only HTTP server: static files + state API + atomic persistence + daily backups |
| `public/store.js` | core (pre-written) | Shared state, domain operations, event bus, date helpers, `esc()` |
| `public/app.js` | core (pre-written) | Boot, tab nav, task-detail drawer shell, toasts |
| `public/index.html` | core (pre-written) | Page skeleton with all containers |
| `public/base.css` | core (pre-written) | Design tokens, layout, shared components |
| `public/tasks.js` + `tasks.css` | tasks agent | Today view: add-task form, habit checklist, streaks |
| `public/calendar.js` + `calendar.css` | calendar agent | Month grid + day detail popover |
| `public/timer.js` + `timer.css` | timer agent | Stopwatch w/ presets bound to a task, session logging |
| `public/notes.js` + `notes.css` | notes agent | Task-detail drawer body: notes, sessions, streak, actions |

## Module lifecycle (all feature modules)

```js
document.addEventListener('DOMContentLoaded', () => {
  // build static skeleton inside YOUR container, attach delegated listeners
});
Store.on('change', () => {
  // re-render your dynamic content from Store state
});
```

`Store.load()` is called by app.js; the first `'change'` event fires after
state is loaded. Render defensively before that (empty state is fine).

## DOM containers (in index.html)

- `#view-today` — tasks agent only
- `#view-calendar` — calendar agent only
- `#timer-panel` — timer agent only (always visible, right sidebar)
- `#task-detail-body` — notes agent only (inside the drawer app.js opens)

## Events (via `Store.on` / `Store.emit`)

| Event | Payload | Meaning |
|-------|---------|---------|
| `change` | — | State changed (or first load); every module re-renders |
| `task:open` | `taskId` | Open the task-detail drawer (app.js shows it, notes.js fills it) |
| `timer:start` | `taskId` | Start the timer against this task (timer.js handles) |
| `error` | `message` | Persistence failure; app.js toasts it |

## Store API (public/store.js — already written, do not modify)

State shape (also the on-disk JSON):

```js
{
  version: 1,
  tasks: [{ id, name, type: 'daily'|'once', date: 'YYYY-MM-DD'|null,
            createdOn: 'YYYY-MM-DD', archivedOn: 'YYYY-MM-DD'|null }],
  completions: { 'YYYY-MM-DD': [taskId, ...] },
  sessions: [{ id, taskId, date, startedAt: ISO, seconds }],
  notes: [{ id, taskId, date, createdAt: ISO, text }],
  timer: null | { taskId, startedAt: ISO, presetSeconds: number|null }
}
```

Read helpers:
- `Store.state` — current state (read-only by convention)
- `Store.todayKey()`, `Store.dateKey(date)` — local-timezone `YYYY-MM-DD`
- `Store.taskById(id)`
- `Store.tasksForDate(dateKey)` — scheduled, unarchived tasks for that day
- `Store.activeTasks()` — all unarchived tasks (for pickers)
- `Store.isCompleted(taskId, dateKey)`
- `Store.dayStatus(dateKey)` → `{ total, done }`
- `Store.streak(taskId)` — consecutive completed days (daily tasks; today
  not yet done doesn't break it)
- `Store.sessionsForTask(taskId)`, `Store.sessionsForDate(dateKey)`
- `Store.totalSecondsForTask(taskId)`, `Store.totalSecondsForDate(dateKey)`
- `Store.notesForTask(taskId)`, `Store.notesForDate(dateKey)`
- `Store.fmtDuration(seconds)` → `"1h 05m"` / `"12m"` / `"45s"`

Mutations (each emits `'change'` and persists):
- `Store.addTask({ name, type, date })` → task
- `Store.archiveTask(id)` / `Store.unarchiveTask(id)`
- `Store.toggleCompletion(taskId, dateKey)`
- `Store.startTimer(taskId, presetSeconds|null)` — no-op w/ `error` emit if one runs
- `Store.stopTimer()` — logs the session, returns it
- `Store.addNote({ taskId, text })`
- `Store.deleteNote(id)`

Utility: `esc(text)` (global) — HTML-escape ALL user text before innerHTML.

## App helpers (app.js — already written)

- `App.toast(message)` — transient toast
- `App.showView('today'|'calendar')` — switch tabs
- Drawer: emit `'task:open'` with a taskId; app.js opens it and notes.js
  renders `#task-detail-body`. app.js closes on Esc / backdrop / `.js-close-drawer`.

## CSS rules

- Use tokens from base.css: `--bg --surface --ink --ink-soft --line
  --accent --accent-ink --good --warn --danger --radius --shadow`.
- Shared classes available: `.btn .btn-primary .btn-ghost .input .select
  .card .section-title .pill .muted .empty`.
- Prefix your own classes with your feature: `.tk-*` (tasks), `.cal-*`,
  `.tm-*` (timer), `.nt-*` (notes). Never style another feature's prefix
  or bare element selectors.

## Hard rules

1. Node built-ins / vanilla JS only. Zero dependencies anywhere.
2. Escape user text with `esc()` before inserting into HTML.
3. No placeholder screens, no TODO stubs — every control works.
4. Dates are LOCAL timezone via `Store.dateKey` — never `toISOString().slice`.
5. Modules communicate only through Store ops + events above.
