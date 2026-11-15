/**
 * Every piece of player-facing text, in one place.
 *
 * Why: wording must follow the framing rules in AGENTS.md (composure, never "emotion" or
 * "stress"; no medical claims), and one file makes that reviewable. Components and game
 * state refer to text by key, never by literal string.
 */
export const STRINGS = {
  'source.LIVE_EEG': 'LIVE EEG',
  'source.SIMULATED': 'SIMULATED INPUT',
  'source.REPLAY': 'RECORDED REPLAY',
  'debug.title': 'Signal debug',
  'debug.hint': 'Press ` to hide · Shift+R to download',
  'debug.calibrateActive': 'Calibrate active',
  'debug.calibrateResting': 'Calibrate resting',
  'debug.calibrating': 'Calibrating...',
  'debug.calibrationOk': 'ok',
  'debug.calibrationUnknown': 'unknown',
  'debug.downloadRecording': 'Download recording',
  'debug.recordingDownloaded': 'Downloaded recording',
  'debug.simLegendTitle': 'Simulator keys',
  'debug.simKey.alpha': 'alpha boost (toggle)',
  'debug.simKey.clench': 'jaw clench',
  'debug.simKey.blink': 'eye blink',
  'debug.simKey.noisyPin': 'noisy pin (toggle)',
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey): string {
  return STRINGS[key];
}
