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
import type { EndlessConfig } from '../config/endless.config';
import { ENDLESS_PIECES_CONFIG } from '../config/endless-pieces.config';
import { NETPLAY_CONFIG } from '../config/netplay.config';
import { createBroadcastTransport } from './netplay/broadcast-transport';
import { buildId } from './netplay/build-id';
import { messageLimits } from './netplay/protocol';
import { createNetplaySession, type NetplaySession } from './netplay/session';
import type { NetplaySwitch } from './netplay/switch';
import { BootScene } from './scenes/boot-scene';
import { ClimbScene } from './scenes/climb-scene';
import { EndlessScene } from './scenes/endless-scene';

export interface GameDeps {
  startAt?: { x: number; y: number; platformId: string };
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
  /** Seed of the first run's candle, so the menu emblem shows the same candle. Optional: random by default. */
  candleSeed?: number;
  /**
   * Set to play the endless, generated climb instead of the authored sections (game-only variant).
   * `seed` picks the climb; `fixedSeed` keeps it for every run; `bot` is the development route bot.
   */
  endless?: { config: EndlessConfig; seed: number; fixedSeed: boolean; bot: boolean; startChunk?: number; startFuel?: number; startShaken?: number;
    /** Prototype switch: wall slide and wall jump pieces (`?walls=1`, Decision D-37). */
    walls?: boolean;
    /** Two-player climb (`?mp=host|join&room=`, Decision D-38): this player's role and the room. Absent: solo. */
    netplay?: NetplaySwitch };
}

/**
 * The two-player session for the endless climb, over `BroadcastChannel` (two windows of one browser; no network in
 * phase A). Null when the switch is off or the browser has no `BroadcastChannel`: then the climb is solo.
 */
function createSession(deps: GameDeps): NetplaySession | undefined {
  const endless = deps.endless;
  const choice = endless?.netplay;
  if (!endless || !choice) return undefined;
  const transport = createBroadcastTransport(choice.room);
  if (!transport) return undefined;
  return createNetplaySession({
    role: choice.role, transport, config: NETPLAY_CONFIG, gravityY: deps.gameConfig.gravityY, now: () => performance.now(),
    build: buildId(deps.gameConfig, endless.config, ENDLESS_PIECES_CONFIG), look: { candleSeed: deps.candleSeed ?? 0 },
    world: choice.role === 'host' ? { seed: endless.seed, walls: endless.walls === true } : undefined,
    // Every number from the other side is bounded by this game's own rules.
    limits: messageLimits(deps.gameConfig),
  });
}

export function createGame(deps: GameDeps): Phaser.Game {
  if (!deps.endless && deps.sections.length === 0) throw new Error('createGame needs at least one section');
  const playScene = deps.endless
    ? new EndlessScene({
        bus: deps.bus,
        stores: deps.stores,
        gameConfig: deps.gameConfig,
        effectsTable: deps.effectsTable,
        emberConfig: deps.emberConfig,
        config: deps.endless.config,
        storage: deps.storage,
        candleSeed: deps.candleSeed,
        seed: deps.endless.seed,
        fixedSeed: deps.endless.fixedSeed,
        bot: deps.endless.bot,
        startChunk: deps.endless.startChunk,
        startFuel: deps.endless.startFuel,
        startShaken: deps.endless.startShaken,
        walls: deps.endless.walls,
        netplay: createSession(deps),
      })
    : new ClimbScene({
        startAt: deps.startAt,
        bus: deps.bus,
        stores: deps.stores,
        composure: deps.composure,
        sections: deps.sections,
        gameConfig: deps.gameConfig,
        effectsTable: deps.effectsTable,
        emberConfig: deps.emberConfig,
        storage: deps.storage,
        candleSeed: deps.candleSeed,
      });

  return new Phaser.Game({
    type: Phaser.AUTO,
    pixelArt: true,
    roundPixels: true,
    parent: deps.parent,
    backgroundColor: '#05060a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: deps.gameConfig.view.width,
      height: deps.gameConfig.view.height,
    },
    scene: [new BootScene(), playScene],
  });
}
