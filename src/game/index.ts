/**
 * Game lane entry point: creates the Phaser game and its scenes.
 *
 * Why everything arrives through `GameDeps`: the game never imports a device, the signal
 * lane, the UI or the content folder. src/main.ts hands it what it needs, which keeps
 * every dependency visible in one place.
 */
import * as Phaser from 'phaser';
import type { Stores } from '../shared/contracts/app';
import type { ComposureReader } from '../shared/contracts/composure';
import type { EmberConfig, GameConfig } from '../shared/contracts/config';
import type { SectionData } from '../shared/contracts/content';
import type { EffectRule } from '../shared/contracts/effects';
import type { EventBus } from '../shared/contracts/events';
import { BootScene } from './scenes/boot-scene';
import { ClimbScene } from './scenes/climb-scene';

export interface GameDeps {
  /** The element the canvas is added to. */
  parent: HTMLElement;
  bus: EventBus;
  stores: Stores;
  composure: ComposureReader;
  sections: readonly SectionData[];
  gameConfig: GameConfig;
  effectsTable: readonly EffectRule[];
  emberConfig: EmberConfig;
  /** Where the save lives. Optional: P4.4 falls back to memory. */
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
}

export function createGame(deps: GameDeps): Phaser.Game {
  const section = deps.sections[0];
  if (!section) throw new Error('createGame needs at least one section');

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: deps.parent,
    backgroundColor: '#05060a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: deps.gameConfig.view.width,
      height: deps.gameConfig.view.height,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: deps.gameConfig.gravityY }, debug: false },
    },
    scene: [
      new BootScene(),
      new ClimbScene({
        stores: deps.stores,
        composure: deps.composure,
        section,
        gameConfig: deps.gameConfig,
        effectsTable: deps.effectsTable,
      }),
    ],
  });
}
