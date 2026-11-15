/**
 * Live board source: a `Source` over the PiEEG adapter's Bluetooth connection (Octopus 16).
 *
 * Why: the game and pipeline only know `Source`. This wraps the same adapter the simulator uses,
 * but calls `connect('ble')`, which opens the Bluetooth picker and so must start inside a click
 * handler. `start()` therefore calls the adapter before any `await`. An SDK error or disconnect
 * ends the source and is reported once; the pipeline then sees stale data and raises `signal_lost`.
 * Needs a Chromium browser with Web Bluetooth. Not verified on a real board yet.
 */
import type { SignalConfig } from '../../shared/contracts/config';
import type { BandFrame, Source } from '../../shared/contracts/signal-internal';
import { createPiEEGAdapter, type PiEEGAdapter } from './pieeg-adapter';

export interface PiEEGSourceDeps {
  config: SignalConfig;
  /** Anything with an optional `bluetooth` member. Defaults to `navigator`. Tests pass a stand-in. */
  navigatorLike?: { bluetooth?: unknown };
  /** Builds the adapter. Tests pass a fake. */
  createAdapter?: typeof createPiEEGAdapter;
  onError?: (error: unknown) => void;
  /** Called once when the board disconnects or errors. */
  onDisconnect?: () => void;
}

const NO_BLUETOOTH = 'Web Bluetooth is not available here. Use Chrome or Edge on desktop or Android, over https or localhost.';
const NO_BOARD_CHOSEN = 'No board was chosen. Press Connect Octopus 16 and pick the board in the Bluetooth list.';

function readableConnectError(error: unknown): Error {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotFoundError' || name === 'AbortError') return new Error(NO_BOARD_CHOSEN);
  if (name === 'SecurityError' || name === 'NotAllowedError') return new Error('Bluetooth access was blocked. Allow it for this page and try again.');
  return error instanceof Error ? error : new Error(String(error));
}

export function createPiEEGSource(deps: PiEEGSourceDeps): Source {
  const build = deps.createAdapter ?? createPiEEGAdapter;
  const scope = (deps.navigatorLike ?? navigator) as { bluetooth?: unknown }; // lib.dom has no Web Bluetooth types
  let adapter: PiEEGAdapter | null = null;

  /** Ends the source on an SDK disconnect or error. Safe to call twice. */
  function end(): void {
    if (!adapter) return;
    const finished = adapter;
    adapter = null;
    try {
      finished.disconnect();
    } catch {
      // the link may already be gone
    }
    deps.onDisconnect?.();
  }

  return {
    kind: 'LIVE_EEG',
    start(onFrame: (frame: BandFrame) => void): Promise<void> {
      if (adapter) return Promise.resolve();
      if (!scope.bluetooth) return Promise.reject(new Error(NO_BLUETOOTH));
      const created = build(deps.config, {
        onFrame,
        onError: (error) => {
          deps.onError?.(error);
          end();
        },
        onDisconnect: end,
      });
      adapter = created;
      return created.connect('ble').catch((error: unknown) => {
        if (adapter === created) adapter = null;
        throw readableConnectError(error);
      });
    },
    stop(): void {
      const finished = adapter;
      adapter = null;
      finished?.disconnect();
    },
  };
}
