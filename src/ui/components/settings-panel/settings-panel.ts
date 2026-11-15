/**
 * settings-panel. P0 STUB: registered so its slot and config line exist, but it renders nothing.
 * P2.2 builds it in this folder (settings-panel.ts and settings-panel.css) without touching the registry.
 */
import type { UiComponent } from '../../types';

export const settingsPanel: UiComponent = {
  id: 'settings-panel',
  visibleIn: ['paused'],
  mount: () => () => {},
};
