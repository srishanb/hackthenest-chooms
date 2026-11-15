/**
 * The algorithm registry: every selectable algorithm version, by id.
 *
 * To add an algorithm: write src/signal/algorithms/<id>.ts and add one line to ALGORITHMS.
 * Nothing else changes. It is chosen with `?algo=<id>` or `defaultAlgo` in signal.config.ts,
 * and the active id is shown on the debug overlay.
 */
import type { Algorithm } from '../../shared/contracts/signal-internal';
import { intensityV1 } from './intensity-v1';
import { passthroughV0 } from './passthrough-v0';

export interface AlgorithmEntry {
  algorithm: Algorithm;
  /** False when the scorer ignores baselines, so the state may be valid without calibrating. */
  needsCalibration: boolean;
}

export const ALGORITHMS: Readonly<Record<string, AlgorithmEntry>> = {
  'intensity-v1': { algorithm: intensityV1, needsCalibration: true },
  'passthrough-v0': { algorithm: passthroughV0, needsCalibration: false },
};

export function listAlgorithmIds(): string[] {
  return Object.keys(ALGORITHMS);
}

/** The entry for `id`; an unknown or missing id falls back to `fallbackId` with a console warning. */
export function resolveAlgorithm(id: string | null | undefined, fallbackId: string, warn: (message: string) => void = console.warn): AlgorithmEntry {
  const wanted = id ?? fallbackId;
  const entry = ALGORITHMS[wanted];
  if (entry) return entry;
  warn(`[signal] unknown algorithm "${wanted}", using "${fallbackId}". Known: ${listAlgorithmIds().join(', ')}`);
  const fallback = ALGORITHMS[fallbackId];
  if (!fallback) throw new Error(`defaultAlgo "${fallbackId}" is not in the registry`);
  return fallback;
}
