/** Final landing victory and explicit new-run action; stage changes never open this panel. */
import { menuButton } from '../../menu-dom';
import { t } from '../../strings';
import type { UiComponent } from '../../types';
import '../../theme/menus.css';
export const emberPrompt: UiComponent = {
  id: 'ember-prompt', visibleIn: ['finished'],
  mount(root, { bus }) {
    const panel = document.createElement('section'); panel.className = 'menu-panel';
    panel.setAttribute('aria-label', t('victory.title'));
    const title = document.createElement('h2'); title.textContent = t('victory.title');
    const body = document.createElement('p'); body.textContent = t('victory.body');
    const restart = menuButton(t('ember.newRun'), () => bus.emit({ type: 'run_restart' }));
    panel.append(title, body, restart); root.append(panel);
    return () => panel.remove();
  },
};
