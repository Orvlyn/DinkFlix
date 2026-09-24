import { Fragment, h, Icon, IconButton, item, dom, render, SectionHeading, useEffect, useMemo, useRef, useState } from '../../shared/runtime.js';

const seasonSelections = new Map();

function downloadEpisode(client, episode) {
  const link = document.createElement('a');
  link.href = client.getItemDownloadUrl(episode.Id);
  link.download = '';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function EpisodeCard({ client, episode }) {
  const score = Number(episode.CommunityRating || 0);
  const imageUrl = item.imageUrl(episode, 'Primary', { maxWidth: 840, quality: 90 });
  const action = item.actionAttributes(episode);
  const actionClass = action.class;
  delete action.class;

  return (
    <article class="sleekfin-details-episode">
      <button {...action} type="button" class={`sleekfin-details-episode-action ${actionClass}`}>
        {imageUrl && <img src={imageUrl} />}
        <span class="sleekfin-details-episode-shade" />
        <span class="sleekfin-details-episode-copy">
          <span class="sleekfin-details-episode-number">{`Episode ${episode.IndexNumber || ''}`}</span>
          <span class="sleekfin-details-episode-title">{episode.Name || ''}</span>
          <span class="sleekfin-details-episode-overview">{episode.Overview || ''}</span>
          <span class="sleekfin-details-episode-footer">
            <span>
              <Icon name="play" />
              {item.formatRuntime(episode.RunTimeTicks)}
            </span>
            {score > 0 && (
              <span class="sleekfin-details-episode-score">
                <Icon name="star" />
                {score.toFixed(1)}
              </span>
            )}
          </span>
        </span>
      </button>
      {episode.CanDownload && typeof client.getItemDownloadUrl === 'function' && (
        <IconButton class="sleekfin-details-episode-download" icon="download" label="Download" raised strokeWidth={1.75} onClick={() => downloadEpisode(client, episode)} />
      )}
    </article>
  );
}

function Episodes({ client, list, seasonMount, mediaItem, seasons }) {
  const seriesId = mediaItem.Type === 'Series' ? mediaItem.Id : mediaItem.SeriesId;
  const firstSeason = useMemo(() => seasons.find((season) => Number(season.IndexNumber) > 0) || seasons[0] || null, [seasons]);
  const [episodes, setEpisodes] = useState([]);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState(() => {
    const remembered = seriesId ? seasonSelections.get(String(seriesId)) : '';
    return remembered && seasons.some((season) => String(season.Id) === String(remembered)) ? remembered : firstSeason?.Id || '';
  });
  const [sortDescending, setSortDescending] = useState(false);
  const [status, setStatus] = useState(firstSeason ? 'loading' : 'error');
  const [view, setView] = useState('grid');
  const [scrollState, setScrollState] = useState({ left: false, right: false });
  const requestGeneration = useRef(0);
  const searchInput = useRef(null);
  const seasonScroller = useRef(null);
  const [seasonScrollState, setSeasonScrollState] = useState({ left: false, right: false });

  useEffect(() => {
    if (mediaItem.Type === 'Series' && seriesId && selectedSeasonId) {
      seasonSelections.set(String(seriesId), selectedSeasonId);
    }
  }, [mediaItem.Type, selectedSeasonId, seriesId]);

  useEffect(() => {
    if (searchOpen) {
      searchInput.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    const seriesId = mediaItem.Type === 'Series' ? mediaItem.Id : mediaItem.SeriesId;
    const generation = ++requestGeneration.current;
    if (!seriesId || !selectedSeasonId) {
      setEpisodes([]);
      setStatus('error');
      return undefined;
    }

    list.scrollTo({ left: 0, behavior: 'auto' });
    setStatus('loading');
    client
      .getEpisodes(seriesId, {
        seasonId: selectedSeasonId,
        userId: client.getCurrentUserId(),
        Fields: 'Overview,CanDownload',
        EnableImages: true,
        EnableUserData: true,
      })
      .then((result) => {
        if (generation !== requestGeneration.current) return;
        setEpisodes(result.Items || []);
        setStatus('ready');
      })
      .catch(() => {
        if (generation !== requestGeneration.current) return;
        setEpisodes([]);
        setStatus('error');
      });

    return () => {
      if (generation === requestGeneration.current) {
        requestGeneration.current += 1;
      }
    };
  }, [client, list, mediaItem, selectedSeasonId, seriesId]);

  const visibleEpisodes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filtered = episodes.filter(
      (episode) =>
        !normalizedQuery || (episode.Name || '').toLocaleLowerCase().includes(normalizedQuery) || (episode.Overview || '').toLocaleLowerCase().includes(normalizedQuery) || String(episode.IndexNumber || '').includes(normalizedQuery),
    );
    return sortDescending ? filtered.reverse() : filtered;
  }, [episodes, query, sortDescending]);

  useEffect(() => {
    list.dataset.view = view;
    render(
      <Fragment>
        {visibleEpisodes.map((episode) => (
          <EpisodeCard client={client} episode={episode} key={episode.Id} />
        ))}
      </Fragment>,
      list,
    );
    if (window.CustomElements && typeof window.CustomElements.upgradeSubtree === 'function') {
      window.CustomElements.upgradeSubtree(list);
    }
  }, [client, list, view, visibleEpisodes]);

  useEffect(() => {
    const updateScrollState = () => {
      if (view !== 'grid') {
        setScrollState({ left: false, right: false });
        return;
      }
      const maxScroll = Math.max(0, list.scrollWidth - list.clientWidth);
      setScrollState({
        left: list.scrollLeft > 2,
        right: list.scrollLeft < maxScroll - 2,
      });
    };

    updateScrollState();
    list.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      list.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [list, view, visibleEpisodes]);

  function scrollEpisodes(direction) {
    const firstEpisode = list.querySelector('.sleekfin-details-episode');
    const cardWidth = firstEpisode?.getBoundingClientRect().width || 380;
    list.scrollBy({ left: direction * (cardWidth + 12), behavior: 'smooth' });
  }

  useEffect(() => {
    const scroller = seasonScroller.current;
    if (!scroller || mediaItem.Type !== 'Series') return undefined;

    const updateSeasonScrollState = () => {
      const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      setSeasonScrollState({
        left: scroller.scrollLeft > 2,
        right: scroller.scrollLeft < maxScroll - 2,
      });
    };

    updateSeasonScrollState();
    scroller.addEventListener('scroll', updateSeasonScrollState, { passive: true });
    window.addEventListener('resize', updateSeasonScrollState);
    return () => {
      scroller.removeEventListener('scroll', updateSeasonScrollState);
      window.removeEventListener('resize', updateSeasonScrollState);
    };
  }, [seasons, mediaItem]);

  function scrollSeasons(direction) {
    const scroller = seasonScroller.current;
    if (!scroller) return;
    const firstCard = scroller.querySelector('.sleekfin-details-season-card');
    const cardWidth = firstCard?.getBoundingClientRect().width || 250;
    scroller.scrollBy({ left: direction * (cardWidth + 14), behavior: 'smooth' });
  }

  const subtitle = status === 'loading' ? 'Loading episodes' : status === 'error' ? 'Episodes unavailable' : `${visibleEpisodes.length}${visibleEpisodes.length === 1 ? ' episode' : ' episodes'}`;
  let title;
  let seasonCards = null;
  if (mediaItem.Type === 'Series') {
    title = <h2 class="sleekfin-details-season-title">Seasons</h2>;
    seasonCards = (
      <Fragment>
        <SectionHeading title={title} />
        <div class="sleekfin-details-season-carousel">
        <IconButton class="sleekfin-details-control sleekfin-details-season-nav" icon="chevron_left" label="Previous seasons" raised disabled={!seasonScrollState.left} onClick={() => scrollSeasons(-1)} />
        <div ref={seasonScroller} class="sleekfin-details-season-cards" role="list" aria-label="Seasons">
        {seasons.map((season) => {
          const seasonNumber = Number(season.IndexNumber);
          const seasonName = season.Name || `Season ${seasonNumber || ''}`;
          const imageUrl = item.imageUrl(season, 'Primary', { maxWidth: 520, quality: 90 });
          const episodeCount = Number(season.ChildCount || season.RecursiveItemCount || 0);
          const selected = String(season.Id) === String(selectedSeasonId);

          return (
            <button
              type="button"
              class={`sleekfin-details-season-card${selected ? ' sleekfin-details-season-card-selected' : ''}`}
              role="listitem"
              aria-pressed={selected ? 'true' : 'false'}
              onClick={() => setSelectedSeasonId(season.Id)}
            >
              {imageUrl ? <img src={imageUrl} alt="" /> : <span class="sleekfin-details-season-card-fallback" />}
              <span class="sleekfin-details-season-card-shade" />
              <span class="sleekfin-details-season-card-copy">
                <span class="sleekfin-details-season-card-kicker">{seasonNumber > 0 ? `Season ${seasonNumber}` : 'Specials'}</span>
                <span class="sleekfin-details-season-card-name">{seasonName}</span>
                {episodeCount > 0 && <span class="sleekfin-details-season-card-count">{episodeCount} {episodeCount === 1 ? 'Episode' : 'Episodes'}</span>}
              </span>
            </button>
          );
        })}
        </div>
        <IconButton class="sleekfin-details-control sleekfin-details-season-nav" icon="chevron_right" label="Next seasons" raised disabled={!seasonScrollState.right} onClick={() => scrollSeasons(1)} />
        </div>
      </Fragment>
    );
  } else {
    const currentSeason = seasons[0];
    title = <h2 class="sleekfin-details-season-title">{mediaItem.Type === 'Episode' ? `More from ${currentSeason?.Name || 'this season'}` : currentSeason?.Name || 'Episodes'}</h2>;
  }

  function toggleSearch() {
    setSearchOpen((open) => {
      if (open) {
        setQuery('');
      }
      return !open;
    });
  }

  useEffect(() => {
    if (mediaItem.Type !== 'Series' || !seasonMount) return undefined;
    render(seasonCards, seasonMount);
    return () => render(null, seasonMount);
  }, [mediaItem.Type, seasons, selectedSeasonId, seasonScrollState, seasonMount]);

  return (
    <Fragment>
      <SectionHeading title={title} subtitle={subtitle} />
      <div class="sleekfin-details-episode-controls">
        {view === 'grid' && (
          <span class="sleekfin-details-episode-nav sleekfin-control-3d">
            <IconButton class="sleekfin-details-control" icon="chevron_left" label="Previous episodes" raised disabled={!scrollState.left} onClick={() => scrollEpisodes(-1)} />
            <IconButton class="sleekfin-details-control" icon="chevron_right" label="Next episodes" raised disabled={!scrollState.right} onClick={() => scrollEpisodes(1)} />
          </span>
        )}
        <div class={`sleekfin-details-search sleekfin-control-3d${searchOpen ? ' sleekfin-details-search-open' : ''}`}>
          <IconButton icon="search" label="Search episodes" onClick={toggleSearch} />
          <input ref={searchInput} type="search" placeholder="Search episodes" value={query} onInput={(event) => setQuery(event.currentTarget.value)} />
        </div>
        <IconButton class="sleekfin-details-control" icon={sortDescending ? 'arrowUpAz' : 'arrowDownAz'} label="Reverse episode order" raised data-active={sortDescending ? 'true' : 'false'} onClick={() => setSortDescending((descending) => !descending)} />
        <span class="sleekfin-details-view-controls sleekfin-control-3d">
          <IconButton class="sleekfin-details-control" icon="grid" label="Grid view" data-view="grid" data-active={view === 'grid' ? 'true' : 'false'} onClick={() => setView('grid')} />
          <IconButton class="sleekfin-details-control" icon="list" label="List view" data-view="list" data-active={view === 'list' ? 'true' : 'false'} onClick={() => setView('list')} />
        </span>
      </div>
    </Fragment>
  );
}

export function createEpisodes(page, mediaItem, seasons) {
  const client = window.ApiClient;
  const wrapper = page.querySelector('.detailPageWrapperContainer');
  const secondary = page.querySelector('.detailPageSecondaryContainer');
  if (!client || !wrapper || !secondary) return null;

  const section = dom.element('<section class="sleekfin-details-episodes"><div class="sleekfin-details-episodes-header"></div><div is="emby-itemscontainer" class="sleekfin-details-episode-list" data-contextmenu="false" data-multiselect="false" data-view="grid"></div><div class="sleekfin-details-seasons"></div></section>');
  const header = section.firstElementChild;
  const list = section.querySelector('.sleekfin-details-episode-list');
  const seasonMount = section.querySelector('.sleekfin-details-seasons');
  let destroyed = false;
  render(<Episodes client={client} list={list} seasonMount={seasonMount} mediaItem={mediaItem} seasons={seasons} />, header);
  wrapper.insertBefore(section, secondary);

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      render(null, list);
      render(null, header);
      render(null, seasonMount);
      section.remove();
    },
  };
}
