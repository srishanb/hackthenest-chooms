/**
 * Runs the vendored PiEEG simulator on a virtual clock with a seeded random source.
 *
 * Why: the SDK simulator reads Math.random, Date.now, performance.now and setInterval. Replacing
 * those four for the length of a run makes the output identical on every machine and lets a
 * 45 s timeline finish in about a second. It is the same synthetic board, filters and FFT the
 * game uses; only time and noise are controlled. Never imported by the game.
 */
import { readFileSync } from 'node:fs';
import { SIGNAL_CONFIG } from '../../src/config/signal.config';
import type { BandFrame } from '../../src/shared/contracts/signal-internal';
import { shrinkFrame } from '../../src/signal/presets/frame-shrink';
import { createPiEEGAdapter } from '../../src/signal/sources/pieeg-adapter';
import type { PiEEGConstructor, PiEEGSimEvent } from '../../src/signal/vendor/pieeg-types';

export interface SimEvent {
  /** Milliseconds after the timeline starts. */
  atMs: number;
  type: PiEEGSimEvent;
  /** Same meaning as the SDK's `triggerSimEvent` value: a boolean toggle, or a duration in ms. */
  value?: boolean | number;
}

export interface SimTimeline {
  durationMs: number;
  events: readonly SimEvent[];
  seed: number;
}

/** Time before the timeline starts so the SDK's filters and FFT window have settled. */
const WARMUP_MS = 4000;
const START_MS = 1000;

function loadSdk(): PiEEGConstructor {
  const scope: { PiEEG?: PiEEGConstructor } = {};
  const source = readFileSync(new URL('../../public/vendor/pieeg.js', import.meta.url), 'utf8');
  new Function('window', source)(scope);
  if (!scope.PiEEG) throw new Error('pieeg.js did not define PiEEG');
  return scope.PiEEG;
}

/** mulberry32: a tiny seeded generator, enough for simulator noise. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Timer {
  at: number;
  everyMs: number | null;
  run: () => void;
}

export async function runSimulation(timeline: SimTimeline): Promise<BandFrame[]> {
  const PiEEG = loadSdk();
  const timers: Timer[] = [];
  let nowMs = START_MS;
  const frames: BandFrame[] = [];

  const g = globalThis as unknown as Record<string, unknown>;
  const saved = {
    random: Math.random,
    dateNow: Date.now,
    perfNow: performance.now.bind(performance),
    setInterval: g['setInterval'],
    clearInterval: g['clearInterval'],
  };
  Math.random = seededRandom(timeline.seed);
  Date.now = () => 1_700_000_000_000 + nowMs;
  performance.now = () => nowMs;
  g['setInterval'] = (run: () => void, everyMs: number) => {
    const timer: Timer = { at: nowMs + everyMs, everyMs, run };
    timers.push(timer);
    return timer;
  };
  g['clearInterval'] = (handle: Timer) => {
    const index = timers.indexOf(handle);
    if (index >= 0) timers.splice(index, 1);
  };

  const origin = START_MS + WARMUP_MS;
  const adapter = createPiEEGAdapter(
    SIGNAL_CONFIG,
    {
      onFrame: (frame) => {
        if (nowMs < origin) return;
        frames.push(shrinkFrame(frame, nowMs - origin));
      },
      onError: (error) => {
        throw error;
      },
      onDisconnect: () => {},
    },
    PiEEG,
    () => nowMs,
  );

  try {
    await adapter.connect('simulator');
    for (const event of timeline.events) {
      timers.push({ at: origin + event.atMs, everyMs: null, run: () => adapter.triggerSimEvent(event.type, event.value) });
    }
    const end = origin + timeline.durationMs;
    for (;;) {
      let next: Timer | undefined;
      for (const timer of timers) if (next === undefined || timer.at < next.at) next = timer;
      if (next === undefined || next.at > end) break;
      nowMs = next.at;
      if (next.everyMs === null) timers.splice(timers.indexOf(next), 1);
      else next.at += next.everyMs;
      next.run();
    }
  } finally {
    adapter.disconnect();
    Math.random = saved.random;
    Date.now = saved.dateNow;
    performance.now = saved.perfNow;
    g['setInterval'] = saved.setInterval;
    g['clearInterval'] = saved.clearInterval;
  }
  return frames;
}
