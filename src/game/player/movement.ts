/**
 * Fixed-step player physics: gravity, walking, charge jump, air steering, one-way platforms, and the
 * special ledges of the endless climb (Decision D-36): bounce caps (bounce.ts), updraft columns
 * (updraft.ts, passed in `environment.updrafts`) and crumbling ledges (crumble.ts: the caller passes only
 * the ledges solid now; world-step.ts does that and advances their timers).
 *
 * Why our own and not Arcade: the level checker (P4.2) and the endless generator's route replay run this
 * exact function in Node, so a route they call reachable is reachable in the game. `stepPlayer` is pure:
 * same state, input, platforms, environment and config always give the same result. Movement must never
 * read the signal (binding rule 2).
 *
 * Bounce: coming down onto a bounce cap never lands; the feet are put on its top and the candle is thrown
 * upward (bounce.ts), keeping its horizontal speed as the new launch speed, so normal air steering goes
 * on from there. The bounce reports the fall that ended on the cap (`bounced.fallHeightPx`, its full
 * height, like a landing), and the next fall is measured from the cap.
 *
 * Walls (wall.ts, a prototype behind `?walls=1`): platforms of type `wall` stop the body at their sides and
 * underside, and in the air the candle slides down one it presses into and kicks off one on a fresh jump
 * press, both only while the wall grips (`gripHolds`). With no wall among the platforms (every world without
 * the switch, and the authored climb) none of this code changes a number.
 */
import type { GameConfig } from '../../shared/contracts/config';
import { charge01, launchVelocity, steeredVx } from './charge-jump';
import { BOUNCE_TYPE, bounceSpeed } from './bounce';
import { clampToWalls, findLanding, findSupport } from './collide';
import type { PlatformBox, PlayerInput, PlayerState, StepEvents, UpdraftBox } from './types';
import { updraftAt, updraftHolds, updraftVy } from './updraft';
import { blockX, bumpHead, gripHolds, kickVelocity, slideVy, touchingWall, wallBeside, wallsIn } from './wall';

const direction = (input: PlayerInput): -1 | 0 | 1 => ((input.right ? 1 : 0) - (input.left ? 1 : 0)) as -1 | 0 | 1;

/** A player standing still at `x, y` (centre). The jump latch starts set so a held key never launches at boot. */
export function createPlayer(x: number, y: number): PlayerState {
  return { x, y, vx: 0, vy: 0, grounded: false, platformId: null, charging: false, chargeMs: 0, jumpLatch: true, launchVx: 0, takeoffBottomY: y };
}

/** Move the player to `x, y` (save load, ember return). Sets the latch so a held jump does not relaunch. */
export function teleportPlayer(x: number, y: number): PlayerState {
  return { ...createPlayer(x, y), jumpLatch: true };
}

const NO_EVENTS: StepEvents = { jumped: null, landed: null };

/** What surrounds the body this step, apart from the ledges. Never signal-driven. */
export interface StepEnvironment {
  /** Sideways wind acceleration (px/s^2), applied only in the air. */
  windAccelerationX?: number;
  /** Updraft columns in reach (updraft.ts). */
  updrafts?: readonly UpdraftBox[];
}

/** Nothing can be stood on but a ledge: a bounce cap throws you instead. */
const standable = (platform: PlatformBox): boolean => platform.type !== BOUNCE_TYPE;

