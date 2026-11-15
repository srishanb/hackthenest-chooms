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
import { createKeyboardInput } from '../keyboard-input';
import { createWaxRewards } from '../wax/rewards';
import { createWaxView } from '../wax/view';
import { createPlayer, stepPlayer, teleportPlayer } from '../player/movement';
import { createRecoveryEmber } from '../ember/recovery';
import type { EmberAnchor } from '../save';
import type { PlatformBox, PlayerState } from '../player/types';
import { sectionAt } from '../world/bounds';
import { landingEvents } from '../world/fall-tracker';
import { altitude01, bodyInArea, findFinish } from '../world/finish';
import { createPhaseController, type PhaseController } from '../world/phase-controller';
import { writeSnapshot } from './snapshot-writer';
import type { SaveStorage } from '../save';
import { createRefugeController } from '../world/refuge';
import { loadSections } from '../world/section-loader';
import { drawWorld } from '../world/world-view';
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

const DEPTH = { player: 10, darkness: 100, alwaysReadable: 200 } as const;
/** Never simulate more than this many steps in one frame (a long pause must not spiral). */
const MAX_STEPS_PER_FRAME = 8;

export class ClimbScene extends Phaser.Scene {
  private controls!: ReturnType<typeof createKeyboardInput>;
  private platforms: PlatformBox[] = [];
  private state!: PlayerState;
  private accumulatorMs = 0;
  private precisionActive = false;
  private phase!: PhaseController;
  private refuges!: ReturnType<typeof createRefugeController>;
  private ember!: ReturnType<typeof createRecoveryEmber>;
  private emberMark!: Phaser.GameObjects.Arc;
  private wax!: ReturnType<typeof createWaxRewards>;
  private waxView!: ReturnType<typeof createWaxView>;
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

