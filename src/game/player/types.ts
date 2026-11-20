/**
 * Shapes shared by the movement modules: input, player state, platforms and step events.
 *
 * Why separate: the scene and the level checker (P4.2) run the same `stepPlayer`, so they must
 * agree on one plain-data description of the player. Nothing here knows Phaser or the signal.
 */

/** Keys held right now (not presses). The scene builds this from the keys in settings. */
export interface PlayerInput {
  left: boolean;
  right: boolean;
  jump: boolean;
}

/** A one-way platform: solid from above only. Centre and size in world px, y grows downward. */
export interface PlatformBox {
  ice01?: number;
  type?: string;
  dx?: number;
  dy?: number;
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A column of rising air (an updraft), passed to `stepPlayer` with the step's environment. Centre and
 * size in world px. While the body's centre is inside it and the candle is airborne, the column's rule
 * (updraft.ts) replaces plain gravity. It is a zone, never something to stand on.
 */
export interface UpdraftBox {
  id: string;
  kind: 'drift' | 'rise';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlayerState {
  /** Environmental drift, independent of input and never driven by the signal. */
  windVx?: number;
  /** Centre of the body in world px. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  /** Id of the platform stood on, or null in the air. */
  platformId: string | null;
  /** True while a jump is being charged (walking is stopped). */
  charging: boolean;
  chargeMs: number;
  /** The jump key was held when it stopped being usable (boot, teleport, press in the air); wait for a release. */
  jumpLatch: boolean;
  /** Horizontal speed at takeoff; air steering moves away from it by a capped amount. */
  launchVx: number;
  /** Feet y at takeoff, used for the fall height. */
  takeoffBottomY: number;
  /** The wall last kicked off (wall.ts), until the candle lands; absent in a world without walls. */
  kickWallId?: string | null;
  /** Time left (ms) in which held direction is ignored after a wall kick; absent in a world without walls. */
  wallLockMs?: number;
  /**
   * After wall kicks: feet y where the candle last took off from a ledge (or a cap), before its first kick. A landing's
   * fall height is measured from it, not from the last kick, so climbing a chimney is never a fall. Null when no kick
   * has happened since the last takeoff; absent in a world without walls.
   */
  standBottomY?: number | null;
}

/** Things that happened during one step, for the scene to turn into bus events. */
export interface StepEvents {
  /** A charged jump left the ground. */
  jumped: { charge01: number } | null;
  /** The body touched a platform from above. `fallHeightPx` is how far below takeoff (0 if not lower). */
  landed: { platformId: string; fallHeightPx: number } | null;
  /**
   * The body came down on a bounce cap and was launched upward at `launchSpeed` px/s (bounce.ts).
   * `fallHeightPx` is how far below its takeoff it came down on the cap, as for a landing.
   */
  bounced?: { platformId: string; launchSpeed: number; fallHeightPx: number } | null;
  /** A jump press kicked the candle off a wall (wall.ts). */
  wallKicked?: { wallId: string } | null;
}