export function stepPlayer(state: PlayerState, input: PlayerInput, platforms: readonly PlatformBox[], worldWidth: number, config: GameConfig, dtMs: number,
  environment: StepEnvironment = {}): { state: PlayerState; events: StepEvents } {
  const dt = dtMs / 1000;
  const { width, height } = config.player;
  const dir = direction(input);
  let { x, y, vx, vy, grounded, platformId, charging, chargeMs, jumpLatch, launchVx, takeoffBottomY } = state;
  let jumped: StepEvents['jumped'] = null;
  let landed: StepEvents['landed'] = null;
  let bounced: StepEvents['bounced'] = null;
  let windVx = state.windVx ?? 0;
  let wallKicked: StepEvents['wallKicked'] = null;
  const wallRules = config.wallMoves;
  const walls = wallsIn(platforms);
  const hasWalls = walls.length > 0;
  let kickWallId = state.kickWallId ?? null;
  let wallLockMs = state.wallLockMs ?? 0;
  const support = grounded ? platforms.find((platform) => platform.id === platformId) : undefined;
  if (support) { x += support.dx ?? 0; y += support.dy ?? 0; }

  // The latch frees on a release; a press made in the air or at boot is not a fresh press.
  if (!input.jump) jumpLatch = false;
  else if (!grounded) jumpLatch = true;

  if (grounded) {
    if (charging) {
      if (input.jump) {
        chargeMs = Math.min(chargeMs + dtMs, config.jump.maxChargeMs);
        vx = 0;
      } else {
        const charge = charge01(chargeMs, config);
        ({ vx, vy } = launchVelocity(charge, dir, config));
        launchVx = vx;
        windVx = 0;
        takeoffBottomY = y + height / 2;
        jumped = { charge01: charge };
        grounded = false;
        platformId = null;
        charging = false;
        chargeMs = 0;
      }
    } else if (input.jump && !jumpLatch) {
      charging = true;
      chargeMs = Math.min(dtMs, config.jump.maxChargeMs);
      vx = 0;
    } else {
      if (support?.type === 'slippery' && config.surfaces) {
        const ice = support.ice01 ?? 1;
        const target = dir * config.walkSpeed;
        const drag = config.surfaces.iceDrag / Math.max(0.05, ice);
        const acceleration = config.surfaces.iceAcceleration / Math.max(0.05, ice);
        if (ice === 0) vx = target;
        else if (dir === 0) vx *= Math.exp(-drag * dt);
        else vx += Math.max(-acceleration * dt, Math.min(acceleration * dt, target - vx));
      } else vx = dir * config.walkSpeed;
    }
  } else {
    // Just after a wall kick, held direction is ignored, so the kick carries the candle away from the wall.
    const steer: -1 | 0 | 1 = hasWalls && wallLockMs > 0 ? 0 : dir;
    if (hasWalls) wallLockMs = Math.max(0, wallLockMs - dtMs);
    const previousWindVx = windVx;
    const maxWind = config.surfaces?.maxWindSpeed ?? 0;
    windVx = Math.max(-maxWind, Math.min(maxWind,
      (windVx + (environment.windAccelerationX ?? 0) * dt) * Math.exp(-(config.surfaces?.windDecay ?? 0) * dt)));
    // Under constant gravity, downward speed / gravity is time since the apex.
    // This also resets naturally on landing/ascent/teleport, without a second timer.
    if (vy > 0 && config.falling && vy >= config.gravityY * config.falling.activationDelayMs / 1000) {
      // Accelerate the player's momentum independently of wind. Reversals take time,
      // but are no longer trapped near the original launch direction. No input coasts.
      const controlVx = vx - previousWindVx;
      const target = steer === 0 ? controlVx : steer * config.falling.speedX;
      const change = config.falling.accelerationX * dt;
      vx = controlVx + Math.max(-change, Math.min(change, target - controlVx)) + windVx;
    } else vx = steeredVx(launchVx, steer, config, vy > 0) + windVx;
    // A fresh jump press beside a wall that grips kicks off it (wall.ts).
    if (hasWalls && wallRules && input.jump && !state.jumpLatch) {
      const near = wallBeside(walls, x, y, config.player, wallRules.kickReachPx);
      if (near && (wallRules.sameWallTwice || near.wall.id !== kickWallId) && gripHolds(y + height / 2, takeoffBottomY, wallRules)) {
        ({ vx, vy } = kickVelocity(near.side, wallRules));
        launchVx = vx;
        windVx = 0;
        takeoffBottomY = y + height / 2;
        kickWallId = near.wall.id;
        wallLockMs = wallRules.kickLockMs;
        wallKicked = { wallId: near.wall.id };
      }
    }
  }

  const prevBottom = y + height / 2;
  const prevX = x;
  x += vx * dt;
  const wall = clampToWalls(x, width, worldWidth);
  x = wall.x;
  if (wall.hit) vx = 0;
  if (hasWalls) {
    const blocked = blockX(walls, prevX, x, y, config.player);
    if (blocked) { x = blocked.x; vx = 0; }
  }

  if (grounded) {
    // Walked off the edge (or the ledge fell away): start falling with the walking speed as the launch value.
    if (!findSupport(platforms.filter(standable), x, width, prevBottom)) {
      grounded = false;
      platformId = null;
      launchVx = vx;
      windVx = 0;
      takeoffBottomY = prevBottom;
      // A charge cannot go on without ground (a crumbling ledge gone mid-charge): it is lost, and a held
      // key waits for a release like any press in the air.
      if (charging) { charging = false; chargeMs = 0; jumpLatch = input.jump; }
    }
  }

  if (!grounded) {
    const column = config.ledgeKinds ? updraftAt(environment.updrafts, x, y) : null;
    // Sliding: pressed against a gripping wall while holding toward it (wall.ts).
    const sliding = hasWalls && wallRules && dir !== 0 && touchingWall(walls, x, y, config.player, dir) !== null
      && gripHolds(prevBottom, takeoffBottomY, wallRules);
    vy = sliding && wallRules ? slideVy(vy, wallRules, config.gravityY, dt) : column && config.ledgeKinds && updraftHolds(y + height / 2, takeoffBottomY, config.ledgeKinds.updraft) ? updraftVy(vy, column.kind, config.ledgeKinds.updraft, config.gravityY, dt) : vy + config.gravityY * dt;
    const newBottom = prevBottom + vy * dt;
    let platform = vy >= 0 ? findLanding(platforms, x, width, prevBottom, newBottom) : null;
    if (!platform && state.vy > 0 && config.falling) {
      // A tiny reach at the instant the feet cross a top edge. Never catch a ledge
      // already passed, never pull back a walk-off, and always prefer a normal landing.
      const crossing = platforms.filter((ledge) => ledge.y - ledge.height / 2 - (ledge.dy ?? 0) > prevBottom);
      platform = findLanding(crossing, x, width + 2 * config.falling.ledgeReachPx, prevBottom, newBottom);
      if (platform) {
        const edge = (width + platform.width) / 2 - 1;
        x = clampToWalls(Math.max(platform.x - edge, Math.min(platform.x + edge, x)), width, worldWidth).x;
      }
    }
    if (platform && platform.type === BOUNCE_TYPE && config.ledgeKinds) {
      // Thrown back up: feet on the cap, horizontal speed carried on as the launch speed.
      const top = platform.y - platform.height / 2;
      const launchSpeed = bounceSpeed(vy, config.ledgeKinds.bounce);
      y = top - height / 2;
      vy = -launchSpeed;
      launchVx = vx - windVx;
      // The way down counts as a fall of its full height; the throw is a new takeoff from the cap.
      bounced = { platformId: platform.id, launchSpeed, fallHeightPx: Math.max(0, top - takeoffBottomY) };
      takeoffBottomY = top;
    } else if (platform) {
      const top = platform.y - platform.height / 2;
      y = top - height / 2;
      vy = 0;
      vx = 0;
      windVx = 0;
      grounded = true;
      platformId = platform.id;
      landed = { platformId: platform.id, fallHeightPx: Math.max(0, top - takeoffBottomY) };
      kickWallId = null;
      wallLockMs = 0;
    } else {
      // Rising into the underside of a wall stops the head there.
      const ceiling = hasWalls && vy < 0 ? bumpHead(walls, x, y - height / 2, y - height / 2 + vy * dt, config.player) : null;
      if (ceiling !== null) { y = ceiling + height / 2; vy = 0; } else y += vy * dt;
    }
  }

  const next: PlayerState = { x, y, vx, vy, grounded, platformId, charging, chargeMs, jumpLatch, launchVx, takeoffBottomY, windVx };
  // The wall fields exist only in a world with walls, so a world without them keeps exactly the old state.
  if (hasWalls || state.kickWallId !== undefined) { next.kickWallId = kickWallId; next.wallLockMs = wallLockMs; }
  if (wallKicked) return { state: next, events: { jumped, landed, ...(bounced ? { bounced } : {}), wallKicked } };
  return { state: next, events: bounced ? { jumped, landed, bounced } : jumped || landed ? { jumped, landed } : NO_EVENTS };
}
