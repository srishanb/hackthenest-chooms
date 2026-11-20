/**
 * With no other candle, the two-player rules change nothing (Decision D-38): the generator's chunks and long
 * random-input runs of the endless and the classic climb are exactly what they were before versus.ts existed.
 *
 * The fingerprint below was computed with this same code against the base commit (7f2a567, `git archive` in a
 * scratch folder) and pinned. It covers worlds without walls only, so the wall prototype's own fixes cannot move it.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ENDLESS_CONFIG } from '../../config/endless.config';
import { GAME_CONFIG } from '../../config/game.config';
import { SECTIONS } from '../../content/sections/index';
import { createEndlessGenerator } from '../endless/generator';
import { NO_CRUMBLE } from '../player/crumble';
import { createPlayer, stepPlayer } from '../player/movement';
import type { PlayerInput, PlayerState } from '../player/types';
import { stepWorld } from '../player/world-step';
import { platformsAt } from '../world/environment';

const DT = 1000 / GAME_CONFIG.stepHz;
const BASE_FINGERPRINT = 'd5dd019540e19dccf1246f2ccd18b9a793026cfeaa9badb454378927b63eda3b';

function fingerprint(): string {
  const hash = createHash('sha256');
  for (const seed of [3, 42, 977]) {
    const generator = createEndlessGenerator(seed, GAME_CONFIG, ENDLESS_CONFIG, undefined, undefined, { walls: false });
    for (let c = 0; c < 5; c++) { const chunk = generator.chunk(c); hash.update(JSON.stringify([chunk.platforms, chunk.wax, chunk.route, chunk.updrafts])); }
  }
  let rng = 99;
  const rand = (): number => ((rng = (rng * 1103515245 + 12345) >>> 0) / 4294967296);
  const generator = createEndlessGenerator(42, GAME_CONFIG, ENDLESS_CONFIG);
  const ledges = [0, 1, 2].flatMap((c) => generator.chunk(c).platforms), columns = [0, 1, 2].flatMap((c) => generator.chunk(c).updrafts);
  let player = createPlayer(480, ENDLESS_CONFIG.baseFloorTopPx - 18), crumble = NO_CRUMBLE;
  let input: PlayerInput = { left: false, right: false, jump: false };
  for (let i = 0; i < 6000; i++) {
    if (i % 23 === 0) input = { left: rand() < 0.35, right: rand() < 0.35, jump: rand() < 0.3 };
    const out = stepWorld(player, crumble, input, platformsAt(ledges, i * DT, DT), columns, 960, GAME_CONFIG, DT);
    player = out.player; crumble = out.crumble; hash.update(JSON.stringify([player, out.events, out.crumbled]));
  }
  return hash.digest('hex');
}

describe('no other candle, no change', () => {
  it('chunks and a random endless run match the pinned fingerprint of the base', () => {
    expect(fingerprint()).toBe(BASE_FINGERPRINT);
  });

  it('an empty list of other candles and a zero shove give the same steps as none (endless and classic)', () => {
    let rng = 7;
    const rand = (): number => ((rng = (rng * 1103515245 + 12345) >>> 0) / 4294967296);
    const worlds = [
      { ledges: [0, 1].flatMap((c) => createEndlessGenerator(5, GAME_CONFIG, ENDLESS_CONFIG).chunk(c).platforms), spawn: { x: 480, y: 482 } },
      ...SECTIONS.slice(0, 3).map((section) => ({ ledges: section.platforms, spawn: section.spawn })),
    ];
    for (const world of worlds) {
      let a: PlayerState = createPlayer(world.spawn.x, world.spawn.y), b = a;
      let input: PlayerInput = { left: false, right: false, jump: false };
      for (let i = 0; i < 4000; i++) {
        if (i % 19 === 0) input = { left: rand() < 0.35, right: rand() < 0.35, jump: rand() < 0.3 };
        const platforms = platformsAt(world.ledges, i * DT, DT);
        const plain = stepPlayer(a, input, platforms, 960, GAME_CONFIG, DT);
        const empty = stepPlayer(b, input, platforms, 960, GAME_CONFIG, DT, { others: [], pushVx: 0 });
        expect(empty).toEqual(plain);
        a = plain.state; b = empty.state;
      }
    }
  });
});
