/**
 * Unit tests for the quality stage (P1.2).
 *
 * Why: verifies contactGood01 * (1 - packetLoss01), unknown defaults, and 0..1 clamping.
 */
import { describe, expect, it } from 'vitest';
import { SIGNAL_CONFIG } from '../../config/signal.config';
import { estimateQuality } from '../stages/quality';
import { makeFrame } from './fixtures/make-fixture';

describe('estimateQuality', () => {
  it('computes contactGood01 * (1 - packetLoss01)', () => {
    const frame = makeFrame({ contactGood01: 0.8, packetLoss01: 0.25 });
    expect(estimateQuality(frame, SIGNAL_CONFIG)).toBeCloseTo(0.6, 6);
  });

  it('defaults unknown contactGood01 or packetLoss01 factors to 1', () => {
    expect(estimateQuality(makeFrame({ contactGood01: null, packetLoss01: null }), SIGNAL_CONFIG)).toBe(1);
    expect(estimateQuality(makeFrame({ contactGood01: 0.75, packetLoss01: null }), SIGNAL_CONFIG)).toBeCloseTo(0.75, 6);
    expect(estimateQuality(makeFrame({ contactGood01: null, packetLoss01: 0.2 }), SIGNAL_CONFIG)).toBeCloseTo(0.8, 6);
  });

  it('clamps out-of-range inputs to 0..1', () => {
    expect(estimateQuality(makeFrame({ contactGood01: 1.5, packetLoss01: -0.2 }), SIGNAL_CONFIG)).toBe(1);
    expect(estimateQuality(makeFrame({ contactGood01: -0.5, packetLoss01: 0 }), SIGNAL_CONFIG)).toBe(0);
    expect(estimateQuality(makeFrame({ contactGood01: 1, packetLoss01: 1.4 }), SIGNAL_CONFIG)).toBe(0);
  });
});
