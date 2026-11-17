/**
 * Crumbling ledges: a ledge that holds for a short, fixed time after the candle first stands on it,
 * then drops away and stops being solid, and grows back a while later once the candle is clear of it.
 *
 * Where the state lives, and why: a ledge keeps crumbling after the candle has jumped off it, so the
 * timer belongs to the world, not to the player. `CrumbleState` is a small immutable map from ledge id
 * to its timer, advanced one physics step at a time by `stepCrumble` right after `stepPlayer`, using only
 * the step's time and where the candle is. world-step.ts does both in one call, and the game scene and
 * the generator's route replay both call it, so a crumbling ledge falls at exactly the same physics step
 * in each. `solidLedges` is what the physics may stand on now. Pure; never the signal (binding rule 2).
 */
import type { GameConfig, LedgeKindsConfig } from '../../shared/contracts/config';
import { findSupport } from './collide';
import type { PlatformBox, PlayerState } from './types';

/** Platform type id of a crumbling ledge. */
export const CRUMBLING_TYPE = 'crumbling';

export interface CrumbleTimer {
  /** Time since the candle first stood on it (ms). */
  heldMs: number;
  /** Time since it fell (ms), or null while it still holds. */
  goneMs: number | null;
}

/** Ledge id -> its timer. A ledge with no entry is whole and untouched. */
export type CrumbleState = ReadonlyMap<string, CrumbleTimer>;

export const NO_CRUMBLE: CrumbleState = new Map();

/** The ledges that are solid now: every one but the crumbling ledges that have fallen. */
export function solidLedges<T extends { id: string }>(platforms: readonly T[], crumble: CrumbleState): readonly T[] {
  if (crumble.size === 0) return platforms;
  return platforms.filter((platform) => crumble.get(platform.id)?.goneMs == null);
}

/** Is the body at least `clearancePx` away from the ledge's box on some axis? */
function clearOf(player: PlayerState, ledge: PlatformBox, body: GameConfig['player'], clearancePx: number): boolean {
  const gapX = Math.abs(player.x - ledge.x) - (body.width + ledge.width) / 2;
  const gapY = Math.abs(player.y - ledge.y) - (body.height + ledge.height) / 2;
  return Math.max(gapX, gapY) >= clearancePx;
}

/**
 * Advance every crumbling ledge by one step of `dtMs`, given the candle after this step (`player`) and the
 * ledges at their positions now. A ledge starts its timer on the first step the candle stands on it; it
 * falls once it has held `holdMs`; it grows back once it has been gone `regrowMs` and the candle is clear.
 * Timers of ledges no longer in `platforms` (unloaded chunks) are dropped: an unloaded ledge comes back whole.
 */
export function stepCrumble(crumble: CrumbleState, platforms: readonly PlatformBox[], player: PlayerState, config: GameConfig, dtMs: number): CrumbleState {
  const rules: LedgeKindsConfig['crumble'] | undefined = config.ledgeKinds?.crumble;
  if (!rules) return crumble;
  const bottom = player.y + config.player.height / 2;
  let next: Map<string, CrumbleTimer> | null = null;
  const write = (id: string, timer: CrumbleTimer | null): void => {
    next ??= new Map(crumble);
    if (timer) next.set(id, timer); else next.delete(id);
  };
  for (const [id, timer] of crumble) {
    const ledge = platforms.find((platform) => platform.id === id);
    if (!ledge) { write(id, null); continue; }
    if (timer.goneMs === null) {
      const heldMs = timer.heldMs + dtMs;
      write(id, heldMs >= rules.holdMs ? { heldMs, goneMs: 0 } : { heldMs, goneMs: null });
    } else {
      const goneMs = timer.goneMs + dtMs;
      write(id, goneMs >= rules.regrowMs && clearOf(player, ledge, config.player, rules.clearancePx) ? null : { heldMs: timer.heldMs, goneMs });
    }
  }
  if (player.grounded) {
    // Whatever crumbling ledge is under the feet starts now (walking onto one counts, not only landing).
    const standing = platforms.filter((platform) => platform.type === CRUMBLING_TYPE && !crumble.has(platform.id));
    const under = standing.length ? findSupport(standing, player.x, config.player.width, bottom) : null;
    if (under) write(under.id, { heldMs: 0, goneMs: null });
  }
  return next ?? crumble;
}

/** For drawing: 0 untouched, rising to 1 as it is about to fall; null once it has fallen. */
export function crumbleWarn01(timer: CrumbleTimer | undefined, config: GameConfig): number | null {
  if (!timer) return 0;
  if (timer.goneMs !== null) return null;
  return Math.min(1, timer.heldMs / (config.ledgeKinds?.crumble.holdMs ?? 1));
}
