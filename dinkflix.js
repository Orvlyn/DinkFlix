/* DINKFLIX Web — v5.1 visual baseline on Jellyfin 12.1. */
/* jshint esversion: 11, asi: false, undef: true, unused: false */
(() => {
  'use strict';

  if (window.__DINKFLIX_WEB_84__) {
    return;
  }
  window.__DINKFLIX_WEB_84__ = true;

  const VERSION = '8.4.0';
  const state = {
    user: null,
    userId: null,
    serverId: '',
    views: [],
    shell: null,
    nav: null,
    menuRoot: null,
    toastRoot: null,
    renderKey: '',
    custom: false,
    route: null,
    heroItems: [],
    heroIndex: 0,
    heroTimer: null,
    heroPaused: false,
    scrollBound: false,
    hashBound: false,
    cardData: new Map()
  };

  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const fmtYear = (value) => {
    if (!value) {
      return '';
    }
    const match = String(value).match(/\d{4}/);
    return match ? match[0] : '';
  };

  const humanMinutes = (ticks) => {
    const value = Number(ticks || 0);
    if (!value) {
      return '';
    }
    const minutes = Math.round(value / 600000000);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
  };

  const playbackPercent = (item) => {
    const position = Number(item?.UserData?.PlaybackPositionTicks || 0);
    const total = Number(item?.RunTimeTicks || 0);
    if (!total) {
      return 0;
    }
    return Math.max(0, Math.min(100, (position / total) * 100));
  };

  function client() {
    return window.ApiClient || null;
  }

  function credentials() {
    try {
      const raw = localStorage.getItem('jellyfin_credentials');
      if (!raw) {
        return null;
      }
      const data = JSON.parse(raw);
      const servers = Array.isArray(data?.Servers) ? data.Servers : [];
      const origin = location.origin;
      const matching = servers.find((server) => ['ManualAddress', 'RemoteAddress', 'LocalAddress'].some((key) => {
        try {
          return server?.[key] && new URL(server[key]).origin === origin;
        } catch {
          return false;
        }
      }));
      return matching || servers[servers.length - 1] || null;
    } catch {
      return null;
    }
  }

  function accessToken() {
    try {
      const value = client()?.accessToken?.();
      if (value) {
        return value;
      }
    } catch {
      // Use stored credentials below.
    }
    return credentials()?.AccessToken || '';
  }

  function currentUserId() {
    try {
      const value = client()?.getCurrentUserId?.();
      if (value) {
        return value;
      }
    } catch {
      // Use stored credentials below.
    }
    return credentials()?.UserId || null;
  }

  function currentServerId() {
    try {
      const value = client()?.serverId?.();
      if (value) {
        return value;
      }
    } catch {
      // Use stored credentials below.
    }
    return credentials()?.Id || '';
  }

  function baseUrl() {
    const path = location.pathname;
    const marker = path.toLowerCase().indexOf('/web/');
    if (marker >= 0) {
      return location.origin + path.slice(0, marker);
    }
    if (path.toLowerCase().endsWith('/web')) {
      return location.origin + path.slice(0, -4);
    }
    return location.origin;
  }

  function authHeaders() {
    const token = accessToken();
    return token ? {
      Authorization: `MediaBrowser Token="${token}", Client="DINKFLIX Web", Device="Browser", DeviceId="dinkflix-web", Version="${VERSION}"`
    } : {};
  }

  async function apiGet(path) {
    const response = await fetch(`${baseUrl()}${path}`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...authHeaders(),
        ...(accessToken() ? { 'X-Emby-Token': accessToken() } : {})
      }
    });
    if (!response.ok) {
      throw new Error(`GET ${path} returned HTTP ${response.status}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async function apiWrite(path, method) {
    const response = await fetch(`${baseUrl()}${path}`, {
      method,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...authHeaders(),
        ...(accessToken() ? { 'X-Emby-Token': accessToken() } : {})
      }
    });
    if (!response.ok) {
      throw new Error(`${method} ${path} returned HTTP ${response.status}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  function imageUrl(item, type = 'Primary', width = 900) {
    if (!item?.Id) {
      return '';
    }
    const tag = item?.ImageTags?.[type];
    const params = new URLSearchParams({
      maxWidth: String(width),
      quality: '87'
    });
    if (tag) {
      params.set('tag', tag);
    }
    const token = accessToken();
    if (token) {
      params.set('ApiKey', token);
    }
    return `${baseUrl()}/Items/${encodeURIComponent(item.Id)}/Images/${type}?${params.toString()}`;
  }

  function backdropUrl(item, width = 2200) {
    if (!item?.Id) {
      return '';
    }
    const tags = Array.isArray(item?.BackdropImageTags) ? item.BackdropImageTags : [];
    const backdropTag = tags[0] || item?.ImageTags?.Backdrop || '';
    const type = backdropTag ? 'Backdrop' : (item?.ImageTags?.Primary ? 'Primary' : '');
    if (!type) {
      return '';
    }
    const params = new URLSearchParams({
      maxWidth: String(width),
      quality: '86'
    });
    if (backdropTag) {
      params.set('tag', backdropTag);
    } else if (item?.ImageTags?.Primary) {
      params.set('tag', item.ImageTags.Primary);
    }
    const token = accessToken();
    if (token) {
      params.set('ApiKey', token);
    }
    const index = type === 'Backdrop' ? '/0' : '';
    return `${baseUrl()}/Items/${encodeURIComponent(item.Id)}/Images/${type}${index}?${params.toString()}`;
  }

  function parseHash() {
    const raw = decodeURIComponent(location.hash.replace(/^#/, '') || '/home');
    const separator = raw.indexOf('?');
    const path = separator >= 0 ? raw.slice(0, separator) : raw;
    const query = separator >= 0 ? raw.slice(separator + 1) : '';
    return { path: path || '/home', params: new URLSearchParams(query) };
  }

  function getRoute() {
    const { path, params } = parseHash();
    // Legacy DINKFLIX paths are migration-only.
    if (path === '/dinkflix/library') {
      return { type: 'legacy-library', viewId: params.get('viewId') };
    }
    if (path === '/dinkflix/item') {
      return { type: 'legacy-item', id: params.get('id') };
    }
    if (path === '/dinkflix/list') {
      return { type: 'legacy-list' };
    }
    if (path === '/dinkflix/search') {
      return { type: 'legacy-search', q: params.get('q') || '' };
    }
    if (path === '/dinkflix/about') {
      return { type: 'legacy-about' };
    }
    if (path === '/details' && params.get('df') === 'dinkflix') {
      return { type: 'item', id: params.get('id') };
    }
    if ((path === '/movies' || path === '/tv' || path === '/tvshows') && params.get('df') === 'dinkflix') {
      return { type: 'library', viewId: params.get('topParentId'), collectionType: params.get('collectionType') };
    }
    if (path === '/search' && params.get('df') === 'dinkflix') {
      return { type: 'search', q: params.get('q') || '' };
    }
    if (path === '/home' && params.get('df') === 'dinkflix-list') {
      return { type: 'list' };
    }
    if (path === '/home' && params.get('df') === 'library') {
      return { type: 'library', viewId: params.get('viewId') };
    }
    if (path === '/home' && params.get('df') === 'item') {
      return { type: 'item', id: params.get('id') };
    }
    if (path === '/home' && params.get('df') === 'list') {
      return { type: 'list' };
    }
    if (path === '/home' && params.get('df') === 'search') {
      return { type: 'search', q: params.get('q') || '' };
    }
    if (path === '/home' && params.get('df') === 'about') {
      return { type: 'about' };
    }
    if (path === '/home' && !params.get('tab')) {
      return { type: 'home' };
    }
    if (path === '/movies' || path === '/tv' || path === '/tvshows') {
      return { type: 'library-native', viewId: params.get('topParentId'), collectionType: params.get('collectionType') };
    }
    if (path === '/search') {
      return { type: 'search-native' };
    }
    if (path === '/video' || path === '/playback' || path === '/fullscreen' || path === '/nowplaying') {
      return { type: 'playback' };
    }
    if (path === '/dashboard' || path === '/login.html' || path.includes('login')) {
      return { type: 'admin' };
    }
    return { type: 'native' };
  }

  function setHash(path, params = {}) {
    const routeParams = { ...params };
    if (path === '/home' && routeParams.df) {
      const df = routeParams.df;
      delete routeParams.df;
      if (df === 'item') {
        path = '/details';
        routeParams.df = 'dinkflix';
      } else if (df === 'list') {
        routeParams.tab = 1;
        routeParams.df = 'dinkflix-list';
      } else if (df === 'search') {
        path = '/search';
        routeParams.df = 'dinkflix';
      } else if (df === 'about') {
        routeParams.df = 'about';
      }
    }
    const query = new URLSearchParams();
    Object.entries(routeParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, String(value));
      }
    });
    const next = `#${path}${query.toString() ? `?${query.toString()}` : ''}`;
    if (location.hash !== next) {
      location.hash = next;
      return;
    }
    renderRoute();
  }

  function nativeHash(path, params = {}) {
    setHash(path, params);
  }

  function isAdmin() {
    return !!state.user?.Policy?.IsAdministrator;
  }

  function visibleViews() {
    const excluded = new Set(['playlists', 'livetv', 'boxsets', 'channels']);
    return state.views.filter((view) => view?.Id && !excluded.has(String(view.CollectionType || '').toLowerCase()));
  }

  function labelForView(view) {
    const type = String(view?.CollectionType || '').toLowerCase();
    if (type === 'movies') {
      return 'Movies';
    }
    if (type === 'tvshows') {
      return 'TV Shows';
    }
    return view?.Name || 'Library';
  }

  function viewHref(view) {
    const type = String(view?.CollectionType || '').toLowerCase();
    const path = type === 'tvshows' ? '/tv' : '/movies';
    const params = new URLSearchParams({
      topParentId: view.Id,
      collectionType: view.CollectionType || '',
      df: 'dinkflix'
    });
    return `#${path}?${params.toString()}`;
  }

  const icons = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/>',
    movie: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8 3.5l3 4h4l-3-4M8 20.5l3-4h4l-3 4M5 9h14M5 15h14"/>',
    tv: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h4"/>',
    list: '<path d="M6 3.5h12v17l-6-3-6 3z"/><path d="M12 8v5M9.5 10.5h5"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.2"/><path d="m16 16 5 5"/>',
    user: '<circle cx="12" cy="8" r="3.1"/><path d="M5.5 20c.5-3.4 3.1-5.4 6.5-5.4s6 2 6.5 5.4"/>',
    tools: '<path d="m14.2 6.1 3.7 3.7M5 19l5.7-5.7M15.8 3.9a4 4 0 0 0-5.1 5.1l-6.2 6.2a2.1 2.1 0 1 0 3 3l6.2-6.2a4 4 0 0 0 5.1-5.1l-2.2 2.2-2.2-2.2z"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    dots: '<circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
    play: '<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 10.4v5M12 7.6h.01"/>',
    download: '<path d="M12 4v10M8 11l4 4 4-4M5 20h14"/>',
    trash: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>',
    edit: '<path d="m5 19 3.4-.7L18.7 8a2 2 0 0 0-2.8-2.8L5.6 15.5z"/>',
    image: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.3"/><path d="m5 17 4.5-4 3.3 2.6 2.5-2.3 3.7 3.7"/>',
    refresh: '<path d="M19 8a7.5 7.5 0 1 0 1 6M19 4v4h-4"/>',
    copy: '<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M5 16V6a2 2 0 0 1 2-2h8"/>',
    collection: '<path d="M5 7h10M5 12h10M5 17h7"/><path d="M18 6v8M14 10h8"/>',
    playlist: '<path d="M5 7h10M5 12h8M5 17h6"/><path d="M18 14v5M15.5 16.5H20"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="16" r="1" fill="currentColor" stroke="none"/>',
  };

  function svg(name) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.info}</svg>`;
  }

  function ensureShell() {
    if (state.shell && document.body.contains(state.shell)) {
      return state.shell;
    }
    const shell = document.createElement('main');
    shell.id = 'dinkflix-app-shell';
    document.body.appendChild(shell);
    state.shell = shell;
    shell.style.display = 'none';
    return shell;
  }

  function ensureMenuRoot() {
    if (state.menuRoot && document.body.contains(state.menuRoot)) {
      return state.menuRoot;
    }
    const root = document.createElement('div');
    root.id = 'dinkflix-menu-root';
    document.body.appendChild(root);
    state.menuRoot = root;
    return root;
  }

  function ensureToastRoot() {
    if (state.toastRoot && document.body.contains(state.toastRoot)) {
      return state.toastRoot;
    }
    const root = document.createElement('div');
    root.id = 'dinkflix-toasts';
    document.body.appendChild(root);
    state.toastRoot = root;
    return root;
  }

  function toast(message) {
    const root = ensureToastRoot();
    const item = document.createElement('div');
    item.className = 'df-toast';
    item.textContent = message;
    root.appendChild(item);
    setTimeout(() => item.remove(), 3000);
  }

  function closeMenus() {
    ensureMenuRoot().replaceChildren();
  }

  function positionMenu(menu, anchor, align = 'right') {
    if (!menu || !anchor) {
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const width = menu.offsetWidth || 292;
    const height = menu.offsetHeight || 320;
    let left = align === 'right' ? rect.right - width : rect.left;
    let top = rect.bottom + 7;
    left = Math.max(10, Math.min(left, innerWidth - width - 10));
    if (top + height > innerHeight - 10) {
      top = Math.max(10, rect.top - height - 7);
    }
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  function menuButton(label, icon, action, className = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `df-menu-item ${className}`.trim();
    button.innerHTML = `${svg(icon)}<span>${esc(label)}</span>`;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeMenus();
      action();
    });
    return button;
  }

  function menuSeparator() {
    const divider = document.createElement('div');
    divider.className = 'df-menu-sep';
    return divider;
  }

  function buildNav() {
    let nav = document.getElementById('dinkflix-nav');
    if (nav) {
      state.nav = nav;
      return nav;
    }
    nav = document.createElement('nav');
    nav.id = 'dinkflix-nav';
    nav.setAttribute('aria-label', 'DINKFLIX navigation');
    nav.innerHTML = `<div class="df-nav-inner"><a href="#/home" class="df-brand" data-df-home aria-label="DINKFLIX home"><span>DINK</span><span>FLIX</span></a><div class="df-nav-links" id="df-nav-links"></div><div class="df-nav-spacer"></div><div class="df-nav-tools"><button class="df-icon-btn" id="df-random-btn" aria-label="Surprise me" title="Surprise me">${svg('dice')}</button><button class="df-icon-btn" id="df-search-btn" aria-label="Search" title="Search">${svg('search')}</button><button class="df-icon-btn" id="df-tools-btn" aria-label="Playback and tools" title="Playback and tools">${svg('tools')}</button><button class="df-icon-btn" id="df-user-btn" aria-label="User menu" title="User menu"><span class="df-avatar" id="df-avatar">?</span></button></div></div>`;
    document.body.appendChild(nav);
    state.nav = nav;
    nav.querySelector('[data-df-home]').addEventListener('click', (event) => {
      event.preventDefault();
      setHash('/home');
    });
    nav.querySelector('#df-random-btn').addEventListener('click', randomTitle);
    nav.querySelector('#df-search-btn').addEventListener('click', () => setHash('/home', { df: 'search' }));
    nav.querySelector('#df-tools-btn').addEventListener('click', (event) => openToolsMenu(event.currentTarget));
    nav.querySelector('#df-user-btn').addEventListener('click', (event) => openUserMenu(event.currentTarget));
    return nav;
  }

  function updateNav() {
    const holder = state.nav?.querySelector('#df-nav-links');
    if (!holder) {
      return;
    }
    const route = getRoute();
    const views = [...visibleViews()].sort((a, b) => {
      const aType = String(a.CollectionType || '').toLowerCase();
      const bType = String(b.CollectionType || '').toLowerCase();
      const order = (value) => value === 'movies' ? 0 : value === 'tvshows' ? 1 : 2;
      return order(aType) - order(bType) || String(a.Name).localeCompare(String(b.Name));
    });
    const primary = views.slice(0, 5);
    const extra = views.slice(5);
    let html = `<a class="df-nav-link ${route.type === 'home' ? 'df-active' : ''}" data-nav-home href="#/home">Home</a>`;
    primary.forEach((view) => {
      const active = (route.type === 'library' || route.type === 'library-native') && route.viewId === view.Id;
      html += `<a class="df-nav-link ${active ? 'df-active' : ''}" data-nav-view="${esc(view.Id)}" href="${viewHref(view)}">${esc(labelForView(view))}</a>`;
    });
    html += `<a class="df-nav-link ${route.type === 'list' ? 'df-active' : ''}" data-nav-list href="#/dinkflix/list">My List</a>`;
    if (extra.length) {
      html += '<button class="df-nav-link" id="df-more-libraries" type="button">More</button>';
    }
    html += '<a class="df-nav-link df-native-nav" href="#/home?tab=2">Requests</a>';
    holder.innerHTML = html;
    holder.querySelector('[data-nav-home]')?.addEventListener('click', (event) => {
      event.preventDefault();
      setHash('/home');
    });
    holder.querySelector('[data-nav-list]')?.addEventListener('click', (event) => {
      event.preventDefault();
      setHash('/home', { df: 'list' });
    });
    holder.querySelector('#df-more-libraries')?.addEventListener('click', (event) => openLibrariesMenu(event.currentTarget, extra));
    holder.querySelectorAll('[data-nav-view]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const view = views.find((candidate) => candidate.Id === link.dataset.navView);
        if (view) {
          navigateToView(view);
        }
      });
    });
  }

  function navigateToView(view) {
    if (!view?.Id) {
      return;
    }
    const type = String(view.CollectionType || '').toLowerCase();
    const path = type === 'tvshows' ? '/tv' : '/movies';
    setHash(path, {
      topParentId: view.Id,
      collectionType: view.CollectionType || '',
      df: 'dinkflix'
    });
  }

  function avatar() {
    const node = state.nav?.querySelector('#df-avatar');
    if (!node) {
      return;
    }
    const imageTag = state.user?.PrimaryImageTag;
    if (!imageTag) {
      node.textContent = (String(state.user?.Name || '?').trim()[0] || '?').toUpperCase();
      return;
    }
    const params = new URLSearchParams({ tag: imageTag, maxWidth: '72' });
    const token = accessToken();
    if (token) {
      params.set('ApiKey', token);
    }
    node.innerHTML = `<img alt="" src="${esc(`${baseUrl()}/Users/${encodeURIComponent(state.userId)}/Images/Primary?${params.toString()}`)}">`;
  }

  function scrollNav() {
    state.nav?.classList.toggle('df-scrolled', window.scrollY > 16);
  }

  function openLibrariesMenu(anchor, views) {
    closeMenus();
    const menu = document.createElement('div');
    menu.className = 'df-more-menu';
    views.forEach((view) => menu.appendChild(menuButton(labelForView(view), 'movie', () => navigateToView(view))));
    ensureMenuRoot().appendChild(menu);
    positionMenu(menu, anchor);
  }

  function openToolsMenu(anchor) {
    closeMenus();
    const menu = document.createElement('div');
    menu.className = 'df-user-menu';
    menu.appendChild(menuButton('Surprise me', 'dice', randomTitle));
    menu.appendChild(menuButton('Sync Play', 'plus', () => nativeAction(/sync\s*play/i)));
    menu.appendChild(menuButton('Cast to device', 'tv', () => nativeAction(/cast|play to/i)));
    ensureMenuRoot().appendChild(menu);
    positionMenu(menu, anchor);
  }

  function openUserMenu(anchor) {
    closeMenus();
    const menu = document.createElement('div');
    menu.className = 'df-user-menu';
    menu.appendChild(menuButton('Profile', 'user', () => nativeHash('/userprofile', { userId: state.userId })));
    menu.appendChild(menuButton('Preferences', 'tools', () => nativeHash('/mypreferencesmenu')));
    menu.appendChild(menuSeparator());
    menu.appendChild(menuButton('Requests', 'plus', () => nativeHash('/home', { tab: 2 })));
    menu.appendChild(menuButton('Bookmarks', 'list', () => nativeHash('/home', { tab: 3 })));
    menu.appendChild(menuButton('Calendar', 'list', () => nativeHash('/userpluginsettings.html', { pageUrl: '/JellyfinEnhanced/calendarPage' })));
    menu.appendChild(menuButton('About DINKFLIX', 'info', () => setHash('/home', { df: 'about' })));
    if (isAdmin()) {
      menu.appendChild(menuButton('Dashboard', 'tools', () => nativeHash('/dashboard')));
    }
    menu.appendChild(menuSeparator());
    menu.appendChild(menuButton('Quick Connect', 'plus', () => nativeAction(/quick connect/i)));
    menu.appendChild(menuButton('Sign out', 'close', () => nativeAction(/sign out|logout/i), 'danger'));
    ensureMenuRoot().appendChild(menu);
    positionMenu(menu, anchor);
  }

  function nativeAction(pattern) {
    const candidates = [...document.querySelectorAll('button, a, [role="button"]')].filter((element) => !element.closest('#dinkflix-nav, #dinkflix-menu-root'));
    const target = candidates.find((element) => pattern.test(`${element.textContent || ''} ${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''}`));
    if (target) {
      target.click();
      return true;
    }
    toast('That Jellyfin action is not available on this page.');
    return false;
  }

  async function loadUser() {
    state.userId = currentUserId();
    state.serverId = currentServerId();
    if (!state.userId) {
      return false;
    }
    try {
      state.user = await apiGet(`/Users/${encodeURIComponent(state.userId)}`);
      return true;
    } catch (firstError) {
      try {
        const jellyfin = client();
        if (typeof jellyfin?.getUser === 'function') {
          const result = await jellyfin.getUser(state.userId);
          state.user = result?.Items ? result.Items[0] : result;
          if (state.user) {
            return true;
          }
        }
      } catch (secondError) {
        console.error('[DINKFLIX] User lookup failed.', firstError, secondError);
      }
      console.error('[DINKFLIX] User lookup failed.', firstError);
      return false;
    }
  }

  async function loadViews() {
    if (!state.userId) {
      return;
    }
    try {
      const result = await apiGet(`/Users/${encodeURIComponent(state.userId)}/Views`);
      state.views = Array.isArray(result) ? result : (Array.isArray(result?.Items) ? result.Items : []);
    } catch (error) {
      state.views = [];
      console.error('[DINKFLIX] Library view lookup failed.', error);
    }
  }

  async function getItems(options = {}) {
    const defaults = {
      UserId: state.userId,
      Recursive: true,
      EnableUserData: true,
      IncludeItemTypes: 'Movie,Series',
      EnableImageTypes: 'Primary,Backdrop,Thumb,Logo',
      Limit: 24,
      StartIndex: 0,
      SortBy: 'SortName',
      SortOrder: 'Ascending',
      Fields: 'PrimaryImageAspectRatio,Overview,Genres,Tags,People,MediaSources,ProviderIds,UserData,OfficialRating,CommunityRating,ProductionYear,RunTimeTicks,Width,Height,VideoRange,VideoRangeType,DateCreated,DatePlayed,ChildCount,BackdropImageTags,ImageTags'
    };
    const params = new URLSearchParams();
    Object.entries({ ...defaults, ...options }).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    try {
      const result = await apiGet(`/Users/${encodeURIComponent(state.userId)}/Items?${params.toString()}`);
      return Array.isArray(result?.Items) ? result.Items : [];
    } catch (firstError) {
      try {
        const jellyfin = client();
        if (typeof jellyfin?.getItems === 'function') {
          const result = await jellyfin.getItems(state.userId, Object.fromEntries(params.entries()));
          return Array.isArray(result) ? result : (Array.isArray(result?.Items) ? result.Items : []);
        }
      } catch (secondError) {
        console.error('[DINKFLIX] Item query failed.', firstError, secondError);
      }
      throw firstError;
    }
  }

  async function getItem(id) {
    const fields = 'PrimaryImageAspectRatio,Overview,Genres,Tags,People,MediaSources,ProviderIds,UserData,OfficialRating,CommunityRating,ProductionYear,RunTimeTicks,Width,Height,VideoRange,VideoRangeType,DateCreated,DatePlayed,ChildCount,SortName,BackdropImageTags,ImageTags';
    return apiGet(`/Users/${encodeURIComponent(state.userId)}/Items/${encodeURIComponent(id)}?Fields=${encodeURIComponent(fields)}`);
  }

  function badgeHtml(item) {
    const badges = [];
    const rating = Number(item?.CommunityRating || 0);
    if (rating) {
      badges.push(`<span class="df-badge rating">★ ${rating.toFixed(1)}</span>`);
    }
    const width = Number(item?.Width || 0);
    const height = Number(item?.Height || 0);
    if (height >= 2000 || width >= 3500) {
      badges.push('<span class="df-badge quality">4K</span>');
    } else if (height >= 1080 || width >= 1900) {
      badges.push('<span class="df-badge quality">1080p</span>');
    }
    if (item?.VideoRange || /hdr/i.test(item?.VideoRangeType || '')) {
      badges.push('<span class="df-badge hdr">HDR</span>');
    }
    if (item?.OfficialRating) {
      badges.push(`<span class="df-badge age">${esc(item.OfficialRating)}</span>`);
    }
    return badges.join('');
  }

  function tagHtml(item) {
    return (item?.Tags || []).slice(0, 2).map((tag) => `<span class="df-badge tag">${esc(tag)}</span>`).join('');
  }

  function card(item) {
    const id = item.Id;
    const title = esc(item.Name || 'Untitled');
    const playId = item.__dfResumeEpisodeId || id;
    const playable = ['Movie', 'Episode', 'Video'].includes(item.Type) || Boolean(item.__dfResumeEpisodeId);
    const meta = [fmtYear(item.ProductionYear || item.PremiereDate || item.DateCreated), humanMinutes(item.RunTimeTicks)].filter(Boolean);
    const progress = playbackPercent(item);
    const continueLabel = item.__dfContinueLabel ? `<div class="df-card-continue">${esc(item.__dfContinueLabel)}</div>` : '';
    return `<article class="df-card" data-id="${esc(id)}"><div class="df-card-media"><a href="#/details?id=${encodeURIComponent(id)}&df=dinkflix&serverId=${encodeURIComponent(state.serverId || '')}" class="df-card-link" data-df-item="${esc(id)}" aria-label="Open ${title}"></a><img loading="lazy" src="${esc(imageUrl(item, 'Primary', 900))}" alt="${title}"><button class="df-card-menu-btn" data-df-menu="${esc(id)}" type="button" aria-label="More actions for ${title}" title="More actions">${svg('dots')}</button>${playable ? `<button class="df-card-play-btn" data-df-play="${esc(playId)}" type="button" aria-label="Play ${title}" title="Play">${svg('play')}</button>` : ''}${progress > 0 ? `<div class="df-progress"><span style="width:${progress}%"></span></div>` : ''}</div><div class="df-card-content"><div class="df-card-title">${title}</div><div class="df-card-meta">${meta.map((value, index) => `${index ? '<span class="df-meta-dot">•</span>' : ''}<span>${esc(value)}</span>`).join('')}</div><div class="df-card-badges">${badgeHtml(item)}${tagHtml(item)}</div>${continueLabel}</div></article>;
  }

  function section(title, items, href = '') {
    if (!items?.length) {
      return '';
    }
    return `<section class="df-section"><div class="df-section-head"><h2 class="df-section-title">${esc(title)}</h2>${href ? `<a class="df-section-link" href="${href}">View all →</a>` : ''}</div><div class="df-row-shell"><button class="df-row-arrow df-row-prev" type="button" data-df-row-prev aria-label="Previous ${esc(title)}">‹</button><div class="df-row">${items.map(card).join('')}</div><button class="df-row-arrow df-row-next" type="button" data-df-row-next aria-label="Next ${esc(title)}">›</button></div></section>`;
  }

  function bindSectionArrows(root) {
    root.querySelectorAll('.df-row-shell').forEach((shell) => {
      const row = shell.querySelector('.df-row');
      const prev = shell.querySelector('[data-df-row-prev]');
      const next = shell.querySelector('[data-df-row-next]');
      if (!row || !prev || !next || shell.dataset.bound === '1') {
        return;
      }
      shell.dataset.bound = '1';
      const update = () => {
        const max = Math.max(0, row.scrollWidth - row.clientWidth);
        prev.disabled = row.scrollLeft <= 4;
        next.disabled = row.scrollLeft >= max - 4;
        shell.classList.toggle('df-has-overflow', max > 4);
      };
      prev.addEventListener('click', () => row.scrollBy({ left: -row.clientWidth, behavior: 'smooth' }));
      next.addEventListener('click', () => row.scrollBy({ left: row.clientWidth, behavior: 'smooth' }));
      row.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      requestAnimationFrame(update);
    });
  }

  function rememberItems(items) {
    (items || []).forEach((item) => state.cardData.set(item.Id, item));
  }

  function bindCardActions(root) {
    rememberItems([...root.querySelectorAll('.df-card')].map((node) => state.cardData.get(node.dataset.id)).filter(Boolean));
    root.querySelectorAll('[data-df-item]').forEach((anchor) => {
      if (anchor.dataset.bound === '1') {
        return;
      }
      anchor.dataset.bound = '1';
      anchor.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setHash('/details', { df: 'dinkflix', id: anchor.dataset.dfItem, serverId: state.serverId });
      });
    });
    root.querySelectorAll('[data-df-menu]').forEach((button) => {
      if (button.dataset.bound === '1') {
        return;
      }
      button.dataset.bound = '1';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openCardMenu(button, button.dataset.dfMenu);
      });
    });
    root.querySelectorAll('[data-df-play]').forEach((button) => {
      if (button.dataset.bound === '1') {
        return;
      }
      button.dataset.bound = '1';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const item = state.cardData.get(button.dataset.dfPlay);
        if (item) {
          playItem(item);
        }
      });
    });
  }

  async function randomTitle() {
    try {
      const items = await getItems({ IncludeItemTypes: 'Movie,Series', Limit: 100, SortBy: 'DateCreated', SortOrder: 'Descending' });
      if (items.length) {
        rememberItems(items);
        setHash('/details', { df: 'dinkflix', id: items[Math.floor(Math.random() * items.length)].Id, serverId: state.serverId });
      }
    } catch {
      toast('Could not choose a random title.');
    }
  }

  async function toggleFavorite(item) {
    const favorite = !!item?.UserData?.IsFavorite;
    await apiWrite(`/Users/${encodeURIComponent(state.userId)}/FavoriteItems/${encodeURIComponent(item.Id)}`, favorite ? 'DELETE' : 'POST');
    item.UserData = item.UserData || {};
    item.UserData.IsFavorite = !favorite;
    state.cardData.set(item.Id, item);
    toast(favorite ? 'Removed from My List.' : 'Added to My List.');
  }

  async function playItem(item) {
    try {
      const manager = window.playbackManager;
      if (manager?.play) {
        await manager.play({ items: [item], fullscreen: true, enableRemotePlayers: true });
        return;
      }
    } catch (error) {
      console.warn('[DINKFLIX] playbackManager failed.', error);
    }
    sessionStorage.setItem('dinkflix-autoplay', item.Id);
    nativeHash('/details', { id: item.Id, serverId: state.serverId, dfnative: 1 });
  }

  function autoPlayFallback() {
    const id = sessionStorage.getItem('dinkflix-autoplay');
    if (!id) {
      return;
    }
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      const buttons = [...document.querySelectorAll('button, a, [role="button"]')];
      const playButton = buttons.find((button) => /^(play|resume)$/i.test(String(button.textContent || '').trim()) || /\bplay\b/i.test(button.getAttribute('aria-label') || ''));
      if (playButton) {
        sessionStorage.removeItem('dinkflix-autoplay');
        clearInterval(timer);
        playButton.click();
      }
      if (attempts > 24) {
        clearInterval(timer);
      }
    }, 400);
  }

  async function openCardMenu(anchor, id) {
    closeMenus();
    const item = state.cardData.get(id) || await getItem(id).catch(() => null);
    if (!item) {
      toast('Unable to load that title.');
      return;
    }
    state.cardData.set(item.Id, item);
    const menu = document.createElement('div');
    menu.className = 'df-context-menu';
    menu.appendChild(menuButton('Play', 'play', () => playItem(item)));
    menu.appendChild(menuButton('Play all from here', 'play', () => playFromHere(item)));
    menu.appendChild(menuSeparator());
    menu.appendChild(menuButton(item.UserData?.IsFavorite ? 'Remove from My List' : 'Add to My List', 'plus', () => toggleFavorite(item)));
    menu.appendChild(menuButton('Add to collection', 'collection', () => chooseCollection(item)));
    menu.appendChild(menuButton('Add to playlist', 'playlist', () => choosePlaylist(item)));
    if (['Movie', 'Video', 'Episode'].includes(item.Type)) {
      menu.appendChild(menuButton('Download', 'download', () => downloadItem(item)));
      menu.appendChild(menuButton('Copy Stream URL', 'copy', () => copyStreamUrl(item)));
    }
    if (isAdmin()) {
      menu.appendChild(menuButton('Delete media', 'trash', () => deleteMedia(item), 'danger'));
      menu.appendChild(menuSeparator());
      menu.appendChild(menuButton('Edit metadata', 'edit', () => nativeHash('/details', { id: item.Id, serverId: state.serverId, dfnative: 1 })));
      menu.appendChild(menuButton('Edit images', 'image', () => nativeHash('/details', { id: item.Id, serverId: state.serverId, dfnative: 1 })));
      menu.appendChild(menuButton('Edit subtitles', 'edit', () => nativeHash('/details', { id: item.Id, serverId: state.serverId, dfnative: 1 })));
      menu.appendChild(menuButton('Identify', 'edit', () => nativeHash('/details', { id: item.Id, serverId: state.serverId, dfnative: 1 })));
      menu.appendChild(menuButton('Media Info', 'info', () => showMediaInfo(item)));
      menu.appendChild(menuButton('Refresh metadata', 'refresh', () => refreshMetadata(item)));
    } else {
      menu.appendChild(menuSeparator());
      menu.appendChild(menuButton('Media Info', 'info', () => showMediaInfo(item)));
    }
    ensureMenuRoot().appendChild(menu);
    positionMenu(menu, anchor);
  }

  function downloadItem(item) {
    const params = new URLSearchParams();
    const token = accessToken();
    if (token) {
      params.set('ApiKey', token);
    }
    window.open(`${baseUrl()}/Items/${encodeURIComponent(item.Id)}/Download${params.toString() ? `?${params.toString()}` : ''}`, '_blank', 'noopener');
  }

  async function copyStreamUrl(item) {
    const params = new URLSearchParams({ Static: 'true' });
    const token = accessToken();
    if (token) {
      params.set('ApiKey', token);
    }
    const url = `${baseUrl()}/Videos/${encodeURIComponent(item.Id)}/stream?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('Stream URL copied.');
    } catch {
      toast('Could not copy the stream URL.');
    }
  }

  async function deleteMedia(item) {
    if (!confirm(`Delete “${item.Name}” from Jellyfin?\n\nThis removes the media from the server library.`)) {
      return;
    }
    try {
      await apiWrite(`/Items/${encodeURIComponent(item.Id)}`, 'DELETE');
      toast('Media deleted.');
      setTimeout(renderRoute, 250);
    } catch {
      toast('Delete failed.');
    }
  }

  async function refreshMetadata(item) {
    try {
      await apiWrite(`/Items/${encodeURIComponent(item.Id)}/Refresh`, 'POST');
      toast('Metadata refresh started.');
    } catch {
      toast('Could not refresh metadata.');
    }
  }

  function showMediaInfo(item) {
    closeMenus();
    const backdrop = document.createElement('div');
    backdrop.className = 'df-modal-backdrop';
    backdrop.innerHTML = `<section class="df-modal" role="dialog" aria-modal="true"><header class="df-modal-head"><h2 class="df-modal-title">Media Info · ${esc(item.Name)}</h2><button class="df-icon-btn" data-close aria-label="Close">${svg('close')}</button></header><div class="df-modal-body"><table class="df-info-table"><tbody><tr><td>Type</td><td>${esc(item.Type || '—')}</td></tr><tr><td>Resolution</td><td>${item.Width && item.Height ? `${item.Width} × ${item.Height}` : '—'}</td></tr><tr><td>Video</td><td>${esc(item.VideoRange || item.VideoRangeType || '—')}</td></tr><tr><td>Official rating</td><td>${esc(item.OfficialRating || '—')}</td></tr><tr><td>Community rating</td><td>${item.CommunityRating ? Number(item.CommunityRating).toFixed(1) : '—'}</td></tr><tr><td>Genres</td><td>${esc((item.Genres || []).join(', ') || '—')}</td></tr><tr><td>Tags</td><td>${esc((item.Tags || []).join(', ') || '—')}</td></tr></tbody></table></div></section>`;
    backdrop.querySelector('[data-close]').addEventListener('click', () => backdrop.remove());
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        backdrop.remove();
      }
    });
    ensureMenuRoot().appendChild(backdrop);
  }

  async function getPickerItems(type) {
    return getItems({ IncludeItemTypes: type, Recursive: true, Limit: 120, SortBy: 'SortName', SortOrder: 'Ascending' });
  }

  async function openPicker(title, items, onChoose) {
    closeMenus();
    const backdrop = document.createElement('div');
    backdrop.className = 'df-modal-backdrop';
    backdrop.innerHTML = `<section class="df-modal df-picker-modal" role="dialog" aria-modal="true"><header class="df-modal-head"><div><h2 class="df-modal-title">${esc(title)}</h2><div class="df-picker-subtitle">Choose a destination.</div></div><button class="df-icon-btn" data-close aria-label="Close">${svg('close')}</button></header><div class="df-modal-body"><div class="df-picker-list" data-picker-list></div></div></section>`;
    const list = backdrop.querySelector('[data-picker-list]');
    list.innerHTML = items.length ? items.map((item) => `<button class="df-picker-option" data-picker-id="${esc(item.Id)}" type="button"><span>${esc(item.Name)}</span><span>›</span></button>`).join('') : '<div class="df-empty">Nothing available.</div>';
    backdrop.querySelector('[data-close]').addEventListener('click', () => backdrop.remove());
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) {
        backdrop.remove();
      }
    });
    list.querySelectorAll('[data-picker-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          await onChoose(button.dataset.pickerId);
          backdrop.remove();
        } catch {
          toast('That action could not be completed.');
        }
      });
    });
    ensureMenuRoot().appendChild(backdrop);
  }

  async function chooseCollection(item) {
    const collections = await getPickerItems('BoxSet').catch(() => []);
    await openPicker('Add to collection', collections, async (collectionId) => {
      await apiWrite(`/Collections/${encodeURIComponent(collectionId)}/Items?Ids=${encodeURIComponent(item.Id)}`, 'POST');
      toast('Added to collection.');
    });
  }

  async function choosePlaylist(item) {
    const playlists = await getPickerItems('Playlist').catch(() => []);
    await openPicker('Add to playlist', playlists, async (playlistId) => {
      await apiWrite(`/Playlists/${encodeURIComponent(playlistId)}/Items?Ids=${encodeURIComponent(item.Id)}&UserId=${encodeURIComponent(state.userId)}`, 'POST');
      toast('Added to playlist.');
    });
  }

  async function playFromHere(item) {
    if (item.Type === 'Series') {
      try {
        const episodes = await getItems({ ParentId: item.Id, IncludeItemTypes: 'Episode', Limit: 200, SortBy: 'ParentIndexNumber,IndexNumber', SortOrder: 'Ascending', Fields: 'UserData,RunTimeTicks,MediaSources' });
        rememberItems(episodes);
        const next = episodes.find((episode) => !episode.UserData?.Played) || episodes[0];
        if (next) {
          await playItem(next);
          return;
        }
      } catch {
        // Fall back to playing the selected item.
      }
    }
    await playItem(item);
  }

  function markReady() {
    if (!state.shell || !state.shell.childElementCount) {
      return;
    }
    state.shell.style.display = 'block';
    document.body.classList.add('df-df-ready');
  }

  function fallbackToNative(message) {
    document.body.classList.remove('df-df-ready');
    document.body.classList.remove('df-df-active');
    state.custom = false;
    state.shell?.replaceChildren();
    if (state.shell) {
      state.shell.style.display = 'none';
    }
    closeMenus();
    if (message) {
      toast(message);
    }
  }

  function setBodyForRoute(route) {
    const custom = ['home', 'library', 'library-native', 'item', 'search', 'list', 'about'].includes(route.type);
    const playback = route.type === 'playback';
    const admin = route.type === 'admin';
    state.custom = custom;
    document.body.classList.toggle('df-df-active', custom);
    document.body.classList.remove('df-df-ready');
    document.body.classList.toggle('df-df-native-public', !custom && !admin && !playback);
    document.body.classList.toggle('df-df-native-playback', playback);
    document.body.classList.toggle('df-df-admin', admin);
    if (!custom) {
      state.shell?.replaceChildren();
    }
    if (!playback) {
      document.getElementById('dinkflix-playback-overlay')?.remove();
    }
  }

  async function renderHome() {
    const shell = ensureShell();
    shell.innerHTML = '<div class="df-home-loading"><div class="df-loading-line"></div><div class="df-loading-line short"></div></div>';
    try {
      const results = await Promise.allSettled([
        getItems({ IncludeItemTypes: 'Movie,Series', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 24 }),
        getItems({ IncludeItemTypes: 'Movie,Episode', IsResumable: true, SortBy: 'DatePlayed', SortOrder: 'Descending', Limit: 16 }),
        getItems({ IncludeItemTypes: 'Movie,Series', IsPlayed: true, SortBy: 'DatePlayed', SortOrder: 'Descending', Limit: 16 }),
        getItems({ IncludeItemTypes: 'Movie,Series', IsFavorite: true, SortBy: 'SortName', SortOrder: 'Ascending', Limit: 16 }),
        getItems({ IncludeItemTypes: 'Movie', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 16 }),
        getItems({ IncludeItemTypes: 'Series', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 16 })
      ]);
      if (!results.some((result) => result.status === 'fulfilled' && Array.isArray(result.value) && result.value.length)) {
        throw new Error('No Jellyfin media results were available.');
      }
      const value = (index) => results[index].status === 'fulfilled' ? results[index].value : [];
      const recent = value(0);
      const resume = value(1);
      const played = value(2);
      const favs = value(3);
      const movies = value(4);
      const shows = value(5);
      rememberItems([...recent, ...resume, ...played, ...favs, ...movies, ...shows]);
      state.heroItems = recent.filter((item) => item.BackdropImageTags?.length || item.ImageTags?.Backdrop || item.ImageTags?.Primary).slice(0, 8);
      const movieView = visibleViews().find((view) => String(view.CollectionType || '').toLowerCase() === 'movies');
      const showView = visibleViews().find((view) => String(view.CollectionType || '').toLowerCase() === 'tvshows');
      shell.innerHTML = `<div class="df-hero" id="df-hero"><div class="df-hero-media" id="df-hero-media"></div><div class="df-hero-overlay"></div><div class="df-hero-content" id="df-hero-content"></div><div class="df-hero-dots" id="df-hero-dots"></div></div><div class="df-page">${section('Continue Watching', resume)}${section('Recently Played', played)}${section('Recently Added', recent)}${section('Movies', movies, movieView ? viewHref(movieView) : '')}${section('TV Shows', shows, showView ? viewHref(showView) : '')}${section('My List', favs, '#/dinkflix/list')}</div>`;
      bindCardActions(shell);
      bindSectionArrows(shell);
      if (state.heroItems.length) {
        showHero(0);
      } else {
        shell.querySelector('#df-hero')?.remove();
      }
      markReady();
    } catch (error) {
      console.error('[DINKFLIX] Home render failed.', error);
      fallbackToNative('DINKFLIX could not load the homepage; showing Jellyfin instead.');
    }
  }

  function showHero(index) {
    const item = state.heroItems[index];
    const hero = document.getElementById('df-hero');
    const media = document.getElementById('df-hero-media');
    const content = document.getElementById('df-hero-content');
    const dots = document.getElementById('df-hero-dots');
    if (!item || !hero || !media || !content || !dots) {
      return;
    }
    state.heroIndex = index;
    media.style.backgroundImage = `url("${backdropUrl(item, 2200)}")`;
    content.innerHTML = `<div class="df-hero-eyebrow">Recently added</div><h1 class="df-hero-title">${esc(item.Name)}</h1><div class="df-hero-meta"><span>${esc(fmtYear(item.ProductionYear || item.PremiereDate || item.DateCreated))}</span><span>•</span><span>${esc(item.Type === 'Series' ? 'TV Series' : 'Movie')}</span>${badgeHtml(item)}</div><p class="df-hero-overview">${esc(item.Overview || '')}</p><div class="df-actions"><button class="df-button df-button-primary" id="df-hero-play" type="button">${svg('play')} Play</button><button class="df-button df-button-secondary" id="df-hero-info" type="button">More info</button><button class="df-button df-button-secondary" id="df-hero-list" type="button">${item.UserData?.IsFavorite ? '✓ In My List' : '＋ My List'}</button></div>`;
    dots.innerHTML = state.heroItems.map((_, dotIndex) => `<button type="button" class="df-hero-dot ${dotIndex === index ? 'df-current' : ''}" data-hero-index="${dotIndex}" aria-label="Featured title ${dotIndex + 1}"></button>`).join('');
    content.querySelector('#df-hero-play').addEventListener('click', () => playItem(item));
    content.querySelector('#df-hero-info').addEventListener('click', () => setHash('/home', { df: 'item', id: item.Id }));
    content.querySelector('#df-hero-list').addEventListener('click', async () => {
      try {
        await toggleFavorite(item);
        showHero(index);
      } catch {
        toast('Could not update My List.');
      }
    });
    dots.querySelectorAll('[data-hero-index]').forEach((dot) => dot.addEventListener('click', () => {
      stopHero();
      showHero(Number(dot.dataset.heroIndex));
      startHero();
    }));
    hero.onmouseenter = () => { state.heroPaused = true; };
    hero.onmouseleave = () => { state.heroPaused = false; };
    hero.onfocusin = () => { state.heroPaused = true; };
    hero.onfocusout = () => { state.heroPaused = false; };
    hero.classList.add('df-ready');
  }

  function startHero() {
    stopHero();
    if (state.heroItems.length < 2) {
      return;
    }
    state.heroTimer = setInterval(() => {
      if (!state.heroPaused && !document.hidden) {
        showHero((state.heroIndex + 1) % state.heroItems.length);
      }
    }, 14000);
  }

  function stopHero() {
    if (state.heroTimer) {
      clearInterval(state.heroTimer);
      state.heroTimer = null;
    }
  }

  async function renderLibrary(route) {
    const shell = ensureShell();
    const view = state.views.find((candidate) => candidate.Id === route.viewId);
    const title = view ? labelForView(view) : (String(route.collectionType || '').toLowerCase() === 'tvshows' ? 'TV Shows' : 'Movies');
    shell.innerHTML = `<div class="df-page"><header class="df-page-header"><div><div class="df-kicker">Library</div><h1 class="df-title">${esc(title)}</h1></div></header><div class="df-library-toolbar"><input id="df-lib-search" class="df-input df-grow" type="search" placeholder="Search this library…"><select id="df-lib-sort" class="df-select"><option value="SortName">A–Z</option><option value="DateCreated">Recently added</option><option value="CommunityRating">Rating</option><option value="ProductionYear">Year</option></select><button class="df-chip df-selected" data-filter="all" type="button">All</button><button class="df-chip" data-filter="quality" type="button">4K</button><button class="df-chip" data-filter="hdr" type="button">HDR</button></div><div class="df-grid" id="df-lib-grid"><div class="df-empty" style="grid-column:1/-1">Loading…</div></div></div>`;
    try {
      const type = String(view?.CollectionType || route.collectionType || '').toLowerCase();
      const include = type === 'movies' ? 'Movie' : type === 'tvshows' ? 'Series' : 'Movie,Series,Video,Audio,Book,Photo,MusicAlbum';
      const items = await getItems({ ParentId: route.viewId, IncludeItemTypes: include, Limit: 300, SortBy: 'SortName', SortOrder: 'Ascending' });
      rememberItems(items);
      renderLibraryGrid(items, shell);
      const search = shell.querySelector('#df-lib-search');
      const sort = shell.querySelector('#df-lib-sort');
      search.addEventListener('input', () => renderLibraryGrid(items, shell));
      sort.addEventListener('change', () => renderLibraryGrid(items, shell));
      shell.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
        shell.querySelectorAll('[data-filter]').forEach((candidate) => candidate.classList.remove('df-selected'));
        button.classList.add('df-selected');
        renderLibraryGrid(items, shell, button.dataset.filter);
      }));
      markReady();
    } catch (error) {
      console.error('[DINKFLIX] Library render failed.', error);
      fallbackToNative('DINKFLIX could not load this library; showing Jellyfin instead.');
    }
  }

  function renderLibraryGrid(items, shell, filter = 'all') {
    const query = (shell.querySelector('#df-lib-search')?.value || '').trim().toLowerCase();
    const sort = shell.querySelector('#df-lib-sort')?.value || 'SortName';
    let filtered = items.filter((item) => !query || [item.Name, ...(item.Genres || []), ...(item.Tags || [])].some((value) => String(value).toLowerCase().includes(query)));
    if (filter === 'quality') {
      filtered = filtered.filter((item) => Number(item.Height || 0) >= 2000 || Number(item.Width || 0) >= 3500);
    }
    if (filter === 'hdr') {
      filtered = filtered.filter((item) => item.VideoRange || /hdr/i.test(item.VideoRangeType || ''));
    }
    filtered = [...filtered].sort((a, b) => {
      if (sort === 'CommunityRating') {
        return Number(b.CommunityRating || 0) - Number(a.CommunityRating || 0);
      }
      if (sort === 'ProductionYear') {
        return Number(b.ProductionYear || 0) - Number(a.ProductionYear || 0);
      }
      if (sort === 'DateCreated') {
        return String(b.DateCreated || '').localeCompare(String(a.DateCreated || ''));
      }
      return String(a.SortName || a.Name).localeCompare(String(b.SortName || b.Name));
    });
    const grid = shell.querySelector('#df-lib-grid');
    grid.innerHTML = filtered.length ? filtered.map(card).join('') : '<div class="df-empty" style="grid-column:1/-1">Nothing matched.</div>';
    bindCardActions(grid);
  }

  async function renderItem(id) {
    const shell = ensureShell();
    shell.innerHTML = '<div class="df-page"><div class="df-empty">Loading title…</div></div>';
    let item;
    try {
      item = await getItem(id);
    } catch (error) {
      console.error('[DINKFLIX] Item lookup failed.', error);
      fallbackToNative('DINKFLIX could not load that title; showing Jellyfin instead.');
      return;
    }
    if (!item) {
      fallbackToNative('DINKFLIX could not load that title; showing Jellyfin instead.');
      return;
    }
    state.cardData.set(item.Id, item);
    const kind = item.Type === 'Series' ? 'TV Series' : item.Type === 'Season' ? 'Season' : item.Type === 'Episode' ? 'Episode' : 'Movie';
    const cast = (item.People || []).filter((person) => person?.PersonId).slice(0, 10);
    const background = backdropUrl(item, 2400);
    const poster = imageUrl(item, 'Primary', 900);
    let childItems = [];
    if (item.Type === 'Series') {
      childItems = await getItems({ ParentId: item.Id, IncludeItemTypes: 'Season', Limit: 80, SortBy: 'IndexNumber', SortOrder: 'Ascending', Fields: 'PrimaryImageAspectRatio,Overview,UserData,ProductionYear,PremiereDate,IndexNumber,ChildCount,ImageTags,BackdropImageTags' }).catch(() => []);
    }
    if (item.Type === 'Season') {
      childItems = await getItems({ ParentId: item.Id, IncludeItemTypes: 'Episode', Limit: 200, SortBy: 'IndexNumber', SortOrder: 'Ascending', Fields: 'PrimaryImageAspectRatio,Overview,UserData,ProductionYear,PremiereDate,IndexNumber,ParentIndexNumber,RunTimeTicks,ImageTags,BackdropImageTags,Width,Height,VideoRange,VideoRangeType,CommunityRating,OfficialRating,Tags,Genres' }).catch(() => []);
    }
    rememberItems(childItems);
    const children = item.Type === 'Season' ? `<section class="df-detail-section"><div class="df-section-head"><h2 class="df-section-title">Episodes</h2></div><div class="df-detail-episodes">${childItems.map((episode) => `<button class="df-episode-row" type="button" data-df-episode="${esc(episode.Id)}"><span class="df-episode-number">${esc(String(episode.IndexNumber ?? '').padStart(2, '0'))}</span><span class="df-episode-copy"><strong>${esc(episode.Name || 'Episode')}</strong><small>${esc(episode.Overview || '')}</small></span><span class="df-episode-time">${esc(humanMinutes(episode.RunTimeTicks))}</span></button>`).join('')}</div></section>` : item.Type === 'Series' ? `<section class="df-detail-section"><div class="df-section-head"><h2 class="df-section-title">Seasons</h2></div><div class="df-row">${childItems.map(card).join('')}</div></section>` : '';
    shell.innerHTML = `<article class="df-detail"><div class="df-detail-bg" style="background-image:url('${esc(background)}')"></div><div class="df-detail-vignette"></div><div class="df-detail-content"><div class="df-detail-poster"><img loading="eager" src="${esc(poster)}" alt="${esc(item.Name)}"></div><div><div class="df-kicker">${esc(kind)}</div><h1 class="df-detail-title">${esc(item.Name)}</h1><div class="df-detail-meta"><span>${esc(fmtYear(item.ProductionYear || item.PremiereDate || item.DateCreated))}</span>${humanMinutes(item.RunTimeTicks) ? `<span>•</span><span>${humanMinutes(item.RunTimeTicks)}</span>` : ''}${badgeHtml(item)}</div><div class="df-detail-tags">${(item.Genres || []).slice(0, 5).map((genre) => `<span class="df-badge tag">${esc(genre)}</span>`).join('')}${tagHtml(item)}</div><p class="df-detail-overview">${esc(item.Overview || 'No overview available.')}</p><div class="df-actions"><button class="df-button df-button-primary" id="df-detail-play" type="button">${svg('play')} ${item.UserData?.PlaybackPositionTicks ? 'Resume' : 'Play'}</button><button class="df-button df-button-secondary" id="df-detail-list" type="button">${item.UserData?.IsFavorite ? '✓ In My List' : '＋ My List'}</button><button class="df-button df-button-secondary" id="df-detail-more" type="button">${svg('dots')} More</button></div>${children}${cast.length ? `<div class="df-detail-cast"><h3>Cast</h3><div class="df-cast-row">${cast.map((person) => `<div class="df-cast"><img loading="lazy" src="${esc(person.PrimaryImageTag ? `${baseUrl()}/Persons/${encodeURIComponent(person.PersonId)}/Images/Primary?tag=${encodeURIComponent(person.PrimaryImageTag)}&maxWidth=168` : '')}" alt="${esc(person.Name || '')}"><div class="df-cast-name">${esc(person.Name || '')}</div></div>`).join('')}</div></div>` : ''}</div></div></article>`;
    shell.querySelector('#df-detail-play').addEventListener('click', () => playItem(item));
    shell.querySelector('#df-detail-list').addEventListener('click', async () => {
      try {
        await toggleFavorite(item);
        renderItem(item.Id);
      } catch {
        toast('Could not update My List.');
      }
    });
    shell.querySelector('#df-detail-more').addEventListener('click', (event) => openCardMenu(event.currentTarget, item.Id));
    shell.querySelectorAll('[data-df-episode]').forEach((button) => button.addEventListener('click', () => {
      const episode = state.cardData.get(button.dataset.dfEpisode);
      if (episode) {
        playItem(episode);
      }
    }));
    bindCardActions(shell);
    markReady();
  }

  async function renderList() {
    const shell = ensureShell();
    shell.innerHTML = '<div class="df-page"><header class="df-page-header"><div><div class="df-kicker">Your list</div><h1 class="df-title">My List</h1></div></header><div class="df-grid" id="df-list-grid"><div class="df-empty" style="grid-column:1/-1">Loading…</div></div></div>';
    try {
      const items = await getItems({ IncludeItemTypes: 'Movie,Series', IsFavorite: true, Limit: 200, SortBy: 'SortName', SortOrder: 'Ascending' });
      rememberItems(items);
      shell.querySelector('#df-list-grid').innerHTML = items.length ? items.map(card).join('') : '<div class="df-empty" style="grid-column:1/-1">Your list is empty.</div>';
      bindCardActions(shell);
      markReady();
    } catch {
      fallbackToNative('DINKFLIX could not load My List; showing Jellyfin instead.');
    }
  }

  async function renderSearch(query) {
    const shell = ensureShell();
    shell.innerHTML = `<div class="df-page df-search"><header class="df-page-header"><div><div class="df-kicker">Search</div><h1 class="df-title">Find something to watch</h1></div></header><form class="df-search-bar" id="df-search-form"><input class="df-input df-grow" id="df-search-input" value="${esc(query)}" type="search" placeholder="Title, genre or tag…" autofocus><button class="df-button df-button-primary" type="submit">Search</button></form><p class="df-copy" id="df-search-note"></p><div class="df-grid" id="df-search-grid"></div></div>`;
    const form = shell.querySelector('#df-search-form');
    const input = shell.querySelector('#df-search-input');
    const run = async () => {
      const term = input.value.trim();
      if (!term) {
        shell.querySelector('#df-search-note').textContent = '';
        shell.querySelector('#df-search-grid').innerHTML = '';
        return;
      }
      try {
        const items = await getItems({ SearchTerm: term, IncludeItemTypes: 'Movie,Series', Limit: 200, SortBy: 'SortName', SortOrder: 'Ascending' });
        rememberItems(items);
        shell.querySelector('#df-search-note').textContent = `${items.length} result${items.length === 1 ? '' : 's'} for “${term}”`;
        shell.querySelector('#df-search-grid').innerHTML = items.length ? items.map(card).join('') : '<div class="df-empty" style="grid-column:1/-1">No titles matched.</div>';
        bindCardActions(shell);
      } catch {
        shell.querySelector('#df-search-note').textContent = 'Search failed.';
      }
    };
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      setHash('/home', { df: 'search', q: input.value.trim() });
    });
    if (query) {
      await run();
    }
    markReady();
  }

  function renderAbout() {
    const shell = ensureShell();
    shell.innerHTML = `<div class="df-page"><header class="df-page-header"><div><div class="df-kicker">The project</div><h1 class="df-title">About DINKFLIX</h1><p class="df-copy">DINKFLIX began as a simple idea: make a personal Jellyfin server feel like a streaming service people actually enjoy using.</p></div></header><section class="df-about-grid"><div class="df-about-image"><span>DINKFLIX</span><small>About image / project artwork</small></div><div><h2>Built for friends and family.</h2><p class="df-copy">The goal is not to hide Jellyfin’s power. It is to make that power feel effortless: clearer discovery, better hierarchy, fewer distractions and a visual identity that belongs to DINKFLIX.</p><p class="df-copy">Fast over flashy. Clear over clever. Familiar enough for guests, distinctive enough to feel like home.</p><p class="df-copy">DINKFLIX stays focused on the web experience while Jellyfin continues to handle the hard parts underneath.</p></div></section></div>`;
    markReady();
  }

  function migrateLegacyOuterQuery() {
    const params = new URLSearchParams(location.search);
    const legacy = params.get('df');
    if (!legacy) {
      return;
    }
    params.delete('df');
    const next = `${location.pathname}${params.toString() ? `?${params.toString()}` : ''}${location.hash}`;
    history.replaceState(history.state, '', next);
    if (legacy === 'movies') {
      const view = visibleViews().find((candidate) => String(candidate.CollectionType || '').toLowerCase() === 'movies');
      if (view) {
        navigateToView(view);
      }
    } else if (legacy === 'shows') {
      const view = visibleViews().find((candidate) => String(candidate.CollectionType || '').toLowerCase() === 'tvshows');
      if (view) {
        navigateToView(view);
      }
    } else if (legacy === 'list') {
      setHash('/home', { df: 'list' });
    } else if (legacy === 'search') {
      setHash('/home', { df: 'search' });
    }
  }

  function normalizeLegacyHash() {
    const { path, params } = parseHash();
    const df = params.get('df');
    if (path !== '/home' || !df) {
      return;
    }
    const routeMap = {
      library: '/dinkflix/library',
      item: '/dinkflix/item',
      list: '/dinkflix/list',
      search: '/dinkflix/search',
      about: '/dinkflix/about'
    };
    const target = routeMap[df];
    if (!target) {
      return;
    }
    params.delete('df');
    const query = params.toString();
    history.replaceState(history.state, '', `${location.pathname}${location.search}#${target}${query ? `?${query}` : ''}`);
  }

  function bindGlobal() {
    if (!state.scrollBound) {
      window.addEventListener('scroll', scrollNav, { passive: true });
      state.scrollBound = true;
    }
    if (!state.hashBound) {
      window.addEventListener('hashchange', () => setTimeout(renderRoute, 10));
      window.addEventListener('popstate', () => setTimeout(renderRoute, 10));
      document.addEventListener('click', (event) => {
        if (!event.target.closest('#dinkflix-menu-root, #dinkflix-nav')) {
          closeMenus();
        }
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeMenus();
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          state.heroPaused = true;
        } else {
          state.heroPaused = false;
        }
      });
      state.hashBound = true;
    }
  }

  async function renderRoute() {
    const route = getRoute();
    const key = location.hash;
    if (state.renderKey === key && state.custom && document.body.classList.contains('df-df-ready') && state.shell?.childElementCount) {
      return;
    }
    state.renderKey = key;
    state.route = route;
    stopHero();
    closeMenus();
    setBodyForRoute(route);
    buildNav();
    updateNav();
    avatar();
    if (route.type === 'home') {
      await renderHome();
      startHero();
    } else if (route.type === 'library' || route.type === 'library-native') {
      await renderLibrary(route);
    } else if (route.type === 'item') {
      await renderItem(route.id);
    } else if (route.type === 'list') {
      await renderList();
    } else if (route.type === 'search') {
      await renderSearch(route.q);
    } else if (route.type === 'about') {
      renderAbout();
    } else if (route.type === 'playback') {
      autoPlayFallback();
    }
  }

  function sessionReady() {
    return !!client() || !!credentials();
  }

  async function waitForJellyfin(timeout = 12000) {
    const started = Date.now();
    while (!sessionReady() && Date.now() - started < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return sessionReady();
  }

  async function boot() {
    if (document.body.dataset.dinkflixBooted === '1') {
      return;
    }
    document.body.dataset.dinkflixBooted = '1';
    await waitForJellyfin();
    if (!await loadUser()) {
      document.body.dataset.dinkflixBooted = '0';
      setTimeout(boot, 700);
      return;
    }
    await loadViews();
    migrateLegacyOuterQuery();
    normalizeLegacyHash();
    buildNav();
    bindGlobal();
    await renderRoute();
    setInterval(async () => {
      await loadViews();
      updateNav();
    }, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    setTimeout(boot, 100);
  }
})();
