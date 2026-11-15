/**
 * Recovery ember tunables. Owner: game lane (Ali).
 *
 * Why: the activation duration is expected to change through playtesting (feature EMB-5),
 * so it lives here rather than in the state machine.
 */
import type { EmberConfig } from '../shared/contracts/config';

export const EMBER_CONFIG: EmberConfig = {
  targetValidMs: 4000, // about four valid seconds
  bigFallPx: 300,
  minFallPxToOffer: 120,
};
