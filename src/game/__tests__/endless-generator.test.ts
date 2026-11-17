/**
 * The endless generator must never ship a chunk that cannot be climbed. These tests replay every
 * generated route with the real `stepPlayer`, over many seeds and heights.
 */
import { describe, expect, it } from 'vitest';
import { ENDLESS_CONFIG } from '../../config/endless.config';
import { GAME_CONFIG } from '../../config/game.config';
import { buildArcTable, descentAt } from '../endless/jump-arcs';
import { ENDLESS_PIECES_CONFIG as T } from '../../config/endless-pieces.config';
import { createEndlessGenerator, difficultyAt, replayStep, stepsHold } from '../endless/generator';

const WIDTH = GAME_CONFIG.view.width;
const topOf = (p: { y: number; height: number }): number => p.y - p.height / 2;
/** The narrowest ledge allowed: ordinary ledges, or the narrower ledges set pieces use on purpose. */
const NARROWEST = Math.min(ENDLESS_CONFIG.width.minPx, T.pillars.widthPx, T.fork.riskyWidthPx);

describe('jump arcs', () => {
  const arcs = buildArcTable(GAME_CONFIG, ENDLESS_CONFIG.chargeLevels);
  it('higher charges jump higher, and side jumps travel sideways', () => {
    for (const table of [arcs.side, arcs.up]) {
      for (let i = 1; i < table.length; i++) expect(table[i]!.apexPx).toBeGreaterThan(table[i - 1]!.apexPx);
    }
    expect(arcs.up.every((arc) => arc.points.every((p) => p.dx === 0))).toBe(true);
    expect(arcs.side.at(-1)!.points.at(-1)!.dx).toBeGreaterThan(200);
  });
  it('finds the falling crossing of a height, and refuses heights the arc barely reaches', () => {
    const arc = arcs.side.at(-1)!;
    const hit = descentAt(arc, 100, ENDLESS_CONFIG.apexClearancePx)!;
    expect(hit.after.vy).toBeGreaterThan(0);
    expect(hit.before.dy).toBeLessThanOrEqual(-100);
    expect(hit.after.dy).toBeGreaterThan(-100);
    expect(descentAt(arc, arc.apexPx - 2, ENDLESS_CONFIG.apexClearancePx)).toBeNull();
  });
});

