/**
 * Which UI components are on, and where they sit. Owner: UI lane (Amrit).
 *
 * Why: showing, hiding or moving a component is a one-line change here, with no code edit.
 * Setting every `enabled` to false must leave the game fully playable.
 */
import type { UiConfig } from '../shared/contracts/config';

export const UI_CONFIG: UiConfig = {
  components: {
    'main-menu': { enabled: true, slot: 'center' },
    'start-menu': { enabled: true, slot: 'center' },
    'pause-menu': { enabled: true, slot: 'center' },
    'settings-panel': { enabled: true, slot: 'center' },
    hud: { enabled: true, slot: 'top-left' },
    'source-badge': { enabled: true, slot: 'top-right' },
    captions: { enabled: true, slot: 'bottom-center' },
    calibration: { enabled: true, slot: 'full' },
    'ember-prompt': { enabled: true, slot: 'center' },
    'debug-overlay': { enabled: true, slot: 'bottom-left' },
  },
};
