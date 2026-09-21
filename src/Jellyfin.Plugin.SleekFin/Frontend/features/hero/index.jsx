import { dom, h, render } from '../../shared/runtime.js';
import { Hero } from './Hero.jsx';
import { applySettings, normalizeSettings } from './settings.js';
import { loadEntries, loadSettings } from './source.js';

const WINDOW_EVENTS = ['hashchange', 'popstate', 'pageshow'];
const SETTINGS_EVENT = 'sleekfin:hero-settings-changed';
const ROOT_BOOT_LOADING_CLASS = 'sleekfin-hero-boot-loading';
const ROOT_LOADING_CLASS = 'sleekfin-hero-loading';
const features = (window.SleekFinFeatures = window.SleekFinFeatures || {});

features.hero?.stop?.();

const state = {
  enabled: null,
  failedHost: null,
  generation: 0,
  loadingTimer: 0,
  mount: null,
  readyFrame: 0,
  reconcileTimer: 0,
  started: false,
  stopWatching: null,
  domObserver: null,
};

function finishLoading() {
  window.clearTimeout(state.loadingTimer);
  state.loadingTimer = 0;
  document.documentElement.classList.remove(ROOT_BOOT_LOADING_CLASS, ROOT_LOADING_CLASS);
}

function prepareLoading() {
  const root = document.documentElement;
  if (root.classList.contains(ROOT_BOOT_LOADING_CLASS) || (state.loadingTimer && root.classList.contains(ROOT_LOADING_CLASS))) return;
  root.classList.add(ROOT_LOADING_CLASS);
  state.loadingTimer = window.setTimeout(finishLoading, 4000);
}

function withTimeout(promise, milliseconds, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => window.setTimeout(() => resolve(fallback), milliseconds)),
  ]);
}

function isHomeRoute() {
  const match = window.location.hash.match(/^#\/(?:home)?(?:\?([^#]*))?$/);
  if (!match) return false;
  const tab = new URLSearchParams(match[1] || '').get('tab');
  return !tab || tab === '0';
}

function findHost() {
  if (!isHomeRoute()) return null;
  const candidates = document.querySelectorAll('#indexPage #homeTab.is-active .sections, #indexPage #homeTab .sections, #indexPage .homePage .sections');
  return Array.from(candidates).find((element) => dom.isVisible(element)) || null;
}

function hideMyMedia() {
  const titles = document.querySelectorAll('#indexPage .sectionTitle, #indexPage h2, #indexPage h3');
  titles.forEach((title) => {
    const text = (title.textContent || '').trim().replace(/\s+/g, ' ').toLowerCase();
    if (text !== 'my media' && !text.startsWith('my media ')) return;
    const section = title.closest('.verticalSection, .section');
    if (section && !section.closest('.sleekfin-hero')) section.classList.add('dinkflix-hidden-my-media');
  });
}

function removeMount() {
  if (!state.mount) return;
  window.cancelAnimationFrame(state.readyFrame);
  state.readyFrame = 0;
  render(null, state.mount);
  state.mount.remove();
  state.mount = null;
}

function unmount() {
  state.generation += 1;
  state.failedHost = null;
  removeMount();
}

function createRoot(host) {
  const root = dom.element('<div is="emby-itemscontainer" class="sleekfin-hero itemsContainer" data-contextmenu="false" data-multiselect="false" data-state="loading"></div>');
  host.parentNode.insertBefore(root, host);
  state.mount = root;
  finishLoading();
  if (window.CustomElements && typeof window.CustomElements.upgradeSubtree === 'function') window.CustomElements.upgradeSubtree(root);
  return root;
}

function renderHero(root, entries, settings) {
  if (state.mount !== root || !dom.isConnected(root) || !isHomeRoute()) return;
  render(h(Hero, { entries, root, settings }), root);
  state.readyFrame = window.requestAnimationFrame(() => {
    state.readyFrame = 0;
    if (state.mount === root && dom.isConnected(root)) root.dataset.state = 'ready';
  });
}

function mount(host) {
  const client = window.ApiClient;
  const generation = ++state.generation;
  const root = createRoot(host);
  const settingsPromise = withTimeout(loadSettings(client).catch(() => normalizeSettings({})), 5000, normalizeSettings({}));

  settingsPromise
    .then((settings) => {
      if (generation !== state.generation || state.mount !== root || !dom.isConnected(root)) return null;
      state.enabled = settings.enabled;
      if (!settings.enabled) {
        removeMount();
        return null;
      }
      applySettings(root, settings);
      return withTimeout(loadEntries(client, settings).catch(() => []), 12000, []).then((entries) => ({ entries, settings }));
    })
    .then((result) => {
      if (!result || generation !== state.generation) return;
      if (result.entries.length) {
        renderHero(root, result.entries, result.settings);
      } else {
        state.failedHost = host;
        finishLoading();
      }
    })
    .catch(() => {
      if (generation === state.generation) {
        state.failedHost = host;
        finishLoading();
      }
    });
}

function reconcile() {
  if (!state.started || !window.ApiClient) return;
  hideMyMedia();
  const host = findHost();
  if (!host) {
    if (!isHomeRoute()) unmount();
    return;
  }
  if (state.enabled === false) {
    finishLoading();
    removeMount();
    return;
  }
  if (state.mount && dom.isConnected(state.mount) && state.mount.nextElementSibling === host) return;
  if (state.failedHost === host) return;
  unmount();
  mount(host);
}

function scheduleReconcile() {
  const home = isHomeRoute();
  const loading = home && state.enabled !== false && !dom.isConnected(state.mount) && (!state.failedHost || state.failedHost !== findHost());
  if (!loading) finishLoading();
  else prepareLoading();
  if (state.reconcileTimer) return;
  state.reconcileTimer = window.setTimeout(() => {
    state.reconcileTimer = 0;
    reconcile();
  }, 0);
}

function startDomObserver() {
  if (state.domObserver || typeof MutationObserver === 'undefined' || !document.body) return;
  state.domObserver = new MutationObserver((mutations) => {
    const relevant = mutations.some((mutation) => {
      const target = mutation.target;
      return !target.closest?.('.sleekfin-hero') && !target.closest?.('.dinkflix-hidden-my-media');
    });
    if (relevant) scheduleReconcile();
  });
  state.domObserver.observe(document.body, { childList: true, subtree: true });
}

function reloadSettings() {
  if (!state.started) return;
  state.enabled = null;
  unmount();
  scheduleReconcile();
}

function start() {
  if (state.started) return;
  state.started = true;
  state.stopWatching = dom.watchSpa(scheduleReconcile, { events: WINDOW_EVENTS, viewshow: true });
  window.addEventListener(SETTINGS_EVENT, reloadSettings);
  startDomObserver();
  scheduleReconcile();
}

function stop() {
  state.started = false;
  window.clearTimeout(state.reconcileTimer);
  state.reconcileTimer = 0;
  state.stopWatching?.();
  state.stopWatching = null;
  state.domObserver?.disconnect();
  state.domObserver = null;
  window.removeEventListener(SETTINGS_EVENT, reloadSettings);
  unmount();
  finishLoading();
}

features.hero = { start, stop };
start();
