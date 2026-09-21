/* DINKFLIX Native Theme v1 */
(() => {
  'use strict';
  const KEY = '__DINKFLIX_NATIVE_THEME_V1__';
  if (window[KEY]) return;
  window[KEY] = true;
  const root = document.documentElement;
  root.classList.add('dinkflix-native');
  const addClass = (selector, className) => document.querySelectorAll(selector).forEach((node) => node.classList.add(className));
  const run = () => {
    addClass('.itemDetailPage, .detailPage', 'dinkflix-detail-surface');
    addClass('.homePage', 'dinkflix-home-surface');
    addClass('.libraryPage', 'dinkflix-library-surface');
    addClass('.searchPage', 'dinkflix-search-surface');
    addClass('.videoOsdPage', 'dinkflix-player-surface');
    addClass('.dialog', 'dinkflix-dialog-surface');
    document.querySelectorAll('.card, .overflowPortraitCard, .overflowSquareCard, .listItem').forEach((node) => {
      node.dataset.dinkflixDecorated = '1';
      node.classList.add('dinkflix-card-surface');
    });
    addClass('button, .emby-button, .raised, .button-submit', 'dinkflix-control');
  };
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => { frame = 0; run(); });
  };
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', schedule, { passive: true });
  window.addEventListener('popstate', schedule, { passive: true });
  document.addEventListener('viewshow', schedule, { passive: true });
  run();
})();
