/** Extra correction is confined to strict descent; launch, ascent, apex and vertical physics stay identical. */
import { expect, it } from 'vitest';
import { GAME_CONFIG } from '../../config/game.config';
import { createPlayer, stepPlayer } from '../player/movement';

const original = { ...GAME_CONFIG, fallSteer01: GAME_CONFIG.airSteer01 };
const right = { left: false, right: true, jump: false };
const dt = 1000 / GAME_CONFIG.stepHz;

it('preserves all ascent/apex state and grounded walking/launch behavior', () => {
  for (const vy of [-600, -10, 0]) {
    const player = { ...createPlayer(480, -100), vy, launchVx: 200 };
    expect(stepPlayer(player, right, [], 960, GAME_CONFIG, dt)).toEqual(stepPlayer(player, right, [], 960, original, dt));
  }
  const floor = { id: 'floor', x: 480, y: 500, width: 960, height: 24 };
  const grounded = { ...createPlayer(480, 470), grounded: true, platformId: 'floor', jumpLatch: false };
  for (const player of [grounded, { ...grounded, charging: true, chargeMs: 600 }]) {
    expect(stepPlayer(player, right, [floor], 960, GAME_CONFIG, dt)).toEqual(stepPlayer(player, right, [floor], 960, original, dt));
  }
});

it('adds a modest symmetric correction only during descent, including alongside wind', () => {
  for (const direction of [-1, 1]) for (const windAccelerationX of [0, 120]) {
    const input = { ...right, left: direction < 0, right: direction > 0 };
    const player = { ...createPlayer(480, -100), vy: 250, launchVx: 100, windVx: 20 };
    const next = stepPlayer(player, input, [], 960, GAME_CONFIG, dt, { windAccelerationX }).state;
    const before = stepPlayer(player, input, [], 960, original, dt, { windAccelerationX }).state;
    expect(next.vx - before.vx).toBeCloseTo(direction * 19.8);
    expect(next.vy).toBe(before.vy); expect(next.y).toBe(before.y);
    expect(next.windVx).toBe(before.windVx);
  }
});

it('leaves an entire jump vertical trajectory unchanged and only diverges horizontally after the apex', () => {
  let player = { ...createPlayer(480, -1000), vy: -700 };
  let baseline = { ...player };
  let corrected = false;
  for (let frame = 0; frame < 120; frame++) {
    const descending = player.vy > 0;
    player = stepPlayer(player, right, [], 960, GAME_CONFIG, dt).state;
    baseline = stepPlayer(baseline, right, [], 960, original, dt).state;
    expect(player.y).toBe(baseline.y); expect(player.vy).toBe(baseline.vy);
    if (!descending) expect(player.x).toBe(baseline.x);
    else corrected = player.x > baseline.x;
  }
  expect(corrected).toBe(true);
});
