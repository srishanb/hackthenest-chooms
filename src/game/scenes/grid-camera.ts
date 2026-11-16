/**
 * The camera follows the candle with the same easing as before, but its drawn scroll lands on the
 * art grid (pixel-grid-snap.ts).
 *
 * Why not Phaser's own `startFollow`: Phaser eases the scroll and draws it in the same step
 * (Camera.preRender), so there is no moment to round the result. Here the easing is done once per
 * frame, after the scene has moved the candle (on POST_UPDATE, before rendering), on an exact float
 * that is kept between frames; only the value handed to the camera is snapped. Keeping the exact
 * value means the easing still creeps smoothly to rest instead of sticking a few pixels short.
 *
 * Same maths as Phaser's follow (scroll += (target - centre - scroll) * lerp, then the bounds), so
 * the view moves as it did. A pan or centerOn from the scene still works: when the scroll was changed
 * by someone else, that value becomes the new exact one. Visual only: nothing here reaches movement.
 */
import * as Phaser from 'phaser';
import { snapInside, snapToGrid } from '../forest/pixel-grid-snap';

export interface GridCamera {
  /** Follow this target (instead of `camera.startFollow`): the view jumps onto it, then eases. */
  follow(target: { x: number; y: number }): void;
  /** Stop following (instead of `camera.stopFollow`); the view stays where it is. */
  stop(): void;
}

export function createGridCamera(scene: Phaser.Scene, lerp: number): GridCamera {
  const camera = scene.cameras.main;
  let target: { x: number; y: number } | null = null;
  let exactX = camera.scrollX, exactY = camera.scrollY;
  /** What was last handed to the camera, to notice when something else moved it. */
  let drawnX = Number.NaN, drawnY = Number.NaN;
  const step = (): void => {
    if (camera.scrollX !== drawnX) exactX = camera.scrollX;
    if (camera.scrollY !== drawnY) exactY = camera.scrollY;
    if (target && !camera.panEffect.isRunning) {
      exactX += (target.x - camera.width * camera.originX - exactX) * lerp;
      exactY += (target.y - camera.height * camera.originY - exactY) * lerp;
      if (camera.useBounds) { exactX = camera.clampX(exactX); exactY = camera.clampY(exactY); }
    }
    if (camera.useBounds) {
      // The largest scroll the bounds allow; Phaser would clamp an off-grid value back onto an odd pixel.
      const bounds = camera.getBounds();
      drawnX = snapInside(exactX, bounds.x, Math.max(bounds.x, bounds.right - camera.width));
      drawnY = snapInside(exactY, bounds.y, Math.max(bounds.y, bounds.bottom - camera.height));
    } else {
      drawnX = snapToGrid(exactX); drawnY = snapToGrid(exactY);
    }
    camera.setScroll(drawnX, drawnY);
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, step);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.POST_UPDATE, step));
  return {
    follow(next) {
      // Like Phaser's startFollow: the view jumps onto the target at once, then eases from there.
      target = next;
      camera.scrollX = next.x - camera.width * camera.originX;
      camera.scrollY = next.y - camera.height * camera.originY;
      if (camera.useBounds) { camera.scrollX = camera.clampX(camera.scrollX); camera.scrollY = camera.clampY(camera.scrollY); }
    },
    stop() { target = null; },
  };
}
