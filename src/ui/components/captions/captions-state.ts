/**
 * Pure helpers for captions: what text to show and for how long.
 *
 * Why: the timing rule is testable without a DOM. The narrator sends `durationMs`; if a line
 * arrives with a bad value (zero, negative, NaN) a length-based fallback keeps it readable
 * instead of flashing or hanging on screen.
 */
export const CAPTION_MIN_MS = 1500;
export const CAPTION_MAX_MS = 120000;
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

/** Short readable chunks, timed proportionally to words (estimated, not forced alignment).
 * The audio offset keeps the active chunk in place after a real pause/resume. */
export function captionCues(text: string, durationMs: number, offsetMs = 0): Array<{text: string; atMs: number}> {
  const offset = Number.isFinite(offsetMs) && offsetMs > 0 ? offsetMs : 0;
  const total = captionDurationMs(durationMs + offset, text);
  const words = text.trim().split(/\s+/);
  const chunks: Array<{text:string; word:number}> = [];
  let start = 0;
  for (let i = 0; i < words.length; i++) {
    if (i - start >= 13 || (i - start >= 5 && /[.!?]$/.test(words[i]!)) || i === words.length - 1) {
      chunks.push({text:words.slice(start,i+1).join(' '),word:start});start=i+1;
    }
  }
  const cues = chunks.map(chunk=>({text:chunk.text,atMs:chunk.word/words.length*total}));
  let active = 0;
  for (let i = 1; i < cues.length; i++) if (cues[i]!.atMs <= offset) active = i;
  return cues.slice(active).map((cue,i)=>({text:cue.text,atMs:i===0?0:Math.max(0,cue.atMs-offset)}));
}
