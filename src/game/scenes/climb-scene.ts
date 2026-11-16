/**
 * Climb scene entry point: wires keyboard input, player stepping, scenery, candle and wax views.
 * The longer description of the per-frame flow is in the comment further down.
 * The signal never drives movement; it only feeds visual effects.
 */
import { createLandingPuff } from '../forest/landing-puff';
import { FUEL_VISIBILITY_CONFIG as FUEL_VIEW, sceneryCorruption } from '../../config/fuel-visibility.config';
import { createCandleLighting } from '../forest/candle-lighting';
import { fuelVisibilityRadius } from '../forest/fuel-visibility';
import { LANTERN_FUEL_CONFIG } from '../../config/lantern-fuel.config';
/**
 * The climb scene: draws the world, runs the fixed-step player physics and feeds the effects.
 *
 * Flow each frame: keys (by KeyboardEvent.code, from settings) -> fixed steps of `stepPlayer`
 * (src/game/player/, which never reads the signal) -> draw. Separately, ComposureState -> effects
 * engine -> EffectsFrame store -> darkness layer. The camera follows the body and is never
 * driven by the signal.
 */
import * as Phaser from 'phaser';
import { FOREST_CONFIG, FOREST_PREVIEW_EVENT, forestPreviewValue } from '../../config/forest.config';
import type { Stores } from '../../shared/contracts/app';
import type { ComposureReader } from '../../shared/contracts/composure';
import type { EmberConfig, GameConfig } from '../../shared/contracts/config';
import type { PlatformData, SectionData } from '../../shared/contracts/content';
import type { EffectRule } from '../../shared/contracts/effects';
import type { EventBus } from '../../shared/contracts/events';
import { createDarkness, minCoveringRadius, updateDarkness } from '../effects/darkness';
import { neutralFrame } from '../effects/effects-engine';
import { stepForestEffects } from '../forest/forest-effects';
import type { ForestWorld } from '../forest/forest-world';
import { WAX_CONFIG } from '../../config/wax.config';
import { pickCandleSeed } from '../candle/candle-genome';
import { createCandleView } from '../candle/candle-view';
import { flameSizeFromRadius } from '../candle/flame';
import { createPortraitView } from '../candle/portrait-view';
import { grownMovement, waxGrowth } from '../candle/growth';
import { createProtectedVisibility, type ProtectedVisibility } from '../effects/protected-visibility';
import { createLanternFuel } from '../forest/lantern-fuel';
import { createKeyboardInput } from '../keyboard-input';
import { createWaxRewards } from '../wax/rewards';
import { createWaxView } from '../wax/view';
import { createPlayer, stepPlayer, teleportPlayer } from '../player/movement';
import { createRecoveryEmber } from '../ember/recovery';
import type { EmberAnchor } from '../save';
import type { PlatformBox, PlayerState } from '../player/types';
import { sectionAt } from '../world/bounds';
import { landingEvents } from '../world/fall-tracker';
import { altitude01 } from '../world/finish';
import { createStageProgress } from '../world/stage-progress';
import { lessonAt } from '../world/stage-weather';
import { createPhaseController, type PhaseController } from '../world/phase-controller';
import { writeSnapshot } from './snapshot-writer';
import type { SaveStorage } from '../save';
import { createRefugeController } from '../world/refuge';
import { loadSections } from '../world/section-loader';
import { drawWorld } from '../world/world-view';
import { platformsAt, windAt } from '../world/environment';
import { CLIMB_SCENE_KEY } from './boot-scene';

export interface ClimbSceneDeps {
  startAt?: { x: number; y: number; platformId: string };
  bus: EventBus;
  stores: Stores;
  composure: ComposureReader;
  sections: readonly SectionData[];
  gameConfig: GameConfig;
  effectsTable: readonly EffectRule[];
  emberConfig: EmberConfig;
  storage?: SaveStorage;
  candleSeed?: number;
}

const DEPTH = { player: 10, darkness: 100, alwaysReadable: 200 } as const;
/** Never simulate more than this many steps in one frame (a long pause must not spiral). */
const MAX_STEPS_PER_FRAME = 8;

