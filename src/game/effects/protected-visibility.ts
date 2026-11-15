/**
 * Protected visibility (LAN-3): thin outlines drawn ABOVE the darkness, so the ledge you stand on
 * and the ledges you can jump to stay readable however small the lantern gets.
 *
 * Why outlines and not fills: the darkness must still matter. Only the current platform and the
 * top edges of reachable higher ledges show; everything else stays dark. Nothing here reads the
 * signal, so the readable set depends on the level and the physics alone.
 *
 * Cost: one reach search per platform the first time you stand on it (cached), and one redraw
 * per landing. Moving outlines follow their platforms; the selected set stays while airborne.
 */
import type * as Phaser from 'phaser';
import type { GameConfig } from '../../shared/contracts/config';
import type { PlatformBox } from '../player/types';
import { outlineSegments, reachableLedges, type WorldBounds } from '../world/reachable-ledges';

const LINE_WIDTH_PX = 2;
const CURRENT_COLOR = 0xfff3c4;
const REACHABLE_COLOR = 0xc9d4ea;
const LINE_ALPHA = 0.85;

export interface ProtectedVisibility {
  /** Call every frame with the platform under the feet and current geometry. Redraws only changed edges. */
  update(platformId: string | null, livePlatforms?: readonly PlatformBox[]): void;
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
  let signature = '';

  return {
    update(platformId, livePlatforms = platforms) {
      // Keep the selected edges through a jump, but follow a moving edge's real position.
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
      const segments = outlineSegments(livePlatforms, platformId, reachable);
      const nextSignature = JSON.stringify(segments);
      if (signature === nextSignature) return;
      signature = nextSignature;
      graphics.clear();
      for (const s of segments) {
        // Style is set before each stroke (Phaser styles are not retroactive).
        graphics.lineStyle(LINE_WIDTH_PX, s.current ? CURRENT_COLOR : REACHABLE_COLOR, LINE_ALPHA);
        graphics.lineBetween(s.x1, s.y1, s.x2, s.y2);
      }
    },
  };
}