    const world = loadSections(sections, gameConfig.view.width);
    this.platforms = world.platforms;
    drawWorld(this, world);
    this.wax = createWaxRewards({ platforms: world.platforms, gameConfig,
      bus: this.deps.bus, snapshot: stores.snapshot, storage: this.deps.storage });
    this.waxView = createWaxView(this, this.wax, this.deps.bus);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.waxView.destroy());

    this.refuges = createRefugeController({
      sections, snapshot: stores.snapshot, bus: this.deps.bus,
    });
    this.ember = createRecoveryEmber({
      sections, gameConfig, config: this.deps.emberConfig,
      snapshot: stores.snapshot, bus: this.deps.bus, storage: this.deps.storage,
    });
    this.state = createPlayer(this.ember.spawn.x, this.ember.spawn.y);
    const offFinish = this.deps.bus.on('finish', () => { this.ember.clear(); this.wax.finish(); });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offFinish();
    });
    this.player = this.add.rectangle(this.state.x, this.state.y, gameConfig.player.width, gameConfig.player.height, 0xf2c14e).setDepth(DEPTH.player);

    this.cameras.main.setBounds(0, world.top, world.width, world.bottom - world.top);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.darkness = createDarkness(this, DEPTH.darkness);
    // Drawn above the darkness: the start of the "always readable" layer P5.2 will build.
    this.lanternMark = this.add.circle(0, 0, 4, 0xfff3c4).setDepth(DEPTH.alwaysReadable);
    this.emberMark = this.add.circle(0, 0, 7, 0xf29938).setDepth(DEPTH.alwaysReadable).setVisible(false);

    // Native events reach the buffer immediately; do not let Space/arrows scroll the page.
    this.controls = createKeyboardInput(() => stores.settings.get().keys);
    const keyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, button, [contenteditable="true"]')) return;
      if (!event.repeat && event.code === stores.settings.get().keys.recover) {
        if (stores.snapshot.get().phase === 'ember') this.ember.cancel();
        else if (this.ember.request(this.state)) {
          const signal = this.deps.composure.getState();
          if (signal.mode === 'fixed' || !signal.calibrated) this.returnToEmber(this.ember.assist());
        }
        event.preventDefault(); return;
      }
      if (!this.phase.isRunning()) return;
      if (event.code === 'KeyE') {
        if (!event.repeat) this.ember.placeOrPickup(this.state);
        event.preventDefault(); return;
      }
      if (this.controls.keyDown(event.code)) event.preventDefault();
    };
    const keyUp = (event: KeyboardEvent): void => this.controls.keyUp(event.code);
    const clearInput = (): void => {
      this.controls.clear();
      this.state = { ...this.state, charging: false, chargeMs: 0, jumpLatch: true };
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', clearInput);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', clearInput);
    });

    this.phase = createPhaseController(this.deps.bus, stores.snapshot, () => {
      clearInput();
      // The refuge controller clears the save when it hears the `finish` event this emits.
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.phase.dispose());
    const offAssist = this.deps.bus.on('ember_assist_requested', () => this.returnToEmber(this.ember.assist()));
    const offCancel = this.deps.bus.on('ember_cancel_request', () => this.ember.cancel());
    const offRestart = this.deps.bus.on('run_restart', () => {
      this.wax.reset();
      const spawn = this.ember.restart();
      this.state = teleportPlayer(spawn.x, spawn.y); clearInput(); this.accumulatorMs = 0;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { offAssist(); offCancel(); offRestart(); });

    stores.effects.set(neutralFrame(effectsTable));
  }

  private returnToEmber(anchor: EmberAnchor | null): void {
    if (!anchor) return;
    this.state = teleportPlayer(anchor.x, anchor.y);
    this.controls.clear(); this.accumulatorMs = 0;
    this.player.setPosition(anchor.x, anchor.y);
  }

  override update(_time: number, deltaMs: number): void {
    const { stores, composure, gameConfig, effectsTable, bus, emberConfig, sections } = this.deps;
    const settings = stores.settings.get();
    this.returnToEmber(this.ember.advance(composure.getState(), performance.now()));
    const stepMs = 1000 / gameConfig.stepHz;
    if (!this.phase.isRunning()) {
      this.controls.clear();
      this.state = { ...this.state, charging: false, chargeMs: 0, jumpLatch: true };
    }

    // Only the 'playing' phase steps; pause, ember and finished freeze the body.
    this.accumulatorMs = this.phase.isRunning() ? Math.min(this.accumulatorMs + deltaMs, stepMs * MAX_STEPS_PER_FRAME) : 0;
    while (this.accumulatorMs >= stepMs) {
      this.accumulatorMs -= stepMs;
      const out = stepPlayer(this.state, this.controls.read(), this.platforms, gameConfig.view.width, gameConfig, stepMs);
      this.state = out.state;
      this.wax.update(this.state, stepMs);
      this.refuges.update(this.state);
      if (out.events.jumped) bus.emit({ type: 'jump', charge01: out.events.jumped.charge01 });
      // A fall just ends on whatever catches you; no reset, no death (FAL-1).
      if (out.events.landed) for (const event of landingEvents(out.events.landed, emberConfig)) bus.emit(event);
    }
    this.ember.refreshPrompt(this.state);
    const anchor = this.ember.getAnchor();
    this.emberMark.setVisible(anchor !== null);
    if (anchor) this.emberMark.setPosition(anchor.x, anchor.y + gameConfig.player.height / 2 - 7);
    const finish = findFinish(sections);
    if (finish && this.phase.isRunning() && bodyInArea(this.state.x, this.state.y, finish)) this.phase.finish();
    if (this.state.charging !== this.precisionActive) {
      this.precisionActive = this.state.charging;
      bus.emit({ type: 'precision_window', active: this.precisionActive });
    }
    this.player.setPosition(this.state.x, this.state.y);
    this.waxView.update(deltaMs, this.phase.isRunning(), settings.reducedMotion);
    writeSnapshot(stores.snapshot, {
      sectionId: sectionAt(sections, this.state.y + gameConfig.player.height / 2),
      altitude01: altitude01(sections, this.state.y),
    });

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
    const baseRadius = Math.max(frame.lanternRadius, minCoveringRadius(gameConfig.view.width, gameConfig.view.height));
    const radius = this.wax.lightRadius(baseRadius, !this.state.grounded);
    updateDarkness(this.darkness, this.state.x, this.state.y, radius);
    this.lanternMark.setPosition(this.state.x, this.state.y - gameConfig.player.height / 2 - 6);
  }
}
