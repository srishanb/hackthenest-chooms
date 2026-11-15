/** Recovery is optional: show valid-time progress, an explicitly labelled rescue, and cancellation. */
import { menuButton } from '../../menu-dom';
import { t } from '../../strings';
import type { UiComponent } from '../../types';
import '../../theme/menus.css';

export const emberPrompt: UiComponent = {
  id: 'ember-prompt',
  visibleIn: ['ember', 'finished'],
  mount(root, { stores, bus }) {
    const panel = document.createElement('section'); panel.className = 'menu-panel';
    panel.setAttribute('aria-label', t('ember.title'));
    const title = document.createElement('h2'); title.textContent = t('ember.title');
    const help = document.createElement('p'); help.textContent = t('ember.signalHelp');
    const progress = document.createElement('progress'); progress.max = 1;
    progress.setAttribute('aria-label', t('hud.recoveryProgress'));
    const note = document.createElement('p'); note.textContent = t('ember.reusable');
    const assist = menuButton(t('ember.assist'), () => bus.emit({ type: 'ember_assist_requested' }));
    const cancel = menuButton(t('ember.cancel'), () => bus.emit({ type: 'ember_cancel_request' }));
    const restart = menuButton(t('ember.newRun'), () => bus.emit({ type: 'run_restart' }));
    panel.append(title, help, progress, note, assist, cancel, restart); root.append(panel);
    const render = (): void => {
      const state = stores.snapshot.get(); const active = state.phase === 'ember';
      title.hidden = help.hidden = progress.hidden = note.hidden = assist.hidden = cancel.hidden = !active;
      restart.hidden = state.phase !== 'finished'; progress.value = state.ember.progress01;
    };
    const off = stores.snapshot.subscribe(render); render();
    return () => { off(); panel.remove(); };
  },
};
