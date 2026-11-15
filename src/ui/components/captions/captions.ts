/**
 * captions. P0 STUB: registered so its slot and config line exist, but it renders nothing.
 * P2.4 builds it in this folder (captions.ts and captions.css) without touching the registry.
 */
import type { UiComponent } from '../../types';

export const captions: UiComponent = {
  id: 'captions',
  visibleIn: ['playing'],
  mount: () => () => {},
};
