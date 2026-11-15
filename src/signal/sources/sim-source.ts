/**
 * Simulator source: the PiEEG SDK's built-in synthetic board, driven from the keyboard.
 *
 * Why the SDK's simulator and not our own: it runs the same filters and FFT as the real
 * board, so everything downstream is exercised the same way. It needs no Bluetooth and no
 * click. The keys come from config (default 1 to 4), never Space, A or C, because Space is
 * the jump key.
 */
import type { SignalConfig } from '../../shared/contracts/config';
import type { BandFrame, Source } from '../../shared/contracts/signal-internal';
import type { PiEEGSimEvent } from '../vendor/pieeg-types';
import { createPiEEGAdapter, type PiEEGAdapter } from './pieeg-adapter';

type KeyTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

export interface SimSourceDeps {
  config: SignalConfig;
  /** Where key presses are heard. Defaults to `window`. */
  keyTarget?: KeyTarget;
  /** Builds the adapter. Tests pass a fake. */
  createAdapter?: typeof createPiEEGAdapter;
  onError?: (error: unknown) => void;
}

export interface KeyLegendEntry {
  code: string;
  label: string;
}

/** What each simulator key does, for the debug overlay. */
export function simKeyLegend(config: SignalConfig): KeyLegendEntry[] {
  const { alpha, clench, blink, noisyPin } = config.simKeys;
  return [
    { code: alpha, label: 'alpha boost (toggle)' },
    { code: clench, label: 'jaw clench' },
    { code: blink, label: 'eye blink' },
    { code: noisyPin, label: 'noisy pin (toggle)' },
  ];
}

export function createSimSource(deps: SimSourceDeps): Source {
  const { config } = deps;
  const keyTarget: KeyTarget = deps.keyTarget ?? window;
  const build = deps.createAdapter ?? createPiEEGAdapter;
  const events: Record<string, PiEEGSimEvent> = {
    [config.simKeys.alpha]: 'alpha',
    [config.simKeys.clench]: 'clench',
    [config.simKeys.blink]: 'blink',
    [config.simKeys.noisyPin]: 'noisy_pin',
  };

  let adapter: PiEEGAdapter | null = null;
  const onKeyDown = (event: Event): void => {
    const key = event as KeyboardEvent;
    const simEvent = key.repeat ? undefined : events[key.code];
    if (simEvent) adapter?.triggerSimEvent(simEvent);
  };

  return {
    kind: 'SIMULATED',
    async start(onFrame: (frame: BandFrame) => void): Promise<void> {
      if (adapter) return;
      adapter = build(config, {
        onFrame,
        onError: (error) => deps.onError?.(error),
        onDisconnect: () => {},
      });
      keyTarget.addEventListener('keydown', onKeyDown);
      await adapter.connect('simulator');
    },
    stop(): void {
      keyTarget.removeEventListener('keydown', onKeyDown);
      adapter?.disconnect();
      adapter = null;
    },
  };
}
