/**
 * The darkness layer: a dark sheet over the world with a soft hole of light.
 *
 * How: one small canvas texture holding a radial gradient (clear in the middle, dark
 * outside) is drawn as a single image centred on the lantern and scaled so the clear part
 * matches the light radius. One image, no shaders, so it is cheap and easy to explain.
 *
 * The climb scene moves it with the lantern and sets the radius from the capped, smoothed
 * light value. Visual only: it never touches movement.
 */
import * as Phaser from 'phaser';

const TEXTURE_KEY = 'darkness-tight-fuel';
const TEXTURE_SIZE = 512;
/** Radius of the fully clear centre in the texture, in texture pixels. */
const CLEAR_RADIUS = 12;
/** Where full darkness is reached. Between the two the light fades out. */
const DARK_RADIUS = 15;
const DARK_ALPHA = 1;

/** Create the image once per scene. `depth` must sit above the world and below "always readable" marks. */
export function createDarkness(scene: Phaser.Scene, depth: number): Phaser.GameObjects.Image {
  if (!scene.textures.exists(TEXTURE_KEY)) {
    const texture = scene.textures.createCanvas(TEXTURE_KEY, TEXTURE_SIZE, TEXTURE_SIZE);
    if (!texture) throw new Error('could not create the darkness texture');
    const context = texture.getContext();
    const centre = TEXTURE_SIZE / 2;
    const gradient = context.createRadialGradient(centre, centre, CLEAR_RADIUS, centre, centre, DARK_RADIUS);
    gradient.addColorStop(0, 'rgba(5, 6, 10, 0)');
    gradient.addColorStop(1, `rgba(5, 6, 10, ${DARK_ALPHA})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    texture.refresh();
  }
  return scene.add.image(0, 0, TEXTURE_KEY).setDepth(depth);
}

/** Move the light to (x, y) and set how far it reaches. `radiusPx` is where the light starts to fade. */
export function updateDarkness(image: Phaser.GameObjects.Image, x: number, y: number, radiusPx: number): void {
  image.setPosition(x, y);
  image.setScale(radiusPx / CLEAR_RADIUS);
}

/** The smallest radius at which the sheet still covers a view of this size from any lantern position. */
export function minCoveringRadius(viewWidth: number, viewHeight: number): number {
  const farthestCorner = Math.hypot(viewWidth, viewHeight);
  return (farthestCorner / (TEXTURE_SIZE / 2)) * CLEAR_RADIUS;
}
