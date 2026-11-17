/**
 * Keeps only the chunks near the player alive, so the climb can go on forever with a fixed cost.
 *
 * The generator can rebuild any chunk identically, so nothing is stored for chunks that scroll
 * away. Each update reports which chunks appeared and which went away; the scene uses that to
 * create and destroy platform art and wax, and passes `platforms()` to the physics.
 *
 * Falls: above the ground nothing spans the screen (Decision D-33), so a fall can pass through any
 * number of chunks. The window is therefore always the player's chunk, `keepBelow` chunks under it
 * and `keepAbove` over it, and it follows the player down during a fall. One chunk below is a full
 * chunk height (960 px) of ledges under the feet; `update` also takes how far the body may fall
 * before the next update, and loads every chunk down to there, so even a very fast fall never steps
 * past a ledge whose chunk was not loaded. The ground (chunk 0) catches the fall in the end.
 */
import type { PlatformData, UpdraftData } from '../../shared/contracts/content';
import type { EndlessConfig } from '../../config/endless.config';
import type { EndlessChunk, EndlessGenerator, WaxSpot } from './generator';

export interface StreamChange {
  added: EndlessChunk[];
  removed: EndlessChunk[];
}

export interface ChunkStream {
  /** Index of the chunk a body with its feet at `feetY` is in (0 at the start, never negative). */
  indexAt(feetY: number): number;
  /**
   * Move the window to the player. `fallAheadPx` is how far below `feetY` the body may get before the
   * next update (0 when standing); chunks down to there are loaded too. Returns what changed, or null.
   */
  update(feetY: number, fallAheadPx?: number): StreamChange | null;
  /** Every live ledge, lowest chunk first. The array is replaced only when the window moves. */
  platforms(): readonly PlatformData[];
  wax(): readonly WaxSpot[];
  /** Every live updraft column (Decision D-36), for the physics and the drawing. Replaced with `platforms()`. */
  updrafts(): readonly UpdraftData[];
  chunks(): readonly EndlessChunk[];
  /** Highest and lowest y of the live window, for the reach search and the camera. */
  bounds(): { top: number; bottom: number };
}

export function createChunkStream(generator: EndlessGenerator, config: EndlessConfig): ChunkStream {
  let live: EndlessChunk[] = [];
  let platforms: PlatformData[] = [];
  let wax: WaxSpot[] = [];
  let updrafts: UpdraftData[] = [];
  let first = -1;
  let last = -1;

  const indexAt = (feetY: number): number => {
    const raw = Math.floor((config.baseFloorTopPx - feetY) / config.chunkHeightPx);
    return Number.isFinite(raw) ? Math.max(0, raw) : 0;
  };

  return {
    indexAt,
    update(feetY, fallAheadPx = 0) {
      const centre = indexAt(feetY);
      const ahead = Number.isFinite(fallAheadPx) ? Math.max(0, fallAheadPx) : 0;
      // Always the chunk below (no landing catches a fall), and every chunk the next step can reach.
      const from = Math.max(0, Math.min(centre - config.keepBelow, indexAt(feetY + ahead)));
      const to = centre + config.keepAbove;
      if (from === first && to === last) return null;
      const next: EndlessChunk[] = [];
      for (let index = from; index <= to; index++) next.push(live.find((chunk) => chunk.index === index) ?? generator.chunk(index));
      const change: StreamChange = {
        added: next.filter((chunk) => !live.includes(chunk)),
        removed: live.filter((chunk) => !next.includes(chunk)),
      };
      live = next;
      first = from;
      last = to;
      // One more anchor above the window: the top chunk's last jump lands on it.
      platforms = [...live.flatMap((chunk) => chunk.platforms), generator.floor(to + 1)];
      wax = live.flatMap((chunk) => chunk.wax);
      updrafts = live.flatMap((chunk) => chunk.updrafts);
      return change;
    },
    platforms: () => platforms,
    wax: () => wax,
    updrafts: () => updrafts,
    chunks: () => live,
    bounds: () => ({
      top: generator.floorTopPx(Math.max(0, last) + 1) - config.chunkHeightPx / 2,
      bottom: generator.floorTopPx(Math.max(0, first)) + config.ledgeHeightPx,
    }),
  };
}
