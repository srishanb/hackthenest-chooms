/**
 * Protected visibility (LAN-3): thin outlines drawn ABOVE the darkness on the ledge you stand on
 * and the top edges of ledges you can jump to, faded out at the edge of the lantern light.
 *
 * Why outlines, and why faded: inside the light they keep the next landing readable while the
 * darkness softens edges; past the light they disappear, so they never point the way through the
 * dark (outline-fade.ts). Nothing here reads the signal; the light radius it fades with is the
 * same capped, smoothed value the darkness uses.
 *
 * Cost: one reach search per platform the first time you stand on it (cached). The selected set
 * stays while airborne; moving outlines follow their platforms. Each frame only the short pieces
 * inside the light are redrawn.
 */
import type * as Phaser from 'phaser';
import type { GameConfig } from '../../shared/contracts/config';
import type { PlatformBox, UpdraftBox } from '../player/types';
import { outlineSegments, reachableLedges, type WorldBounds } from '../world/reachable-ledges';
import { fadeSegments } from './outline-fade';
import { snapToGrid } from '../forest/pixel-grid-snap';

const LINE_WIDTH_PX = 2;
const CURRENT_COLOR = 0xfff3c4;
const REACHABLE_COLOR = 0xc9d4ea;
const LINE_ALPHA = 0.85;

export interface ProtectedVisibility {
  /**
   * Call every frame with the platform under the feet (null in the air keeps the last set), the
   * lantern position and radius (where outlines fade out), and the current platform geometry.
   */
  update(platformId: string | null, lanternX: number, lanternY: number, radiusPx: number, livePlatforms?: readonly PlatformBox[]): void;
}

export function createProtectedVisibility(
  scene: Phaser.Scene,
  depth: number,
  platformSource: readonly PlatformBox[] | (() => readonly PlatformBox[]),
  worldSource: WorldBounds | (() => WorldBounds),
  config: GameConfig,
  /** How much lower than the ledge underfoot a reachable ledge may be and still be outlined (px; 0 = only higher ones). */
  lowerReachPx = 0,
  /** The updraft columns in reach (the endless climb), so ledges reached through one are outlined too. */
  updraftSource: () => readonly UpdraftBox[] = () => [],
): ProtectedVisibility {
  const graphics = scene.add.graphics().setDepth(depth);
  const cache = new Map<string, string[]>();
  let drawnFor: string | null = null;
  // A fixed list for the authored climb, or a getter for a streamed world (endless mode).
  const platformsNow = typeof platformSource === 'function' ? platformSource : () => platformSource;
  const worldNow = typeof worldSource === 'function' ? worldSource : () => worldSource;

  return {
    update(platformId, lanternX, lanternY, radiusPx, livePlatforms) {
      graphics.clear();
      const platforms = platformsNow();
      livePlatforms ??= platforms;
      platformId ??= drawnFor;
      if (platformId === null) return;
      const source = platforms.find((p) => p.id === platformId);
      if (!source) return;
      drawnFor = platformId;
      let reachable = cache.get(platformId);
      if (!reachable) {
        reachable = reachableLedges(source, platforms, worldNow(), config, lowerReachPx, updraftSource());
        cache.set(platformId, reachable);
        // A streamed world never stops handing out new ids; keep only the recent ones.
        if (cache.size > 200) cache.delete(cache.keys().next().value!);
      }
      for (const piece of fadeSegments(outlineSegments(livePlatforms, platformId, reachable), lanternX, lanternY, radiusPx)) {
        if (piece.current) continue;
        // Style is set before each stroke (Phaser styles are not retroactive).
        graphics.lineStyle(LINE_WIDTH_PX, piece.current ? CURRENT_COLOR : REACHABLE_COLOR, LINE_ALPHA * piece.alpha);
        // A 2 px stroke is centred on its line: put a level line's centre between two grid lines (and a
        // standing one's likewise), and its ends on grid lines, so the stroke covers whole art pixels.
        const level = piece.y1 === piece.y2, centre = (value: number): number => snapToGrid(value - 1) + 1;
        graphics.lineBetween(level ? snapToGrid(piece.x1) : centre(piece.x1), level ? centre(piece.y1) : snapToGrid(piece.y1),
          level ? snapToGrid(piece.x2) : centre(piece.x2), level ? centre(piece.y2) : snapToGrid(piece.y2));
      }
    },
  };
}
