/* Raghavtracker — timer panel: count-up stopwatch bound to a task, with
 * optional presets. Running state lives in Store.state.timer (single source
 * of truth), so a page reload resumes the running timer correctly. */
'use strict';

(() => {
  const PRESETS = [
    { label: '15m', seconds: 900 },
    { label: '25m', seconds: 1500 },
    { label: '50m', seconds: 3000 },
    { label: 'Free', seconds: null },
  ];

  let panel = null;
  let tickInterval = null;
  let selectedTaskId = '';     // survives re-renders
  let selectedPreset = null;   // seconds | null (null = Free, the default)
  let beepedFor = null;        // startedAt ISO of the run we already beeped for
  let titleAltered = false;

  /* ---------- helpers ---------- */

  function fmtClock(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(sec).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  function elapsedSeconds(timer) {
    return Math.max(0, Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000));
  }

  function restoreTitle() {
    if (titleAltered) {
      document.title = 'Raghavtracker';
      titleAltered = false;
    }
  }

  function beep() {
    // Some browsers block audio without a user gesture — that's fine,
    // the visual overtime state is primary.
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
      osc.onended = () => { ctx.close().catch(() => {}); };
    } catch (err) {
      // Audio unavailable/blocked — ignore.
    }
  }

  /* ---------- markup builders ---------- */

  function idleHtml() {
    const tasks = Store.activeTasks();
    let body;
    if (tasks.length === 0) {
      body = '<div class="empty">Add a task first — the timer attaches to a task.</div>';
    } else {
      const options = ['<option value="">Pick a task…</option>']
        .concat(tasks.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`))
        .join('');
      const presets = PRESETS.map((p) =>
        `<button type="button" class="tm-preset${p.seconds === selectedPreset ? ' is-on' : ''}"
           data-seconds="${p.seconds ?? ''}" aria-pressed="${p.seconds === selectedPreset}">${p.label}</button>`
      ).join('');
      body = `
        <select class="select tm-select" aria-label="Task to time">${options}</select>
        <div class="tm-presets" role="group" aria-label="Preset length">${presets}</div>
        <button type="button" class="btn btn-primary tm-start" disabled>Start</button>`;
    }
    return `<h2 class="section-title">Timer</h2><div class="tm-idle">${body}</div>${todayHtml()}`;
  }

  function runningHtml(timer) {
    const task = Store.taskById(timer.taskId);
    // Defensive: Store.archiveTask stops the timer, but if the referenced
    // task is gone or archived anyway, keep the panel working.
    const name = task && !task.archivedOn ? task.name : '(archived task)';
    const preset = timer.presetSeconds;
    const presetBits = preset
      ? `<div class="tm-preset-note muted">of ${esc(Store.fmtDuration(preset))}</div>
         <div class="tm-bar"><div class="tm-bar-fill" style="width:0%"></div></div>`
      : '';
    return `<h2 class="section-title">Timer</h2>
      <div class="tm-running">
        <button type="button" class="tm-task-name" data-task-id="${esc(timer.taskId)}" title="Open task">${esc(name)}</button>
        <div class="tm-readout">${fmtClock(elapsedSeconds(timer))}</div>
        ${presetBits}
        <button type="button" class="btn btn-primary tm-stop">Stop</button>
      </div>${todayHtml()}`;
  }

  function todayHtml() {
    const key = Store.todayKey();
    const total = Store.totalSecondsForDate(key);
    const sessions = Store.sessionsForDate(key)
      .slice()
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, 3);
    let inner;
    if (sessions.length === 0) {
      inner = '<div class="tm-today-empty muted">No focus time yet today.</div>';
    } else {
      const rows = sessions.map((s) => {
        const task = Store.taskById(s.taskId);
        const name = task ? task.name : '(archived task)';
        return `<li class="tm-session">
          <span class="tm-session-name">${esc(name)}</span>
          <span class="tm-session-dur">${esc(Store.fmtDuration(s.seconds))}</span>
        </li>`;
      }).join('');
      inner = `<div class="tm-today-total">
          <span class="muted">Focus today</span>
          <strong>${esc(Store.fmtDuration(total))}</strong>
        </div>
        <ul class="tm-sessions">${rows}</ul>`;
    }
    return `<div class="tm-today"><h3 class="section-title">Today</h3>${inner}</div>`;
  }

  /* ---------- tick (updates readout/progress only — no re-render) ---------- */

  function tick() {
    const timer = Store.state.timer;
    if (!timer || !panel) return;
    const elapsed = elapsedSeconds(timer);
    const readout = panel.querySelector('.tm-readout');
    if (readout) readout.textContent = fmtClock(elapsed);
    if (timer.presetSeconds) {
      const fill = panel.querySelector('.tm-bar-fill');
      if (fill) fill.style.width = `${Math.min(100, (elapsed / timer.presetSeconds) * 100)}%`;
      if (elapsed >= timer.presetSeconds) {
        const running = panel.querySelector('.tm-running');
        if (running) running.classList.add('tm-over');
        if (!titleAltered) {
          document.title = "⏰ Time's up — Raghavtracker";
          titleAltered = true;
        }
        if (beepedFor !== timer.startedAt) {
          beepedFor = timer.startedAt;
          beep();
        }
      }
    }
  }

  /* ---------- render (full rebuild, on 'change' only) ---------- */

  function render() {
    if (!panel) return;
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
    const timer = Store.state.timer;
    panel.classList.toggle('tm-live', !!timer);
    panel.innerHTML = timer ? runningHtml(timer) : idleHtml();
    if (timer) {
      tickInterval = setInterval(tick, 1000);
      tick(); // paint immediately (also re-applies overtime state after re-render)
    } else {
      restoreTitle();
      const select = panel.querySelector('.tm-select');
      if (select) {
        select.value = selectedTaskId;
        if (select.value !== selectedTaskId) selectedTaskId = select.value; // task vanished
        const start = panel.querySelector('.tm-start');
        if (start) start.disabled = !selectedTaskId;
      }
    }
  }

  /* ---------- delegated events ---------- */

  function onClick(e) {
    const preset = e.target.closest('.tm-preset');
    if (preset && panel.contains(preset)) {
      selectedPreset = preset.dataset.seconds ? Number(preset.dataset.seconds) : null;
      for (const btn of panel.querySelectorAll('.tm-preset')) {
        const on = btn === preset;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', String(on));
      }
      return;
    }
    if (e.target.closest('.tm-start')) {
      if (selectedTaskId) Store.startTimer(selectedTaskId, selectedPreset);
      return;
    }
    if (e.target.closest('.tm-stop')) {
      const timer = Store.state.timer;
      const task = timer ? Store.taskById(timer.taskId) : null;
      const session = Store.stopTimer();
      restoreTitle();
      if (session) {
        const name = task ? task.name : '(archived task)';
        App.toast(`Logged ${Store.fmtDuration(session.seconds)} on ${name}`);
      }
      return;
    }
    const nameBtn = e.target.closest('.tm-task-name');
    if (nameBtn) {
      Store.emit('task:open', nameBtn.dataset.taskId);
    }
  }

  function onChange(e) {
    if (e.target.classList.contains('tm-select')) {
      selectedTaskId = e.target.value;
      const start = panel.querySelector('.tm-start');
      if (start) start.disabled = !selectedTaskId;
    }
  }

  /* ---------- lifecycle ---------- */

  document.addEventListener('DOMContentLoaded', () => {
    panel = document.getElementById('timer-panel');
    panel.classList.add('card', 'tm-panel');
    panel.addEventListener('click', onClick);
    panel.addEventListener('change', onChange);
    render(); // defensive pre-load render (empty state is fine)
  });

  Store.on('change', render);

  Store.on('timer:start', (taskId) => {
    // If a timer is already running, Store.startTimer emits the error itself.
    Store.startTimer(taskId, selectedPreset);
  });
})();
