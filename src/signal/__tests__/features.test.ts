/**
 * Unit tests for the features stage (P1.2).
 *
 * Why: verifies spectrum-based band ratios, fallback to SDK band powers, alpha burst
 * response, clench broadband response, and independence from noisy-pin quality drops.
 */
import { describe, expect, it } from 'vitest';
import { SIGNAL_CONFIG } from '../../config/signal.config';
import { extractFeatures } from '../stages/features';
import { estimateQuality } from '../stages/quality';
import { makeFrame, makeSequence } from './fixtures/make-fixture';

function mean(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

describe('extractFeatures', () => {
  it('raises the resting feature (a) by > 1.5x during an alpha x3 burst for 5 s', () => {
    const before = makeSequence({
      durationMs: 5000,
      frame: () => ({ bands: { theta: 1, alpha: 1, beta: 1 } }),
    });
    const burst = makeSequence({
      startMs: 5000,
      durationMs: 5000,
      frame: () => ({ bands: { theta: 1, alpha: 3, beta: 1 } }),
    });

    const meanBefore = mean(before.map((f) => extractFeatures(f, SIGNAL_CONFIG).resting));
    const meanBurst = mean(burst.map((f) => extractFeatures(f, SIGNAL_CONFIG).resting));

    expect(meanBurst).toBeGreaterThan(1.5 * meanBefore);
  });

  it('raises the active-play feature (m) when broadband clench noise is added', () => {
    const relaxed = makeSequence({
      durationMs: 3000,
      frame: () => ({ bands: { theta: 1, alpha: 1, beta: 1 } }),
    });
    const clench = makeSequence({
      startMs: 3000,
      durationMs: 3000,
      frame: () => ({
        bands: { theta: 1, alpha: 1, beta: 1 },
        spectrumOptions: { broadbandNoise: 0.5 },
      }),
    });

    const meanRelaxed = mean(relaxed.map((f) => extractFeatures(f, SIGNAL_CONFIG).active));
    const meanClench = mean(clench.map((f) => extractFeatures(f, SIGNAL_CONFIG).active));

    expect(meanClench).toBeGreaterThan(meanRelaxed);
  });

  it('keeps features within < 10% under a noisy pin (50 Hz mains + 15/16 contact) while quality drops', () => {
    const clean = makeFrame({
      bands: { theta: 1, alpha: 1.2, beta: 0.8 },
      contactGood01: 1,
      packetLoss01: 0,
    });
    const noisyPin = makeFrame({
      bands: { theta: 1, alpha: 1.2, beta: 0.8 },
      spectrumOptions: { mains50HzSpike: 50 },
      contactGood01: 15 / 16,
      packetLoss01: 0,
    });

    const fClean = extractFeatures(clean, SIGNAL_CONFIG);
    const fNoisy = extractFeatures(noisyPin, SIGNAL_CONFIG);

    expect(estimateQuality(noisyPin, SIGNAL_CONFIG)).toBeLessThan(estimateQuality(clean, SIGNAL_CONFIG));
    expect(Math.abs(fNoisy.resting - fClean.resting) / fClean.resting).toBeLessThan(0.1);
    expect(Math.abs(fNoisy.active - fClean.active) / fClean.active).toBeLessThan(0.1);
  });

  it('falls back to frame.bands when spectrum is null', () => {
    const frame = makeFrame({
      bands: { theta: 2, alpha: 3, beta: 5 },
      spectrum: null,
    });
    const features = extractFeatures(frame, SIGNAL_CONFIG);
    expect(features.resting).toBeCloseTo(3 / 10, 6);
    expect(features.active).toBeCloseTo(5 / 10, 6);
  });
});
