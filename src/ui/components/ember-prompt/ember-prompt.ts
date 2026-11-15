/**
 * ember-prompt. P0 STUB: registered so its slot and config line exist, but it renders nothing.
 * P6.5 builds it in this folder (ember-prompt.ts and ember-prompt.css) without touching the registry.
 */
import type { UiComponent } from '../../types';

export const emberPrompt: UiComponent = {
  id: 'ember-prompt',
  visibleIn: ['ember'],
  mount: () => () => {},
};
