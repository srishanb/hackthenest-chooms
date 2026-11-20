/**
 * A test harness: two players' games stepped side by side over the in-process link, with a clock the test owns.
 * Each side runs its own candle with the real `stepWorld`, exactly as the scene does (moving ledges placed by the
 * shared world clock (`createWorldTimeFollower`), the netplay client around each step). A side can be paused (its candle
 * stops, its game keeps talking, as in the scene), restarted (its candle teleports to a spawn), or, for the guest,
 * replaced by a new game on the same link (a reload). Not a test file itself (no `.test.ts`); the netplay tests import it.
 */
import { GAME_CONFIG } from '../../config/game.config';
import { NETPLAY_CONFIG } from '../../config/netplay.config';
import type { PlatformData } from '../../shared/contracts/content';
import { createMemoryLink, type LinkConditions, type MemoryLink } from '../netplay/memory-transport';
import { createNetplaySession } from '../netplay/session';
import { createWorldTimeFollower, type WorldTimeFollower } from '../netplay/shared-clock';
import { createVersusClient, type VersusClient } from '../netplay/versus-client';
import { NO_CRUMBLE, type CrumbleState } from '../player/crumble';
import { createPlayer, teleportPlayer } from '../player/movement';
import type { PlatformBox, PlayerInput, PlayerState } from '../player/types';
import { stepWorld } from '../player/world-step';
import { platformsAt } from '../world/environment';

export const STEP_MS = 1000 / GAME_CONFIG.stepHz;
export const FRAME_MS = 1000 / 60;
const H = GAME_CONFIG.player.height;
export const IDLE: PlayerInput = { left: false, right: false, jump: false };

/** A ledge of the test world; `motion` makes it a moving ledge (as in the authored and endless climbs). */
export type SimLedge = PlatformBox & { motion?: PlatformData['motion'] };

export interface Side {
  client: VersusClient;
  state: PlayerState;
  crumble: CrumbleState;
  worldMs: number;
  /** The ledges as placed at this side's world time in its latest step. */
  platforms: PlatformBox[];
  /** This candle's true positions by shared time, to compare with what the other side shows. */
  truth: { atMs: number; x: number; y: number }[];
  /** Every feet crossing of a ledge top from above without landing on it (must stay empty). */
  throughLedges: string[];
  revoked: string[];
  hidden: Set<string>;
  accumulatorMs: number;
  /** This side's world clock (the scene's `NetplayLink` has the same). */
  worldClock: WorldTimeFollower;
  /** While true the candle does not step (a pause); the game still sends and receives. */
  paused: boolean;
}

export interface Sim {
  link: MemoryLink;
  host: Side;
  guest: Side;
  nowMs(): number;
  /** Run `ms` of game time; `input(side, t)` gives each side's keys at each step. */
  run(ms: number, input?: (who: 'host' | 'guest', tMs: number) => PlayerInput, onFrame?: () => void): void;
  /** A side starts a new run: its candle appears at `at`, standing still (as the scene's Play again). */
  restart(who: 'host' | 'guest', at: { x: number; y: number }): void;
  /** The guest's window reloads without a goodbye: a new game joins on the same link. */
  replaceGuest(at: { x: number; y: number }): void;
}

function crossedThrough(before: PlayerState, after: PlayerState, platforms: readonly PlatformBox[], landedOn: string | null): string | null {
  const prevBottom = before.y + H / 2, bottom = after.y + H / 2;
  for (const platform of platforms) {
    const top = platform.y - platform.height / 2;
    if (platform.id === landedOn || !(prevBottom < top - 1e-6 && bottom > top + 1e-6)) continue;
    if (Math.abs(after.x - platform.x) < (GAME_CONFIG.player.width + platform.width) / 2 - 1e-6) return platform.id;
  }
  return null;
}

