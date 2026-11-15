import { describe, expect, it, vi } from 'vitest';
import { SIGNAL_CONFIG } from '../../config/signal.config';
import type { BandFrame } from '../../shared/contracts/signal-internal';
import { createPiEEGAdapter, type AdapterCallbacks, type PiEEGAdapter } from '../sources/pieeg-adapter';
import { createPiEEGSource } from '../sources/pieeg-source';
import type { PiEEGBandPowersRaw, PiEEGConstructor, PiEEGInstance } from '../vendor/pieeg-types';

const POWERS: PiEEGBandPowersRaw = { Delta: 1, Theta: 1, Alpha: 1, Beta: 1, Gamma: 1 };

/** A fake SDK that captures connectBLE's options and lets tests fire its callbacks. */
function makeFakeSdk(connectBLE?: () => Promise<unknown>) {
  const bleOptions: unknown[] = [];
  const cb: { bands?: (p: PiEEGBandPowersRaw, s: { psd: number[]; freqs: number[] }) => void; error?: (e: unknown) => void; disconnect?: () => void } = {};
  class FakePiEEG implements PiEEGInstance {
    connectSimulator = async () => undefined;
    connectBLE = async (options?: { device?: string }) => {
      bleOptions.push(options);
      return connectBLE ? connectBLE() : undefined;
    };
    disconnect = vi.fn();
    onBandPowers = (fn: typeof cb.bands) => void (cb.bands = fn);
    onError = (fn: (e: unknown) => void) => void (cb.error = fn);
    onDisconnect = (fn: () => void) => void (cb.disconnect = fn);
    triggerSimEvent = () => undefined;
    getContactQuality = () => [{ status: 'good' as const }];
    getStats = () => ({ packetLossRate: 0 });
  }
  return { Ctor: FakePiEEG as unknown as PiEEGConstructor, bleOptions, cb };
}

const withBluetooth = { bluetooth: {} };

describe('PiEEGSource', () => {
  it('calls connectBLE with device octopus-16 and tags frames LIVE_EEG', async () => {
    const sdk = makeFakeSdk();
    const source = createPiEEGSource({ config: SIGNAL_CONFIG, navigatorLike: withBluetooth, createAdapter: (c, cbs) => createPiEEGAdapter(c, cbs, sdk.Ctor) });
    const frames: BandFrame[] = [];
    await source.start((f) => frames.push(f));
    expect(source.kind).toBe('LIVE_EEG');
    expect(sdk.bleOptions).toEqual([{ device: 'octopus-16' }]);
    sdk.cb.bands?.(POWERS, { psd: [1], freqs: [10] });
    expect(frames).toHaveLength(1);
    expect(frames[0]?.source).toBe('LIVE_EEG');
  });

  it('starts connecting synchronously so the click gesture is still valid', () => {
    const sdk = makeFakeSdk();
    const source = createPiEEGSource({ config: SIGNAL_CONFIG, navigatorLike: withBluetooth, createAdapter: (c, cbs) => createPiEEGAdapter(c, cbs, sdk.Ctor) });
    void source.start(() => {});
    expect(sdk.bleOptions).toHaveLength(1); // no await happened before connectBLE
  });

  it('gives a readable error when Web Bluetooth is missing', async () => {
    const source = createPiEEGSource({ config: SIGNAL_CONFIG, navigatorLike: {} });
    await expect(source.start(() => {})).rejects.toThrow(/Web Bluetooth/);
  });

  it('turns a cancelled picker into a readable error and can be started again', async () => {
    let calls = 0;
    const sdk = makeFakeSdk(async () => {
      calls += 1;
      if (calls === 1) throw Object.assign(new Error('User cancelled the requestDevice() chooser.'), { name: 'NotFoundError' });
    });
    const source = createPiEEGSource({ config: SIGNAL_CONFIG, navigatorLike: withBluetooth, createAdapter: (c, cbs) => createPiEEGAdapter(c, cbs, sdk.Ctor) });
    await expect(source.start(() => {})).rejects.toThrow(/no board was chosen/i);
    await expect(source.start(() => {})).resolves.toBeUndefined();
  });

  it('stops itself and reports when the SDK disconnects or errors', async () => {
    const sdk = makeFakeSdk();
    const onDisconnect = vi.fn();
    const onError = vi.fn();
    const source = createPiEEGSource({ config: SIGNAL_CONFIG, navigatorLike: withBluetooth, onDisconnect, onError, createAdapter: (c, cbs) => createPiEEGAdapter(c, cbs, sdk.Ctor) });
    await source.start(() => {});
    sdk.cb.error?.(new Error('boom'));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onDisconnect).toHaveBeenCalledTimes(1); // an error ends the source as well
    sdk.cb.disconnect?.();
    expect(onDisconnect).toHaveBeenCalledTimes(1); // only once
  });

  it('stop() disconnects the adapter', async () => {
    const disconnect = vi.fn();
    const adapter: PiEEGAdapter = { connect: async () => undefined, disconnect, triggerSimEvent: () => undefined };
    const source = createPiEEGSource({ config: SIGNAL_CONFIG, navigatorLike: withBluetooth, createAdapter: (_c: unknown, _cb: AdapterCallbacks) => adapter });
    await source.start(() => {});
    source.stop();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
