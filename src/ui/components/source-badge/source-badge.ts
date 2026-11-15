/**
 * Source badge: always says where the signal comes from (live board, simulator, replay).
 *
 * Why always visible: a judge must never have to wonder whether the signal is real.
 * It stays on screen even when the debug overlay is hidden (feature DIA-1).
 */
import type { InputSourceKind } from '../../../shared/contracts/composure';
import { t, type StringKey } from '../../strings';
import type { UiComponent } from '../../types';
import './source-badge.css';
import { mountUiSizeTuner } from './ui-size-tuner';

const LABEL: Record<InputSourceKind, StringKey> = {
  LIVE_EEG: 'source.LIVE_EEG',
  SIMULATED: 'source.SIMULATED',
  REPLAY: 'source.REPLAY',
};

export const sourceBadge: UiComponent = {
  id: 'source-badge',
  visibleIn: 'always',
  mount(root, { signal, bus }) {
    let assisted = false;
    const badge = document.createElement('div');
    badge.className = 'source-badge';
    badge.setAttribute('role', 'status');
    root.append(badge);
    const removeSizeTuner = mountUiSizeTuner(root);

    const render = (source: InputSourceKind): void => {
      badge.dataset.source = source;
      badge.textContent = t(LABEL[source]) + (assisted ? ` · ${t('source.assisted')}` : '');
    };
    render(signal.reader.getState().source);
    const unsubscribe = signal.reader.subscribe((state) => {
      if (badge.dataset.source !== state.source) render(state.source);
    });
    const offReturn = bus.on('ember_returned', (event) => {
      if (event.via === 'assist') { assisted = true; render(signal.reader.getState().source); }
    });
    const offRestart = bus.on('run_restart', () => { assisted = false; render(signal.reader.getState().source); });
    return () => {
      unsubscribe();
      offReturn(); offRestart();
      badge.remove();
      removeSizeTuner();
    };
  },
};
