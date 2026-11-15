import { describe, expect, it } from 'vitest';
import { SIGNAL_CONFIG } from '../../config/signal.config';
import { intensityV2 } from '../algorithms/intensity-v2';
import { listAlgorithmIds } from '../algorithms/registry';
import { makeFrame } from './fixtures/make-fixture';

describe('intensity-v2', () => {
  it('is registered', () => expect(listAlgorithmIds()).toContain('intensity-v2'));

  it('active feature rises with absolute 13-30 Hz power even when the band ratio is flat', () => {
    const quiet = { freqsHz: [6, 10, 20, 25], psd: [1, 1, 1, 1] };
    const loud = { freqsHz: [6, 10, 20, 25], psd: [10, 10, 10, 10] };
    const a = intensityV2.extract(makeFrame({ spectrum: quiet }), SIGNAL_CONFIG).active;
    const b = intensityV2.extract(makeFrame({ spectrum: loud }), SIGNAL_CONFIG).active;
    expect(b).toBeGreaterThan(a * 1.3);
  });

  it('falls back to band powers without a spectrum and returns 0 for no power', () => {
    const withBands = intensityV2.extract(makeFrame({ spectrum: null, bands: { theta: 1, alpha: 1, beta: 9 } }), SIGNAL_CONFIG);
    expect(withBands.active).toBeCloseTo(1, 5);
    expect(intensityV2.extract(makeFrame({ spectrum: null, bands: { theta: 0, alpha: 0, beta: 0 } }), SIGNAL_CONFIG).active).toBe(0);
  });
});
