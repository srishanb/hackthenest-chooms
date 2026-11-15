/**
 * Makes a frame small enough to store: three significant digits and no spectrum above 40 Hz.
 *
 * Why: the board band-passes 1-40 Hz and no feature reads above 30 Hz, so the dropped bins carry
 * nothing, and rounding moves a band sum by under 0.1 %. A 60 s preset is about 0.8 MB instead of 3 MB.
 */
import type { BandFrame } from '../../src/shared/contracts/signal-internal';

export const MAX_SPECTRUM_HZ = 40;
const round3 = (value: number): number => Number(value.toPrecision(3));
const roundOrNull = (value: number | null): number | null => (value === null ? null : round3(value));

export function shrinkFrame(frame: BandFrame, t: number): BandFrame {
  const spectrum = frame.spectrum;
  const keep = spectrum ? spectrum.freqsHz.filter((f) => f <= MAX_SPECTRUM_HZ).length : 0;
  return {
    t: Math.round(t),
    bands: {
      delta: round3(frame.bands.delta),
      theta: round3(frame.bands.theta),
      alpha: round3(frame.bands.alpha),
      beta: round3(frame.bands.beta),
      gamma: round3(frame.bands.gamma),
    },
    spectrum: spectrum ? { freqsHz: spectrum.freqsHz.slice(0, keep), psd: spectrum.psd.slice(0, keep).map(round3) } : null,
    contactGood01: roundOrNull(frame.contactGood01),
    packetLoss01: roundOrNull(frame.packetLoss01),
    source: frame.source,
  };
}
