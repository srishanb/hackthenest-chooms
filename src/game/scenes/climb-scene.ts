/**
 * The climb. P0 STUB: a box that walks and falls onto platforms, under a darkness layer
 * whose light radius comes from the composure signal through the effects engine.
 *
 * It proves the seams: content (section data) -> world, keys from settings -> movement,
 * ComposureState -> effects engine -> EffectsFrame store -> renderer. P4 replaces the box
 * with real movement in src/game/player/ (which must never import the signal).
 */
import * as Phaser from 'phaser';
import type { Stores } from '../../shared/contracts/app';
import type { ComposureReader } from '../../shared/contracts/composure';
import type { GameConfig } from '../../shared/contracts/config';
import type { SectionData } from '../../shared/contracts/content';
import type { EffectRule } from '../../shared/contracts/effects';
import { createDarkness, minCoveringRadius, updateDarkness } from '../effects/darkness';
import { neutralFrame, stepEffects } from '../effects/effects-engine';
import { CLIMB_SCENE_KEY } from './boot-scene';

export interface ClimbSceneDeps {
  stores: Stores;
  composure: ComposureReader;
  section: SectionData;
  gameConfig: GameConfig;
  effectsTable: readonly EffectRule[];
}

const DEPTH = { world: 0, player: 10, darkness: 100, alwaysReadable: 200 } as const;
const PLAYER_SIZE = { width: 24, height: 32 } as const;

export class ClimbScene extends Phaser.Scene {
  private readonly pressed = new Set<string>();
  private player!: Phaser.GameObjects.Rectangle;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private darkness!: Phaser.GameObjects.Image;
  private lanternMark!: Phaser.GameObjects.Arc;

  constructor(private readonly deps: ClimbSceneDeps) {
    super(CLIMB_SCENE_KEY);
  }

  create(): void {
    const { section, effectsTable, stores } = this.deps;
    this.cameras.main.setBackgroundColor('#27324a');

    const platforms = this.physics.add.staticGroup();
    for (const platform of section.platforms) {
      const block = this.add.rectangle(platform.x, platform.y, platform.width, platform.height, 0x8a93a8);
      block.setDepth(DEPTH.world);
      platforms.add(block);
    }

    this.player = this.add.rectangle(section.spawn.x, section.spawn.y, PLAYER_SIZE.width, PLAYER_SIZE.height, 0xf2c14e);
    this.player.setDepth(DEPTH.player);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, platforms);

    this.darkness = createDarkness(this, DEPTH.darkness);
    // Drawn above the darkness: the start of the "always readable" layer P5.2 will build.
    this.lanternMark = this.add.circle(0, 0, 4, 0xfff3c4).setDepth(DEPTH.alwaysReadable);

    // Track keys by KeyboardEvent.code so bindings from settings can change live.
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => this.pressed.add(event.code));
    this.input.keyboard?.on('keyup', (event: KeyboardEvent) => this.pressed.delete(event.code));
    this.game.events.on(Phaser.Core.Events.BLUR, () => this.pressed.clear());

    stores.effects.set(neutralFrame(effectsTable));
  }

  override update(_time: number, deltaMs: number): void {
    const { stores, composure, gameConfig, effectsTable } = this.deps;
    const settings = stores.settings.get();

    const direction = (this.pressed.has(settings.keys.right) ? 1 : 0) - (this.pressed.has(settings.keys.left) ? 1 : 0);
    this.playerBody.setVelocityX(direction * gameConfig.walkSpeed);

    const airborne = !(this.playerBody.blocked.down || this.playerBody.touching.down);
    const state = composure.getState();
    const frame = stepEffects(
      stores.effects.get(),
      effectsTable,
      {
        intensity: state.intensity,
        valid: state.valid,
        mode: state.mode,
        airborne,
        effectStrength: settings.effectStrength,
        reducedMotion: settings.reducedMotion,
      },
      deltaMs,
    );
    stores.effects.set(frame);

    // Never let the sheet shrink so far that its edge shows on screen.
    const radius = Math.max(frame.lanternRadius, minCoveringRadius(gameConfig.view.width, gameConfig.view.height));
    updateDarkness(this.darkness, this.player.x, this.player.y, radius);
    this.lanternMark.setPosition(this.player.x, this.player.y - PLAYER_SIZE.height / 2 - 6);
  }
}
