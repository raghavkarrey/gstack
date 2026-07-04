/* Raghavtracker — shared state, domain logic, and event bus.
 * Every feature reads and mutates data through this module, so the
 * connections (task↔calendar↔timer↔notes) have one source of truth. */
'use strict';

function esc(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const Store = (() => {
  const listeners = new Map();

  let state = defaultState();

  function defaultState() {
    return {
      version: 1,
      tasks: [],
      completions: {},
      sessions: [],
      notes: [],
      timer: null,
    };
  }

  /* ---------- event bus ---------- */

  function on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push(fn);
  }

  function emit(event, payload) {
    for (const fn of listeners.get(event) ?? []) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`listener for "${event}" failed:`, err);
      }
    }
  }

  /* ---------- dates (always local timezone) ---------- */

  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function fmtDuration(seconds) {
    seconds = Math.max(0, Math.round(seconds));
    if (seconds < 60) return `${seconds}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${String(m).padStart(2, '0')}m`;
  }

  function uid() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /* ---------- persistence ---------- */

  async function load() {
    const res = await fetch('/api/state');
    if (!res.ok) throw new Error(`GET /api/state failed: ${res.status}`);
    const loaded = await res.json();
    state = { ...defaultState(), ...loaded };
    emit('change');
  }

  let saveChain = Promise.resolve();

  function save() {
    // Serialize writes so rapid mutations can't interleave on the wire.
    saveChain = saveChain.then(async () => {
      try {
        const res = await fetch('/api/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state),
        });
        if (!res.ok) throw new Error(`save failed: HTTP ${res.status}`);
      } catch (err) {
        console.error(err);
        emit('error', 'Could not save — is the server running?');
      }
    });
    return saveChain;
  }

  function mutate() {
    emit('change');
    return save();
  }

  /* ---------- tasks ---------- */

  function taskById(id) {
    return state.tasks.find((t) => t.id === id) ?? null;
  }

  function activeTasks() {
    return state.tasks.filter((t) => !t.archivedOn);
  }

  function scheduledOn(task, key) {
    if (task.archivedOn && task.archivedOn <= key) return false;
    if (task.type === 'once') return task.date === key;
    return task.createdOn <= key; // daily
  }

  function tasksForDate(key) {
    return state.tasks
      .filter((t) => scheduledOn(t, key))
      .sort((a, b) =>
        a.type === b.type
          ? a.createdOn.localeCompare(b.createdOn) || a.name.localeCompare(b.name)
          : a.type === 'daily' ? -1 : 1
      );
  }

  function addTask({ name, type, date }) {
    name = String(name ?? '').trim();
    if (!name) return null;
    const task = {
      id: uid(),
      name,
      type: type === 'once' ? 'once' : 'daily',
      date: type === 'once' ? date || todayKey() : null,
      createdOn: todayKey(),
      archivedOn: null,
    };
    state.tasks.push(task);
    mutate();
    return task;
  }

  function archiveTask(id) {
    const t = taskById(id);
    if (!t) return;
    t.archivedOn = todayKey();
    if (state.timer && state.timer.taskId === id) stopTimer();
    mutate();
  }

  function unarchiveTask(id) {
    const t = taskById(id);
    if (!t) return;
    t.archivedOn = null;
    mutate();
  }

  /* ---------- completions ---------- */

  function isCompleted(taskId, key) {
    return (state.completions[key] ?? []).includes(taskId);
  }

  function toggleCompletion(taskId, key) {
    const list = state.completions[key] ?? (state.completions[key] = []);
    const i = list.indexOf(taskId);
    if (i >= 0) list.splice(i, 1);
    else list.push(taskId);
    if (list.length === 0) delete state.completions[key];
    mutate();
  }

  function dayStatus(key) {
    const tasks = tasksForDate(key);
    const done = tasks.filter((t) => isCompleted(t.id, key)).length;
    return { total: tasks.length, done };
  }

  function streak(taskId) {
    const task = taskById(taskId);
    if (!task || task.type !== 'daily') {
      return task && task.type === 'once' && isCompleted(taskId, task.date) ? 1 : 0;
    }
    const d = new Date();
    // Today not done yet shouldn't break a streak — start from yesterday then.
    if (!isCompleted(taskId, dateKey(d))) d.setDate(d.getDate() - 1);
    let count = 0;
    while (true) {
      const key = dateKey(d);
      if (!scheduledOn(task, key) || !isCompleted(taskId, key)) break;
      count += 1;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }

  /* ---------- timer & sessions ---------- */

  function startTimer(taskId, presetSeconds = null) {
    if (state.timer) {
      emit('error', 'A timer is already running — stop it first.');
      return null;
    }
    if (!taskById(taskId)) {
      emit('error', 'Pick a task to time.');
      return null;
    }
    state.timer = {
      taskId,
      startedAt: new Date().toISOString(),
      presetSeconds: presetSeconds || null,
    };
    mutate();
    return state.timer;
  }

  function stopTimer() {
    if (!state.timer) return null;
    const { taskId, startedAt } = state.timer;
    const seconds = Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
    const session = {
      id: uid(),
      taskId,
      date: todayKey(),
      startedAt,
      seconds,
    };
    state.sessions.push(session);
    state.timer = null;
    mutate();
    return session;
  }

  function sessionsForTask(taskId) {
    return state.sessions.filter((s) => s.taskId === taskId);
  }

  function sessionsForDate(key) {
    return state.sessions.filter((s) => s.date === key);
  }

  function totalSecondsForTask(taskId) {
    return sessionsForTask(taskId).reduce((sum, s) => sum + s.seconds, 0);
  }

  function totalSecondsForDate(key) {
    return sessionsForDate(key).reduce((sum, s) => sum + s.seconds, 0);
  }

  /* ---------- notes ---------- */

  function addNote({ taskId, text }) {
    text = String(text ?? '').trim();
    if (!text || !taskById(taskId)) return null;
    const note = {
      id: uid(),
      taskId,
      date: todayKey(),
      createdAt: new Date().toISOString(),
      text,
    };
    state.notes.push(note);
    mutate();
    return note;
  }

  function deleteNote(id) {
    const i = state.notes.findIndex((n) => n.id === id);
    if (i >= 0) {
      state.notes.splice(i, 1);
      mutate();
    }
  }

  function notesForTask(taskId) {
    return state.notes
      .filter((n) => n.taskId === taskId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function notesForDate(key) {
    return state.notes.filter((n) => n.date === key);
  }

  return {
    get state() { return state; },
    on, emit, load, save,
    dateKey, todayKey, fmtDuration, uid,
    taskById, activeTasks, tasksForDate, addTask, archiveTask, unarchiveTask,
    isCompleted, toggleCompletion, dayStatus, streak,
    startTimer, stopTimer, sessionsForTask, sessionsForDate,
    totalSecondsForTask, totalSecondsForDate,
    addNote, deleteNote, notesForTask, notesForDate,
  };
})();
