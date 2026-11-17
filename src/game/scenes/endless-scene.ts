/**
 * The endless scene: the same candle, controls and physics as the authored climb, on platforms
 * generated as you go, with no EEG anywhere.
 *
 * Flow each frame: keys -> fixed steps of `stepWorld` (src/game/player/: `stepPlayer` plus the crumbling
 * ledges' timers, with the chunk stream's updraft columns; Decision D-36) -> the chunk
 * stream adds and removes ledges around the player -> fuel burns and wax refills it -> draw.
 * The world's mood (forest corruption, tense music, narrower view) follows the fuel through the
 * existing effects table. The run ends when the flame goes out. Nothing here changes gravity,
 * walking or jump strength: the generator only decides where ledges are.
 */
import * as Phaser from 'phaser';
import type { EndlessConfig } from '../../config/endless.config';
import { FUEL_VISIBILITY_CONFIG as FUEL_VIEW, sceneryCorruption } from '../../config/fuel-visibility.config';
import { WAX_CONFIG } from '../../config/wax.config';
import type { Stores } from '../../shared/contracts/app';
import type { EmberConfig, GameConfig } from '../../shared/contracts/config';
import type { EffectRule } from '../../shared/contracts/effects';
import type { EventBus } from '../../shared/contracts/events';
import type { RunSnapshot } from '../../shared/contracts/game-state';
import type { KeyValueStorage } from '../../shared/safe-storage';
import { surroundings } from '../candle/awareness';
import { groundShadow } from '../candle/ground-shadow';
import { pickCandleSeed } from '../candle/candle-genome';
import { createCandleView } from '../candle/candle-view';
import { flameSizeFromRadius } from '../candle/flame';
import { grownMovement, waxGrowth } from '../candle/growth';
import { createPortraitView } from '../candle/portrait-view';
import { createDarkness, minCoveringRadius, updateDarkness } from '../effects/darkness';
import { neutralFrame } from '../effects/effects-engine';
import { createProtectedVisibility, type ProtectedVisibility } from '../effects/protected-visibility';
import { biomeOf, chunkOfPlatform, snowAt } from '../endless/biome';
import { createChunkStream, type ChunkStream } from '../endless/chunk-stream';
import { createEndlessWax } from '../endless/endless-wax';
import { burnScale, isSteadying, shake, steady, steadyComposure, stepComposure, type Composure } from '../endless/composure';
import { addWax, freshFlame, isLit, stepFlame, type FlameState } from '../endless/flame-fuel';
import { createEndlessGenerator, type EndlessGenerator, type WaxSpot } from '../endless/generator';
import { moodIntensity } from '../endless/mood';
import { nightAt, nightShadowAlpha, sightRadius } from '../endless/night';
import { createRouteBot } from '../endless/route-bot';
import { createRunScore, type RunScore } from '../endless/run-score';
import { createWaxDropsView } from '../endless/wax-drops-view';
import { createCandleLighting } from '../forest/candle-lighting';
import { stepForestEffects } from '../forest/forest-effects';
import { createForestWorld, type ForestWorld } from '../forest/forest-world';
import { backdropBiomeAt } from '../endless/backdrop-biome';
import { fuelVisibilityRadius } from '../forest/fuel-visibility';
import { createLandingPuff } from '../forest/landing-puff';
import { createGridCamera, type GridCamera } from './grid-camera';
import { snapToGrid } from '../forest/pixel-grid-snap';
import { createKeyboardInput } from '../keyboard-input';
import { createLedgeKindsView, type LedgeKindsView } from '../forest/ledge-kinds-view';
import { NO_CRUMBLE, solidLedges, type CrumbleState } from '../player/crumble';
import { teleportPlayer } from '../player/movement';
import { updraftAt } from '../player/updraft';
import { stepWorld } from '../player/world-step';
import type { PlatformBox, PlayerState } from '../player/types';
import { platformsAt } from '../world/environment';
import { landingEvents } from '../world/fall-tracker';
import { createPhaseController, type PhaseController } from '../world/phase-controller';
import { CLIMB_SCENE_KEY } from './boot-scene';
import { writeSnapshot } from './snapshot-writer';

