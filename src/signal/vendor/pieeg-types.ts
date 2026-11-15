/**
 * Typed subset of the vendored PiEEG SDK (public/vendor/pieeg.js, version 1.3.0-octopus).
 *
 * Why: the SDK is plain JavaScript that defines a global `PiEEG`. We describe only the
 * handful of members we call, and read the global in exactly one function, so nothing
 * else in the repo ever touches `window.PiEEG`. Shapes were read from the pinned source.
 */

export interface PiEEGBandPowersRaw {
  Delta: number;
  Theta: number;
  Alpha: number;
  Beta: number;
  Gamma: number;
}

/** The second argument of onBandPowers. The arrays are typed arrays (or null before the first FFT). */
export interface PiEEGSpectrumRaw {
  psd: ArrayLike<number> | null;
  freqs: ArrayLike<number> | null;
}

export interface PiEEGContactRaw {
  status: 'good' | 'railed' | 'flat';
}

export interface PiEEGStatsRaw {
  packetLossRate: number;
}

export type PiEEGSimEvent = 'alpha' | 'blink' | 'clench' | 'noisy_pin';

export interface PiEEGOptions {
  updateHz: number;
  filter: {
    bandpass: { low: number; high: number; order: number };
    /** Mains frequency in Hz, or false for off. The SDK default is off. */
    notch: number | false;
  };
}

export interface PiEEGInstance {
  /** Starts the built-in simulator. Does not need a user click. */
  connectSimulator(options?: { device?: string }): Promise<unknown>;
  /** Opens the Bluetooth picker. Must be called from a click handler. */
  connectBLE(options?: { device?: string }): Promise<unknown>;
  disconnect(): void;
  onBandPowers(callback: (powers: PiEEGBandPowersRaw, spectrum: PiEEGSpectrumRaw) => void): void;
  onError(callback: (error: unknown) => void): void;
  onDisconnect(callback: () => void): void;
  triggerSimEvent(type: PiEEGSimEvent, value?: boolean | number): unknown;
  getContactQuality(): PiEEGContactRaw[];
  getStats(): PiEEGStatsRaw;
}

export type PiEEGConstructor = new (options?: PiEEGOptions) => PiEEGInstance;

/** The one place the global is read. Throws a clear error if index.html did not load the script. */
export function getPiEEGConstructor(scope: { PiEEG?: PiEEGConstructor } = globalThis as { PiEEG?: PiEEGConstructor }): PiEEGConstructor {
  if (typeof scope.PiEEG !== 'function') {
    throw new Error('PiEEG SDK not loaded: index.html must include <script src="./vendor/pieeg.js"></script> before the app');
  }
  return scope.PiEEG;
}
