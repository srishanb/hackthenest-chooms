/**
 * The other player's candle, rebuilt from the states it sends: a buffer of received states played back a little
 * in the past, blended between, guessed ahead for a short while when updates are late, and corrected smoothly.
 *
 * - Playback time: shared now minus a delay. The delay is the configured base plus the measured travel time of
 *   updates and twice their spread (capped), eased slowly, so two updates nearly always bracket the playback time.
 * - Between two states: positions follow a cubic that matches both states' speeds (Hermite: exact for a jump's
 *   arc), and across a landing or a takeoff the flight is traced with gravity to the ground; the rest is blended.
 * - Correction offsets (below) only replace a guess ahead; a late state that fills a gap is used as it is.
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
    let pick = f < 0.5 && !far ? a : b;
    // Positions follow a cubic through both states that also matches their speeds (Hermite), so a turn or a stop
    // between two updates (or across a lost one) is not cut straight across.
    const seconds = span / 1000;
    const curve = (p: number, q: number, vp: number, vq: number): number => {
      const f2 = f * f, f3 = f2 * f;
      return (2 * f3 - 3 * f2 + 1) * p + (f3 - 2 * f2 + f) * seconds * vp + (-2 * f3 + 3 * f2) * q + (f3 - f2) * seconds * vq;
    };
    let x = curve(a.x, b.x, a.vx, b.vx), y = curve(a.y, b.y, a.vy, b.vy);
    let grounded = pick.grounded;
    if (!a.grounded && b.grounded) {
      // A landing in between: the candle flew on from the earlier state until it met the ground it stands on later.
      const since = (t - earlier.atMs) / 1000;
      y = Math.min(b.y, a.y + a.vy * since + 0.5 * gravityY * since * since);
      const toward = b.x - a.x;
      x = a.x + Math.sign(toward) * Math.min(Math.abs(toward), Math.abs(a.vx * since));
      grounded = y >= b.y;
      pick = grounded ? b : a;
    } else if (a.grounded && !b.grounded) {
      // A takeoff in between: traced back from the later state, never below the ground it left.
      const until = (later.atMs - t) / 1000;
      y = Math.min(a.y, b.y - b.vy * until + 0.5 * gravityY * until * until);
      const toward = a.x - b.x;
      x = b.x + Math.sign(toward) * Math.min(Math.abs(toward), Math.abs(b.vx * until));
      // Standing only while still on the ground it left: a head that has begun to rise carries nobody.
      grounded = y >= a.y;
      pick = grounded ? a : b;
    }
    return { body: far ? (f < 0.5 ? a : b) : { ...pick, x, y, grounded, vx: mix(a.vx, b.vx), vy: mix(a.vy, b.vy),
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
      // Only a guess ahead that a real state replaces is blended away; a state that fills a gap is simply better.
      if (before && after && before.extrapolated) {
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
