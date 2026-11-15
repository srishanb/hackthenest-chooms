/**
 * Audio lane entry point. P0 STUB: does nothing yet.
 *
 * P5.4 adds the mixer and music layers (reads `EffectsFrame.musicTenseMix`); P7 adds the
 * narrator (listens to the bus, plays local clips, emits `narrator_line` for captions).
 */
import type { Stores } from '../shared/contracts/app';
import type { AudioConfig } from '../shared/contracts/config';
import type { NarratorLine } from '../shared/contracts/content';
import type { EventBus } from '../shared/contracts/events';

export interface AudioDeps {
  bus: EventBus;
  stores: Stores;
  config: AudioConfig;
  narratorLines: readonly NarratorLine[];
}

export function createAudio(_deps: AudioDeps): void {
  // Intentionally empty in the foundation.
}
