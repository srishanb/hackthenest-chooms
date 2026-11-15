/**
 * Debug overlay: the numbers behind the signal, toggled with the backtick key.
 * Owner: signal lane (Srishan), even though it lives in the UI folder.
 *
 * Why: there is no on-screen meter by design, so this is how we (and a judge) see cause
 * and effect: the value, its quality, how fresh it is, and what the game does with it.
 * P1.6 adds the real feature values and thresholds.
 */
import type { ComposureState } from '../../../shared/contracts/composure';
import { t } from '../../strings';
import type { UiComponent } from '../../types';
import './debug-overlay.css';

const fixed = (value: number, digits = 2): string => value.toFixed(digits);

export const debugOverlay: UiComponent = {
  id: 'debug-overlay',
  visibleIn: 'always',
  mount(root, { signal, stores }) {
    const panel = document.createElement('section');
    panel.className = 'debug-overlay';
    panel.hidden = true;
    panel.innerHTML = `<div class="debug-overlay__title"></div><div class="debug-overlay__hint"></div><pre class="debug-overlay__rows"></pre>`;
    const [title, hint, rows] = Array.from(panel.children) as [HTMLElement, HTMLElement, HTMLElement];
    title.textContent = t('debug.title');
    hint.textContent = t('debug.hint');
    root.append(panel);

    const render = (state: ComposureState): void => {
      if (panel.hidden) return;
      const diagnostics = signal.getDiagnostics();
      const lines = [
        `source        ${state.source}`,
        `algo          ${state.algo}`,
        `mode          ${state.mode}`,
        `intensity     ${fixed(state.intensity)}`,
        `resting       ${fixed(state.resting)}  active=${state.restingActive}`,
        `quality       ${fixed(state.quality)}  valid=${state.valid}  held=${state.held}`,
        `sample age    ${fixed(state.sampleAgeMs, 0)} ms`,
        `calibrated    ${state.calibrated}`,
        ...Object.entries(diagnostics.features).map(([name, value]) => `feat ${name.padEnd(12)} ${fixed(value, 3)}`),
        ...Object.entries(diagnostics.thresholds).map(([name, value]) => `thr  ${name.padEnd(12)} ${fixed(value, 3)}`),
        `lantern       ${fixed(stores.effects.get().lanternRadius, 0)} px`,
        `ember         ${fixed(stores.snapshot.get().ember.progress01)}`,
      ];
      rows.textContent = lines.join('\n');
    };

    const onKey = (event: KeyboardEvent): void => {
      if (event.code !== stores.settings.get().keys.debugOverlay) return;
      panel.hidden = !panel.hidden;
      render(signal.reader.getState());
    };
    window.addEventListener('keydown', onKey);
    const unsubscribe = signal.reader.subscribe(render);

    return () => {
      window.removeEventListener('keydown', onKey);
      unsubscribe();
    };
  },
};
