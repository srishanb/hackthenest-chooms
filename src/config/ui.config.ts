/**
 * Which UI components are on, and where they sit. Owner: UI lane (Amrit).
 *
 * Why: showing, hiding or moving a component is a one-line change here, with no code edit.
 * Setting every `enabled` to false must leave the game fully playable.
 */
import type { UiConfig } from '../shared/contracts/config';

// Hands-only variant: the three signal-only components (source badge, calibration, debug overlay) are off.
export const UI_CONFIG: UiConfig = {
  components: {
    'world-tutorial': { enabled: true, slot: 'full' },
    'main-menu': { enabled: true, slot: 'center' },
    'start-menu': { enabled: true, slot: 'center' },
    'pause-menu': { enabled: true, slot: 'center' },
    'settings-panel': { enabled: true, slot: 'center' },
    hud: { enabled: true, slot: 'full' },
    'source-badge': { enabled: false, slot: 'top-right' },
    captions: { enabled: true, slot: 'bottom-center' },
    calibration: { enabled: false, slot: 'full' },
    'ember-prompt': { enabled: true, slot: 'center' },
    'finish-screen': { enabled: true, slot: 'center' },
    'debug-overlay': { enabled: false, slot: 'bottom-left' },
  },
};

/**
 * Hands-only variant: there is no EEG input, so the UI hides everything about a signal
 * (source line on the menu, replay presets, the "show signal" toggle).
 */
export const HANDS_ONLY = true;

/** Presentation scale: 32 world pixels represent one metre in the HUD. */
export const HUD_WORLD_PIXELS_PER_METRE = 32;
/** Radius represented by the complete lantern gauge, including wax light bonuses. */
export const HUD_LANTERN_FULL_RADIUS_PX = 520;
/** Local sizing preview only; shared design defaults stay unchanged until Amrit chooses. */
export const UI_SIZE_PREVIEW = { minPercent: 70, maxPercent: 150, defaultPercent: 100, stepPercent: 5 } as const;