export interface EndlessSceneDeps {
  bus: EventBus;
  stores: Stores;
  gameConfig: GameConfig;
  effectsTable: readonly EffectRule[];
  emberConfig: EmberConfig;
  config: EndlessConfig;
  /** Where the best height is kept. Optional: without it the best lasts for the session. */
  storage?: KeyValueStorage;
  candleSeed?: number;
  /** Seed of the first run. Later runs pick a new one unless `fixedSeed` is set. */
  seed: number;
  /** True when the seed came from the URL: every run then uses the same climb. */
  fixedSeed: boolean;
  /** Development only: let the route bot play (`?bot=1`). A bot run never saves a best height. */
  bot: boolean;
  /** Development only: start on this chunk's anchor ledge (`?startChunk=`), to look at a later height. Such a run never saves a best. */
  startChunk?: number;
  /** Development only: the first run starts with this much fuel (`?fuel=0.05`), to look at the flame going out. */
  startFuel?: number;
  /** Development only: how shaken (0..1) the candle starts the first run. */
  startShaken?: number;
}

/** The veil sits above the darkness and the ledge outlines but below the candle (210) and the portrait (300). */
const DEPTH = { player: 10, darkness: 100, alwaysReadable: 200, veil: 205 } as const;
/** Never simulate more than this many steps in one frame (a long pause must not spiral). */
const MAX_STEPS_PER_FRAME = 8;
/** Slower than this (px/s) with no direction held counts as standing still, for steadying the candle. */
const STILL_SPEED_PX_S = 6;
/** The camera may scroll this far up (px). Large enough to never be reached; the floor is the only real bound. */
const SKY_PX = 50_000_000;
const SECTION_ID = 'endless';

export class EndlessScene extends Phaser.Scene {
  private controls!: ReturnType<typeof createKeyboardInput>;
  private stream!: ChunkStream;
  /** The run's generator: the stream builds chunks from it, and the spawn stands on one of its anchors. */
  private generator!: EndlessGenerator;
  private platforms: PlatformBox[] = [];
  private worldTimeMs = 0;
  private state!: PlayerState;
  private accumulatorMs = 0;
  private precisionActive = false;
  private phase!: PhaseController;
  private flame!: FlameState;
  private wax!: ReturnType<typeof createEndlessWax>;
  private waxView!: ReturnType<typeof createWaxDropsView>;
  private score!: RunScore;
  private seed = 0;
  private player!: Phaser.GameObjects.Rectangle;
  private landingPuff!: ReturnType<typeof createLandingPuff>;
  private gridCamera!: GridCamera;
  private candleLighting!: ReturnType<typeof createCandleLighting>;
  private darkness!: Phaser.GameObjects.Image;
  private forest!: ForestWorld;
  private candle!: ReturnType<typeof createCandleView>;
  private portrait!: ReturnType<typeof createPortraitView>;
  private visibility!: ProtectedVisibility;
  private bot = createRouteBot();
  /** True while the camera slides back to the start after Play again; the player waits. */
  private sliding = false;
  /** Clean jumps in a row: landings no lower than their takeoff. A fall resets it. */
  private cleanJumps = 0;
  /** The highest landing reached in this run (a chunk index), so each new one is cheered once. */
  private landingReached = 0;
  /** Fuel burned so far in this run (in candles): the more that has burned, the longer the candle's drips. */
  private burnt = 0;
  /** Time into the last moment of a run (the wick has gone cold), or null while the run is alive. */
  private endingMs: number | null = null;
  /** The candle's shadow on the ledge below it (drawn under the candle, above the ledges). */
  private shadow!: Phaser.GameObjects.Ellipse;
  /** How shaken the candle is (composure.ts): drives the forest's corruption and the extra burn. */
  private composure: Composure = steadyComposure();
  /** A dark sheet over the world, under the candle, that closes in during the last moment. */
  private veil!: Phaser.GameObjects.Rectangle;
  /** Direction held in the latest physics step, for the candle's aim cue (visual only). */
  private aim: -1 | 0 | 1 = 0;
  /** Crumbling ledges' timers (player/crumble.ts), stepped with the candle by `stepWorld`. */
  private crumble: CrumbleState = NO_CRUMBLE;
  /** Bounce caps, crumbling ledges and updraft columns as drawn (Decision D-36). */
  private ledgeKinds!: LedgeKindsView;
  /** Caps that bounced and ledges that fell since the last frame, for the drawing. */
  private bouncedIds: string[] = [];
  private crumbledIds: string[] = [];
  /** Development counters for the automated browser check (bounces, ledges fallen, physics steps inside a column). */
  private kindCounts = { bounces: 0, crumbled: 0, updraftSteps: 0 };
  /** Development: the keyboard took over from the route bot (any game key pressed during a bot run). */
  private botTakenOver = false;

  constructor(private readonly deps: EndlessSceneDeps) {
    super(CLIMB_SCENE_KEY);
  }

