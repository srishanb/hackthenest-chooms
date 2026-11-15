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
  'debug.hint': 'Press ` to hide',
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey): string {
  return STRINGS[key];
}
