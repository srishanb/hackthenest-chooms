/**
 * Updraft columns read in the snow bands (QA finding 8): their streaks and sides are drawn in a palette with
 * real contrast against pale snow, while the forest keeps the pale look.
 */
import { describe, expect, it } from 'vitest';
import { LEDGE_KINDS_VIEW_CONFIG as V } from '../../config/ledge-kinds-view.config';

/** Relative luminance of 0xRRGGBB (WCAG). */
function luminance(color: number): number {
  const channel = (shift: number): number => {
    const c = ((color >> shift) & 255) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
}
const contrast = (a: number, b: number): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
/** The pale snow and frosted rock of the snow bands' art (sampled from the screenshots QA took). */
const PALE_SNOW = 0xd6e4ee;

describe('updraft columns in the snow', () => {
  it('draw streaks and sides with at least 3:1 contrast against pale snow; the forest keeps the pale streaks', () => {
    expect(contrast(V.updraftSnow.streak, PALE_SNOW)).toBeGreaterThanOrEqual(3);
    expect(contrast(V.updraftSnow.edge, PALE_SNOW)).toBeGreaterThanOrEqual(3);
    expect(contrast(V.updraft.streak, PALE_SNOW)).toBeLessThan(1.5);
  });
});