  /**
   * Where the candle stands at the start of every run: the middle of the ground, or in a development run
   * the middle of that chunk's anchor ledge. The height does not need the generator (anchors sit at known
   * heights), so the score can take its origin before the first run is built.
   */
  private spawn(): { x: number; y: number } {
    const { gameConfig, config } = this.deps;
    const startChunk = this.deps.startChunk ?? 0;
    const floorTop = config.baseFloorTopPx - startChunk * config.chunkHeightPx;
    const x = this.generator ? this.generator.floor(startChunk).x : gameConfig.view.width / 2;
    return { x, y: floorTop - gameConfig.player.height / 2 };
  }

  /** The run's public record: its score plus the candle that is playing it. */
  private runSnapshot(): RunSnapshot { return { ...this.score.snapshot(), candleSeed: this.candle.seed() }; }

  /** Where a wax drop is right now: drops on a moving ledge ride along with it. */
  private waxX = (drop: WaxSpot): number => {
    if (drop.ledgeId === undefined || drop.ledgeX === undefined) return drop.x;
    const ledge = this.platforms.find((platform) => platform.id === drop.ledgeId);
    return ledge ? drop.x + ledge.x - drop.ledgeX : drop.x;
  };

  /** The live wax drops at their current positions (a new list only when a drop rides a moving ledge). */
  private liveWax(): readonly WaxSpot[] {
    const drops = this.stream.wax();
    return drops.some((drop) => drop.ledgeId !== undefined) ? drops.map((drop) => (drop.ledgeId === undefined ? drop : { ...drop, x: this.waxX(drop) })) : drops;
  }

  /** Feet y of the body: the height everything in endless mode is measured from. */
  private feetY(): number { return this.state.y + this.deps.gameConfig.player.height / 2; }

  /** Build the chunk stream for `seed` and draw its first chunks. Removes any earlier run's ledges first. */
  private startRun(seed: number): void {
    const { gameConfig, config } = this.deps;
    const firstRun = this.stream === undefined;
    for (const platform of this.stream?.platforms() ?? []) this.forest.removePlatform(platform.id);
    this.seed = seed;
    this.forest.reseedBackdrop(seed);
    this.generator = createEndlessGenerator(seed, gameConfig, config);
    this.stream = createChunkStream(this.generator, config);
    // Only the very first run of a development session may start short of fuel.
    this.flame = { ...freshFlame(config), fuel01: firstRun ? this.deps.startFuel ?? 1 : 1 };
    this.composure = steadyComposure(firstRun ? this.deps.startShaken ?? 0 : 0);
    this.worldTimeMs = 0;
    this.crumble = NO_CRUMBLE;
    this.endingMs = null;
    this.burnt = 0;
    this.cleanJumps = 0;
    this.landingReached = this.deps.startChunk ?? 0;
    const spawn = this.spawn();
    this.state = teleportPlayer(spawn.x, spawn.y);
    this.accumulatorMs = 0;
    this.syncWorld();
  }

  /**
   * Move the chunk window to the player and bring platform art and wax in line with it. Called after every
   * physics step. While falling, the window also reaches as far as the next step can carry the body (twice
   * that, to be safe), so no ledge is ever skipped because its chunk was not loaded yet.
   */
  private syncWorld(): void {
    const before = this.stream.platforms();
    const { gameConfig } = this.deps;
    const stepS = 1 / gameConfig.stepHz;
    const fallAheadPx = 2 * Math.max(0, this.state.vy + gameConfig.gravityY * stepS) * stepS;
    if (!this.stream.update(this.feetY(), fallAheadPx)) return;
    const now = this.stream.platforms();
    const live = new Set(now.map((platform) => platform.id));
    for (const platform of before) if (!live.has(platform.id)) this.forest.removePlatform(platform.id);
    // Each ledge wears the skin of its chunk's biome (forest or snow).
    for (const platform of now) this.forest.addPlatform(platform, biomeOf(chunkOfPlatform(platform.id), this.deps.config) === 'snow');
    this.platforms = platformsAt(now, this.worldTimeMs);
    this.waxView.sync(this.stream.wax(), this.wax.isCollected);
  }

