/** Background birds are decoration: they idle, fly from the candle, and their art and credits are in place. */
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { WILDLIFE_CONFIG } from '../../config/wildlife.config';
import { birdFrame, isAirborne, perchedBird, stepBird, type Bird } from '../forest/bird-behaviour';

const C = WILDLIFE_CONFIG.bird;
const run = (bird: Bird, ms: number, threat: { x: number; y: number } | null = null, leave = false): Bird => {
  for (let t = 0; t < ms; t += 16) bird = stepBird(bird, 16, threat, leave, C);
  return bird;
};

it('a bird left alone stays on its ledge and fidgets', () => {
  const start = perchedBird(300, 200, 12345, C);
  const acts = new Set<string>();
  let bird = start;
  for (let t = 0; t < 60000; t += 16) { bird = stepBird(bird, 16, null, false, C); acts.add(bird.act); }
  expect(bird.x).toBe(300); expect(bird.y).toBe(200);
  expect(acts.has('takeoff')).toBe(false); expect(acts.has('fly')).toBe(false);
  // Over a minute it does more than stand.
  expect(acts.size).toBeGreaterThan(2);
});

it('the same seed gives the same bird, a different seed a different one', () => {
  expect(run(perchedBird(0, 0, 7, C), 20000)).toEqual(run(perchedBird(0, 0, 7, C), 20000));
  const histories = [7, 8].map((seed) => {
    let bird = perchedBird(0, 0, seed, C); const acts: string[] = [];
    for (let t = 0; t < 20000; t += 16) { bird = stepBird(bird, 16, null, false, C); acts.push(bird.act); }
    return acts.join();
  });
  expect(histories[0]).not.toBe(histories[1]);
});

it('flies up and away from the candle when it comes near, and ignores it when far', () => {
  const far = run(perchedBird(300, 200, 1, C), 2000, { x: 300 + C.startleRadiusPx + 5, y: 200 });
  expect(isAirborne(far)).toBe(false);
  for (const side of [-1, 1] as const) {
    const scared = run(perchedBird(300, 200, 1, C), 3000, { x: 300 + side * 40, y: 200 });
    expect(scared.act).toBe('fly');
    expect(Math.sign(scared.x - 300)).toBe(-side);
    expect(scared.y).toBeLessThan(200);
    expect(scared.facing).toBe(-side);
  }
});

it('leaves when the forest has turned, even with nothing near', () => {
  expect(run(perchedBird(300, 200, 3, C), 3000, null, true).act).toBe('fly');
});

it('only ever shows cells of the clip it is playing', () => {
  let bird = perchedBird(300, 200, 99, C);
  for (let t = 0; t < 30000; t += 16) {
    bird = stepBird(bird, 16, t > 20000 ? { x: 310, y: 200 } : null, false, C);
    const clip = C.clips[bird.act], frame = birdFrame(bird, C);
    expect(Math.floor(frame / C.columns)).toBe(clip.row);
    expect(frame % C.columns).toBeLessThan(clip.frames);
  }
});

it('ignores bad time steps', () => {
  const bird = perchedBird(300, 200, 5, C);
  for (const dt of [NaN, -50, Infinity]) expect(stepBird(bird, dt, null, false, C).x).toBe(300);
});

it('every wildlife file is in the repo unchanged, with its licence evidence and credit', () => {
  const inventory = JSON.parse(readFileSync('public/assets/wildlife/inventory.json', 'utf8')) as Array<{ file: string; sha256: string }>;
  expect(inventory.length).toBe(13);
  const credits = readFileSync('CREDITS.md', 'utf8');
  for (const row of inventory) {
    const path = `public/${row.file}`;
    expect(existsSync(path), path).toBe(true);
    expect(createHash('sha256').update(readFileSync(path)).digest('hex'), path).toBe(row.sha256);
  }
  const evidence = readFileSync('public/assets/wildlife/license-source.md', 'utf8');
  for (const author of ['inmenus', 'Casual Garage Coder', 'reodesuxz', 'Foozle']) {
    expect(evidence).toContain(author); expect(credits).toContain(author);
  }
  expect(evidence).toContain('No generative AI was used');
});
