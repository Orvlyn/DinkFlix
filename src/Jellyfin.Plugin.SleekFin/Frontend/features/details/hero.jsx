import { Facts, Fragment, h, IconButton, item, dom, render } from '../../shared/runtime.js';

function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.hash = '#/home';
  }
}

function childTitle(mediaItem) {
  if (mediaItem.Type !== 'Season' && mediaItem.Type !== 'Episode') return null;

  let kicker = mediaItem.SeriesName || 'TV Show';
  if (mediaItem.Type === 'Episode') {
    const season = mediaItem.SeasonName || (mediaItem.ParentIndexNumber ? `Season ${mediaItem.ParentIndexNumber}` : '');
    const episode = mediaItem.IndexNumber ? `Episode ${mediaItem.IndexNumber}` : '';
    kicker = [season, episode].filter(Boolean).join(' · ') || kicker;
  }

  return (
    <>
      <span class="dinkflix-details-child-kicker">{kicker}</span>
      <h1 class="dinkflix-details-child-name">{mediaItem.Name || ''}</h1>
    </>
  );
}

function technicalStreams(mediaItem) {
  return Array.isArray(mediaItem.MediaStreams) ? mediaItem.MediaStreams : [];
}

function firstStream(mediaItem, type) {
  return technicalStreams(mediaItem).find((stream) => String(stream.Type || '').toLowerCase() === type);
}

function richInfo(mediaItem) {
  const info = [];
  const video = firstStream(mediaItem, 'video');
  const subtitles = technicalStreams(mediaItem).filter((stream) => String(stream.Type || '').toLowerCase() === 'subtitle');
  const resolution = video?.Height >= 2100 || video?.Width >= 3800 ? '4K'
    : video?.Height >= 1050 || video?.Width >= 1900 ? '1080p'
    : video?.Height >= 700 || video?.Width >= 1200 ? '720p'
    : video?.Height ? `${video.Height}p` : '';
  const codec = video?.DisplayTitle || video?.Codec || '';
  const videoValue = [resolution, codec].filter(Boolean).join(' · ');
  if (videoValue) info.push({ label: 'Video', value: videoValue });
  if (subtitles.length) info.push({ label: 'Subtitles', value: subtitles.length === 1 ? (subtitles[0].DisplayTitle || 'Available') : `${subtitles.length} tracks` });
  if (mediaItem.Genres?.length) info.push({ label: 'Genres', value: mediaItem.Genres.join(' · ') });
  if (mediaItem.Director) info.push({ label: 'Director', value: mediaItem.Director });
  if (mediaItem.Writer) info.push({ label: 'Writer', value: mediaItem.Writer });
  if (mediaItem.Studios?.length) info.push({ label: 'Studio', value: mediaItem.Studios.map((studio) => studio.Name || studio).join(' · ') });
  return info;
}

function RichInfo({ values }) {
  return (
    <div class="dinkflix-details-rich-info">
      {values.map((entry) => (
        <span class="dinkflix-details-rich-info-item" key={`${entry.label}-${entry.value}`}>
          <strong>{entry.label}</strong>
          <span>{entry.value}</span>
        </span>
      ))}
    </div>
  );
}

function episodeNavigation(client, mediaItem) {
  if (!client || mediaItem.Type !== 'Episode' || !mediaItem.SeriesId || !mediaItem.SeasonId) return Promise.resolve(null);
  return client.getEpisodes(mediaItem.SeriesId, {
    seasonId: mediaItem.SeasonId,
    userId: client.getCurrentUserId(),
    Fields: 'Overview,MediaStreams,People,Studios',
    EnableImages: false,
    EnableUserData: true,
  }).then((result) => {
    const episodes = result.Items || [];
    const index = episodes.findIndex((episode) => episode.Id === mediaItem.Id);
    return {
      previous: index > 0 ? episodes[index - 1] : null,
      next: index >= 0 && index < episodes.length - 1 ? episodes[index + 1] : null,
      index,
      total: episodes.length,
    };
  }).catch(() => null);
}

function openDetail(mediaItem) {
  if (!mediaItem || !mediaItem.Id) return;
  const serverId = mediaItem.ServerId || (window.ApiClient && window.ApiClient.serverId ? window.ApiClient.serverId() : '');
  window.location.hash = '#/details?id=' + encodeURIComponent(mediaItem.Id) + '&serverId=' + encodeURIComponent(serverId);
}

function factValues(mediaItem, seasons) {
  const values = [];
  const score = Number(mediaItem.CommunityRating || 0);
  if (score > 0) {
    values.push({ className: 'dinkflix-details-score', icon: 'star', text: score.toFixed(1) });
  }
  values.push({ text: item.year(mediaItem) });
  if (mediaItem.Type === 'Series') {
    const count = seasons.filter((season) => Number(season.IndexNumber) > 0).length;
    values.push({ text: count ? `${count}${count === 1 ? ' Season' : ' Seasons'}` : 'Series' });
  } else if (mediaItem.Type === 'Season') {
    const count = Number(mediaItem.ChildCount || mediaItem.RecursiveItemCount || 0);
    values.push({ text: count ? `${count}${count === 1 ? ' Episode' : ' Episodes'}` : 'Season' });
  } else {
    values.push({ text: item.formatRuntime(mediaItem.RunTimeTicks) });
  }
  values.push({ className: 'dinkflix-details-certification', text: mediaItem.OfficialRating });
  return values;
}

