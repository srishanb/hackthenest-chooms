/**
 * Audio and narrator tunables. Owner: audio lane (Amrit). Starting guesses for P5.4 and P7.
 */
import type { AudioConfig } from '../shared/contracts/config';

export const AUDIO_CONFIG: AudioConfig = {
  maxMusicGain: 0.6,
  musicCrossfadeMs: 2000,
  narrator: { cooldownMs: 8000, repeatCooldownMs: 120_000 },
};

/** Local narrator presentation only; never affects gameplay or signal values. */
export const INTRO_MUSIC_DUCK = 0.35;

/** Original stock-voice choices. Selection is local; clips are generated before play. */
export const NARRATOR_VOICES = [
  { id: 'chris', prefix: 'intro-chris-', nameKey: 'narrator.voice.chris' },
  { id: 'bill', prefix: 'intro-bill-', nameKey: 'narrator.voice.bill' },
] as const;
export const DEFAULT_NARRATOR_VOICE = 'chris';
export const NARRATOR_VOICE_STORAGE_KEY = 'lighten.narrator-voice.v1';
export const NARRATOR_VOICE_EVENT = 'lighten-narrator-voice';
export const NARRATOR_LEVELS = { targetRms: 0.1, peakCeiling: 0.85, maxGain: 2 } as const;

/** Sparse event commentary: world pixels, milliseconds; no gameplay effects. */
export const NARRATOR_MOMENTS = {
  cooldownMs: 30_000,
  eventExpiryMs: 15_000,
  heightStepPx: 256,
  // Share the HUD's existing personal-best record, without writing gameplay state.
  bestStorageKey: 'lighten.height-best-px.v1',
} as const;
