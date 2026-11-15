/**
 * Start menu: the title, Play and Settings, shown before the climb begins.
 *
 * Why: the game boots in phase 'menu' (main.ts) and does not step until Play emits `start`
 * on the bus; the game owns the phase change. Settings opens the existing settings panel
 * through the shared UI actions, and the menu comes back when that panel closes.
 * Turning this component off in ui.config.ts makes main.ts boot straight into 'playing'.
 */
import { menuButton } from '../../menu-dom';
import { t } from '../../strings';
import type { UiComponent } from '../../types';
import { createUiActions } from '../../ui-actions';
import { startMenuVisible, startsOnKey } from './start-menu-state';
import '../../theme/menus.css';
import './start-menu.css';

export const startMenu: UiComponent = {
  id: 'start-menu',
  visibleIn: ['menu'],
  mount(root, { stores, bus, actions = createUiActions() }) {
    const panel = document.createElement('section');
    panel.className = 'menu-panel start-menu';
    panel.setAttribute('aria-label', t('start.label'));
    const title = document.createElement('h1'); title.textContent = t('start.title');
    const subtitle = document.createElement('p'); subtitle.textContent = t('start.subtitle');
    const play = menuButton(t('start.play'), () => bus.emit({ type: 'start' }));
    play.className = 'start-menu__play';
    const settings = menuButton(t('menu.settings'), () => actions.settingsOpen.set(true));
    settings.hidden = !actions.settingsAvailable;
    const buttons = document.createElement('div'); buttons.className = 'start-menu__actions';
    buttons.append(play, settings);
    panel.append(title, subtitle, buttons);
    root.append(panel);

    let wasVisible = false;
    let backFromSettings = false;
    const render = (): void => {
      const visible = startMenuVisible(stores.snapshot.get().phase, actions.settingsOpen.get());
      panel.hidden = !visible;
      // Focus Play on first show, and Settings again when the settings panel closes.
      if (visible && !wasVisible) {
        const target = backFromSettings ? settings : play;
        backFromSettings = false;
        queueMicrotask(() => { if (!panel.hidden) target.focus(); });
      }
      wasVisible = visible;
    };
    const onKey = (event: KeyboardEvent): void => {
      const focus = document.activeElement;
      const focusOnControl = focus instanceof HTMLElement && focus !== document.body &&
        focus.closest('button, input, select, textarea, [contenteditable="true"]') !== null;
      if (!startsOnKey({ code: event.code, repeat: event.repeat, phase: stores.snapshot.get().phase,
        settingsOpen: actions.settingsOpen.get(), focusOnControl })) return;
      event.preventDefault();
      bus.emit({ type: 'start' });
    };
    window.addEventListener('keydown', onKey);
    const offSnapshot = stores.snapshot.subscribe(render);
    const offSettings = actions.settingsOpen.subscribe((open) => { if (open) backFromSettings = true; render(); });
    render();
    return () => { window.removeEventListener('keydown', onKey); offSnapshot(); offSettings(); panel.remove(); };
  },
};
