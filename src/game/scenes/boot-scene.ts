/**
 * First scene. P0: nothing to load, so it starts the climb straight away.
 * P8 loads art and audio here so the climb scene never waits on a file.
 */
import * as Phaser from 'phaser';

export const BOOT_SCENE_KEY = 'boot';
export const CLIMB_SCENE_KEY = 'climb';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(BOOT_SCENE_KEY);
  }

  create(): void {
    this.scene.start(CLIMB_SCENE_KEY);
  }
}
