const ROOT_CLASS = 'sleekfin-main-ui';
const WINDOW_EVENTS = ['hashchange', 'pageshow', 'popstate'];
const DINKFLIX_BACKGROUND = '#050810';

const DINKFLIX_CSS = `
:root {
  --dinkflix-bg: ${DINKFLIX_BACKGROUND};
  --dinkflix-surface: #0b111d;
  --dinkflix-surface-2: #101827;
  --dinkflix-border: rgba(255,255,255,.08);
  --dinkflix-text: #f4f7fb;
  --dinkflix-muted: #98a4b7;
  --dinkflix-accent: #00ffc6;
}

html.sleekfin-main-ui,
html.sleekfin-main-ui body,
html.sleekfin-main-ui #reactRoot,
html.sleekfin-main-ui .skinBody {
  background: var(--dinkflix-bg) !important;
  color: var(--dinkflix-text);
}

html.sleekfin-main-ui body:before {
  background: var(--dinkflix-bg) !important;
}

html.sleekfin-main-ui .skinHeader {
  background: linear-gradient(180deg, rgba(5,8,16,.98), rgba(5,8,16,.72), transparent) !important;
  transition: background .25s ease, backdrop-filter .25s ease;
  z-index: 1000 !important;
}

html.sleekfin-main-ui .skinHeader:hover,
html.sleekfin-main-ui .skinHeader:focus-within {
  background: rgba(5,8,16,.96) !important;
  backdrop-filter: blur(18px);
}

html.sleekfin-main-ui .sectionTitle,
html.sleekfin-main-ui .sectionTitle-cards {
  font-size: clamp(1.2rem, 1.45vw, 1.65rem) !important;
  font-weight: 600 !important;
  letter-spacing: -.025em;
}

html.sleekfin-main-ui .itemsContainer.itemsContainer-full,
html.sleekfin-main-ui .vertical-list {
  gap: 1.15rem !important;
}

html.sleekfin-main-ui .cardBox {
  border-radius: 12px !important;
  overflow: hidden;
  background: var(--dinkflix-surface) !important;
  box-shadow: 0 8px 28px rgba(0,0,0,.16);
  transition: transform .2s ease, box-shadow .2s ease;
}

html.sleekfin-main-ui .cardBox:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 38px rgba(0,0,0,.36), 0 0 0 1px rgba(0,255,198,.12);
}

html.sleekfin-main-ui .cardImageContainer,
html.sleekfin-main-ui .cardContent {
  border-radius: 12px !important;
}

html.sleekfin-main-ui .cardImageContainer {
  aspect-ratio: 2 / 3 !important;
}

html.sleekfin-main-ui .itemsContainer .card,
html.sleekfin-main-ui .itemsContainer .cardScalable {
  min-width: 0 !important;
}

html.sleekfin-main-ui .itemsContainer.itemsContainer-wrap {
  grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
}

html.sleekfin-main-ui .section0 .itemsContainer,
html.sleekfin-main-ui #resumeItems .itemsContainer,
html.sleekfin-main-ui .continueWatching .itemsContainer {
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
}

html.sleekfin-main-ui #resumeItems .cardImageContainer,
html.sleekfin-main-ui .continueWatching .cardImageContainer {
  aspect-ratio: 16 / 9 !important;
}

html.sleekfin-main-ui .cardOverlayFab-primary,
html.sleekfin-main-ui .cardOverlayButton {
  background: rgba(5,8,16,.84) !important;
  border: 1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(10px);
}

html.sleekfin-main-ui .itemProgressBar {
  height: 5px !important;
  background: rgba(255,255,255,.16) !important;
  border-radius: 999px;
  overflow: hidden;
}

html.sleekfin-main-ui .itemProgressBarForeground {
  background: var(--dinkflix-accent) !important;
  box-shadow: 0 0 12px rgba(0,255,198,.32);
}

html.sleekfin-main-ui .ratingValue,
html.sleekfin-main-ui .communityRating,
html.sleekfin-main-ui .cardText-secondary {
  font-weight: 500 !important;
}

html.sleekfin-main-ui .ratingValue {
  color: var(--dinkflix-accent) !important;
}

html.sleekfin-main-ui .detailPageContent,
html.sleekfin-main-ui .itemDetailPage {
  background: var(--dinkflix-bg) !important;
}

html.sleekfin-main-ui .detailPagePrimaryContainer,
html.sleekfin-main-ui .itemDetailPage .detailPagePrimaryContent {
  position: relative;
  z-index: 2;
}

html.sleekfin-main-ui .detailPageSecondaryContainer,
html.sleekfin-main-ui .detailPageContent .section {
  background: linear-gradient(180deg, transparent, rgba(5,8,16,.35));
}

html.sleekfin-main-ui .detailPageContent .btnBack,
html.sleekfin-main-ui .detailPageContent .headerButton,
html.sleekfin-main-ui .videoOsdBottom .headerButton {
  position: relative;
  z-index: 1100 !important;
  pointer-events: auto !important;
}

html.sleekfin-main-ui .videoOsdBottom,
html.sleekfin-main-ui .videoOsdTop {
  z-index: 1200 !important;
}

html.sleekfin-main-ui .selectContainer,
html.sleekfin-main-ui .emby-select-withcolor {
  background: var(--dinkflix-surface-2) !important;
  border: 1px solid var(--dinkflix-border) !important;
  border-radius: 10px !important;
}

@media (max-width: 1400px) {
  html.sleekfin-main-ui .itemsContainer.itemsContainer-wrap { grid-template-columns: repeat(5, minmax(0,1fr)) !important; }
}
@media (max-width: 1000px) {
  html.sleekfin-main-ui .itemsContainer.itemsContainer-wrap { grid-template-columns: repeat(4, minmax(0,1fr)) !important; }
  html.sleekfin-main-ui #resumeItems .itemsContainer,
  html.sleekfin-main-ui .continueWatching .itemsContainer { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
}
@media (max-width: 650px) {
  html.sleekfin-main-ui .itemsContainer.itemsContainer-wrap { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
  html.sleekfin-main-ui #resumeItems .itemsContainer,
  html.sleekfin-main-ui .continueWatching .itemsContainer { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
}
`;

function installStyles() {
  if (document.getElementById('dinkflix-theme-overrides')) return;
  const style = document.createElement('style');
  style.id = 'dinkflix-theme-overrides';
  style.textContent = DINKFLIX_CSS;
  document.head.appendChild(style);
}

function removeStyles() {
  document.getElementById('dinkflix-theme-overrides')?.remove();
}

function createThemeFeature() {
  let started = false;

  function isDashboardRoute() {
    const route = (window.location.hash.slice(1) || window.location.pathname).split('?')[0].toLowerCase();
    return route === '/dashboard' || route.startsWith('/dashboard/') || route === '/configurationpage' || route === '/metadata';
  }

  function reconcile() {
    document.documentElement.classList.toggle(ROOT_CLASS, !isDashboardRoute());
    if (!isDashboardRoute()) installStyles();
    else removeStyles();
  }

  function start() {
    if (started || !document.documentElement) return;
    started = true;
    WINDOW_EVENTS.forEach((eventName) => window.addEventListener(eventName, reconcile));
    installStyles();
    reconcile();
  }

  function stop() {
    started = false;
    WINDOW_EVENTS.forEach((eventName) => window.removeEventListener(eventName, reconcile));
    document.documentElement?.classList.remove(ROOT_CLASS);
    removeStyles();
  }

  return { start, stop };
}

const features = (window.SleekFinFeatures = window.SleekFinFeatures || {});
features.theme?.stop?.();
features.theme = createThemeFeature();
features.theme.start();
