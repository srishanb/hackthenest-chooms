/**
 * Unit tests for the calibration stage (P1.3).
 *
 * Why: verifies baseline computation, repeatability and separation checks, and that stale
 * frames are excluded when collecting calibration samples.
 */
import { describe, expect, it } from 'vitest';
import { SIGNAL_CONFIG } from '../../config/signal.config';
import {
  calibrateBaseline,
  createCalibrationCollector,
  stepCalibrationCollector,
} from '../stages/calibration';
import { extractFeatures } from '../stages/features';
import { makeSequence } from './fixtures/make-fixture';

describe('calibrateBaseline', () => {
  it('passes with sensible low < high when resting windows have clear separation', () => {
    const eyesOpen = Array.from({ length: 24 }, (_, i) => 0.2 + (i % 3) * 0.01);
    const eyesClosed = Array.from({ length: 24 }, (_, i) => 0.5 + (i % 3) * 0.01);

    const outcome = calibrateBaseline(eyesOpen, eyesClosed, 'resting');
    expect(outcome.ok).toBe(true);
    expect(outcome.baseline).not.toBeNull();
    expect(outcome.baseline!.low).toBeLessThan(outcome.baseline!.high);
    expect(outcome.baseline!.low).toBeCloseTo(0.21, 5);
    expect(outcome.baseline!.high).toBeCloseTo(0.51, 5);
  });

  it('passes for active calibration using median for low and 90th percentile for high', () => {
    const relaxed = Array.from({ length: 20 }, () => 0.25);
    const clench = Array.from({ length: 20 }, (_, i) => (i < 16 ? 0.36 : 0.6));

    const outcome = calibrateBaseline(relaxed, clench, 'active');
    expect(outcome.ok).toBe(true);
    expect(outcome.baseline).not.toBeNull();
    expect(outcome.baseline!.low).toBeCloseTo(0.25, 5);
    expect(outcome.baseline!.high).toBeGreaterThan(0.55);
  });

  it('detects lack of separation (high < 1.3 * low) with calibration.noSeparation', () => {
    const eyesOpen = Array.from({ length: 20 }, () => 0.4);
    const eyesClosed = Array.from({ length: 20 }, () => 0.45); // 0.45 < 1.3 * 0.4 (0.52)

    const outcome = calibrateBaseline(eyesOpen, eyesClosed, 'resting');
    expect(outcome.ok).toBe(false);
    expect(outcome.baseline).toBeNull();
    expect(outcome.reasonKey).toBe('calibration.noSeparation');
  });

  it('detects unrepeatable halves (> 25% median difference) with calibration.unstable', () => {
    const eyesOpen = [
      ...Array.from({ length: 12 }, () => 0.2),
      ...Array.from({ length: 12 }, () => 0.45), // halves medians 0.2 vs 0.45 (> 25%)
    ];
    const eyesClosed = Array.from({ length: 24 }, () => 0.7);

    const outcome = calibrateBaseline(eyesOpen, eyesClosed, 'resting');
    expect(outcome.ok).toBe(false);
    expect(outcome.baseline).toBeNull();
    expect(outcome.reasonKey).toBe('calibration.unstable');
  });
});

describe('stepCalibrationCollector', () => {
  it('excludes stale frames when collecting over a fixture with a gap', () => {
    const frames = makeSequence({ durationMs: 1000, hz: 12 }); // 12 frames, step ~83.3 ms
    let state = createCalibrationCollector();

    for (let i = 0; i < frames.length; i += 1) {
      const frame = frames[i]!;
      // Simulate a 600 ms stall when judging frames at indices 4..7
      const nowMs = i >= 4 && i <= 7 ? frame.t + 600 : frame.t + 20;
      const value = extractFeatures(frame, SIGNAL_CONFIG).resting;
      state = stepCalibrationCollector(state, frame, nowMs, SIGNAL_CONFIG, value);
    }

    expect(state.rejectedStale).toBe(4);
    expect(state.samples).toHaveLength(frames.length - 4);
  });
});
