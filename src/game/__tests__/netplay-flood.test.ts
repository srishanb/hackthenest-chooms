/**
 * Second QA round, finding 1: wax ids from the other player were never bounded, and enough of them froze the game
 * (a `run_reset` or a new guest spread all of them into one call: `RangeError: Maximum call stack size exceeded`).
 * Any page of the same origin can post to the room, so these tests speak as the guest on the host's end of the link
 * and flood it, then check that nothing throws, the remembered sets stay under their caps, an honest wax race still
 * has one winner and an honest far-away claim is still honoured. They count entries; they never measure bytes.
 */
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG as G } from '../../config/game.config';
import { NETPLAY_CONFIG as N } from '../../config/netplay.config';
import { createEndlessWax } from '../endless/endless-wax';
import { createBroadcastTransport } from '../netplay/broadcast-transport';
import { createStore } from '../../shared/store';
import { PROTOCOL_VERSION, type NetEvent } from '../netplay/protocol';
import { startRemoteCrumble } from '../netplay/remote-crumble';
import { NO_CRUMBLE, type CrumbleState } from '../player/crumble';
import { createSim, type Sim, type SimLedge } from './netplay-sim';
import type { GameSnapshot } from '../../shared/contracts/game-state';
import type { EventBus } from '../../shared/contracts/events';

const H = G.player.height;
const FLOOR: SimLedge = { id: 'floor', x: 480, y: 500, width: 960, height: 24 };
const FLOOR_Y = 488 - H / 2;

function connected(delayMs = 0): Sim {
  const sim = createSim([FLOOR], { host: { x: 400, y: FLOOR_Y }, guest: { x: 600, y: FLOOR_Y } }, { delayMs }, 4);
  sim.run(1500);
  expect(sim.host.client.session.status()).toBe('connected');
  return sim;
}

/** Speak as the guest on the host's end of the link, the way a page of the same origin could. */
function forger(sim: Sim) {
  const guestId = sim.host.client.session.peerId()!;
  let n = 0;
  const send = (event: NetEvent): void => {
    sim.link.b.send({ v: PROTOCOL_VERSION, from: guestId, to: '*', msg: { type: 'event', id: `forged-${n++}`, atMs: sim.host.client.session.nowMs(), event } });
  };
  /** `count` sync messages of 1,024 made-up drop ids each, all in `run`. */
  const flood = (count: number, run = 0, chunkBase = 5): void => {
    for (let m = 0; m < count; m++) {
      const wax = Array.from({ length: 1024 }, (_, i) => ({ id: `e${chunkBase + (m % 997)}:wax-p${m * 1024 + i}`, atMs: 1 }));
      send({ kind: 'sync', run, wax, crumble: [] });
    }
  };
  return { send, flood };
}

describe('wax ids from the other player are bounded', () => {
  it('a flood of sync messages and then a run_reset throws nothing and stays under the caps', () => {
    const sim = connected();
    const forged = forger(sim);
    forged.flood(150);
    sim.run(100);
    const held = sim.host.client.waxClaimCounts();
    expect(held.theirs).toBeLessThanOrEqual(N.maxRemoteWax);
    // The reset frees every remembered claim at once: the old code spread them all into one call.
    forged.send({ kind: 'run_reset', run: 1 });
    expect(() => sim.run(200)).not.toThrow();
    expect(sim.host.client.waxClaimCounts().theirs).toBeLessThanOrEqual(N.maxRemoteWax);
    // The game keeps running: this candle still answers its clock.
    const at = sim.host.state.x;
    sim.run(200, (who) => (who === 'host' ? { left: false, right: true, jump: false } : { left: false, right: false, jump: false }));
    expect(sim.host.state.x).toBeGreaterThan(at);
  });

  it('a flood of single wax events is bounded the same way', () => {
    const sim = connected();
    const forged = forger(sim);
    for (let i = 0; i < 20_000; i++) forged.send({ kind: 'wax', dropId: `e${i % 500}:wax-s${i}`, run: 0 });
    sim.run(500);
    expect(sim.host.client.waxClaimCounts().theirs).toBeLessThanOrEqual(N.maxRemoteWax);
    forged.send({ kind: 'run_reset', run: 9 });
    expect(() => sim.run(200)).not.toThrow();
  });

  it('a new guest replacing a flooding one throws nothing and the sets stay under their caps', () => {
    const sim = connected();
    const forged = forger(sim);
    forged.flood(150);
    sim.run(100);
    sim.replaceGuest({ x: 600, y: FLOOR_Y });
    expect(() => sim.run(4000)).not.toThrow();
    expect(sim.host.client.session.status()).toBe('connected');
    expect(sim.host.client.waxClaimCounts().theirs).toBeLessThanOrEqual(N.maxRemoteWax);
  });

  it('an honest wax race still has one winner after a flood', () => {
    const sim = connected();
    forger(sim).flood(40);
    sim.run(300);
    sim.host.client.waxTaken('e1:wax-p1');
    sim.guest.client.waxTaken('e1:wax-p1');
    sim.run(1500);
    expect(sim.host.revoked.length + sim.guest.revoked.length).toBe(1);
    expect(sim.host.revoked.concat(sim.guest.revoked)).toEqual(['e1:wax-p1']);
  });

  it('an honest claim far above this player (chunk 900) is still honoured', () => {
    const sim = connected();
    forger(sim).flood(40);
    sim.run(300);
    sim.guest.client.waxTaken('e900:wax-s2');
    sim.run(500);
    expect(sim.host.hidden.has('e900:wax-s2')).toBe(true);
  });

  it('a sync with an id that is no drop of this world, or a chunk far beyond the world, is refused whole', () => {
    const sim = connected();
    const forged = forger(sim);
    for (const id of ['d', 'x'.repeat(40), 'e1:floor', 'e-1:wax-p1', 'e1:wax-', 'e99999999:wax-p1', 'e5000000:wax-p1', 'e3:wax-p1;']) {
      forged.send({ kind: 'wax', dropId: id, run: 0 });
      forged.send({ kind: 'sync', run: 0, wax: [{ id, atMs: 1 }], crumble: [] });
    }
    sim.run(300);
    expect(sim.host.client.waxClaimCounts().theirs).toBe(0);
    expect(sim.host.hidden.size).toBe(0);
  });
});

