/**
 * The shared objects src/main.ts creates once and hands to every lane.
 *
 * Why: lanes never import each other. They receive the bus, the stores and (where allowed)
 * the signal through these typed bundles, which keeps every dependency visible in main.ts.
 *
 * FROZEN after P0. Only the integrator changes this file.
 */
import type { Store } from '../store';
import type { EffectsFrame } from './effects';
import type { GameSnapshot } from './game-state';
import type { Settings } from './settings';

export interface Stores {
  /** Written by the game. Read by UI and audio. */
  snapshot: Store<GameSnapshot>;
  /** Written by the game's effects engine. Read by renderers, audio and the debug overlay. */
  effects: Store<EffectsFrame>;
  /** Written by the settings panel. Read by everyone. Saved to localStorage. */
  settings: Store<Settings>;
}
