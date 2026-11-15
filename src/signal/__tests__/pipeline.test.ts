import { describe, expect, it } from 'vitest';
import { SIGNAL_CONFIG } from '../../config/signal.config';
import type { BandFrame } from '../../shared/contracts/signal-internal';
import { ALGORITHMS } from '../algorithms/registry';
import { createPipeline, type Pipeline } from '../pipeline';
import { makeFrame } from './fixtures/make-fixture';

const STEP_MS = 1000 / 12;

/** A band-power frame with theta = 1. Features: active = beta/(1+alpha+beta), resting = alpha/(1+alpha+beta). */
const frameAt = (t: number, alpha: number, beta: number, over: Parameters<typeof makeFrame>[0] = {}): BandFrame =>
  makeFrame({ t, bands: { theta: 1, alpha, beta }, spectrum: null, ...over });

function make(algo: 'intensity-v1' | 'passthrough-v0' = 'intensity-v1', mode: 'adaptive' | 'fixed' = 'adaptive'): Pipeline {
  return createPipeline({ config: SIGNAL_CONFIG, entry: ALGORITHMS[algo]!, initialMode: mode, initialSource: 'SIMULATED' });
}

/** Feed frames for `ms`, one every 1/12 s, returning the clock after the last. */
function feed(p: Pipeline, startMs: number, ms: number, build: (i: number) => BandFrame): number {
  let t = startMs;
  for (let i = 0; i * STEP_MS < ms; i += 1) {
    t = startMs + i * STEP_MS;
    p.process({ ...build(i), t }, t);
  }
  return t;
}

/** Run a full calibration step: low window for the first half, high window for the second. */
function calibrate(p: Pipeline, step: 'active' | 'resting', startMs: number, low: [number, number], high: [number, number]): { endMs: number; ok: boolean; reasonKey?: string } {
  const total = p.calibrationDurationMs(step);
  p.startCalibration(step, startMs);
  const [la, lb] = low;
  const [ha, hb] = high;
  feed(p, startMs, total / 2 - 1, () => frameAt(0, la, lb));
  const mid = startMs + total / 2;
  const end = feed(p, mid, total / 2, () => frameAt(0, ha, hb));
  const result = p.finishCalibration();
  return { endMs: end + STEP_MS, ok: result.ok, ...(result.reasonKey ? { reasonKey: result.reasonKey } : {}) };
}

describe('pipeline: before calibration', () => {
  it('is invalid and not calibrated, with intensity at neutral, however good the data', () => {
    const p = make();
    let state = p.getState();
    for (let i = 0; i < 24; i += 1) state = p.process(frameAt(i * STEP_MS, 1, 1), i * STEP_MS);
    expect(state.calibrated).toBe(false);
    expect(state.valid).toBe(false);
    expect(state.intensity).toBeCloseTo(SIGNAL_CONFIG.neutralIntensity, 6);
    expect(state.algo).toBe('intensity-v1');
  });
});

describe('pipeline: calibration', () => {
  it('a good calibration of both steps makes the state valid', () => {
    const p = make();
    // resting = alpha/(1+alpha+beta); with beta = 1: alpha 1 -> 0.33, alpha 4 -> 0.67 (ratio 2)
    const resting = calibrate(p, 'resting', 0, [1, 1], [4, 1]);
    expect(resting.ok).toBe(true);
    // active = beta/(1+alpha+beta); with alpha = 1: beta 1 -> 0.33, beta 4 -> 0.67
    const active = calibrate(p, 'active', resting.endMs, [1, 1], [1, 4]);
    expect(active.ok).toBe(true);
    const state = p.process(frameAt(active.endMs + 10, 1, 1), active.endMs + 10);
    expect(state.calibrated).toBe(true);
    expect(state.valid).toBe(true);
  });

  it('a bad calibration is reported and leaves the state uncalibrated', () => {
    const p = make();
    const result = calibrate(p, 'resting', 0, [1, 1], [1.05, 1]); // eyes closed barely different
    expect(result.ok).toBe(false);
    expect(result.reasonKey).toBe('calibration.noSeparation');
    expect(p.process(frameAt(20_000, 1, 1), 20_000).calibrated).toBe(false);
  });

  it('reports too few samples when no good frames arrive', () => {
    const p = make();
    p.startCalibration('resting', 0);
    expect(p.finishCalibration()).toEqual({ step: 'resting', ok: false, reasonKey: 'calibration.tooFewSamples' });
  });

  it('refuses to finish a calibration that was never started', () => {
    expect(() => make().finishCalibration()).toThrow(/no calibration/);
  });
});