describe('every other collection fed by received messages is bounded', () => {
  it('endless-wax forgets the oldest drop the other player took beyond its cap, and keeps the newest', () => {
    const snapshot = createStore<GameSnapshot>({} as GameSnapshot);
    const wax = createEndlessWax({ gameConfig: G, bus: { emit: () => undefined } as unknown as EventBus, snapshot });
    const total = N.maxRemoteWax * 3;
    for (let i = 0; i < total; i++) wax.takenElsewhere(`e1:wax-p${i}`, true);
    let held = 0;
    for (let i = 0; i < total; i++) if (wax.isCollected(`e1:wax-p${i}`)) held++;
    expect(held).toBe(N.maxRemoteWax);
    expect(wax.isCollected(`e1:wax-p${total - 1}`)).toBe(true);
    expect(wax.isCollected('e1:wax-p0')).toBe(false);
  });

  it('crumbling ledges the other player names stay under their cap, however many it sends', () => {
    const rules = G.ledgeKinds!.crumble;
    let crumble: CrumbleState = NO_CRUMBLE;
    for (let i = 0; i < 5000; i++) crumble = startRemoteCrumble(crumble, `e${i}:p${i}`, 0, rules, N.maxCrumbling);
    expect(crumble.size).toBe(N.maxCrumbling);
    // An honest ledge that is already crumbling keeps its own timer, and the cap leaves room for none beyond it.
    expect(startRemoteCrumble(crumble, 'e0:p0', 500, rules, N.maxCrumbling)).toBe(crumble);
  });

  it('through the room, a sync of crumbling names and then steps keeps the game running (names that are no ledge are dropped)', () => {
    const sim = connected();
    const forged = forger(sim);
    for (let m = 0; m < 20; m++) forged.send({ kind: 'sync', run: 0, wax: [], crumble: Array.from({ length: 256 }, (_, i) => ({ id: `e${m}:p${i}`, startedMs: 0 })) });
    sim.run(200);
    expect(sim.host.crumble.size).toBeLessThanOrEqual(N.maxCrumbling);
  });

  it('knocks that arrive while no step runs are kept to a handful, and acknowledgements are not piled up', () => {
    const sim = connected();
    const forged = forger(sim);
    sim.host.paused = true;
    for (let i = 0; i < 5000; i++) forged.send({ kind: 'knock', dvx: 1, dvy: 1 });
    sim.run(300);
    sim.host.paused = false;
    sim.host.state = { ...sim.host.state, vx: 0 };
    sim.run(100);
    expect(sim.host.client.knocksTaken()).toBeLessThanOrEqual(16);
  });

  it('a reliable-events inbox remembers at most its limit of ids, and queues no more acknowledgements than that', async () => {
    const { createReliableEvents } = await import('../netplay/reliable-events');
    const events = createReliableEvents('p:', 100, 1000);
    for (let i = 0; i < 50_000; i++) events.accept(`id${i}`);
    expect(events.takeAcks().length).toBeLessThanOrEqual(4096);
  });

  it('the room transport keeps at most its limit of unread messages (the newest)', async () => {
    const mine = createBroadcastTransport('flood-test')!, theirs = createBroadcastTransport('flood-test')!;
    for (let i = 0; i < N.maxQueuedMessages * 6; i++) theirs.send({ n: i });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const got = mine.receive() as { n: number }[];
    mine.close(); theirs.close();
    expect(got.length).toBeLessThanOrEqual(N.maxQueuedMessages);
    expect(got.length).toBeGreaterThan(0);
    expect(got[got.length - 1]!.n).toBe(N.maxQueuedMessages * 6 - 1);
  });
});
