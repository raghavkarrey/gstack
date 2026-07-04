/* Raghavtracker — Today view (tasks agent).
 * Owns #view-today only: add-task form, daily progress, habit checklist.
 * Static skeleton is built once on DOMContentLoaded; dynamic content
 * re-renders from Store state on every 'change' event. Listeners are
 * delegated on the container so re-renders never lose handlers. */
'use strict';

(() => {
  let root = null; // #view-today — the only DOM this module touches

  function q(sel) {
    return root.querySelector(sel);
  }

  function headingDate() {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  /* ---------- static skeleton (built once) ---------- */

  function buildSkeleton() {
    root.innerHTML = `
      <header class="tk-head">
        <h1 class="tk-title">Today</h1>
        <p class="tk-date muted"></p>
      </header>

      <form class="card tk-add" autocomplete="off">
        <input class="input tk-add-name" type="text"
               placeholder="Add a task — e.g. Read 20 pages"
               aria-label="Task name">
        <select class="select tk-add-type" aria-label="Repeats">
          <option value="daily" selected>Every day</option>
          <option value="once">One time</option>
        </select>
        <input class="input tk-add-date" type="date"
               aria-label="Date for one-time task" hidden disabled>
        <button class="btn btn-primary tk-add-btn" type="submit">Add</button>
      </form>

      <section class="card tk-checklist">
        <h2 class="section-title">Today&#39;s checklist</h2>
        <div class="tk-summary"></div>
        <ul class="tk-list" role="list"></ul>
      </section>
    `;
    q('.tk-date').textContent = headingDate();
  }

  /* ---------- add-task form ---------- */

  function syncDateInput() {
    const once = q('.tk-add-type').value === 'once';
    const dateInput = q('.tk-add-date');
    dateInput.hidden = !once;
    dateInput.disabled = !once;
    if (once && !dateInput.value) dateInput.value = Store.todayKey();
  }

  function onSubmit(e) {
    e.preventDefault(); // handles both the Add button and Enter in the input
    const nameInput = q('.tk-add-name');
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return; // ignore empty names
    }
    const type = q('.tk-add-type').value;
    const date = type === 'once' ? (q('.tk-add-date').value || Store.todayKey()) : null;
    Store.addTask({ name, type, date });
    nameInput.value = '';
    nameInput.focus(); // brief confirmation: ready for the next one
  }

  /* ---------- dynamic rendering ---------- */

  function render() {
    const key = Store.todayKey();
    q('.tk-date').textContent = headingDate(); // stays fresh across midnight
    renderSummary(key);
    renderList(key);
  }

  function renderSummary(key) {
    const { total, done } = Store.dayStatus(key);
    const summary = q('.tk-summary');
    if (total === 0) {
      summary.innerHTML = '';
      return;
    }
    const pct = Math.round((done / total) * 100);
    const allDone = done === total;
    summary.innerHTML = `
      <div class="tk-summary-row">
        <span class="tk-summary-count">${done} of ${total} done</span>
        ${allDone ? '<span class="tk-cheer">All done — great day! 🎉</span>' : ''}
      </div>
      <div class="tk-bar" role="progressbar" aria-label="Daily progress"
           aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}">
        <div class="tk-bar-fill" style="width:${pct}%"></div>
      </div>
    `;
  }

  function renderList(key) {
    const list = q('.tk-list');
    const tasks = Store.tasksForDate(key);
    if (tasks.length === 0) {
      list.innerHTML =
        '<li class="tk-empty-row"><div class="empty">' +
        'Nothing on the list yet — add your first task above and start a streak.' +
        '</div></li>';
      return;
    }
    const todaySessions = Store.sessionsForDate(key);
    list.innerHTML = tasks.map((t) => rowHtml(t, key, todaySessions)).join('');
  }

  function rowHtml(task, key, todaySessions) {
    const done = Store.isCompleted(task.id, key);
    const streak = task.type === 'daily' ? Store.streak(task.id) : 0;
    const focusSecs = todaySessions
      .filter((s) => s.taskId === task.id)
      .reduce((sum, s) => sum + s.seconds, 0);
    const name = esc(task.name); // esc() around every user-text insertion
    const id = esc(task.id);
    return `
      <li class="tk-row${done ? ' is-done' : ''}" data-id="${id}">
        <label class="tk-check-wrap">
          <input class="tk-check" type="checkbox" ${done ? 'checked' : ''}
                 aria-label="Mark ${name} ${done ? 'not done' : 'done'} for today">
        </label>
        <button type="button" class="tk-name" data-act="open"
                title="Open task detail">${name}</button>
        <span class="tk-meta">
          ${streak >= 2 ? `<span class="tk-streak" title="${streak}-day streak">🔥 ${streak}</span>` : ''}
          ${focusSecs > 0 ? `<span class="tk-time" title="Focus time today">${esc(Store.fmtDuration(focusSecs))}</span>` : ''}
          <span class="pill tk-pill">${task.type === 'daily' ? 'daily' : 'one-time'}</span>
          <button type="button" class="btn btn-ghost tk-play" data-act="timer"
                  title="Start timer" aria-label="Start timer for ${name}">▶</button>
        </span>
      </li>
    `;
  }

  /* ---------- lifecycle ---------- */

  document.addEventListener('DOMContentLoaded', () => {
    root = document.getElementById('view-today');
    buildSkeleton();

    // Delegated listeners on the container — survive every re-render.
    q('.tk-add').addEventListener('submit', onSubmit);
    q('.tk-add-type').addEventListener('change', syncDateInput);

    root.addEventListener('change', (e) => {
      if (!e.target.classList.contains('tk-check')) return;
      const row = e.target.closest('.tk-row');
      if (row) Store.toggleCompletion(row.dataset.id, Store.todayKey());
    });

    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const row = btn.closest('.tk-row');
      if (!row) return;
      if (btn.dataset.act === 'open') Store.emit('task:open', row.dataset.id);
      else if (btn.dataset.act === 'timer') Store.emit('timer:start', row.dataset.id);
    });

    render(); // defensive first paint (empty state) before Store.load resolves
  });

  Store.on('change', () => {
    if (root) render();
  });
})();