export class ClimbScene extends Phaser.Scene {
  private controls!: ReturnType<typeof createKeyboardInput>;
  private platforms: PlatformBox[] = [];
  private authoredPlatforms: PlatformData[] = [];
  private worldView!: ReturnType<typeof drawWorld>;
  private worldTimeMs = 0;
  private stages!: ReturnType<typeof createStageProgress>;
  private state!: PlayerState;
  private accumulatorMs = 0;
  private precisionActive = false;
  private phase!: PhaseController;
  private refuges!: ReturnType<typeof createRefugeController>;
  private ember!: ReturnType<typeof createRecoveryEmber>;
  private emberMark!: Phaser.GameObjects.Container;
  private wax!: ReturnType<typeof createWaxRewards>;
  private waxView!: ReturnType<typeof createWaxView>;
  private player!: Phaser.GameObjects.Rectangle;
  private landingPuff!: ReturnType<typeof createLandingPuff>;
  private candleLighting!: ReturnType<typeof createCandleLighting>;
  private darkness!: Phaser.GameObjects.Image;
  private lanternMark!: Phaser.GameObjects.Arc;
  private fuel = createLanternFuel();
  private forest!: ForestWorld;
  private candle!: ReturnType<typeof createCandleView>;
  private portrait!: ReturnType<typeof createPortraitView>;
  /** True while the camera slides back to the start after Play again; the player waits. */
  private sliding = false;
  /** Direction held in the latest physics step, for the candle's aim cue (visual only). */
  private aim: -1 | 0 | 1 = 0;
  private forestPreview: number | null = forestPreviewValue(window.location.search, import.meta.env.DEV);
  private visibility!: ProtectedVisibility;

  constructor(private readonly deps: ClimbSceneDeps) {
    super(CLIMB_SCENE_KEY);
  }

