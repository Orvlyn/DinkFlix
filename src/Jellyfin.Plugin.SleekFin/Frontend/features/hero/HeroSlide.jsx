import { Button, Facts, h, item, useState } from '../../shared/runtime.js';

export function HeroSlide({ entry, active, settings }) {
  const [backdropLoaded, setBackdropLoaded] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const displayItem = entry.display;
  const logoUrl = item.imageUrl(displayItem, 'Logo');
  const backdropUrl = item.imageUrl(displayItem, 'Backdrop');
  const showLogo = settings.titleTreatment !== 'Text' && logoUrl && !logoFailed;
  const showText = settings.titleTreatment !== 'Logo' && !showLogo;
  const rating = Number(displayItem.CommunityRating || 0);
  const facts = [];

  if (rating > 0) {
    facts.push({ className: 'dinkflix-hero-score', icon: 'star', text: rating.toFixed(1) });
  }
  facts.push({ text: item.year(displayItem) });
  facts.push({ text: item.typeLabel(displayItem.Type) });
  (displayItem.Genres || []).slice(0, 2).forEach((genre) => facts.push({ text: genre }));

  return (
    <section class="dinkflix-hero-slide" data-active={active ? 'true' : 'false'}>
      {backdropUrl && <img class="dinkflix-hero-backdrop" src={backdropUrl} data-loaded={backdropLoaded ? 'true' : 'false'} onLoad={() => setBackdropLoaded(true)} />}
      <div class="dinkflix-hero-vignette" />
      <div class="dinkflix-hero-seam" />
      <div class="dinkflix-hero-content">
        <div class="dinkflix-hero-stack">
          <div class="dinkflix-hero-title-box">
            {showLogo && <img class="dinkflix-hero-title-logo" src={logoUrl} data-loaded={logoLoaded ? 'true' : 'false'} onLoad={() => setLogoLoaded(true)} onError={() => setLogoFailed(true)} />}
            {showText && <span class="dinkflix-hero-title">{displayItem.Name || ''}</span>}
          </div>
          <div class="dinkflix-hero-facts">
            <Facts values={facts} />
          </div>
          {displayItem.Overview && <p class="dinkflix-hero-description">{displayItem.Overview}</p>}
          <div class="dinkflix-hero-actions">
            <Button {...item.actionAttributes(entry.play, 'play')} variant="primary" icon="play" label="Play" />
            <Button {...item.actionAttributes(displayItem, 'link')} variant="control" icon="info" label="More info" />
          </div>
        </div>
      </div>
    </section>
  );
}
