/* DINKFLIX Web 2.2 — lightweight desktop-first Jellyfin experience. */
(() => {
  'use strict';

  if (window.__DINKFLIX_WEB_22__) return;
  window.__DINKFLIX_WEB_22__ = true;

  const VERSION = '2.2.0';
  const state = {
    userId: null,
    user: null,
    app: null,
    nav: null,
    shell: null,
    routeKey: '',
    renderedKey: '',
    heroItems: [],
    heroIndex: 0,
    heroTimer: null,
    heroPause: false,
    observer: null,
    observerTimer: null,
    library: { movies: [], shows: [], movieStart: 0, showStart: 0, movieSort: 'SortName', showSort: 'SortName' },
    list: [],
    listenersAttached: false,
    config: {
      accentColor: '#00FFC6',
      heroRotationSeconds: 15,
      showRatings: true,
      showMediaBadges: true,
      showMyList: true
    }
  };

  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const trunc = (value, length = 220) => {
    const text = String(value ?? '').trim();
    return text.length <= length ? text : `${text.slice(0, length - 1).trimEnd()}…`;
  };

  const legacyApi = () => window.ApiClient || null;

  const readCredentials = () => {
    try {
      const raw = localStorage.getItem('jellyfin_credentials');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const servers = Array.isArray(parsed?.Servers) ? parsed.Servers : [];
      const origin = window.location.origin;
      const matching = servers.find((server) => {
        return ['ManualAddress', 'RemoteAddress', 'LocalAddress'].some((key) => {
          const value = server?.[key];
          try { return value && new URL(value).origin === origin; } catch { return false; }
        });
      });
      const server = matching || servers[servers.length - 1];
      if (!server?.UserId || !server?.AccessToken) return null;
      return server;
    } catch {
      return null;
    }
  };

  const credentials = () => readCredentials();

  const getUserId = () => {
    const stored = credentials();
    try { return stored?.UserId || legacyApi()?.getCurrentUserId?.() || null; } catch { return stored?.UserId || null; }
  };

  const getServerId = () => {
    const stored = credentials();
    try { return stored?.Id || legacyApi()?.serverId?.() || ''; } catch { return stored?.Id || ''; }
  };

  const getBaseUrl = () => {
    try {
      const current = new URL(window.location.href);
      const lower = current.pathname.toLowerCase();
      const webIndex = lower.indexOf('/web/');
      if (webIndex >= 0) return current.origin + current.pathname.slice(0, webIndex);
      if (lower.endsWith('/web')) return current.origin + current.pathname.slice(0, -4);
      return current.origin;
    } catch {
      return window.location.origin;
    }
  };

  const authHeader = () => {
    const server = credentials();
    if (!server?.AccessToken) return {};
    return {
      Authorization: `MediaBrowser Client="DINKFLIX Web", Device="Browser", DeviceId="dinkflix-web", Version="2.2.0", Token="${server.AccessToken}"`
    };
  };

  const jellyfinRequest = async (path, options = {}) => {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      credentials: 'include',
      cache: options.cache || 'no-store',
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...authHeader(),
        ...(options.headers || {})
      },
      body: options.body
    });
    if (!response.ok) throw new Error(`Jellyfin API returned HTTP ${response.status}`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  };

  const loadConfig = async () => {
    try {
      const response = await fetch(`${getBaseUrl()}/Plugins/DinkFlixWeb/Client/Configuration`, {
        credentials: 'include',
        headers: { Accept: 'application/json', ...authHeader() },
        cache: 'no-store'
      });
      if (!response.ok) return;
      const config = await response.json();
      state.config = { ...state.config, ...config };
      if (/^#[0-9a-f]{6}$/i.test(state.config.accentColor)) {
        document.documentElement.style.setProperty('--df-accent', state.config.accentColor);
      }
    } catch (error) {
      console.debug('[DINKFLIX] Using default frontend settings:', error);
    }
  };

  const imageUrl = (item, type = 'Primary', width = 720) => {
    if (!item?.Id) return '';
    try {
      const tag = item.ImageTags?.[type];
      const params = new URLSearchParams({ maxWidth: String(width), quality: '86' });
      if (tag) params.set('tag', tag);
      const token = credentials()?.AccessToken;
      if (token) params.set('api_key', token);
      return `${getBaseUrl()}/Items/${encodeURIComponent(item.Id)}/Images/${encodeURIComponent(type)}?${params.toString()}`;
    } catch { return ''; }
  };

  const backdropUrl = (item, width = 1500) => {
    if (!item?.Id) return '';
    try {
      const types = ['Backdrop', 'Primary', 'Thumb'];
      const type = types.find((candidate) => item.ImageTags?.[candidate]);
      if (!type) return '';
      const tag = item.ImageTags?.[type];
      const params = new URLSearchParams({ maxWidth: String(width), quality: '82' });
      if (tag) params.set('tag', tag);
      const token = credentials()?.AccessToken;
      if (token) params.set('api_key', token);
      return `${getBaseUrl()}/Items/${encodeURIComponent(item.Id)}/Images/${encodeURIComponent(type)}/0?${params.toString()}`;
    } catch { return ''; }
  };

  const getItems = async (options = {}) => {
    if (!state.userId) return [];
    const defaults = {
      UserId: state.userId,
      Recursive: true,
      IncludeItemTypes: 'Movie,Series',
      Fields: 'PrimaryImageAspectRatio,Overview,Genres,Tags,People,MediaSources,ProviderIds,UserData,OfficialRating,ProductionYear,RunTimeTicks,Width,Height,VideoRange,VideoRangeType,DateCreated,DatePlayed',
      Limit: 24,
      StartIndex: 0,
      SortBy: 'SortName',
      SortOrder: 'Ascending'
    };
    const params = new URLSearchParams();
    Object.entries({ ...defaults, ...options }).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    try {
      const result = await jellyfinRequest(`/Users/${encodeURIComponent(state.userId)}/Items?${params.toString()}`);
      return Array.isArray(result?.Items) ? result.Items : [];
    } catch (error) {
      console.warn('[DINKFLIX] Jellyfin API request failed:', error);
      state.lastApiError = error;
      return [];
    }
  };

  const getItem = async (id) => {
    if (!state.userId || !id) return null;
    try {
      return await jellyfinRequest(`/Users/${encodeURIComponent(state.userId)}/Items/${encodeURIComponent(id)}?Fields=PrimaryImageAspectRatio,Overview,Genres,Tags,People,MediaSources,ProviderIds,UserData,OfficialRating,ProductionYear,RunTimeTicks,Width,Height,VideoRange,VideoRangeType,DateCreated,DatePlayed,ChildCount`);
    } catch (error) {
      console.warn('[DINKFLIX] Unable to load item:', error);
      state.lastApiError = error;
      return null;
    }
  };

  const openNativeDetails = (id, autoPlay = false) => {
    if (!id) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('df');
    url.searchParams.delete('id');
    if (autoPlay) sessionStorage.setItem('dinkflix-autoplay', id);
    else sessionStorage.removeItem('dinkflix-autoplay');
    window.history.pushState({}, '', url.toString());
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.location.hash = `#/details?id=${encodeURIComponent(id)}&serverId=${encodeURIComponent(getServerId())}`;
  };

  const tryNativePlayback = async () => false;

  const playItem = async (item) => {
    if (!item?.Id) return;
    // Let Jellyfin render its native player before starting playback.
    navigate('native');
    await new Promise((resolve) => window.setTimeout(resolve, 50));
    if (await tryNativePlayback(item)) return;
    openNativeDetails(item.Id, true);
  };

  const nativeUserMenu = () => {
    const selectors = [
      '.headerUserButton',
      '.headerUserButton button',
      '[data-action="open-user-menu"]',
      '.userMenuButton'
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) { el.click(); return true; }
    }
    return false;
  };

  const findRequestsHref = () => {
    const anchors = [...document.querySelectorAll('a[href]')];
    const found = anchors.find((anchor) => {
      const text = `${anchor.textContent || ''} ${anchor.getAttribute('aria-label') || ''}`.toLowerCase();
      const href = anchor.getAttribute('href') || '';
      return /seerr|request/.test(text) || /seerr|request/i.test(href);
    });
    return found?.getAttribute('href') || null;
  };

  const routeFromUrl = () => {
    const url = new URL(window.location.href);
    const df = url.searchParams.get('df');
    if (df === 'search') return 'search';
    if (df === 'movies') return 'movies';
    if (df === 'shows') return 'shows';
    if (df === 'list') return 'list';
    if (df === 'about') return 'about';
    if (df === 'item') return 'item';

    const hash = window.location.hash.toLowerCase();
    if (hash.includes('/dinkflix-')) return 'native';
    if (hash.includes('/details') || hash.includes('/video')) return 'native';
    if (hash === '' || hash.includes('/home') || hash.includes('/index')) {
      const path = url.pathname.toLowerCase();
      if (path.endsWith('/web/') || path.endsWith('/web/index.html') || path.endsWith('/index.html')) return 'home';
    }
    return 'native';
  };

  const navigate = (route, params = {}) => {
    const url = new URL(window.location.href);
    url.searchParams.delete('df');
    url.searchParams.delete('id');
    url.searchParams.delete('query');
    if (route && route !== 'native') {
      url.searchParams.set('df', route);
      if (params.id) url.searchParams.set('id', params.id);
      if (params.query != null) url.searchParams.set('query', params.query);
    }
    window.history.pushState({ dinkflix: route, ...params }, '', url.toString());
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const routeHref = (route, params = {}) => {
    const url = new URL(window.location.href);
    url.searchParams.delete('df');
    url.searchParams.delete('id');
    url.searchParams.delete('query');
    if (route && route !== 'native') {
      url.searchParams.set('df', route);
      if (params.id) url.searchParams.set('id', params.id);
      if (params.query != null) url.searchParams.set('query', params.query);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  };

  const setActiveNav = (route) => {
    if (!state.nav) return;
    state.nav.querySelectorAll('.df-nav-link').forEach((el) => {
      const target = el.dataset.route || '';
      el.classList.toggle('df-active', target === route || (route === 'item' && target === 'home'));
    });
  };

  const makeNav = () => {
    if (document.getElementById('dinkflix-nav')) return document.getElementById('dinkflix-nav');
    const nav = document.createElement('nav');
    nav.id = 'dinkflix-nav';
    nav.setAttribute('aria-label', 'DINKFLIX navigation');
    nav.innerHTML = `
      <div class="df-nav-inner">
        <a class="df-brand" href="?df=home" data-df-route="home" aria-label="DINKFLIX home">
          <span class="df-brand-dot" aria-hidden="true"></span><span>DINKFLIX</span>
        </a>
        <div class="df-nav-links">
          <a class="df-nav-link" data-route="home" href="?df=home" data-df-route="home"><span class="df-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/></svg></span><span class="df-nav-label">Home</span></a>
          <a class="df-nav-link" data-route="movies" href="?df=movies" data-df-route="movies"><span class="df-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="m8 3.5 3 4h4l-3-4M8 20.5l3-4h4l-3 4M5 9h14M5 15h14"/></svg></span><span class="df-nav-label">Movies</span></a>
          <a class="df-nav-link" data-route="shows" href="?df=shows" data-df-route="shows"><span class="df-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M8 20v-4M16 20v-4M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01"/></svg></span><span class="df-nav-label">TV Shows</span></a>
          <a class="df-nav-link df-mylist-nav" data-route="list" href="?df=list" data-df-route="list"><span class="df-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 4.5h12v16l-6-3-6 3z"/><path d="M12 8v5M9.5 10.5h5"/></svg></span><span class="df-nav-label">My List</span></a>
          <button class="df-nav-link" id="df-requests-link" type="button" hidden><span class="df-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg></span><span class="df-nav-label">Requests</span></button>
        </div>
        <div class="df-nav-spacer"></div>
        <button class="df-search-button" id="df-search" type="button" aria-label="Search" title="Search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.2"/><path d="m16 16 5 5"/></svg></button>
        <button class="df-user-button" id="df-user" type="button" aria-label="User menu" title="User menu"><span class="df-avatar" id="df-avatar">●</span></button>
      </div>`;
    document.body.appendChild(nav);
    state.nav = nav;

    nav.querySelector('#df-search')?.addEventListener('click', () => {
      navigate('search');
    });
    nav.querySelector('#df-user')?.addEventListener('click', nativeUserMenu);

    const requestButton = nav.querySelector('#df-requests-link');
    requestButton?.addEventListener('click', () => {
      const href = requestButton.dataset.href;
      if (href) window.location.href = href;
    });

    const anchorRoutes = nav.querySelectorAll('a.df-nav-link');
    anchorRoutes.forEach((anchor) => anchor.addEventListener('click', () => setTimeout(() => setActiveNav(routeFromUrl()), 0)));

    return nav;
  };

  const updateAvatar = () => {
    const target = document.getElementById('df-avatar');
    if (!target || !state.user) return;
    const tag = state.user.PrimaryImageTag;
    if (tag) {
      target.innerHTML = `<img src="${esc(`${getBaseUrl()}/Users/${encodeURIComponent(state.user.Id)}/Images/Primary?tag=${encodeURIComponent(tag)}&maxWidth=64`)}" alt="">`;
    } else {
      const initial = String(state.user.Name || '?').trim().charAt(0).toUpperCase();
      target.textContent = initial || '●';
    }
  };

  const ensureShell = () => {
    let shell = document.getElementById('dinkflix-app-shell');
    if (!shell) {
      shell = document.createElement('main');
      shell.id = 'dinkflix-app-shell';
      document.body.appendChild(shell);
    }
    state.shell = shell;
    return shell;
  };

  const isCustomRoute = (route) => route !== 'native';

  const syncBody = (route) => {
    document.body.classList.toggle('df-custom-route', isCustomRoute(route));
    if (!isCustomRoute(route)) {
      state.shell?.replaceChildren();
      state.renderedKey = '';
    }
  };

  const bindImageFallbacks = (root) => {
    root.querySelectorAll('img[data-df-fallback]').forEach((img) => {
      img.addEventListener('error', () => {
        const fallback = img.dataset.dfFallback;
        if (fallback && img.src !== fallback) img.src = fallback;
      }, { once: true });
    });
  };

  const mediaBadges = (item) => {
    const badges = [];
    const width = Number(item.Width || 0);
    const height = Number(item.Height || 0);
    if (height >= 2000 || width >= 3500) badges.push(['4K', 'quality']);
    else if (height >= 1080 || width >= 1900) badges.push(['1080p', 'quality']);
    if (item.VideoRange || /hdr/i.test(item.VideoRangeType || '')) badges.push(['HDR', 'hdr']);
    if (item.OfficialRating) badges.push([item.OfficialRating, 'age']);
    return badges;
  };

  const ratingBadge = (item) => {
    if (!state.config.showRatings) return '';
    const rating = Number(item.CommunityRating || 0);
    return rating > 0 ? `<span class="df-badge df-badge-rating">★ ${rating.toFixed(1)}</span>` : '';
  };

  const badgesHtml = (item) => {
    const quality = state.config.showMediaBadges ? mediaBadges(item).map(([label, type]) => `<span class="df-badge df-badge-${type}">${esc(label)}</span>`).join('') : '';
    const tag = Array.isArray(item.Tags) ? item.Tags.find(Boolean) : '';
    const tagHtml = tag ? `<span class="df-badge df-badge-tag">${esc(tag)}</span>` : '';
    return `${ratingBadge(item)}${quality}${tagHtml}`;
  };

  const itemMeta = (item) => {
    const parts = [];
    if (item.ProductionYear) parts.push(String(item.ProductionYear));
    if (item.Type === 'Series' && item.ChildCount) parts.push(`${item.ChildCount} season${item.ChildCount === 1 ? '' : 's'}`);
    if (item.Type === 'Movie' && item.RunTimeTicks) {
      const minutes = Math.round(Number(item.RunTimeTicks) / 600000000);
      if (minutes > 0) parts.push(`${Math.floor(minutes / 60)}h ${minutes % 60}m`);
    }
    if (item.Type === 'Episode' && item.ParentIndexNumber != null && item.IndexNumber != null) {
      parts.push(`S${String(item.ParentIndexNumber).padStart(2, '0')} E${String(item.IndexNumber).padStart(2, '0')}`);
    }
    return parts.map(esc).join('<span class="df-meta-dot">•</span>');
  };

  const card = (item, options = {}) => {
    const wide = Boolean(options.wide);
    const progress = Number(item.UserData?.PlayedPercentage || 0);
    const src = imageUrl(item, wide ? 'Thumb' : 'Primary', wide ? 920 : 640) || imageUrl(item, 'Primary', 640);
    const fallback = imageUrl(item, 'Primary', 640);
    const tags = Array.isArray(item.Tags) ? item.Tags.filter(Boolean).slice(0, 2) : [];
    const desc = trunc(item.Overview || '', 135);
    const title = esc(item.Name || 'Untitled');
    return `
      <article class="df-card ${wide ? 'df-card-wide' : ''}" data-item-id="${esc(item.Id)}">
        <a class="df-card-link" href="?df=item&id=${encodeURIComponent(item.Id)}" data-df-route="item" aria-label="Open ${title}">
          <div class="df-card-poster">
            <img class="df-card-image" src="${esc(src)}" data-df-fallback="${esc(fallback)}" loading="lazy" decoding="async" alt="${title}">
            <div class="df-card-gradient" aria-hidden="true"></div>
            <div class="df-card-badges">${badgesHtml(item)}</div>
            ${progress > 0 ? `<div class="df-card-progress" aria-label="${Math.round(progress)} percent watched"><span style="width:${Math.min(progress, 100)}%"></span></div>` : ''}
          </div>
          <div class="df-card-body">
            <h3 class="df-card-title">${title}</h3>
            <div class="df-card-meta">${itemMeta(item)}</div>
          </div>
        </a>
        <div class="df-card-hover" aria-hidden="true">
          ${desc ? `<p class="df-card-hover-copy">${esc(desc)}</p>` : ''}
          ${tags.length ? `<div class="df-card-meta" style="margin-bottom:8px">${tags.map((tag) => `<span>${esc(tag)}</span>`).join('<span class="df-meta-dot">•</span>')}</div>` : ''}
          <div class="df-card-hover-actions">
            <button class="df-icon-button df-play-item" type="button" aria-label="Play ${title}" title="Play">▶</button>
            <button class="df-icon-button df-list-item" type="button" aria-label="Add ${title} to My List" title="Add to My List">＋</button>
            <a class="df-icon-button" href="?df=item&id=${encodeURIComponent(item.Id)}" data-df-route="item" aria-label="More information about ${title}" title="More information">i</a>
          </div>
        </div>
      </article>`;
  };

  const bindCardActions = (root) => {
    root.querySelectorAll('.df-card').forEach((article) => {
      const id = article.dataset.itemId;
      const item = [...state.heroItems, ...state.list, ...state.library.movies, ...state.library.shows].find((entry) => entry.Id === id);
      article.querySelector('.df-play-item')?.addEventListener('click', (event) => {
        event.preventDefault(); event.stopPropagation(); playItem(item || { Id: id });
      });
      article.querySelector('.df-list-item')?.addEventListener('click', async (event) => {
        event.preventDefault(); event.stopPropagation();
        await toggleMyList(item || await getItem(id));
        article.querySelector('.df-list-item').textContent = '✓';
      });
    });
  };

  const section = (title, items, options = {}) => {
    if (!items?.length) return '';
    const moreHref = options.moreHref || '';
    const wide = Boolean(options.wide);
    return `
      <section class="df-section">
        <div class="df-section-head">
          <div><h2 class="df-section-title">${esc(title)}</h2>${options.subtitle ? `<p class="df-section-subtitle">${esc(options.subtitle)}</p>` : ''}</div>
          ${moreHref ? `<a class="df-link-button" href="${moreHref}">View all →</a>` : ''}
        </div>
        <div class="df-row ${wide ? 'df-row-wide' : ''}">${items.map((item) => card(item, { wide })).join('')}</div>
      </section>`;
  };

  const loadHomeData = async () => {
    const [recent, resumable, played, movies, shows, favorites] = await Promise.all([
      getItems({ IncludeItemTypes: 'Movie,Series', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 12 }),
      getItems({ IncludeItemTypes: 'Movie,Episode', SortBy: 'DatePlayed', SortOrder: 'Descending', Filters: 'IsResumable', Limit: 12 }),
      getItems({ IncludeItemTypes: 'Movie,Series', SortBy: 'DatePlayed', SortOrder: 'Descending', Limit: 12 }),
      getItems({ IncludeItemTypes: 'Movie', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 18 }),
      getItems({ IncludeItemTypes: 'Series', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 18 }),
      getItems({ IncludeItemTypes: 'Movie,Series', SortBy: 'DateCreated', SortOrder: 'Descending', Filters: 'IsFavorite', Limit: 18 })
    ]);
    state.heroItems = recent;
    state.list = favorites;
    return { recent, resumable, played, movies, shows, favorites };
  };

  const hero = (item) => {
    if (!item) return `<section class="df-hero"><div class="df-hero-inner"><div class="df-hero-copy"><div class="df-hero-kicker">DINKFLIX</div><h1 class="df-hero-title">Your library, beautifully simple.</h1><p class="df-hero-overview">Browse what is new, pick up where you left off, and find something worth watching.</p></div></div></section>`;
    const title = esc(item.Name || 'Recently Added');
    const src = backdropUrl(item, 1600) || imageUrl(item, 'Primary', 1200);
    const genres = Array.isArray(item.Genres) ? item.Genres.slice(0, 2).join(' · ') : '';
    return `
      <section class="df-hero" data-hero-id="${esc(item.Id)}">
        <img class="df-hero-art" src="${esc(src)}" alt="" fetchpriority="high" decoding="async">
        <div class="df-hero-inner">
          <div class="df-hero-copy">
            <div class="df-hero-kicker">Recently Added</div>
            <h1 class="df-hero-title">${title}</h1>
            <div class="df-hero-meta">
              ${ratingBadge(item)}
              ${item.ProductionYear ? `<span>${esc(item.ProductionYear)}</span>` : ''}
              ${item.Type === 'Movie' && item.RunTimeTicks ? `<span class="df-meta-dot">•</span><span>${esc(runtime(item))}</span>` : ''}
              ${genres ? `<span class="df-meta-dot">•</span><span>${esc(genres)}</span>` : ''}
            </div>
            <p class="df-hero-overview">${esc(trunc(item.Overview || 'Recently added to your library.', 310))}</p>
            <div class="df-actions">
              <button class="df-button df-button-primary df-hero-play" type="button">▶ Play</button>
              <a class="df-button df-button-secondary" href="?df=item&id=${encodeURIComponent(item.Id)}" data-df-route="item">More info</a>
              <button class="df-button df-button-secondary df-hero-list" type="button">＋ My List</button>
            </div>
          </div>
        </div>
      </section>`;
  };

  const runtime = (item) => {
    const minutes = Math.round(Number(item.RunTimeTicks || 0) / 600000000);
    if (!minutes) return '';
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
  };

  const startHeroRotation = () => {
    stopHeroRotation();
    if (state.heroItems.length < 2) return;
    const interval = Math.max(8, Number(state.config.heroRotationSeconds) || 15) * 1000;
    state.heroTimer = window.setInterval(() => {
      if (state.heroPause || document.hidden) return;
      state.heroIndex = (state.heroIndex + 1) % state.heroItems.length;
      const current = document.querySelector('.df-hero');
      if (!current) return;
      const replacement = document.createElement('div');
      replacement.innerHTML = hero(state.heroItems[state.heroIndex]);
      const next = replacement.firstElementChild;
      current.replaceWith(next);
      hydrateHero(next);
    }, interval);
  };

  const stopHeroRotation = () => {
    if (state.heroTimer) {
      window.clearInterval(state.heroTimer);
      state.heroTimer = null;
    }
  };

  const hydrateHero = (root = document) => {
    const image = root.querySelector?.('.df-hero-art');
    if (image && !image.dataset.bound) {
      image.dataset.bound = '1';
      image.addEventListener('load', () => image.classList.add('df-ready'), { once: true });
      if (image.complete) image.classList.add('df-ready');
    }
    const itemId = root.querySelector?.('.df-hero')?.dataset.heroId;
    const item = state.heroItems.find((entry) => entry.Id === itemId);
    root.querySelector?.('.df-hero-play')?.addEventListener('click', () => playItem(item), { once: true });
    root.querySelector?.('.df-hero-list')?.addEventListener('click', async (event) => {
      if (!item) return;
      await toggleMyList(item);
      event.currentTarget.textContent = '✓ In My List';
    }, { once: true });
    const heroRoot = root.querySelector?.('.df-hero');
    if (heroRoot && !heroRoot.dataset.pauseBound) {
      heroRoot.dataset.pauseBound = '1';
      heroRoot.addEventListener('mouseenter', () => { state.heroPause = true; });
      heroRoot.addEventListener('mouseleave', () => { state.heroPause = false; });
      heroRoot.addEventListener('focusin', () => { state.heroPause = true; });
      heroRoot.addEventListener('focusout', () => { state.heroPause = false; });
    }
  };

  const renderHome = async () => {
    const shell = ensureShell();
    shell.innerHTML = `<div class="df-page"><div class="df-hero df-skeleton"></div><section class="df-section"><div class="df-row">${Array.from({ length: 7 }, () => '<div class="df-card"><div class="df-card-poster df-skeleton"></div><div class="df-card-body df-skeleton" style="height:58px"></div></div>').join('')}</div></section></div>`;
    const data = await loadHomeData();
    if (!state.heroItems.length && state.lastApiError) {
      shell.innerHTML = `<div class="df-page"><div class="df-empty df-empty-error"><h2>DINKFLIX could not reach your Jellyfin library.</h2><p>Please refresh once Jellyfin has finished loading. If this keeps appearing, open the browser console and look for a <strong>[DINKFLIX]</strong> message.</p></div></div>`;
      return;
    }
    state.heroIndex = 0;
    const heroItem = state.heroItems[0];
    shell.innerHTML = `
      <div class="df-page">
        ${hero(heroItem)}
        ${section('Continue Watching', data.resumable, { wide: true })}
        ${section('Recently Played', data.played, {})}
        ${section('Recently Added', data.recent, {})}
        ${section('Movies', data.movies, { moreHref: '?df=movies' })}
        ${section('TV Shows', data.shows, { moreHref: '?df=shows' })}
        ${state.config.showMyList ? section('My List', data.favorites, { moreHref: '?df=list' }) : ''}
      </div>
      <footer class="df-footer">DINKFLIX Web ${VERSION} · Powered by Jellyfin</footer>`;
    hydrateHero(shell);
    bindCardActions(shell);
    bindImageFallbacks(shell);
    startHeroRotation();
  };

  const filteredItems = (items, query) => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.Name} ${(item.Overview || '')} ${(item.Genres || []).join(' ')} ${(item.Tags || []).join(' ')}`.toLowerCase().includes(q));
  };

  const sortOptions = [
    ['SortName', 'Name'],
    ['DateCreated', 'Recently added'],
    ['ProductionYear', 'Year'],
    ['CommunityRating', 'Rating']
  ];

  const renderLibrary = async (kind) => {
    const shell = ensureShell();
    const isMovies = kind === 'movies';
    const title = isMovies ? 'Movies' : 'TV Shows';
    const sort = isMovies ? state.library.movieSort : state.library.showSort;
    const start = isMovies ? state.library.movieStart : state.library.showStart;
    shell.innerHTML = `
      <div class="df-page">
        <header class="df-page-header">
          <div><p class="df-page-kicker">Library</p><h1 class="df-page-title">${title}</h1><p class="df-page-copy">A clean, focused grid built for browsing without getting lost.</p></div>
          <a class="df-link-button" href="?df=home" data-df-route="home">← Home</a>
        </header>
        <div class="df-toolbar">
          <input class="df-input" id="df-library-search" type="search" placeholder="Search ${title.toLowerCase()}…" autocomplete="off">
          <select class="df-select" id="df-library-sort" aria-label="Sort ${title}">${sortOptions.map(([value, label]) => `<option value="${value}"${sort === value ? ' selected' : ''}>${label}</option>`).join('')}</select>
          <div class="df-chip-row">
            <button class="df-chip" data-filter="all" type="button">All</button>
            <button class="df-chip" data-filter="rated" type="button">★ 8+</button>
            <button class="df-chip" data-filter="4k" type="button">4K</button>
            <button class="df-chip" data-filter="hdr" type="button">HDR</button>
          </div>
        </div>
        <div class="df-results-note" id="df-library-count"></div>
        <div class="df-grid" id="df-library-grid"></div>
        <div class="df-load-more"><button class="df-button df-button-secondary" id="df-load-more" type="button">Load more</button></div>
      </div>`;

    const load = async (append = false) => {
      const target = isMovies ? state.library.movies : state.library.shows;
      const newStart = append ? start + target.length : 0;
      const items = await getItems({
        IncludeItemTypes: isMovies ? 'Movie' : 'Series',
        SortBy: isMovies ? state.library.movieSort : state.library.showSort,
        SortOrder: isMovies ? (state.library.movieSort === 'SortName' ? 'Ascending' : 'Descending') : (state.library.showSort === 'SortName' ? 'Ascending' : 'Descending'),
        StartIndex: newStart,
        Limit: 48
      });
      if (append) {
        target.push(...items);
      } else {
        target.length = 0;
        target.push(...items);
      }
      renderLibraryGrid(shell, kind);
    };

    await load(false);
    shell.querySelector('#df-library-search')?.addEventListener('input', () => renderLibraryGrid(shell, kind));
    shell.querySelector('#df-library-sort')?.addEventListener('change', async (event) => {
      if (isMovies) { state.library.movieSort = event.target.value; state.library.movieStart = 0; }
      else { state.library.showSort = event.target.value; state.library.showStart = 0; }
      await load(false);
    });
    shell.querySelectorAll('.df-chip').forEach((chip) => chip.addEventListener('click', () => {
      shell.querySelectorAll('.df-chip').forEach((entry) => entry.classList.remove('df-selected'));
      chip.classList.add('df-selected');
      shell.dataset.filter = chip.dataset.filter || 'all';
      renderLibraryGrid(shell, kind);
    }));
    shell.querySelector('.df-chip[data-filter="all"]')?.classList.add('df-selected');
    shell.querySelector('#df-load-more')?.addEventListener('click', async () => {
      if (isMovies) state.library.movieStart += 48; else state.library.showStart += 48;
      await load(true);
    });
  };

  const renderLibraryGrid = (shell, kind) => {
    const isMovies = kind === 'movies';
    const all = isMovies ? state.library.movies : state.library.shows;
    const query = shell.querySelector('#df-library-search')?.value || '';
    const filter = shell.dataset.filter || 'all';
    let items = filteredItems(all, query);
    if (filter === 'rated') items = items.filter((item) => Number(item.CommunityRating || 0) >= 8);
    if (filter === '4k') items = items.filter((item) => mediaBadges(item).some(([label]) => label === '4K'));
    if (filter === 'hdr') items = items.filter((item) => mediaBadges(item).some(([label]) => label === 'HDR'));
    const grid = shell.querySelector('#df-library-grid');
    if (grid) grid.innerHTML = items.length ? items.map((item) => card(item)).join('') : `<div class="df-empty" style="grid-column:1/-1">Nothing matched your filters.</div>`;
    const count = shell.querySelector('#df-library-count');
    if (count) count.textContent = `${items.length} title${items.length === 1 ? '' : 's'}`;
    bindCardActions(shell);
    bindImageFallbacks(shell);
  };

  const toggleMyList = async (item) => {
    if (!item || !state.userId) return false;
    const current = Boolean(item.UserData?.IsFavorite) || state.list.some((entry) => entry.Id === item.Id);
    try {
      const path = `/Users/${encodeURIComponent(state.userId)}/FavoriteItems/${encodeURIComponent(item.Id)}`;
      await jellyfinRequest(path, { method: current ? 'DELETE' : 'POST' });
      item.UserData = item.UserData || {};
      item.UserData.IsFavorite = !current;
      if (!current) {
        if (!state.list.some((entry) => entry.Id === item.Id)) state.list.unshift(item);
      } else {
        state.list = state.list.filter((entry) => entry.Id !== item.Id);
      }
      return !current;
    } catch (error) {
      console.warn('[DINKFLIX] Unable to update My List:', error);
      return current;
    }
  };

  const renderList = async () => {
    const shell = ensureShell();
    const items = await getItems({ IncludeItemTypes: 'Movie,Series', Filters: 'IsFavorite', SortBy: 'SortName', SortOrder: 'Ascending', Limit: 100 });
    state.list = items;
    shell.innerHTML = `
      <div class="df-page">
        <header class="df-page-header">
          <div><p class="df-page-kicker">Your library</p><h1 class="df-page-title">My List</h1><p class="df-page-copy">Save films and shows you want close at hand. My List follows your Jellyfin user account.</p></div>
          <a class="df-link-button" href="?df=home" data-df-route="home">← Home</a>
        </header>
        ${items.length ? `<div class="df-grid">${items.map((item) => card(item)).join('')}</div>` : '<div class="df-empty">Your My List is empty. Use the + button on a title to save it here.</div>'}
      </div>`;
    bindCardActions(shell);
    bindImageFallbacks(shell);
  };

  const renderItem = async (id) => {
    const shell = ensureShell();
    shell.innerHTML = `<div class="df-page"><div class="df-empty">Loading title…</div></div>`;
    const item = await getItem(id);
    if (!item) {
      shell.innerHTML = `<div class="df-page"><div class="df-empty">That title could not be loaded.</div></div>`;
      return;
    }
    const backdrop = backdropUrl(item, 1800) || imageUrl(item, 'Primary', 1400);
    const poster = imageUrl(item, 'Primary', 720);
    const people = Array.isArray(item.People) ? item.People.filter((person) => person?.Name).slice(0, 8) : [];
    const genres = Array.isArray(item.Genres) ? item.Genres.filter(Boolean).slice(0, 6) : [];
    const tags = Array.isArray(item.Tags) ? item.Tags.filter(Boolean).slice(0, 8) : [];
    const favorite = Boolean(item.UserData?.IsFavorite) || state.list.some((entry) => entry.Id === item.Id);
    const details = [item.ProductionYear ? String(item.ProductionYear) : '', item.Type === 'Movie' ? runtime(item) : item.Type === 'Series' ? `${item.ChildCount || 0} seasons` : '', item.OfficialRating || ''].filter(Boolean);
    shell.innerHTML = `
      <div class="df-page">
        <article class="df-detail">
          <div class="df-detail-backdrop" style="background-image:url('${esc(backdrop)}')"></div>
          <div class="df-detail-scrim"></div>
          <div class="df-detail-inner">
            <img class="df-detail-poster" src="${esc(poster)}" alt="${esc(item.Name)} poster" loading="eager" decoding="async">
            <div>
              <p class="df-page-kicker">${item.Type === 'Series' ? 'TV Series' : 'Movie'}</p>
              <h1 class="df-detail-title">${esc(item.Name || 'Untitled')}</h1>
              <div class="df-detail-meta">
                ${ratingBadge(item)}
                ${details.map((value) => `<span>${esc(value)}</span>`).join('<span class="df-meta-dot">•</span>')}
              </div>
              <div class="df-card-badges" style="position:static;margin:0;pointer-events:auto">${mediaBadges(item).map(([label, type]) => `<span class="df-badge df-badge-${type}">${esc(label)}</span>`).join('')}</div>
              <p class="df-detail-overview">${esc(item.Overview || 'No overview is available for this title.')}</p>
              ${genres.length ? `<div class="df-detail-genres">${genres.map((genre) => `<span class="df-person-chip">${esc(genre)}</span>`).join('')}</div>` : ''}
              ${tags.length ? `<div class="df-detail-tags">${tags.map((tag) => `<span class="df-person-chip" style="color:var(--df-tag)">${esc(tag)}</span>`).join('')}</div>` : ''}
              <div class="df-actions">
                <button class="df-button df-button-primary" id="df-detail-play" type="button">▶ ${item.UserData?.PlaybackPositionTicks ? 'Resume' : 'Play'}</button>
                ${state.config.showMyList ? `<button class="df-button df-button-secondary" id="df-detail-list" type="button">${favorite ? '✓ In My List' : '＋ My List'}</button>` : ''}
                <button class="df-button df-button-secondary" id="df-detail-native" type="button">Jellyfin details</button>
              </div>
            </div>
          </div>
        </article>
        ${people.length ? `<section class="df-detail-section"><div class="df-section-head"><h2 class="df-section-title">Cast & Crew</h2></div><div class="df-chip-row">${people.map((person) => `<span class="df-person-chip">${esc(person.Name)}${person.Role ? ` · ${esc(person.Role)}` : ''}</span>`).join('')}</div></section>` : ''}
      </div>`;
    shell.querySelector('#df-detail-play')?.addEventListener('click', () => playItem(item));
    shell.querySelector('#df-detail-list')?.addEventListener('click', async (event) => {
      const inList = await toggleMyList(item);
      event.currentTarget.textContent = inList ? '✓ In My List' : '＋ My List';
    });
    shell.querySelector('#df-detail-native')?.addEventListener('click', () => openNativeDetails(item.Id, false));
  };

  const renderSearch = async () => {
    const shell = ensureShell();
    const q = queryParam('query');
    shell.innerHTML = `
      <div class="df-page df-search-layout">
        <header class="df-page-header"><div><p class="df-page-kicker">DINKFLIX search</p><h1 class="df-page-title">Find something</h1><p class="df-page-copy">Search your library without leaving the DINKFLIX experience.</p></div><a class="df-link-button" href="?df=home" data-df-route="home">← Home</a></header>
        <form class="df-search-lead" id="df-search-form">
          <input class="df-input" id="df-search-input" type="search" value="${esc(q)}" placeholder="Movie, series, genre, tag…" autofocus autocomplete="off">
          <button class="df-button df-button-primary" type="submit">Search</button>
        </form>
        <p class="df-results-note" id="df-search-note"></p>
        <div class="df-grid" id="df-search-grid"></div>
      </div>`;
    const form = shell.querySelector('#df-search-form');
    const input = shell.querySelector('#df-search-input');
    const run = async () => {
      const term = input.value.trim();
      if (!term) {
        shell.querySelector('#df-search-grid').innerHTML = '<div class="df-empty" style="grid-column:1/-1">Start typing a title, genre or tag.</div>';
        return;
      }
      const items = await getItems({ SearchTerm: term, IncludeItemTypes: 'Movie,Series', SortBy: 'SortName', SortOrder: 'Ascending', Limit: 60 });
      shell.querySelector('#df-search-note').textContent = `${items.length} result${items.length === 1 ? '' : 's'} for “${term}”`;
      shell.querySelector('#df-search-grid').innerHTML = items.length ? items.map((item) => card(item)).join('') : `<div class="df-empty" style="grid-column:1/-1">No titles matched “${esc(term)}”.</div>`;
      bindCardActions(shell); bindImageFallbacks(shell);
    };
    form?.addEventListener('submit', (event) => { event.preventDefault(); navigate('search', { query: input.value.trim() }); });
    if (q) await run();
  };

  const renderAbout = () => {
    const shell = ensureShell();
    shell.innerHTML = `
      <div class="df-page">
        <header class="df-page-header"><div><p class="df-page-kicker">The project</p><h1 class="df-page-title">About DINKFLIX</h1><p class="df-page-copy">A personal Jellyfin experience designed for the people who actually use the server: friends, family and anyone who just wants to find something good and press play.</p></div><a class="df-link-button" href="?df=home" data-df-route="home">← Home</a></header>
        <div class="df-about-grid">
          <section class="df-panel df-about-mark" aria-label="DINKFLIX identity">
            <div class="df-about-image-slot" aria-label="DINKFLIX image space">
              <div class="df-about-wordmark">DINK<span>FLIX</span></div>
              <div class="df-about-image-caption">Built at home · shared with the people who matter</div>
            </div>
          </section>
          <section class="df-panel df-panel-pad">
            <h2 class="df-about-title">Why it exists</h2>
            <p class="df-about-copy">DINKFLIX started as a simple idea: Jellyfin is powerful, but a streaming library should feel effortless. The interface should explain itself, look considered, and get out of the way when it is time to watch.</p>
            <p class="df-about-copy">This version keeps Jellyfin's playback and library foundation while giving the web client its own visual language, navigation and discovery flow.</p>
            <ul class="df-about-list"><li>Desktop-first Jellyfin Web experience</li><li>Lightweight motion and restrained effects</li><li>Recently added discovery with practical metadata</li><li>My List tied to your Jellyfin account</li><li>Built to be comfortable for guests and family</li></ul>
          </section>
          <section class="df-panel df-panel-pad">
            <h2 class="df-about-title">Design principles</h2>
            <div class="df-stat-grid"><div class="df-stat"><span class="df-stat-label">Feel</span><span class="df-stat-value">Premium, calm, cinematic</span></div><div class="df-stat"><span class="df-stat-label">Priority</span><span class="df-stat-value">Fast over flashy</span></div><div class="df-stat"><span class="df-stat-label">Audience</span><span class="df-stat-value">Friends & family</span></div><div class="df-stat"><span class="df-stat-label">Foundation</span><span class="df-stat-value">Jellyfin Web</span></div></div>
          </section>
          <section class="df-panel df-panel-pad">
            <h2 class="df-about-title">Credits</h2>
            <p class="df-about-copy">DINKFLIX is an independent interface project by Orvlyn. It is inspired by the idea of making a self-hosted media server feel as polished as a commercial streaming product without giving up the control and openness of Jellyfin.</p>
            <div class="df-actions"><a class="df-button df-button-secondary" href="https://github.com/Orvlyn/DinkFlix" target="_blank" rel="noreferrer">GitHub</a><a class="df-button df-button-secondary" href="?df=home" data-df-route="home">Back to DINKFLIX</a></div>
          </section>
        </div>
      </div>
      <footer class="df-footer">DINKFLIX Web ${VERSION} · Powered by Jellyfin</footer>`;
  };

  const autoPlayNativeDetails = () => {
    const id = sessionStorage.getItem('dinkflix-autoplay');
    if (!id) return;
    const tryPlay = () => {
      const buttons = [...document.querySelectorAll('button, a')];
      const play = buttons.find((el) => /resume|play/i.test(el.textContent || '') && !el.closest('#dinkflix-nav'));
      if (play) {
        sessionStorage.removeItem('dinkflix-autoplay');
        play.click();
        return true;
      }
      return false;
    };
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (tryPlay() || attempts > 24) window.clearInterval(timer);
    }, 500);
  };

  const renderRoute = async (route) => {
    const hash = window.location.hash || '#/';
    const key = `${route}|${hash}`;
    if (state.renderedKey === key) return;
    state.routeKey = key;
    setActiveNav(route);
    syncBody(route);
    stopHeroRotation();
    if (route === 'native') {
      ensureShell();
      autoPlayNativeDetails();
      state.renderedKey = key;
      return;
    }

    state.renderedKey = key;
    if (route === 'home') await renderHome();
    if (route === 'movies') await renderLibrary('movies');
    if (route === 'shows') await renderLibrary('shows');
    if (route === 'list') await renderList();
    if (route === 'item') await renderItem(queryParam('id'));
    if (route === 'search') await renderSearch();
    if (route === 'about') renderAbout();
  };

  const discoverRequests = () => {
    const href = findRequestsHref();
    const button = state.nav?.querySelector('#df-requests-link');
    if (!button) return;
    if (href) {
      button.hidden = false;
      button.dataset.href = href;
    }
  };

  const removeCompetingChrome = () => {
    document.documentElement.style.setProperty('--df-user-ui', '1');
  };

  const onRouteChange = () => {
    window.clearTimeout(state.observerTimer);
    state.observerTimer = window.setTimeout(() => renderRoute(routeFromUrl()), 60);
  };

  const startObserver = () => {
    if (state.observer) return;
    state.observer = new MutationObserver((mutations) => {
      const onlyDinkflix = mutations.every((mutation) => mutation.target instanceof Node && state.shell?.contains(mutation.target));
      if (onlyDinkflix) return;
      window.clearTimeout(state.observerTimer);
      state.observerTimer = window.setTimeout(() => {
        makeNav();
        discoverRequests();
        updateAvatar();
        if (routeFromUrl() === 'native') autoPlayNativeDetails();
      }, 120);
    });
    state.observer.observe(document.body, { childList: true, subtree: true });
  };

  const boot = async () => {
    state.userId = getUserId();
    if (!state.userId) {
      state.bootAttempts = (state.bootAttempts || 0) + 1;
      if (state.bootAttempts < 30) window.setTimeout(boot, 500);
      return;
    }
    try { state.user = await jellyfinRequest(`/Users/${encodeURIComponent(state.userId)}`); } catch { state.user = null; }
    await loadConfig();
    makeNav();
    ensureShell();
    updateAvatar();
    state.nav?.querySelector('.df-mylist-nav')?.toggleAttribute('hidden', !state.config.showMyList);
    removeCompetingChrome();
    discoverRequests();
    if (!state.listenersAttached) {
      window.addEventListener('popstate', onRouteChange);
      window.addEventListener('hashchange', onRouteChange);
      document.addEventListener('click', (event) => {
        const link = event.target.closest?.('a[data-df-route]');
        if (!link) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const route = link.dataset.dfRoute;
        if (!route) return;
        event.preventDefault();
        const url = new URL(link.href, window.location.href);
        navigate(route, { id: url.searchParams.get('id') || undefined, query: url.searchParams.get('query') || undefined });
      });
      document.addEventListener('visibilitychange', () => { if (!document.hidden && routeFromUrl() === 'home' && state.heroTimer == null) startHeroRotation(); });
      state.listenersAttached = true;
    }
    startObserver();
    await renderRoute(routeFromUrl());
  };

  const ready = () => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 80), { once: true });
    } else {
      setTimeout(boot, 80);
    }
  };

  ready();
})();