  create(): void {
    const { sections, effectsTable, stores, gameConfig } = this.deps;
    const first = sections[0];
    if (!first) throw new Error('ClimbScene needs at least one section');
    this.cameras.main.setBackgroundColor('#27324a');

    const world = loadSections(sections, gameConfig.view.width);
    this.authoredPlatforms = world.platforms;
    this.platforms = platformsAt(world.platforms, 0);
    this.worldView = drawWorld(this, world);
    this.forest = this.worldView.forest;
    // Publish the final camera position, after Phaser has applied follow/pan for this frame.
    const publishCamera = (): void => {
      if (!stores.worldView) return;
      const camera = this.cameras.main, previous = stores.worldView.get();
      if (previous?.scrollX === camera.scrollX && previous.scrollY === camera.scrollY &&
        previous.width === camera.width && previous.height === camera.height) return;
      stores.worldView.set({ scrollX: camera.scrollX, scrollY: camera.scrollY, width: camera.width, height: camera.height });
    };
    this.events.on(Phaser.Scenes.Events.RENDER, publishCamera);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.RENDER, publishCamera); stores.worldView?.set(null);
    });
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
    const initial = this.deps.startAt ?? this.ember.spawn;
    this.state = createPlayer(initial.x, initial.y);
    this.stages = createStageProgress(sections, stores.snapshot, this.deps.bus, this.deps.startAt?.platformId ?? this.ember.getAnchor()?.platformId);
    const offFinish = this.deps.bus.on('finish', () => { this.ember.clear(); this.wax.finish(); });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offFinish();
    });
    this.player = this.add.rectangle(this.state.x, this.state.y, gameConfig.player.width, gameConfig.player.height, 0xf2c14e).setDepth(DEPTH.player);
    this.player.setVisible(false); // Preserve the camera's original follow target and exact body alignment.
    this.candle = createCandleView(this, gameConfig.player.height, this.deps.candleSeed ?? pickCandleSeed(window.location.search, import.meta.env.DEV));
    // Bottom-left close-up of the same candle: replaces the lantern strength bar.
    this.portrait = createPortraitView(this, gameConfig.view.height);
    {
      const preview = (event: Event): void => {
        const value: unknown = (event as CustomEvent<unknown>).detail;
        this.forestPreview = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null;
      };
      window.addEventListener(FOREST_PREVIEW_EVENT, preview);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener(FOREST_PREVIEW_EVENT, preview));
    }

    this.cameras.main.setBounds(0, world.top, world.width, world.bottom - world.top);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.darkness = createDarkness(this, DEPTH.darkness);
    this.candleLighting = createCandleLighting(this);
    this.landingPuff = createLandingPuff(this);
    // Above the darkness (LAN-3): the ledge underfoot and reachable ledges stay readable.
    this.visibility = createProtectedVisibility(this, DEPTH.alwaysReadable, world.platforms, world, gameConfig);
    this.lanternMark = this.add.circle(0, 0, 4, 0xfff3c4).setDepth(DEPTH.alwaysReadable).setVisible(false);
    // Code-drawn shrine; original character, forest and platform art stay untouched.
    const shrine = this.add.graphics();
    shrine.fillStyle(0xffb83f, 0.12).fillCircle(0, -14, 26);
    shrine.fillStyle(0x6c8291).fillRect(-12, -20, 24, 22);
    shrine.fillStyle(0x142231).fillRect(-7, -18, 14, 19);
    shrine.fillStyle(0xaac4d2).fillRect(-15, 0, 30, 5).fillRect(-10, -24, 20, 5);
    shrine.fillStyle(0xff9b26).fillTriangle(-6, -3, 0, -20, 7, -3);
    shrine.fillStyle(0xffe68c).fillTriangle(-3, -3, 1, -13, 4, -3);
    this.emberMark = this.add.container(0, 0, [shrine]).setDepth(DEPTH.alwaysReadable).setVisible(false);

    // Native events reach the buffer immediately; do not let Space/arrows scroll the page.
    this.controls = createKeyboardInput(() => stores.settings.get().keys);
    const keyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.isComposing) return;
      // Before Play nothing reaches the player: no recovery request, no ember placement.
      if (stores.snapshot.get().phase === 'menu' || this.sliding) return;
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
    const offCheckpoint = this.deps.bus.on('checkpoint_restart_requested', () => this.returnToEmber(this.ember.restartAtAnchor()));
    const offFuelWax = this.deps.bus.on('wax_collected', () => this.fuel.refill());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, offFuelWax);
    const offRestart = this.deps.bus.on('run_restart', () => {
      this.fuel.reset();
      this.wax.reset();
      this.stages.reset();
      const spawn = this.ember.restart();
      this.worldTimeMs = 0;
      this.state = teleportPlayer(spawn.x, spawn.y); clearInput(); this.accumulatorMs = 0;
      this.candle.reseed(pickCandleSeed('', false));
      this.slideCameraTo(spawn.x, spawn.y);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { offAssist(); offCancel(); offRestart(); offCheckpoint(); });

    let cameraFrozen = false;
    const offCamera = stores.snapshot.subscribe((snapshot) => {
      const frozen = snapshot.phase === 'paused' || snapshot.phase === 'menu';
      if (frozen === cameraFrozen) return;
      cameraFrozen = frozen;
      if (frozen) this.cameras.main.stopFollow();
      else this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, offCamera);
    stores.effects.set(neutralFrame(effectsTable));
  }

  /** Play again: the camera slides down to the start (a cut under reduced motion), then follows again. */
  private slideCameraTo(x: number, y: number): void {
    const camera = this.cameras.main;
    this.player.setPosition(x, y);
    camera.stopFollow();
    const distance = Math.hypot(camera.midPoint.x - x, camera.midPoint.y - y);
    const duration = this.deps.stores.settings.get().reducedMotion ? 0 : Math.min(2200, Math.max(600, distance / 1.1));
    this.sliding = true;
    const done = (): void => {
      this.sliding = false;
      camera.startFollow(this.player, true, 0.12, 0.12);
    };
    if (duration === 0) { camera.centerOn(x, y); done(); return; }
    camera.pan(x, y, duration, 'Sine.easeInOut', true, (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress >= 1) done();
    });
  }

  private visibleRadius(_base: number, _airborne: boolean, _visualCorruption?: number): number {
    const camera = this.cameras.main;
    const x = this.state.x - camera.scrollX, y = this.state.y - camera.scrollY;
    const farX = Math.max(Math.abs(x), Math.abs(camera.width - x));
    const farY = Math.max(Math.abs(y), Math.abs(camera.height - y));
    return fuelVisibilityRadius(this.fuel.value, _visualCorruption ?? this.deps.stores.effects.get().forestCorruption,
      farX, farY);
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
    this.landingPuff.update(deltaMs, this.phase.isRunning(), settings.reducedMotion);
    this.returnToEmber(this.ember.advance(composure.getState(), performance.now()));
    const stepMs = 1000 / gameConfig.stepHz;
    if (!this.phase.isRunning()) {
      this.controls.clear();
      if (stores.snapshot.get().phase !== 'paused' && stores.snapshot.get().phase !== 'menu') this.state = { ...this.state, charging: false, chargeMs: 0, jumpLatch: true };
    }

    // Only the 'playing' phase steps; pause, ember and finished freeze the body.
    this.accumulatorMs = this.phase.isRunning() && !this.sliding ? Math.min(this.accumulatorMs + deltaMs, stepMs * MAX_STEPS_PER_FRAME) : 0;
    while (this.accumulatorMs >= stepMs && this.phase.isRunning()) {
      this.accumulatorMs -= stepMs;
      this.worldTimeMs += stepMs;
      this.platforms = platformsAt(this.authoredPlatforms, this.worldTimeMs, stepMs);
      // Wax growth (+2% per piece) scales walking and jumping; it comes from the wax count only, never the signal.
      const movement = grownMovement(gameConfig, waxGrowth(stores.snapshot.get().wax?.collected ?? 0, WAX_CONFIG.growthPerWax, WAX_CONFIG.growthCapWax));
      const input = this.controls.read();
      this.aim = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) as -1 | 0 | 1;
      const out = stepPlayer(this.state, input, this.platforms, gameConfig.view.width, movement, stepMs,
        { windAccelerationX: windAt(sections, this.state, this.worldTimeMs) });
      this.state = out.state;
      const actualSignal = composure.getState();
      this.fuel.update(actualSignal.valid && actualSignal.mode !== 'fixed' ? actualSignal.intensity : 0.2, stepMs);
      this.wax.update(this.state, stepMs, this.fuel.waxBenefit);
      this.refuges.update(this.state);
      if (out.events.jumped) bus.emit({ type: 'jump', charge01: out.events.jumped.charge01 });
      // A fall just ends on whatever catches you; no reset, no death (FAL-1).
      if (out.events.landed) {
        const landedId = out.events.landed.platformId;
        const snowy = sections.some(section => (section.stage?.snow01 ?? 0) > 0 && section.platforms.some(p => p.id === landedId));
        this.landingPuff.burst(this.state.x, this.state.y + gameConfig.player.height / 2, snowy, settings.reducedMotion);
        for (const event of landingEvents(out.events.landed, emberConfig)) bus.emit(event);
        if (this.stages.land(out.events.landed.platformId, this.fuel.isLit &&
          Math.max(actualSignal.valid && actualSignal.mode !== 'fixed' ? actualSignal.intensity : 0.2,
            stores.effects.get().forestCorruption, this.forestPreview ?? 0) <= LANTERN_FUEL_CONFIG.normalWorldMax01)) {
          this.accumulatorMs = 0;
          this.phase.finish();
        }
      }
    }
    const finishSignal = composure.getState();
    const normalWorld = this.fuel.isLit && Math.max(finishSignal.valid && finishSignal.mode !== 'fixed' ? finishSignal.intensity : 0.2,
      stores.effects.get().forestCorruption, this.forestPreview ?? 0) <= LANTERN_FUEL_CONFIG.normalWorldMax01;
    if (this.stages.finishIfReady(this.state.grounded ? this.state.platformId : null, normalWorld)) this.phase.finish();
    this.ember.refreshPrompt(this.state);
    const anchor = this.ember.getAnchor();
    this.emberMark.setVisible(anchor !== null);
    if (anchor) this.emberMark.setPosition(anchor.x, anchor.y + gameConfig.player.height / 2 - 7);
    if (this.state.charging !== this.precisionActive) {
      this.precisionActive = this.state.charging;
      bus.emit({ type: 'precision_window', active: this.precisionActive });
    }
    this.player.setPosition(this.state.x, this.state.y);
    this.waxView.update(deltaMs, this.phase.isRunning(), settings.reducedMotion);
    this.worldView.update(this.platforms, this.worldTimeMs, settings.reducedMotion, this.state.y);
    const sectionId = sectionAt(sections, this.state.y + gameConfig.player.height / 2);
    const lesson = sectionId === 'tutorial' ? lessonAt(sections, this.state.y) : undefined;
    const lessonKey = this.stages.isFinishBlocked() ? (this.fuel.isLit ? 'stage.finishBlocked' : 'stage.relightRequired') : lesson ? `lesson.${lesson}` : sectionId ? `stage.tip.${sectionId}` : undefined;
    if (stores.snapshot.get().lessonKey !== lessonKey) {
      stores.snapshot.set({ ...stores.snapshot.get(), lessonKey });
    }
    writeSnapshot(stores.snapshot, {
      lanternFuel01: Math.round(this.fuel.value * 100) / 100,
      sectionId,
      altitude01: altitude01(sections, this.state.y),
      navigation: {
        player: { x: Math.round(this.state.x), y: Math.round(this.state.y) },
        originY: sections[0]?.spawn.y ?? this.state.y,
        lanternRadiusPx: Math.round(this.visibleRadius(Math.max(stores.effects.get().lanternRadius,
          minCoveringRadius(gameConfig.view.width, gameConfig.view.height)), !this.state.grounded)),
        checkpoints: anchor ? [{ id: anchor.platformId, x: anchor.x, y: anchor.y }] : [],
      },
    });

    const signal = composure.getState();
    const frame = stores.snapshot.get().phase === 'paused' || stores.snapshot.get().phase === 'menu' ? stores.effects.get() : stepForestEffects(
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
      this.forestPreview,
    );
    stores.effects.set(frame);
    this.forest.update(frame.forestCorruption, deltaMs, settings.reducedMotion, !this.phase.isRunning(), settings.effectStrength);
    this.darkness.setAlpha(FUEL_VIEW.normalShadowAlpha +
      (FUEL_VIEW.corruptedShadowAlpha - FUEL_VIEW.normalShadowAlpha) * sceneryCorruption(frame.forestCorruption));

    // Never let the sheet shrink so far that its edge shows on screen.
    const baseRadius = Math.max(frame.lanternRadius, minCoveringRadius(gameConfig.view.width, gameConfig.view.height));
    const radius = this.visibleRadius(baseRadius, !this.state.grounded, frame.forestCorruption);
    updateDarkness(this.darkness, this.state.x, this.state.y, radius);
    this.candleLighting.update(this.state.x, this.state.y, this.fuel.value, frame.forestCorruption);
    this.visibility.update(this.state.platformId, this.state.x, this.state.y, radius, this.platforms);
    this.lanternMark.setPosition(this.state.x, this.state.y - gameConfig.player.height / 2 - 6);
    const lantern = effectsTable.find((rule) => rule.id === 'lanternRadius');
    const growth = waxGrowth(stores.snapshot.get().wax?.collected ?? 0, WAX_CONFIG.growthPerWax, WAX_CONFIG.growthCapWax);
    this.portrait.update(this.candle.genome(), deltaMs, {
      strength01: flameSizeFromRadius(radius, lantern?.min ?? 90, lantern?.max ?? 280),
      growth,
      reducedMotion: settings.reducedMotion,
      visible: stores.snapshot.get().phase !== 'menu' && settings.hud.showStatus,
      paused: !this.phase.isRunning(),
      shape: this.candle.shape(),
      face: this.candle.face(),
    });
    this.candle.update(this.state, deltaMs, !this.phase.isRunning(), {
      ember: !this.fuel.isLit && this.wax.lightPulse01() === 0,
      corruptedEmber: frame.forestCorruption > LANTERN_FUEL_CONFIG.normalWorldMax01,
      radiusPx: radius,
      minRadiusPx: lantern?.min ?? 90,
      maxRadiusPx: lantern?.max ?? 280,
      growth,
      charge01: this.state.chargeMs / gameConfig.jump.maxChargeMs,
      aim: this.phase.isRunning() ? this.aim : 0,
      reducedMotion: settings.reducedMotion,
    });
  }
}
