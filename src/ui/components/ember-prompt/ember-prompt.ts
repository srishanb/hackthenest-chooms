/**
 * ember-prompt: registered, renders nothing. Recovery uses the HUD, never a popup, and the
 * finish screen's Play again now lives in components/finish-screen/.
 */
import type { UiComponent } from '../../types';

export const emberPrompt: UiComponent = {
  id: 'ember-prompt',
  visibleIn: ['ember'],
  mount: () => () => {},
};
