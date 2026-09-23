import { decorateNativeButton, restoreNativeButton } from '../../shared/runtime.js';

export function createActions(container, isEpisode) {
  const decorated = new Set();

  function reconcile() {
    const buttons = container.querySelectorAll('.btnPlay, .btnReplay, .btnDownload, .btnUserRating');
    const hasEpisodeResume = isEpisode && Array.from(buttons).some((element) => element.dataset.action === 'resume' && !element.classList.contains('hide'));

    buttons.forEach((element) => {
      const isFavorite = element.classList.contains('btnUserRating');
      const isDownload = element.classList.contains('btnDownload');
      const favoriteActive = isFavorite && element.dataset.isfavorite === 'true';
      const icon = isFavorite ? 'heart' : isDownload ? 'download' : 'play';
      const label = isFavorite ? (favoriteActive ? 'Remove from favorites' : 'Add to favorites') : isDownload ? 'Download' : element.dataset.action === 'resume' ? 'Resume' : 'Play';

      element.classList.toggle('dinkflix-details-suppressed-action', hasEpisodeResume && element.dataset.action === 'play');
      decorateNativeButton(element, {
        content: element.querySelector('.detailButton-content') || element,
        icon,
        label,
        variant: icon === 'play' ? 'primary' : 'control',
      });
      element.setAttribute('aria-pressed', isFavorite ? String(favoriteActive) : 'false');
      decorated.add(element);
    });
  }

  const observer = new MutationObserver(reconcile);
  observer.observe(container, {
    attributes: true,
    subtree: true,
    attributeFilter: ['data-isfavorite'],
  });

  return {
    destroy() {
      observer.disconnect();
      decorated.forEach((element) => {
        element.classList.remove('dinkflix-details-suppressed-action');
        element.removeAttribute('aria-pressed');
        restoreNativeButton(element);
      });
      decorated.clear();
    },
    reconcile,
  };
}