  create(): void {
    const { effectsTable, stores, gameConfig, config, bus } = this.deps;
    this.cameras.main.setBackgroundColor('#27324a');
    const width = gameConfig.view.width;
    const floorBottom = config.baseFloorTopPx + config.ledgeHeightPx;
    // No authored platforms: every ledge is added and removed by the chunk stream.
    // The forest behind the climb is painted from the run's seed, and grows what the height's biome calls for.
    this.forest = createForestWorld(this, { sections: [], platforms: [], width, top: -SKY_PX, bottom: floorBottom }, {
      seed: this.deps.seed,
      biomeAt: (worldY) => backdropBiomeAt(worldY, this.seed, config),
      floorWorldY: config.baseFloorTopPx,
      startScrollY: floorBottom - gameConfig.view.height,
    });

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

    this.wax = createEndlessWax({ gameConfig, bus, snapshot: stores.snapshot });
    this.waxView = createWaxDropsView(this, bus);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.waxView.destroy());
    // Height is measured from where the run starts (the ground, or a later anchor ledge in a development run).
    this.score = createRunScore({ seed: this.deps.seed, originFeetY: this.spawn().y + gameConfig.player.height / 2, storage: this.deps.storage,
      // A climb picked by its seed (today's climb, or `?seed=`) keeps its own best, apart from fresh climbs.
      key: this.deps.fixedSeed ? `${config.bestKey}.seed-${this.deps.seed}` : config.bestKey,
      indexKey: this.deps.fixedSeed ? `${config.bestKey}.seeds` : undefined, persist: !this.deps.bot && !this.deps.startChunk });
    this.startRun(this.deps.seed);

    this.player = this.add.rectangle(this.state.x, this.state.y, gameConfig.player.width, gameConfig.player.height, 0xf2c14e).setDepth(DEPTH.player);
    this.player.setVisible(false); // The candle view draws the body; this rectangle is only the camera's follow target.
    this.shadow = this.add.ellipse(0, 0, 10, 4, 0x05060a, 0.3).setDepth(DEPTH.player - 1).setVisible(false);
    this.candle = createCandleView(this, gameConfig.player.height, this.deps.candleSeed ?? pickCandleSeed(window.location.search, import.meta.env.DEV));
    this.portrait = createPortraitView(this, gameConfig.view.height);

    this.cameras.main.setBounds(0, -SKY_PX, width, SKY_PX + floorBottom);
    // Follows like startFollow(player, true, 0.12, 0.12), but the drawn scroll lands on the art grid.
    this.gridCamera = createGridCamera(this, 0.12);
    this.gridCamera.follow(this.player);

