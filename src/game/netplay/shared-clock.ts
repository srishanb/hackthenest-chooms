/**
 * A clock both games agree on: the host's own clock, which the guest estimates from ping round trips.
 *
 * How: the guest sends `ping{t0}` with its own time; the host answers `pong{t0, hostMs}`; when the answer arrives
 * at the guest's time t1, the host's clock read `hostMs` about halfway through the trip, so the offset is
 * `hostMs - (t0 + t1) / 2`. Of the last few samples the one with the shortest round trip is trusted most (it had
 * the least room for delay on one leg only). The first estimate is used at once; later ones are eased in, so the
 * shared time never jumps backwards. States and events are stamped with it, and moving ledges follow it.
 */
import type { Role } from './protocol';

const SAMPLES = 8;
/** A later estimate moves the offset by at most this many ms per second of local time. */
const SLEW_MS_PER_S = 50;

export interface SharedClock {
  /** The shared time now (ms). */
  nowMs(): number;
  /** The guest's local time a ping leaves with (ms). */
  localMs(): number;
  /** A pong arrived: learn from it (guest only). */
  onPong(t0: number, hostMs: number): void;
  /** True once the guest has at least one estimate (always true for the host). */
  synced(): boolean;
  /** The shortest recent round trip (ms), or null before the first. */
  rttMs(): number | null;
}

export function createSharedClock(role: Role, now: () => number): SharedClock {
  const samples: { rtt: number; offset: number }[] = [];
  let offset = 0;
  let target = 0;
  let lastLocal = now();
  let haveSample = role === 'host';

  const ease = (): void => {
    const local = now();
    const allowed = Math.max(0, local - lastLocal) * SLEW_MS_PER_S / 1000;
    lastLocal = local;
    offset += Math.max(-allowed, Math.min(allowed, target - offset));
  };

  return {
    nowMs() { if (role === 'host') return now(); ease(); return now() + offset; },
    localMs: now,
    onPong(t0, hostMs) {
      if (role === 'host') return;
      const t1 = now();
      const rtt = t1 - t0;
      if (!(rtt >= 0) || rtt > 10_000) return;
      samples.push({ rtt, offset: hostMs - (t0 + t1) / 2 });
      if (samples.length > SAMPLES) samples.shift();
      const best = samples.reduce((p, q) => (q.rtt < p.rtt ? q : p));
      target = best.offset;
      if (!haveSample) { offset = target; haveSample = true; lastLocal = t1; }
    },
    synced: () => haveSample,
    rttMs: () => (samples.length ? samples.reduce((p, q) => (q.rtt < p.rtt ? q : p)).rtt : role === 'host' ? 0 : null),
  };
}

/**
 * The next physics step's world time in the two-player climb: `current + stepMs`, nudged toward the shared clock
 * by at most `slewMs`, or set to it when it is more than `snapMs` off (a new run, a long pause). Both games then
 * see a moving ledge in the same place. Solo play never calls this.
 */
export function followSharedTime(current: number, stepMs: number, sharedMs: number, slewMs: number, snapMs: number): number {
  const next = current + stepMs;
  const error = sharedMs - next;
  if (Math.abs(error) > snapMs) return sharedMs;
  return next + Math.max(-slewMs, Math.min(slewMs, error));
}
