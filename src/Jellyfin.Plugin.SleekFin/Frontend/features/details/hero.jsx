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
  const streams = technicalStreams(mediaItem);
  const video = firstStream(mediaItem, 'video');
  const subtitles = streams.filter((stream) => String(stream.Type || '').toLowerCase() === 'subtitle');
  const primarySource = Array.isArray(mediaItem.MediaSources) ? mediaItem.MediaSources[0] : null;

  const resolution = video?.Height >= 2100 || video?.Width >= 3800 ? '4K'
    : video?.Height >= 1050 || video?.Width >= 1900 ? '1080p'
    : video?.Height >= 700 || video?.Width >= 1200 ? '720p'
    : video?.Height ? `${video.Height}p` : '';
  const codec = video?.DisplayTitle || video?.Codec || '';
  const sourceType = primarySource?.VideoType || primarySource?.Container || '';
  const videoValue = [resolution, codec].filter(Boolean).join(' · ');
  if (videoValue) info.push({ label: 'Video', value: videoValue });
  if (sourceType) info.push({ label: 'Source', value: String(sourceType).replace(/([a-z])([A-Z])/g, '$1 $2') });

  if (subtitles.length) {
    const subtitleLanguages = [...new Set(
      subtitles.map((stream) => stream.Language || stream.DisplayLanguage || stream.DisplayTitle).filter(Boolean),
    )];
    info.push({
      label: 'Subtitles',
      value: subtitleLanguages.length ? subtitleLanguages.join(' · ') : `${subtitles.length} tracks`,
    });
  }

  if (mediaItem.Genres?.length) info.push({ label: 'Genres', value: mediaItem.Genres.join(' · ') });

  const people = Array.isArray(mediaItem.People) ? mediaItem.People : [];
  const directors = people.filter((person) => String(person.Type || '').toLowerCase() === 'director').map((person) => person.Name).filter(Boolean);
  const writers = people.filter((person) => ['writer', 'screenwriter'].includes(String(person.Type || '').toLowerCase())).map((person) => person.Name).filter(Boolean);
  const directorsValue = [...new Set([mediaItem.Director, ...directors].filter(Boolean))].join(' · ');
  const writersValue = [...new Set([mediaItem.Writer, ...writers].filter(Boolean))].join(' · ');
  if (directorsValue) info.push({ label: 'Director', value: directorsValue });
  if (writersValue) info.push({ label: 'Writer', value: writersValue });

  if (mediaItem.Studios?.length) {
    const studios = mediaItem.Studios.map((studio) => studio.Name || studio).filter(Boolean);
    if (studios.length) info.push({ label: 'Studio', value: [...new Set(studios)].join(' · ') });
  }

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
  const hero = dom.element('<div class="dinkflix-details-hero"><div></div><div class="dinkflix-details-stack"><div class="dinkflix-details-title"></div><div class="dinkflix-details-child-title" hidden></div><div class="dinkflix-details-facts"></div><div class="dinkflix-details-genres"></div></div></div>');
  const backRoot = hero.firstElementChild;
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

  function renderHero(mediaItem, seasons) {
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

  render(<IconButton class="dinkflix-details-back" icon="arrowLeft" label="Back" raised onClick={goBack} />, backRoot);
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
      render(null, backRoot);
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
