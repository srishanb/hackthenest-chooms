/**
 * Adapter between the PiEEG SDK and our `BandFrame`.
 *
 * Why: the simulator and the real board go through the same SDK, filters and FFT, so one
 * adapter serves both. Only src/signal/sources/ may import this; the rest of the app sees
 * `BandFrame`s through the `Source` interface and never the SDK.
 */
import type { InputSourceKind } from '../../shared/contracts/composure';
import type { SignalConfig } from '../../shared/contracts/config';
import type { BandFrame } from '../../shared/contracts/signal-internal';
import {
  getPiEEGConstructor,
  type PiEEGBandPowersRaw,
  type PiEEGConstructor,
  type PiEEGContactRaw,
  type PiEEGInstance,
  type PiEEGSimEvent,
  type PiEEGSpectrumRaw,
  type PiEEGStatsRaw,
} from '../vendor/pieeg-types';

const DEVICE = 'octopus-16';

/** Pure conversion of one SDK callback into our frame shape. Exported for tests. */
export function toBandFrame(
  powers: PiEEGBandPowersRaw,
  spectrum: PiEEGSpectrumRaw,
  contact: readonly PiEEGContactRaw[],
  stats: PiEEGStatsRaw,
  source: InputSourceKind,
  t: number,
): BandFrame {
  const good = contact.filter((channel) => channel.status === 'good').length;
  return {
    t,
    bands: { delta: powers.Delta, theta: powers.Theta, alpha: powers.Alpha, beta: powers.Beta, gamma: powers.Gamma },
    spectrum:
      spectrum.psd && spectrum.freqs ? { freqsHz: Array.from(spectrum.freqs), psd: Array.from(spectrum.psd) } : null,
    contactGood01: contact.length > 0 ? good / contact.length : null,
    packetLoss01: Number.isFinite(stats.packetLossRate) ? stats.packetLossRate : null,
    source,
  };
}

export interface AdapterCallbacks {
  onFrame(frame: BandFrame): void;
  onError(error: unknown): void;
  onDisconnect(): void;
}

export interface PiEEGAdapter {
  /** 'simulator' needs no click. 'ble' opens the Bluetooth picker and must run inside a click handler. */
  connect(kind: 'simulator' | 'ble'): Promise<void>;
  disconnect(): void;
  /** Only meaningful while the simulator is connected. */
  triggerSimEvent(type: PiEEGSimEvent, value?: boolean | number): void;
}

/**
 * @param Ctor the SDK constructor; defaults to the global, tests pass a fake.
 * @param now clock in ms for frame timestamps.
 */
export function createPiEEGAdapter(
  config: SignalConfig,
  callbacks: AdapterCallbacks,
  Ctor: PiEEGConstructor = getPiEEGConstructor(),
  now: () => number = () => performance.now(),
): PiEEGAdapter {
  const eeg: PiEEGInstance = new Ctor({
    updateHz: config.updateHz,
    filter: {
      bandpass: { low: config.filter.bandpassLowHz, high: config.filter.bandpassHighHz, order: config.filter.bandpassOrder },
      notch: config.filter.notchHz ?? false,
    },
  });
  let source: InputSourceKind = 'SIMULATED';

  eeg.onBandPowers((powers, spectrum) => {
    callbacks.onFrame(toBandFrame(powers, spectrum, eeg.getContactQuality(), eeg.getStats(), source, now()));
  });
  eeg.onError((error) => callbacks.onError(error));
  eeg.onDisconnect(() => callbacks.onDisconnect());

  return {
    async connect(kind) {
      source = kind === 'simulator' ? 'SIMULATED' : 'LIVE_EEG';
      await (kind === 'simulator' ? eeg.connectSimulator({ device: DEVICE }) : eeg.connectBLE({ device: DEVICE }));
    },
    disconnect: () => eeg.disconnect(),
    triggerSimEvent: (type, value) => void eeg.triggerSimEvent(type, value),
  };
}
