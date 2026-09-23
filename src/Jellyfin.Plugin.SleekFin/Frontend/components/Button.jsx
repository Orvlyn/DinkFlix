import { Icon, setIcon } from './Icon.jsx';
import { h } from 'preact';

const decorations = new WeakMap();

function classes(...values) {
  return values.filter(Boolean).join(' ');
}

export function Button({ variant, icon, label, class: classValue, ...props }) {
  return (
    <button type="button" class={classes('dinkflix-button', `dinkflix-button-${variant}`, variant === 'control' && 'dinkflix-control-3d', classValue)} {...props}>
      <Icon name={icon} />
      <span class="dinkflix-button-label">{label}</span>
    </button>
  );
}

export function IconButton({ icon, label, raised, strokeWidth, class: classValue, ...props }) {
  return (
    <button type="button" class={classes('dinkflix-icon-button', raised && 'dinkflix-control-3d', classValue)} title={label} {...props}>
      <Icon name={icon} strokeWidth={strokeWidth} />
    </button>
  );
}

function setNativeContent(parent, iconName, label) {
  setIcon(parent, iconName);
  let labelElement = parent.querySelector(':scope > .dinkflix-button-label');
  if (!labelElement) {
    labelElement = document.createElement('span');
    labelElement.className = 'dinkflix-button-label';
    labelElement.textContent = label;
    parent.appendChild(labelElement);
  } else if (labelElement.textContent !== label) {
    labelElement.textContent = label;
  }
}

export function restoreNativeButton(element) {
  const content = decorations.get(element);
  if (!content) return;

  element.classList.remove('dinkflix-button', 'dinkflix-button-primary', 'dinkflix-button-control', 'dinkflix-control-3d');
  content.classList.remove('dinkflix-button-content');
  content.querySelector(':scope > .dinkflix-icon')?.remove();
  content.querySelector(':scope > .dinkflix-button-label')?.remove();
  decorations.delete(element);
}

export function decorateNativeButton(element, options) {
  const settings = options || {};
  const content = settings.content || element;
  const current = decorations.get(element);
  if (current && current !== content) {
    restoreNativeButton(element);
  }
  if (!decorations.has(element)) {
    decorations.set(element, content);
  }

  element.classList.remove('dinkflix-button-primary', 'dinkflix-button-control');
  element.classList.add('dinkflix-button', `dinkflix-button-${settings.variant}`);
  element.classList.toggle('dinkflix-control-3d', settings.variant === 'control');
  content.classList.add('dinkflix-button-content');
  setNativeContent(content, settings.icon, settings.label);
}
