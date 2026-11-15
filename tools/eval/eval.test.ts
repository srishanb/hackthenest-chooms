import { describe, expect, it } from 'vitest';
import type { ComposureState } from '../../src/shared/contracts/composure';
import { computeEvalMetrics, extractCalibrationOutcomes, formatEvalTable } from './metrics';
import { evaluateRecordingText, parseEvalArgs } from './run-eval';
import { createHeader, serializeRecording } from '../../src/signal/sources/recording-format';
import { makeSequence } from '../../src/signal/__tests__/fixtures/make-fixture';

const makeState = (t: number, overrides: Partial<ComposureState> = {}): ComposureState => ({
  intensity: 0.5,
  resting: 0,
  restingActive: false,
  quality: 1,
  valid: true,
  sampleAgeMs: 10,
  held: false,
  mode: 'adaptive',
  calibrated: true,
  source: 'REPLAY',
  algo: 'passthrough-v0',
  t,
  ...overrides,
});

describe('eval metrics', () => {
  it('computes duration, valid seconds, intensity stats, resting-active seconds, and flips/min', () => {
    const states: ComposureState[] = [
      makeState(0, { intensity: 0.2, valid: true, restingActive: false }),
      makeState(1000, { intensity: 0.4, valid: true, restingActive: true }),
      makeState(2000, { intensity: 0.8, valid: false, restingActive: false }),
      makeState(3000, { intensity: 0.6, valid: true, restingActive: true }),
    ];

    const metrics = computeEvalMetrics('passthrough-v0', states, [{ t: 500, ok: true }]);
    expect(metrics.durationSec).toBeCloseTo(3.0, 5);
    expect(metrics.validSec).toBeCloseTo(2.0, 5);
    expect(metrics.intensityMean).toBeCloseTo(0.5, 5);
    expect(metrics.intensityMin).toBeCloseTo(0.2, 5);
    expect(metrics.intensityMax).toBeCloseTo(0.8, 5);
    expect(metrics.restingActiveSec).toBeCloseTo(2.0, 5);
    expect(metrics.restingFlipsPerMin).toBeCloseTo(60, 5);

    const table = formatEvalTable(metrics);
    expect(table).toContain('passthrough-v0');
    expect(table).toContain('ok @ 500ms');
  });

  it('extracts calibration_result events from JSONL text', () => {
    const text = [
      JSON.stringify(createHeader('SIMULATED', 'intensity-v1')),
      JSON.stringify({ type: 'event', t: 1200, event: { type: 'calibration_result', ok: false, reasonKey: 'calibration.noSeparation' } }),
      JSON.stringify({ type: 'event', t: 2400, event: { type: 'calibration_result', ok: true } }),
    ].join('\n');

    expect(extractCalibrationOutcomes(text)).toEqual([
      { t: 1200, ok: false, reasonKey: 'calibration.noSeparation' },
      { t: 2400, ok: true },
    ]);
  });
});

describe('eval cli', () => {
  it('parses positional args and optional --speed', () => {
    expect(parseEvalArgs(['intensity-v1', 'recordings/sim-fixture.jsonl'])).toEqual({
      algoId: 'intensity-v1',
      recordingPath: 'recordings/sim-fixture.jsonl',
      speed: Number.POSITIVE_INFINITY,
    });
    expect(parseEvalArgs(['passthrough-v0', 'rec.jsonl', '--speed', '4'])).toEqual({
      algoId: 'passthrough-v0',
      recordingPath: 'rec.jsonl',
      speed: 4,
    });
    expect(parseEvalArgs(['only-one'])).toBeNull();
    expect(parseEvalArgs(['a', 'b', '--speed', '0'])).toBeNull();
  });

  it('evaluates a recording headlessly and produces different metrics for intensity-v1 vs passthrough-v0', async () => {
    const frames = makeSequence({
      durationMs: 4000,
      hz: 12,
      frame: (_i, t) => (t >= 2000 ? { bands: { alpha: 4.5 }, spectrumOptions: { bands: { alpha: 4.5 } } } : {}),
    });
    const jsonl = serializeRecording({ header: createHeader('SIMULATED', null), frames });

    const intensityMetrics = await evaluateRecordingText('intensity-v1', jsonl);
    const passthroughMetrics = await evaluateRecordingText('passthrough-v0', jsonl);

    expect(intensityMetrics.validSec).toBe(0);
    expect(passthroughMetrics.validSec).toBeGreaterThan(3);
    expect(passthroughMetrics.intensityMean).not.toBe(intensityMetrics.intensityMean);
  });
});
