import { h, render } from '../../shared/runtime.js';

function peopleNames(mediaItem, type) {
  const people = (mediaItem.People || []).filter((person) => {
    const personType = String(person?.Type || '').toLowerCase();
    const role = String(person?.Role || '').toLowerCase();
    return personType === type || role === type;
  });
  return people.map((person) => person.Name).filter(Boolean).slice(0, 2).join(', ');
}

function metadataRows(mediaItem) {
  const rows = [];
  const genres = (mediaItem.Genres || []).filter(Boolean).join(', ');
  const director = peopleNames(mediaItem, 'director');
  const writer = peopleNames(mediaItem, 'writer');
  const studios = (mediaItem.Studios || []).map((studio) => studio?.Name).filter(Boolean).join(', ');

  if (genres) rows.push({ label: 'Genres', value: genres });
  if (director) rows.push({ label: 'Director', value: director });
  if (writer) rows.push({ label: 'Writer', value: writer });
  if (studios) rows.push({ label: 'Studios', value: studios });
  return rows;
}

function streamLabel(stream) {
  return stream?.DisplayTitle || stream?.Title || stream?.Codec || 'Unknown';
}

function TrackRow({ icon, label, streams, emptyLabel = 'None' }) {
  const options = (streams || []).filter(Boolean);
  const value = options[0] ? streamLabel(options[0]) : emptyLabel;

  return (
    <div class="sleekfin-details-media-row">
      <span class="material-icons sleekfin-details-media-icon" aria-hidden="true">{icon}</span>
      <span class="sleekfin-details-media-label">{label}</span>
      {options.length > 1 ? (
        <select class="sleekfin-details-media-select" aria-label={label} value={options[0]?.Index ?? ''}>
          {options.map((stream) => (
            <option value={stream.Index} key={stream.Index}>{streamLabel(stream)}</option>
          ))}
        </select>
      ) : (
        <span class="sleekfin-details-media-value">{value}</span>
      )}
    </div>
  );
}

function mediaStreams(item) {
  const streams = item.MediaStreams || [];
  return {
    video: streams.filter((stream) => String(stream?.Type).toLowerCase() === 'video'),
    audio: streams.filter((stream) => String(stream?.Type).toLowerCase() === 'audio'),
    subtitles: streams.filter((stream) => String(stream?.Type).toLowerCase() === 'subtitle'),
  };
}

export function createMediaDetails(page, mediaItem) {
  if (!['Movie', 'Series', 'Episode'].includes(mediaItem?.Type)) return null;

  const cast = page.querySelector('#castCollapsible');
  const similar = page.querySelector('#similarCollapsible');
  const section = document.createElement('section');
  section.className = 'sleekfin-details-lower-info';
  section.setAttribute('data-sleekfin-details-lower-info', 'true');

  if (cast?.parentElement) {
    cast.insertAdjacentElement('afterend', section);
  } else if (similar?.parentElement) {
    similar.insertAdjacentElement('beforebegin', section);
  } else {
    page.querySelector('.detailPageContent')?.appendChild(section);
  }

  let destroyed = false;
  let requestGeneration = 0;

  function renderContent(item) {
    const rows = metadataRows(item);
    const streams = mediaStreams(item);
    const showMedia = ['Movie', 'Episode'].includes(item.Type);

    render(
      <div className={showMedia ? 'sleekfin-details-lower-grid' : 'sleekfin-details-lower-grid sleekfin-details-lower-grid--metadata-only'}>
        <div class="sleekfin-details-meta-panel">
          {rows.map((row) => (
            <div class="sleekfin-details-meta-row" key={row.label}>
              <span class="sleekfin-details-meta-label">{row.label}</span>
              <span class="sleekfin-details-meta-value">{row.value}</span>
            </div>
          ))}
        </div>
        {showMedia ? (
          <div class="sleekfin-details-media-panel">
            <TrackRow icon="movie" label="Video" streams={streams.video} />
            <TrackRow icon="graphic_eq" label="Audio" streams={streams.audio} />
            <TrackRow icon="subtitles" label="Subtitles" streams={streams.subtitles} />
          </div>
        ) : null}
      </div>,
      section
    );
  }

  function load() {
    const client = window.ApiClient;
    if (!client || typeof client.getItems !== 'function' || !['Movie', 'Episode'].includes(mediaItem.Type)) return;

    const generation = ++requestGeneration;
    const userId = client.getCurrentUserId();
    client.getItems(userId, {
      EnableTotalRecordCount: false,
      Fields: 'Genres,People,Studios,MediaStreams',
      Ids: mediaItem.Id,
    }).then((result) => {
      if (destroyed || generation !== requestGeneration) return;
      renderContent({ ...mediaItem, ...(result.Items?.[0] || {}) });
    }).catch(() => {});
  }

  renderContent(mediaItem);
  load();

  return {
    destroy() {
      destroyed = true;
      requestGeneration += 1;
      render(null, section);
      section.remove();
    },
    reconcile() {
      if (!section.isConnected) return;
      if (section.previousElementSibling !== cast && cast?.parentElement) {
        cast.insertAdjacentElement('afterend', section);
      }
    },
  };
}
