/**
 * hud. P0 STUB: registered so its slot and config line exist, but it renders nothing.
 * P2.3 builds it in this folder (hud.ts and hud.css) without touching the registry.
 */
import type { UiComponent } from '../../types';

export const hud: UiComponent = {
  id: 'hud',
  visibleIn: ['playing'],
  mount: () => () => {},
};
