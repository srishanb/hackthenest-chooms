/**
 * Algorithm intensity-v1: the default. Raw ratios, normalised per player against calibration.
 *
 * Resting feature = alpha / (theta + alpha + beta). Active-play feature = beta / (theta + alpha + beta),
 * which is partly muscle activity (say so). Gamma is not used: the default 40 Hz low-pass removes
 * most of it. Every number that tunes this lives in src/config/signal.config.ts.
 */
import type { Algorithm } from '../../shared/contracts/signal-internal';
import { extractFeatures } from '../stages/features';
import { scoreWithBaselines } from '../stages/scorer';

export const intensityV1: Algorithm = { id: 'intensity-v1', extract: extractFeatures, score: scoreWithBaselines };
