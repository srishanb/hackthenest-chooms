/**
 * Signal lane entry point. P0 STUB: publishes a slow sine wave instead of real EEG.
 *
 * Why a stub: every other lane can build against the real `ComposureState` contract before
 * any signal processing exists. P1 replaces the body of `createSignal` with the real
 * pipeline (sources, stages, algorithm registry); the return type does not change.
 */
import type { ComposureState } from '../shared/contracts/composure';
import type { SignalConfig } from '../shared/contracts/config';
import type { EventBus } from '../shared/contracts/events';
import type { SignalHandle } from '../shared/contracts/signal-api';

const STUB_PERIOD_MS = 8000;

export function createSignal(_bus: EventBus, config: SignalConfig): SignalHandle {
  const listeners = new Set<(state: ComposureState) => void>();

  let state: ComposureState = {
    intensity: config.neutralIntensity,
    resting: 0,
    restingActive: false,
    quality: 1,
    valid: true,
    sampleAgeMs: 0,
    held: false,
    mode: 'adaptive',
    calibrated: false,
    source: config.defaultSource,
    algo: config.defaultAlgo,
    t: performance.now(),
  };

  function publish(): void {
    const t = performance.now();
    const wave = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / STUB_PERIOD_MS);
    state = {
      ...state,
      intensity: state.mode === 'fixed' ? config.neutralIntensity : wave,
      resting: 1 - wave,
      restingActive: 1 - wave >= config.restingThreshold.on,
      t,
    };
    for (const listener of listeners) listener(state);
  }

  setInterval(publish, 1000 / config.updateHz);

  return {
    reader: {
      getState: () => state,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    control: {
      connect: async () => {},
      disconnect: () => {},
      setMode(mode) {
        state = { ...state, mode };
      },
      calibrate: async (step) => ({ step, ok: true }),
    },
    getDiagnostics: () => ({
      features: { active: state.intensity, resting: state.resting },
      thresholds: { restingOn: config.restingThreshold.on, restingOff: config.restingThreshold.off },
      contactGood01: null,
      packetLoss01: null,
    }),
  };
}
