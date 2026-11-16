/**
 * Keeps only the chunks near the player alive, so the climb can go on forever with a fixed cost.
 *
 * The generator can rebuild any chunk identically, so nothing is stored for chunks that scroll
 * away. Each update reports which chunks appeared and which went away; the scene uses that to
 * create and destroy platform art and wax, and passes `platforms()` to the physics.
 */
import type { PlatformData } from '../../shared/contracts/content';
import type { EndlessConfig } from '../../config/endless.config';
import type { EndlessChunk, EndlessGenerator, WaxSpot } from './generator';

export interface StreamChange {
  added: EndlessChunk[];
  removed: EndlessChunk[];
}

export interface ChunkStream {
  /** Index of the chunk a body with its feet at `feetY` is in (0 at the start, never negative). */
  indexAt(feetY: number): number;
  /** Move the window to the player. Returns what changed, or null when nothing did. */
  update(feetY: number): StreamChange | null;
  /** Every live ledge, lowest chunk first. The array is replaced only when the window moves. */
  platforms(): readonly PlatformData[];
  wax(): readonly WaxSpot[];
  chunks(): readonly EndlessChunk[];
  /** Highest and lowest y of the live window, for the reach search and the camera. */
  bounds(): { top: number; bottom: number };
}

export function createChunkStream(generator: EndlessGenerator, config: EndlessConfig): ChunkStream {
  let live: EndlessChunk[] = [];
  let platforms: PlatformData[] = [];
  let wax: WaxSpot[] = [];
  let first = -1;
  let last = -1;

  const indexAt = (feetY: number): number => {
    const raw = Math.floor((config.baseFloorTopPx - feetY) / config.chunkHeightPx);
    return Number.isFinite(raw) ? Math.max(0, raw) : 0;
  };

  return {
    indexAt,
    update(feetY) {
      const centre = indexAt(feetY);
      const from = Math.max(0, centre - config.keepBelow);
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
      // One more landing above the window: the top chunk's last jump lands on it.
      platforms = [...live.flatMap((chunk) => chunk.platforms), generator.floor(to + 1)];
      wax = live.flatMap((chunk) => chunk.wax);
      return change;
    },
    platforms: () => platforms,
    wax: () => wax,
    chunks: () => live,
    bounds: () => ({
      top: generator.floorTopPx(Math.max(0, last) + 1) - config.chunkHeightPx / 2,
      bottom: generator.floorTopPx(Math.max(0, first)) + config.ledgeHeightPx,
    }),
  };
}
