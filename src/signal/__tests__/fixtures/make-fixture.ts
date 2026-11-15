/**
 * Synthetic BandFrame generator for signal-stage unit tests.
 *
 * Why: lets P1.2 and P1.3 unit tests run deterministically and headlessly without
 * touching the PiEEG SDK or browser timers.
 */
import type { BandFrame, BandPowers } from '../../../shared/contracts/signal-internal';

export interface SpectrumOptions {
  /** Frequency resolution in Hz (default 0.5 Hz, 0..64 Hz). */
  dfHz?: number;
  /** Max frequency in Hz (default 64 Hz). */
  maxHz?: number;
  /** Target power density per band before optional broadband/mains noise. */
  bands?: Partial<BandPowers>;
  /** Uniform broadband power added across all bins (simulates muscle clench). */
  broadbandNoise?: number;
  /** Narrowband 50 Hz spike power (simulates a noisy pin; outside theta/alpha/beta). */
  mains50HzSpike?: number;
}

export interface FrameOptions {
  t?: number;
  bands?: Partial<BandPowers>;
  spectrum?: { freqsHz: number[]; psd: number[] } | null;
  spectrumOptions?: SpectrumOptions;
  contactGood01?: number | null;
  packetLoss01?: number | null;
  source?: BandFrame['source'];
}

const DEFAULT_BANDS: BandPowers = {
  delta: 1.0,
  theta: 1.0,
  alpha: 1.0,
  beta: 1.0,
  gamma: 0.2,
};

/** Build a synthetic PSD spectrum with configurable per-band power densities. */
export function makeSpectrum(options: SpectrumOptions = {}): { freqsHz: number[]; psd: number[] } {
  const dfHz = options.dfHz ?? 0.5;
  const maxHz = options.maxHz ?? 64;
  const bands = { ...DEFAULT_BANDS, ...options.bands };
  const broadband = options.broadbandNoise ?? 0;
  const mains50 = options.mains50HzSpike ?? 0;

  const freqsHz: number[] = [];
  const psd: number[] = [];

  for (let f = 0; f <= maxHz + 1e-9; f += dfHz) {
    const freq = Math.round(f * 1000) / 1000;
    freqsHz.push(freq);

    let power = broadband;
    if (freq >= 0.5 && freq < 4) power += bands.delta / (3.5 / dfHz);
    else if (freq >= 4 && freq < 8) power += bands.theta / (4 / dfHz);
    else if (freq >= 8 && freq < 13) power += bands.alpha / (5 / dfHz);
    else if (freq >= 13 && freq <= 30) power += bands.beta / (17 / dfHz);
    else if (freq > 30 && freq <= 45) power += bands.gamma / (15 / dfHz);

    if (mains50 > 0 && Math.abs(freq - 50) <= dfHz) {
      power += mains50;
    }

    psd.push(power);
  }

  return { freqsHz, psd };
}

/** Build a single synthetic BandFrame. */
export function makeFrame(options: FrameOptions = {}): BandFrame {
  const bands: BandPowers = { ...DEFAULT_BANDS, ...options.bands };
  const spectrum =
    options.spectrum !== undefined
      ? options.spectrum
      : makeSpectrum({ bands, ...options.spectrumOptions });

  return {
    t: options.t ?? 0,
    bands,
    spectrum,
    contactGood01: options.contactGood01 !== undefined ? options.contactGood01 : 1,
    packetLoss01: options.packetLoss01 !== undefined ? options.packetLoss01 : 0,
    source: options.source ?? 'SIMULATED',
  };
}

export interface SequenceOptions {
  startMs?: number;
  durationMs: number;
  hz?: number;
  frame?: (index: number, tMs: number) => FrameOptions;
}

/** Build a sequence of synthetic BandFrames at `hz` (default 12 Hz). */
export function makeSequence(options: SequenceOptions): BandFrame[] {
  const startMs = options.startMs ?? 0;
  const hz = options.hz ?? 12;
  const stepMs = 1000 / hz;
  const count = Math.floor(options.durationMs / stepMs);
  const frames: BandFrame[] = [];

  for (let i = 0; i < count; i += 1) {
    const t = Math.round((startMs + i * stepMs) * 1000) / 1000;
    const overrides = options.frame ? options.frame(i, t) : {};
    frames.push(makeFrame({ ...overrides, t: overrides.t ?? t }));
  }

  return frames;
}
