/**
 * First scene. Its preload step loads the forest textures (preloadForest) so the climb scene
 * never waits on a file, then create() starts the climb scene straight away.
 */
import * as Phaser from 'phaser';
import { preloadForest } from '../forest/textures';

export const BOOT_SCENE_KEY = 'boot';
export const CLIMB_SCENE_KEY = 'climb';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(BOOT_SCENE_KEY);
  }

  create(): void {
    this.scene.start(CLIMB_SCENE_KEY);
  }

  preload(): void { preloadForest(this); }
}
