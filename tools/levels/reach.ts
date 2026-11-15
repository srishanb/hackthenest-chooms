/** Conservative reachability search using the game's exact fixed-step movement and collision maths. */
import type { GameConfig } from '../../src/shared/contracts/config';
import type { AreaData, PlatformData, SectionData } from '../../src/shared/contracts/content';
import { createPlayer, stepPlayer } from '../../src/game/player/movement';
import type { PlayerState } from '../../src/game/player/types';
import { loadSections } from '../../src/game/world/section-loader';
import { platformsAt, windAt } from '../../src/game/world/environment';

const IDLE = { left: false, right: false, jump: false };
const CHARGE_LEVELS = 12;
const inside = (point: { x: number; y: number }, area: AreaData): boolean =>
  Math.abs(point.x - area.x) <= area.width / 2 && Math.abs(point.y - area.y) <= area.height / 2;

export interface ReachResult {
  sectionId: string;
  unreachable: string[];
}

export function checkReachability(sections: readonly SectionData[], config: GameConfig): ReachResult[] {
  if (![config.gravityY, config.stepHz, config.jump.maxSpeed, config.jump.maxChargeMs].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('Level physics: gravity, step rate, jump speed and charge duration must be positive and finite');
  }
  const world = loadSections(sections, config.view.width);
  const stepMs = 1000 / config.stepHz;
  const simulate = (state: PlayerState, input: typeof IDLE, time: number) => stepPlayer(state, input,
    platformsAt(world.platforms, time, stepMs), world.width, config, stepMs,
    { windAccelerationX: windAt(sections, state, time) });
  // Long enough to rise and then fall to the world floor, even from the top ledge.
  const flightMs = 2 * config.jump.maxSpeed / config.gravityY * 1000 +
    Math.sqrt(2 * (world.bottom - world.top) / config.gravityY) * 1000 + 1000;
  const maxSteps = Math.ceil(flightMs / stepMs);
  const reachable = new Set<string>();
  const pending: PlatformData[] = [];
  function reachPlatform(id: string): void {
    const landed = world.platforms.find((platform) => platform.id === id)!;
    // Adjacent sections may name the same physical ledge separately. Collision picks
    // the first one, but all IDs at exactly that surface are equally reachable.
    for (const platform of world.platforms) {
      if (platform.x !== landed.x || platform.y !== landed.y || platform.width !== landed.width || platform.height !== landed.height) continue;
      if (reachable.has(platform.id)) continue;
      reachable.add(platform.id);
      pending.push(platform);
    }
  }
  const reachedZones = new Set<string>();
  const zones = sections.flatMap((section) => [
    ...(section.refuge ? [{ id: section.refuge.id, area: section.refuge }] : []),
    ...(section.finish ? [{ id: `${section.id}/finish`, area: section.finish }] : []),
  ]);
  function visitZones(point: { x: number; y: number }): void {
    for (const zone of zones) if (inside(point, zone.area)) reachedZones.add(zone.id);
  }
  let initial = createPlayer(sections[0]!.spawn.x, sections[0]!.spawn.y);
  for (let step = 0; step < maxSteps && !initial.grounded; step++) {
    visitZones(initial);
    initial = simulate(initial, IDLE, (step + 1) * stepMs).state;
  }
  if (initial.platformId) reachPlatform(initial.platformId);
  for (let index = 0; index < pending.length; index++) {
    const authored = pending[index]!;
    // Sample waiting at several cycle phases, using the same moving geometry as play.
    for (const startTime of world.platforms.some((platform) => platform.motion) ? [0, 1000, 2000, 3000] : [0]) {
    const source = platformsAt([authored], startTime)[0]!;
    const minX = Math.max(config.player.width / 2, source.x - source.width / 2 + config.player.width / 2);
    const maxX = Math.min(world.width - config.player.width / 2, source.x + source.width / 2 - config.player.width / 2);
    if (minX > maxX) continue;
    for (const x of [minX, (minX + maxX) / 2, maxX]) {
      const y = source.y - source.height / 2 - config.player.height / 2;
      visitZones({ x, y });
      for (const direction of [-1, 0, 1]) {
        for (let level = 1; level <= CHARGE_LEVELS; level++) {
          let state: PlayerState = { ...createPlayer(x, y), grounded: true, platformId: source.id, jumpLatch: false };
          const chargeSteps = Math.ceil(config.jump.maxChargeMs * level / CHARGE_LEVELS / stepMs);
          let time = startTime;
          for (let step = 0; step < chargeSteps; step++) {
            time += stepMs;
            state = simulate(state, { ...IDLE, jump: true }, time).state;
          }
          time += stepMs;
          state = simulate(state, { left: direction < 0, right: direction > 0, jump: false }, time).state;
          for (let step = 0; step < maxSteps; step++) {
            visitZones(state);
            time += stepMs;
            const result = simulate(state, IDLE, time);
            state = result.state;
            if (result.events.landed) {
              const id = result.events.landed.platformId;
              if (!reachable.has(id)) reachPlatform(id);
              visitZones(state);
              break;
            }
            if (state.y > world.bottom + config.player.height) break;
          }
        }
      }
    }
    }
  }
  return sections.map((section) => ({
    sectionId: section.id,
    unreachable: [
      ...section.platforms.filter((platform) => !reachable.has(platform.id)).map((platform) => platform.id),
      ...(section.refuge && !reachedZones.has(section.refuge.id) ? [section.refuge.id] : []),
      ...(section.finish && !reachedZones.has(`${section.id}/finish`) ? [`${section.id}/finish`] : []),
    ],
  }));
}
