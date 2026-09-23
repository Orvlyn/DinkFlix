import { dom } from '../../shared/runtime.js';
import { cleanupInactiveMetadata, cleanupMetadata, renderMetadata } from './metadata.jsx';

const MAIN_ROOT_CLASS = 'sleekfin-main-ui';
const ROOT_CLASS = 'sleekfin-media-mounted';
const PAGE_SELECTOR = '#indexPage, #moviesPage, #tvshowsPage, #tvRecommendedPage';
const features = (window.SleekFinFeatures = window.SleekFinFeatures || {});

features.media?.stop?.();

const state = {
  cache: new Map(),
  generation: 0,
  inFlight: new Set(),
  stopped: true,
  stopWatching: null,
  mediaObserver: null,
  timer: 0,
  userId: '',
};

function isCurrent(generation) {
  return !state.stopped && generation === state.generation;
}

function resetData() {
  state.generation += 1;
  state.cache.clear();
  state.inFlight.clear();
  state.userId = '';
}

function currentUserId() {
  const client = window.ApiClient;
  return client && typeof client.getCurrentUserId === 'function' ? client.getCurrentUserId() : '';
}

function syncUser() {
  const userId = currentUserId();
  if (state.userId !== userId) {
    resetData();
    state.userId = userId;
  }
  return userId;
}

function findHomeResumeContainers() {
  return Array.from(document.querySelectorAll('#indexPage #homeTab.is-active .sections .itemsContainer[data-monitor]'));
}

function hideEmptyResumeSection(container) {
  if (container.querySelector('.card[data-id][data-positionticks]')) return;
  const section = container.closest('.verticalSection, .sectionContainer');
  section?.classList.add('hide');
}

function removeFromContinueWatching(card, button) {
  const client = window.ApiClient;
  const itemId = card.dataset.id;
  if (!client || typeof client.ajax !== 'function' || typeof client.getUrl !== 'function' || !itemId || button.disabled) {
    return;
  }

  button.disabled = true;
  button.setAttribute('aria-busy', 'true');

  client.ajax({
    type: 'POST',
    url: client.getUrl('UserItems/' + encodeURIComponent(itemId) + '/UserData'),
    data: JSON.stringify({ PlaybackPositionTicks: 0 }),
    contentType: 'application/json'
  }).then(() => {
    const container = card.closest('.itemsContainer');
    const cardBox = card.closest('.cardBox') || card;
    cardBox.remove();
    if (container) hideEmptyResumeSection(container);
  }).catch(() => {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  });
}

function decorateResumeCards() {
  findHomeResumeContainers().forEach((container) => {
    container.querySelectorAll('.card[data-id][data-positionticks]').forEach((card) => {
      if (card.querySelector('[data-sleekfin-resume-remove]')) return;

      const overlay = card.querySelector('.cardOverlayContainer');
      const buttonRow = overlay?.querySelector('.cardOverlayButton-br.flex') || overlay;
      if (!buttonRow) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cardOverlayButton cardOverlayButton-hover itemAction paper-icon-button-light sleekfin-resume-remove';
      button.dataset.sleekfinResumeRemove = 'true';
      button.title = 'Remove from Continue Watching';
      button.setAttribute('aria-label', 'Remove from Continue Watching');
      button.innerHTML = '<span class="material-icons cardOverlayButtonIcon cardOverlayButtonIcon-hover close" aria-hidden="true"></span>';

      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        removeFromContinueWatching(card, button);
      });

      buttonRow.appendChild(button);
    });
  });
}

function hideMyMedia() {
  const indexPage = document.querySelector('#indexPage');
  if (!indexPage) return;

  indexPage.querySelectorAll('.homeLibraryButtonContainer').forEach((libraryContainer) => {
    const section = libraryContainer.closest('section, .verticalSection, .sectionContainer')
      || libraryContainer.parentElement;
    if (section && section !== indexPage) {
      section.classList.add('dinkflix-hide-my-media');
    }
  });
}

function startMyMediaHider() {
  hideMyMedia();
  state.mediaObserver = new MutationObserver(() => {
    hideMyMedia();
  });
  state.mediaObserver.observe(document.body, { childList: true, subtree: true });
}

function stopMyMediaHider() {
  state.mediaObserver?.disconnect();
  state.mediaObserver = null;
}

function load(ids) {
  const client = window.ApiClient;
  const userId = syncUser();
  if (!client || typeof client.getItems !== 'function' || !userId) {
    schedule(250);
    return;
  }

  while (ids.length && !state.stopped) {
    const batch = ids.splice(0, 60);
    const generation = state.generation;
    batch.forEach((id) => state.inFlight.add(id));
    client
      .getItems(userId, {
        EnableTotalRecordCount: false,
        Ids: batch.join(','),
      })
      .then((response) => {
        if (!isCurrent(generation)) return;

        const items = new Map((response.Items || []).map((mediaItem) => [mediaItem.Id, mediaItem]));
        batch.forEach((id) => state.cache.set(id, items.get(id) || null));
      })
      .catch(() => {
        if (!isCurrent(generation)) return;

        batch.forEach((id) => state.cache.set(id, null));
      })
      .finally(() => {
        if (!isCurrent(generation)) return;

        batch.forEach((id) => state.inFlight.delete(id));
        schedule();
      });
  }
}

function reconcile() {
  window.clearTimeout(state.timer);
  state.timer = 0;
  if (state.stopped || !document.documentElement.classList.contains(ROOT_CLASS)) return;

  hideMyMedia();
  syncUser();
  const activeCards = new Set();
  const missing = [];
  document.querySelectorAll(PAGE_SELECTOR).forEach((page) => {
    if (!dom.isVisible(page)) return;

    page.querySelectorAll('.card[data-id][data-type]').forEach((card) => {
      const id = card.dataset.id;
      activeCards.add(card);
      renderMetadata(card, state.cache.get(id));
      if (!state.cache.has(id) && !state.inFlight.has(id)) {
        missing.push(id);
      }
    });
  });
  cleanupInactiveMetadata(activeCards);
  decorateResumeCards();

  if (missing.length) {
    load(Array.from(new Set(missing)));
  }
}

function deactivate() {
  window.clearTimeout(state.timer);
  state.timer = 0;
  document.documentElement.classList.remove(ROOT_CLASS);
  cleanupMetadata(document);
  resetData();
}

function schedule(delay) {
  window.clearTimeout(state.timer);
  state.timer = 0;
  if (state.stopped) return;

  if (!document.documentElement.classList.contains(MAIN_ROOT_CLASS)) {
    deactivate();
    return;
  }

  document.documentElement.classList.add(ROOT_CLASS);
  state.timer = window.setTimeout(reconcile, typeof delay === 'number' ? delay : 40);
}

function start() {
  if (!state.stopped) return;

  state.stopped = false;
  state.stopWatching = dom.watchSpa(schedule, { events: ['hashchange'] });
  startMyMediaHider();
  schedule();
}

function stop() {
  if (state.stopped) return;

  state.stopped = true;
  state.stopWatching?.();
  state.stopWatching = null;
  stopMyMediaHider();
  deactivate();
}

features.media = { start, stop };
start();
