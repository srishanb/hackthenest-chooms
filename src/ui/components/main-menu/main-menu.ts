/** First-launch control guide, with a persistent Controls button for replaying it later. */
import { getLocalStorage } from '../../../shared/safe-storage';
import { menuButton } from '../../menu-dom';
import { t } from '../../strings';
import type { UiComponent } from '../../types';
import { hasSeenTutorial, rememberTutorial } from './tutorial-storage';
import '../../theme/menus.css';
import './main-menu.css';

const STEPS = [
  { title: 'tutorial.move.title', body: 'tutorial.move.body', keys: 'tutorial.move.keys', tip: 'tutorial.move.tip' },
  { title: 'tutorial.jump.title', body: 'tutorial.jump.body', keys: 'tutorial.jump.keys', tip: 'tutorial.jump.tip' },
  { title: 'tutorial.climb.title', body: 'tutorial.climb.body', keys: 'tutorial.climb.keys', tip: 'tutorial.climb.tip' },
] as const;

export const mainMenu: UiComponent = {
  id: 'main-menu',
  visibleIn: 'always',
  mount(root, { stores, bus }) {
    const storage = getLocalStorage(window);
    const dialog = document.createElement('dialog');
    dialog.className = 'menu-panel tutorial-panel';
    dialog.setAttribute('aria-label', t('tutorial.label'));
    const progress = document.createElement('p'); progress.className = 'tutorial-progress';
    const title = document.createElement('h2');
    const keys = document.createElement('p'); keys.className = 'tutorial-keys';
    const body = document.createElement('p');
    const tip = document.createElement('p'); tip.className = 'tutorial-tip';
    const actions = document.createElement('div'); actions.className = 'tutorial-actions';
    let step = 0;
    let pauseQueued = false;
    let resumeAfterTutorial = false;
    let previousFocus: HTMLElement | null = null;

    const pauseWhenReady = (): void => {
      if (!dialog.open || pauseQueued || stores.snapshot.get().sectionId === null) return;
      pauseQueued = true;
      // sectionId is first published during scene creation. Wait until that synchronous
      // creation finishes so the game's pause listener is installed before publishing.
      queueMicrotask(() => {
        if (dialog.open && stores.snapshot.get().phase === 'playing') {
          resumeAfterTutorial = true;
          bus.emit({ type: 'pause' });
        }
      });
    };
    const close = (): void => {
      rememberTutorial(storage);
      dialog.close();
      if (resumeAfterTutorial && stores.snapshot.get().phase === 'paused') bus.emit({ type: 'resume' });
      resumeAfterTutorial = false; pauseQueued = false;
      previousFocus?.blur();
    };
    const back = menuButton(t('tutorial.back'), () => { step--; render(); });
    const skip = menuButton(t('tutorial.skip'), close);
    const next = menuButton(t('tutorial.next'), () => {
      if (step === STEPS.length - 1) close();
      else { step++; render(); }
    });
    next.className = 'tutorial-primary';
    function render(): void {
      const current = STEPS[step]!;
      progress.textContent = `${t('tutorial.label')} · ${step + 1} / ${STEPS.length}`;
      title.textContent = t(current.title); body.textContent = t(current.body);
      keys.textContent = t(current.keys); tip.textContent = t(current.tip);
      back.hidden = step === 0;
      next.textContent = t(step === STEPS.length - 1 ? 'tutorial.play' : 'tutorial.next');
      next.focus();
    }
    function open(): void {
      if (dialog.open) return;
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      step = 0; render(); dialog.showModal(); next.focus(); pauseWhenReady();
    }
    const replay = menuButton(t('tutorial.controls'), open);
    replay.className = 'tutorial-replay';
    actions.append(skip, back, next);
    dialog.append(progress, title, keys, body, tip, actions);
    root.append(replay, dialog);
    // Keep tutorial navigation out of gameplay and pause-menu keyboard handlers.
    dialog.addEventListener('keydown', (event) => event.stopPropagation());
    dialog.addEventListener('keyup', (event) => event.stopPropagation());
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
    const offSnapshot = stores.snapshot.subscribe(pauseWhenReady);
    if (!hasSeenTutorial(storage)) open();
    return () => {
      offSnapshot();
      if (dialog.open) close();
      replay.remove(); dialog.remove();
    };
  },
};
