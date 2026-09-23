import { Fragment, h, Icon, IconButton, item, dom, render, SectionHeading, useEffect, useMemo, useRef, useState } from '../../shared/runtime.js';

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
    <article class="dinkflix-details-episode">
      <button {...action} type="button" class={`dinkflix-details-episode-action ${actionClass}`}>
        {imageUrl && <img src={imageUrl} />}
        <span class="dinkflix-details-episode-shade" />
        <span class="dinkflix-details-episode-copy">
          <span class="dinkflix-details-episode-number">{`Episode ${episode.IndexNumber || ''}`}</span>
          <span class="dinkflix-details-episode-title">{episode.Name || ''}</span>
          <span class="dinkflix-details-episode-overview">{episode.Overview || ''}</span>
          <span class="dinkflix-details-episode-footer">
            <span>
              <Icon name="play" />
              {item.formatRuntime(episode.RunTimeTicks)}
            </span>
            {score > 0 && (
              <span class="dinkflix-details-episode-score">
                <Icon name="star" />
                {score.toFixed(1)}
              </span>
            )}
          </span>
        </span>
      </button>
      {episode.CanDownload && typeof client.getItemDownloadUrl === 'function' && (
        <IconButton class="dinkflix-details-episode-download" icon="download" label="Download" raised strokeWidth={1.75} onClick={() => downloadEpisode(client, episode)} />
      )}
    </article>
  );
}

function Episodes({ client, list, mediaItem, seasons }) {
  const firstSeason = useMemo(() => seasons.find((season) => Number(season.IndexNumber) > 0) || seasons[0] || null, [seasons]);
  const [episodes, setEpisodes] = useState([]);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const initialSeasonId = mediaItem.Type === 'Season' ? mediaItem.Id : mediaItem.SeasonId || firstSeason?.Id || '';
  const [selectedSeasonId, setSelectedSeasonId] = useState(initialSeasonId);
  const [sortDescending, setSortDescending] = useState(false);
  const [status, setStatus] = useState(firstSeason ? 'loading' : 'error');
  const [view, setView] = useState('grid');
  const requestGeneration = useRef(0);
  const searchInput = useRef(null);

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

    setEpisodes([]);
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
  }, [client, mediaItem, selectedSeasonId]);

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

  const subtitle = status === 'loading' ? 'Loading episodes' : status === 'error' ? 'Episodes unavailable' : `${visibleEpisodes.length}${visibleEpisodes.length === 1 ? ' episode' : ' episodes'}`;
  let title;
  if (mediaItem.Type === 'Series') {
    title = (
      <div class="dinkflix-details-season-picker" role="tablist" aria-label="Seasons">
        {seasons.map((season) => {
          const active = season.Id === selectedSeasonId;
          const label = season.Name || `Season ${season.IndexNumber || ''}`;
          return (
            <button
              type="button"
              class="dinkflix-details-season-pill"
              data-active={active ? 'true' : 'false'}
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedSeasonId(season.Id)}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  } else {
    const currentSeason = seasons[0];
    title = <h2 class="dinkflix-details-season-title">{mediaItem.Type === 'Episode' ? `More from ${currentSeason?.Name || 'this season'}` : currentSeason?.Name || 'Episodes'}</h2>;
  }

  function scrollEpisodes(direction) {
    const amount = Math.max(list.clientWidth * 0.82, 320);
    list.scrollBy({ left: direction * amount, behavior: 'smooth' });
  }

  function toggleSearch() {
    setSearchOpen((open) => {
      if (open) {
        setQuery('');
      }
      return !open;
    });
  }

  return (
    <Fragment>
      <SectionHeading title={title} subtitle={subtitle} />
      <div class="dinkflix-details-episode-controls">
        <div class={`dinkflix-details-search dinkflix-control-3d${searchOpen ? ' dinkflix-details-search-open' : ''}`}>
          <IconButton icon="search" label="Search episodes" onClick={toggleSearch} />
          <input ref={searchInput} type="search" placeholder="Search episodes" value={query} onInput={(event) => setQuery(event.currentTarget.value)} />
        </div>
        <span class="dinkflix-details-episode-nav dinkflix-control-3d">
          <IconButton class="dinkflix-details-control" icon="arrowLeft" label="Previous episodes" onClick={() => scrollEpisodes(-1)} />
          <IconButton class="dinkflix-details-control" icon="arrowRight" label="Next episodes" onClick={() => scrollEpisodes(1)} />
        </span>
        <IconButton class="dinkflix-details-control" icon={sortDescending ? 'arrowUpAz' : 'arrowDownAz'} label="Reverse episode order" raised data-active={sortDescending ? 'true' : 'false'} onClick={() => setSortDescending((descending) => !descending)} />
        <span class="dinkflix-details-view-controls dinkflix-control-3d">
          <IconButton class="dinkflix-details-control" icon="grid" label="Grid view" data-view="grid" data-active={view === 'grid' ? 'true' : 'false'} onClick={() => setView('grid')} />
          <IconButton class="dinkflix-details-control" icon="list" label="List view" data-view="list" data-active={view === 'list' ? 'true' : 'false'} onClick={() => setView('list')} />
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

  const section = dom.element('<section class="dinkflix-details-episodes"><div class="dinkflix-details-episodes-header"></div><div is="emby-itemscontainer" class="dinkflix-details-episode-list" data-contextmenu="false" data-multiselect="false" data-view="grid"></div></section>');
  const header = section.firstElementChild;
  const list = section.lastElementChild;
  let destroyed = false;
  render(<Episodes client={client} list={list} mediaItem={mediaItem} seasons={seasons} />, header);
  wrapper.insertBefore(section, secondary);

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      render(null, list);
      render(null, header);
      section.remove();
    },
  };
}
