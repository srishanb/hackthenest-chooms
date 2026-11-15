/**
 * The real PiEEG SDK simulator (public/vendor/pieeg.js) on a virtual clock with a seeded random source.
 *
 * Why: the built-in presets must be data from the actual Octopus 16 simulator, the same code that runs in
 * the browser (FFT, filters, band powers), yet identical every time they are built. The SDK only depends on
 * four things for time and noise: setInterval, performance.now, Date.now and Math.random. The vendored file
 * is evaluated as a plain script with stand-ins for those four, so nothing waits in real time and nothing is
 * random. The SDK file itself is not modified.
 */
import { readFileSync } from 'node:fs';
import { SIGNAL_CONFIG } from '../../src/config/signal.config';
import type { BandFrame } from '../../src/shared/contracts/signal-internal';
import { createPiEEGAdapter, type PiEEGAdapter } from '../../src/signal/sources/pieeg-adapter';
import type { PiEEGConstructor, PiEEGSimEvent } from '../../src/signal/vendor/pieeg-types';

interface VirtualTimer {
  id: number;
  due: number;
  every: number;
  run: () => void;
}

/** A clock that only moves when `advance` is called, running timers in due-time order. */
export function createVirtualClock(startMs = 1000) {
  let now = startMs;
  let nextId = 1;
  const timers = new Map<number, VirtualTimer>();
  return {
    now: (): number => now,
    setInterval(run: () => void, every: number): number {
      const id = nextId++;
      timers.set(id, { id, due: now + every, every: Math.max(1, every), run });
      return id;
    },
    clearInterval(id: number): void {
      timers.delete(id);
    },
    advance(ms: number): void {
      const end = now + ms;
      for (;;) {
        let next: VirtualTimer | undefined;
        for (const timer of timers.values()) if (timer.due <= end && (!next || timer.due < next.due || (timer.due === next.due && timer.id < next.id))) next = timer;
        if (!next) break;
        now = next.due;
        next.due += next.every;
        next.run();
      }
      now = end;
    },
  };
}

/** mulberry32: a small seeded random generator. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface VirtualSimulator {
  frames: BandFrame[];
  /** Move the virtual clock forward; frames arrive in `frames` as the SDK produces them. */
  advance(ms: number): void;
  trigger(type: PiEEGSimEvent, value?: boolean | number): void;
  now(): number;
  stop(): void;
}

/** A fresh SDK, adapter and simulator connection. Same seed, same frames. */
export async function startVirtualSimulator(seed: number): Promise<VirtualSimulator> {
  const clock = createVirtualClock();
  const random = seededRandom(seed);
  const math = Object.assign(Object.create(Math) as Math, { random });
  const stamp = { now: () => 1_700_000_000_000 + clock.now() };
  const perf = { now: () => clock.now() };
  const scope: { PiEEG?: PiEEGConstructor } = {};
  const source = readFileSync(new URL('../../public/vendor/pieeg.js', import.meta.url), 'utf8');
  new Function('window', 'setInterval', 'clearInterval', 'performance', 'Date', 'Math', source)(scope, clock.setInterval, clock.clearInterval, perf, stamp, math);
  if (!scope.PiEEG) throw new Error('pieeg.js did not define PiEEG');

  const frames: BandFrame[] = [];
  const adapter: PiEEGAdapter = createPiEEGAdapter(
    SIGNAL_CONFIG,
    { onFrame: (frame) => frames.push(frame), onError: (error) => { throw error; }, onDisconnect: () => {} },
    scope.PiEEG,
    clock.now,
  );
  await adapter.connect('simulator');
  return {
    frames,
    advance: (ms) => clock.advance(ms),
    trigger: (type, value) => adapter.triggerSimEvent(type, value),
    now: clock.now,
    stop: () => adapter.disconnect(),
  };
}
