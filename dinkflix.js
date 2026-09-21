/* DINKFLIX Native Theme v1
 * Deliberately does not replace Jellyfin routing, pages, dialogs, menus, or playback.
 * This file only decorates native surfaces and adds safe visual hooks.
 */
(() => {
  'use strict';
  const KEY = '__DINKFLIX_NATIVE_THEME_V1__';
  if (window[KEY]) return;
  window[KEY] = true;

  const root = document.documentElement;
  root.classList.add('dinkflix-native');

  const addClass = (selector, className) => {
    document.querySelectorAll(selector).forEach((node) => node.classList.add(className));
  };

  const markSurface = () => {
    addClass('.itemDetailPage', 'dinkflix-detail-surface');
    addClass('.detailPage', 'dinkflix-detail-surface');
    addClass('.homePage', 'dinkflix-home-surface');
    addClass('.libraryPage', 'dinkflix-library-surface');
    addClass('.searchPage', 'dinkflix-search-surface');
    addClass('.videoOsdPage', 'dinkflix-player-surface');
    addClass('.dialog', 'dinkflix-dialog-surface');
  };

  const decorateCards = () => {
    document.querySelectorAll('.card, .overflowPortraitCard, .overflowSquareCard, .listItem').forEach((card) => {
      if (card.dataset.dinkflixDecorated === '1') return;
      card.dataset.dinkflixDecorated = '1';
      card.classList.add('dinkflix-card-surface');
    });
  };

  const decorateButtons = () => {
    document.querySelectorAll('button, .emby-button, .raised, .button-submit').forEach((button) => {
      if (button.closest('.dinkflix-ignore')) return;
      button.classList.add('dinkflix-control');
    });
  };

  const run = () => {
    markSurface();
    decorateCards();
    decorateButtons();
  };

  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      run();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', schedule, { passive: true });
  window.addEventListener('popstate', schedule, { passive: true });
  document.addEventListener('viewshow', schedule, { passive: true });
  document.addEventListener('pageshow', schedule, { passive: true });
  run();
})();
