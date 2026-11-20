/**
 * Draws the special ledges of the endless climb (Decision D-36): bounce caps as big spotted mushrooms
 * that squash when they throw you, crumbling ledges with cracks that warm and shake before they fall
 * (and bits that drop when they go), and updraft columns as a faint column of rising streaks.
 *
 * Why its own view: these are told apart from ordinary ledges by their look alone, at a glance and at
 * night. Everything is code-drawn rectangles in whole art pixels on the one grid (Decision D-34, no
 * scaling, no rotation, no image assets). A second layer above the darkness carries a small accent for
 * each (a pink cap rim, an orange dashed edge, pale column edges and streaks), faded with the candle's
 * light exactly like the ledge outlines (outline-fade.ts), so the dark still hides what is far away.
 *
 * Decorative only: the physics never reads anything here. Reduced motion: no shake (the cracks still
 * warm), no falling bits, still streaks. Paused: everything holds still. Walls (Decision D-37, `?walls=1`) are
 * drawn here too, by wall-view.ts.
 */
import type * as Phaser from 'phaser';
import { LEDGE_KINDS_VIEW_CONFIG as V } from '../../config/ledge-kinds-view.config';
import type { GameConfig } from '../../shared/contracts/config';
import { fadeAlpha } from '../effects/outline-fade';
import { BOUNCE_TYPE } from '../player/bounce';
import { CRUMBLING_TYPE, crumbleWarn01, type CrumbleState } from '../player/crumble';
import type { PlatformBox, UpdraftBox } from '../player/types';
import { WALL_TYPE } from '../player/wall';
import { drawWall } from './wall-view';
import { snapToGrid } from './pixel-grid-snap';
import { mixColor, stableUnit } from './presentation';

export interface LedgeKindsFrame {
  /** Every live ledge at its position now (fallen crumbling ledges included). */
  platforms: readonly PlatformBox[];
  updrafts: readonly UpdraftBox[];
  /** True for a column (or a wall) in a snow band (drawn in the snow palette, which reads against pale snow). */
  snowy: (column: { id: string }) => boolean;
  crumble: CrumbleState;
  /** Caps that threw the candle and crumbling ledges that fell since the last frame. */
  bounced: readonly string[];
  crumbled: readonly string[];
  candleX: number;
  candleY: number;
  /** The candle's light radius (px), for fading the accents above the darkness. */
  radiusPx: number;
  deltaMs: number;
  paused: boolean;
  reducedMotion: boolean;
}

export interface LedgeKindsView {
  update(frame: LedgeKindsFrame): void;
  destroy(): void;
}

interface Bit { x: number; y: number; vx: number; vy: number; ageMs: number; size: number; color: number }

const topOf = (p: { y: number; height: number }): number => p.y - p.height / 2;

/**
 * `look` shakes or hides a crumbling ledge's own terrain art (forest-world.ts `setPlatformLook`).
 * `depths.world` sits just above the terrain; `depths.readable` above the darkness.
 */