export function createHero(page) {
  const wrapper = page.querySelector('.detailPageWrapperContainer');
  const nativeBackdrop = page.querySelector('#itemBackdrop');
  const actions = page.querySelector('.mainDetailButtons');
  if (!wrapper || !nativeBackdrop || !actions) return null;

  let moved = [];
  const backdropOriginal = nativeBackdrop.style.backgroundImage;
  const hero = dom.element('<div class="dinkflix-details-hero"><div class="dinkflix-details-hero-nav"></div><div class="dinkflix-details-stack"><div class="dinkflix-details-title"></div><div class="dinkflix-details-child-title" hidden></div><div class="dinkflix-details-facts"></div><div class="dinkflix-details-genres"></div></div></div>');
  const navRoot = hero.firstElementChild;
  const stack = hero.querySelector('.dinkflix-details-stack');
  const title = stack.querySelector('.dinkflix-details-title');
  const childTitleRoot = stack.querySelector('.dinkflix-details-child-title');
  const factsRoot = stack.querySelector('.dinkflix-details-facts');
  const genresRoot = stack.querySelector('.dinkflix-details-genres');
  const richRoot = document.createElement('div');
  richRoot.className = 'dinkflix-details-rich-info-root';
  const downloadWasHidden = actions.querySelector('.btnDownload')?.classList.contains('hide');
  const logo = page.querySelector('.detailLogo');

  function move(element, destination) {
    if (!element) return;
    moved.push({ element, next: element.nextSibling, parent: element.parentNode });
    destination.appendChild(element);
  }

  function restoreMoved() {
    moved.reverse().forEach((record) => {
      if (!dom.isConnected(record.element)) return;
      if (dom.isConnected(record.parent)) {
        record.parent.insertBefore(record.element, record.next?.parentNode === record.parent ? record.next : null);
      } else {
        record.element.remove();
      }
    });
    moved = [];
  }

  function renderNavigation(mediaItem) {
    render(
      <div class="dinkflix-details-navigation">
        <IconButton class="dinkflix-details-back" icon="arrowLeft" label="Back" raised onClick={goBack} />
        {mediaItem.Type === 'Episode' && (
          <div class="dinkflix-details-adjacent" aria-label="Episode navigation">
            <IconButton class="dinkflix-details-adjacent-button" icon="arrowLeft" label="Previous episode" raised onClick={() => episodeNavigation(window.ApiClient, mediaItem).then((result) => result && result.previous && openDetail(result.previous))} />
            <span class="dinkflix-details-episode-position"></span>
            <IconButton class="dinkflix-details-adjacent-button" icon="arrowRight" label="Next episode" raised onClick={() => episodeNavigation(window.ApiClient, mediaItem).then((result) => result && result.next && openDetail(result.next))} />
          </div>
        )}
      </div>,
      navRoot,
    );
    if (mediaItem.Type === 'Episode') {
      episodeNavigation(window.ApiClient, mediaItem).then((result) => {
        const pos = navRoot.querySelector('.dinkflix-details-episode-position');
        const buttons = navRoot.querySelectorAll('.dinkflix-details-adjacent-button');
        if (!result) return;
        if (pos) pos.textContent = result.index >= 0 ? String(result.index + 1) + ' / ' + String(result.total) : '';
        if (buttons[0]) buttons[0].disabled = !result.previous;
        if (buttons[1]) buttons[1].disabled = !result.next;
      });
    }
  }

  function renderHero(mediaItem, seasons) {
    renderNavigation(mediaItem);
    const backdropUrl = item.imageUrl(mediaItem, 'Backdrop', { maxWidth: Math.max(960, window.innerWidth), inherit: true, quality: 90 });
    const isChild = mediaItem.Type === 'Season' || mediaItem.Type === 'Episode';
    childTitleRoot.hidden = !isChild;
    hero.classList.toggle('dinkflix-details-has-child-title', isChild);
    render(childTitle(mediaItem), childTitleRoot);
    render(<Facts values={factValues(mediaItem, seasons)} />, factsRoot);
    render(<Facts values={(mediaItem.Genres || []).map((genre) => ({ text: genre }))} />, genresRoot);
    render(<RichInfo values={richInfo(mediaItem)} />, richRoot);

    actions.querySelector('.btnDownload')?.classList.toggle('hide', !['Movie', 'Episode'].includes(mediaItem.Type) || !mediaItem.CanDownload);
    if (backdropUrl) {
      nativeBackdrop.style.backgroundImage = `url("${backdropUrl.replace(/["\\]/g, '\\$&')}")`;
    }
  }

  function sync() {
    const source = Array.from(page.querySelectorAll('.backdropImage')).find((element) => window.getComputedStyle(element).backgroundImage !== 'none');
    const background = source && window.getComputedStyle(source).backgroundImage;
    if (background && background !== 'none') {
      nativeBackdrop.style.backgroundImage = background;
    }
    hero.classList.toggle('dinkflix-details-has-logo', Boolean(logo && window.getComputedStyle(logo).backgroundImage !== 'none'));
  }

  
  move(logo, title);
  move(page.querySelector('.nameContainer'), title);
  move(page.querySelector('.overview'), stack);
  move(page.querySelector('.overview-controls'), stack);
  stack.appendChild(richRoot);
  move(actions, stack);
  page.insertBefore(hero, wrapper);
  sync();

  return {
    actions,
    destroy() {
      actions.querySelector('.btnDownload')?.classList.toggle('hide', downloadWasHidden);
      render(null, navRoot);
      render(null, childTitleRoot);
      render(null, factsRoot);
      render(null, genresRoot);
      richRoot.remove();
      restoreMoved();
      hero.remove();
      nativeBackdrop.style.backgroundImage = backdropOriginal;
    },
    isConnected() {
      return dom.isConnected(hero) && dom.isConnected(nativeBackdrop);
    },
    render: renderHero,
    sync,
  };
}
