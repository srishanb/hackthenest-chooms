/**
 * Player settings: one typed schema with defaults.
 *
 * Why: remapping, volumes, captions, reduced motion and effect strength must apply live and
 * survive a reload. One schema means the settings panel, the game and the audio agree.
 *
 * FROZEN after P0. Only the integrator changes this file.
 */

/** Key bindings as `KeyboardEvent.code` values (layout independent), for example 'ArrowLeft', 'Space'. */
export interface KeyBindings {
  left: string;
  right: string;
  jump: string;
  recover: string;
  pause: string;
  debugOverlay: string;
}

/** Each volume is 0 to 1. */
export interface Volumes {
  master: number;
  music: number;
  sfx: number;
  narrator: number;
}

export interface Settings {
  keys: KeyBindings;
  volumes: Volumes;
  captions: { enabled: boolean; scale: number };
  reducedMotion: boolean;
  /** Scales every signal-driven effect's swing away from neutral, 0 (none) to 1 (full). */
  effectStrength: number;
  landingShake: boolean;
  hud: { showSignal: boolean; showEmber: boolean; showStatus: boolean };
}

export const DEFAULT_SETTINGS: Settings = {
  keys: {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    jump: 'Space',
    recover: 'KeyR',
    pause: 'Escape',
    debugOverlay: 'Backquote',
  },
  volumes: { master: 0.8, music: 0.7, sfx: 0.9, narrator: 1 },
  captions: { enabled: true, scale: 1 },
  reducedMotion: false,
  effectStrength: 1,
  landingShake: false,
  hud: { showSignal: false, showEmber: true, showStatus: true },
};
