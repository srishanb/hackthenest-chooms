/**
 * calibration. P0 STUB: registered so its slot and config line exist, but it renders nothing.
 * P6.1 builds it in this folder (calibration.ts and calibration.css) without touching the registry.
 */
import type { UiComponent } from '../../types';

export const calibration: UiComponent = {
  id: 'calibration',
  visibleIn: ['calibrating'],
  mount: () => () => {},
};
