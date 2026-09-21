/*
 * DINKFLIX Web v2 — Jellyfin 12.x frontend layer
 *
 * Designed for Jellyfin Web on desktop browsers.
 * Uses Jellyfin's existing web API and navigation rather than shipping a
 * frontend framework. The script is intentionally defensive: if an API or
 * selector changes, that feature fails softly instead of breaking Jellyfin.
 */
(() => {
    'use strict';

    if (window.__DINKFLIX_WEB_V2_RUNNING__) return;
    window.__DINKFLIX_WEB_V2_RUNNING__ = true;

    const VERSION = '2.0.0';
    const CONFIG = {
        // Replace with a local path later if you want to self-host the logo.
        logoUrl: 'https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/dnk.png',
        heroCount: 5,
        heroRotateMs: 14000,
        rowLimit: 18,
        cacheMs: 120000,
    };

    const state = {
        started: false,
        userId: '',
        serverId: '',
        heroItems: [],
        heroIndex: 0,
        heroTimer: 0,
        heroPaused: false,
        homeRoot: null,
        homeOriginalChildren: [],
        routeView: null,
        cache: new Map(),
        itemCache: new Map(),
        observer: null,
        reconcileTimer: 0,
    };

    const SELECTORS = {
        home: '#indexPage',
        detail: '#itemDetailPage',
        nativeSearch: '.headerSearchButton, .btnHeaderSearch, button[aria-label*="Search"], button[title*="Search"]',
        nativeUser: '.headerUserButton, .btnUserMenu, button[aria-label*="User"], button[title*="User"]',
    };

    function api() {
        return window.ApiClient || null;
    }

    function hasApi() {
        const client = api();
        return !!client && typeof client.getCurrentUserId === 'function' && typeof client.getItems === 'function';
    }

    function visible(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    }

    function userId() {
        try {
            return api()?.getCurrentUserId?.() || '';
        } catch {
            return '';
        }
    }

    function serverId() {
        try {
            return api()?.serverId?.() || api()?.serverInfo?.()?.Id || '';
        } catch {
            return '';
        }
    }

    function scopeChanged() {
        const nextUser = userId();
        const nextServer = serverId();
        if (state.userId !== nextUser || state.serverId !== nextServer) {
            state.userId = nextUser;
            state.serverId = nextServer;
            state.cache.clear();
            state.itemCache.clear();
        }
    }

    function cacheGet(key) {
        const entry = state.cache.get(key);
        if (!entry || entry.expires < Date.now()) return null;
        return entry.value;
    }

    function cacheSet(key, value, ms = CONFIG.cacheMs) {
        state.cache.set(key, { value, expires: Date.now() + ms });
        return value;
    }

    function getItems(options) {
        if (!hasApi()) return Promise.resolve([]);
        scopeChanged();
        return api().getItems(state.userId, {
            EnableTotalRecordCount: false,
            Recursive: true,
            Limit: CONFIG.rowLimit,
            Fields: 'Overview,Genres,OfficialRating,ProviderIds,ImageTags,UserData,RunTimeTicks,ProductionYear,Width,Height,VideoRange,VideoRangeType',
            ...options,
        }).then(result => Array.isArray(result?.Items) ? result.Items : []).catch(() => []);
    }

    function getItem(id) {
        if (!id || !hasApi()) return Promise.resolve(null);
        if (state.itemCache.has(id)) return Promise.resolve(state.itemCache.get(id));
        return api().getItem(state.userId, id, {
            Fields: 'Overview,Genres,OfficialRating,ProviderIds,ImageTags,UserData,RunTimeTicks,ProductionYear,Width,Height,VideoRange,VideoRangeType',
        }).then(item => {
            state.itemCache.set(id, item);
            return item;
        }).catch(() => null);
    }

    function img(item, type, quality = 86, width = 900) {
        if (!item?.Id || !api()?.getUrl) return '';
        let tag = '';
        try {
            tag = item.ImageTags?.[type] || '';
        } catch {
            tag = '';
        }
        const params = new URLSearchParams({ quality: String(quality), maxWidth: String(width) });
        if (tag) params.set('tag', tag);
        return api().getUrl(`Items/${encodeURIComponent(item.Id)}/Images/${type}?${params.toString()}`);
    }

    function detailHref(item) {
        if (!item?.Id) return '#';
        const sid = serverId();
        return `#/details?id=${encodeURIComponent(item.Id)}${sid ? `&serverId=${encodeURIComponent(sid)}` : ''}`;
    }

    function route() {
        const hash = window.location.hash || '';
        if (/^#\/dinkflix-list(?:$|[?&])/.test(hash)) return 'list';
        if (/^#\/dinkflix-about(?:$|[?&])/.test(hash)) return 'about';
        if (/^#\/details\?/.test(hash)) return 'details';
        const movies = document.querySelector('#moviesPage');
        const shows = document.querySelector('#tvshowsPage');
        const home = document.querySelector('#indexPage');
        if (movies && visible(movies)) return 'movies';
        if (shows && visible(shows)) return 'shows';
        if (home && visible(home)) return 'home';
        if (/movies/i.test(hash)) return 'movies';
        if (/tvshows|tv-shows|shows/i.test(hash)) return 'shows';
        return 'jellyfin';
    }

    function activeNav(routeName) {
        document.querySelectorAll('#dinkflix-nav .df-link').forEach(link => {
            link.classList.toggle('is-active', link.dataset.route === routeName);
        });
    }

    function nativeLink(matchers) {
        const roots = [document.querySelector('.skinHeader'), document.querySelector('.mainDrawer'), document.body];
        const anchors = [];
        roots.filter(Boolean).forEach(root => {
            root.querySelectorAll('a[href]').forEach(a => anchors.push(a));
        });
        const normalized = anchors.filter(a => visible(a));
        return normalized.find(a => {
            const text = (a.textContent || '').trim().toLowerCase();
            const href = (a.getAttribute('href') || '').toLowerCase();
            return matchers.some(m => m.test(text) || m.test(href));
        }) || null;
    }

    function clickNative(selector) {
        const el = document.querySelector(selector);
        if (el) {
            try { el.click(); return true; } catch { return false; }
        }
        return false;
    }

    function buildNav() {
        if (document.getElementById('dinkflix-nav')) return;

        const home = nativeLink([/\bhome\b/, /home/]);
        const movies = nativeLink([/^movies?$/, /movies/]);
        const shows = nativeLink([/^tv shows?$/, /^shows?$/, /tvshows/, /tv-shows/]);

        const nav = document.createElement('nav');
        nav.id = 'dinkflix-nav';
        nav.setAttribute('aria-label', 'DINKFLIX navigation');
        nav.innerHTML = `
            <a class="df-brand" href="${home?.getAttribute('href') || '#'}" data-route="home" aria-label="DINKFLIX Home">
                ${CONFIG.logoUrl ? `<img src="${escapeHtml(CONFIG.logoUrl)}" alt="DINKFLIX" onerror="this.remove();this.parentElement.insertAdjacentHTML('beforeend','<span class=&quot;df-brand-wordmark&quot;>DINK<span>FLIX</span></span>')">` : ''}
                <span class="df-brand-wordmark"${CONFIG.logoUrl ? ' style="display:none"' : ''}>DINK<span>FLIX</span></span>
            </a>
            <div class="df-links"></div>
            <span class="df-spacer"></span>
            <div class="df-actions">
                <button class="df-icon-button df-search" type="button" aria-label="Search" title="Search"></button>
                <button class="df-icon-button df-user" type="button" aria-label="User menu" title="User menu"></button>
            </div>
        `;

        const links = nav.querySelector('.df-links');
        addNavLink(links, 'Home', home?.getAttribute('href') || '#', 'home');
        addNavLink(links, 'Movies', movies?.getAttribute('href') || '#', 'movies');
        addNavLink(links, 'TV Shows', shows?.getAttribute('href') || '#', 'shows');
        addNavLink(links, 'My List', '#/dinkflix-list', 'list');

        const requests = nativeLink([/^requests?$/, /seerr/, /jellyseerr/]);
        if (requests?.getAttribute('href')) addNavLink(links, 'Requests', requests.getAttribute('href'), 'requests');

        nav.querySelector('.df-search').addEventListener('click', () => {
            if (!clickNative(SELECTORS.nativeSearch)) {
                const search = nativeLink([/search/]);
                if (search) search.click();
            }
        });

        nav.querySelector('.df-user').addEventListener('click', () => {
            if (!clickNative(SELECTORS.nativeUser)) {
                const user = nativeLink([/user menu/, /profile/, /logout/]);
                if (user) user.click();
            }
        });

        document.body.appendChild(nav);
        document.documentElement.classList.add('dinkflix-active');
        document.body.classList.add('dinkflix-active');
    }

    function addNavLink(parent, label, href, routeName) {
        const a = document.createElement('a');
        a.className = 'df-link';
        a.textContent = label;
        a.href = href || '#';
        a.dataset.route = routeName;
        a.dataset.externalNative = routeName !== 'list' && routeName !== 'home' ? '1' : '0';
        if (routeName === 'list') {
            a.addEventListener('click', e => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                window.location.hash = '#/dinkflix-list';
            });
        } else if (routeName === 'home' && href === '#') {
            a.addEventListener('click', e => {
                e.preventDefault();
                const nativeHome = nativeLink([/\bhome\b/, /home/]);
                nativeHome?.click();
            });
        }
        parent.appendChild(a);
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[char]));
    }

    function escapeAttr(value) {
        return escapeHtml(value).replace(/`/g, '&#96;');
    }

    function typeLabel(type) {
        return type === 'Series' ? 'TV Series' : type === 'Episode' ? 'Episode' : type || 'Title';
    }

    function duration(ticks) {
        if (!ticks) return '';
        const totalMinutes = Math.round(Number(ticks) / 600000000);
        if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '';
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return h ? `${h}h ${m}m` : `${m}m`;
    }

    function year(item) {
        return item?.ProductionYear || (item?.PremiereDate ? new Date(item.PremiereDate).getFullYear() : '');
    }

    function rating(item) {
        const value = Number(item?.CommunityRating || 0);
        return value > 0 ? value.toFixed(1) : '';
    }

    function quality(item) {
        const width = Number(item?.Width || 0);
        const height = Number(item?.Height || 0);
        if (width >= 3800 || height >= 2100) return '4K';
        if (width >= 1900 || height >= 1050) return '1080p';
        if (width >= 1200 || height >= 700) return '720p';
        return '';
    }

    function progress(item) {
        return Math.max(0, Math.min(100, Number(item?.UserData?.PlayedPercentage || 0)));
    }

    function favorite(item) {
        return !!item?.UserData?.IsFavorite;
    }

    function badges(item) {
        const bits = [];
        const r = rating(item);
        const q = quality(item);
        const yr = year(item);
        if (r) bits.push(`<span class="dinkflix-badge is-rating">★ ${escapeHtml(r)}</span>`);
        if (q) bits.push(`<span class="dinkflix-badge is-quality">${escapeHtml(q)}</span>`);
        if (item?.VideoRange || item?.VideoRangeType) bits.push(`<span class="dinkflix-badge is-hdr">HDR</span>`);
        if (item?.OfficialRating) bits.push(`<span class="dinkflix-badge is-age">${escapeHtml(item.OfficialRating)}</span>`);
        if (yr) bits.push(`<span class="dinkflix-badge">${escapeHtml(yr)}</span>`);
        return bits.join('');
    }

    function displayTitle(item) {
        if (item?.Type === 'Episode' && item.SeriesName) return item.SeriesName;
        return item?.Name || 'Untitled';
    }

    function displaySub(item) {
        if (item?.Type === 'Episode') {
            const parts = [];
            if (Number.isFinite(item.ParentIndexNumber)) parts.push(`S${String(item.ParentIndexNumber).padStart(2, '0')}`);
            if (Number.isFinite(item.IndexNumber)) parts.push(`E${String(item.IndexNumber).padStart(2, '0')}`);
            if (item.Name && item.SeriesName) parts.push(item.Name);
            return parts.join(' · ') || 'Episode';
        }
        const parts = [year(item), typeLabel(item?.Type), duration(item?.RunTimeTicks)].filter(Boolean);
        return parts.join(' · ');
    }

    function createCard(item, options = {}) {
        const wide = !!options.wide;
        const cls = `dinkflix-card${wide ? ' is-wide' : ''}`;
        const poster = wide ? (img(item, 'Backdrop', 83, 1100) || img(item, 'Primary', 84, 900)) : (img(item, 'Primary', 87, 720) || img(item, 'Thumb', 85, 820));
        const title = displayTitle(item);
        const sub = displaySub(item);
        const fav = favorite(item);
        const pct = progress(item);
        const overview = item?.Overview || '';

        const a = document.createElement('a');
        a.className = cls;
        a.href = detailHref(item);
        a.dataset.id = item.Id;
        a.setAttribute('aria-label', title);
        a.innerHTML = `
            <div class="df-card-art">
                ${poster ? `<img src="${escapeAttr(poster)}" alt="" loading="lazy" decoding="async">` : '<div class="dinkflix-skeleton" style="position:absolute;inset:0"></div>'}
                <div class="df-card-shade"></div>
                <div class="df-card-badges">${badges(item)}</div>
                <button class="df-card-mylist${fav ? ' is-favorite' : ''}" type="button" aria-label="${fav ? 'Remove from My List' : 'Add to My List'}" title="${fav ? 'Remove from My List' : 'Add to My List'}">${fav ? '✓' : '+'}</button>
                ${pct > 0 ? `<div class="dinkflix-progress"><span style="width:${pct}%"></span></div>` : ''}
                <div class="df-card-info">
                    <div class="df-card-title">${escapeHtml(title)}</div>
                    <div class="df-card-sub">${escapeHtml(sub)}</div>
                </div>
                <div class="df-card-hover">
                    ${overview ? `<p class="df-card-overview">${escapeHtml(stripHtml(overview))}</p>` : ''}
                </div>
            </div>
        `;

        const listButton = a.querySelector('.df-card-mylist');
        listButton?.addEventListener('click', async e => {
            e.preventDefault();
            e.stopPropagation();
            const next = !listButton.classList.contains('is-favorite');
            const ok = await setFavorite(item.Id, next);
            if (!ok) return;
            item.UserData = { ...(item.UserData || {}), IsFavorite: next };
            listButton.classList.toggle('is-favorite', next);
            listButton.textContent = next ? '✓' : '+';
            listButton.title = next ? 'Remove from My List' : 'Add to My List';
            listButton.setAttribute('aria-label', next ? 'Remove from My List' : 'Add to My List');
            showToast(next ? 'Added to My List' : 'Removed from My List');
            document.dispatchEvent(new CustomEvent('dinkflix:favorite-changed', { detail: { id: item.Id, isFavorite: next } }));
        });

        return a;
    }

    function stripHtml(value) {
        const div = document.createElement('div');
        div.innerHTML = String(value || '');
        return (div.textContent || div.innerText || '').trim();
    }

    function createRow(title, subtitle, items, options = {}) {
        const row = document.createElement('section');
        row.className = 'dinkflix-row';
        row.dataset.kind = options.kind || '';

        const head = document.createElement('div');
        head.className = 'dinkflix-row-head';
        head.innerHTML = `
            <div>
                <h2 class="dinkflix-row-title">${escapeHtml(title)}</h2>
                ${subtitle ? `<p class="dinkflix-row-subtitle">${escapeHtml(subtitle)}</p>` : ''}
            </div>
            ${options.viewAllHref ? `<a class="dinkflix-view-all" href="${escapeAttr(options.viewAllHref)}">View all →</a>` : ''}
        `;
        row.appendChild(head);

        if (!items.length) {
            row.insertAdjacentHTML('beforeend', '<div class="dinkflix-empty">Nothing here yet.</div>');
            return row;
        }

        const scroller = document.createElement('div');
        scroller.className = 'dinkflix-row-scroller';
        items.forEach(item => scroller.appendChild(createCard(item, { wide: !!options.wide })));
        row.appendChild(scroller);
        return row;
    }

    function homeContainer(page) {
        return page;
    }

    function prepareHome(page) {
        if (state.homeRoot && state.homeRoot.isConnected) return;
        state.homeRoot = homeContainer(page);
        state.homeOriginalChildren = Array.from(page.children).map(child => ({ child, display: child.style.display }));
    }

    function clearHome() {
        if (!state.homeRoot) return;
        const page = state.homeRoot;
        page.querySelectorAll(':scope > #dinkflix-home').forEach(el => el.remove());
        state.homeOriginalChildren.forEach(({ child, display }) => {
            if (child?.isConnected) child.style.display = display;
        });
        state.homeOriginalChildren = [];
        state.homeRoot = null;
    }

    async function mountHome() {
        const page = document.querySelector(SELECTORS.home);
        if (!page || !visible(page) || !hasApi()) return;
        prepareHome(page);
        if (document.getElementById('dinkflix-home')) return;

        const root = document.createElement('main');
        root.id = 'dinkflix-home';
        root.innerHTML = `
            <section id="dinkflix-hero" aria-label="Recently added">
                <div class="dinkflix-skeleton" style="position:absolute;inset:0"></div>
            </section>
        `;

        // DINKFLIX owns the desktop home layout after it has successfully mounted.
        state.homeOriginalChildren.forEach(({ child }) => {
            if (child !== root) child.style.display = 'none';
        });
        page.appendChild(root);

        const homeIntro = document.createElement('div');
        homeIntro.className = 'df-home-intro';
        homeIntro.innerHTML = '<div class="df-home-kicker">DINKFLIX</div><div class="df-home-title">Your library, made effortless.</div>';
        root.appendChild(homeIntro);

        const [heroItems, continueItems, recentlyPlayed, latest, latestMovies, latestShows, favorites] = await Promise.all([
            getRecentlyAdded(),
            getItems({ Filters: 'IsResumable', IncludeItemTypes: 'Movie,Episode', SortBy: 'DatePlayed', SortOrder: 'Descending', Limit: 12 }),
            getItems({ IncludeItemTypes: 'Movie,Series,Episode', SortBy: 'DatePlayed', SortOrder: 'Descending', Limit: 12 }).then(items => items.filter(i => i?.UserData?.LastPlayedDate)),
            getItems({ IncludeItemTypes: 'Movie,Series', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: CONFIG.rowLimit }),
            getItems({ IncludeItemTypes: 'Movie', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: CONFIG.rowLimit }),
            getItems({ IncludeItemTypes: 'Series', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: CONFIG.rowLimit }),
            getItems({ Filters: 'IsFavorite', IncludeItemTypes: 'Movie,Series', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: CONFIG.rowLimit }),
        ]);

        state.heroItems = heroItems;
        const hero = document.getElementById('dinkflix-hero');
        hero.replaceChildren(buildHero(heroItems));

        if (continueItems.length) root.appendChild(createRow('Continue Watching', 'Pick up exactly where you left off.', continueItems, { kind: 'continue', wide: true }));
        if (recentlyPlayed.length) root.appendChild(createRow('Recently Played', 'Keep exploring what you have been watching.', recentlyPlayed, { kind: 'recent' }));
        root.appendChild(createRow('Recently Added', 'Fresh from the library.', latest, { kind: 'recently-added' }));
        root.appendChild(createRow('Movies', 'Latest additions to your movie library.', latestMovies, { kind: 'movies' }));
        root.appendChild(createRow('TV Shows', 'Latest additions to your series library.', latestShows, { kind: 'shows' }));
        root.appendChild(createRow('My List', 'Titles you saved for later.', favorites, { kind: 'list', viewAllHref: '#/dinkflix-list' }));

        const footer = document.createElement('footer');
        footer.style.cssText = 'margin-top:56px;padding-top:18px;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;gap:16px;color:rgba(255,255,255,.38);font-size:11px;';
        footer.innerHTML = `<span>DINKFLIX Web v${VERSION}</span><a href="#/dinkflix-about" style="color:inherit;text-decoration:none">About DINKFLIX</a>`;
        footer.querySelector('a').addEventListener('click', e => { e.preventDefault(); window.location.hash = '#/dinkflix-about'; });
        root.appendChild(footer);

        startHeroRotation();
    }

    async function getRecentlyAdded() {
        const cached = cacheGet('recently-added');
        if (cached) return cached;
        const items = await getItems({ IncludeItemTypes: 'Movie,Series', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 12 });
        return cacheSet('recently-added', items.filter(i => i?.Id && (i?.ImageTags?.Backdrop || i?.ImageTags?.Thumb)), CONFIG.cacheMs);
    }

    function buildHero(items) {
        const wrap = document.createElement('div');
        if (!items.length) {
            wrap.innerHTML = '<div style="position:absolute;inset:0;display:grid;place-items:center;color:rgba(255,255,255,.45)">Add some media to your library to see the DINKFLIX hero.</div>';
            return wrap;
        }
        const slides = document.createElement('div');
        slides.style.cssText = 'position:absolute;inset:0;';
        items.slice(0, CONFIG.heroCount).forEach((item, index) => {
            const slide = document.createElement('article');
            slide.className = `df-hero-slide${index === 0 ? ' is-active' : ''}`;
            slide.dataset.index = String(index);
            slide.dataset.id = item.Id;
            const bg = img(item, 'Backdrop', 84, 1900);
            const logo = img(item, 'Logo', 88, 1100);
            const r = rating(item);
            const facts = [];
            if (r) facts.push(`<span class="df-fact is-rating">★ ${escapeHtml(r)}</span>`);
            if (year(item)) facts.push(`<span class="df-fact">${escapeHtml(year(item))}</span>`);
            facts.push(`<span class="df-fact">${escapeHtml(typeLabel(item.Type))}</span>`);
            const genre = (item.Genres || []).slice(0, 2);
            genre.forEach(g => facts.push(`<span class="df-fact">${escapeHtml(g)}</span>`));
            if (item.OfficialRating) facts.push(`<span class="df-fact">${escapeHtml(item.OfficialRating)}</span>`);

            slide.innerHTML = `
                <img class="df-hero-backdrop" data-src="${escapeAttr(bg)}" alt="" ${index === 0 ? '' : 'loading="lazy"'}>
                <div class="df-hero-overlay"></div>
                <div class="df-hero-seam"></div>
                <div class="df-hero-content">
                    <div class="df-hero-label">Recently Added</div>
                    <div class="df-hero-title-wrap">
                        ${logo ? `<img class="df-hero-title-logo" src="${escapeAttr(logo)}" alt="${escapeAttr(item.Name || '')}">` : `<div class="df-hero-title">${escapeHtml(item.Name || '')}</div>`}
                    </div>
                    <div class="df-hero-facts">${facts.join('')}</div>
                    ${item.Overview ? `<p class="df-hero-overview">${escapeHtml(stripHtml(item.Overview))}</p>` : ''}
                    <div class="df-hero-actions">
                        <button class="df-hero-button df-play" type="button" data-action="play" data-id="${escapeAttr(item.Id)}">▶&nbsp; Play</button>
                        <a class="df-hero-button df-more" href="${escapeAttr(detailHref(item))}">More info</a>
                    </div>
                </div>
            `;
            slides.appendChild(slide);
        });
        wrap.appendChild(slides);

        const nav = document.createElement('div');
        nav.className = 'df-hero-nav';
        items.slice(0, CONFIG.heroCount).forEach((item, index) => {
            const dot = document.createElement('button');
            dot.className = `df-hero-dot${index === 0 ? ' is-active' : ''}`;
            dot.type = 'button';
            dot.dataset.index = String(index);
            dot.setAttribute('aria-label', `Show ${item.Name || 'slide'}`);
            nav.appendChild(dot);
        });
        if (items.length > 1) {
            const next = document.createElement('button');
            next.className = 'df-hero-arrow';
            next.type = 'button';
            next.textContent = '→';
            next.title = 'Next featured title';
            nav.appendChild(next);
            next.addEventListener('click', () => showHeroIndex((state.heroIndex + 1) % state.heroItems.slice(0, CONFIG.heroCount).length, true));
        }
        wrap.appendChild(nav);

        wrap.querySelectorAll('.df-hero-dot').forEach(dot => dot.addEventListener('click', () => {
            showHeroIndex(Number(dot.dataset.index || 0), true);
        }));

        wrap.querySelectorAll('.df-play').forEach(button => button.addEventListener('click', e => {
            e.preventDefault();
            autoPlayDetails(button.dataset.id);
        }));

        wrap.addEventListener('mouseenter', () => { state.heroPaused = true; });
        wrap.addEventListener('mouseleave', () => { state.heroPaused = false; });
        wrap.addEventListener('focusin', () => { state.heroPaused = true; });
        wrap.addEventListener('focusout', () => { state.heroPaused = false; });

        requestAnimationFrame(() => loadHeroAsset(0));
        return wrap;
    }

    function loadHeroAsset(index) {
        const hero = document.getElementById('dinkflix-hero');
        const slide = hero?.querySelector(`.df-hero-slide[data-index="${index}"]`);
        const image = slide?.querySelector('.df-hero-backdrop');
        if (!image || !image.dataset.src || image.src) return;
        image.addEventListener('load', () => image.classList.add('is-loaded'), { once: true });
        image.src = image.dataset.src;
    }

    function showHeroIndex(index, restartTimer = false) {
        const hero = document.getElementById('dinkflix-hero');
        if (!hero) return;
        const slides = [...hero.querySelectorAll('.df-hero-slide')];
        if (!slides.length) return;
        state.heroIndex = ((index % slides.length) + slides.length) % slides.length;
        slides.forEach((slide, i) => slide.classList.toggle('is-active', i === state.heroIndex));
        hero.querySelectorAll('.df-hero-dot').forEach((dot, i) => dot.classList.toggle('is-active', i === state.heroIndex));
        loadHeroAsset(state.heroIndex);
        loadHeroAsset((state.heroIndex + 1) % slides.length);
        if (restartTimer) startHeroRotation();
    }

    function startHeroRotation() {
        window.clearInterval(state.heroTimer);
        state.heroTimer = window.setInterval(() => {
            if (document.hidden || state.heroPaused) return;
            const hero = document.getElementById('dinkflix-hero');
            if (!hero || !hero.isConnected) return;
            const slides = hero.querySelectorAll('.df-hero-slide');
            if (slides.length > 1) showHeroIndex((state.heroIndex + 1) % slides.length, false);
        }, CONFIG.heroRotateMs);
    }

    async function setFavorite(id, value) {
        if (!id || !hasApi() || !state.userId) return false;
        try {
            const method = value ? 'POST' : 'DELETE';
            await api().ajax({
                type: method,
                url: api().getUrl(`Users/${encodeURIComponent(state.userId)}/FavoriteItems/${encodeURIComponent(id)}`),
            });
            return true;
        } catch (error) {
            console.warn('[DINKFLIX] favorite change failed', error);
            showToast('Could not update My List.');
            return false;
        }
    }

    function autoPlayDetails(id) {
        if (!id) return;
        try {
            sessionStorage.setItem('dinkflix:auto-play', id);
        } catch {}
        window.location.hash = `#/details?id=${encodeURIComponent(id)}${state.serverId ? `&serverId=${encodeURIComponent(state.serverId)}` : ''}`;
    }

    function tryAutoPlayDetail() {
        let id = '';
        try { id = sessionStorage.getItem('dinkflix:auto-play') || ''; } catch {}
        if (!id) return;
        const routeMatch = window.location.hash.match(/^#\/details\?([^#]*)/);
        const params = new URLSearchParams(routeMatch ? routeMatch[1] : '');
        if (params.get('id') !== id) return;

        let attempts = 0;
        const timer = window.setInterval(() => {
            attempts++;
            const page = document.querySelector(SELECTORS.detail);
            if (!page || !visible(page)) {
                if (attempts > 40) window.clearInterval(timer);
                return;
            }
            const candidates = page.querySelectorAll('.mainDetailButtons button, .itemDetailButtons button, [data-action="play"], [aria-label*="Play"], [aria-label*="Resume"]');
            const button = [...candidates].find(el => visible(el) && !el.disabled);
            if (button) {
                window.clearInterval(timer);
                try { sessionStorage.removeItem('dinkflix:auto-play'); } catch {}
                window.setTimeout(() => button.click(), 120);
            } else if (attempts > 40) {
                window.clearInterval(timer);
            }
        }, 250);
    }

    async function mountDetailActions() {
        const page = document.querySelector(SELECTORS.detail);
        if (!page || !visible(page) || !hasApi()) return;
        const id = new URLSearchParams((window.location.hash.split('?')[1] || '').split('#')[0]).get('id');
        if (!id || page.querySelector('#dinkflix-detail-actions')) return;
        const item = await getItem(id);
        if (!item) return;

        const actionHost = page.querySelector('.mainDetailButtons, .itemDetailButtons, .itemDetailButtons-container, .detailPagePrimaryContainer') || page.querySelector('.itemName')?.parentElement;
        if (!actionHost) return;

        const wrap = document.createElement('div');
        wrap.id = 'dinkflix-detail-actions';
        const button = document.createElement('button');
        const fav = favorite(item);
        button.className = fav ? 'is-favorite' : '';
        button.type = 'button';
        button.textContent = fav ? '✓ My List' : '+ My List';
        button.addEventListener('click', async () => {
            const next = !button.classList.contains('is-favorite');
            const ok = await setFavorite(item.Id, next);
            if (!ok) return;
            button.classList.toggle('is-favorite', next);
            button.textContent = next ? '✓ My List' : '+ My List';
        });
        wrap.appendChild(button);
        actionHost.parentElement?.insertBefore(wrap, actionHost.nextSibling);
    }

    async function mountStandaloneRoute() {
        const currentRoute = route();
        activeNav(currentRoute);
        if (currentRoute === 'jellyfin' || currentRoute === 'details') {
            hideRouteView();
            return;
        }
        if (!state.routeView) {
            state.routeView = document.createElement('div');
            state.routeView.id = 'dinkflix-route-view';
            document.body.appendChild(state.routeView);
        }
        state.routeView.style.display = 'block';
        if (currentRoute === 'list') {
            await renderMyList();
        } else if (currentRoute === 'about') {
            renderAbout();
        }
    }

    function hideRouteView() {
        if (state.routeView) state.routeView.style.display = 'none';
    }

    async function renderMyList() {
        const root = state.routeView;
        root.innerHTML = `
            <div class="df-route-inner">
                <div class="df-route-kicker">DINKFLIX</div>
                <h1 class="df-route-title">My List</h1>
                <p class="df-route-copy">Titles you saved to watch later. Your list uses Jellyfin favourites, so it remains tied to your Jellyfin user instead of living only in one browser.</p>
                <div class="df-route-grid"><div class="dinkflix-skeleton" style="height:285px"></div><div class="dinkflix-skeleton" style="height:285px"></div><div class="dinkflix-skeleton" style="height:285px"></div></div>
            </div>
        `;
        const items = await getItems({ Filters: 'IsFavorite', IncludeItemTypes: 'Movie,Series', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 100 });
        const grid = root.querySelector('.df-route-grid');
        grid.replaceChildren();
        if (!items.length) {
            grid.innerHTML = '<div class="dinkflix-empty" style="grid-column:1/-1">Your My List is empty. Use + on any title to save it here.</div>';
            return;
        }
        items.forEach(item => grid.appendChild(createCard(item)));
    }

    function renderAbout() {
        const root = state.routeView;
        root.innerHTML = `
            <div class="df-route-inner">
                <div class="df-route-kicker">DINKFLIX</div>
                <h1 class="df-route-title">Made for the people who actually use the server.</h1>
                <p class="df-route-copy">DINKFLIX started as a way to make a personal Jellyfin server feel less like server software and more like a streaming service. The goal is simple: friends and family should be able to sit down, find something good, and press play without having to understand the machinery underneath it.</p>
                <div class="df-about-card"><h2>Designed, not just themed.</h2><p>DINKFLIX Web is built as a lightweight frontend layer for Jellyfin Web. It focuses on clear navigation, cinematic artwork, useful metadata, restrained motion, and a library that stays easy to browse.</p></div>
                <div class="df-about-card"><h2>The DINKFLIX approach</h2><p>Cyan is the signature accent, not the entire colour palette. Ratings, quality and status information get their own restrained accents. Motion is kept purposeful, and the interface falls back gracefully when a Jellyfin feature or plugin is unavailable.</p></div>
                <div class="df-about-card"><h2>Built on Jellyfin</h2><p>Jellyfin remains the server and media platform underneath. DINKFLIX does not replace playback, authentication or your library — it changes the web experience around them.</p></div>
                <div class="df-about-card"><h2>Project</h2><p>Version ${escapeHtml(VERSION)} · Jellyfin Web 12.x desktop baseline · DINKFLIX by Orvlyn.</p></div>
            </div>
        `;
    }

    function showToast(message) {
        let toast = document.querySelector('.dinkflix-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'dinkflix-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('is-visible');
        window.clearTimeout(toast.__dfTimer);
        toast.__dfTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
    }

    function scheduleReconcile(delay = 100) {
        window.clearTimeout(state.reconcileTimer);
        state.reconcileTimer = window.setTimeout(reconcile, delay);
    }

    async function reconcile() {
        scopeChanged();
        if (!document.body) return;
        buildNav();
        const current = route();
        activeNav(current);

        if (current === 'home' || (current === 'jellyfin' && document.querySelector(SELECTORS.home))) {
            const page = document.querySelector(SELECTORS.home);
            if (page && visible(page)) {
                await mountHome();
            } else if (state.homeRoot) {
                clearHome();
                window.clearInterval(state.heroTimer);
            }
        } else if (current === 'details') {
            hideRouteView();
            await mountDetailActions();
            tryAutoPlayDetail();
        } else {
            if (state.homeRoot) clearHome();
            window.clearInterval(state.heroTimer);
            await mountStandaloneRoute();
        }
    }

    function observe() {
        if (state.observer) return;
        state.observer = new MutationObserver(() => {
            // The page is a SPA. Reconcile only after a short quiet period.
            scheduleReconcile(140);
        });
        state.observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener('hashchange', () => scheduleReconcile(60));
        window.addEventListener('popstate', () => scheduleReconcile(60));
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) scheduleReconcile(80);
        });
        document.addEventListener('dinkflix:favorite-changed', () => {
            if (route() === 'list') scheduleReconcile(60);
        });
    }

    async function start() {
        if (state.started) return;
        state.started = true;
        let attempts = 0;
        const boot = window.setInterval(async () => {
            attempts++;
            if (hasApi()) {
                window.clearInterval(boot);
                scopeChanged();
                observe();
                await reconcile();
            } else if (attempts > 80) {
                window.clearInterval(boot);
                console.warn('[DINKFLIX] Jellyfin ApiClient was not available. DINKFLIX stopped safely.');
            }
        }, 250);
    }

    window.DinkFlix = {
        version: VERSION,
        start,
        reconcile: () => scheduleReconcile(0),
        showMyList: () => { window.location.hash = '#/dinkflix-list'; },
    };

    start();
})();
