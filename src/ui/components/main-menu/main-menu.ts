/**
 * main-menu. P0 STUB: registered so its slot and config line exist, but it renders nothing.
 * P2.2 builds it in this folder (main-menu.ts and main-menu.css) without touching the registry.
 */
import type { UiComponent } from '../../types';

export const mainMenu: UiComponent = {
  id: 'main-menu',
  visibleIn: ['menu'],
  mount: () => () => {},
};