describe('endless generator', () => {
  it('gives the same chunk for the same seed and index, and different chunks otherwise', () => {
    const a = createEndlessGenerator(7, GAME_CONFIG, ENDLESS_CONFIG);
    const b = createEndlessGenerator(7, GAME_CONFIG, ENDLESS_CONFIG);
    // Out of order on purpose: a chunk must not depend on which chunks were built before it.
    const late = b.chunk(5);
    b.chunk(0);
    expect(a.chunk(5)).toEqual(late);
    expect(a.chunk(4)).not.toEqual(a.chunk(5));
    expect(createEndlessGenerator(8, GAME_CONFIG, ENDLESS_CONFIG).chunk(5).platforms).not.toEqual(late.platforms);
  });

  it('only the ground spans the screen: every later chunk starts on an ordinary anchor ledge at a fixed height', () => {
    // The widest ordinary ledge the config allows: the easy width at the top of its jitter.
    const widest = ENDLESS_CONFIG.width.easyPx * (1 + ENDLESS_CONFIG.width.widthJitter01);
    let anchors = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const generator = createEndlessGenerator(seed * 31337, GAME_CONFIG, ENDLESS_CONFIG);
      for (const index of [0, 1, 2, 3, 6, 9, 15, 30]) {
        const chunk = generator.chunk(index);
        const anchor = chunk.platforms[0]!;
        expect(anchor.id).toBe(`e${index}:floor`);
        expect(topOf(anchor)).toBe(ENDLESS_CONFIG.baseFloorTopPx - index * ENDLESS_CONFIG.chunkHeightPx);
        expect(anchor.type).toBe('static');
        expect(anchor.motion).toBeUndefined();
        if (index === 0) expect(anchor.width).toBe(WIDTH);
        for (const p of index === 0 ? chunk.platforms.slice(1) : chunk.platforms) {
          expect(p.width, `${p.id} seed ${seed * 31337}`).toBeLessThanOrEqual(widest);
        }
        if (index > 0) {
          anchors++;
          expect(anchor.width).toBeGreaterThanOrEqual(ENDLESS_CONFIG.width.minPx);
          expect(anchor.x - anchor.width / 2).toBeGreaterThanOrEqual(0);
          expect(anchor.x + anchor.width / 2).toBeLessThanOrEqual(WIDTH);
        }
      }
    }
    expect(anchors).toBe(40 * 7);
  });

  it('the cheap anchor equals the generated one, and a chunk built alone equals one built after its neighbours', () => {
    for (const seed of [5, 42, 777, 90210]) {
      const alone = createEndlessGenerator(seed, GAME_CONFIG, ENDLESS_CONFIG);
      const inOrder = createEndlessGenerator(seed, GAME_CONFIG, ENDLESS_CONFIG);
      for (let index = 0; index <= 8; index++) inOrder.chunk(index);
      const fresh = (index: number) => createEndlessGenerator(seed, GAME_CONFIG, ENDLESS_CONFIG).chunk(index);
      for (const index of [1, 4, 8]) {
        expect(alone.floor(index)).toEqual(fresh(index).platforms[0]);
        expect(fresh(index)).toEqual(inOrder.chunk(index));
        // The last jump of the chunk below targets exactly this anchor.
        expect(inOrder.chunk(index - 1).route.at(-1)!.toId).toBe(alone.floor(index).id);
      }
      // Anchors move about: they are not all in the middle.
      const xs = new Set(Array.from({ length: 12 }, (_, i) => alone.floor(i + 1).x));
      expect(xs.size).toBeGreaterThan(6);
    }
  });

  it('difficulty ramps from 0 to 1 and stays there', () => {
    expect(difficultyAt(0, ENDLESS_CONFIG)).toBe(0);
    expect(difficultyAt(ENDLESS_CONFIG.rampChunks, ENDLESS_CONFIG)).toBe(1);
    expect(difficultyAt(ENDLESS_CONFIG.rampChunks * 5, ENDLESS_CONFIG)).toBe(1);
  });

  it('over many seeds and heights: ledges fit the walls, do not crowd, and the route really climbs the chunk', () => {
    let ledges = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const generator = createEndlessGenerator(seed * 7919, GAME_CONFIG, ENDLESS_CONFIG);
      for (const index of [0, 1, 2, 5, 9, 14, 20, 40]) {
        const chunk = generator.chunk(index);
        const nextFloor = generator.floor(index + 1);
        const all = [...chunk.platforms, nextFloor];
        const ids = new Set(all.map((p) => p.id));
        expect(ids.size).toBe(all.length);
        for (const p of chunk.platforms) {
          ledges++;
          expect(p.x - p.width / 2).toBeGreaterThanOrEqual(0);
          expect(p.x + p.width / 2).toBeLessThanOrEqual(WIDTH);
          expect(p.width).toBeGreaterThanOrEqual(NARROWEST);
          // Everything stays between this anchor and the next one.
          expect(topOf(p)).toBeLessThanOrEqual(chunk.floorTopPx);
          expect(topOf(p)).toBeGreaterThan(topOf(nextFloor));
        }
        // The guaranteed path: start on this anchor, end on the next, each jump lands where it says,
        // even with the whole next chunk in place (its ledges must not catch the jump onto its anchor).
        const withNext = [...chunk.platforms, ...generator.chunk(index + 1).platforms];
        // Updraft columns (Decision D-36) of this chunk, and of the next one too, act on every step.
        const columns = chunk.updrafts, columnsWithNext = [...chunk.updrafts, ...generator.chunk(index + 1).updrafts];
        expect(chunk.route[0]!.fromId).toBe(chunk.platforms[0]!.id);
        expect(chunk.route.at(-1)!.toId).toBe(nextFloor.id);
        for (let i = 0; i < chunk.route.length; i++) {
          const step = chunk.route[i]!;
          if (i > 0) expect(step.fromId).toBe(chunk.route[i - 1]!.toId);
          expect(replayStep(step, all, WIDTH, GAME_CONFIG, 0, false, columns), `seed ${seed * 7919} chunk ${index} step ${i}`).toBe(step.toId);
          expect(replayStep(step, withNext, WIDTH, GAME_CONFIG, 0, false, columnsWithNext), `seed ${seed * 7919} chunk ${index} step ${i} with next`).toBe(step.toId);
        }
        // Wax floats above a ledge of this chunk, and there is always some.
        expect(chunk.wax.length).toBeGreaterThan(0);
        for (const drop of chunk.wax) {
          expect(chunk.platforms.some((p) => Math.abs(p.x - drop.x) < p.width / 2 && topOf(p) > drop.y)).toBe(true);
        }
      }
    }
    expect(ledges).toBeGreaterThan(3000);
  }, 60_000);

  it('ice appears only in the snow bands, never on an anchor, and within the configured grip', () => {
    let icy = 0, snowLedges = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const generator = createEndlessGenerator(seed * 104729, GAME_CONFIG, ENDLESS_CONFIG);
      for (let index = 0; index < 9; index++) {
        const snow = Math.floor(index / ENDLESS_CONFIG.biome.chunksPerBand) % 2 === 1;
        const chunk = generator.chunk(index);
        expect(chunk.platforms[0]!.type).toBe('static');
        for (const p of chunk.platforms.slice(1)) {
          if (snow) snowLedges++;
          if (p.type !== 'slippery') { expect(p.ice01).toBeUndefined(); continue; }
          icy++;
          expect(snow).toBe(true);
          expect(p.ice01).toBeGreaterThanOrEqual(ENDLESS_CONFIG.ice.min01);
          expect(p.ice01).toBeLessThanOrEqual(ENDLESS_CONFIG.ice.max01);
        }
      }
    }
    // About a third of snow ledges are icy.
    expect(icy / snowLedges).toBeGreaterThan(ENDLESS_CONFIG.ice.chance - 0.1);
    expect(icy / snowLedges).toBeLessThan(ENDLESS_CONFIG.ice.chance + 0.1);
  });

  it('side ledges move, and the main path only in a moving crossing; each stays in the walls, keeps its jump at both ends, and carries its wax', () => {
    let moving = 0;
    let mainMovers = 0;
    for (let seed = 1; seed <= 16; seed++) {
      const generator = createEndlessGenerator(seed * 15485863, GAME_CONFIG, ENDLESS_CONFIG);
      for (const index of [0, 2, 4, 7, 12, 25]) {
        const chunk = generator.chunk(index);
        const all = [...chunk.platforms, generator.floor(index + 1)];
        const onRoute = new Set(chunk.route.flatMap((step) => [step.fromId, step.toId]));
        expect(chunk.sideRoute.length).toBe(chunk.platforms.filter((p) => p.id.includes(':s')).length);
        for (const ledge of chunk.platforms) {
          if (!ledge.motion) { expect(ledge.type).not.toBe('moving'); continue; }
          moving++;
          expect(index).toBeGreaterThanOrEqual(ENDLESS_CONFIG.moving.fromChunk);
          expect(ledge.type).toBe('moving');
          const { distance, periodMs, axis } = ledge.motion;
          // Every mover, on the route or off it: slides sideways and keeps inside the walls at both ends.
          expect(axis).toBe('x');
          expect(ledge.x - ledge.width / 2 - distance).toBeGreaterThanOrEqual(0);
          expect(ledge.x + ledge.width / 2 + distance).toBeLessThanOrEqual(WIDTH);
          const drop = chunk.wax.find((w) => w.ledgeId === ledge.id);
          if (onRoute.has(ledge.id)) {
            // The main path moves only in a moving crossing, and every step holds wherever the ledge is.
            mainMovers++;
            expect(chunk.pieces.find((span) => span.ledgeIds.includes(ledge.id))?.id).toBe('moving-crossing');
            expect(distance).toBeGreaterThanOrEqual(T.movingCrossing.distancePx[0]);
            expect(distance).toBeLessThanOrEqual(T.movingCrossing.distancePx[1]);
            expect(periodMs).toBeGreaterThanOrEqual(T.movingCrossing.periodMs[0]);
            expect(periodMs).toBeLessThanOrEqual(T.movingCrossing.periodMs[1]);
            expect(stepsHold([...chunk.route, ...chunk.altRoute], all, WIDTH, GAME_CONFIG, chunk.updrafts)).toBe(true);
            // Wax on a main-path mover (if the chunk put any there) rides it too.
            if (drop) expect(drop.ledgeX).toBe(ledge.x);
            continue;
          }
          expect(distance).toBeGreaterThanOrEqual(ENDLESS_CONFIG.moving.minDistancePx);
          expect(distance).toBeLessThanOrEqual(ENDLESS_CONFIG.moving.maxDistancePx);
          expect(periodMs).toBeGreaterThanOrEqual(ENDLESS_CONFIG.moving.periodMs[0]);
          // Its own jump lands on it wherever it is in its travel, and the main path is never caught by it.
          const jump = chunk.sideRoute.find((step) => step.toId === ledge.id)!;
          for (const offset of [-distance, 0, distance]) {
            const shifted = all.map((p) => (p.id === ledge.id ? { ...p, x: p.x + offset } : p));
            expect(replayStep(jump, shifted, WIDTH, GAME_CONFIG, 0, false, chunk.updrafts), `seed ${seed} chunk ${index} ${ledge.id} at ${offset}`).toBe(ledge.id);
            for (const step of chunk.route) expect(replayStep(step, shifted, WIDTH, GAME_CONFIG, 0, false, chunk.updrafts)).toBe(step.toId);
          }
          // Its wax knows which ledge it rides.
          expect(drop!.ledgeX).toBe(ledge.x);
        }
      }
    }
    expect(moving).toBeGreaterThan(8);
    expect(mainMovers).toBeGreaterThan(0);
  });

  it('rejects a bad chunk index', () => {
    const generator = createEndlessGenerator(1, GAME_CONFIG, ENDLESS_CONFIG);
    expect(() => generator.chunk(-1)).toThrow();
    expect(() => generator.chunk(1.5)).toThrow();
  });
});
