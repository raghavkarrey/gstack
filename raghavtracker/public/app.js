/* Raghavtracker — app shell: boot, tab navigation, drawer, toasts. */
'use strict';

const App = (() => {
  let toastTimer = null;

  function toast(message) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.hidden = false;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('is-visible');
      el.hidden = true;
    }, 2600);
  }

  function showView(name) {
    for (const section of document.querySelectorAll('.view')) {
      section.classList.toggle('hidden', section.id !== `view-${name}`);
    }
    for (const tab of document.querySelectorAll('.tabs .tab')) {
      const active = tab.dataset.view === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    }
  }

  function openDrawer() {
    document.getElementById('task-detail').classList.remove('hidden');
    document.getElementById('drawer-backdrop').classList.remove('hidden');
  }

  function closeDrawer() {
    document.getElementById('task-detail').classList.add('hidden');
    document.getElementById('drawer-backdrop').classList.add('hidden');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-view]');
      if (tab) showView(tab.dataset.view);
    });

    document.getElementById('drawer-backdrop').addEventListener('click', closeDrawer);
    document.getElementById('task-detail').addEventListener('click', (e) => {
      if (e.target.closest('.js-close-drawer')) closeDrawer();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });

    Store.on('task:open', openDrawer);
    Store.on('error', toast);

    Store.load().catch((err) => {
      console.error(err);
      toast('Could not load your data — is the server running?');
    });
  });

  return { toast, showView, closeDrawer };
})();
