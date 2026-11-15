import { describe, expect, it, vi } from 'vitest';
import { SIGNAL_CONFIG } from '../../config/signal.config';
import { ALGORITHMS, listAlgorithmIds, resolveAlgorithm } from '../algorithms/registry';
import { isValid, nextRestingActive, targetsFor } from '../stages/gates';
import { normalise, scoreWithBaselines } from '../stages/scorer';
import { smooth } from '../stages/smoother';
import { parseSignalUrlParams } from '../url-params';

describe('smoother', () => {
  it('reaches 63 % of the way after one time constant, and all the way after many', () => {
    expect(smooth(0, 1, 3000, 3000)).toBeCloseTo(1 - Math.exp(-1), 6);
    expect(smooth(0, 1, 60_000, 3000)).toBeCloseTo(1, 6);
  });
  it('is frame-rate independent', () => {
    const one = smooth(0, 1, 200, 1000);
    const two = smooth(smooth(0, 1, 100, 1000), 1, 100, 1000);
    expect(two).toBeCloseTo(one, 9);
  });
  it('never moves on a zero or negative step, or a non-finite target', () => {
    expect(smooth(0.4, 1, 0, 1000)).toBe(0.4);
    expect(smooth(0.4, 1, -50, 1000)).toBe(0.4);
    expect(smooth(0.4, Number.NaN, 100, 1000)).toBe(0.4);
  });
});

describe('scorer', () => {
  const baseline = { low: 0.2, high: 0.6 };
  it('maps low to 0 and high to 1, clamped', () => {
    expect(normalise(0.2, baseline)).toBe(0);
    expect(normalise(0.6, baseline)).toBe(1);
    expect(normalise(0.4, baseline)).toBeCloseTo(0.5, 9);
    expect(normalise(-5, baseline)).toBe(0);
    expect(normalise(5, baseline)).toBe(1);
  });
  it('treats a degenerate baseline or a bad value as 0', () => {
    expect(normalise(0.5, { low: 0.5, high: 0.5 })).toBe(0);
    expect(normalise(Number.NaN, baseline)).toBe(0);
  });
  it('uses neutral intensity and 0 resting before calibration', () => {
    expect(scoreWithBaselines({ active: 0.9, resting: 0.9 }, { active: null, resting: null }, SIGNAL_CONFIG)).toEqual({
      intensity: SIGNAL_CONFIG.neutralIntensity,
      resting: 0,
    });
  });
});

describe('gates', () => {
  const ok = { fresh: true, quality: 0.9, calibrated: true };
  it('is valid only when fresh, good quality and calibrated', () => {
    expect(isValid(ok, SIGNAL_CONFIG)).toBe(true);
    expect(isValid({ ...ok, fresh: false }, SIGNAL_CONFIG)).toBe(false);
    expect(isValid({ ...ok, quality: SIGNAL_CONFIG.qualityFloor - 0.01 }, SIGNAL_CONFIG)).toBe(false);
    expect(isValid({ ...ok, quality: SIGNAL_CONFIG.qualityFloor }, SIGNAL_CONFIG)).toBe(true);
    expect(isValid({ ...ok, calibrated: false }, SIGNAL_CONFIG)).toBe(false);
  });
  it('hysteresis: oscillating between 0.5 and 0.55 never flips it once on', () => {
    const th = { on: 0.6, off: 0.45 };
    let active = nextRestingActive(false, 0.7, true, th);
    expect(active).toBe(true);
    for (const value of [0.5, 0.55, 0.5, 0.55, 0.47]) {
      active = nextRestingActive(active, value, true, th);
      expect(active).toBe(true);
    }
    expect(nextRestingActive(active, 0.45, true, th)).toBe(false);
  });
  it('does not turn on between the thresholds, and an invalid signal is never active', () => {
    const th = { on: 0.6, off: 0.45 };
    expect(nextRestingActive(false, 0.55, true, th)).toBe(false);
    expect(nextRestingActive(true, 0.99, false, th)).toBe(false);
  });
  it('invalid data targets neutral intensity and zero resting; fixed mode keeps resting', () => {
    const scores = { intensity: 0.9, resting: 0.8 };
    expect(targetsFor(scores, false, 'adaptive', SIGNAL_CONFIG)).toEqual({ intensity: SIGNAL_CONFIG.neutralIntensity, resting: 0 });
    expect(targetsFor(scores, true, 'adaptive', SIGNAL_CONFIG)).toEqual({ intensity: 0.9, resting: 0.8 });
    expect(targetsFor(scores, true, 'fixed', SIGNAL_CONFIG)).toEqual({ intensity: SIGNAL_CONFIG.neutralIntensity, resting: 0.8 });
  });
});

describe('algorithm registry', () => {
  it('lists the algorithms and resolves by id', () => {
    expect(listAlgorithmIds().sort()).toEqual(['intensity-v1', 'intensity-v2', 'passthrough-v0']);
    expect(resolveAlgorithm('passthrough-v0', 'intensity-v1').algorithm.id).toBe('passthrough-v0');
    expect(ALGORITHMS['intensity-v1']?.needsCalibration).toBe(true);
    expect(ALGORITHMS['passthrough-v0']?.needsCalibration).toBe(false);
  });
  it('falls back with a warning for an unknown id, and uses the default when none is given', () => {
    const warn = vi.fn();
    expect(resolveAlgorithm('nope', 'intensity-v1', warn).algorithm.id).toBe('intensity-v1');
    expect(warn).toHaveBeenCalledOnce();
    expect(resolveAlgorithm(null, 'intensity-v1', warn).algorithm.id).toBe('intensity-v1');
    expect(warn).toHaveBeenCalledOnce();
  });
  it('the configured default algorithm exists', () => {
    expect(ALGORITHMS[SIGNAL_CONFIG.defaultAlgo]).toBeDefined();
  });
});

describe('url params', () => {
  it('parses the known parameters', () => {
    expect(parseSignalUrlParams('?source=replay&algo=passthrough-v0&mode=fixed&replay=run1.jsonl')).toEqual({
      source: 'replay',
      algo: 'passthrough-v0',
      mode: 'fixed',
      replay: 'run1.jsonl',
    });
  });
  it('ignores anything unrecognised, including path tricks', () => {
    expect(parseSignalUrlParams('')).toEqual({ source: null, algo: null, mode: null, replay: null });
    expect(parseSignalUrlParams('?source=usb&mode=wild&algo=../x&replay=../secret.jsonl')).toEqual({ source: null, algo: null, mode: null, replay: null });
    expect(parseSignalUrlParams('?replay=a/b.jsonl').replay).toBeNull();
    expect(parseSignalUrlParams('?replay=notes.txt').replay).toBeNull();
  });
});
