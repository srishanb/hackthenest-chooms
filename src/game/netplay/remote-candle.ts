/**
 * The other player's candle, rebuilt from the states it sends: a buffer of received states played back a little
 * in the past, blended between, guessed ahead for a short while when updates are late, and corrected smoothly.
 *
 * - Playback time: shared now minus a delay. The delay is the configured base plus the measured travel time of
 *   updates and twice their spread (capped), eased slowly, so two updates nearly always bracket the playback time.
 * - Between two states: position and speed are blended linearly (a step of 50 ms is short next to a jump).
 * - Past the newest state: guessed ahead from its speed (with gravity in the air) for at most `maxExtrapolateMs`,
 *   then held there.
 * - Correction: when a new state moves where the candle is shown right now, the difference is kept as an offset
 *   that fades with `correctionTauMs`, so the candle glides to the new place; above `snapPx` it jumps (a restart).
 * Pure apart from its own buffer; never touches the local candle.
 */
import type { NetplayConfig } from '../../config/netplay.config';
import type { BodyState } from './protocol';

export interface ShownCandle {
  /** The state at the playback time, with the smoothed position. */
  body: BodyState;
  /** Playback time (shared ms) the state is for. */
  atMs: number;
  /** True when it was guessed ahead of the newest update. */
  extrapolated: boolean;
}

export interface RemoteCandle {
  /** A state stamped `atMs` (sender's shared time) arrived at shared time `nowMs`. */
  push(body: BodyState, atMs: number, nowMs: number): void;
  /** Where to show the candle at shared time `nowMs`, or null before the first state. */
  at(nowMs: number): ShownCandle | null;
  /** The current playback delay (ms). */
  delayMs(): number;
  /** Forget everything (the other player left or a new one joined). */
  clear(): void;
}

interface Sample { atMs: number; body: BodyState }
const KEEP = 40;

export function createRemoteCandle(config: NetplayConfig, gravityY: number): RemoteCandle {
  let samples: Sample[] = [];
  let latency = 0, spread = 0, delay = config.playbackDelayMs, haveLatency = false;
  let offsetX = 0, offsetY = 0, lastAt = Number.NEGATIVE_INFINITY;

  /** The raw (uncorrected) state at playback time `t`. */
  function raw(t: number): { body: BodyState; extrapolated: boolean } | null {
    if (samples.length === 0) return null;
    const newest = samples[samples.length - 1]!;
    if (t >= newest.atMs) {
      const ahead = Math.min(t - newest.atMs, config.maxExtrapolateMs) / 1000;
      const b = newest.body;
      const vy = b.grounded ? 0 : b.vy + gravityY * ahead;
      const y = b.grounded ? b.y : b.y + b.vy * ahead + 0.5 * gravityY * ahead * ahead;
      return { body: { ...b, x: b.x + b.vx * ahead, y, vy }, extrapolated: ahead > 0 };
    }
    let i = samples.length - 1;
    while (i > 0 && samples[i - 1]!.atMs > t) i--;
    const later = samples[i]!;
    const earlier = samples[i - 1];
    if (!earlier) return { body: later.body, extrapolated: false };
    const span = later.atMs - earlier.atMs;
    const f = span > 0 ? (t - earlier.atMs) / span : 1;
    const a = earlier.body, b = later.body;
    const mix = (p: number, q: number): number => p + (q - p) * f;
    // A restart or a teleport between the two states is not blended across.
    const far = Math.hypot(b.x - a.x, b.y - a.y) > config.snapPx;
    const pick = f < 0.5 && !far ? a : b;
    return { body: far ? (f < 0.5 ? a : b) : { ...pick, x: mix(a.x, b.x), y: mix(a.y, b.y), vx: mix(a.vx, b.vx), vy: mix(a.vy, b.vy),
      charge01: mix(a.charge01, b.charge01), fuel01: mix(a.fuel01, b.fuel01) }, extrapolated: false };
  }

  const playback = (nowMs: number): number => nowMs - delay;

  return {
    push(body, atMs, nowMs) {
      const before = raw(playback(nowMs));
      const travel = nowMs - atMs;
      if (!haveLatency) { latency = travel; haveLatency = true; } else {
        spread += (Math.abs(travel - latency) - spread) * 0.1;
        latency += (travel - latency) * 0.1;
      }
      // Keep the buffer in time order (a late, reordered state slots in); drop a duplicate time.
      const index = samples.findIndex((sample) => sample.atMs >= atMs);
      if (index === -1) samples.push({ atMs, body });
      else if (samples[index]!.atMs !== atMs) samples.splice(index, 0, { atMs, body });
      if (samples.length > KEEP) samples = samples.slice(samples.length - KEEP);
      const after = raw(playback(nowMs));
      if (before && after) {
        offsetX += before.body.x - after.body.x;
        offsetY += before.body.y - after.body.y;
        if (Math.hypot(offsetX, offsetY) > config.snapPx) { offsetX = 0; offsetY = 0; }
      }
    },
    at(nowMs) {
      // Nothing to show yet: leave the delay alone, so the first state sets it from its own travel time.
      if (samples.length === 0) return null;
      const want = Math.min(config.maxPlaybackDelayMs, config.playbackDelayMs + Math.max(0, latency) + 2 * spread);
      if (lastAt !== Number.NEGATIVE_INFINITY) {
        const dt = Math.max(0, nowMs - lastAt);
        // The delay eases toward what the connection needs at a tenth of real time, so playback never jumps.
        delay += Math.max(-dt * 0.1, Math.min(dt * 0.1, want - delay));
        const fade = Math.exp(-dt / Math.max(1, config.correctionTauMs));
        offsetX *= fade; offsetY *= fade;
      } else delay = want;
      lastAt = nowMs;
      const t = playback(nowMs);
      const shown = raw(t);
      if (!shown) return null;
      return { body: { ...shown.body, x: shown.body.x + offsetX, y: shown.body.y + offsetY }, atMs: t, extrapolated: shown.extrapolated };
    },
    delayMs: () => delay,
    clear() { samples = []; offsetX = 0; offsetY = 0; haveLatency = false; latency = 0; spread = 0; lastAt = Number.NEGATIVE_INFINITY; },
  };
}
