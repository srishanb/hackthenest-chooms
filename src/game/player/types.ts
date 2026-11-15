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
  type?: string;
  dx?: number;
  dy?: number;
  id: string;
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
}

/** Things that happened during one step, for the scene to turn into bus events. */
export interface StepEvents {
  /** A charged jump left the ground. */
  jumped: { charge01: number } | null;
  /** The body touched a platform from above. `fallHeightPx` is how far below takeoff (0 if not lower). */
  landed: { platformId: string; fallHeightPx: number } | null;
}
