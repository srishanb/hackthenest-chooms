/**
 * The climb scene: draws the world, runs the fixed-step player physics and feeds the effects.
 *
 * Flow each frame: keys (by KeyboardEvent.code, from settings) -> fixed steps of `stepPlayer`
 * (src/game/player/, which never reads the signal) -> draw. Separately, ComposureState -> effects
 * engine -> EffectsFrame store -> darkness layer. The camera follows the body and is never
 * driven by the signal.
 */
import * as Phaser from 'phaser';
import type { Stores } from '../../shared/contracts/app';
import type { ComposureReader } from '../../shared/contracts/composure';
import type { EmberConfig, GameConfig } from '../../shared/contracts/config';
import type { SectionData } from '../../shared/contracts/content';
import type { EffectRule } from '../../shared/contracts/effects';
import type { EventBus } from '../../shared/contracts/events';
import { createDarkness, minCoveringRadius, updateDarkness } from '../effects/darkness';
import { neutralFrame, stepEffects } from '../effects/effects-engine';
import { createPlayer, stepPlayer } from '../player/movement';
import type { PlatformBox, PlayerState } from '../player/types';
import { landingEvents } from '../world/fall-tracker';
import type { SaveStorage } from '../save';
import { createRefugeController } from '../world/refuge';
import { CLIMB_SCENE_KEY } from './boot-scene';

export interface ClimbSceneDeps {
  bus: EventBus;
  stores: Stores;
  composure: ComposureReader;
  sections: readonly SectionData[];
  gameConfig: GameConfig;
  effectsTable: readonly EffectRule[];
  emberConfig: EmberConfig;
  storage?: SaveStorage;
}

const DEPTH = { world: 0, zone: 1, player: 10, darkness: 100, alwaysReadable: 200 } as const;
/** Never simulate more than this many steps in one frame (a long pause must not spiral). */
const MAX_STEPS_PER_FRAME = 8;
/** Room above the highest platform so the camera can show the sky. */
const TOP_MARGIN_PX = 240;

export class ClimbScene extends Phaser.Scene {
  private readonly pressed = new Set<string>();
  private platforms: PlatformBox[] = [];
  private state!: PlayerState;
  private accumulatorMs = 0;
  private precisionActive = false;
  private refuges!: ReturnType<typeof createRefugeController>;
  private player!: Phaser.GameObjects.Rectangle;
  private darkness!: Phaser.GameObjects.Image;
  private lanternMark!: Phaser.GameObjects.Arc;

  constructor(private readonly deps: ClimbSceneDeps) {
    super(CLIMB_SCENE_KEY);
  }

  create(): void {
    const { sections, effectsTable, stores, gameConfig } = this.deps;
    const first = sections[0];
    if (!first) throw new Error('ClimbScene needs at least one section');
    this.cameras.main.setBackgroundColor('#27324a');

    // One world: every section's platforms, shared ledges counted once.
    const seen = new Set<string>();
    for (const section of sections) {
      for (const p of section.platforms) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        this.platforms.push({ id: p.id, x: p.x, y: p.y, width: p.width, height: p.height });
        this.add.rectangle(p.x, p.y, p.width, p.height, 0x8a93a8).setDepth(DEPTH.world);
      }
      for (const [area, color] of [[section.refuge, 0x4e8f6a], [section.finish, 0xf2c14e]] as const) {
        if (area) this.add.rectangle(area.x, area.y, area.width, area.height, color, 0.25).setDepth(DEPTH.zone);
      }
    }

    this.refuges = createRefugeController({
      sections, snapshot: stores.snapshot, bus: this.deps.bus, storage: this.deps.storage,
    });
    this.state = createPlayer(this.refuges.spawn.x, this.refuges.spawn.y);
    const offFinish = this.deps.bus.on('finish', () => this.refuges.clear());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offFinish();
      this.refuges.destroy();
    });
    this.player = this.add.rectangle(this.state.x, this.state.y, gameConfig.player.width, gameConfig.player.height, 0xf2c14e).setDepth(DEPTH.player);

    const top = Math.min(...this.platforms.map((p) => p.y - p.height / 2)) - TOP_MARGIN_PX;
    const bottom = Math.max(...this.platforms.map((p) => p.y + p.height / 2));
    this.cameras.main.setBounds(0, top, gameConfig.view.width, bottom - top);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

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
    const { stores, composure, gameConfig, effectsTable, bus, emberConfig } = this.deps;
    const settings = stores.settings.get();
    const stepMs = 1000 / gameConfig.stepHz;
    const input = {
      left: this.pressed.has(settings.keys.left),
      right: this.pressed.has(settings.keys.right),
      jump: this.pressed.has(settings.keys.jump),
    };

    this.accumulatorMs = Math.min(this.accumulatorMs + deltaMs, stepMs * MAX_STEPS_PER_FRAME);
    while (this.accumulatorMs >= stepMs) {
      this.accumulatorMs -= stepMs;
      const out = stepPlayer(this.state, input, this.platforms, gameConfig.view.width, gameConfig, stepMs);
      this.state = out.state;
      this.refuges.update(this.state);
      if (out.events.jumped) bus.emit({ type: 'jump', charge01: out.events.jumped.charge01 });
      // A fall just ends on whatever catches you; no reset, no death (FAL-1).
      if (out.events.landed) for (const event of landingEvents(out.events.landed, emberConfig)) bus.emit(event);
    }
    if (this.state.charging !== this.precisionActive) {
      this.precisionActive = this.state.charging;
      bus.emit({ type: 'precision_window', active: this.precisionActive });
    }
    this.player.setPosition(this.state.x, this.state.y);

    const signal = composure.getState();
    const frame = stepEffects(
      stores.effects.get(),
      effectsTable,
      {
        intensity: signal.intensity,
        valid: signal.valid,
        mode: signal.mode,
        airborne: !this.state.grounded,
        effectStrength: settings.effectStrength,
        reducedMotion: settings.reducedMotion,
      },
      deltaMs,
    );
    stores.effects.set(frame);

    // Never let the sheet shrink so far that its edge shows on screen.
    const radius = Math.max(frame.lanternRadius, minCoveringRadius(gameConfig.view.width, gameConfig.view.height));
    updateDarkness(this.darkness, this.state.x, this.state.y, radius);
    this.lanternMark.setPosition(this.state.x, this.state.y - gameConfig.player.height / 2 - 6);
  }
}
