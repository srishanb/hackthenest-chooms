/**
 * Fixed-step player physics: gravity, walking, charge jump, air steering, one-way platforms.
 *
 * Why our own and not Arcade: the level checker (P4.2) runs this exact function in Node, so a
 * level it calls reachable is reachable in the game. `stepPlayer` is pure: same state, input and
 * config always give the same result. Movement must never read the signal (binding rule 2).
 */
import type { GameConfig } from '../../shared/contracts/config';
import { charge01, launchVelocity, steeredVx } from './charge-jump';
import { clampToWalls, findLanding, findSupport } from './collide';
import type { PlatformBox, PlayerInput, PlayerState, StepEvents } from './types';

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

export function stepPlayer(state: PlayerState, input: PlayerInput, platforms: readonly PlatformBox[], worldWidth: number, config: GameConfig, dtMs: number,
  environment: { windAccelerationX?: number } = {}): { state: PlayerState; events: StepEvents } {
  const dt = dtMs / 1000;
  const { width, height } = config.player;
  const dir = direction(input);
  let { x, y, vx, vy, grounded, platformId, charging, chargeMs, jumpLatch, launchVx, takeoffBottomY } = state;
  let jumped: StepEvents['jumped'] = null;
  let landed: StepEvents['landed'] = null;
  let windVx = state.windVx ?? 0;
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
    const previousWindVx = windVx;
    const maxWind = config.surfaces?.maxWindSpeed ?? 0;
    windVx = Math.max(-maxWind, Math.min(maxWind,
      (windVx + (environment.windAccelerationX ?? 0) * dt) * Math.exp(-(config.surfaces?.windDecay ?? 0) * dt)));
    if (vy > 0 && config.falling) {
      // Accelerate the player's momentum independently of wind. Reversals take time,
      // but are no longer trapped near the original launch direction. No input coasts.
      const controlVx = vx - previousWindVx;
      const target = dir === 0 ? controlVx : dir * config.falling.speedX;
      const change = config.falling.accelerationX * dt;
      vx = controlVx + Math.max(-change, Math.min(change, target - controlVx)) + windVx;
    } else vx = steeredVx(launchVx, dir, config, vy > 0) + windVx;
  }

  const prevBottom = y + height / 2;
  x += vx * dt;
  const wall = clampToWalls(x, width, worldWidth);
  x = wall.x;
  if (wall.hit) vx = 0;

  if (grounded) {
    // Walked off the edge: start falling with the walking speed as the launch value.
    if (!findSupport(platforms, x, width, prevBottom)) {
      grounded = false;
      platformId = null;
      launchVx = vx;
      windVx = 0;
      takeoffBottomY = prevBottom;
    }
  }

  if (!grounded) {
    vy += config.gravityY * dt;
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
    if (platform) {
      const top = platform.y - platform.height / 2;
      y = top - height / 2;
      vy = 0;
      vx = 0;
      windVx = 0;
      grounded = true;
      platformId = platform.id;
      landed = { platformId: platform.id, fallHeightPx: Math.max(0, top - takeoffBottomY) };
    } else {
      y += vy * dt;
    }
  }

  const next: PlayerState = { x, y, vx, vy, grounded, platformId, charging, chargeMs, jumpLatch, launchVx, takeoffBottomY, windVx };
  return { state: next, events: jumped || landed ? { jumped, landed } : NO_EVENTS };
}
