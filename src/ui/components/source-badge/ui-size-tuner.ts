/** Local preview sliders let Amrit choose UI sizes before committing new defaults. */
import { getLocalStorage } from '../../../shared/safe-storage';
import { UI_SIZE_PREVIEW } from '../../../config/ui.config';
import { t } from '../../strings';

export const UI_SIZE_STORAGE_KEY = 'lighten.ui-size-preview.v1';
export interface UiPreviewSizes { tutorial: number; stats: number }
export function parseUiPreviewSizes(raw: string | null): UiPreviewSizes {
  const fallback = UI_SIZE_PREVIEW.defaultPercent;
  const percent = (value: unknown): number => typeof value === 'number' && Number.isFinite(value)
    ? Math.min(UI_SIZE_PREVIEW.maxPercent, Math.max(UI_SIZE_PREVIEW.minPercent, value)) : fallback;
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (typeof value !== 'object' || value === null) return { tutorial: fallback, stats: fallback };
    const saved = value as Record<string, unknown>;
    return { tutorial: percent(saved.tutorial), stats: percent(saved.stats) };
  } catch { return { tutorial: fallback, stats: fallback }; }
}

export function mountUiSizeTuner(root: HTMLElement): () => void {
  const ui = root.closest<HTMLElement>('#ui') ?? root;
  const storage = getLocalStorage(window);
  let raw: string | null = null;
  try { raw = storage?.getItem(UI_SIZE_STORAGE_KEY) ?? null; } catch { /* Blocked storage: live preview still works. */ }
  let sizes = parseUiPreviewSizes(raw);
  const details = document.createElement('details'); details.className = 'ui-size-tuner';
  const summary = document.createElement('summary'); summary.textContent = t('uiSize.title');
  const panel = document.createElement('div'); panel.className = 'ui-size-tuner__panel';
  const hint = document.createElement('small'); hint.textContent = t('uiSize.hint');
  const renders: Array<() => void> = [];
  const apply = (): void => {
    ui.style.setProperty('--ui-tutorial-scale', String(sizes.tutorial / 100));
    ui.style.setProperty('--ui-stats-scale', String(sizes.stats / 100));
    for (const render of renders) render();
    try { storage?.setItem(UI_SIZE_STORAGE_KEY, JSON.stringify(sizes)); } catch { /* Session-only preview. */ }
  };
  for (const key of ['tutorial', 'stats'] as const) {
    const label = document.createElement('label');
    const title = document.createElement('span'); title.textContent = t(key === 'tutorial' ? 'uiSize.tutorial' : 'uiSize.stats');
    const input = document.createElement('input'); input.type = 'range';
    input.min = String(UI_SIZE_PREVIEW.minPercent); input.max = String(UI_SIZE_PREVIEW.maxPercent); input.step = String(UI_SIZE_PREVIEW.stepPercent);
    input.setAttribute('aria-label', title.textContent);
    const output = document.createElement('output');
    renders.push(() => { input.value = String(sizes[key]); output.value = `${sizes[key]}%`; });
    input.addEventListener('input', () => { sizes[key] = input.valueAsNumber; apply(); });
    label.append(title, output, input); panel.append(label);
  }
  const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = t('uiSize.reset');
  reset.addEventListener('click', () => { sizes = parseUiPreviewSizes(null); apply(); });
  panel.append(hint, reset); details.append(summary, panel); root.append(details); apply();
  // Arrow keys adjust the sliders without also steering the player; Escape/P still pause.
  const stopArrows = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.code)) event.stopPropagation();
  };
  details.addEventListener('keydown', stopArrows); details.addEventListener('keyup', stopArrows);
  return () => {
    details.remove(); ui.style.removeProperty('--ui-tutorial-scale'); ui.style.removeProperty('--ui-stats-scale');
  };
}
