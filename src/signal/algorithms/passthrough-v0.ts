/**
 * Algorithm passthrough-v0: a deliberately trivial second algorithm.
 *
 * Why it exists: it proves that a new algorithm is one new file plus one registry line, and gives
 * the evaluation script something different to compare against. It uses the raw ratios as the
 * scores, with no per-player baseline, so it needs no calibration.
 */
import type { Algorithm } from '../../shared/contracts/signal-internal';
import { extractFeatures } from '../stages/features';

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);

export const passthroughV0: Algorithm = {
  id: 'passthrough-v0',
  extract: extractFeatures,
  score: (features) => ({ intensity: clamp01(features.active), resting: clamp01(features.resting) }),
};
