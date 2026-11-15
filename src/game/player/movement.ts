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

export function stepPlayer(state: PlayerState, input: PlayerInput, platforms: readonly PlatformBox[], worldWidth: number, config: GameConfig, dtMs: number): { state: PlayerState; events: StepEvents } {
  const dt = dtMs / 1000;
  const { width, height } = config.player;
  const dir = direction(input);
  let { x, y, vx, vy, grounded, platformId, charging, chargeMs, jumpLatch, launchVx, takeoffBottomY } = state;
  let jumped: StepEvents['jumped'] = null;
  let landed: StepEvents['landed'] = null;

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
      vx = dir * config.walkSpeed;
    }
  } else {
    vx = steeredVx(launchVx, dir, config);
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
      takeoffBottomY = prevBottom;
    }
  }

  if (!grounded) {
    vy += config.gravityY * dt;
    const newBottom = prevBottom + vy * dt;
    const platform = vy >= 0 ? findLanding(platforms, x, width, prevBottom, newBottom) : null;
    if (platform) {
      const top = platform.y - platform.height / 2;
      y = top - height / 2;
      vy = 0;
      vx = 0;
      grounded = true;
      platformId = platform.id;
      landed = { platformId: platform.id, fallHeightPx: Math.max(0, top - takeoffBottomY) };
    } else {
      y += vy * dt;
    }
  }

  const next: PlayerState = { x, y, vx, vy, grounded, platformId, charging, chargeMs, jumpLatch, launchVx, takeoffBottomY };
  return { state: next, events: jumped || landed ? { jumped, landed } : NO_EVENTS };
}
