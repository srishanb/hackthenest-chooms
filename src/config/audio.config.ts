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
