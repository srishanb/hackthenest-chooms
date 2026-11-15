/** Guard the requested upward difficulty curve without prescribing each individual jump. */
import { expect, it } from 'vitest';
import { DEFAULT_SECTIONS } from '../sections/defaults';
const laterStages = DEFAULT_SECTIONS.filter(section => section.stage?.kind !== 'tutorial');
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const summaries = laterStages.map(section => {
  const jumps = section.platforms.slice(1).map((platform, index) => {
    const previous = section.platforms[index]!;
    return { rise: previous.y - platform.y,
      gap: Math.max(0, Math.abs(platform.x - previous.x) - (platform.width + previous.width) / 2) };
  });
  return { width: mean(section.platforms.map(platform => platform.width)),
    rise: mean(jumps.map(jump => jump.rise)), gap: mean(jumps.map(jump => jump.gap)) };
});
it('narrows landing areas and increases vertical and horizontal gaps in every successive stage', () => {
  for (let index = 1; index < summaries.length; index++) {
    expect(summaries[index]!.width).toBeLessThan(summaries[index - 1]!.width);
    expect(summaries[index]!.rise).toBeGreaterThan(summaries[index - 1]!.rise);
    expect(summaries[index]!.gap).toBeGreaterThan(summaries[index - 1]!.gap);
  }
  expect(summaries.at(-1)!.width).toBeLessThan(summaries[0]!.width / 2);
});
it('varies jump heights and routes instead of repeating a uniform staircase', () => {
  for (const section of laterStages) {
    const jumps = section.platforms.slice(1).map((platform, index) => ({
      x: platform.x - section.platforms[index]!.x, y: section.platforms[index]!.y - platform.y }));
    expect(new Set(jumps.map(jump => jump.y)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(jumps.map(jump => Math.abs(jump.x))).size).toBeGreaterThanOrEqual(4);
    expect(jumps.some(jump => jump.x > 0)).toBe(true);
    expect(jumps.some(jump => jump.x < 0)).toBe(true);
  }
});
