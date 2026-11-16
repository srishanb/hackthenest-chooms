/**
 * Finish screen: shown when the climb is finished, with Play again (button or Enter).
 *
 * Why: the game freezes in phase 'finished' and the page used to need a reload. Play again
 * emits `run_restart` on the bus; the game owns the reset (player back to the start, ember
 * anchor, wax and the save cleared, phase back to 'playing'). Settings, calibration and the
 * seen tutorial are kept. Turning this component off breaks nothing: the climb simply stays
 * finished until a reload, as before.
 */
import { menuButton } from '../../menu-dom';
import { t } from '../../strings';
import { HUD_WORLD_PIXELS_PER_METRE } from '../../../config/ui.config';
import type { UiComponent } from '../../types';
import { finishScreenVisible, restartsOnKey } from './finish-screen-state';
import { menuSelection } from '../start-menu/start-menu-state';
import '../../theme/menus.css';
import './finish-screen.css';

export const finishScreen: UiComponent = {
  id: 'finish-screen',
  visibleIn: ['finished'],
  mount(root, { stores, bus, drawRunCandle }) {
    const panel = document.createElement('section');
    panel.className = 'menu-panel finish-screen';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', t('finish.label'));
    const title = document.createElement('h1'); title.textContent = t('finish.title');
    const body = document.createElement('p'); body.textContent = t('finish.body');
    // Endless runs: what was reached, never a rating of the player.
    const result = document.createElement('dl'); result.className = 'finish-screen__result'; result.hidden = true;
    const row = (labelKey: 'finish.endless.height' | 'finish.endless.best' | 'finish.endless.wax' | 'finish.endless.seed'): HTMLElement => {
      const term = document.createElement('dt'); term.textContent = t(labelKey);
      const value = document.createElement('dd'); result.append(term, value); return value;
    };
    const heightValue = row('finish.endless.height'); const bestValue = row('finish.endless.best');
    const waxValue = row('finish.endless.wax'); const seedValue = row('finish.endless.seed');
    const newBest = document.createElement('p'); newBest.className = 'finish-screen__new-best';
    newBest.textContent = t('finish.endless.newBest'); newBest.hidden = true;
    const metres = (px: number): string => `${(px / HUD_WORLD_PIXELS_PER_METRE).toFixed(1)} ${t('hud.metres')}`;
    const playAgain = menuButton(t('finish.playAgain'), () => bus.emit({ type: 'run_restart' }));
    playAgain.className = 'finish-screen__play';
    const hint = document.createElement('p'); hint.className = 'finish-screen__hint'; hint.textContent = t('finish.keyHint');
    // The candle that made the climb, its flame out. Decorative: the numbers below say what happened.
    const candle = document.createElement('canvas'); candle.className = 'finish-screen__candle';
    candle.setAttribute('aria-hidden', 'true'); candle.hidden = true;
    let stopCandle = (): void => {}; let shownSeed: number | undefined;
    panel.append(candle, title, body, result, newBest, playAgain, hint);
    root.append(panel);

    let wasVisible = false;
    const render = (): void => {
      const snapshot = stores.snapshot.get();
      const visible = finishScreenVisible(snapshot.phase);
      panel.hidden = !visible;
      const run = snapshot.run;
      title.textContent = t(run ? 'finish.endless.title' : 'finish.title');
      panel.setAttribute('aria-label', t(run ? 'finish.endless.label' : 'finish.label'));
      hint.textContent = t(run ? 'finish.endless.keyHint' : 'finish.keyHint');
      body.hidden = run !== undefined; result.hidden = !run; newBest.hidden = !run?.newBest;
      // Start drawing when the screen opens for a run with a known candle; stop when it closes.
      const seed = visible && drawRunCandle ? run?.candleSeed : undefined;
      if (seed !== shownSeed) {
        stopCandle(); stopCandle = () => {};
        candle.hidden = seed === undefined;
        if (seed !== undefined && drawRunCandle) stopCandle = drawRunCandle(candle, seed);
        shownSeed = seed;
      }
      if (run) {
        heightValue.textContent = metres(run.heightPx); bestValue.textContent = metres(run.bestPx);
        waxValue.textContent = String(snapshot.wax?.collected ?? 0); seedValue.textContent = `#${run.seed}`;
      }
      if (visible && !wasVisible) queueMicrotask(() => { if (!panel.hidden) playAgain.focus(); });
      if (!visible && wasVisible && document.activeElement === playAgain) playAgain.blur();
      wasVisible = visible;
    };
    const onKey = (event: KeyboardEvent): void => {
      if (!panel.hidden && ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.code)) {
        event.preventDefault();
        const available = [playAgain].filter((button) => !button.hidden && !button.disabled);
        available[menuSelection(available.indexOf(document.activeElement as HTMLButtonElement), available.length, event.code)]?.focus();
        return;
      }
      const focus = document.activeElement;
      const focusOnControl = focus instanceof HTMLElement && focus !== document.body &&
        focus.closest('button, input, select, textarea, [contenteditable="true"]') !== null;
      if (!restartsOnKey({ code: event.code, repeat: event.repeat, phase: stores.snapshot.get().phase, focusOnControl })) return;
      event.preventDefault();
      bus.emit({ type: 'run_restart' });
    };
    window.addEventListener('keydown', onKey);
    const offSnapshot = stores.snapshot.subscribe(render);
    render();
    return () => { stopCandle(); window.removeEventListener('keydown', onKey); offSnapshot(); panel.remove(); };
  },
};
