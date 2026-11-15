/**
 * Replay source: plays a recording's frames back through the pipeline.
 *
 * Why: lets us test and compare algorithms without anyone wearing the board, and run the
 * evaluation script headlessly. Frames keep the timestamps they were recorded with (so
 * the pipeline, not this file, decides what "now" means for replay); only `source` is
 * rewritten to 'REPLAY' so the on-screen badge never claims a replay is live.
 */
import type { BandFrame, Source } from '../../shared/contracts/signal-internal';

export interface ReplaySourceDeps {
  frames: readonly BandFrame[];
  /** 1 is real time, 4 is four times faster, Infinity delivers everything at once (headless). Default 1. */
  speed?: number;
  /** Called after the last frame. */
  onEnd?: () => void;
  /** Timer functions, replaceable in tests. */
  setTimer?: (callback: () => void, delayMs: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export function createReplaySource(deps: ReplaySourceDeps): Source {
  const speed = deps.speed ?? 1;
  if (!(speed > 0)) throw new Error('replay speed must be greater than 0');
  const setTimer = deps.setTimer ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  const clearTimer = deps.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  let handle: unknown = null;
  let stopped = false;

  return {
    kind: 'REPLAY',

    async start(onFrame): Promise<void> {
      stopped = false;
      const emit = (frame: BandFrame): void => onFrame({ ...frame, source: 'REPLAY' });

      if (speed === Number.POSITIVE_INFINITY) {
        for (const frame of deps.frames) {
          if (stopped) return;
          emit(frame);
        }
        deps.onEnd?.();
        return;
      }

      const step = (index: number): void => {
        const frame = deps.frames[index];
        if (stopped) return;
        if (!frame) {
          deps.onEnd?.();
          return;
        }
        emit(frame);
        const next = deps.frames[index + 1];
        handle = next ? setTimer(() => step(index + 1), Math.max(0, (next.t - frame.t) / speed)) : setTimer(() => step(index + 1), 0);
      };
      step(0);
    },

    stop(): void {
      stopped = true;
      if (handle !== null) clearTimer(handle);
      handle = null;
    },
  };
}
