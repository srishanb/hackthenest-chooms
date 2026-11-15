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
import type { UiComponent } from '../../types';
import { finishScreenVisible, restartsOnKey } from './finish-screen-state';
import { menuSelection } from '../start-menu/start-menu-state';
import '../../theme/menus.css';
import './finish-screen.css';

export const finishScreen: UiComponent = {
  id: 'finish-screen',
  visibleIn: ['finished'],
  mount(root, { stores, bus }) {
    const panel = document.createElement('section');
    panel.className = 'menu-panel finish-screen';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', t('finish.label'));
    const title = document.createElement('h1'); title.textContent = t('finish.title');
    const body = document.createElement('p'); body.textContent = t('finish.body');
    const playAgain = menuButton(t('finish.playAgain'), () => bus.emit({ type: 'run_restart' }));
    playAgain.className = 'finish-screen__play';
    const hint = document.createElement('p'); hint.className = 'finish-screen__hint'; hint.textContent = t('finish.keyHint');
    panel.append(title, body, playAgain, hint);
    root.append(panel);

    let wasVisible = false;
    const render = (): void => {
      const visible = finishScreenVisible(stores.snapshot.get().phase);
      panel.hidden = !visible;
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
    return () => { window.removeEventListener('keydown', onKey); offSnapshot(); panel.remove(); };
  },
};
