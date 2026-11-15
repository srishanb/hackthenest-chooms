/**
 * pause-menu. P0 STUB: registered so its slot and config line exist, but it renders nothing.
 * P2.2 builds it in this folder (pause-menu.ts and pause-menu.css) without touching the registry.
 */
import type { UiComponent } from '../../types';

export const pauseMenu: UiComponent = {
  id: 'pause-menu',
  visibleIn: ['paused'],
  mount: () => () => {},
};