    this.darkness = createDarkness(this, DEPTH.darkness);
    // At night the edge of the light is on screen all the time, so blend it smoothly instead of in blocks.
    this.darkness.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.veil = this.add.rectangle(0, 0, width, gameConfig.view.height, 0x05060a).setOrigin(0).setScrollFactor(0)
      .setDepth(DEPTH.veil).setAlpha(0);
    this.candleLighting = createCandleLighting(this);
    this.landingPuff = createLandingPuff(this);
    this.ledgeKinds = createLedgeKindsView(this, { world: 0.7, readable: DEPTH.alwaysReadable }, gameConfig,
      (id, offsetX, visible) => this.forest.setPlatformLook(id, offsetX, visible));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.ledgeKinds.destroy());
    // Above the darkness: the ledge underfoot and the ledges a real jump reaches stay readable.
    this.visibility = createProtectedVisibility(this, DEPTH.alwaysReadable, () => this.stream.platforms(),
      () => ({ width, ...this.stream.bounds() }), gameConfig, this.deps.config.outlineLowerReachPx);

    // Native events reach the buffer immediately; do not let Space/arrows scroll the page.
    this.controls = createKeyboardInput(() => stores.settings.get().keys);
    const keyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.isComposing) return;
      if (stores.snapshot.get().phase === 'menu' || this.sliding || !this.phase.isRunning()) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, button, [contenteditable="true"]')) return;
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

    this.phase = createPhaseController(bus, stores.snapshot, clearInput);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.phase.dispose());
    const offRestart = bus.on('run_restart', () => {
      this.score.save();
      const seed = this.deps.fixedSeed ? this.seed : pickCandleSeed('', false);
      this.wax.reset();
      this.score.reset(seed);
      this.startRun(seed);
      clearInput();
      this.candle.reseed(pickCandleSeed('', false));
      stores.snapshot.set({ ...stores.snapshot.get(), phase: 'playing', run: this.runSnapshot() });
      this.slideCameraTo(this.state.x, this.state.y);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, offRestart);
    const onPageHide = (): void => this.score.save();
    window.addEventListener('pagehide', onPageHide);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('pagehide', onPageHide));

    let cameraFrozen = false;
    const offCamera = stores.snapshot.subscribe((snapshot) => {
      const frozen = snapshot.phase === 'paused' || snapshot.phase === 'menu';
      if (frozen === cameraFrozen) return;
      cameraFrozen = frozen;
      if (frozen) this.gridCamera.stop();
      else this.gridCamera.follow(this.player);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, offCamera);
    stores.effects.set(neutralFrame(effectsTable));
    stores.snapshot.set({ ...stores.snapshot.get(), run: this.runSnapshot(), sectionId: SECTION_ID });
  }

  /** Play again: the camera slides down to the start (a cut under reduced motion), then follows again. */
  private slideCameraTo(x: number, y: number): void {
    const camera = this.cameras.main;
    this.player.setPosition(x, y);
    this.gridCamera.stop();
    const distance = Math.hypot(camera.midPoint.x - x, camera.midPoint.y - y);
    const duration = this.deps.stores.settings.get().reducedMotion ? 0 : Math.min(2200, Math.max(600, distance / 1.1));
    this.sliding = true;
    const done = (): void => {
      this.sliding = false;
      this.gridCamera.follow(this.player);
    };
    if (duration === 0) { camera.centerOn(x, y); done(); return; }
    camera.pan(x, y, duration, 'Sine.easeInOut', true, (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress >= 1) done();
    });
  }

  /**
   * A short camera shake when a long fall ends, if the player switched it on (it is off by default)
   * and reduced motion is off. The view shakes; the body and the physics do not.
   */
  private shakeOnLanding(fallHeightPx: number): void {
    const settings = this.deps.stores.settings.get();
    const { minFallPx, fullFallPx, maxIntensity, durationMs } = this.deps.config.landingShake;
    if (!settings.landingShake || settings.reducedMotion || fallHeightPx < minFallPx) return;
    const strength = Math.min(1, (fallHeightPx - minFallPx) / (fullFallPx - minFallPx));
    this.cameras.main.shake(durationMs, maxIntensity * (0.35 + 0.65 * strength));
  }

  /** How far the player can see: the fuel decides it once the mood has darkened the world. */
  private visibleRadius(corruption: number): number {
    const camera = this.cameras.main;
    const x = this.state.x - camera.scrollX, y = this.state.y - camera.scrollY;
    const farX = Math.max(Math.abs(x), Math.abs(camera.width - x));
    const farY = Math.max(Math.abs(y), Math.abs(camera.height - y));
    // By day the fuel rule decides; as night falls with height the candle's own circle takes over.
    const open = fuelVisibilityRadius(this.flame.fuel01, corruption, farX, farY);
    return sightRadius(open, this.flame.fuel01, nightAt(this.feetY(), this.deps.config), this.deps.config);
  }

  /** The flame went cold: freeze play and show the end screen. No `finish` event: nothing was "won". */
  private endRun(): void {
    const { stores } = this.deps;
    this.score.save();
    this.controls.clear();
    this.accumulatorMs = 0;
    stores.snapshot.set({ ...stores.snapshot.get(), phase: 'finished', run: this.runSnapshot() });
  }

  override update(_time: number, deltaMs: number): void {
    const { stores, gameConfig, effectsTable, bus, emberConfig, config } = this.deps;
    const settings = stores.settings.get();
    const running = (): boolean => this.phase.isRunning() && !this.sliding && this.endingMs === null;
    this.landingPuff.update(deltaMs, this.phase.isRunning(), settings.reducedMotion);
    const stepMs = 1000 / gameConfig.stepHz;
    if (!this.phase.isRunning()) {
      this.controls.clear();
      const phase = stores.snapshot.get().phase;
      if (phase !== 'paused' && phase !== 'menu') this.state = { ...this.state, charging: false, chargeMs: 0, jumpLatch: true };
    }

    // Only the 'playing' phase steps; pause, menu and the end screen freeze the body.
    this.accumulatorMs = running() ? Math.min(this.accumulatorMs + deltaMs, stepMs * MAX_STEPS_PER_FRAME) : 0;
    while (this.accumulatorMs >= stepMs && running()) {
      this.accumulatorMs -= stepMs;
      this.worldTimeMs += stepMs;
      this.platforms = platformsAt(this.stream.platforms(), this.worldTimeMs, stepMs);
      // Wax growth (+2% per piece, capped) scales walking and jumping; it comes from the wax count only.
      const movement = grownMovement(gameConfig, waxGrowth(this.wax.count(), WAX_CONFIG.growthPerWax, WAX_CONFIG.growthCapWax));
      // Development: a game key pressed during a bot run hands the candle over to the keyboard for the rest of the run.
      const keys = this.controls.read();
      if (this.deps.bot && !this.botTakenOver && (keys.left || keys.right || keys.jump)) {
        // A charge the bot had started is dropped, so the hand-over never fires a jump nobody asked for.
        this.botTakenOver = true;
        this.state = { ...this.state, charging: false, chargeMs: 0, jumpLatch: false };
      }
      const input = this.deps.bot && !this.botTakenOver
        ? this.bot.input(this.state, this.stream.chunks().flatMap((chunk) => chunk.route), (id) => this.platforms.find((p) => p.id === id),
          { base: gameConfig, current: movement, platforms: this.platforms, updrafts: this.stream.updrafts() })
        : keys;
      this.aim = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) as -1 | 0 | 1;
      // One step of the candle and the world: crumbling ledges hold or fall, updraft columns lift (Decision D-36).
      const out = stepWorld(this.state, this.crumble, input, this.platforms, this.stream.updrafts(), gameConfig.view.width, movement, stepMs);
      this.state = out.player;
      this.crumble = out.crumble;
      for (const id of out.crumbled) { this.crumbledIds.push(id); bus.emit({ type: 'ledge_crumbled', platformId: id }); }
      if (out.events.bounced) {
        this.bouncedIds.push(out.events.bounced.platformId);
        bus.emit({ type: 'bounce', platformId: out.events.bounced.platformId, launchSpeed: out.events.bounced.launchSpeed });
        this.kindCounts.bounces++;
      }
      this.kindCounts.crumbled += out.crumbled.length;
      if (!this.state.grounded && updraftAt(this.stream.updrafts(), this.state.x, this.state.y)) this.kindCounts.updraftSteps++;
      this.syncWorld();

      const before = this.flame.fuel01;
      // The candle's composure: standing still steadies it, and a shaken candle burns faster.
      const still = this.state.grounded && !this.state.charging && this.aim === 0 && Math.abs(this.state.vx) < STILL_SPEED_PX_S;
      this.composure = stepComposure(this.composure, stepMs, still, config);
      this.flame = stepFlame(this.flame, stepMs, this.stream.indexAt(this.feetY()), config, burnScale(this.composure.shaken01, config));
      this.burnt += Math.max(0, before - this.flame.fuel01);
      const wasLit = isLit(this.flame);
      const taken = this.wax.update(this.state, this.liveWax());
      for (let i = 0; i < taken.length; i++) this.flame = addWax(this.flame, config);
      if (taken.length) this.composure = steady(this.composure, config.composure.wax01 * taken.length);
      if (taken.length) { this.waxView.sync(this.stream.wax(), this.wax.isCollected); if (wasLit) this.candle.cheer(); else this.candle.relit(); }

      if (out.events.jumped) bus.emit({ type: 'jump', charge01: out.events.jumped.charge01 });
      // A fall just ends on whatever catches you; no reset, no death.
      if (out.events.landed) {
        this.shakeOnLanding(out.events.landed.fallHeightPx);
        this.cleanJumps = out.events.landed.fallHeightPx > 0 ? 0 : this.cleanJumps + 1;
        // A fall shakes the candle; a landing no lower than the takeoff steadies it a little.
        this.composure = out.events.landed.fallHeightPx > 0
          ? shake(this.composure, out.events.landed.fallHeightPx, config)
          : steady(this.composure, config.composure.cleanLanding01);
        // Reaching a new chunk's anchor ledge (id `eN:floor`) is a milestone: the candle is proud of it, once.
        const landedOn = out.events.landed.platformId;
        if (landedOn.endsWith(':floor') && chunkOfPlatform(landedOn) > this.landingReached) {
          this.landingReached = chunkOfPlatform(landedOn);
          this.candle.celebrate();
        }
        const snowy = biomeOf(chunkOfPlatform(out.events.landed.platformId), config) === 'snow';
        this.landingPuff.burst(this.state.x, this.feetY(), snowy, settings.reducedMotion);
        for (const event of landingEvents(out.events.landed, emberConfig)) bus.emit(event);
        if (this.score.stand(this.feetY())) {
          const run = this.runSnapshot();
          // Keep the record safe as soon as it is beaten, not only when the run ends.
          if (run.heightPx >= run.bestPx) this.score.save();
          // Celebrate once, at the moment the old best is passed.
          if (run.newBest && !stores.snapshot.get().run?.newBest) this.candle.celebrate();
          stores.snapshot.set({ ...stores.snapshot.get(), run });
        }
      }
      // The wick has gone cold. The body stops here; the end screen opens after a last moment (below).
      if (this.flame.out) { this.endingMs = 0; this.controls.clear(); break; }
    }
    // The last moment: the candle slumps and the world goes dark, then the end screen opens.
    if (this.endingMs !== null && this.phase.isRunning()) {
      this.endingMs += Math.max(0, deltaMs);
      if (this.endingMs >= config.ending.ms) this.endRun();
    }
    const spent01 = this.endingMs === null ? 0 : Math.min(1, this.endingMs / config.ending.ms);
    this.veil.setAlpha(config.ending.veilAlpha * spent01 * spent01 * (3 - 2 * spent01));

    if (this.state.charging !== this.precisionActive) {
      this.precisionActive = this.state.charging;
      bus.emit({ type: 'precision_window', active: this.precisionActive });
    }
    this.player.setPosition(this.state.x, this.state.y);
    // Only what can be stood on now casts the candle's shadow and gets an outline: no fallen ledge, no cap.
    const solid = solidLedges(this.platforms, this.crumble).filter((p) => p.type !== 'bounce');
    const shadow = groundShadow({ x: this.state.x, y: this.feetY() }, gameConfig.player.width, solid);
    this.shadow.setVisible(shadow !== null);
    // Drawn on the art grid (pixel-grid-snap.ts); sizes in whole steps of two art pixels so a centred ellipse stays on it.
    if (shadow) this.shadow.setPosition(snapToGrid(shadow.x), snapToGrid(shadow.y)).setSize(snapToGrid(shadow.widthPx, 4), snapToGrid(shadow.heightPx, 4)).setAlpha(shadow.alpha);
    this.forest.syncPlatforms(this.platforms);
    // Weather follows the height: snow fades in before a snowy band and out after it. There is no wind.
    const snow01 = snowAt(this.feetY(), config);
    this.forest.setEnvironment({ snowEnabled: snow01 > 0, snow01, windEnabled: false, wind01: 0, direction: 1 });
    const frozen = stores.snapshot.get().phase === 'paused' || stores.snapshot.get().phase === 'menu';
    const frame = frozen ? stores.effects.get() : stepForestEffects(stores.effects.get(), effectsTable, {
      // The mood follows the candle (how shaken it is, how low the flame): there is no signal in this variant.
      intensity: moodIntensity(this.flame.fuel01, config, this.composure.shaken01),
      valid: true,
      mode: 'adaptive',
      airborne: !this.state.grounded,
      effectStrength: settings.effectStrength,
      reducedMotion: settings.reducedMotion,
    }, deltaMs, null);
    stores.effects.set(frame);

    // While only the wick glows, the HUD says what to do. A key into the UI's strings, never text.
    const shaken = this.composure.shaken01 >= config.composure.shownFrom01;
    const lessonKey = !isLit(this.flame) ? (this.flame.out ? undefined : 'endless.relight') : shaken && this.endingMs === null ? 'endless.steady' : undefined;
    if (stores.snapshot.get().lessonKey !== lessonKey) stores.snapshot.set({ ...stores.snapshot.get(), lessonKey });
    const spawn = this.spawn();
    const radius = this.visibleRadius(frame.forestCorruption);
    writeSnapshot(stores.snapshot, {
      lanternFuel01: Math.round(this.flame.fuel01 * 100) / 100,
      sectionId: SECTION_ID,
      // There is no top. This reports how far along the difficulty ramp the climb is.
      altitude01: Math.min(1, Math.max(0, (config.baseFloorTopPx - this.feetY()) / (config.rampChunks * config.chunkHeightPx))),
      navigation: {
        player: { x: Math.round(this.state.x), y: Math.round(this.state.y) },
        originY: spawn.y,
        lanternRadiusPx: Math.round(radius),
        checkpoints: [],
      },
    });

    // The scenery only looks at where the candle is (birds fly off as it comes near); it changes nothing about it.
    this.forest.setCandle(this.state.x, this.state.y);
    this.forest.update(frame.forestCorruption, deltaMs, settings.reducedMotion, !this.phase.isRunning(), settings.effectStrength);
    this.darkness.setAlpha(nightShadowAlpha(FUEL_VIEW.normalShadowAlpha +
      (FUEL_VIEW.corruptedShadowAlpha - FUEL_VIEW.normalShadowAlpha) * sceneryCorruption(frame.forestCorruption),
      nightAt(this.feetY(), config), config));
    // Never let the sheet shrink so far that its edge shows on screen.
    updateDarkness(this.darkness, this.state.x, this.state.y, Math.max(radius, 1));
    this.candleLighting.update(this.state.x, this.state.y, this.flame.fuel01, frame.forestCorruption);
    this.waxView.update(deltaMs, this.phase.isRunning(), settings.reducedMotion,
      { x: this.state.x, y: this.state.y, radiusPx: radius, night01: nightAt(this.feetY(), config) * (1 - spent01) }, this.waxX);
    // Ledge outlines fade with the light in the last moment.
    this.visibility.update(this.state.platformId, this.state.x, this.state.y, radius * (1 - spent01), solid);
    this.ledgeKinds.update({ platforms: this.platforms, updrafts: this.stream.updrafts(), crumble: this.crumble,
      bounced: this.bouncedIds, crumbled: this.crumbledIds, candleX: this.state.x, candleY: this.state.y, radiusPx: radius * (1 - spent01),
      deltaMs, paused: !this.phase.isRunning(), reducedMotion: settings.reducedMotion });
    this.bouncedIds = [];
    this.crumbledIds = [];

    const lantern = effectsTable.find((rule) => rule.id === 'lanternRadius');
    const minRadius = lantern?.min ?? 90, maxRadius = lantern?.max ?? 280;
    // The flame's size follows the fuel directly, so the candle itself always shows how much is left.
    const flameRadius = minRadius + (maxRadius - minRadius) * this.flame.fuel01;
    const growth = waxGrowth(this.wax.count(), WAX_CONFIG.growthPerWax, WAX_CONFIG.growthCapWax);
    const phase = stores.snapshot.get().phase;
    this.portrait.update(this.candle.genome(), deltaMs, {
      strength01: flameSizeFromRadius(flameRadius, minRadius, maxRadius),
      growth,
      reducedMotion: settings.reducedMotion,
      visible: phase !== 'menu' && settings.hud.showStatus,
      paused: !this.phase.isRunning(),
      shape: this.candle.shape(),
      face: this.candle.face(),
      flame: this.candle.reactions(),
      melting: this.candle.melting(),
    });
    this.candle.update(this.state, deltaMs, !this.phase.isRunning(), {
      ember: !isLit(this.flame),
      corruptedEmber: false,
      radiusPx: flameRadius,
      minRadiusPx: minRadius,
      maxRadiusPx: maxRadius,
      growth,
      charge01: this.state.chargeMs / gameConfig.jump.maxChargeMs,
      aim: this.phase.isRunning() ? this.aim : 0,
      reducedMotion: settings.reducedMotion,
      fuel01: this.flame.fuel01,
      spent01,
      // Fully melted-looking after about two and a half candles' worth of burning.
      melt01: Math.min(1, this.burnt / 2.5),
      // Four clean jumps in a row and it starts to hum.
      flow: this.cleanJumps >= config.flowAfterJumps,
      // How shaken it is, and whether it is standing still to steady itself (eyes closed, a slow breath).
      shaken,
      steadying: isSteadying(this.composure, config),
      // In the snow its breath shows.
      cold: snow01 > 0.25,
      // What the candle notices: wax in reach, the edge of its ledge, ice underfoot. Eyes only.
      around: surroundings(this.state, this.liveWax().filter((drop) => !this.wax.isCollected(drop.id)),
        this.platforms.find((p) => p.id === this.state.platformId), gameConfig.view.width),
    });

    if (import.meta.env.DEV) {
      // Read by the automated browser check; never by the game.
      const data = this.game.canvas.dataset;
      data.endlessHeightPx = String(Math.round(config.baseFloorTopPx - this.feetY()));
      data.endlessFuel = this.flame.fuel01.toFixed(3);
      data.endlessShaken = this.composure.shaken01.toFixed(3);
      data.endlessCorruption = frame.forestCorruption.toFixed(3);
      data.endlessLedges = String(this.stream.platforms().length);
      data.endlessObjects = String(this.children.length);
      data.endlessSeed = String(this.seed);
      data.endlessPlayer = JSON.stringify({ x: Math.round(this.state.x), y: Math.round(this.state.y), grounded: this.state.grounded,
        on: this.state.platformId, charging: this.state.charging, bot: this.deps.bot && !this.botTakenOver });
      data.endlessKinds = JSON.stringify({ ...this.kindCounts, crumbling: [...this.crumble.keys()].length,
        inUpdraft: !this.state.grounded && updraftAt(this.stream.updrafts(), this.state.x, this.state.y) !== null });
      // The first moving ledge on screen and its wax, in screen px, so a check can watch them move together.
      const camera = this.cameras.main;
      const mover = this.platforms.find((p) => p.type === 'moving' && p.y > camera.scrollY + 40 && p.y < camera.scrollY + camera.height - 40);
      const rider = mover ? this.stream.wax().find((drop) => drop.ledgeId === mover.id) : undefined;
      data.endlessMover = mover ? JSON.stringify({ id: mover.id, x: Math.round(mover.x - camera.scrollX), y: Math.round(mover.y - camera.scrollY),
        waxX: rider && !this.wax.isCollected(rider.id) ? Math.round(this.waxX(rider) - camera.scrollX) : null }) : '';
    }
  }
}
