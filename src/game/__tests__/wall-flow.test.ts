/**
 * An intended climb through walls is never a fall (Decision D-37, QA finding 2 of the wall prototype).
 *
 * A chimney often comes down on its ledge below the last kick, but above the ledge it started from. The landing's
 * fall is measured from where the candle last stood (player/movement.ts `standBottomY`), so the flow streak, the
 * composure shake, the hard-landing sound and the `fall` events see no fall there. The route bot plays every
 * chunk with a wall piece on the game's own world step, and every landing that ends a stored wall step is checked.
 */
import { describe, expect, it } from 'vitest';
import { ENDLESS_CONFIG as C } from '../../config/endless.config';
import { GAME_CONFIG as G } from '../../config/game.config';
import { createEndlessGenerator } from '../endless/generator';
import { createRouteBot } from '../endless/route-bot';
import { NO_CRUMBLE } from '../player/crumble';
import { teleportPlayer } from '../player/movement';
import type { PlayerState } from '../player/types';
import { stepWorld } from '../player/world-step';
import { platformsAt } from '../world/environment';

const H = G.player.height;
const topOf = (p: { y: number; height: number }): number => p.y - p.height / 2;

describe('a stored wall step lands without a fall', () => {
  it('over a sweep of seeds, no chimney or wall kick landing reports a fall unless its ledge is lower than its start', () => {
    const stepMs = 1000 / G.stepHz;
    let checked = 0, belowKick = 0;
    const falls: string[] = [];
    for (let si = 1; si <= 16; si++) {
      const seed = si * 131 + 7;
      const generator = createEndlessGenerator(seed, G, C, undefined, undefined, { walls: true });
      for (let index = 1; index <= 10; index++) {
        const chunk = generator.chunk(index);
        const wallSteps = chunk.route.filter((step) => step.kicks);
        if (!wallSteps.length) continue;
        const nextFloor = generator.floor(index + 1);
        const platforms = [...generator.chunk(index - 1).platforms, ...chunk.platforms, nextFloor];
        const updrafts = chunk.updrafts;
        const anchor = chunk.platforms[0]!;
        const bot = createRouteBot();
        let state: PlayerState = { ...teleportPlayer(anchor.x, topOf(anchor) - H / 2), grounded: true, platformId: anchor.id, jumpLatch: false };
        let crumble = NO_CRUMBLE;
        let lastKickFeet: number | null = null;
        for (let i = 0; i < 120 * 200 && state.platformId !== nextFloor.id; i++) {
          const now = platformsAt(platforms, (i + 1) * stepMs, stepMs);
          const standing = state.grounded ? state.platformId : null;
          const input = bot.input(state, chunk.route, (id) => now.find((p) => p.id === id), { base: G, current: G, platforms: now, updrafts });
          const out = stepWorld(state, crumble, input, now, updrafts, G.view.width, G, stepMs);
          if (standing && !out.player.grounded) lastKickFeet = null;
          state = out.player; crumble = out.crumble;
          if (out.events.wallKicked) lastKickFeet = state.y + H / 2;
          const landed = out.events.landed;
          if (!landed) continue;
          const step = wallSteps.find((s) => s.toId === landed.platformId);
          if (!step) continue;
          checked++;
          const source = platforms.find((p) => p.id === step.fromId)!, target = platforms.find((p) => p.id === step.toId)!;
          if (lastKickFeet !== null && topOf(target) > lastKickFeet) belowKick++;
          if (landed.fallHeightPx > 0 && topOf(target) <= topOf(source)) falls.push(`seed ${seed} chunk ${index} ${step.fromId}->${step.toId}: ${landed.fallHeightPx.toFixed(1)} px`);
        }
      }
    }
    expect(checked).toBeGreaterThan(30);
    // The case this is about happens: many of them come down below their last kick.
    expect(belowKick).toBeGreaterThan(5);
    expect(falls).toEqual([]);
  }, 180_000);
});
