/** Read-only ember and signal HUD. Removing it never changes game or signal state. */
import { SIGNAL_CONFIG } from '../../../config/signal.config';
import { t } from '../../strings';
import type { UiComponent } from '../../types';
import { hudState } from './hud-state';
import './hud.css';

export const hud: UiComponent = {
  id: 'hud',
  visibleIn: ['playing', 'ember'],
  mount(root, { stores, signal }) {
    const panel = document.createElement('section');
    panel.className = 'hud';
    panel.setAttribute('aria-label', t('hud.title'));
    const status = document.createElement('div');
    status.className = 'hud__status';
    status.setAttribute('role', 'status');
    const quality = document.createElement('div');
    const ember = document.createElement('div');
    const progress = document.createElement('progress');
    progress.max = 100;
    progress.setAttribute('aria-label', t('hud.recoveryProgress'));
    const composure = document.createElement('div');
    const prompt = document.createElement('div');
    prompt.className = 'hud__prompt';
    prompt.setAttribute('role', 'status');
    panel.append(status, quality, ember, progress, composure, prompt);
    root.append(panel);
    let signalState = signal.reader.getState();
    const text = (element: HTMLElement, value: string): void => {
      if (element.textContent !== value) element.textContent = value;
    };
    const render = (): void => {
      const snapshot = stores.snapshot.get();
      const flags = stores.settings.get().hud;
      const view = hudState(snapshot, signalState, SIGNAL_CONFIG.staleAfterMs);
      text(status, t(view.statusKey));
      text(quality, `${t('hud.quality')} ${view.qualityPercent}%`);
      const cooldownSeconds = Math.ceil((snapshot.ember.cooldownRemainingMs ?? 0) / 1000);
      text(ember, cooldownSeconds > 0 ? `${t('ember.cooldownLabel')} ${cooldownSeconds}s` : t(view.emberKey));
      text(composure, `${t('hud.composure')} ${view.intensityKey === null ? t('hud.unavailable') : t(view.intensityKey)}`);
      text(prompt, view.prompt ?? '');
      progress.value = view.progressPercent;
      status.hidden = quality.hidden = !flags.showStatus;
      ember.hidden = !flags.showEmber;
      progress.hidden = !flags.showEmber || !snapshot.ember.active;
      composure.hidden = !flags.showSignal;
      prompt.hidden = !view.prompt;
      panel.hidden = !flags.showStatus && !flags.showEmber && !flags.showSignal && !view.prompt;
    };
    render();
    const cleanups = [stores.snapshot.subscribe(render), stores.settings.subscribe(render),
      signal.reader.subscribe((next) => { signalState = next; render(); })];
    return () => { for (const cleanup of cleanups) cleanup(); panel.remove(); };
  },
};
