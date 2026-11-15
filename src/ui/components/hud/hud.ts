/** Read-only ember and signal HUD. Removing it never changes game or signal state. */
import { SIGNAL_CONFIG } from '../../../config/signal.config';
import { t, STRINGS, type StringKey } from '../../strings';
import type { UiComponent } from '../../types';
import { hudState } from './hud-state';
import './hud.css';
import { HUD_WORLD_PIXELS_PER_METRE } from '../../../config/ui.config';
import { icon } from '../../icons';
import { navigationView } from './navigation';
import { WAX_CONFIG } from '../../../config/wax.config';
import { waxBenefit01 } from '../../../config/lantern-light.config';

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
    const lesson = document.createElement('div'); lesson.className = 'hud__lesson';
    const stage = document.createElement('div'); stage.className = 'hud__status'; stage.setAttribute('aria-live', 'polite');
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
    panel.append(stage, status, quality, lesson, ember, progress, wax, reward, composure, prompt);
    // The lantern strength bar was replaced by the game's candle portrait (bottom left, in the canvas).
    const metrics = document.createElement('div'); metrics.className = 'hud__metrics';
    const metric = (key: 'hud.height' | 'wax.label' | 'hud.best', symbol: 'height' | 'wax' | 'trophy') => {
      const row = document.createElement('div'); const label = document.createElement('span'); label.textContent = t(key);
      const value = document.createElement('strong'); row.append(icon(symbol), label, value); metrics.append(row); return value;
    };
    const height = metric('hud.height', 'height'); const waxMetric = metric('wax.label', 'wax'); const best = metric('hud.best', 'trophy');
    const pause = document.createElement('button'); pause.type = 'button'; pause.className = 'hud__pause';
    pause.setAttribute('aria-label', t('hud.pause')); pause.append(icon('pause'));
    const onPause = (): void => { if (['playing', 'ember'].includes(stores.snapshot.get().phase)) bus.emit({ type: 'pause' }); };
    pause.addEventListener('click', onPause);
    const checkpoint = document.createElement('div'); checkpoint.className = 'hud__checkpoint';
    const target = document.createElement('div'); const targetTitle = document.createElement('span'); targetTitle.textContent = t('hud.checkpoint');
    const distance = document.createElement('strong'); target.append(targetTitle, distance);
    const compass = document.createElement('div'); compass.className = 'hud__compass'; compass.setAttribute('aria-hidden', 'true');
    const needle = document.createElement('span'); needle.className = 'hud__needle';
    compass.append(needle);
    for (const direction of ['N', 'E', 'S', 'W']) { const letter = document.createElement('i'); letter.textContent = direction; letter.dataset.direction = direction; compass.append(letter); }
    checkpoint.append(target, compass);
    let bestPx = 0;
    try { const saved = Number(localStorage.getItem('lighten.height-best-px.v1')); if (Number.isFinite(saved) && saved > 0) bestPx = saved; } catch { /* Private mode: session best still works. */ }
    panel.className = 'hud__context';
    const layout = document.createElement('div'); layout.className = 'hud'; layout.append(metrics, pause, checkpoint, panel); root.append(layout);
    let savedBestPx = bestPx;
    const saveBest = (): void => {
      if (bestPx <= savedBestPx) return;
      try { localStorage.setItem('lighten.height-best-px.v1', String(bestPx)); savedBestPx = bestPx; } catch { /* Session-only best. */ }
    };
    const onPageHide = (): void => saveBest();
    window.addEventListener('pagehide', onPageHide);
    let signalState = signal.reader.getState();
    const text = (element: HTMLElement, value: string): void => {
      if (element.textContent !== value) element.textContent = value;
    };
    const render = (): void => {
      const snapshot = stores.snapshot.get();
      const navigation = snapshot.navigation;
      const nav = navigationView(navigation, HUD_WORLD_PIXELS_PER_METRE);
      const heightPx = (nav?.heightMetres ?? 0) * HUD_WORLD_PIXELS_PER_METRE;
      bestPx = Math.max(bestPx, heightPx);
      if (snapshot.phase !== 'playing') saveBest();
      text(height, nav ? `${nav.heightMetres.toFixed(1)} ${t('hud.metres')}` : '—');
      text(best, `${(bestPx / HUD_WORLD_PIXELS_PER_METRE).toFixed(1)} ${t('hud.metres')}`);
      text(waxMetric, snapshot.wax?.total ? `${snapshot.wax.collected}/${snapshot.wax.total}` : String(snapshot.wax?.collected ?? 0));
      text(targetTitle, nav?.checkpoint ? t('hud.checkpoint') : t('hud.noCheckpoint'));
      text(distance, nav?.checkpoint ? `${nav.checkpoint.distanceMetres.toFixed(1)} ${t('hud.metres')}` : t('hud.placeCheckpoint'));
      compass.classList.toggle('is-empty', !nav?.checkpoint);
      needle.style.transform = `rotate(${nav?.checkpoint?.angleDegrees ?? 0}deg)`;
      const flags = stores.settings.get().hud;
      metrics.hidden = !flags.showStatus;
      checkpoint.hidden = !flags.showEmber;
      const view = hudState(snapshot, signalState, SIGNAL_CONFIG.staleAfterMs);
      const lessonKey = snapshot.lessonKey;
      const stageKey = `stage.${snapshot.stage?.id}`;
      text(stage, snapshot.stage && Object.hasOwn(STRINGS, stageKey) ?
        `${snapshot.stage.index + 1}/${snapshot.stage.total} · ${t(stageKey as StringKey)}` : '');
      stage.hidden = !flags.showStatus || !snapshot.stage;
      text(lesson, lessonKey && Object.hasOwn(STRINGS, lessonKey) ? t(lessonKey as StringKey) : '');
      lesson.hidden = !flags.showStatus || !lessonKey;
      text(status, t(view.statusKey));
      text(quality, `${t('hud.quality')} ${view.qualityPercent}%`);
      const cooldownSeconds = Math.ceil((snapshot.ember.cooldownRemainingMs ?? 0) / 1000);
      text(ember, cooldownSeconds > 0 ? `${t('ember.cooldownLabel')} ${cooldownSeconds}s` : t(view.emberKey));
      const waxState = snapshot.wax;
      const boostSeconds = Math.ceil((waxState?.boostRemainingMs ?? 0) / 1000);
      text(wax, boostSeconds > 0 ? `${t('wax.boost')} ${boostSeconds}s` : '');
      wax.hidden = !flags.showStatus || boostSeconds <= 0;
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
      const actual = signalState.valid && signalState.mode !== 'fixed' ? signalState.intensity : 0.2;
      text(reward, `${t(waxBenefit01(actual) === 0 ? 'wax.suppressed' : 'wax.pickup')} · ${event.collected}${event.total === null ? '' : `/${event.total}`}`);
      reward.hidden = !stores.settings.get().hud.showStatus;
      rewardTimer = setTimeout(() => { reward.hidden = true; }, WAX_CONFIG.toastMs);
    }));
    cleanups.push(bus.on('land', saveBest));
    cleanups.push(bus.on('run_restart', () => { clearTimeout(rewardTimer); reward.hidden = true; }));
    return () => { clearTimeout(rewardTimer); for (const cleanup of cleanups) cleanup(); saveBest(); window.removeEventListener('pagehide', onPageHide); pause.removeEventListener('click', onPause); layout.remove(); };
  },
};
