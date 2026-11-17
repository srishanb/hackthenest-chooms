/**
 * Updraft columns: rising air that partly cancels gravity while the candle is in the air inside it.
 *
 * The rule, per physics step, while the body's centre is inside a column:
 *   - rising faster than the column's terminal speed: gravity is scaled by `gravity01`, so a jump into
 *     the column floats higher and longer, but never gains speed from the air;
 *   - otherwise: vertical speed eases toward the terminal speed at `brakePerS`, so a fall slows to a
 *     gentle sink (a drift column) or turns into a steady climb (a rise column).
 * Leaving the column restores plain gravity at once. Horizontal movement is untouched (normal air
 * steering). Pure numbers, the same in the game and in the generator's replay; never the signal.
 */
import type { LedgeKindsConfig } from '../../shared/contracts/config';
import type { UpdraftBox } from './types';

/** The first column whose box holds the point (`x`, `y`), or null. */
export function updraftAt(columns: readonly UpdraftBox[] | undefined, x: number, y: number): UpdraftBox | null {
  if (!columns) return null;
  for (const column of columns) {
    if (Math.abs(x - column.x) <= column.width / 2 && Math.abs(y - column.y) <= column.height / 2) return column;
  }
  return null;
}

/** The terminal vertical speed of a column kind (px/s, positive is down). */
export function terminalVy(kind: UpdraftBox['kind'], rules: LedgeKindsConfig['updraft']): number {
  return kind === 'rise' ? rules.riseVy : rules.driftVy;
}

/** Vertical speed after one step of `dt` seconds inside a column of `kind`, from `vy` (px/s, down positive). */
export function updraftVy(vy: number, kind: UpdraftBox['kind'], rules: LedgeKindsConfig['updraft'], gravityY: number, dt: number): number {
  const terminal = terminalVy(kind, rules);
  if (vy < terminal) return Math.min(terminal, vy + gravityY * rules.gravity01 * dt);
  return terminal + (vy - terminal) * Math.exp(-rules.brakePerS * dt);
}