export function createSim(ledges: readonly SimLedge[], start: { host: { x: number; y: number }; guest: { x: number; y: number } },
  conditions: Partial<LinkConditions> = {}, seed = 1): Sim {
  let t = 0;
  const now = (): number => t;
  const link = createMemoryLink(now, conditions, seed);
  const world: PlatformData[] = ledges.map((ledge) => ({ ...ledge, type: ledge.type ?? 'static' }));
  const common = { config: NETPLAY_CONFIG, gravityY: GAME_CONFIG.gravityY, now, build: 'test-build' };
  const hostSession = createNetplaySession({ ...common, role: 'host', transport: link.a, look: { candleSeed: 1 }, world: { seed: 42, walls: false } });
  const guestSession = createNetplaySession({ ...common, role: 'guest', transport: link.b, look: { candleSeed: 2 } });
  const side = (client: VersusClient, at: { x: number; y: number }): Side => ({
    client, state: { ...createPlayer(at.x, at.y), jumpLatch: false }, crumble: NO_CRUMBLE, worldMs: 0, platforms: platformsAt(world, 0),
    truth: [], throughLedges: [], revoked: [], hidden: new Set(), accumulatorMs: 0, paused: false,
    worldClock: createWorldTimeFollower(NETPLAY_CONFIG.worldTimeSlewMs, NETPLAY_CONFIG.worldTimeSnapMs, NETPLAY_CONFIG.worldTimeResumeGapMs),
  });
  const host = side(createVersusClient(hostSession, GAME_CONFIG), start.host);
  const guest = side(createVersusClient(guestSession, GAME_CONFIG), start.guest);
  const sides = { host, guest };

  function frame(s: Side, who: 'host' | 'guest', input: (who: 'host' | 'guest', tMs: number) => PlayerInput): void {
    const shared = s.client.session.nowMs();
    s.accumulatorMs = s.paused ? 0 : s.accumulatorMs + FRAME_MS;
    while (s.accumulatorMs >= STEP_MS) {
      s.accumulatorMs -= STEP_MS;
      const atMs = shared - s.accumulatorMs;
      const clock = s.worldClock.next(s.worldMs, STEP_MS, atMs);
      s.worldMs = clock.timeMs;
      s.platforms = platformsAt(world, s.worldMs, clock.deltaMs);
      const keys = input(who, t);
      const before = s.client.beforeStep(s.state, atMs);
      const out = stepWorld(before.state, s.crumble, keys, s.platforms, [], 960, GAME_CONFIG, STEP_MS, before.versus);
      const through = crossedThrough(before.state, out.player, s.platforms, out.events.landed?.platformId ?? null);
      if (through) s.throughLedges.push(through);
      s.client.afterStep(out.player, keys, s.crumble, out.crumble);
      s.state = out.player;
      s.crumble = out.crumble;
      s.truth.push({ atMs, x: s.state.x, y: s.state.y });
    }
    s.client.update(s.state, { charge01: 0, aim: 0, fuel01: 1, out: false, candleSeed: who === 'host' ? 1 : 2 });
    const changes = s.client.takeWorld(s.crumble);
    s.crumble = changes.crumble;
    for (const id of changes.hide) s.hidden.add(id);
    for (const id of changes.show) s.hidden.delete(id);
    s.revoked.push(...changes.revoke);
  }

  return {
    link, host, guest,
    nowMs: now,
    run(ms, input = () => IDLE, onFrame) {
      const end = t + ms;
      while (t < end) {
        t += FRAME_MS;
        frame(host, 'host', input);
        frame(guest, 'guest', input);
        onFrame?.();
      }
    },
    restart(who, at) {
      const s = sides[who];
      s.state = { ...teleportPlayer(at.x, at.y), jumpLatch: false };
      s.client.runStarted();
    },
    replaceGuest(at) {
      const session = createNetplaySession({ ...common, role: 'guest', transport: link.b, look: { candleSeed: 3 } });
      Object.assign(guest, side(createVersusClient(session, GAME_CONFIG), at));
    },
  };
}

/** Where a side's candle really was at shared time `atMs` (the nearest recorded step). */
export function truthAt(side: Side, atMs: number): { x: number; y: number } | null {
  let best: { atMs: number; x: number; y: number } | null = null;
  for (const sample of side.truth) if (!best || Math.abs(sample.atMs - atMs) < Math.abs(best.atMs - atMs)) best = sample;
  return best && Math.abs(best.atMs - atMs) <= STEP_MS ? best : null;
}
