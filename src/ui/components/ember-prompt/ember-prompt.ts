/** Only show a new-run action at the finish; recovery uses the HUD, never a popup. */
import { menuButton } from '../../menu-dom';
import { t } from '../../strings';
import type { UiComponent } from '../../types';
import '../../theme/menus.css';
export const emberPrompt: UiComponent = {
  id: 'ember-prompt', visibleIn: ['finished'],
  mount(root, { bus }) {
    const restart = menuButton(t('ember.newRun'), () => bus.emit({ type: 'run_restart' }));
    restart.className = 'menu-panel'; root.append(restart);
    return () => restart.remove();
  },
};
