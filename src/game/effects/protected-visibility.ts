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
import type { PlatformBox } from '../player/types';
import { outlineSegments, reachableLedges, type WorldBounds } from '../world/reachable-ledges';
import { fadeSegments } from './outline-fade';

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
  platforms: readonly PlatformBox[],
  world: WorldBounds,
  config: GameConfig,
): ProtectedVisibility {
  const graphics = scene.add.graphics().setDepth(depth);
  const cache = new Map<string, string[]>();
  let drawnFor: string | null = null;

  return {
    update(platformId, lanternX, lanternY, radiusPx, livePlatforms = platforms) {
      graphics.clear();
      platformId ??= drawnFor;
      if (platformId === null) return;
      const source = platforms.find((p) => p.id === platformId);
      if (!source) return;
      drawnFor = platformId;
      let reachable = cache.get(platformId);
      if (!reachable) {
        reachable = reachableLedges(source, platforms, world, config);
        cache.set(platformId, reachable);
      }
      for (const piece of fadeSegments(outlineSegments(livePlatforms, platformId, reachable), lanternX, lanternY, radiusPx)) {
        // Style is set before each stroke (Phaser styles are not retroactive).
        graphics.lineStyle(LINE_WIDTH_PX, piece.current ? CURRENT_COLOR : REACHABLE_COLOR, LINE_ALPHA * piece.alpha);
        graphics.lineBetween(piece.x1, piece.y1, piece.x2, piece.y2);
      }
    },
  };
}
