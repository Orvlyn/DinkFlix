const ROOT_CLASS = 'sleekfin-main-ui';
const WINDOW_EVENTS = ['hashchange', 'pageshow', 'popstate'];

function createThemeFeature() {
  let started = false;

  function getRoute() {
    return (window.location.hash.slice(1) || window.location.pathname).split('?')[0].toLowerCase();
  }

  function isExcludedRoute() {
    const route = getRoute();
    const pathExcluded = route === '/dashboard'
      || route.startsWith('/dashboard/')
      || route === '/configurationpage'
      || route.startsWith('/configurationpage/')
      || route === '/metadata'
      || route.startsWith('/metadata/')
      || route.startsWith('/video/')
      || route === '/video'
      || route.startsWith('/playback/')
      || route === '/playback'
      || route.startsWith('/player/')
      || route === '/player'
      || route.startsWith('/mypreferences')
      || route.startsWith('/login')
      || route.startsWith('/wizard');
    const livePlayer = document.querySelector('.videoPlayerContainer, .videoOsdPage, #videoOsdPage, .videoOsd, video[aria-label="Video player"]');
    const adminView = document.querySelector('#dashboardPage, .dashboardPage, .mainDrawer-scrollContainer');
    return pathExcluded || Boolean(livePlayer) || Boolean(adminView && !document.querySelector('#indexPage')); 
  }

  function reconcile() {
    document.documentElement.classList.toggle(ROOT_CLASS, !isExcludedRoute());
  }

  function start() {
    if (started || !document.documentElement) return;
    started = true;
    WINDOW_EVENTS.forEach((eventName) => window.addEventListener(eventName, reconcile));
    document.addEventListener('viewshow', reconcile);
    reconcile();
  }

  function stop() {
    started = false;
    WINDOW_EVENTS.forEach((eventName) => window.removeEventListener(eventName, reconcile));
    document.removeEventListener('viewshow', reconcile);
    document.documentElement?.classList.remove(ROOT_CLASS);
  }

  return { start, stop };
}

const features = (window.SleekFinFeatures = window.SleekFinFeatures || {});
features.theme?.stop?.();
features.theme = createThemeFeature();
features.theme.start();
