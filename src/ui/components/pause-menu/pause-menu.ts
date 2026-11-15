/** Keyboard pause/resume publishes bus events; gameplay remains the game's responsibility. */
import { menuButton, trapMenuFocus } from '../../menu-dom';
import { t } from '../../strings';
import type { UiComponent } from '../../types';
import { createUiActions } from '../../ui-actions';
import '../../theme/menus.css';
export const pauseMenu: UiComponent = {
  id: 'pause-menu', visibleIn: ['paused'],
  mount(root, { stores, bus, actions = createUiActions() }) {
    const panel = document.createElement('section');
    panel.className = 'menu-panel'; panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', t('menu.paused'));
    const title = document.createElement('h2'); title.textContent = t('menu.paused');
    let previous: HTMLElement | null = null;
    const resume = menuButton(t('menu.resume'), () => bus.emit({ type: 'resume' }));
    const settings = menuButton(t('menu.settings'), () => actions.settingsOpen.set(true));
    settings.hidden = !actions.settingsAvailable;
    panel.append(title, resume, settings); root.append(panel);
    let lastPhase = stores.snapshot.get().phase;
    const render = (): void => {
      const phase = stores.snapshot.get().phase;
      panel.hidden = phase !== 'paused' || actions.settingsOpen.get();
      if (phase === 'paused' && lastPhase !== 'paused') {
        previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        queueMicrotask(() => { if (panel.isConnected && !panel.hidden) resume.focus(); });
      }
      if (phase !== 'paused' && lastPhase === 'paused') {
        actions.settingsOpen.set(false);
        if (previous?.isConnected) previous.focus();
      }
      lastPhase = phase;
    };
    const onKey = (event: KeyboardEvent): void => {
      if (actions.settingsOpen.get()) return;
      if (stores.snapshot.get().phase === 'paused') trapMenuFocus(panel, event);
      if (event.repeat || event.code !== stores.settings.get().keys.pause || event.key === 'Tab') return;
      const phase = stores.snapshot.get().phase;
      if (phase !== 'paused' && phase !== 'playing' && phase !== 'ember') return;
      event.preventDefault();
      bus.emit({ type: phase === 'paused' ? 'resume' : 'pause' });
    };
    window.addEventListener('keydown', onKey);
    const offSnapshot = stores.snapshot.subscribe(render);
    const offActions = actions.settingsOpen.subscribe((open) => {
      render(); if (!open && stores.snapshot.get().phase === 'paused') queueMicrotask(() => settings.focus());
    });
    render();
    return () => { window.removeEventListener('keydown', onKey); offSnapshot(); offActions(); panel.remove(); };
  },
};