export function createLedgeKindsView(scene: Phaser.Scene, depths: { world: number; readable: number }, config: GameConfig,
  look: (id: string, offsetX: number, visible: boolean) => void): LedgeKindsView {
  const world = scene.add.graphics().setDepth(depths.world);
  const air = scene.add.graphics().setDepth(depths.world - 3.5);
  const readable = scene.add.graphics().setDepth(depths.readable);
  const squash = new Map<string, number>();
  let bits: Bit[] = [];
  let clockMs = 0;

  const rect = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1): void => {
    if (w <= 0 || h <= 0 || alpha <= 0) return;
    g.fillStyle(color, alpha).fillRect(snapToGrid(x), snapToGrid(y), snapToGrid(w), snapToGrid(h));
  };

  function drawCap(cap: PlatformBox, fade: number): void {
    const c = V.cap;
    const squashed = (squash.get(cap.id) ?? 0) > 0 ? 1 : 0;
    const w = snapToGrid(cap.width) + 8 * squashed;
    const left = snapToGrid(cap.x) - w / 2;
    const top = snapToGrid(topOf(cap)) + 4 * squashed;
    const stemW = snapToGrid(cap.width * 0.28);
    const stemTop = top + c.domePx - 2;
    rect(world, snapToGrid(cap.x) - stemW / 2, stemTop, stemW, c.stemPx - 4 * squashed, c.stem);
    rect(world, snapToGrid(cap.x) + stemW / 2 - 4, stemTop, 4, c.stemPx - 4 * squashed, c.stemShade);
    // A rounded dome: each row a little wider, lit on top, a dark rim underneath.
    rect(world, left + 14, top, w - 28, 2, c.light);
    rect(world, left + 8, top + 2, w - 16, 4, c.light);
    rect(world, left + 4, top + 6, w - 8, 4, c.red);
    rect(world, left, top + 10, w, 4, c.red);
    rect(world, left + 2, top + 14, w - 4, 2, c.rim);
    for (let i = 0; i < 4; i++) {
      const sx = left + 8 + (w - 22) * (i + stableUnit(`cap-spot:${cap.id}:${i}`) * 0.6) / 4;
      rect(world, sx, top + (i % 2 === 0 ? 6 : 10), 6, 4, c.spot);
    }
    // Above the darkness: the cap's rim, so a bounce cap reads as one at night.
    rect(readable, left + 6, top, w - 12, 2, V.night.cap, V.night.alpha * fade);
    rect(readable, left, top + 10, 2, 4, V.night.cap, V.night.alpha * fade);
    rect(readable, left + w - 2, top + 10, 2, 4, V.night.cap, V.night.alpha * fade);
  }

  function drawCrumbling(ledge: PlatformBox, crumble: CrumbleState, fade: number, reducedMotion: boolean): void {
    const warn = crumbleWarn01(crumble.get(ledge.id), config);
    const gone = warn === null;
    const shaking = !gone && !reducedMotion && warn > V.crumble.shakeFrom01;
    const amount = shaking ? (warn - V.crumble.shakeFrom01) / (1 - V.crumble.shakeFrom01) : 0;
    const offset = shaking ? snapToGrid(Math.sin(clockMs / 22) * V.crumble.shakePx * amount) : 0;
    look(ledge.id, offset, !gone);
    const left = snapToGrid(ledge.x - ledge.width / 2) + offset, top = snapToGrid(topOf(ledge)), width = snapToGrid(ledge.width);
    if (!gone) {
      // Pale cracked stone over the top, split into blocks by zigzag cracks that glow warmer as it is about to go.
      rect(world, left, top - 2, width, 8, V.crumble.stone);
      rect(world, left, top + 4, width, 2, V.crumble.seam);
      const cracks = Math.max(2, Math.round(width / 30));
      const color = mixColor(V.crumble.crack, V.crumble.warn, warn);
      for (let i = 0; i < cracks; i++) {
        const cx = left + 8 + (width - 18) * (i + 0.3 + stableUnit(`crack:${ledge.id}:${i}`) * 0.4) / cracks;
        rect(world, cx, top - 2, 4, 4, color);
        rect(world, cx + 2, top + 2, 4, 6, color);
        rect(world, cx, top + 8, 4, 6, color);
        rect(world, cx + 2, top + 14, 2, 6, color);
      }
    }
    // Above the darkness: a dashed edge (faint while it is gone, so you can see where it will grow back).
    for (let x = left; x < left + width - 4; x += 10) rect(readable, x, top - 4, 6, 2, V.night.crumble, V.night.alpha * fade * (gone ? 0.3 : 1));
  }

  function drawColumn(column: UpdraftBox, fade: number, reducedMotion: boolean, snowy: boolean): void {
    const u = V.updraft;
    const S = V.updraftSnow;
    const left = snapToGrid(column.x - column.width / 2), top = snapToGrid(column.y - column.height / 2);
    const width = snapToGrid(column.width), height = snapToGrid(column.height);
    rect(air, left, top, width, height, snowy ? S.fill : u.fill, snowy ? S.fillAlpha : u.fillAlpha);
    const streaks = Math.max(u.minStreaks, Math.round(width * height / u.pxPerStreak));
    const speed = column.kind === 'rise' ? u.riseSpeed : u.driftSpeed;
    const time = reducedMotion ? 0 : clockMs / 1000;
    for (let i = 0; i < streaks; i++) {
      const sx = left + 2 + stableUnit(`streak-x:${column.id}:${i}`) * (width - 4);
      const length = u.streakPx[0] + stableUnit(`streak-l:${column.id}:${i}`) * (u.streakPx[1] - u.streakPx[0]);
      const travel = (stableUnit(`streak-p:${column.id}:${i}`) * height + time * speed) % height;
      const sy = top + height - travel - length;
      // Fade in at the bottom and out at the top of the column.
      const ends = Math.min(1, travel / 40, (height - travel - length) / 40);
      if (ends > 0 && snowy) {
        rect(readable, sx, Math.max(top, sy), 2, length, S.streak, S.streakAlpha * ends * fade);
        rect(readable, sx + 2, Math.max(top, sy) + 2, 2, length - 4, S.core, S.streakAlpha * 0.6 * ends * fade);
      } else if (ends > 0) rect(readable, sx, Math.max(top, sy), 2, length, u.streak, u.streakAlpha * ends * fade);
    }
    for (let y = top; y < top + height - 6; y += 18) {
      const edge = snowy ? S.edge : V.night.updraft, edgeAlpha = snowy ? S.edgeAlpha : V.night.alpha * 0.5;
      rect(readable, left, y, snowy ? 4 : 2, 8, edge, edgeAlpha * fade);
      rect(readable, left + width - (snowy ? 4 : 2), y, snowy ? 4 : 2, 8, edge, edgeAlpha * fade);
    }
  }

  return {
    update(frame) {
      world.clear(); readable.clear(); air.clear();
      if (!frame.paused) clockMs += Math.min(frame.deltaMs, 100);
      for (const id of frame.bounced) squash.set(id, V.cap.squashMs);
      if (!frame.paused) for (const [id, ms] of squash) { if (ms - frame.deltaMs <= 0) squash.delete(id); else squash.set(id, ms - frame.deltaMs); }
      const view = scene.cameras.main.worldView;
      const near = (box: { x: number; y: number; width: number; height: number }): boolean =>
        box.x + box.width / 2 > view.x - 40 && box.x - box.width / 2 < view.right + 40
        && box.y + box.height / 2 > view.y - 80 && box.y - box.height / 2 < view.bottom + 80;
      // Fade by the distance from the candle to the nearest point of the thing, like the outlines.
      const fadeOf = (box: { x: number; y: number; width: number; height: number }): number => {
        const dx = Math.max(0, Math.abs(frame.candleX - box.x) - box.width / 2);
        const dy = Math.max(0, Math.abs(frame.candleY - box.y) - box.height / 2);
        return fadeAlpha(Math.hypot(dx, dy), frame.radiusPx);
      };
      for (const id of frame.crumbled) {
        const ledge = frame.platforms.find((p) => p.id === id);
        if (!ledge || frame.reducedMotion) continue;
        for (let i = 0; i < V.crumble.debris; i++) {
          const u = stableUnit(`bit:${id}:${i}:${Math.round(clockMs)}`);
          bits.push({ x: ledge.x - ledge.width / 2 + ledge.width * (i + 0.5) / V.crumble.debris, y: topOf(ledge) + 4,
            vx: (u - 0.5) * 60, vy: -40 + u * 60, ageMs: 0, size: u < 0.5 ? 4 : 6, color: i % 3 === 0 ? V.crumble.crack : 0x6b4f3a });
        }
      }
      for (const column of frame.updrafts) if (near(column)) drawColumn(column, fadeOf(column), frame.reducedMotion, frame.snowy(column));
      for (const platform of frame.platforms) {
        if (platform.type === BOUNCE_TYPE && near(platform)) drawCap(platform, fadeOf(platform));
        else if (platform.type === CRUMBLING_TYPE && near(platform)) drawCrumbling(platform, frame.crumble, fadeOf(platform), frame.reducedMotion);
        else if (platform.type === WALL_TYPE && near(platform)) drawWall(rect, world, readable, platform, fadeOf(platform), frame.snowy(platform), { top: view.y, bottom: view.bottom });
      }
      if (!frame.paused) {
        const dt = Math.min(frame.deltaMs, 100) / 1000;
        for (const bit of bits) { bit.vy += V.crumble.debrisGravity * dt; bit.x += bit.vx * dt; bit.y += bit.vy * dt; bit.ageMs += dt * 1000; }
        bits = bits.filter((bit) => bit.ageMs < V.crumble.debrisMs);
      }
      for (const bit of bits) rect(world, bit.x, bit.y, bit.size, bit.size, bit.color, 1 - bit.ageMs / V.crumble.debrisMs);
    },
    destroy() { world.destroy(); readable.destroy(); air.destroy(); },
  };
}
