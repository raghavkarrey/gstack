/* Raghavtracker — notes module. Owns #task-detail-body (the drawer body):
 * task header, stats strip, quick actions, notes (the heart), recent
 * sessions. app.js opens/closes the drawer; this module only fills it. */
'use strict';

(() => {
  let currentTaskId = null;
  let container = null;

  /* ---------- formatting helpers ---------- */

  function fmtOnceDate(key) {
    if (!key) return '';
    const [y, m, d] = key.split('-').map(Number);
    const opts = { month: 'short', day: 'numeric' };
    if (y !== new Date().getFullYear()) opts.year = 'numeric';
    return new Date(y, m - 1, d).toLocaleDateString([], opts);
  }

  function fmtNoteStamp(iso) {
    return new Date(iso).toLocaleString([], {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  }

  function fmtSessionDate(iso) {
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function autoGrow(ta) {
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }

  /* ---------- draft preservation across re-renders ---------- */

  function captureDraft() {
    const ta = container.querySelector('.nt-note-input');
    if (!ta) return null;
    return {
      value: ta.value,
      focused: document.activeElement === ta,
      selStart: ta.selectionStart,
      selEnd: ta.selectionEnd,
    };
  }

  function restoreDraft(draft) {
    if (!draft) return;
    const ta = container.querySelector('.nt-note-input');
    if (!ta) return;
    ta.value = draft.value;
    autoGrow(ta);
    if (draft.focused) {
      ta.focus();
      try {
        ta.setSelectionRange(draft.selStart, draft.selEnd);
      } catch {
        /* selection restore is best-effort */
      }
    }
  }

  /* ---------- render ---------- */

  function statBlock(valueHtml, label, extraClass = '') {
    return `<div class="nt-stat">
        <div class="nt-stat-value${extraClass ? ` ${extraClass}` : ''}">${valueHtml}</div>
        <div class="nt-stat-label">${label}</div>
      </div>`;
  }

  function taskHtml(task) {
    const todayKey = Store.todayKey();
    const doneToday = Store.isCompleted(task.id, todayKey);
    const sessions = Store.sessionsForTask(task.id)
      .slice()
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const notes = Store.notesForTask(task.id); // already newest-first

    // Header pills
    const pills = [];
    if (task.type === 'once') {
      pills.push(`<span class="pill">one-time · ${esc(fmtOnceDate(task.date))}</span>`);
    } else {
      pills.push('<span class="pill">daily</span>');
    }
    if (task.archivedOn) {
      pills.push('<span class="pill nt-pill-archived">archived</span>');
    }

    // Stats strip
    const stats = [];
    if (task.type === 'daily') {
      const n = Store.streak(task.id);
      stats.push(
        n > 0
          ? statBlock(`🔥 ${n}`, `day streak`)
          : statBlock('No streak yet', 'streak', 'nt-stat-value--text')
      );
    }
    stats.push(statBlock(esc(Store.fmtDuration(Store.totalSecondsForTask(task.id))), 'focus time'));
    stats.push(statBlock(String(sessions.length), sessions.length === 1 ? 'session' : 'sessions'));
    stats.push(
      doneToday
        ? statBlock('✓', 'done today', 'nt-stat-value--good')
        : statBlock('—', 'done today')
    );

    // Quick actions
    const doneBtn = doneToday
      ? '<button type="button" class="btn nt-btn-done is-done" data-action="toggle-done">Done today ✓</button>'
      : '<button type="button" class="btn nt-btn-done" data-action="toggle-done">Mark done today</button>';
    const archiveBtn = task.archivedOn
      ? '<button type="button" class="btn btn-ghost nt-btn-archive" data-action="unarchive">Unarchive</button>'
      : '<button type="button" class="btn btn-ghost nt-btn-archive" data-action="archive">Archive</button>';

    // Notes list
    const notesHtml = notes.length
      ? notes
          .map(
            (n) => `<div class="nt-note">
          <div class="nt-note-text">${esc(n.text)}</div>
          <div class="nt-note-meta">
            <span class="nt-note-stamp">${esc(fmtNoteStamp(n.createdAt))}</span>
            <button type="button" class="btn btn-ghost nt-note-delete" data-action="delete-note"
              data-note-id="${esc(n.id)}" title="Delete note" aria-label="Delete note">×</button>
          </div>
        </div>`
          )
          .join('')
      : '<p class="empty nt-notes-empty">No notes yet — first thought goes here.</p>';

    // Recent sessions (omit the whole section when there are none)
    let sessionsHtml = '';
    if (sessions.length > 0) {
      const rows = sessions
        .slice(0, 5)
        .map(
          (s) => `<div class="nt-session">
          <span class="nt-session-date">${esc(fmtSessionDate(s.startedAt))}</span>
          <span class="nt-session-dur">${esc(Store.fmtDuration(s.seconds))}</span>
        </div>`
        )
        .join('');
      const more =
        sessions.length > 5
          ? `<div class="nt-session-more muted">+${sessions.length - 5} more</div>`
          : '';
      sessionsHtml = `<section class="nt-sessions">
          <h3 class="section-title">Recent sessions</h3>
          ${rows}${more}
        </section>`;
    }

    return `<div class="nt-detail">
        <header class="nt-header">
          <h2 class="nt-title">${esc(task.name)}</h2>
          <div class="nt-pills">${pills.join('')}</div>
        </header>
        <div class="nt-stats">${stats.join('')}</div>
        <div class="nt-actions">
          ${doneBtn}
          <button type="button" class="btn nt-btn-timer" data-action="start-timer">▶ Start timer</button>
          ${archiveBtn}
        </div>
        <section class="nt-notes">
          <h3 class="section-title">Notes</h3>
          <div class="nt-note-form">
            <textarea class="nt-note-input" rows="2"
              placeholder="Write a note on this task…" aria-label="New note"></textarea>
            <button type="button" class="btn btn-primary nt-note-add" data-action="add-note">Add note</button>
          </div>
          <div class="nt-note-list">${notesHtml}</div>
        </section>
        ${sessionsHtml}
      </div>`;
  }

  function render(preserveDraft) {
    if (!container || currentTaskId == null) return;
    const draft = preserveDraft ? captureDraft() : null;
    const task = Store.taskById(currentTaskId);
    container.innerHTML = task
      ? taskHtml(task)
      : '<p class="empty">This task no longer exists.</p>';
    restoreDraft(draft);
  }

  /* ---------- actions ---------- */

  function submitNote() {
    const ta = container.querySelector('.nt-note-input');
    if (!ta || currentTaskId == null) return;
    const text = ta.value.trim();
    if (!text) {
      ta.focus();
      return;
    }
    // Clear BEFORE addNote so the synchronous 'change' re-render preserves
    // an empty draft instead of resurrecting the just-submitted text.
    ta.value = '';
    autoGrow(ta);
    Store.addNote({ taskId: currentTaskId, text });
    const fresh = container.querySelector('.nt-note-input');
    if (fresh) fresh.focus();
  }

  /* ---------- events ---------- */

  Store.on('task:open', (taskId) => {
    // Keep an in-progress draft only when reopening the same task.
    const sameTask = taskId === currentTaskId;
    currentTaskId = taskId;
    render(sameTask);
  });

  Store.on('change', () => {
    if (currentTaskId != null) render(true);
  });

  document.addEventListener('DOMContentLoaded', () => {
    container = document.getElementById('task-detail-body');

    // Delegated listeners on the container so re-renders keep working.
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || !container.contains(btn) || currentTaskId == null) return;
      const action = btn.dataset.action;
      if (action === 'toggle-done') {
        Store.toggleCompletion(currentTaskId, Store.todayKey());
      } else if (action === 'start-timer') {
        Store.emit('timer:start', currentTaskId);
        App.closeDrawer();
      } else if (action === 'archive') {
        Store.archiveTask(currentTaskId);
        App.closeDrawer();
        App.toast('Archived');
      } else if (action === 'unarchive') {
        Store.unarchiveTask(currentTaskId);
        App.toast('Unarchived');
      } else if (action === 'add-note') {
        submitNote();
      } else if (action === 'delete-note') {
        if (confirm('Delete this note?')) Store.deleteNote(btn.dataset.noteId);
      }
    });

    container.addEventListener('input', (e) => {
      if (e.target.matches('.nt-note-input')) autoGrow(e.target);
    });

    container.addEventListener('keydown', (e) => {
      if (
        e.target.matches('.nt-note-input') &&
        e.key === 'Enter' &&
        (e.metaKey || e.ctrlKey)
      ) {
        e.preventDefault();
        submitNote();
      }
    });
  });
})();
