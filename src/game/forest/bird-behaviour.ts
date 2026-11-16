/**
 * What one bird on a ledge does from moment to moment: stand, look around, peck, chirp, and fly
 * off when the candle comes close.
 *
 * Why it is its own file: the behaviour is plain data in, plain data out, so it can be tested
 * without a game running. perching-birds.ts draws it. Decoration only: a bird never touches the
 * candle, a ledge's landing box, fuel or score.
 */
import type { BirdClip, WildlifeConfig } from '../../config/wildlife.config';

export type BirdAct = 'stand' | 'look' | 'peck' | 'chirp' | 'takeoff' | 'fly';

export interface Bird {
  act: BirdAct;
  /** Time spent in the current act, in ms. */
  actMs: number;
  /** How long this stand lasts before the next small act, in ms. */
  holdMs: number;
  x: number; y: number;
  /** 1 faces right (as drawn on the sheet), -1 faces left. */
  facing: 1 | -1;
  /** State of the bird's own number sequence, so every bird behaves differently but repeatably. */
  seed: number;
}

type BirdConfig = WildlifeConfig['bird'];

/** Next number in the bird's sequence: the new seed and a value from 0 up to (not including) 1. */
function roll(seed: number): { seed: number; value: number } {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return { seed: next, value: next / 4294967296 };
}

/** A bird standing at a spot, facing a seeded way. */
export function perchedBird(x: number, y: number, seed: number, config: BirdConfig): Bird {
  const first = roll(seed >>> 0), second = roll(first.seed);
  return { act: 'stand', actMs: 0, x, y, seed: second.seed, facing: first.value < 0.5 ? 1 : -1,
    holdMs: config.idleMinMs + second.value * (config.idleMaxMs - config.idleMinMs) };
}

/** True while the bird is in the air or leaving the ledge. */
export function isAirborne(bird: Bird): boolean {
  return bird.act === 'takeoff' || bird.act === 'fly';
}

/**
 * Advance a bird by `dtMs`.
 * `threat` is where the thing that scares it is (the candle), or null when nothing is near enough
 * to matter; `leave` sends it off regardless (the forest has turned).
 */
export function stepBird(bird: Bird, dtMs: number, threat: { x: number; y: number } | null, leave: boolean, config: BirdConfig): Bird {
  const dt = Math.max(0, Math.min(100, Number.isFinite(dtMs) ? dtMs : 0));
  const next: Bird = { ...bird, actMs: bird.actMs + dt };
  const clips: Record<BirdAct, BirdClip> = config.clips;

  if (!isAirborne(next)) {
    const scared = threat !== null && Math.hypot(threat.x - next.x, threat.y - next.y) <= config.startleRadiusPx;
    if (scared || leave) {
      // Fly away from whatever scared it; with nothing to flee, keep the way it faces.
      const away = threat && threat.x !== next.x ? (threat.x < next.x ? 1 : -1) : next.facing;
      return { ...next, act: 'takeoff', actMs: 0, facing: away };
    }
    if (next.act === 'stand') {
      if (next.actMs < next.holdMs) return next;
      const pick = roll(next.seed);
      const act: BirdAct = pick.value < 0.4 ? 'peck' : pick.value < 0.65 ? 'look' : pick.value < 0.85 ? 'chirp' : 'stand';
      const hold = roll(pick.seed);
      return { ...next, act, actMs: 0, seed: hold.seed,
        // Now and then it simply turns round and keeps standing.
        facing: act === 'stand' ? (next.facing === 1 ? -1 : 1) : next.facing,
        holdMs: config.idleMinMs + hold.value * (config.idleMaxMs - config.idleMinMs) };
    }
    // A small act plays once, then the bird stands again.
    if (next.actMs >= clips[next.act].cells.length * config.frameMs) return { ...next, act: 'stand', actMs: 0 };
    return next;
  }

  const seconds = dt / 1000;
  if (next.act === 'takeoff') {
    // The first half of the take-off is the crouch and spring, still on the ledge.
    const lifted = next.actMs > clips.takeoff.cells.length * config.frameMs / 2;
    if (lifted) { next.x += next.facing * config.flySpeedPxPerS * 0.5 * seconds; next.y -= config.climbPxPerS * seconds; }
    if (next.actMs >= clips.takeoff.cells.length * config.frameMs) return { ...next, act: 'fly', actMs: 0 };
    return next;
  }
  next.x += next.facing * config.flySpeedPxPerS * seconds;
  next.y -= config.climbPxPerS * seconds;
  return next;
}

/** The sheet cell (counted along the rows) that shows the bird right now. */
export function birdFrame(bird: Bird, config: BirdConfig): number {
  const clip: BirdClip = config.clips[bird.act];
  const frames = clip.cells.length;
  const step = Math.floor(bird.actMs / (bird.act === 'stand' ? config.standFrameMs : config.frameMs));
  // Standing and flying loop; everything else holds its last frame until the act changes.
  const frame = bird.act === 'stand' || bird.act === 'fly' ? step % frames : Math.min(frames - 1, step);
  return clip.cells[frame]!;
}
