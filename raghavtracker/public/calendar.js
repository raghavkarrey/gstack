/* Raghavtracker — calendar: month grid + day detail panel.
 * Owns #view-calendar only. Reads/mutates through Store; all user
 * text passes through esc() before hitting innerHTML. */
'use strict';

(() => {
  /* ---------- module-local view state (survives 'change' re-renders) ---------- */

  let shownMonth = startOfMonth(new Date()); // Date of the 1st of the displayed month
  let selectedKey = Store.todayKey();        // date key of the selected day (default: today)
  let refs = null;                           // element refs inside #view-calendar (set on DOMContentLoaded)

  /* ---------- date math (local timezone, Monday-start weeks) ---------- */

  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function keyToDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d); // local-timezone construction, never Date.parse
  }

  // Days between the week's Monday and `date`: Mon=0 ... Sun=6.
  function mondayOffset(date) {
    return (date.getDay() + 6) % 7;
  }

  // Locale-aware Mon..Sun short names (2024-01-01 is a Monday).
  function weekdayCells() {
    let html = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date(2024, 0, 1 + i);
      html += `<span class="cal-wd">${esc(d.toLocaleDateString(undefined, { weekday: 'short' }))}</span>`;
    }
    return html;
  }

  /* ---------- rendering ---------- */

  function render() {
    if (!refs) return; // 'change' can fire before the skeleton exists
    renderGrid();
    renderDetail();
  }

  function renderGrid() {
    refs.title.textContent = shownMonth.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });

    const y = shownMonth.getFullYear();
    const m = shownMonth.getMonth();
    const offset = mondayOffset(shownMonth);                     // dimmed prev-month days before the 1st
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7; // 4-6 full weeks
    const todayKey = Store.todayKey();

    let html = '';
    for (let i = 0; i < cellCount; i++) {
      // Date constructor normalizes out-of-range days, so prev/next-month
      // spill (including across year boundaries) carries correct keys.
      const d = new Date(y, m, 1 - offset + i);
      const key = Store.dateKey(d);
      const { total, done } = Store.dayStatus(key);

      const classes = ['cal-day'];
      if (d.getMonth() !== m) classes.push('cal-dim');
      if (key === todayKey) classes.push('cal-today');
      if (key === selectedKey) classes.push('cal-selected');
      if (total > 0) {
        if (done >= total) classes.push('cal-st-full');
        else if (done > 0) classes.push('cal-st-part');
        else if (key < todayKey) classes.push('cal-st-miss'); // all missed, day is past
        // future/today with nothing done yet stays plain
      }

      const badges = [];
      if (total > 0) badges.push(`<span class="cal-frac">${done}/${total}</span>`);
      const secs = Store.totalSecondsForDate(key);
      if (secs > 0) {
        badges.push(`<span class="cal-badge cal-badge-time">◷ ${esc(Store.fmtDuration(secs))}</span>`);
      }
      const noteCount = Store.notesForDate(key).length;
      if (noteCount > 0) {
        badges.push(`<span class="cal-badge cal-badge-note">${noteCount}</span>`);
      }

      const label = d.toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      html += `<button type="button" class="${classes.join(' ')}" data-key="${key}"` +
        `${key === todayKey ? ' aria-current="date"' : ''} aria-label="${esc(label)}">` +
        `<span class="cal-day-num">${d.getDate()}</span>` +
        `<span class="cal-badges">${badges.join('')}</span>` +
        `</button>`;
    }
    refs.grid.innerHTML = html;
  }

  function renderDetail() {
    const key = selectedKey;
    const date = keyToDate(key);
    const tasks = Store.tasksForDate(key);
    const sessions = Store.sessionsForDate(key);
    const notes = Store.notesForDate(key);

    const parts = [];
    const title = date.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    parts.push(
      `<h3 class="cal-detail-title">${esc(title)}` +
      `${key === Store.todayKey() ? ' <span class="pill">today</span>' : ''}</h3>`
    );

    if (tasks.length === 0 && sessions.length === 0 && notes.length === 0) {
      parts.push('<p class="empty">Nothing on this day.</p>');
    } else {
      if (tasks.length > 0) {
        parts.push('<ul class="cal-task-list">');
        for (const t of tasks) {
          const done = Store.isCompleted(t.id, key);
          parts.push(
            `<li class="cal-task${done ? ' is-done' : ''}">` +
            `<input type="checkbox" class="cal-task-check" data-cal-toggle="${esc(t.id)}"` +
            `${done ? ' checked' : ''} aria-label="Toggle completion of ${esc(t.name)}">` +
            `<button type="button" class="cal-task-name" data-cal-open="${esc(t.id)}">${esc(t.name)}</button>` +
            `${t.type === 'once' ? '<span class="pill cal-once">one-time</span>' : ''}` +
            `</li>`
          );
        }
        parts.push('</ul>');
      }

      if (sessions.length > 0) {
        parts.push('<h4 class="section-title cal-sub">Focus</h4><ul class="cal-session-list">');
        for (const s of sessions) {
          const t = Store.taskById(s.taskId);
          parts.push(
            `<li class="cal-session">` +
            `<span class="cal-session-task">${esc(t ? t.name : 'Unknown task')}</span>` +
            `<span class="cal-session-dur">${esc(Store.fmtDuration(s.seconds))}</span>` +
            `</li>`
          );
        }
        parts.push('</ul>');
      }

      if (notes.length > 0) {
        parts.push('<h4 class="section-title cal-sub">Notes</h4><ul class="cal-note-list">');
        for (const n of notes) {
          const t = Store.taskById(n.taskId);
          parts.push(
            `<li class="cal-note">` +
            `<span class="cal-note-task">${esc(t ? t.name : 'Unknown task')}</span>` +
            `<span class="cal-note-text">${esc(n.text)}</span>` +
            `</li>`
          );
        }
        parts.push('</ul>');
      }
    }

    refs.detail.innerHTML = parts.join('');
  }

  /* ---------- lifecycle ---------- */

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('view-calendar');
    root.innerHTML =
      '<div class="card cal-card">' +
        '<div class="cal-head">' +
          '<h2 class="cal-title"></h2>' +
          '<div class="cal-nav">' +
            '<button type="button" class="btn btn-ghost cal-nav-btn" data-cal-nav="prev" aria-label="Previous month">&lsaquo;</button>' +
            '<button type="button" class="btn btn-ghost cal-nav-today" data-cal-nav="today">Today</button>' +
            '<button type="button" class="btn btn-ghost cal-nav-btn" data-cal-nav="next" aria-label="Next month">&rsaquo;</button>' +
          '</div>' +
        '</div>' +
        `<div class="cal-weekdays">${weekdayCells()}</div>` +
        '<div class="cal-grid"></div>' +
      '</div>' +
      '<div class="card cal-detail" aria-label="Day detail"></div>';

    refs = {
      title: root.querySelector('.cal-title'),
      grid: root.querySelector('.cal-grid'),
      detail: root.querySelector('.cal-detail'),
    };

    // Delegated clicks: month nav, day selection, task-name → drawer.
    root.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-cal-nav]');
      if (nav) {
        const dir = nav.dataset.calNav;
        if (dir === 'prev') {
          shownMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() - 1, 1);
        } else if (dir === 'next') {
          shownMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() + 1, 1);
        } else {
          shownMonth = startOfMonth(new Date());
        }
        render();
        return;
      }

      const day = e.target.closest('.cal-day[data-key]');
      if (day) {
        selectedKey = day.dataset.key;
        render();
        return;
      }

      const open = e.target.closest('[data-cal-open]');
      if (open) Store.emit('task:open', open.dataset.calOpen);
    });

    // Delegated change: detail-panel checkboxes (works for past days too —
    // toggleCompletion emits 'change', which re-renders grid + detail).
    root.addEventListener('change', (e) => {
      const cb = e.target.closest('input[data-cal-toggle]');
      if (cb) Store.toggleCompletion(cb.dataset.calToggle, selectedKey);
    });

    render(); // defensive first paint before Store.load() resolves
  });

  Store.on('change', render);
})();
