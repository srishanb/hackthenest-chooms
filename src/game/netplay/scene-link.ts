/**
 * What the endless scene calls in the two-player climb, so the scene itself changes in a few lines only.
 *
 * It owns the versus client (game logic), the remote view (drawing) and the status line's key. The scene asks it:
 *   - whether the world is known yet (a guest waits for the host's `hello` before its candle may move), and which;
 *   - the world time for each physics step (moving ledges follow the shared clock) and each step's shared time;
 *   - before and after each step (the other candle as a body, knocks, shoves, crumbling ledges);
 *   - once a frame (`frame`): send this candle, draw the other one, and hand back what the other player changed
 *     (crumbling ledges, wax to hide, show or undo) and, once, the world when it arrives.
 * Each player keeps their own fuel, wax, composure and end of run. The status goes to the snapshot as a string key
 * (`netplayKey`); the UI lane turns it into words. Gameplay code never holds player-facing text.
 */
import type * as Phaser from 'phaser';
import type { NetplayConfig } from '../../config/netplay.config';
import type { Stores } from '../../shared/contracts/app';
import type { GameConfig } from '../../shared/contracts/config';
import type { CrumbleState } from '../player/crumble';
import type { PlayerInput, PlayerState } from '../player/types';
import type { WorldOptions } from './protocol';
import { createRemoteView } from './remote-view';
import type { NetplaySession } from './session';
import { nextWorldTime } from './shared-clock';
import { createVersusClient, type LocalLook, type WorldChanges } from './versus-client';

export interface NetplayLinkOptions {
  session: NetplaySession;
  gameConfig: GameConfig;
  config: NetplayConfig;
  stores: Stores;
  /** The lantern rule's caps, so the other candle's flame spans the same range as this one's. */
  flame: { minRadiusPx: number; maxRadiusPx: number };
}

export interface FrameInput extends LocalLook {
  state: PlayerState;
  crumble: CrumbleState;
  camera: Phaser.Cameras.Scene2D.Camera;
  deltaMs: number;
  paused: boolean;
  reducedMotion: boolean;
}

export interface NetplayLink {
  /** True once this player's world is known (always for the host; for a guest after `hello`, or once refused). */
  ready(): boolean;
  /** The shared world, or null (a guest before `hello`, or refused: then it plays its own). */
  world(): WorldOptions | null;
  /** How far right of the usual spot this player's candle starts (px). */
  spawnOffsetX(): number;
  /**
   * The world time of the next physics step (moving ledges), given the current one and the time still to step, and how
   * far it really moved (moving ledges carry their riders by that).
   */
  worldTime(currentMs: number, stepMs: number, behindMs: number): { timeMs: number; deltaMs: number };
  beforeStep(state: PlayerState, behindMs: number): ReturnType<ReturnType<typeof createVersusClient>['beforeStep']>;
  afterStep(state: PlayerState, input: PlayerInput, crumbleBefore: CrumbleState, crumbleAfter: CrumbleState): void;
  /** This candle picked up these drops, which gave `fuelGained01` in all. */
  waxTaken(dropIds: readonly string[], fuelGained01: number): void;
  /** Once a frame. `arrived` is the world the first time it is known for a guest, else null. */
  frame(input: FrameInput): WorldChanges & { arrived: WorldOptions | null; fuelLost01: number };
  runStarted(): void;
  /** For the development readout. */
  readout(): Record<string, unknown>;
  destroy(): void;
}

type StatusKey = 'netplay.waiting' | 'netplay.connected' | 'netplay.back' | 'netplay.left' | 'netplay.refused.version' | 'netplay.refused.full'
  | 'netplay.refused.timeout';

export function createNetplayLink(scene: Phaser.Scene, options: NetplayLinkOptions): NetplayLink {
  const { session, gameConfig, config, stores } = options;
  const client = createVersusClient(session, gameConfig, config);
  const view = createRemoteView(scene, gameConfig, options.flame);
  /** Fuel each of this player's pickups gave, so a lost claim can take it back. */
  const fuelByDrop = new Map<string, number>();
  let worldSent = session.role === 'host';
  let status = session.status();
  let statusSinceMs = session.nowMs();
  let connection = session.connectionId();
  let destroyed = false;

  const onPageHide = (): void => session.close();
  window.addEventListener('pagehide', onPageHide);

  const statusKey = (nowMs: number): StatusKey | undefined => {
    const shownFor = nowMs - statusSinceMs;
    switch (status) {
      // A full room keeps asking (it frees up when a silent guest is replaced): say so while waiting.
      case 'waiting': return session.refusedReason() === 'full' ? 'netplay.refused.full' : 'netplay.waiting';
      case 'connected': return shownFor >= config.connectedNoticeMs ? undefined : session.resumed() ? 'netplay.back' : 'netplay.connected';
      case 'left': return shownFor < config.leftNoticeMs ? 'netplay.left' : undefined;
      case 'refused': return session.refusedReason() === 'timeout' ? 'netplay.refused.timeout' : 'netplay.refused.version';
    }
  };

  return {
    ready: () => session.role === 'host' || session.world() !== null || session.status() === 'refused',
    world: () => session.world(),
    spawnOffsetX: () => (session.role === 'guest' ? config.guestSpawnOffsetPx : 0),
    worldTime: (currentMs, stepMs, behindMs) =>
      nextWorldTime(currentMs, stepMs, session.nowMs() - behindMs, config.worldTimeSlewMs, config.worldTimeSnapMs),
    beforeStep: (state, behindMs) => client.beforeStep(state, session.nowMs() - behindMs),
    afterStep: (state, input, before, after) => client.afterStep(state, input, before, after),
    waxTaken(dropIds, fuelGained01) {
      for (const id of dropIds) { client.waxTaken(id); fuelByDrop.set(id, fuelGained01 / dropIds.length); }
    },
    frame(input) {
      client.update(input.state, input);
      const changes = client.takeWorld(input.crumble);
      let fuelLost01 = 0;
      for (const id of changes.revoke) { fuelLost01 += fuelByDrop.get(id) ?? 0; fuelByDrop.delete(id); }
      const now = session.nowMs();
      if (session.status() !== status || session.connectionId() !== connection) { status = session.status(); connection = session.connectionId(); statusSinceMs = now; }
      const key = statusKey(now);
      if (stores.snapshot.get().netplayKey !== key) stores.snapshot.set({ ...stores.snapshot.get(), netplayKey: key });
      view.update(client.shownBody(now, input.state), session.remoteAlpha(), input.candleSeed, input.camera, input.deltaMs, input.paused, input.reducedMotion);
      const world = session.world();
      const arrived = !worldSent && world ? world : null;
      if (arrived) worldSent = true;
      return { ...changes, arrived, fuelLost01 };
    },
    runStarted() { fuelByDrop.clear(); client.runStarted(); },
    readout: () => ({ role: session.role, status: session.status(), knocks: client.knocksTaken(), ...session.stats(),
      remote: (() => { const b = session.remote(session.nowMs())?.body; return b ? { x: Math.round(b.x), y: Math.round(b.y), on: b.platformId } : null; })() }),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      window.removeEventListener('pagehide', onPageHide);
      session.close();
      view.destroy();
    },
  };
}
