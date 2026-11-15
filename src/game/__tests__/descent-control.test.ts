/** Extra correction is confined to strict descent; launch, ascent, apex and vertical physics stay identical. */
import { expect, it } from 'vitest';
import { GAME_CONFIG } from '../../config/game.config';
import { DEFAULT_SETTINGS } from '../../shared/contracts/settings';
import { createKeyboardInput } from '../keyboard-input';
import { createPlayer, stepPlayer } from '../player/movement';

const { falling: _falling, ...original } = GAME_CONFIG;
const right = { left: false, right: true, jump: false };
const dt = 1000 / GAME_CONFIG.stepHz;

it('retains original steering until the descent delay has elapsed', () => {
  const threshold = GAME_CONFIG.gravityY * GAME_CONFIG.falling!.activationDelayMs / 1000;
  for (const vy of [0, 1, threshold - 0.01]) {
    const player = { ...createPlayer(480, -100), vy, vx: 52.8 };
    expect(stepPlayer(player, right, [], 960, GAME_CONFIG, dt)).toEqual(stepPlayer(player, right, [], 960, original, dt));
  }
  const player = { ...createPlayer(480, -100), vy: threshold, vx: 52.8 };
  const active = stepPlayer(player, right, [], 960, GAME_CONFIG, dt).state;
  const before = stepPlayer(player, right, [], 960, original, dt).state;
  expect(active.vx).toBeGreaterThan(before.vx);
  expect(active.vy).toBe(before.vy);
  expect(active.y).toBe(before.y);
});

it.each([false, true])('an uncharged short hop keeps the entire original trajectory (diagonal: %s)', (diagonal) => {
  const floor = { id: 'floor', x: 480, y: 500, width: 960, height: 24 };
  let player = { ...createPlayer(300, 470), grounded: true, platformId: 'floor' as string | null,
    charging: true, chargeMs: 0, jumpLatch: false };
  let baseline = { ...player };
  const launch = { ...right, right: diagonal };
  player = stepPlayer(player, launch, [floor], 960, GAME_CONFIG, dt).state;
  baseline = stepPlayer(baseline, launch, [floor], 960, original, dt).state;
  for (let frame = 0; frame < 120 && !player.grounded; frame++) {
    player = stepPlayer(player, right, [floor], 960, GAME_CONFIG, dt).state;
    baseline = stepPlayer(baseline, right, [floor], 960, original, dt).state;
    expect(player).toEqual(baseline);
  }
  expect(player.grounded).toBe(true);
});

it('landing, teleport and a fresh ascent cannot retain unlocked fast steering', () => {
  const floor = { id: 'floor', x: 480, y: 500, width: 960, height: 24 };
  const falling = { ...createPlayer(480, 460), vy: 700, vx: 420 };
  const landed = stepPlayer(falling, right, [floor], 960, GAME_CONFIG, 20).state;
  expect(landed.grounded).toBe(true);
  const freshStates = [landed, createPlayer(480, 0), { ...falling, vy: -300 }, { ...falling, vy: 1 }];
  for (const player of freshStates) {
    expect(stepPlayer(player, right, [], 960, GAME_CONFIG, dt)).toEqual(stepPlayer(player, right, [], 960, original, dt));
  }
});

it.each([['KeyA', -1], ['KeyD', 1]] as const)('%s reaches a nearby ledge late in an established fast fall', (code, direction) => {
  const keyboard = createKeyboardInput(() => DEFAULT_SETTINGS.keys);
  keyboard.keyDown(code);
  const platforms = [{ id: 'nearby', x: 480 + direction * 120, y: 200, width: 160, height: 16 }];
  let player = { ...createPlayer(480, 75), vy: 600 };
  let before = { ...player };
  const previousTuning = { ...GAME_CONFIG, falling: { ...GAME_CONFIG.falling!, accelerationX: 1600, speedX: 300 } };
  // Only about 140 ms remains before crossing this ledge: a slow reversal test misses this case.
  for (let frame = 0; frame < 18; frame++) {
    const input = keyboard.read();
    if (!player.grounded) player = stepPlayer(player, input, platforms, 960, GAME_CONFIG, dt).state;
    if (!before.grounded) before = stepPlayer(before, input, platforms, 960, previousTuning, dt).state;
  }
  expect(player.platformId).toBe('nearby');
  expect(before.grounded).toBe(false);
  expect((player.x - 480) * direction).toBeGreaterThan(35);
});

it.each([['KeyA', -1], ['KeyD', 1]] as const)('%s reverses opposing momentum within 100 ms once falling control is active', (code, direction) => {
  const keyboard = createKeyboardInput(() => DEFAULT_SETTINGS.keys);
  keyboard.keyDown(code);
  let player = { ...createPlayer(480, -1000), vx: -direction * 366, launchVx: -direction * 366, vy: 600 };
  for (let frame = 0; frame < 12; frame++) player = stepPlayer(player, keyboard.read(), [], 960, GAME_CONFIG, dt).state;
  expect(player.vx * direction).toBeGreaterThan(0);
  for (let frame = 0; frame < 12; frame++) player = stepPlayer(player, keyboard.read(), [], 960, GAME_CONFIG, dt).state;
  expect(player.vx).toBe(direction * GAME_CONFIG.falling!.speedX);
});

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

it('accelerates symmetrically only during descent, independently of bounded wind', () => {
  for (const direction of [-1, 1]) for (const windAccelerationX of [0, 120]) {
    const input = { ...right, left: direction < 0, right: direction > 0 };
    const player = { ...createPlayer(480, -100), vx: 20, vy: 400, launchVx: 0, windVx: 20 };
    const next = stepPlayer(player, input, [], 960, GAME_CONFIG, dt, { windAccelerationX }).state;
    const before = stepPlayer(player, input, [], 960, original, dt, { windAccelerationX }).state;
    expect(next.vx - next.windVx!).toBeCloseTo(direction * GAME_CONFIG.falling!.accelerationX * dt / 1000);
    expect(next.vy).toBe(before.vy); expect(next.y).toBe(before.y);
    expect(next.windVx).toBe(before.windVx);
  }
});

it('reverses a full-speed launch during descent, coasts on release and caps held steering speed', () => {
  let player = { ...createPlayer(480, -2000), vx: 366, launchVx: 366, vy: 1 };
  const left = { ...right, left: true, right: false };
  for (let i = 0; i < 36; i++) player = stepPlayer(player, left, [], 960, GAME_CONFIG, dt).state;
  expect(player.vx).toBeLessThan(0);
  const coast = stepPlayer(player, { ...right, right: false }, [], 960, GAME_CONFIG, dt).state;
  expect(coast.vx).toBe(player.vx);
  for (let i = 0; i < 24; i++) player = stepPlayer(player, left, [], 960, GAME_CONFIG, dt).state;
  expect(player.vx).toBe(-GAME_CONFIG.falling!.speedX);
});

it('steers a fall onto a nearby lower platform that the previous correction misses', () => {
  const ledges = [
    { id: 'lower', x: 390, y: 200, width: 90, height: 16 },
    { id: 'floor', x: 480, y: 600, width: 960, height: 24 },
  ];
  let player = { ...createPlayer(270, 0), vy: 50 };
  let baseline = { ...player };
  for (let i = 0; i < 120; i++) {
    if (!player.grounded) player = stepPlayer(player, right, ledges, 960, GAME_CONFIG, dt).state;
    if (!baseline.grounded) baseline = stepPlayer(baseline, right, ledges, 960, original, dt).state;
  }
  expect(player.platformId).toBe('lower');
  expect(baseline.platformId).toBe('floor');
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
