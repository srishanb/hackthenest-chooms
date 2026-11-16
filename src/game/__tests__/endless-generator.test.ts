/**
 * The endless generator must never ship a chunk that cannot be climbed. These tests replay every
 * generated route with the real `stepPlayer`, over many seeds and heights.
 */
import { describe, expect, it } from 'vitest';
import { ENDLESS_CONFIG } from '../../config/endless.config';
import { GAME_CONFIG } from '../../config/game.config';
import { buildArcTable, descentAt } from '../endless/jump-arcs';
import { createEndlessGenerator, difficultyAt, replayStep } from '../endless/generator';

const WIDTH = GAME_CONFIG.view.width;
const topOf = (p: { y: number; height: number }): number => p.y - p.height / 2;

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

  it('every chunk starts with a full-width landing at a fixed height', () => {
    const generator = createEndlessGenerator(3, GAME_CONFIG, ENDLESS_CONFIG);
    for (const index of [0, 1, 9]) {
      const landing = generator.chunk(index).platforms[0]!;
      expect(landing.width).toBe(WIDTH);
      expect(topOf(landing)).toBe(ENDLESS_CONFIG.baseFloorTopPx - index * ENDLESS_CONFIG.chunkHeightPx);
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
          expect(p.width).toBeGreaterThanOrEqual(ENDLESS_CONFIG.width.minPx);
          // Everything stays between this landing and the next one.
          expect(topOf(p)).toBeLessThanOrEqual(chunk.floorTopPx);
          expect(topOf(p)).toBeGreaterThan(topOf(nextFloor));
        }
        // The guaranteed path: start on this landing, end on the next, each jump lands where it says.
        expect(chunk.route[0]!.fromId).toBe(chunk.platforms[0]!.id);
        expect(chunk.route.at(-1)!.toId).toBe(nextFloor.id);
        for (let i = 0; i < chunk.route.length; i++) {
          const step = chunk.route[i]!;
          if (i > 0) expect(step.fromId).toBe(chunk.route[i - 1]!.toId);
          expect(replayStep(step, all, WIDTH, GAME_CONFIG), `seed ${seed * 7919} chunk ${index} step ${i}`).toBe(step.toId);
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

  it('ice appears only in the snow bands, never on a landing, and within the configured grip', () => {
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

  it('rejects a bad chunk index', () => {
    const generator = createEndlessGenerator(1, GAME_CONFIG, ENDLESS_CONFIG);
    expect(() => generator.chunk(-1)).toThrow();
    expect(() => generator.chunk(1.5)).toThrow();
  });
});
