/**
 * Pure helpers for captions: what text to show and for how long.
 *
 * Why: the timing rule is testable without a DOM. The narrator sends `durationMs`; if a line
 * arrives with a bad value (zero, negative, NaN) a length-based fallback keeps it readable
 * instead of flashing or hanging on screen.
 */
export const CAPTION_MIN_MS = 1500;
export const CAPTION_MAX_MS = 12000;
const MS_PER_CHARACTER = 60;

/** How long to show a caption. Uses the event's duration when it is a usable number. */
export function captionDurationMs(durationMs: number, text: string): number {
  const wanted = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : text.length * MS_PER_CHARACTER;
  return Math.min(CAPTION_MAX_MS, Math.max(CAPTION_MIN_MS, wanted));
}

/** Trims the text; returns null when nothing is left to show. */
export function captionText(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  return trimmed === '' ? null : trimmed;
}
