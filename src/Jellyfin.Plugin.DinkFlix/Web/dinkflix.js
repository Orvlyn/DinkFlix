/* DINKFLIX Web 6.0.0 — Jellyfin 12.1 desktop web experience. */
/* jshint esversion: 2021, asi: false, undef: true, unused: false */
(function () {
  'use strict';

  if (window.__DINKFLIX_WEB_810__) {
    return;
  }
  window.__DINKFLIX_WEB_810__ = true;

  var VERSION = '8.1.0.1';
  var PLUGIN_ID = 'B4A9D4E6-4E4D-4F42-9E90-9C5B4D4B8D2B';
  var state = {
    user: null,
    userId: '',
    accessToken: '',
    serverId: '',
    views: [],
    nav: null,
    root: null,
    menuRoot: null,
    modalRoot: null,
    boot: null,
    routeCover: null,
    heroItems: [],
    heroIndex: 0,
    heroTimer: null,
    heroPaused: false,
    rowPages: Object.create(null),
    cardData: new Map(),
    resumeEpisodes: new Map(),
    lastRoute: '',
    customRouteActive: false,
    nativeAction: false,
    selectionMode: false,
    selectedIds: new Set(),
    started: false,
    navObserver: null
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function safeText(value) {
    return String(value == null ? '' : value);
  }

  function getCredentials() {
    try {
      var raw = localStorage.getItem('jellyfin_credentials');
      if (!raw) {
        return null;
      }
      var parsed = JSON.parse(raw);
      var servers = Array.isArray(parsed && parsed.Servers) ? parsed.Servers : [];
      var origin = location.origin;
      var sameOrigin = servers.find(function (server) {
        return ['ManualAddress', 'RemoteAddress', 'LocalAddress'].some(function (key) {
          try {
            return server && server[key] && new URL(server[key]).origin === origin;
          } catch (error) {
            return false;
          }
        });
      });
      return sameOrigin || servers[servers.length - 1] || null;
    } catch (error) {
      return null;
    }
  }

  function getClient() {
    return window.ApiClient || null;
  }

  function accessToken() {
    if (state.accessToken) {
      return state.accessToken;
    }
    var creds = getCredentials();
    if (creds && creds.AccessToken) {
      state.accessToken = creds.AccessToken;
      return state.accessToken;
    }
    try {
      if (getClient() && typeof getClient().accessToken === 'function') {
        var token = getClient().accessToken();
        if (token) {
          state.accessToken = token;
          return token;
        }
      }
    } catch (error) {
      // Continue with the stored credential fallback.
    }
    return '';
  }

  function currentUserId() {
    if (state.userId) {
      return state.userId;
    }
    try {
      if (getClient() && typeof getClient().getCurrentUserId === 'function') {
        var value = getClient().getCurrentUserId();
        if (value) {
          state.userId = value;
          return value;
        }
      }
    } catch (error) {
      // Continue with stored credentials.
    }
    var creds = getCredentials();
    state.userId = creds && creds.UserId ? creds.UserId : '';
    return state.userId;
  }

  function currentServerId() {
    if (state.serverId) {
      return state.serverId;
    }
    try {
      if (getClient() && typeof getClient().serverId === 'function') {
        var value = getClient().serverId();
        if (value) {
          state.serverId = value;
          return value;
        }
      }
    } catch (error) {
      // Continue with stored credentials.
    }
    var creds = getCredentials();
    state.serverId = creds && creds.Id ? creds.Id : '';
    return state.serverId;
  }

  function baseUrl() {
    var pathname = location.pathname;
    var lower = pathname.toLowerCase();
    var marker = lower.indexOf('/web/');
    if (marker >= 0) {
      return location.origin + pathname.slice(0, marker);
    }
    if (lower.endsWith('/web')) {
      return location.origin + pathname.slice(0, -4);
    }
    return location.origin;
  }

  function apiUrl(path) {
    var normalized = path.charAt(0) === '/' ? path : '/' + path;
    var url = baseUrl() + normalized;
    var separator = normalized.indexOf('?') >= 0 ? '&' : '?';
    var token = accessToken();
    if (token) {
      url += separator + 'api_key=' + encodeURIComponent(token);
    }
    return url;
  }

  async function apiFetch(path, options) {
    var opts = Object.assign({
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    }, options || {});
    opts.headers = Object.assign({}, opts.headers || {});
    var response = await fetch(apiUrl(path), opts);
    if (!response.ok) {
      throw new Error((opts.method || 'GET') + ' ' + path + ' returned HTTP ' + response.status);
    }
    var text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async function apiGet(path) {
    return apiFetch(path, { method: 'GET' });
  }

  async function apiRequest(path, method, body) {
    var headers = { Accept: 'application/json' };
    var payload = body;
    if (body && typeof body !== 'string') {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    return apiFetch(path, { method: method, headers: headers, body: payload });
  }

  function imageUrl(item, type, width) {
    if (!item || !item.Id) {
      return '';
    }
    var imageType = type || 'Primary';
    var maxWidth = width || 1000;
    var tag = item.ImageTags && item.ImageTags[imageType] ? item.ImageTags[imageType] : '';
    var params = 'maxWidth=' + encodeURIComponent(maxWidth) + '&quality=88';
    if (tag) {
      params += '&tag=' + encodeURIComponent(tag);
    }
    return apiUrl('/Items/' + encodeURIComponent(item.Id) + '/Images/' + encodeURIComponent(imageType) + '?' + params);
  }

  function personImageUrl(person, width) {
    if (!person || !person.PersonId) {
      return '';
    }
    var params = 'maxWidth=' + encodeURIComponent(width || 168) + '&quality=84';
    if (person.PrimaryImageTag) {
      params += '&tag=' + encodeURIComponent(person.PrimaryImageTag);
    }
    return apiUrl('/Persons/' + encodeURIComponent(person.PersonId) + '/Images/Primary?' + params);
  }

  function backdropUrl(item, width) {
    if (!item || !item.Id) {
      return '';
    }
    var tag = item.BackdropImageTags && item.BackdropImageTags.length ? item.BackdropImageTags[0] : '';
    var params = 'maxWidth=' + encodeURIComponent(width || 2400) + '&quality=88';
    if (tag) {
      params += '&tag=' + encodeURIComponent(tag);
    }
    return apiUrl('/Items/' + encodeURIComponent(item.Id) + '/Images/Backdrop/0?' + params);
  }

  function parseHash() {
    var raw = decodeURIComponent((location.hash || '#/home').replace(/^#/, ''));
    var queryIndex = raw.indexOf('?');
    var path = queryIndex >= 0 ? raw.slice(0, queryIndex) : raw;
    var query = queryIndex >= 0 ? raw.slice(queryIndex + 1) : '';
    return { path: path || '/home', params: new URLSearchParams(query) };
  }

  function route() {
    var parsed = parseHash();
    var path = parsed.path;
    var params = parsed.params;
    if (path === '/home' && params.get('dinkflix') === 'list') {
      return { type: 'list' };
    }
    if (path === '/home' && params.get('dinkflix') === 'about') {
      return { type: 'about' };
    }
    if (path === '/home' && !params.get('tab')) {
      return { type: 'home' };
    }
    if (path === '/details') {
      return { type: 'details', id: params.get('id') || '' };
    }
    if (path === '/dashboard' || path.indexOf('/userpluginsettings.html') === 0 || path === '/login.html') {
      return { type: 'native-admin' };
    }
    if (path === '/search') {
      return { type: 'native-search' };
    }
    if (path === '/video' || path === '/playback' || path === '/fullscreen' || path === '/nowplaying') {
      return { type: 'playback' };
    }
    return { type: 'native' };
  }

  function nativeHash(path, params) {
    var query = new URLSearchParams();
    Object.entries(params || {}).forEach(function (pair) {
      if (pair[1] !== undefined && pair[1] !== null && pair[1] !== '') {
        query.set(pair[0], String(pair[1]));
      }
    });
    var next = '#' + path + (query.toString() ? '?' + query.toString() : '');
    closeMenus();
    closeModals();
    if (location.hash !== next) {
      location.hash = next;
    } else {
      renderRoute();
    }
  }

  function nowTime() {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date());
  }

  function endTimeLabel(runtimeTicks, positionTicks) {
    var runtime = Number(runtimeTicks || 0);
    var position = Number(positionTicks || 0);
    if (!runtime) {
      return '';
    }
    var remaining = Math.max(0, runtime - position);
    var end = new Date(Date.now() + remaining / 10000);
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(end);
  }

  function minutesLabel(ticks) {
    var value = Number(ticks || 0);
    if (!value) {
      return '';
    }
    var minutes = Math.round(value / 600000000);
    var hours = Math.floor(minutes / 60);
    var mins = minutes % 60;
    if (hours === 0) {
      return minutes + ' min';
    }
    return mins ? hours + 'h ' + mins + 'm' : hours + 'h';
  }

  function remainingLabel(item) {
    var runtime = Number(item && item.RunTimeTicks || 0);
    var position = Number(item && item.UserData && item.UserData.PlaybackPositionTicks || 0);
    if (!runtime || !position || position >= runtime) {
      return '';
    }
    return minutesLabel(runtime - position) + ' left';
  }

  function yearLabel(item) {
    if (!item) {
      return '';
    }
    var value = item.ProductionYear || item.PremiereDate || item.DateCreated || '';
    var match = String(value).match(/\d{4}/);
    return match ? match[0] : '';
  }

  function qualityBadges(item) {
    var badges = [];
    var width = Number(item && item.Width || 0);
    var height = Number(item && item.Height || 0);
    if (height >= 2000 || width >= 3500) {
      badges.push('<span class="df-badge df-badge-quality">4K</span>');
    } else if (height >= 1050 || width >= 1900) {
      badges.push('<span class="df-badge df-badge-quality">1080p</span>');
    } else if (height >= 700 || width >= 1200) {
      badges.push('<span class="df-badge df-badge-quality">720p</span>');
    }
    if (item && (item.VideoRange || item.VideoRangeType || /hdr/i.test(String(item.VideoRangeType || '')))) {
      badges.push('<span class="df-badge df-badge-hdr">HDR</span>');
    }
    return badges.join('');
  }

  function ratingBadge(item) {
    if (!item || !item.CommunityRating) {
      return '';
    }
    var rating = Number(item.CommunityRating);
    return '<span class="df-badge df-badge-rating">★ ' + rating.toFixed(1) + '</span>';
  }

  function coreBadges(item) {
    var html = ratingBadge(item) + qualityBadges(item);
    if (item && item.OfficialRating) {
      html += '<span class="df-badge df-badge-age">' + esc(item.OfficialRating) + '</span>';
    }
    return html;
  }

  function createNode(markup) {
    var wrapper = document.createElement('div');
    wrapper.innerHTML = markup.trim();
    return wrapper.firstElementChild;
  }

  function ensureBoot() {
    if (state.boot && document.body.contains(state.boot)) {
      return state.boot;
    }
    var boot = createNode('<div id="dinkflix-boot" aria-live="polite"><div class="df-boot-inner"><div class="df-brand df-brand-boot"><span>DINK</span><span>FLIX</span></div><div class="df-boot-line"><span></span></div><div class="df-boot-copy">Loading DINKFLIX</div></div></div>');
    document.body.appendChild(boot);
    state.boot = boot;
    return boot;
  }

  function finishBoot() {
    document.documentElement.classList.add('df-dinkflix-started');
    var boot = ensureBoot();
    boot.classList.add('df-boot-hidden');
    setTimeout(function () {
      boot.remove();
    }, 360);
  }

  function showRouteCover() {
    if (state.routeCover && document.body.contains(state.routeCover)) {
      return state.routeCover;
    }
    var cover = createNode('<div id="dinkflix-route-cover"><div class="df-route-cover-inner"><div class="df-brand"><span>DINK</span><span>FLIX</span></div><div class="df-route-spinner"></div></div></div>');
    document.body.appendChild(cover);
    state.routeCover = cover;
    return cover;
  }

  function hideRouteCover() {
    if (!state.routeCover) {
      return;
    }
    state.routeCover.classList.add('df-cover-hidden');
    setTimeout(function () {
      if (state.routeCover) {
        state.routeCover.remove();
        state.routeCover = null;
      }
    }, 260);
  }

  function ensureMenuRoot() {
    if (state.menuRoot && document.body.contains(state.menuRoot)) {
      return state.menuRoot;
    }
    state.menuRoot = document.createElement('div');
    state.menuRoot.id = 'dinkflix-menu-root';
    document.body.appendChild(state.menuRoot);
    return state.menuRoot;
  }

  function ensureModalRoot() {
    if (state.modalRoot && document.body.contains(state.modalRoot)) {
      return state.modalRoot;
    }
    state.modalRoot = document.createElement('div');
    state.modalRoot.id = 'dinkflix-modal-root';
    document.body.appendChild(state.modalRoot);
    return state.modalRoot;
  }

  function closeMenus() {
    ensureMenuRoot().replaceChildren();
  }

  function closeModals() {
    ensureModalRoot().replaceChildren();
  }

  function toast(message) {
    var root = ensureModalRoot();
    var item = createNode('<div class="df-toast">' + esc(message) + '</div>');
    root.appendChild(item);
    setTimeout(function () {
      item.remove();
    }, 3000);
  }

  function svg(path) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + path + '</svg>';
  }

  var ICON = {
    home: '<path d="M3.5 10.8 12 4l8.5 6.8"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/>',
    movie: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 4v4M16 4v4M4 8h16M4 16h16M8 20v-4M16 20v-4"/>',
    tv: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M8.5 3.5 12 7l3.5-3.5"/><path d="M7.5 10h.01M11.5 10h.01M15.5 10h.01M7.5 14h.01M11.5 14h.01M15.5 14h.01"/>',
    search: '<circle cx="10.7" cy="10.7" r="6.2"/><path d="m16 16 5 5"/>',
    user: '<circle cx="12" cy="8" r="3.1"/><path d="M5.5 20c.5-3.4 3.1-5.4 6.5-5.4s6 2 6.5 5.4"/>',
    dots: '<circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
    play: '<path d="m8 5 10.8 7L8 19z" fill="currentColor" stroke="none"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5.5 12.5 4.2 4.2 8.8-9"/>',
    left: '<path d="m14.5 5-7 7 7 7"/>',
    right: '<path d="m9.5 5 7 7-7 7"/>',
    tools: '<path d="m15.5 4.5 4 4M5.2 18.8l8.6-8.6M6.2 15.8l2 2M16.5 7.5l-2 2"/><circle cx="17.5" cy="6.5" r="3.2"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 10.5v5M12 7.7h.01"/>',
    download: '<path d="M12 4v10M8 11l4 4 4-4M5 20h14"/>',
    trash: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>',
    refresh: '<path d="M19 8a7.5 7.5 0 1 0 1 6M19 4v4h-4"/>',
    copy: '<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M5 16V6a2 2 0 0 1 2-2h8"/>',
    collection: '<path d="M5 7h10M5 12h10M5 17h8"/><path d="M18 6v8M14.5 10h7"/>',
    playlist: '<path d="M5 7h10M5 12h8M5 17h6"/><path d="M18 14v5M15.5 16.5h5"/>',
    shuffle: '<path d="M3 7h3c2 0 3.5 1 5 3l4 5c1 1.5 2.5 2 6 2M3 17h3c2 0 3.5-1 5-3l4-5c1-1.5 2.5-2 6-2"/><path d="m18 5 3 2-3 2M18 15l3 2-3 2"/>',
    external: '<path d="M14 5h5v5M19 5l-8 8"/><path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5"/>'
  };

  function makeIcon(name) {
    return svg(ICON[name] || ICON.info);
  }

  function menuItem(label, icon, handler, className) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'df-menu-item' + (className ? ' ' + className : '');
    button.innerHTML = makeIcon(icon) + '<span>' + esc(label) + '</span>';
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      closeMenus();
      Promise.resolve(handler()).catch(function (error) {
        console.error('[DINKFLIX] Menu action failed.', error);
        toast('That action could not be completed.');
      });
    });
    return button;
  }

  function menuSeparator() {
    return createNode('<div class="df-menu-separator"></div>');
  }

  function positionFloating(node, anchor) {
    if (!node || !anchor) {
      return;
    }
    var rect = anchor.getBoundingClientRect();
    var width = node.offsetWidth || 320;
    var height = node.offsetHeight || 400;
    var left = rect.right - width;
    var top = rect.bottom + 8;
    if (left < 12) {
      left = 12;
    }
    if (left + width > innerWidth - 12) {
      left = innerWidth - width - 12;
    }
    if (top + height > innerHeight - 12) {
      top = rect.top - height - 8;
    }
    node.style.left = Math.max(12, left) + 'px';
    node.style.top = Math.max(12, top) + 'px';
  }

  function clearDinkflixRoots() {
    document.querySelectorAll('#dinkflix-app, #dinkflix-detail, #dinkflix-page').forEach(function (node) {
      node.remove();
    });
    state.root = null;
  }

  function shouldHaveNav(routeInfo) {
    return routeInfo.type !== 'native-admin' && routeInfo.type !== 'playback';
  }

  function buildNav() {
    if (state.nav && document.body.contains(state.nav)) {
      return state.nav;
    }
    var nav = createNode('<header id="dinkflix-nav" class="df-nav"><div class="df-nav-inner"><a class="df-brand" href="#/home" aria-label="DINKFLIX home"><span>DINK</span><span>FLIX</span></a><nav class="df-primary" id="df-primary" aria-label="Primary"></nav><button class="df-nav-more" id="df-nav-more" type="button">Libraries <span>⌄</span></button><div class="df-nav-spacer"></div><div class="df-nav-actions"><button class="df-icon-button" id="df-random" type="button" aria-label="Surprise me" title="Surprise me">' + makeIcon('shuffle') + '</button><a class="df-icon-button" id="df-search" href="#/search" aria-label="Search" title="Search">' + makeIcon('search') + '</a><button class="df-icon-button" id="df-tools" type="button" aria-label="Tools" title="Tools">' + makeIcon('tools') + '</button><button class="df-user-button" id="df-user" type="button" aria-label="Account" title="Account"><span class="df-avatar" id="df-avatar">?</span></button></div></div></header>');
    document.body.appendChild(nav);
    state.nav = nav;
    nav.querySelector('#df-random').addEventListener('click', randomTitle);
    nav.querySelector('#df-tools').addEventListener('click', function (event) {
      event.stopPropagation();
      openToolsMenu(event.currentTarget);
    });
    nav.querySelector('#df-user').addEventListener('click', function (event) {
      event.stopPropagation();
      openUserMenu(event.currentTarget);
    });
    nav.querySelector('#df-nav-more').addEventListener('click', function (event) {
      event.stopPropagation();
      openLibrariesMenu(event.currentTarget);
    });
    return nav;
  }

  function refreshNav() {
    var nav = buildNav();
    var primary = nav.querySelector('#df-primary');
    primary.replaceChildren();
    var visible = visibleViews();
    var movies = visible.find(function (view) { return String(view.CollectionType || '').toLowerCase() === 'movies'; });
    var shows = visible.find(function (view) { return String(view.CollectionType || '').toLowerCase() === 'tvshows'; });
    var core = [
      { label: 'Home', icon: 'home', href: '#/home', active: route().type === 'home' },
      movies ? { label: 'Movies', icon: 'movie', href: nativeLibraryHref(movies), active: false } : null,
      shows ? { label: 'TV Shows', icon: 'tv', href: nativeLibraryHref(shows), active: false } : null
    ].filter(Boolean);
    core.forEach(function (entry) {
      var link = document.createElement('a');
      link.className = 'df-primary-link' + (entry.active ? ' is-active' : '');
      link.href = entry.href;
      link.innerHTML = makeIcon(entry.icon) + '<span>' + esc(entry.label) + '</span>';
      primary.appendChild(link);
    });
    var extra = visible.filter(function (view) { return view.Id !== (movies && movies.Id) && view.Id !== (shows && shows.Id); });
    nav.querySelector('#df-nav-more').hidden = extra.length === 0;
    var avatar = nav.querySelector('#df-avatar');
    var userName = state.user && state.user.Name ? state.user.Name : '?';
    if (state.user && state.user.PrimaryImageTag) {
      avatar.innerHTML = '<img alt="" src="' + esc(apiUrl('/Users/' + encodeURIComponent(state.userId) + '/Images/Primary?maxWidth=72&quality=88&tag=' + encodeURIComponent(state.user.PrimaryImageTag))) + '">';
    } else {
      avatar.textContent = userName.trim().charAt(0).toUpperCase() || '?';
    }
  }

  function visibleViews() {
    return state.views.filter(function (view) {
      var type = String(view && view.CollectionType || '').toLowerCase();
      return view && view.Id && !['playlists', 'livetv', 'channels', 'boxsets'].includes(type);
    });
  }

  function nativeLibraryHref(view) {
    var type = String(view.CollectionType || '').toLowerCase();
    var collectionType = type || '';
    return '#/movies?topParentId=' + encodeURIComponent(view.Id) + (collectionType ? '&collectionType=' + encodeURIComponent(collectionType) : '');
  }

  function openLibrariesMenu(anchor) {
    closeMenus();
    var menu = createNode('<div class="df-floating-menu df-library-menu"><div class="df-menu-label">Libraries</div></div>');
    visibleViews().forEach(function (view) {
      menu.appendChild(menuItem(view.Name || 'Library', 'movie', function () {
        nativeHash('/movies', { topParentId: view.Id, collectionType: view.CollectionType || '' });
      }));
    });
    ensureMenuRoot().appendChild(menu);
    positionFloating(menu, anchor);
  }

  function openToolsMenu(anchor) {
    closeMenus();
    var menu = createNode('<div class="df-floating-menu df-tools-menu"></div>');
    menu.appendChild(menuItem('Surprise me', 'shuffle', randomTitle));
    menu.appendChild(menuItem('Sync Play', 'plus', function () { return clickNativeAction(/sync\s*play/i); }));
    menu.appendChild(menuItem('Cast to device', 'tv', function () { return clickNativeAction(/cast|play to/i); }));
    ensureMenuRoot().appendChild(menu);
    positionFloating(menu, anchor);
  }

  function openUserMenu(anchor) {
    closeMenus();
    var menu = createNode('<div class="df-floating-menu df-user-menu"></div>');
    menu.appendChild(menuItem('Profile', 'user', function () { nativeHash('/userprofile', { userId: state.userId }); }));
    menu.appendChild(menuItem('Preferences', 'tools', function () { nativeHash('/mypreferencesmenu'); }));
    menu.appendChild(menuSeparator());
    menu.appendChild(menuItem('Requests', 'plus', function () { nativeHash('/home', { tab: 2 }); }));
    menu.appendChild(menuItem('Bookmarks', 'movie', function () { nativeHash('/home', { tab: 3 }); }));
    menu.appendChild(menuItem('Calendar', 'movie', function () { nativeHash('/userpluginsettings.html', { pageUrl: '/JellyfinEnhanced/calendarPage' }); }));
    menu.appendChild(menuItem('About DINKFLIX', 'info', function () { nativeHash('/home', { dinkflix: 'about' }); }));
    if (state.user && state.user.Policy && state.user.Policy.IsAdministrator) {
      menu.appendChild(menuItem('Dashboard', 'tools', function () { nativeHash('/dashboard'); }));
    }
    menu.appendChild(menuSeparator());
    menu.appendChild(menuItem('Quick Connect', 'plus', function () { return clickNativeAction(/quick connect/i); }));
    menu.appendChild(menuItem('Sign out', 'close', function () { return clickNativeAction(/sign out|logout/i); }, 'df-menu-danger'));
    ensureMenuRoot().appendChild(menu);
    positionFloating(menu, anchor);
  }

  function clickNativeAction(pattern) {
    var candidates = Array.from(document.querySelectorAll('button, a, [role="button"]')).filter(function (node) {
      return !node.closest('#dinkflix-nav, #dinkflix-menu-root, #dinkflix-modal-root');
    });
    var target = candidates.find(function (node) {
      var text = safeText(node.textContent) + ' ' + safeText(node.getAttribute('aria-label')) + ' ' + safeText(node.getAttribute('title'));
      return pattern.test(text);
    });
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
    state.accessToken = accessToken();
    if (!state.userId) {
      throw new Error('No Jellyfin user session was found.');
    }
    state.user = await apiGet('/Users/' + encodeURIComponent(state.userId));
  }

  async function loadViews() {
    var result = await apiGet('/UserViews?UserId=' + encodeURIComponent(state.userId) + '&IncludeExternalContent=false');
    state.views = Array.isArray(result) ? result : (Array.isArray(result && result.Items) ? result.Items : []);
  }

  function fields() {
    return 'PrimaryImageAspectRatio,Overview,Genres,Tags,People,MediaSources,ProviderIds,UserData,OfficialRating,CommunityRating,ProductionYear,RunTimeTicks,Width,Height,VideoRange,VideoRangeType,DateCreated,DatePlayed,ChildCount,BackdropImageTags,ImageTags,SeriesId,SeriesName,SeriesPrimaryImageTag,ParentIndexNumber,IndexNumber,Studios,RemoteTrailers';
  }

  async function getItems(options) {
    var defaults = {
      UserId: state.userId,
      Recursive: true,
      EnableUserData: true,
      EnableImages: true,
      EnableImageTypes: 'Primary,Backdrop,Thumb,Logo',
      Limit: 50,
      StartIndex: 0,
      Fields: fields()
    };
    var params = new URLSearchParams();
    Object.entries(Object.assign({}, defaults, options || {})).forEach(function (entry) {
      if (entry[1] !== undefined && entry[1] !== null && entry[1] !== '') {
        params.set(entry[0], String(entry[1]));
      }
    });
    var result = await apiGet('/Items?' + params.toString());
    return Array.isArray(result && result.Items) ? result.Items : [];
  }

  async function getItem(id) {
    return apiGet('/Items/' + encodeURIComponent(id) + '?UserId=' + encodeURIComponent(state.userId) + '&Fields=' + encodeURIComponent(fields()));
  }

  function remember(items) {
    (items || []).forEach(function (item) {
      if (item && item.Id) {
        state.cardData.set(item.Id, item);
      }
    });
  }

  function cardHtml(item, options) {
    var opts = options || {};
    var id = safeText(item && item.Id);
    var title = item && item.Name ? item.Name : 'Untitled';
    var year = yearLabel(item);
    var runtime = minutesLabel(item && item.RunTimeTicks);
    var meta = [year, runtime].filter(Boolean);
    var progress = 0;
    if (item && item.RunTimeTicks && item.UserData && item.UserData.PlaybackPositionTicks) {
      progress = Math.max(0, Math.min(100, Number(item.UserData.PlaybackPositionTicks) / Number(item.RunTimeTicks) * 100));
    }
    var resumeId = item && item.__dinkflixResumeId ? item.__dinkflixResumeId : '';
    var continueLabel = opts.continueItem ? '<span class="df-card-continue">' + esc(item.__dinkflixContinueLabel || '') + '</span>' : '';
    var selected = state.selectedIds.has(id);
    return '<article class="df-card' + (selected ? ' is-selected' : '') + '" data-df-card="' + esc(id) + '" data-resume-id="' + esc(resumeId) + '">' +
      '<div class="df-card-art">' +
      '<img loading="lazy" decoding="async" src="' + esc(imageUrl(item, opts.imageType || 'Primary', 1000)) + '" alt="' + esc(title) + '">' +
      '<div class="df-card-sheen"></div>' +
      '<button class="df-card-menu" data-df-card-menu="' + esc(id) + '" type="button" aria-label="More actions for ' + esc(title) + '">' + makeIcon('dots') + '</button>' +
      '<button class="df-card-play" data-df-card-play="' + esc(resumeId || id) + '" type="button" aria-label="Play ' + esc(title) + '">' + makeIcon('play') + '</button>' +
      (selected ? '<span class="df-card-selected">' + makeIcon('check') + '</span>' : '') +
      (progress > 0 ? '<div class="df-card-progress"><span style="width:' + progress.toFixed(2) + '%"></span></div>' : '') +
      '</div>' +
      '<button class="df-card-body" type="button" data-df-card-open="' + esc(id) + '">' +
      '<span class="df-card-title" title="' + esc(title) + '">' + esc(title) + '</span>' +
      '<span class="df-card-meta">' + (meta.length ? meta.map(function (value) { return '<span>' + esc(value) + '</span>'; }).join('<i>•</i>') : '') + '</span>' +
      '<span class="df-card-badges">' + ratingBadge(item) + qualityBadges(item) + (item && item.OfficialRating ? '<span class="df-badge df-badge-age">' + esc(item.OfficialRating) + '</span>' : '') + '</span>' +
      continueLabel +
      '</button>' +
      '</article>';
  }

  function bindCards(root) {
    if (!root) {
      return;
    }
    root.querySelectorAll('[data-df-card-open]').forEach(function (button) {
      button.addEventListener('click', function () {
        var id = button.dataset.dfCardOpen;
        if (state.selectionMode) {
          toggleSelection(id);
          return;
        }
        openDetails(id);
      });
    });
    root.querySelectorAll('[data-df-card-menu]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        openCardMenu(button, button.dataset.dfCardMenu);
      });
    });
    root.querySelectorAll('[data-df-card-play]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var id = button.dataset.dfCardPlay;
        var item = state.cardData.get(id);
        if (item) {
          playItem(item);
          return;
        }
        getItem(id).then(playItem).catch(function () { toast('Unable to start playback.'); });
      });
    });
  }

  function carouselSection(key, title, items, meta) {
    var page = state.rowPages[key] || 0;
    var pageSize = 6;
    var maxPage = Math.max(0, Math.ceil(items.length / pageSize) - 1);
    var start = page * pageSize;
    var slice = items.slice(start, start + pageSize);
    if (!items.length) {
      return '';
    }
    return '<section class="df-section" data-df-section="' + esc(key) + '">' +
      '<div class="df-section-header"><div><span class="df-section-kicker">' + esc(meta || '') + '</span><h2>' + esc(title) + '</h2></div><div class="df-section-controls">' +
      '<button type="button" class="df-round-arrow" data-df-prev="' + esc(key) + '" aria-label="Previous ' + esc(title) + '"' + (page <= 0 ? ' disabled' : '') + '>' + makeIcon('left') + '</button>' +
      '<button type="button" class="df-round-arrow" data-df-next="' + esc(key) + '" aria-label="Next ' + esc(title) + '"' + (page >= maxPage ? ' disabled' : '') + '>' + makeIcon('right') + '</button></div></div>' +
      '<div class="df-carousel-grid">' + slice.map(function (item) { return cardHtml(item, { continueItem: key === 'continue' }); }).join('') + '</div>' +
      '</section>';
  }

  function bindCarousels(root, sourceMap) {
    root.querySelectorAll('[data-df-prev]').forEach(function (button) {
      button.addEventListener('click', function () {
        var key = button.dataset.dfPrev;
        state.rowPages[key] = Math.max(0, (state.rowPages[key] || 0) - 1);
        rerenderHomeRows(sourceMap);
      });
    });
    root.querySelectorAll('[data-df-next]').forEach(function (button) {
      button.addEventListener('click', function () {
        var key = button.dataset.dfNext;
        state.rowPages[key] = (state.rowPages[key] || 0) + 1;
        rerenderHomeRows(sourceMap);
      });
    });
  }

  function buildHero(items) {
    if (!items.length) {
      return '<div class="df-hero df-hero-empty"><div class="df-hero-empty-inner"><span class="df-section-kicker">DINKFLIX</span><h1>Ready when you are.</h1><p>Add some media to your Jellyfin library and DINKFLIX will put your newest titles here.</p></div></div>';
    }
    return '<section class="df-hero" id="df-hero"><div class="df-hero-media" id="df-hero-media"></div><div class="df-hero-gradient"></div><div class="df-hero-copy" id="df-hero-copy"></div><div class="df-hero-dots" id="df-hero-dots"></div></section>';
  }

  function renderHero(index) {
    var item = state.heroItems[index];
    var media = document.getElementById('df-hero-media');
    var copy = document.getElementById('df-hero-copy');
    var dots = document.getElementById('df-hero-dots');
    if (!item || !media || !copy || !dots) {
      return;
    }
    var url = backdropUrl(item, 2800);
    var title = item.Name || 'Recently added';
    var details = [yearLabel(item), minutesLabel(item.RunTimeTicks), item.Type === 'Series' ? 'Series' : 'Movie'].filter(Boolean);
    media.style.backgroundImage = 'url("' + url.replaceAll('"', '%22') + '")';
    copy.innerHTML = '<span class="df-hero-kicker">RECENTLY ADDED</span><h1>' + esc(title) + '</h1><div class="df-hero-meta"><span class="df-hero-rating">' + (item.CommunityRating ? '★ ' + Number(item.CommunityRating).toFixed(1) : '') + '</span>' + details.map(function (value) { return '<span>' + esc(value) + '</span>'; }).join('') + qualityBadges(item) + '</div><p>' + esc(item.Overview || 'A new addition to your DINKFLIX library.') + '</p><div class="df-hero-actions"><button class="df-button df-button-primary" id="df-hero-play">' + makeIcon('play') + '<span>Play</span></button><button class="df-button df-button-ghost" id="df-hero-info">More info</button></div>';
    dots.innerHTML = state.heroItems.map(function (_, indexValue) { return '<button type="button" data-df-hero-dot="' + indexValue + '" class="' + (indexValue === index ? 'is-active' : '') + '" aria-label="Show featured title ' + (indexValue + 1) + '"></button>'; }).join('');
    document.getElementById('df-hero-play').addEventListener('click', function () { playItem(item); });
    document.getElementById('df-hero-info').addEventListener('click', function () { openDetails(item.Id); });
    dots.querySelectorAll('[data-df-hero-dot]').forEach(function (button) {
      button.addEventListener('click', function () {
        showHero(Number(button.dataset.dfHeroDot));
      });
    });
    var hero = document.getElementById('df-hero');
    hero.onmouseenter = function () { state.heroPaused = true; };
    hero.onmouseleave = function () { state.heroPaused = false; };
    state.heroIndex = index;
  }

  function showHero(index) {
    if (!state.heroItems.length) {
      return;
    }
    var next = (index + state.heroItems.length) % state.heroItems.length;
    renderHero(next);
    if (state.heroTimer) {
      clearInterval(state.heroTimer);
    }
    state.heroTimer = setInterval(function () {
      if (!document.hidden && !state.heroPaused) {
        showHero(state.heroIndex + 1);
      }
    }, 14000);
  }

  async function getContinueWatching() {
    var episodes = await getItems({ IncludeItemTypes: 'Episode', IsResumable: true, SortBy: 'DatePlayed', SortOrder: 'Descending', Limit: 60, Fields: fields() });
    var movies = await getItems({ IncludeItemTypes: 'Movie', IsResumable: true, SortBy: 'DatePlayed', SortOrder: 'Descending', Limit: 20, Fields: fields() });
    var groups = new Map();
    episodes.forEach(function (episode) {
      var seriesId = episode.SeriesId;
      if (!seriesId) {
        return;
      }
      if (!groups.has(seriesId)) {
        groups.set(seriesId, episode);
      }
    });
    var seriesIds = Array.from(groups.keys());
    var series = seriesIds.length ? await getItems({ Ids: seriesIds.join(','), IncludeItemTypes: 'Series', Limit: seriesIds.length, Fields: fields() }).catch(function () { return []; }) : [];
    var combined = [];
    series.forEach(function (show) {
      var episode = groups.get(show.Id);
      if (!episode) {
        return;
      }
      var display = Object.assign({}, show);
      display.__dinkflixResumeId = episode.Id;
      display.__dinkflixContinueLabel = 'S' + String(episode.ParentIndexNumber || 0).padStart(2, '0') + ' · E' + String(episode.IndexNumber || 0).padStart(2, '0') + ' · ' + remainingLabel(episode);
      display.UserData = episode.UserData || display.UserData || {};
      display.RunTimeTicks = episode.RunTimeTicks || display.RunTimeTicks;
      state.resumeEpisodes.set(show.Id, episode);
      combined.push(display);
    });
    movies.forEach(function (movie) {
      movie.__dinkflixContinueLabel = remainingLabel(movie) || 'Resume';
      combined.push(movie);
    });
    remember(episodes);
    remember(movies);
    remember(series);
    return combined.slice(0, 40);
  }

  async function loadHomeData() {
    var settled = await Promise.allSettled([
      getContinueWatching(),
      getItems({ IncludeItemTypes: 'Movie,Series', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 30, Fields: fields() }),
      getItems({ IncludeItemTypes: 'Movie,Series', IsPlayed: true, SortBy: 'DatePlayed', SortOrder: 'Descending', Limit: 30, Fields: fields() }),
      getItems({ IncludeItemTypes: 'Movie,Series', IsFavorite: true, SortBy: 'SortName', SortOrder: 'Ascending', Limit: 30, Fields: fields() }),
      getItems({ IncludeItemTypes: 'Movie', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 30, Fields: fields() }),
      getItems({ IncludeItemTypes: 'Series', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 30, Fields: fields() })
    ]);
    function val(index) {
      return settled[index].status === 'fulfilled' ? settled[index].value : [];
    }
    var continueWatching = val(0);
    var recent = val(1);
    var played = val(2);
    var favorites = val(3);
    var movies = val(4);
    var shows = val(5);
    remember([].concat(continueWatching, recent, played, favorites, movies, shows));
    state.heroItems = recent.filter(function (item) { return item.BackdropImageTags && item.BackdropImageTags.length; }).slice(0, 8);
    if (!state.heroItems.length) {
      state.heroItems = recent.slice(0, 8);
    }
    return { continueWatching: continueWatching, recent: recent, played: played, favorites: favorites, movies: movies, shows: shows };
  }

  function renderHomeRows(data) {
    var rows = document.getElementById('df-home-rows');
    if (!rows) {
      return;
    }
    rows.innerHTML = carouselSection('continue', 'Continue Watching', data.continueWatching, 'Pick up where you left off') +
      carouselSection('played', 'Recently Played', data.played, 'Back in the rotation') +
      carouselSection('recent', 'Recently Added', data.recent, 'Fresh from the library') +
      carouselSection('movies', 'Movies', data.movies, 'Feature films') +
      carouselSection('shows', 'TV Shows', data.shows, 'Series and seasons') +
      carouselSection('list', 'My List', data.favorites, 'Saved for later');
    bindCarousels(rows, data);
    bindCards(rows);
  }

  function rerenderHomeRows(data) {
    renderHomeRows(data);
  }

  async function renderHome() {
    var root = ensureCustomRoot('df-page-home');
    root.innerHTML = '<div class="df-home-loading"><div class="df-loading-hero"></div><div class="df-loading-row"></div><div class="df-loading-row"></div></div>';
    var data = await loadHomeData();
    root.innerHTML = buildHero(state.heroItems) + '<main class="df-home-body" id="df-home-rows"></main>';
    renderHomeRows(data);
    if (state.heroItems.length) {
      showHero(0);
    }
    markCustomReady('DINKFLIX');
  }

  function ensureCustomRoot(className) {
    clearDinkflixRoots();
    var root = document.createElement('main');
    root.id = 'dinkflix-app';
    root.className = className || 'df-page';
    document.body.appendChild(root);
    state.root = root;
    state.customRouteActive = true;
    document.body.classList.add('df-custom-active');
    return root;
  }

  function markCustomReady(title) {
    state.customRouteActive = true;
    document.body.classList.add('df-custom-active');
    document.title = title ? title + ' — DINKFLIX' : 'DINKFLIX';
    hideRouteCover();
    finishBoot();
  }

  function markNativeReady() {
    clearDinkflixRoots();
    state.customRouteActive = false;
    document.body.classList.remove('df-custom-active');
    hideRouteCover();
    finishBoot();
  }

  async function openDetails(id) {
    closeMenus();
    showRouteCover();
    nativeHash('/details', { id: id });
  }

  async function renderDetails(id) {
    if (!id) {
      markNativeReady();
      return;
    }
    var root = ensureCustomRoot('df-detail-page');
    root.innerHTML = '<div class="df-detail-loading"><div></div></div>';
    var item;
    try {
      item = await getItem(id);
    } catch (error) {
      console.error('[DINKFLIX] Detail load failed.', error);
      markNativeReady();
      toast('DINKFLIX could not load that title.');
      return;
    }
    state.cardData.set(id, item);
    var details = { item: item, seasons: [], episodes: [], providers: null, similar: [] };
    if (item.Type === 'Series') {
      details.seasons = await getItems({ ParentId: item.Id, IncludeItemTypes: 'Season', SortBy: 'IndexNumber', SortOrder: 'Ascending', Limit: 100, Fields: fields() }).catch(function () { return []; });
    } else if (item.Type === 'Season') {
      details.episodes = await getItems({ ParentId: item.Id, IncludeItemTypes: 'Episode', SortBy: 'IndexNumber', SortOrder: 'Ascending', Limit: 300, Fields: fields() }).catch(function () { return []; });
    }
    if (item.ProviderIds && item.ProviderIds.Tmdb) {
      var tmdbType = item.Type === 'Series' ? 'tv' : 'movie';
      details.providers = await apiGet('/DinkFlix/TMDB/WatchProviders/' + encodeURIComponent(item.ProviderIds.Tmdb) + '?type=' + encodeURIComponent(tmdbType) + '&region=AU').catch(function () { return null; });
    }
    if (item.Type === 'Movie' || item.Type === 'Series') {
      var genres = Array.isArray(item.Genres) ? item.Genres.slice(0, 2) : [];
      if (genres.length) {
        details.similar = await getItems({ IncludeItemTypes: item.Type === 'Series' ? 'Series' : 'Movie', Genres: genres.join(','), ExcludeItemIds: item.Id, Limit: 12, SortBy: 'Random', SortOrder: 'Ascending', Fields: fields() }).catch(function () { return []; });
      }
    }
    remember(details.seasons);
    remember(details.episodes);
    remember(details.similar);
    root.innerHTML = detailsHtml(details);
    bindDetail(root, details);
    markCustomReady(item.Name || 'DINKFLIX');
  }

  function detailPeople(item) {
    var people = Array.isArray(item.People) ? item.People : [];
    return {
      directors: people.filter(function (person) { return String(person.Type || '').toLowerCase() === 'director'; }).slice(0, 8),
      writers: people.filter(function (person) { return String(person.Type || '').toLowerCase() === 'writer'; }).slice(0, 8),
      cast: people.filter(function (person) { return ['actor', 'actress'].includes(String(person.Type || '').toLowerCase()); }).slice(0, 12)
    };
  }

  function technicalHtml(item) {
    var sources = Array.isArray(item.MediaSources) ? item.MediaSources : [];
    var source = sources[0];
    if (!source) {
      return '<div class="df-tech-empty">Technical media information is not available for this title.</div>';
    }
    var streams = Array.isArray(source.MediaStreams) ? source.MediaStreams : [];
    var video = streams.filter(function (stream) { return stream.Type === 'Video'; }).slice(0, 4);
    var audio = streams.filter(function (stream) { return stream.Type === 'Audio'; }).slice(0, 8);
    var subs = streams.filter(function (stream) { return stream.Type === 'Subtitle'; }).slice(0, 12);
    function streamLabel(stream) {
      var parts = [stream.DisplayTitle || stream.Codec, stream.Language, stream.Width && stream.Height ? stream.Width + '×' + stream.Height : '', stream.AudioChannels ? stream.AudioChannels + 'ch' : '', stream.ChannelLayout || ''];
      return parts.filter(Boolean).join(' · ');
    }
    return '<div class="df-tech-grid"><div><span>Container</span><strong>' + esc(source.Container || '—') + '</strong></div><div><span>Bitrate</span><strong>' + esc(source.Bitrate ? Math.round(source.Bitrate / 1000) + ' kbps' : '—') + '</strong></div><div><span>Video</span><strong>' + esc(video.length ? video.map(streamLabel).join(' / ') : '—') + '</strong></div><div><span>Audio</span><strong>' + esc(audio.length ? audio.map(streamLabel).join(' / ') : '—') + '</strong></div><div><span>Subtitles</span><strong>' + esc(subs.length ? subs.map(streamLabel).join(' / ') : 'None') + '</strong></div><div><span>Path</span><strong>' + esc(source.Path || 'Managed by Jellyfin') + '</strong></div></div>';
  }

  function providersHtml(providers) {
    if (!providers) {
      return '';
    }
    var blocks = [];
    [['streaming', 'Stream'], ['free', 'Free'], ['rental', 'Rent'], ['purchase', 'Buy']].forEach(function (pair) {
      var values = Array.isArray(providers[pair[0]]) ? providers[pair[0]] : [];
      if (values.length) {
        blocks.push('<div class="df-provider-group"><span>' + esc(pair[1]) + '</span><div>' + values.map(function (name) { return '<span class="df-provider-pill">' + esc(name) + '</span>'; }).join('') + '</div></div>');
      }
    });
    if (!blocks.length) {
      return '';
    }
    return '<section class="df-info-section"><div class="df-info-section-head"><span class="df-section-kicker">WHERE TO WATCH</span><h2>Available in Australia</h2></div>' + blocks.join('') + '<p class="df-attribution">' + esc(providers.attribution || 'Availability data by JustWatch via TMDB.') + '</p></section>';
  }

  function peopleHtml(label, people) {
    if (!people.length) {
      return '';
    }
    return '<section class="df-info-section"><div class="df-info-section-head"><span class="df-section-kicker">' + esc(label.toUpperCase()) + '</span><h2>' + esc(label) + '</h2></div><div class="df-people-row">' + people.map(function (person) { return '<div class="df-person"><div class="df-person-art">' + (personImageUrl(person, 180) ? '<img loading="lazy" src="' + esc(personImageUrl(person, 180)) + '" alt="' + esc(person.Name || '') + '">' : '<span>' + esc((person.Name || '?').charAt(0)) + '</span>') + '</div><strong>' + esc(person.Name || '') + '</strong><small>' + esc(person.Role || person.Type || '') + '</small></div>'; }).join('') + '</div></section>';
  }

  function detailEndTime(item) {
    if (!item.RunTimeTicks) {
      return '';
    }
    var position = Number(item.UserData && item.UserData.PlaybackPositionTicks || 0);
    return '<span class="df-detail-endtime">' + (position ? 'Resume now · ends around ' : 'Watch now · ends around ') + esc(endTimeLabel(item.RunTimeTicks, position)) + ' local time</span>';
  }

  function detailMediaBadges(item) {
    var badges = coreBadges(item);
    if (item.Genres) {
      badges += item.Genres.slice(0, 5).map(function (genre) { return '<span class="df-badge df-badge-tag">' + esc(genre) + '</span>'; }).join('');
    }
    if (item.Tags) {
      badges += item.Tags.slice(0, 4).map(function (tag) { return '<span class="df-badge df-badge-tag">' + esc(tag) + '</span>'; }).join('');
    }
    return badges;
  }

  function seasonsHtml(seasons) {
    if (!seasons.length) {
      return '<div class="df-inline-empty">No seasons were found.</div>';
    }
    return '<div class="df-detail-grid">' + seasons.map(function (season) { return cardHtml(season, { imageType: 'Primary' }); }).join('') + '</div>';
  }

  function episodesHtml(episodes) {
    if (!episodes.length) {
      return '<div class="df-inline-empty">No episodes were found.</div>';
    }
    return '<div class="df-episode-grid">' + episodes.map(function (episode) {
      var progress = Number(episode.RunTimeTicks || 0) ? Number(episode.UserData && episode.UserData.PlaybackPositionTicks || 0) / Number(episode.RunTimeTicks) * 100 : 0;
      return '<article class="df-episode-card" data-df-episode-card="' + esc(episode.Id) + '"><div class="df-episode-art"><img loading="lazy" src="' + esc(imageUrl(episode, 'Thumb', 900) || imageUrl(episode, 'Primary', 900)) + '" alt="' + esc(episode.Name || '') + '"><span class="df-episode-number">' + esc(String(episode.IndexNumber || '').padStart(2, '0')) + '</span><button type="button" class="df-card-menu" data-df-card-menu="' + esc(episode.Id) + '" aria-label="More actions">' + makeIcon('dots') + '</button><button type="button" class="df-card-play" data-df-card-play="' + esc(episode.Id) + '" aria-label="Play episode">' + makeIcon('play') + '</button>' + (progress > 0 ? '<div class="df-card-progress"><span style="width:' + progress.toFixed(2) + '%"></span></div>' : '') + '</div><div class="df-episode-body"><h3>' + esc(episode.Name || 'Episode') + '</h3><div class="df-episode-meta"><span>' + esc(minutesLabel(episode.RunTimeTicks) || '—') + '</span>' + (episode.PremiereDate ? '<span>•</span><span>' + esc(yearLabel(episode)) + '</span>' : '') + (episode.CommunityRating ? '<span>•</span><span>★ ' + Number(episode.CommunityRating).toFixed(1) + '</span>' : '') + '</div><p>' + esc(episode.Overview || '') + '</p></div></article>';
    }).join('') + '</div>';
  }

  function detailExternalLinks(item) {
    var ids = item.ProviderIds || {};
    var links = [];
    if (ids.Imdb) {
      links.push('<a href="https://www.imdb.com/title/' + encodeURIComponent(ids.Imdb) + '/" target="_blank" rel="noopener noreferrer">IMDb ' + makeIcon('external') + '</a>');
    }
    if (ids.Tmdb) {
      links.push('<a href="https://www.themoviedb.org/' + (item.Type === 'Series' ? 'tv' : 'movie') + '/' + encodeURIComponent(ids.Tmdb) + '" target="_blank" rel="noopener noreferrer">TMDB ' + makeIcon('external') + '</a>');
    }
    return links.length ? '<div class="df-detail-links">' + links.join('') + '</div>' : '';
  }

  function detailsHtml(details) {
    var item = details.item;
    var people = detailPeople(item);
    var kind = item.Type === 'Series' ? 'TV Series' : item.Type === 'Season' ? 'Season ' + String(item.IndexNumber || '') : item.Type === 'Episode' ? 'Episode' : 'Movie';
    var hero = backdropUrl(item, 2800) || imageUrl(item, 'Primary', 1600);
    var playLabel = item.UserData && item.UserData.PlaybackPositionTicks ? 'Resume' : 'Play';
    var children = item.Type === 'Series' ? '<section class="df-info-section"><div class="df-info-section-head"><span class="df-section-kicker">SERIES</span><h2>Seasons</h2></div>' + seasonsHtml(details.seasons) + '</section>' : item.Type === 'Season' ? '<section class="df-info-section"><div class="df-info-section-head"><span class="df-section-kicker">EPISODES</span><h2>Season ' + esc(item.IndexNumber || '') + '</h2></div>' + episodesHtml(details.episodes) + '</section>' : '';
    var similar = details.similar.length ? '<section class="df-info-section"><div class="df-info-section-head"><span class="df-section-kicker">DISCOVERY</span><h2>More like this</h2></div><div class="df-detail-grid">' + details.similar.map(function (candidate) { return cardHtml(candidate); }).join('') + '</div></section>' : '';
    return '<main id="df-detail" class="df-detail-view"><div class="df-detail-backdrop" style="background-image:url(\"' + esc(hero) + '\")"></div><div class="df-detail-shade"></div><div class="df-detail-inner"><div class="df-detail-top"><button class="df-back-button" id="df-detail-back">' + makeIcon('left') + '<span>Back</span></button><div class="df-detail-link-wrap">' + detailExternalLinks(item) + '</div></div><div class="df-detail-main"><div class="df-detail-poster"><img src="' + esc(imageUrl(item, 'Primary', 1100)) + '" alt="' + esc(item.Name || '') + '"></div><div class="df-detail-copy"><span class="df-section-kicker">' + esc(kind.toUpperCase()) + '</span><h1>' + esc(item.Name || '') + '</h1><div class="df-detail-meta">' + (item.CommunityRating ? '<span class="df-detail-rating">★ ' + Number(item.CommunityRating).toFixed(1) + '</span>' : '') + (yearLabel(item) ? '<span>' + esc(yearLabel(item)) + '</span>' : '') + (minutesLabel(item.RunTimeTicks) ? '<span>' + esc(minutesLabel(item.RunTimeTicks)) + '</span>' : '') + (item.OfficialRating ? '<span>' + esc(item.OfficialRating) + '</span>' : '') + detailEndTime(item) + '</div><div class="df-detail-badges">' + detailMediaBadges(item) + '</div><p class="df-detail-overview">' + esc(item.Overview || 'No overview is available for this title.') + '</p><div class="df-detail-actions"><button type="button" class="df-button df-button-primary" id="df-detail-play">' + makeIcon('play') + '<span>' + esc(playLabel) + '</span></button><button type="button" class="df-button df-button-secondary" id="df-detail-list">' + (item.UserData && item.UserData.IsFavorite ? makeIcon('check') + '<span>In My List</span>' : makeIcon('plus') + '<span>My List</span>') + '</button><button type="button" class="df-button df-button-secondary" id="df-detail-more">' + makeIcon('dots') + '<span>More</span></button></div></div></div>' + children + peopleHtml('Cast', people.cast) + peopleHtml('Directors', people.directors) + peopleHtml('Writers', people.writers) + providersHtml(details.providers) + '<section class="df-info-section"><div class="df-info-section-head"><span class="df-section-kicker">MEDIA</span><h2>Video, audio & subtitles</h2></div>' + technicalHtml(item) + '</section>' + similar + '</div></main>';
  }

  function bindDetail(root, details) {
    var item = details.item;
    root.querySelector('#df-detail-back').addEventListener('click', function () {
      if (history.length > 1) {
        history.back();
      } else {
        nativeHash('/home');
      }
    });
    root.querySelector('#df-detail-play').addEventListener('click', function () { playItem(item); });
    root.querySelector('#df-detail-list').addEventListener('click', function () {
      toggleFavorite(item).then(function () {
        renderDetails(item.Id);
      }).catch(function () { toast('Could not update My List.'); });
    });
    root.querySelector('#df-detail-more').addEventListener('click', function (event) {
      openCardMenu(event.currentTarget, item.Id);
    });
    bindCards(root);
    root.querySelectorAll('[data-df-episode-card]').forEach(function (node) {
      node.addEventListener('click', function (event) {
        if (event.target.closest('.df-card-menu, .df-card-play')) {
          return;
        }
        openDetails(node.dataset.dfEpisodeCard);
      });
    });
  }

  async function renderList() {
    var root = ensureCustomRoot('df-page');
    root.innerHTML = '<div class="df-page-header"><div><span class="df-section-kicker">YOUR LIBRARY</span><h1>My List</h1><p>Titles you\'ve saved for later.</p></div></div><div id="df-library-grid" class="df-detail-grid"><div class="df-inline-empty">Loading…</div></div>';
    var items = await getItems({ IncludeItemTypes: 'Movie,Series', IsFavorite: true, Limit: 300, SortBy: 'SortName', SortOrder: 'Ascending', Fields: fields() });
    remember(items);
    root.querySelector('#df-library-grid').innerHTML = items.length ? items.map(function (item) { return cardHtml(item); }).join('') : '<div class="df-empty-state">Your list is empty.<span>Add something from the three-dot menu.</span></div>';
    bindCards(root);
    markCustomReady('My List');
  }

  function renderAbout() {
    var root = ensureCustomRoot('df-page');
    root.innerHTML = '<div class="df-about-wrap"><div class="df-page-header"><div><span class="df-section-kicker">THE PROJECT</span><h1>About DINKFLIX</h1><p>DINKFLIX started with a simple idea: make a personal Jellyfin server feel like a streaming service that friends and family can sit down and just use.</p></div></div><section class="df-about-card"><div class="df-about-art"><div class="df-about-mark"><span>DINK</span><span>FLIX</span></div><small>Built around Jellyfin. Designed around the people using it.</small></div><div class="df-about-copy"><span class="df-section-kicker">WHY IT EXISTS</span><h2>Fast over flashy. Clear over clever.</h2><p>The goal isn\'t to hide Jellyfin\'s flexibility. It\'s to make the everyday experience feel considered: better discovery, cleaner navigation, useful information and a visual identity that belongs to DINKFLIX.</p><p>DINKFLIX keeps Jellyfin underneath. Playback, accounts, permissions and server management stay where they belong. The web experience gets the polish.</p><div class="df-about-facts"><div><span>Frontend</span><strong>DINKFLIX Web</strong></div><div><span>Backend</span><strong>Jellyfin 12.1</strong></div><div><span>Focus</span><strong>Desktop Web</strong></div></div></div></section></div>';
    markCustomReady('About DINKFLIX');
  }

  async function randomTitle() {
    try {
      var items = await getItems({ IncludeItemTypes: 'Movie,Series', Limit: 100, SortBy: 'Random', SortOrder: 'Ascending', Fields: fields() });
      if (items.length) {
        remember(items);
        openDetails(items[Math.floor(Math.random() * items.length)].Id);
      }
    } catch (error) {
      toast('Could not find a random title.');
    }
  }

  async function toggleFavorite(item) {
    var favorite = Boolean(item && item.UserData && item.UserData.IsFavorite);
    await apiRequest('/UserFavoriteItems/' + encodeURIComponent(item.Id) + '?UserId=' + encodeURIComponent(state.userId), favorite ? 'DELETE' : 'POST');
    item.UserData = item.UserData || {};
    item.UserData.IsFavorite = !favorite;
    state.cardData.set(item.Id, item);
    toast(favorite ? 'Removed from My List.' : 'Added to My List.');
  }

  function playbackManager() {
    if (window.playbackManager && typeof window.playbackManager.play === 'function') {
      return window.playbackManager;
    }
    return null;
  }

  async function playItem(item) {
    closeMenus();
    closeModals();
    state.nativeAction = true;
    if (playbackManager()) {
      try {
        await playbackManager().play({ items: [item], fullscreen: true, enableRemotePlayers: true });
        state.nativeAction = false;
        hideRouteCover();
        return;
      } catch (error) {
        console.warn('[DINKFLIX] playbackManager failed; using native fallback.', error);
      }
    }
    showRouteCover();
    nativeHash('/details', { id: item.Id });
    waitForNativePlayButton();
  }

  function waitForNativePlayButton() {
    var attempts = 0;
    var interval = setInterval(function () {
      attempts += 1;
      var nodes = Array.from(document.querySelectorAll('button, a, [role="button"]')).filter(function (node) {
        return !node.closest('#dinkflix-nav, #dinkflix-menu-root, #dinkflix-modal-root');
      });
      var play = nodes.find(function (node) {
        var text = safeText(node.textContent).trim();
        var label = safeText(node.getAttribute('aria-label')) + ' ' + safeText(node.getAttribute('title'));
        return /^(play|resume)$/i.test(text) || /\b(play|resume)\b/i.test(label);
      });
      if (play) {
        clearInterval(interval);
        state.nativeAction = false;
        play.click();
        setTimeout(function () {
          hideRouteCover();
        }, 350);
      }
      if (attempts >= 30) {
        clearInterval(interval);
        state.nativeAction = false;
        hideRouteCover();
        toast('Jellyfin did not expose a playable control.');
      }
    }, 300);
  }

  async function playFromHere(item) {
    if (item.Type === 'Series' || item.Type === 'Season') {
      var parentId = item.Id;
      var episodes = item.Type === 'Series' ? await getItems({ ParentId: parentId, IncludeItemTypes: 'Episode', SortBy: 'ParentIndexNumber,IndexNumber', SortOrder: 'Ascending', Limit: 500, Fields: fields() }) : await getItems({ ParentId: parentId, IncludeItemTypes: 'Episode', SortBy: 'IndexNumber', SortOrder: 'Ascending', Limit: 500, Fields: fields() });
      var next = episodes.find(function (episode) { return !(episode.UserData && episode.UserData.Played); }) || episodes[0];
      if (next) {
        remember(episodes);
        await playItem(next);
        return;
      }
    }
    await playItem(item);
  }

  async function copyStreamUrl(item) {
    var url = apiUrl('/Videos/' + encodeURIComponent(item.Id) + '/stream?Static=true');
    try {
      await navigator.clipboard.writeText(url);
      toast('Stream URL copied.');
    } catch (error) {
      toast('Could not copy the stream URL.');
    }
  }

  async function downloadItem(item) {
    window.open(apiUrl('/Items/' + encodeURIComponent(item.Id) + '/Download'), '_blank', 'noopener');
  }

  async function deleteMedia(item) {
    if (!confirm('Delete “' + item.Name + '” from Jellyfin?\n\nThis removes the media item from the server library.')) {
      return;
    }
    await apiRequest('/Items/' + encodeURIComponent(item.Id), 'DELETE');
    toast('Media deleted.');
    nativeHash('/home');
  }

  async function refreshMetadata(item) {
    await apiRequest('/Items/' + encodeURIComponent(item.Id) + '/Refresh', 'POST');
    toast('Metadata refresh started.');
  }

  async function chooseDestination(title, items, callback) {
    closeMenus();
    var root = ensureModalRoot();
    var overlay = createNode('<div class="df-modal-backdrop"><section class="df-modal"><header><div><span class="df-section-kicker">DINKFLIX</span><h2>' + esc(title) + '</h2></div><button class="df-icon-button" data-close type="button">' + makeIcon('close') + '</button></header><div class="df-modal-body"><div class="df-picker-list" data-picker-list></div></div></section></div>');
    root.appendChild(overlay);
    var list = overlay.querySelector('[data-picker-list]');
    list.innerHTML = items.length ? items.map(function (item) { return '<button class="df-picker-row" data-df-picker="' + esc(item.Id) + '" type="button"><span>' + esc(item.Name || '') + '</span>' + makeIcon('right') + '</button>'; }).join('') : '<div class="df-inline-empty">Nothing is available.</div>';
    overlay.querySelector('[data-close]').addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (event) { if (event.target === overlay) { overlay.remove(); } });
    list.querySelectorAll('[data-df-picker]').forEach(function (button) {
      button.addEventListener('click', function () {
        Promise.resolve(callback(button.dataset.dfPicker)).then(function () { overlay.remove(); }).catch(function () { toast('That action failed.'); });
      });
    });
  }

  async function chooseCollection(item) {
    var collections = await getItems({ IncludeItemTypes: 'BoxSet', Recursive: true, Limit: 200, SortBy: 'SortName', SortOrder: 'Ascending' });
    return chooseDestination('Add to collection', collections, async function (collectionId) {
      await apiRequest('/Collections/' + encodeURIComponent(collectionId) + '/Items?Ids=' + encodeURIComponent(item.Id), 'POST');
      toast('Added to collection.');
    });
  }

  async function choosePlaylist(item) {
    var playlists = await getItems({ IncludeItemTypes: 'Playlist', Recursive: false, Limit: 200, SortBy: 'SortName', SortOrder: 'Ascending' });
    return chooseDestination('Add to playlist', playlists, async function (playlistId) {
      await apiRequest('/Playlists/' + encodeURIComponent(playlistId) + '/Items?Ids=' + encodeURIComponent(item.Id) + '&UserId=' + encodeURIComponent(state.userId), 'POST');
      toast('Added to playlist.');
    });
  }

  function openNativeEdit(item, pattern) {
    closeMenus();
    closeModals();
    state.nativeAction = true;
    showRouteCover();
    location.hash = '#/details?id=' + encodeURIComponent(item.Id);
    var attempts = 0;
    var interval = setInterval(function () {
      attempts += 1;
      var candidates = Array.from(document.querySelectorAll('button, a, [role="button"]')).filter(function (node) { return !node.closest('#dinkflix-nav, #dinkflix-menu-root, #dinkflix-modal-root'); });
      var target = candidates.find(function (node) {
        var text = safeText(node.textContent) + ' ' + safeText(node.getAttribute('aria-label')) + ' ' + safeText(node.getAttribute('title'));
        return pattern.test(text);
      });
      if (target) {
        clearInterval(interval);
        target.click();
        state.nativeAction = false;
        hideRouteCover();
      }
      if (attempts > 35) {
        clearInterval(interval);
        state.nativeAction = false;
        hideRouteCover();
        toast('Jellyfin did not expose that editor.');
      }
    }, 250);
  }

  function mediaInfo(item) {
    closeMenus();
    var root = ensureModalRoot();
    var overlay = createNode('<div class="df-modal-backdrop"><section class="df-modal df-modal-wide"><header><div><span class="df-section-kicker">MEDIA INFO</span><h2>' + esc(item.Name || '') + '</h2></div><button class="df-icon-button" data-close type="button">' + makeIcon('close') + '</button></header><div class="df-modal-body">' + technicalHtml(item) + '</div></section></div>');
    root.appendChild(overlay);
    overlay.querySelector('[data-close]').addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (event) { if (event.target === overlay) { overlay.remove(); } });
  }

  async function openCardMenu(anchor, id) {
    closeMenus();
    var item = state.cardData.get(id);
    if (!item) {
      item = await getItem(id).catch(function () { return null; });
    }
    if (!item) {
      toast('Unable to load that title.');
      return;
    }
    state.cardData.set(item.Id, item);
    var menu = createNode('<div class="df-floating-menu df-context-menu"></div>');
    menu.appendChild(menuItem('Play', 'play', function () { return playItem(item); }));
    menu.appendChild(menuItem(item.Type === 'Series' || item.Type === 'Season' ? 'Play next episode' : 'Resume', 'play', function () { return playFromHere(item); }));
    menu.appendChild(menuSeparator());
    menu.appendChild(menuItem(item.UserData && item.UserData.IsFavorite ? 'Remove from My List' : 'Add to My List', item.UserData && item.UserData.IsFavorite ? 'check' : 'plus', function () { return toggleFavorite(item); }));
    menu.appendChild(menuItem('Select', 'check', function () { state.selectionMode = true; toggleSelection(item.Id); }));
    menu.appendChild(menuItem('Add to collection', 'collection', function () { return chooseCollection(item); }));
    menu.appendChild(menuItem('Add to playlist', 'playlist', function () { return choosePlaylist(item); }));
    if (['Movie', 'Episode', 'Video'].includes(item.Type)) {
      menu.appendChild(menuItem('Download', 'download', function () { return downloadItem(item); }));
      menu.appendChild(menuItem('Copy Stream URL', 'copy', function () { return copyStreamUrl(item); }));
    }
    if (state.user && state.user.Policy && state.user.Policy.IsAdministrator) {
      menu.appendChild(menuItem('Delete media', 'trash', function () { return deleteMedia(item); }, 'df-menu-danger'));
      menu.appendChild(menuSeparator());
      menu.appendChild(menuItem('Edit metadata', 'tools', function () { openNativeEdit(item, /edit metadata/i); }));
      menu.appendChild(menuItem('Edit images', 'movie', function () { openNativeEdit(item, /edit images/i); }));
      menu.appendChild(menuItem('Edit subtitles', 'movie', function () { openNativeEdit(item, /edit subtitles/i); }));
      menu.appendChild(menuItem('Identify', 'tools', function () { openNativeEdit(item, /identify/i); }));
      menu.appendChild(menuItem('Media Info', 'info', function () { mediaInfo(item); }));
      menu.appendChild(menuItem('Refresh metadata', 'refresh', function () { return refreshMetadata(item); }));
    } else {
      menu.appendChild(menuSeparator());
      menu.appendChild(menuItem('Media Info', 'info', function () { mediaInfo(item); }));
    }
    ensureMenuRoot().appendChild(menu);
    positionFloating(menu, anchor);
  }

  function toggleSelection(id) {
    if (state.selectedIds.has(id)) {
      state.selectedIds.delete(id);
    } else {
      state.selectedIds.add(id);
    }
    renderSelectionBar();
    document.querySelectorAll('[data-df-card]').forEach(function (card) {
      var selected = state.selectedIds.has(card.dataset.dfCard);
      card.classList.toggle('is-selected', selected);
    });
  }

  function renderSelectionBar() {
    document.getElementById('dinkflix-selection-bar')?.remove();
    if (!state.selectionMode) {
      return;
    }
    var bar = createNode('<div id="dinkflix-selection-bar" class="df-selection-bar"><strong>' + state.selectedIds.size + ' selected</strong><span>Select titles to work with them together.</span><button type="button" id="df-selection-cancel" class="df-button df-button-secondary">Cancel</button></div>');
    document.body.appendChild(bar);
    bar.querySelector('#df-selection-cancel').addEventListener('click', function () {
      state.selectionMode = false;
      state.selectedIds.clear();
      renderSelectionBar();
      document.querySelectorAll('.df-card.is-selected').forEach(function (node) { node.classList.remove('is-selected'); });
    });
  }

  async function decorateNativeLibraryCards() {
    var parsed = parseHash();
    if (!['/movies', '/tv', '/tvshows'].includes(parsed.path)) {
      return;
    }
    var cards = Array.from(document.querySelectorAll('.itemsContainer .card[data-id], .itemsContainer .card[data-item-id]'));
    for (var index = 0; index < cards.length; index++) {
      var card = cards[index];
      if (card.closest('#dinkflix-app') || card.querySelector('.df-native-badges')) continue;
      var id = card.getAttribute('data-id') || card.getAttribute('data-item-id');
      if (!id) continue;
      var item = state.cardData.get(id) || await getItem(id).catch(function () { return null; });
      if (!item) continue;
      var imageContainer = card.querySelector('.cardImageContainer');
      if (!imageContainer) continue;
      var badges = document.createElement('div');
      badges.className = 'df-native-badges';
      var html = ratingBadge(item) + qualityBadges(item);
      if (item.OfficialRating) html += '<span class="df-badge df-badge-age">' + esc(item.OfficialRating) + '</span>';
      (Array.isArray(item.Genres) ? item.Genres.slice(0, 2) : []).forEach(function (genre) {
        html += '<span class="df-badge df-badge-tag">' + esc(genre) + '</span>';
      });
      (Array.isArray(item.Tags) ? item.Tags.slice(0, 2) : []).forEach(function (tag) {
        html += '<span class="df-badge df-badge-tag">' + esc(tag) + '</span>';
      });
      if (html) {
        badges.innerHTML = html;
        imageContainer.style.position = 'relative';
        imageContainer.appendChild(badges);
      }
    }
  }

  function nativeRouteReadyDelay() {
    setTimeout(function () {
      markNativeReady();
    }, 220);
  }

  async function renderRoute() {
    var info = route();
    var key = info.type + ':' + (info.id || '');
    if (key === state.lastRoute && state.started) {
      return;
    }
    state.lastRoute = key;
    if (state.heroTimer && info.type !== 'home') {
      clearInterval(state.heroTimer);
      state.heroTimer = null;
    }
    closeMenus();
    if (info.type === 'home' && !state.nativeAction) {
      showRouteCover();
      document.body.classList.add('df-public-page');
      refreshNav();
      await renderHome();
      return;
    }
    if (info.type === 'list' && !state.nativeAction) {
      showRouteCover();
      document.body.classList.add('df-public-page');
      refreshNav();
      await renderList();
      return;
    }
    if (info.type === 'about' && !state.nativeAction) {
      showRouteCover();
      document.body.classList.add('df-public-page');
      refreshNav();
      renderAbout();
      return;
    }
    if (info.type === 'details' && !state.nativeAction) {
      showRouteCover();
      document.body.classList.add('df-public-page');
      refreshNav();
      await renderDetails(info.id);
      return;
    }
    document.body.classList.toggle('df-public-page', shouldHaveNav(info));
    if (shouldHaveNav(info)) {
      refreshNav();
    } else {
      state.nav?.remove();
      state.nav = null;
    }
    if (['/movies', '/tv', '/tvshows'].includes(parseHash().path)) {
      setTimeout(function () {
        decorateNativeLibraryCards().catch(function (error) {
          console.debug('[DINKFLIX] Native library badge pass failed.', error);
        });
      }, 700);
    }

    if (info.type === 'playback') {
      clearDinkflixRoots();
      document.body.classList.remove('df-custom-active');
      document.body.classList.add('df-player-page');
      hideRouteCover();
      finishBoot();
    } else {
      document.body.classList.remove('df-player-page');
      nativeRouteReadyDelay();
    }
    state.nativeAction = false;
  }

  function installGlobalListeners() {
    window.addEventListener('hashchange', function () {
      showRouteCover();
      renderRoute().catch(function (error) { console.error('[DINKFLIX] Route render failed.', error); markNativeReady(); });
    });
    document.addEventListener('click', function (event) {
      if (!event.target.closest('#dinkflix-menu-root, #df-tools, #df-user, #df-nav-more, #dinkflix-modal-root')) {
        closeMenus();
      }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeMenus();
        closeModals();
        if (state.selectionMode) {
          state.selectionMode = false;
          state.selectedIds.clear();
          renderSelectionBar();
        }
      }
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && state.heroTimer) {
        clearInterval(state.heroTimer);
        state.heroTimer = null;
      } else if (!document.hidden && state.heroItems.length && route().type === 'home') {
        showHero(state.heroIndex);
      }
    });
  }

  function setInitialUiState() {
    document.documentElement.classList.add('df-dinkflix-runtime');
    document.body.classList.add('df-dinkflix-page');
    ensureBoot();
  }

  async function boot() {
    if (state.started) {
      return;
    }
    state.started = true;
    setInitialUiState();
    installGlobalListeners();
    try {
      await loadUser();
      await loadViews();
      buildNav();
      refreshNav();
      await renderRoute();
    } catch (error) {
      console.error('[DINKFLIX] Boot failed.', error);
      clearDinkflixRoots();
      state.nav?.remove();
      state.nav = null;
      document.body.classList.remove('df-custom-active');
      finishBoot();
      toast('DINKFLIX could not connect to this Jellyfin session.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}());
