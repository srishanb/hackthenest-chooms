/**
 * The "still" signal: a `SignalHandle` that never reads a device, a simulator or a recording.
 *
 * Why: the game-only variant of the game has no EEG at all, but the game and UI are typed to
 * receive a signal handle. This one always reports the neutral, fixed-mode state, so every
 * consumer takes the path it already has for "no usable signal": effects sit at neutral and
 * nothing waits on calibration. No pipeline runs, no Bluetooth or network code is loaded.
 */
import type { ComposureState } from '../shared/contracts/composure';
import type { SignalHandle } from '../shared/contracts/signal-api';

export function createStillSignal(neutralIntensity: number, now: () => number = () => performance.now()): SignalHandle {
  const state = (): ComposureState => ({
    intensity: neutralIntensity,
    resting: 0,
    restingActive: false,
    quality: 0,
    valid: false,
    sampleAgeMs: Number.POSITIVE_INFINITY,
    held: false,
    mode: 'fixed',
    calibrated: false,
    source: 'SIMULATED',
    algo: 'none',
    t: now(),
  });
  const unavailable = (): never => { throw new Error('This build has no signal input.'); };
  return {
    reader: { getState: state, subscribe: () => () => {} },
    control: {
      connect: async () => {},
      disconnect: () => {},
      setMode: () => {},
      calibrate: async (step) => ({ step, ok: false, reasonKey: 'calib.fail.unknown' }),
    },
    getDiagnostics: () => ({ features: {}, thresholds: {}, contactGood01: null, packetLoss01: null }),
    exportRecording: () => '',
    presets: {
      list: async () => [],
      getSelection: () => ({ kind: 'sim' }),
      getLoop: () => false,
      setLoop: () => {},
      select: async () => {},
      saveCurrent: unavailable,
      importText: unavailable,
      exportText: async () => '',
      remove: () => {},
      subscribe: () => () => {},
    },
  };
}
