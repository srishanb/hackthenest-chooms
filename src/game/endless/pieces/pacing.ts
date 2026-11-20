/**
 * Pacing: which set piece comes next, chosen by the seed with rules that give variety.
 *
 * The rules: a piece never follows itself; after a demanding piece the next one is calm; a piece only
 * appears once its chunk is reached and its features are there; and a newly unlocked piece fades in
 * over a few chunks (`fadeInChunks`) instead of arriving at full weight. Pieces that already failed
 * to fit at this spot are left out.
 */
import type { EndlessPiecesConfig } from '../../../config/endless-pieces.config';
import type { PieceEntry } from './registry';
import type { PieceFeature } from './types';

export interface PacingState {
  /** The piece laid just before, if any (in this chunk). */
  previous: PieceEntry | null;
  /** Pieces that failed to fit at the current spot. */
  excluded: ReadonlySet<string>;
}

/** The entries allowed next, each with its weight at this chunk. */
export function allowedPieces(entries: readonly PieceEntry[], index: number, features: ReadonlySet<PieceFeature>,
  state: PacingState, tuning: EndlessPiecesConfig): Array<{ entry: PieceEntry; weight: number }> {
  const allowed: Array<{ entry: PieceEntry; weight: number }> = [];
  for (const entry of entries) {
    if (index < entry.fromChunk || !entry.needs.every((need) => features.has(need))) continue;
    if (entry === state.previous || state.excluded.has(entry.piece.id)) continue;
    if (state.previous?.demanding && entry.demanding) continue;
    const fade = Math.min(1, (index - entry.fromChunk + 1) / Math.max(1, tuning.fadeInChunks));
    allowed.push({ entry, weight: entry.weight * fade });
  }
  return allowed;
}

/** Pick the next piece, or null when none is allowed. */
export function choosePiece(entries: readonly PieceEntry[], index: number, features: ReadonlySet<PieceFeature>,
  state: PacingState, tuning: EndlessPiecesConfig, random: () => number): PieceEntry | null {
  const allowed = allowedPieces(entries, index, features, state, tuning);
  const total = allowed.reduce((sum, option) => sum + option.weight, 0);
  if (total <= 0) return null;
  let roll = random() * total;
  for (const option of allowed) {
    roll -= option.weight;
    if (roll < 0) return option.entry;
  }
  return allowed.at(-1)!.entry;
}
