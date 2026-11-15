/** Tutorial hazards use fixed authored rules and the same simulation as the level checker. */
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../config/game.config';
import type { PlatformData, SectionData } from '../../shared/contracts/content';
import { createPlayer, stepPlayer } from '../player/movement';
import { platformsAt, windAt } from '../world/environment';
import { loadSections } from '../world/section-loader';
import { getPlatformType } from '../world/platform-types/registry';

const idle = { left: false, right: false, jump: false };
const SECTIONS: SectionData[] = [{ id: 'fixture', spawn: { x: 480, y: 450 }, refuge: null, finish: null,
  platforms: [{ id: 'floor', x: 480, y: 500, width: 960, height: 24, type: 'static' }],
  wind: [{ x: 480, y: -250, width: 960, height: 260, accelerationX: 95, periodMs: 3600 }] }];
const ledge: PlatformData = { id: 'test', x: 480, y: 300, width: 400, height: 20, type: 'moving',
  motion: { axis: 'x', distance: 60, periodMs: 4000 } };
const dt = 1000 / GAME_CONFIG.stepHz;
const standing = () => ({ ...createPlayer(480, 290 - GAME_CONFIG.player.height / 2), grounded: true, platformId: 'test', jumpLatch: false });

describe('tutorial environment', () => {
  it('cycles predictably and carries a rider, including while charging', () => {
    expect(platformsAt([ledge], 1000)[0]?.x).toBe(540);
    expect(platformsAt([ledge], 4000)[0]?.x).toBeCloseTo(480);
    const platforms = platformsAt([ledge], dt, dt);
    const result = stepPlayer(standing(), { ...idle, jump: true }, platforms, 960, GAME_CONFIG, dt).state;
    expect(result.x).toBeCloseTo(platforms[0]!.x);
    expect(result.grounded).toBe(true);
    expect(result.charging).toBe(true);
    expect(getPlatformType('moving')?.anchorSafe).toBe(false);
  });

  it('carries vertical riders and lands on a rising one-way platform', () => {
    const moving = { ...ledge, motion: { ...ledge.motion!, axis: 'y' as const } };
    const platforms = platformsAt([moving], dt, dt);
    const rider = stepPlayer(standing(), idle, platforms, 960, GAME_CONFIG, dt).state;
    expect(rider.y).toBeCloseTo(platforms[0]!.y - 10 - GAME_CONFIG.player.height / 2);
    const rising = [{ ...ledge, y: 299, dy: -1 }];
    const falling = { ...createPlayer(480, 290 - GAME_CONFIG.player.height / 2 - 0.5), vy: 1 };
    expect(stepPlayer(falling, idle, rising, 960, GAME_CONFIG, dt).events.landed?.platformId).toBe('test');
  });

  it('ice retains drift; charging stops sliding and normal ledges stop immediately', () => {
    const state = { ...standing(), vx: 180 };
    const ice = [{ ...ledge, type: 'slippery', motion: undefined }];
    const drifting = stepPlayer(state, idle, ice, 960, GAME_CONFIG, dt).state;
    expect(drifting.vx).toBeGreaterThan(0);
    expect(drifting.vx).toBeLessThan(180);
    expect(stepPlayer(state, { ...idle, jump: true }, ice, 960, GAME_CONFIG, dt).state.vx).toBe(0);
    expect(stepPlayer(state, idle, [{ ...ledge, type: 'static' }], 960, GAME_CONFIG, dt).state.vx).toBe(0);
    expect(getPlatformType('slippery')?.anchorSafe).toBe(true);
  });

  it('wind is local, deterministic, bounded and has no grounded effect', () => {
    const position = { x: 480, y: -250 };
    expect(windAt(SECTIONS, position, 1000)).toBeGreaterThan(0);
    expect(windAt(SECTIONS, position, 1000)).toBe(windAt(SECTIONS, position, 1000));
    expect(windAt(SECTIONS, { x: 480, y: 450 }, 1000)).toBe(0);
    expect(stepPlayer(standing(), idle, [ledge], 960, GAME_CONFIG, dt, { windAccelerationX: 9999 }).state.x).toBe(480);
    let airborne = createPlayer(480, -500);
    for (let i = 0; i < 100; i++) airborne = stepPlayer(airborne, idle, [], 960, GAME_CONFIG, dt, { windAccelerationX: 9999 }).state;
    expect(airborne.windVx).toBe(GAME_CONFIG.surfaces!.maxWindSpeed);
  });

  it('rejects unbounded motion and invalid wind periods before play', () => {
    const section = SECTIONS[0]!;
    expect(() => loadSections([{ ...section, platforms: [...section.platforms, { ...ledge, motion: { ...ledge.motion!, distance: 1000 } }] }], 960)).toThrow('motion leaves');
    expect(() => loadSections([{ ...section, wind: [{ x: 480, y: 400, width: 200, height: 100, accelerationX: 90, periodMs: 0 }] }], 960)).toThrow('invalid wind');
  });
});
