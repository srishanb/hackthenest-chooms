/**
 * Unit tests for the preprocess stage (P1.2).
 *
 * Why: verifies freshness against caller-supplied `nowMs` and rejection of NaN or negative powers.
 */
import { describe, expect, it } from 'vitest';
import { SIGNAL_CONFIG } from '../../config/signal.config';
import type { BandFrame } from '../../shared/contracts/signal-internal';
import { preprocess } from '../stages/preprocess';
import { makeFrame } from './fixtures/make-fixture';

describe('preprocess', () => {
  it('marks frames fresh when nowMs - frame.t <= staleAfterMs', () => {
    const frame = makeFrame({ t: 1000 });
    expect(preprocess(frame, 1000, SIGNAL_CONFIG)).toMatchObject({ fresh: true, valid: true });
    expect(preprocess(frame, 1500, SIGNAL_CONFIG)).toMatchObject({ fresh: true, valid: true });
  });

  it('marks frames stale after a 600 ms gap (staleAfterMs = 500)', () => {
    const frame = makeFrame({ t: 1000 });
    const afterGap = preprocess(frame, 1600, SIGNAL_CONFIG);
    expect(afterGap.fresh).toBe(false);
    expect(afterGap.valid).toBe(true);
  });

  it('rejects frames with NaN or negative band powers', () => {
    const nanFrame = makeFrame({ t: 1000, bands: { alpha: Number.NaN } });
    const negFrame = makeFrame({ t: 1000, bands: { beta: -0.1 } });

    expect(preprocess(nanFrame, 1000, SIGNAL_CONFIG)).toMatchObject({ fresh: false, valid: false });
    expect(preprocess(negFrame, 1000, SIGNAL_CONFIG)).toMatchObject({ fresh: false, valid: false });
  });

  it('rejects frames with NaN or negative PSD bins', () => {
    const badSpectrum = makeFrame({
      t: 1000,
      spectrum: { freqsHz: [4, 8, 13], psd: [1, -0.5, 1] },
    });
    expect(preprocess(badSpectrum, 1000, SIGNAL_CONFIG)).toMatchObject({ fresh: false, valid: false });
  });

  it('rejects a missing or malformed spectrum instead of throwing', () => {
    const base = makeFrame({ t: 1000 });
    const { spectrum: _spectrum, ...noSpectrum } = base;
    for (const frame of [noSpectrum, { ...base, spectrum: {} }, { ...base, spectrum: 5 }]) {
      expect(preprocess(frame as unknown as BandFrame, 1000, SIGNAL_CONFIG)).toMatchObject({ fresh: false, valid: false });
    }
  });
});
