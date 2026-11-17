/**
 * Shared by the two updraft pieces: put a column beside the entry ledge, then trace a jump through it
 * onto a new ledge. Tries the open side first, then the other, with fresh sizes, a few times.
 *
 * Why a few tries: a column changes every flight that passes through it, so it is often refused because
 * the jump that reached the entry ledge crossed that air. A refused or unused column is taken back out
 * of the run before the next try (nothing else in the run depends on it yet).
 */
import type { PlatformData } from '../../../shared/contracts/content';
import type { FlightSpec, PieceKit, PieceRun } from './types';
import { roomier } from './shared';

/** How many column placements one piece tries. */
const COLUMN_TRIES = 4;

export function besideColumn(kit: PieceKit, entry: PlatformData, run: PieceRun, kind: 'drift' | 'rise',
  tuning: { widthPx: readonly [number, number]; heightPx: readonly [number, number]; gapPx: readonly [number, number] },
  centreY: (entryTop: number, height: number) => number,
  flight: (direction: -1 | 1, columnId: string) => FlightSpec): boolean {
  const top = entry.y - entry.height / 2;
  const open = roomier(kit, entry);
  for (let attempt = 0; attempt < COLUMN_TRIES; attempt++) {
    const direction = (attempt % 2 === 0 ? open : -open) as -1 | 1;
    const edge = entry.x + direction * entry.width / 2;
    const gap = kit.between(tuning.gapPx);
    // As wide as asked, but no wider than the room to the wall.
    const room = direction > 0 ? kit.worldWidth - edge - gap - 2 : edge - gap - 2;
    const width = Math.round(Math.min(kit.between(tuning.widthPx), room));
    if (width < tuning.widthPx[0] * 0.75) continue;
    let height = Math.round(kit.between(tuning.heightPx));
    let y = centreY(top, height);
    // Keep it inside the chunk: under the ceiling and clear of the chunk below.
    const lowest = kit.floorTopPx - kit.game.player.height / 2 - 2;
    if (y + height / 2 > lowest) { const bottom = lowest; height = Math.min(height, bottom - kit.ceilingTopPx); y = bottom - height / 2; }
    if (y - height / 2 < kit.ceilingTopPx) { const highest = kit.ceilingTopPx; height = Math.min(height, (y + height / 2) - highest); y = highest + height / 2; }
    if (height < tuning.heightPx[0] * 0.75) continue;
    const id = `e${kit.index}:u${kit.columns().length + run.updrafts.length + 1}`;
    const column = { id, kind, x: Math.round(edge + direction * (gap + width / 2)), y: Math.round(y), width, height: Math.round(height) };
    if (!kit.addColumn(run, column)) continue;
    if (kit.fly(run, entry, flight(direction, id))) return true;
    run.updrafts.pop();
  }
  return false;
}
