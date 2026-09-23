const ROOT_SELECTOR = '#indexPage';
const SECTION_SELECTOR = 'section, .verticalSection, .sectionContainer';
const BUTTON_CLASS = 'dinkflix-continue-remove';
const BOUND_ATTR = 'data-dinkflix-continue-remove-bound';

function isContinueSection(section) {
  const title = section.querySelector('.sectionTitle, .sectionTitleText, .sectionTitle-cards, h2, h3');
  return title && /continue\s+watching/i.test(title.textContent || '');
}

function sections() {
  return Array.from(document.querySelectorAll(`${ROOT_SELECTOR} ${SECTION_SELECTOR}`)).filter(isContinueSection);
}

async function clearResumePosition(client, itemId) {
  if (typeof client.ajax !== 'function' || typeof client.getUrl !== 'function' || !itemId) return false;

  try {
    await client.ajax({
      type: 'POST',
      url: client.getUrl(`UserItems/${encodeURIComponent(itemId)}/UserData`),
      data: JSON.stringify({
        ItemId: itemId,
        PlaybackPositionTicks: 0,
      }),
      contentType: 'application/json',
      processData: false,
    });
    return true;
  } catch {
    return false;
  }
}

function bindCard(card, client) {
  if (!card || card.hasAttribute(BOUND_ATTR) || !card.dataset.id) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = BUTTON_CLASS;
  button.setAttribute('aria-label', 'Remove from Continue Watching');
  button.title = 'Remove from Continue Watching';
  button.innerHTML = '<span aria-hidden="true">×</span>';
  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    button.disabled = true;
    const ok = await clearResumePosition(client, card.dataset.id);
    if (!ok) {
      button.disabled = false;
      return;
    }
    card.classList.add('dinkflix-continue-removed');
    window.setTimeout(() => card.remove(), 180);
  });

  if (!card.style.position) card.style.position = 'relative';
  card.appendChild(button);
  card.setAttribute(BOUND_ATTR, 'true');
}

function reconcile(client) {
  sections().forEach((section) => {
    section.querySelectorAll('.card[data-id]').forEach((card) => bindCard(card, client));
  });
}

export function createContinueWatchingControls() {
  const client = window.ApiClient;
  if (!client || !document.body) return () => {};

  const observer = new MutationObserver(() => reconcile(client));
  observer.observe(document.body, { childList: true, subtree: true });
  reconcile(client);
  return () => observer.disconnect();
}
