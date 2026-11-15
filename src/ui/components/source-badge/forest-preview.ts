/** Public, opt-in scenery preview. Never writes a signal/gameplay store. */
import { FOREST_PREVIEW_EVENT, forestPreviewValue } from '../../../config/forest.config';
import { t } from '../../strings';

export function mountForestPreview(root: HTMLElement): () => void {
  const panel = document.createElement('section'); panel.className = 'forest-preview';
  const toggleLabel = document.createElement('label');
  const toggle = document.createElement('input'); toggle.type = 'checkbox';
  toggleLabel.append(toggle, t('forest.preview.toggle'));
  const controls = document.createElement('div');
  const label = document.createElement('label'); label.textContent = t('forest.preview.title');
  const slider = document.createElement('input'); slider.type = 'range'; slider.min = '0'; slider.max = '1'; slider.step = '0.01';
  slider.setAttribute('aria-label', t('forest.preview.title'));
  const initial = forestPreviewValue(window.location.search, import.meta.env.DEV);
  slider.value = String(initial ?? 0.2);
  toggle.checked = initial !== null;
  controls.hidden = !toggle.checked;
  const status = document.createElement('output');
  const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = t('forest.preview.restore');
  function publish(value: number | null): void {
    status.textContent = value === null ? t('forest.preview.normal') : `${t('forest.preview.target')} ${value.toFixed(2)}`;
    window.dispatchEvent(new CustomEvent(FOREST_PREVIEW_EVENT, { detail: value }));
  }
  toggle.addEventListener('change', () => {
    controls.hidden = !toggle.checked;
    publish(toggle.checked ? slider.valueAsNumber : null);
  });
  slider.addEventListener('input', () => { if (toggle.checked) publish(slider.valueAsNumber); });
  reset.addEventListener('click', () => { toggle.checked = false; controls.hidden = true; publish(null); });
  label.append(slider); controls.append(label, reset); panel.append(toggleLabel, status, controls); root.append(panel);
  // The scene parses the same initial query, avoiding a race with scene construction.
  status.textContent = initial === null ? t('forest.preview.normal') : `${t('forest.preview.target')} ${initial.toFixed(2)}`;
  return () => panel.remove();
}