describe('pipeline: after calibration', () => {
  function calibrated(mode: 'adaptive' | 'fixed' = 'adaptive'): { p: Pipeline; now: number } {
    const p = make('intensity-v1', mode);
    const r = calibrate(p, 'resting', 0, [1, 1], [4, 1]);
    const a = calibrate(p, 'active', r.endMs, [1, 1], [1, 4]);
    return { p, now: a.endMs };
  }

  it('raising the active feature raises intensity, and it eases rather than jumps', () => {
    const { p, now } = calibrated();
    let state = p.process(frameAt(now, 1, 4), now); // clench-level beta
    expect(state.valid).toBe(true);
    expect(state.intensity).toBeLessThan(0.62); // first step moves only a little from neutral 0.5
    const before = state.intensity;
    state = p.process(frameAt(now + 6000, 1, 4), now + 6000);
    expect(state.intensity).toBeGreaterThan(before);
    expect(state.intensity).toBeGreaterThan(0.85);
  });

  it('an eyes-closed alpha rise turns restingActive on', () => {
    const { p, now } = calibrated();
    let state = p.getState();
    for (let i = 0; i < 12 * 8; i += 1) state = p.process(frameAt(now + i * STEP_MS, 4, 1), now + i * STEP_MS);
    expect(state.resting).toBeGreaterThan(0.6);
    expect(state.restingActive).toBe(true);
  });

  it('when frames stop, the state goes invalid and intensity eases to neutral without jumping', () => {
    const { p, now } = calibrated();
    for (let i = 0; i < 12 * 10; i += 1) p.process(frameAt(now + i * STEP_MS, 1, 4), now + i * STEP_MS);
    const high = p.getState().intensity;
    expect(high).toBeGreaterThan(0.8);
    let previous = high;
    let maxDrop = 0;
    const start = now + 10_000;
    for (let i = 1; i <= 12 * 20; i += 1) {
      const next = p.step(start + i * STEP_MS);
      if (i > 12) expect(next.valid).toBe(false); // stale after 500 ms
      maxDrop = Math.max(maxDrop, previous - next.intensity);
      previous = next.intensity;
    }
    const settled = p.getState().intensity;
    expect(settled).toBeLessThan(0.55);
    expect(settled).toBeGreaterThan(0.45);
    expect(maxDrop).toBeLessThan(0.05); // per-step change stays small: no jumps
    expect(p.getState().restingActive).toBe(false);
  });

  it('poor contact makes the state invalid without moving the feature scale', () => {
    const { p, now } = calibrated();
    const state = p.process(frameAt(now, 1, 1, { contactGood01: 0.2 }), now);
    expect(state.quality).toBeCloseTo(0.2, 6);
    expect(state.valid).toBe(false);
    expect(p.getDiagnostics().features['active']).toBeCloseTo(1 / 3, 6);
  });

  it('fixed mode keeps intensity at neutral while resting still responds', () => {
    const { p, now } = calibrated('fixed');
    let state = p.getState();
    for (let i = 0; i < 12 * 8; i += 1) state = p.process(frameAt(now + i * STEP_MS, 4, 4), now + i * STEP_MS);
    expect(state.mode).toBe('fixed');
    expect(state.intensity).toBeCloseTo(SIGNAL_CONFIG.neutralIntensity, 6);
    expect(state.resting).toBeGreaterThan(0);
  });

  it('fixed mode needs only the resting baseline to be valid', () => {
    const p = make('intensity-v1', 'fixed');
    const r = calibrate(p, 'resting', 0, [1, 1], [4, 1]);
    expect(p.process(frameAt(r.endMs, 1, 1), r.endMs).valid).toBe(true);
  });

  it('ignores a malformed frame and lets the last good one age out', () => {
    const { p, now } = calibrated();
    p.process(frameAt(now, 1, 1), now);
    const bad = frameAt(now + 100, 1, 1);
    bad.bands.alpha = Number.NaN;
    expect(p.process(bad, now + 100).sampleAgeMs).toBeCloseTo(100, 6);
    expect(p.step(now + 2000).valid).toBe(false);
  });
});

describe('pipeline: a second algorithm is one file plus a registry line', () => {
  it('passthrough-v0 needs no calibration, reports its id and differs from intensity-v1', () => {
    const p = make('passthrough-v0');
    let state = p.getState();
    for (let i = 0; i < 12 * 20; i += 1) state = p.process(frameAt(i * STEP_MS, 1, 4), i * STEP_MS);
    expect(state.algo).toBe('passthrough-v0');
    expect(state.calibrated).toBe(true);
    expect(state.valid).toBe(true);
    expect(state.intensity).toBeCloseTo(4 / 6, 1); // raw beta / (theta+alpha+beta)
  });
});

describe('pipeline: replay clocks', () => {
  it('judges freshness against the supplied clock, so old recording times are not stale', () => {
    const p = make('passthrough-v0');
    const state = p.process(frameAt(1_000_000, 1, 1), 1_000_000);
    expect(state.valid).toBe(true);
    expect(state.sampleAgeMs).toBe(0);
  });
});
