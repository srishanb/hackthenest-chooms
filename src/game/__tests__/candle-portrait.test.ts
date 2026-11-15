/** The portrait shows how alive the candle is: bright and still when strong, smoky and guttering when weak. */
import { describe, expect, it } from 'vitest';
import { createCandleGenome } from '../candle/candle-genome';
import { GUTTER_BELOW, isGuttered, PORTRAIT_RADIUS, rasterPortrait } from '../candle/portrait';

const genome = createCandleGenome(40);
const portrait = (strength01: number, timeMs = 0, reducedMotion = false) =>
  rasterPortrait(genome, { strength01, timeMs, reducedMotion, growth: 1 });
const smoke = (p: ReturnType<typeof portrait>) => p.pixels.filter((x) => x.color === 0x8a8f99);
const brightness = (color: number) => ((color >> 16) & 255) + ((color >> 8) & 255) + (color & 255);

describe('candle portrait', () => {
  it('everything stays inside the circle', () => {
    for (const s of [0, 0.2, 0.5, 1]) {
      for (const p of portrait(s, 777).pixels) expect(p.x * p.x + p.y * p.y).toBeLessThan(PORTRAIT_RADIUS * PORTRAIT_RADIUS);
    }
  });

  it('a strong candle glows more, has a bigger flame and no smoke', () => {
    const strong = portrait(1, 0, true);
    const weak = portrait(0.35, 0, true);
    expect(strong.glow01).toBeGreaterThan(weak.glow01);
    expect(strong.pixels.length).toBeGreaterThan(weak.pixels.length);
    expect(smoke(portrait(1, 500))).toEqual([]);
  });

  it('the wax dims as the light fades', () => {
    const top = (p: ReturnType<typeof portrait>) => p.pixels.filter((x) => x.y === 14).reduce((sum, x) => sum + brightness(x.color), 0);
    expect(top(portrait(1, 0, true))).toBeGreaterThan(top(portrait(0.1, 0, true)));
  });

  it('a weak candle smokes, more as it weakens', () => {
    const wisps = (s: number) => Math.max(...Array.from({ length: 20 }, (_, i) => smoke(portrait(s, i * 137)).length));
    expect(wisps(0.5)).toBeGreaterThan(0);
    expect(wisps(0.05)).toBeGreaterThan(wisps(0.5));
  });

  it('near death the flame gutters out in some frames, never above the threshold', () => {
    const out = Array.from({ length: 60 }, (_, f) => isGuttered(genome, 0.05, f, false));
    expect(out.some(Boolean)).toBe(true);
    expect(out.every(Boolean)).toBe(false);
    expect(Array.from({ length: 60 }, (_, f) => isGuttered(genome, GUTTER_BELOW, f, false)).some(Boolean)).toBe(false);
    const guttered = Array.from({ length: 60 }, (_, f) => portrait(0.05, (f * 1000) / 12)).find((p) => p.guttered);
    expect(guttered?.pixels.some((p) => p.color === 0xff4a1f)).toBe(true);
  });

  it('reduced motion: no guttering or smoke, but size, dimming and glow still change', () => {
    expect(Array.from({ length: 60 }, (_, f) => isGuttered(genome, 0.05, f, true)).some(Boolean)).toBe(false);
    expect(smoke(portrait(0.05, 1234, true))).toEqual([]);
    expect(portrait(0.05, 0, true)).toEqual(portrait(0.05, 5000, true));
    expect(portrait(1, 0, true).glow01).toBeGreaterThan(portrait(0.05, 0, true).glow01);
  });
});
