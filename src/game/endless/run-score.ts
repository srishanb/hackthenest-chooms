/**
 * Height score for one endless run, and the best height kept on this device.
 *
 * Height counts only when the candle is standing on a ledge, so a jump that falls back does not
 * score. The best is a personal record in local storage: no ranking and no comparison with anyone
 * (AGENTS.md, binding rule 7). Storage that throws or holds junk is ignored and play continues.
 */
import type { RunSnapshot } from '../../shared/contracts/game-state';
import type { KeyValueStorage } from '../../shared/safe-storage';

export interface RunScore {
  /** Call when the candle stands on a ledge with its feet at `feetY`. Returns true if the height grew. */
  stand(feetY: number): boolean;
  snapshot(): RunSnapshot;
  /** Write the best height to storage (called when a run ends and on landings that beat it). */
  save(): void;
  /** Start a new run from the same origin; the best is kept. */
  reset(seed: number): void;
}

export function createRunScore(options: { seed: number; originFeetY: number; storage?: KeyValueStorage; key: string; persist?: boolean }): RunScore {
  const { originFeetY, storage, key, persist = true } = options;
  let seed = options.seed;
  let heightPx = 0;
  let bestPx = 0;
  let bestAtStart = 0;
  try {
    const saved = Number(storage?.getItem(key));
    if (Number.isFinite(saved) && saved > 0) bestPx = saved;
  } catch { /* Blocked storage: the best lasts for this session only. */ }
  bestAtStart = bestPx;
  return {
    stand(feetY) {
      const height = originFeetY - feetY;
      if (!Number.isFinite(height) || height <= heightPx) return false;
      heightPx = height;
      bestPx = Math.max(bestPx, heightPx);
      return true;
    },
    snapshot: () => ({ mode: 'endless', seed, heightPx: Math.round(heightPx), bestPx: Math.round(bestPx),
      newBest: bestAtStart > 0 && heightPx > bestAtStart }),
    save() {
      if (!persist) return;
      try { storage?.setItem(key, String(Math.round(bestPx))); } catch { /* Session-only best. */ }
    },
    reset(nextSeed) { seed = nextSeed; heightPx = 0; bestAtStart = bestPx; },
  };
}
