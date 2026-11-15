/** Read-only ember and signal HUD. Removing it never changes game or signal state. */
import { SIGNAL_CONFIG } from '../../../config/signal.config';
import { t } from '../../strings';
import type { UiComponent } from '../../types';
import { hudState } from './hud-state';
import './hud.css';
import { WAX_CONFIG } from '../../../config/wax.config';

export const hud: UiComponent = {
  id: 'hud',
  visibleIn: ['playing', 'ember', 'finished'],
  mount(root, { stores, signal, bus }) {
    const panel = document.createElement('section');
    panel.className = 'hud';
    panel.setAttribute('aria-label', t('hud.title'));
    const status = document.createElement('div');
    status.className = 'hud__status';
    status.setAttribute('role', 'status');
    const quality = document.createElement('div');
    const ember = document.createElement('div');
    const wax = document.createElement('div'); wax.className = 'hud__wax';
    const reward = document.createElement('div'); reward.className = 'hud__wax-reward';
    reward.setAttribute('role', 'status'); reward.setAttribute('aria-live', 'polite'); reward.hidden = true;
    let rewardTimer: ReturnType<typeof setTimeout> | undefined;
    const progress = document.createElement('progress');
    progress.max = 100;
    progress.setAttribute('aria-label', t('hud.recoveryProgress'));
    const composure = document.createElement('div');
    const prompt = document.createElement('div');
    prompt.className = 'hud__prompt';
    prompt.setAttribute('role', 'status');
    panel.append(status, quality, ember, progress, wax, reward, composure, prompt);
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
      const waxState = snapshot.wax;
      const boostSeconds = Math.ceil((waxState?.boostRemainingMs ?? 0) / 1000);
      text(wax, waxState ? `${t('wax.label')} ${waxState.collected}/${waxState.total}` +
        (waxState.total > 0 && waxState.collected === waxState.total ? ` · ${t('wax.complete')}` : '') +
        (boostSeconds > 0 ? ` · ${t('wax.boost')} ${boostSeconds}s` : '') : '');
      wax.hidden = !flags.showStatus || !waxState?.total;
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
    cleanups.push(bus.on('wax_collected', (event) => {
      clearTimeout(rewardTimer);
      text(reward, `${t('wax.pickup')} · ${event.collected}/${event.total}`);
      reward.hidden = !stores.settings.get().hud.showStatus;
      rewardTimer = setTimeout(() => { reward.hidden = true; }, WAX_CONFIG.toastMs);
    }));
    cleanups.push(bus.on('run_restart', () => { clearTimeout(rewardTimer); reward.hidden = true; }));
    return () => { clearTimeout(rewardTimer); for (const cleanup of cleanups) cleanup(); panel.remove(); };
  },
};
