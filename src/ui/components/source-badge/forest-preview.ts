/** Opt-in development diagnostic. Emits only a visual target; never writes a signal/gameplay store. */
import { FOREST_PREVIEW_EVENT, forestPreviewValue } from '../../../config/forest.config';
import { t } from '../../strings';

export function mountForestPreview(root: HTMLElement): () => void {
  if (!import.meta.env.DEV || !(new URLSearchParams(window.location.search).has('forestDemo') ||
    new URLSearchParams(window.location.search).has('forestPreview'))) return () => {};
  const panel = document.createElement('section'); panel.className = 'forest-preview';
  const label = document.createElement('label'); label.textContent = t('forest.preview.title');
  const slider = document.createElement('input'); slider.type = 'range'; slider.min = '0'; slider.max = '1'; slider.step = '0.01';
  slider.setAttribute('aria-label', t('forest.preview.title'));
  slider.value = String(forestPreviewValue(window.location.search, true) ?? 0.2);
  const status = document.createElement('output');
  const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = t('forest.preview.restore');
  function publish(value: number | null): void {
    status.textContent = value === null ? t('forest.preview.normal') : `${t('forest.preview.target')} ${value.toFixed(2)}`;
    window.dispatchEvent(new CustomEvent(FOREST_PREVIEW_EVENT, { detail: value }));
  }
  slider.addEventListener('input', () => publish(slider.valueAsNumber));
  reset.addEventListener('click', () => publish(null));
  label.append(slider); panel.append(label, status, reset); root.append(panel);
  // The scene parses the same initial query, avoiding a race with scene construction.
  const initial = forestPreviewValue(window.location.search, true);
  status.textContent = initial === null ? t('forest.preview.normal') : `${t('forest.preview.target')} ${initial.toFixed(2)}`;
  return () => panel.remove();
}
