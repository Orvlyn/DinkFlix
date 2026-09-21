/* DINKFLIX Native Theme v1 — non-invasive enhancement layer */
(() => {
  'use strict';
  const key = '__DINKFLIX_NATIVE_THEME_V1__';
  if (window[key]) return;
  window[key] = true;
  const root = document.documentElement;
  root.classList.add('dinkflix-native');
})();
