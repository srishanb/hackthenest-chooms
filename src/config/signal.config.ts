/**
 * Every tunable number in the signal pipeline, with units. Owner: signal lane (Srishan).
 *
 * Why one file: thresholds scattered through code cannot be tuned at 4 AM. Every value
 * here is a STARTING GUESS until it has been checked on a real head (P3).
 */
import type { SignalConfig } from '../shared/contracts/config';

export const SIGNAL_CONFIG: SignalConfig = {
  defaultSource: 'SIMULATED',
  defaultAlgo: 'intensity-v2',
  updateHz: 12, // matches the pieeg.js default band-power rate
  filter: {
    bandpassLowHz: 1,
    bandpassHighHz: 40, // pieeg.js default; its "Gamma" band (30-100 Hz) is mostly cut by this
    bandpassOrder: 5,
    notchHz: 60, // US mains. pieeg.js leaves the notch OFF unless told
  },
  staleAfterMs: 500,
  qualityFloor: 0.5,
  smoothing: { intensityTauMs: 3000, restingTauMs: 800 },
  restingThreshold: { on: 0.6, off: 0.45 },
  neutralIntensity: 0.5,
  calibration: { activeMs: 12_000, restingMs: 12_000 },
  // Not Space, A or C: the PiEEG starter binds those, and Space is our jump key.
  simKeys: { alpha: 'Digit1', clench: 'Digit2', blink: 'Digit3', noisyPin: 'Digit4' },
};
