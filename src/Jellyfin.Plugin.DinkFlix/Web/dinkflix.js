/* DINKFLIX native Jellyfin enhancement layer.
 * Does not create an application shell, router, player or replacement pages.
 */
(function () {
    "use strict";

    const config = Object.assign({
        EnableEnhancements: true,
        GroupContinueWatching: true,
        ShowLocalEndTime: true,
        ShowMediaTechnicalDetails: true
    }, window.__DINKFLIX_CONFIG__ || {});

    const state = {
        detailId: null,
        timer: 0,
        observer: null,
        running: false,
        lastHomeSignature: ""
    };

    function ready() {
        document.documentElement.classList.remove("df-booting");
        document.documentElement.classList.add("df-ready");
    }

    window.addEventListener("load", () => requestAnimationFrame(ready), { once: true });
    document.addEventListener("DOMContentLoaded", ready, { once: true });
    window.setTimeout(ready, 3000);

    if (!config.EnableEnhancements) {
        ready();
        return;
    }

    const api = () => window.ApiClient || null;
    const userId = () => {
        try {
            const client = api();
            return client && typeof client.getCurrentUserId === "function" ? client.getCurrentUserId() : null;
        } catch (_) {
            return null;
        }
    };

    const itemCache = new Map();
    function getItem(id) {
        if (!id) return Promise.resolve(null);
        if (itemCache.has(id)) return Promise.resolve(itemCache.get(id));
        const client = api();
        const uid = userId();
        if (!client || !uid || typeof client.getItem !== "function") return Promise.resolve(null);
        return Promise.resolve(client.getItem(uid, id)).then(item => {
            if (item) itemCache.set(id, item);
            return item || null;
        }).catch(() => null);
    }

    function cardId(card) {
        return card?.getAttribute("data-id") || card?.getAttribute("data-item-id") || card?.dataset?.id || card?.dataset?.itemId || "";
    }

    function sectionIsContinueWatching(section) {
        const title = section.querySelector(".sectionTitle, .sectionTitle-cards, h2, h3, [class*='sectionTitle']");
        return /continue\s*watching|resume/i.test(title?.textContent || "");
    }

    function findContinueWatchingSections() {
        return Array.from(document.querySelectorAll(".verticalSection, .sectionContainer, section, [class*='verticalSection']"))
            .filter(sectionIsContinueWatching);
    }

    function hideDuplicate(card) {
        card.classList.add("df-hidden-duplicate");
        card.setAttribute("aria-hidden", "true");
        card.style.display = "none";
    }

    async function groupContinueWatching() {
        if (!config.GroupContinueWatching) return;
        for (const section of findContinueWatchingSections()) {
            const cards = Array.from(section.querySelectorAll(".card")).filter(cardId);
            if (cards.length < 2) continue;
            const groups = new Map();
            for (const card of cards) {
                const id = cardId(card);
                const item = await getItem(id);
                if (!item || item.Type !== "Episode" || !item.SeriesId) continue;
                if (!groups.has(item.SeriesId)) groups.set(item.SeriesId, { card, episode: item });
                else hideDuplicate(card);
            }
            for (const { card, episode } of groups.values()) {
                const series = await getItem(episode.SeriesId);
                if (!series) continue;
                const titleNode = card.querySelector(".cardText-first, .cardText, .name, [class*='cardText']");
                if (titleNode && series.Name) titleNode.textContent = series.Name;
                const img = card.querySelector("img.cardImage, .cardImageContainer img, img.coveredImage, .coveredImage");
                if (img && series.Id) {
                    const old = img.getAttribute("src");
                    const url = `/Items/${encodeURIComponent(series.Id)}/Images/Primary?fillWidth=600&quality=92`;
                    img.dataset.dfOriginalSrc ||= old || "";
                    img.src = url;
                }
                const runtime = episode.RunTimeTicks ? Math.max(1, Math.round(episode.RunTimeTicks / 600000000)) : 0;
                const minutes = runtime ? `${Math.floor(runtime / 60)}h ${String(runtime % 60).padStart(2, "0")}m` : "";
                const meta = [
                    Number.isFinite(episode.ParentIndexNumber) && Number.isFinite(episode.IndexNumber) ? `S${String(episode.ParentIndexNumber).padStart(2, "0")} · E${String(episode.IndexNumber).padStart(2, "0")}` : "",
                    minutes
                ].filter(Boolean).join(" · ");
                let metaNode = card.querySelector(".df-series-meta");
                if (!metaNode && meta) {
                    metaNode = document.createElement("div");
                    metaNode.className = "df-series-meta secondaryText";
                    (card.querySelector(".cardText") || card).appendChild(metaNode);
                }
                if (metaNode) metaNode.textContent = meta;
            }
        }
    }

    function isDetailsPage() {
        return /#\/details(?:\?|$)/i.test(window.location.hash || "");
    }

    function detailsId() {
        const hash = window.location.hash || "";
        const q = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
        try { return new URLSearchParams(q).get("id") || null; } catch (_) { return null; }
    }

    function localTime(date) {
        try { return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date); }
        catch (_) { return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
    }

    function ensureNode(host, cls) {
        let node = host.querySelector(`.${cls}`);
        if (!node) { node = document.createElement("div"); node.className = cls; host.appendChild(node); }
        return node;
    }

    function renderTechnical(host, item) {
        const source = item?.MediaSources?.[0];
        if (!source?.MediaStreams) return;
        const video = source.MediaStreams.find(s => s.Type === "Video");
        const audio = source.MediaStreams.find(s => s.Type === "Audio");
        const subs = source.MediaStreams.filter(s => s.Type === "Subtitle");
        const parts = [];
        if (video) {
            const quality = video.Width >= 3800 ? "4K" : video.Width >= 1900 ? "1080p" : video.Width ? `${video.Width}p` : "VIDEO";
            parts.push(`VIDEO ${quality}${video.VideoRange ? ` · ${video.VideoRange}` : ""}${video.Codec ? ` · ${video.Codec.toUpperCase()}` : ""}`);
        }
        if (audio) parts.push(`AUDIO ${audio.Codec ? audio.Codec.toUpperCase() : "AUDIO"}${audio.Channels ? ` · ${audio.Channels}ch` : ""}${audio.Language ? ` · ${audio.Language}` : ""}`);
        if (subs.length) parts.push(`SUBTITLES ${[...new Set(subs.map(s => s.Language || s.Codec).filter(Boolean))].join(", ") || subs.length}`);
        if (!parts.length) return;
        const node = ensureNode(host, "df-media-technical");
        node.replaceChildren(...parts.map(text => { const chip = document.createElement("span"); chip.className = "df-media-chip"; chip.textContent = text; return chip; }));
    }

    async function enhanceDetails() {
        if (!isDetailsPage()) { state.detailId = null; return; }
        const id = detailsId();
        if (!id || id === state.detailId) return;
        state.detailId = id;
        const item = await getItem(id);
        if (!item) return;
        const page = document.querySelector("#itemDetailPage, .itemDetailPage, main");
        if (!page) return;
        const host = page.querySelector(".infoWrapper, .itemMiscInfo, .nameContainer, .itemName") || page;
        if (config.ShowLocalEndTime && item.RunTimeTicks) {
            const pos = Number(item.UserData?.PlaybackPositionTicks || 0);
            const remainingMs = Math.max(0, (item.RunTimeTicks - pos) / 10000);
            const label = pos > 0 ? "Resume ends around " : "Starts now · ends around ";
            const node = ensureNode(host, "df-local-end-time");
            node.textContent = label + localTime(new Date(Date.now() + remainingMs));
        }
        if (config.ShowMediaTechnicalDetails) renderTechnical(page.querySelector(".overview, .infoWrapper, .itemMiscInfo") || host, item);
    }

    function schedule() {
        window.clearTimeout(state.timer);
        state.timer = window.setTimeout(async () => {
            if (state.running) return;
            state.running = true;
            try {
                await groupContinueWatching();
                await enhanceDetails();
            } finally {
                state.running = false;
            }
        }, 500);
    }

    const start = () => {
        if (!document.body) return;
        if (!state.observer) {
            state.observer = new MutationObserver(() => schedule());
            state.observer.observe(document.body, { childList: true, subtree: true });
        }
        schedule();
    };

    window.addEventListener("hashchange", schedule, { passive: true });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
})();
