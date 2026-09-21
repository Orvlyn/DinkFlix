/*
 * DINKFLIX lightweight frontend enhancements.
 *
 * This file deliberately does NOT create an application root, replace routes,
 * replace Jellyfin playback, intercept context menus, or render fake pages.
 * It only enhances native Jellyfin DOM that already exists.
 */
(function () {
    "use strict";

    var config = Object.assign({
        EnableEnhancements: true,
        GroupContinueWatching: true,
        ShowLocalEndTime: true,
        ShowMediaTechnicalDetails: true
    }, window.__DINKFLIX_CONFIG__ || {});

    document.documentElement.classList.add("df-booting");

    var cache = new Map();
    var pending = new Map();
    var observerTimer = null;
    var detailTimer = null;
    var lastDetailId = null;
    var running = false;

    function ready() {
        document.documentElement.classList.remove("df-booting");
        document.documentElement.classList.add("df-ready");
    }

    window.addEventListener("load", function () {
        requestAnimationFrame(function () {
            requestAnimationFrame(ready);
        });
    }, { once: true });

    window.setTimeout(ready, 2500);

    if (!config.EnableEnhancements) {
        return;
    }

    function currentApiClient() {
        return window.ApiClient || null;
    }

    function getCurrentUserId() {
        var api = currentApiClient();
        try {
            return api && typeof api.getCurrentUserId === "function" ? api.getCurrentUserId() : null;
        } catch (e) {
            return null;
        }
    }

    function parseDetailsId() {
        var hash = window.location.hash || "";
        var question = hash.indexOf("?");
        var query = question >= 0 ? hash.slice(question + 1) : "";
        if (!query) {
            try {
                query = new URLSearchParams(window.location.search).toString();
            } catch (e) {
                query = "";
            }
        }

        if (!query) {
            return null;
        }

        try {
            var params = new URLSearchParams(query);
            var id = params.get("id");
            return id && /^[0-9a-f]{20,64}$/i.test(id) ? id : id;
        } catch (e) {
            return null;
        }
    }

    function isDetailsRoute() {
        return /#\/details(?:\?|$)/i.test(window.location.hash || "");
    }

    async function getItem(itemId) {
        if (!itemId) {
            return null;
        }

        if (cache.has(itemId)) {
            return cache.get(itemId);
        }

        if (pending.has(itemId)) {
            return pending.get(itemId);
        }

        var api = currentApiClient();
        var userId = getCurrentUserId();
        if (!api || !userId || typeof api.getItem !== "function") {
            return null;
        }

        var promise = Promise.resolve()
            .then(function () {
                return api.getItem(userId, itemId);
            })
            .then(function (item) {
                if (item) {
                    cache.set(itemId, item);
                }
                return item || null;
            })
            .catch(function () {
                return null;
            })
            .finally(function () {
                pending.delete(itemId);
            });

        pending.set(itemId, promise);
        return promise;
    }

    function getCardItemId(card) {
        if (!card) {
            return null;
        }
        return card.getAttribute("data-id") ||
            card.getAttribute("data-item-id") ||
            card.dataset && (card.dataset.id || card.dataset.itemId) ||
            null;
    }

    function getCardTitleNode(card) {
        return card.querySelector(".cardText-first, .cardText, .cardText-secondary, .name, [class*='cardText']");
    }

    function getCardImageNode(card) {
        return card.querySelector("img.cardImage, .cardImageContainer img, img.coveredImage, .coveredImage");
    }

    function formatDuration(ticks) {
        if (!ticks || ticks <= 0) {
            return "";
        }
        var totalMinutes = Math.max(1, Math.round(ticks / 600000000));
        var hours = Math.floor(totalMinutes / 60);
        var minutes = totalMinutes % 60;
        return hours > 0 ? hours + "h " + String(minutes).padStart(2, "0") + "m" : minutes + "m";
    }

    function formatEpisodeMeta(item) {
        var season = item && Number.isFinite(item.ParentIndexNumber) ? item.ParentIndexNumber : null;
        var episode = item && Number.isFinite(item.IndexNumber) ? item.IndexNumber : null;
        var runtime = formatDuration(item && item.RunTimeTicks);
        var parts = [];
        if (season !== null && episode !== null) {
            parts.push("S" + String(season).padStart(2, "0") + " · E" + String(episode).padStart(2, "0"));
        }
        if (runtime) {
            parts.push(runtime);
        }
        return parts.join(" · ");
    }

    function imageUrl(itemId) {
        return "/Items/" + encodeURIComponent(itemId) + "/Images/Primary?fillWidth=600&quality=92";
    }

    function findContinueWatchingSections() {
        var sections = [];
        var candidates = document.querySelectorAll(".verticalSection, .sectionContainer, section, [class*='verticalSection']");

        for (var i = 0; i < candidates.length; i += 1) {
            var section = candidates[i];
            if (!section || section.querySelector(".df-series-grouped-marker")) {
                continue;
            }

            var heading = section.querySelector(".sectionTitle, .sectionTitle-cards, h2, h3, [class*='sectionTitle']");
            var text = heading ? (heading.textContent || "") : "";
            if (/continue\s*watching|resume/i.test(text)) {
                sections.push(section);
            }
        }

        return sections;
    }

    function ensureSeriesMarker(card) {
        var marker = card.querySelector(":scope > .df-series-grouped-marker");
        if (!marker) {
            marker = document.createElement("span");
            marker.className = "df-series-grouped-marker";
            marker.setAttribute("aria-hidden", "true");
            marker.style.display = "none";
            card.appendChild(marker);
        }
        return marker;
    }

    async function groupSection(section) {
        var cards = Array.prototype.slice.call(section.querySelectorAll(".card"))
            .filter(function (card) { return getCardItemId(card); });

        if (cards.length < 2) {
            return;
        }

        section.classList.add("df-series-grouped-marker");
        var groups = new Map();
        var seriesCache = new Map();

        for (var i = 0; i < cards.length; i += 1) {
            var card = cards[i];
            var itemId = getCardItemId(card);
            var item = await getItem(itemId);
            if (!item || item.Type !== "Episode" || !item.SeriesId) {
                continue;
            }

            var group = groups.get(item.SeriesId);
            if (!group) {
                group = { first: card, episode: item, duplicates: [] };
                groups.set(item.SeriesId, group);
            } else {
                group.duplicates.push(card);
            }
        }

        if (!groups.size) {
            return;
        }

        var iterator = groups.values();
        var next = iterator.next();
        while (!next.done) {
            var groupData = next.value;
            var episode = groupData.episode;
            var series = seriesCache.get(episode.SeriesId);
            if (!series) {
                series = await getItem(episode.SeriesId);
                if (series) {
                    seriesCache.set(episode.SeriesId, series);
                }
            }

            var card = groupData.first;
            var titleNode = getCardTitleNode(card);
            var imageNode = getCardImageNode(card);
            var title = series && series.Name ? series.Name : episode.SeriesName || episode.SeriesName || episode.Name;
            var meta = formatEpisodeMeta(episode);

            if (titleNode && title) {
                titleNode.textContent = title;
                titleNode.setAttribute("title", title);
            }

            if (imageNode && series && series.Id) {
                if (!imageNode.dataset.dfOriginalSrc) {
                    imageNode.dataset.dfOriginalSrc = imageNode.getAttribute("src") || "";
                }
                imageNode.addEventListener("error", function () {
                    var original = this.dataset.dfOriginalSrc;
                    if (original) {
                        this.setAttribute("src", original);
                    }
                }, { once: true });
                imageNode.setAttribute("src", imageUrl(series.Id));
            }

            card.setAttribute("aria-label", meta ? title + ", " + meta : title);
            card.dataset.dfSeriesId = episode.SeriesId;
            ensureSeriesMarker(card);

            var metaNode = card.querySelector(".df-series-meta");
            if (!metaNode && meta) {
                metaNode = document.createElement("div");
                metaNode.className = "df-series-meta secondaryText";
                var host = card.querySelector(".cardText, .cardText-first, .cardText-secondary") || card;
                host.appendChild(metaNode);
            }
            if (metaNode) {
                metaNode.textContent = meta;
            }

            groupData.duplicates.forEach(function (duplicate) {
                duplicate.style.display = "none";
                duplicate.setAttribute("aria-hidden", "true");
            });

            next = iterator.next();
        }
    }

    function scheduleGrouping() {
        if (!config.GroupContinueWatching) {
            return;
        }
        window.clearTimeout(observerTimer);
        observerTimer = window.setTimeout(function () {
            var sections = findContinueWatchingSections();
            sections.forEach(function (section) {
                groupSection(section).catch(function () {});
            });
        }, 250);
    }

    function localTime(date) {
        try {
            return new Intl.DateTimeFormat(undefined, {
                hour: "numeric",
                minute: "2-digit"
            }).format(date);
        } catch (e) {
            return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        }
    }

    function ensureInfoNode(host, className) {
        var existing = host.querySelector("." + className);
        if (existing) {
            return existing;
        }
        var node = document.createElement("div");
        node.className = className;
        host.appendChild(node);
        return node;
    }

    function makeMediaSummary(item) {
        var source = item && item.MediaSources && item.MediaSources[0];
        if (!source || !source.MediaStreams) {
            return null;
        }

        var video = source.MediaStreams.find(function (stream) { return stream.Type === "Video"; });
        var audios = source.MediaStreams.filter(function (stream) { return stream.Type === "Audio"; });
        var subtitles = source.MediaStreams.filter(function (stream) { return stream.Type === "Subtitle"; });
        var parts = [];

        if (video) {
            var quality = video.Width >= 3800 ? "4K" : video.Width >= 1900 ? "1080p" : video.Width ? video.Width + "p" : "Video";
            var hdr = video.VideoRange || video.VideoRangeType || "";
            parts.push("VIDEO " + quality + (hdr ? " · " + hdr : "") + (video.Codec ? " · " + video.Codec.toUpperCase() : ""));
        }

        if (audios.length) {
            var audio = audios[0];
            parts.push("AUDIO " + (audio.Codec ? audio.Codec.toUpperCase() : "Audio") + (audio.Channels ? " · " + audio.Channels + "ch" : "") + (audio.Language ? " · " + audio.Language : ""));
        }

        if (subtitles.length) {
            var languages = subtitles.map(function (stream) { return stream.Language || stream.DisplayLanguage || stream.Codec; }).filter(Boolean);
            var unique = Array.from(new Set(languages));
            parts.push("SUBTITLES " + (unique.length ? unique.join(", ") : subtitles.length));
        }

        return parts.length ? parts : null;
    }

    async function updateDetailPage() {
        if (!isDetailsRoute()) {
            lastDetailId = null;
            return;
        }

        var itemId = parseDetailsId();
        if (!itemId || itemId === lastDetailId) {
            return;
        }
        lastDetailId = itemId;

        var item = await getItem(itemId);
        if (!item) {
            return;
        }

        var detailPage = document.querySelector("#itemDetailPage, [data-role='page'][class*='detail'], main");
        if (!detailPage) {
            return;
        }

        var host = detailPage.querySelector(".itemMiscInfo, .infoWrapper, .itemName, h1") || detailPage;

        if (config.ShowLocalEndTime && item.RunTimeTicks) {
            var remainingTicks = item.RunTimeTicks;
            var positionTicks = item.UserData && item.UserData.PlaybackPositionTicks ? item.UserData.PlaybackPositionTicks : 0;
            remainingTicks = Math.max(0, remainingTicks - positionTicks);
            var remainingMs = Math.round(remainingTicks / 10000);
            var endDate = new Date(Date.now() + remainingMs);
            var label = positionTicks > 0 ? "Resume ends around " : "Starting now ends around ";
            var endNode = ensureInfoNode(host.parentElement || host, "df-local-end-time");
            endNode.textContent = label + localTime(endDate);
            endNode.setAttribute("title", "Based on the media runtime and your current resume position.");
        }

        if (config.ShowMediaTechnicalDetails) {
            var mediaParts = makeMediaSummary(item);
            if (mediaParts) {
                var techHost = detailPage.querySelector(".overview, .itemMiscInfo, .infoWrapper") || host.parentElement || host;
                var tech = ensureInfoNode(techHost, "df-media-technical");
                while (tech.firstChild) {
                    tech.removeChild(tech.firstChild);
                }
                mediaParts.forEach(function (part) {
                    var chip = document.createElement("span");
                    chip.className = "df-media-chip";
                    chip.textContent = part;
                    tech.appendChild(chip);
                });
            }
        }
    }

    function scheduleDetailUpdate() {
        if (!config.ShowLocalEndTime && !config.ShowMediaTechnicalDetails) {
            return;
        }
        window.clearTimeout(detailTimer);
        detailTimer = window.setTimeout(function () {
            updateDetailPage().catch(function () {});
        }, 300);
    }

    function run() {
        if (running) {
            return;
        }
        running = true;
        try {
            scheduleGrouping();
            scheduleDetailUpdate();
        } finally {
            running = false;
        }
    }

    var observer = new MutationObserver(function () {
        run();
    });

    function startObserver() {
        if (!document.body) {
            window.setTimeout(startObserver, 100);
            return;
        }
        observer.observe(document.body, { childList: true, subtree: true });
        run();
    }

    window.addEventListener("hashchange", run, { passive: true });
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
    startObserver();
})();
