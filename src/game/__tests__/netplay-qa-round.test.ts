/**
 * The two-player QA round (holds 1 to 4 and should-fix 5 to 9 of the phase A findings), each as a test that failed
 * before the fix, plus the knock window, the event age limit and the crumble timing the earlier tests missed.
 * Two games over the in-process link (no network), with the real `stepWorld`, as netplay-sim.ts runs them.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG as G } from '../../config/game.config';
import { NETPLAY_CONFIG as N } from '../../config/netplay.config';
import { createContactArbiter } from '../netplay/contact-arbiter';
import { envelope, LIMITED_FIELDS, messageLimits, parseEnvelope, PROTOCOL_VERSION, type BodyState, type CandleLook, type Message, type NetEvent,
  type WorldOptions, type WorldSync } from '../netplay/protocol';
import { startRemoteCrumble } from '../netplay/remote-crumble';
import { NO_CRUMBLE } from '../player/crumble';
import { createPlayer, stepPlayer } from '../player/movement';
import type { PlatformBox, PlayerInput, PlayerState } from '../player/types';
import { headId, type OtherBody } from '../player/versus';
import { WALL_TYPE } from '../player/wall';
import { platformsAt } from '../world/environment';
import { createSim, IDLE, STEP_MS, type Sim, type SimLedge } from './netplay-sim';

const H = G.player.height;
const BW = G.player.width;
const V = G.versus!;
const DT = 1000 / G.stepHz;
const FLOOR: SimLedge = { id: 'floor', x: 480, y: 500, width: 960, height: 24 };
const FLOOR_TOP = 488;
const FLOOR_Y = FLOOR_TOP - H / 2;
const RIGHT: PlayerInput = { left: false, right: true, jump: false };
const keys = (left: boolean, right: boolean, jump = false): PlayerInput => ({ left, right, jump });
/** A full charge jump's rise (px): 780^2 / (2 x 1400). */
const FULL_JUMP_PX = (G.jump.maxSpeed * G.jump.maxSpeed) / (2 * G.gravityY);

/** Connect, let the clocks settle, then put the guest standing on the host's head (a test's starting position). */
function riderOnCarrier(delayMs: number, seed = 3, extra: Partial<{ loss01: number; jitterMs: number }> = {}): Sim {
  const sim = createSim([FLOOR], { host: { x: 480, y: FLOOR_Y }, guest: { x: 700, y: FLOOR_Y } },
    { delayMs, jitterMs: delayMs > 0 ? 30 : 0, loss01: 0.05, ...extra }, seed);
  sim.run(1500);
  sim.guest.state = { ...createPlayer(480, FLOOR_Y - H), grounded: true, platformId: headId('host'), jumpLatch: false, takeoffBottomY: FLOOR_TOP - H };
  sim.run(1200);
  return sim;
}

describe('hold 1: a carry goes through the same blocking as a walk', () => {
  /** A wall whose left face is at x = 500, from y = 100 down to the floor. */
  const WALL: PlatformBox = { id: 'w', x: 516, y: 294, width: 32, height: 388, type: WALL_TYPE };

  it('a rider carried toward a wall stops at its face, and cannot walk through it after', () => {
    let carrier: OtherBody = { id: 'guest', x: 440, y: FLOOR_Y, vx: 0, vy: 0, width: BW, height: H, grounded: true };
    let rider: PlayerState = { ...createPlayer(450, FLOOR_Y - H), grounded: true, platformId: headId('guest'), jumpLatch: false };
    let deepest = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < 200; i++) {
      const x = Math.min(carrier.x + 1.5, 500 - BW / 2);
      carrier = { ...carrier, dx: x - carrier.x, x };
      rider = stepPlayer(rider, IDLE, [FLOOR, WALL], 960, G, DT, { others: [carrier] }).state;
      deepest = Math.max(deepest, rider.x + BW / 2 - 500);
    }
    for (let i = 0; i < 240; i++) {
      rider = stepPlayer(rider, RIGHT, [FLOOR, WALL], 960, G, DT, { others: [{ ...carrier, dx: 0 }] }).state;
      deepest = Math.max(deepest, rider.x + BW / 2 - 500);
    }
    expect(deepest).toBeLessThanOrEqual(1e-6);
    expect(rider.x).toBeLessThan(500);
  });

  it('a candle on a moving ledge that slides under a wall is stopped by the wall, never carried into it', () => {
    // The ledge (top 900) slides right under a wall whose underside is 10 px above it: too low for a candle.
    const ledge = { id: 'm', x: 440, y: 908, width: 160, height: 16, type: 'moving', motion: { axis: 'x' as const, distance: 90, periodMs: 3000 } };
    const wall: PlatformBox = { id: 'w', x: 516, y: 790, width: 32, height: 200, type: WALL_TYPE };
    let s: PlayerState = { ...createPlayer(470, 900 - H / 2), grounded: true, platformId: 'm', jumpLatch: false };
    let deepest = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < 400; i++) {
      const platforms = [...platformsAt([ledge], i * DT, DT), wall];
      s = stepPlayer(s, IDLE, platforms, 960, G, DT).state;
      if (Math.abs(s.y - wall.y) < (H + wall.height) / 2) deepest = Math.max(deepest, s.x + BW / 2 - 500);
    }
    expect(deepest).toBeLessThanOrEqual(1e-6);
  });
});

describe('hold 2: a head that teleports carries nobody', () => {
  it.each([0, 200])('when the carrier restarts far away (%i ms), the rider is not dragged along, and falls', (delayMs) => {
    const sim = riderOnCarrier(delayMs);
    expect(sim.guest.state.platformId).toBe(headId('host'));
    let last = { x: sim.guest.state.x, y: sim.guest.state.y }, largest = 0;
    sim.restart('host', { x: 120, y: FLOOR_Y });
    sim.run(1500, undefined, () => {
      largest = Math.max(largest, Math.hypot(sim.guest.state.x - last.x, sim.guest.state.y - last.y));
      last = { x: sim.guest.state.x, y: sim.guest.state.y };
    });
    // A frame is two steps; a carry is at most what a candle moves in a step, a fall from a head is slower than that.
    expect(largest).toBeLessThan(40);
    expect(sim.guest.state.platformId).toBe('floor');
    expect(Math.abs(sim.guest.state.x - 480)).toBeLessThan(BW);
  });
});

describe('hold 3: a rider and its carrier never knock each other', () => {
  it.each([0, 80, 200])('a carrier jumps fully with a rider on its head (%i ms): its jump is not cut, nobody is knocked', (delayMs) => {
    const sim = riderOnCarrier(delayMs);
    const start = sim.nowMs();
    let hostTop = 0, guestTop = 0;
    // The host holds the jump for a full charge, then lets go; the guest stands still on its head.
    sim.run(2500, (who, t) => (who === 'host' && t - start < 700 ? keys(false, false, true) : IDLE), () => {
      hostTop = Math.max(hostTop, FLOOR_TOP - (sim.host.state.y + H / 2));
      guestTop = Math.max(guestTop, FLOOR_TOP - (sim.guest.state.y + H / 2));
    });
    expect(hostTop).toBeGreaterThan(FULL_JUMP_PX - 4);
    expect(guestTop).toBeLessThanOrEqual(H + 1e-6);
    expect(sim.host.client.knocksTaken()).toBe(0);
    expect(sim.guest.client.knocksTaken()).toBe(0);
  });

  it('no pair of presses gains more than a head plus one full jump (charges, release offsets, 0 to 200 ms)', () => {
    const bound = H + FULL_JUMP_PX;
    let best = 0;
    for (const delayMs of [0, 80, 200]) {
      for (const [hostCharge, guestCharge] of [150, 300, 450, 600].flatMap((h) => [150, 300, 450, 600].map((g) => [h, g] as const))) {
        for (const offset of [-8, -6, -4, -2, 0, 2, 4, 6, 8]) {
          const sim = riderOnCarrier(delayMs);
          const start = sim.nowMs();
          const press = (charge: number, shift: number) => (t: number): boolean => t - start >= 0 && t - start < charge + shift * STEP_MS + 100 && t - start >= 100 + shift * STEP_MS;
          const host = press(hostCharge, 0), guest = press(guestCharge, offset);
          sim.run(2200, (who, t) => (who === 'host' ? keys(false, false, host(t)) : keys(false, false, guest(t))), () => {
            best = Math.max(best, FLOOR_TOP - (sim.host.state.y + H / 2), FLOOR_TOP - (sim.guest.state.y + H / 2));
          });
          expect(sim.host.client.knocksTaken() + sim.guest.client.knocksTaken()).toBe(0);
        }
      }
    }
    expect(best).toBeGreaterThan(FULL_JUMP_PX);
    expect(best).toBeLessThanOrEqual(bound + 0.5);
  });
});

describe('hold 4: every received number is bounded', () => {
  /** Built inside each test, so a game without the table fails test by test. */
  const table = () => messageLimits(G);
  // Samples are typed so that a new message type, a new event kind or a new field (optional ones too, through
  // `Required`) without a sample here does not compile: `npm run check` fails until it has one, and a sample with a
  // number that has no row in the table fails the test below. A new field cannot skip the check by being forgotten.
  const BODY: Required<BodyState> = { x: 300, y: 400, vx: 10, vy: -20, grounded: true, platformId: 'p', charging: false, charge01: 0.5, aim: 1, fuel01: 0.5,
    out: false, candleSeed: 7, rideOffsetX: 3, run: 2 };
  const LOOK: Required<CandleLook> = { candleSeed: 1 };
  const WORLD: Required<WorldOptions> = { seed: 1, walls: true };
  const WAX_ITEM: Required<WorldSync['wax'][number]> = { id: 'e1:wax-p0', atMs: 3 };
  const CRUMBLE_ITEM: Required<WorldSync['crumble'][number]> = { id: 'c', startedMs: 3 };
  const EVENTS: { [K in NetEvent['kind']]: Extract<NetEvent, { kind: K }> } = {
    shove: { kind: 'shove', dir: 1 },
    knock: { kind: 'knock', dvx: 1, dvy: 1 },
    crumble: { kind: 'crumble', ledgeId: 'c' },
    wax: { kind: 'wax', dropId: 'e1:wax-p0', run: 1 },
    run_reset: { kind: 'run_reset', run: 1 },
    sync: { kind: 'sync', run: 1, wax: [WAX_ITEM], crumble: [CRUMBLE_ITEM] },
  };
  const OTHERS: { [K in Exclude<Message['type'], 'event'>]: Extract<Message, { type: K }> } = {
    join: { type: 'join', build: 'b', look: LOOK },
    hello: { type: 'hello', build: 'b', world: WORLD, look: LOOK },
    welcome: { type: 'welcome', look: LOOK },
    refuse: { type: 'refuse', reason: 'full' },
    ping: { type: 'ping', t0: 1 },
    pong: { type: 'pong', t0: 1, hostMs: 2 },
    state: { type: 'state', seq: 1, atMs: 5, body: BODY },
    ack: { type: 'ack', ids: ['e'] },
    bye: { type: 'bye' },
  };
  /** One message of every kind, with every field, to find every number in them. */
  const SAMPLES: Message[] = [
    ...Object.values(OTHERS),
    ...Object.values(EVENTS).map((event): Message => ({ type: 'event', id: 'e', atMs: 5, event })),
  ];
  /** The table key for a number at `path` in message `msg` (array indices dropped, an event's kind named). */
  const keyOf = (msg: Message, path: string[]): string => {
    const parts = path.filter((part) => !/^\d+$/.test(part));
    if (msg.type === 'event' && parts[0] === 'event') parts.splice(0, 1, msg.event.kind);
    return [msg.type, ...parts].join('.');
  };
  const numbers = (value: unknown, path: string[] = []): { path: string[]; value: number }[] =>
    typeof value === 'number' ? [{ path, value }] : typeof value === 'object' && value !== null
      ? Object.entries(value).flatMap(([key, inner]) => numbers(inner, [...path, key])) : [];
  /** Set the number at `path` in a copy of `msg`. */
  const withValue = (msg: Message, path: string[], value: unknown): unknown => {
    const copy = structuredClone(msg) as unknown as Record<string, unknown>;
    let at: Record<string, unknown> = copy;
    for (const part of path.slice(0, -1)) at = at[part] as Record<string, unknown>;
    at[path[path.length - 1]!] = value;
    return copy;
  };

  it('every number in every message has a row in the limits table (a new field cannot skip the check)', () => {
    const keys = new Set<string>(LIMITED_FIELDS);
    const missing = SAMPLES.flatMap((msg) => numbers(msg).map(({ path }) => keyOf(msg, path)).filter((key) => !keys.has(key)));
    expect(missing).toEqual([]);
    for (const msg of SAMPLES) expect(parseEnvelope(envelope('a', 'b', msg), table()).ok, msg.type).toBe(true);
  });

  it('the parser copies only the fields it knows: an unlisted field, at any depth, never reaches the game', () => {
    /** A copy of `value` with an unlisted number and string on every object in it. */
    const polluted = (value: unknown): unknown => Array.isArray(value) ? value.map(polluted)
      : typeof value === 'object' && value !== null
        ? { ...Object.fromEntries(Object.entries(value).map(([k, v]) => [k, polluted(v)])), unlistedNumber: 1e300, unlistedText: 'x' }
        : value;
    for (const msg of SAMPLES) {
      const plain = parseEnvelope(envelope('a', 'b', msg), table());
      const dirty = parseEnvelope({ v: PROTOCOL_VERSION, from: 'a', to: 'b', msg: polluted(msg) }, table());
      expect(plain.ok, msg.type).toBe(true);
      expect(dirty, msg.type).toEqual(plain);
    }
  });

  it('protocol.ts reads a number in one place only, the table reader (no raw typeof, parse or spread of raw input); its field name is typed `LimitedField`, a key of the table', () => {
    const source = readFileSync(new URL('../netplay/protocol.ts', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(source.match(/typeof [^;\n]*'number'/g)?.length).toBe(1);
    expect(source).not.toMatch(/parseInt|parseFloat|JSON\.parse|\+\s*value\b|\.\.\.\s*(value|item|raw|msg)\b/);
  });

  it('each field: a non-finite value drops the message, a huge one is clamped into its limits', () => {
    for (const msg of SAMPLES) {
      for (const { path } of numbers(msg)) {
        const key = keyOf(msg, path) as (typeof LIMITED_FIELDS)[number];
        for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, '7']) {
          expect(parseEnvelope({ v: PROTOCOL_VERSION, from: 'a', to: 'b', msg: withValue(msg, path, bad) }, table()).ok, `${key} ${String(bad)}`).toBe(false);
        }
        for (const huge of [1e300, -1e300]) {
          const parsed = parseEnvelope({ v: PROTOCOL_VERSION, from: 'a', to: 'b', msg: withValue(msg, path, huge) }, table());
          expect(parsed.ok, key).toBe(true);
          if (!parsed.ok) continue;
          const found = numbers(parsed.envelope.msg).find((entry) => entry.path.join('.') === path.join('.'))!;
          expect(found.value, key).toBeGreaterThanOrEqual(table()[key].min);
          expect(found.value, key).toBeLessThanOrEqual(table()[key].max);
        }
      }
    }
    // Lists longer than their limit drop the message.
    expect(parseEnvelope(envelope('a', 'b', { type: 'ack', ids: Array.from({ length: 257 }, (_, i) => `i${i}`) }), table()).ok).toBe(false);
  });

  it('a knock of 1e300 px/s from the room moves the local candle by at most one knock', () => {
    const sim = createSim([FLOOR], { host: { x: 400, y: FLOOR_Y }, guest: { x: 700, y: FLOOR_Y } }, {}, 3);
    sim.run(1500);
    sim.guest.state = { ...createPlayer(700, 300), jumpLatch: false };
    // Speak as the host on the guest's end of the link, the way a page of the same origin could.
    const hostId = sim.guest.client.session.peerId()!;
    sim.link.a.send({ v: PROTOCOL_VERSION, from: hostId, to: '*', msg: { type: 'event', id: 'evil-1', atMs: sim.guest.client.session.nowMs(), event: { kind: 'knock', dvx: 1e300, dvy: -1e300 } } });
    let fastest = 0;
    sim.run(300, undefined, () => { fastest = Math.max(fastest, Math.hypot(sim.guest.state.vx, sim.guest.state.vy)); });
    expect(sim.guest.client.knocksTaken()).toBe(1);
    expect(fastest).toBeLessThan(V.knock.maxImpulse + 60);
    expect(Number.isFinite(sim.guest.state.y)).toBe(true);
  });
});

describe('should-fix 5: one contact, one knock per candle, whatever the delay, loss, order and duplicates', () => {
  it('head-on short jumps from 0 to 400 ms with 20% loss, reordering and duplicates', () => {
    const outcomes: string[] = [];
    for (const [delayMs, jitterMs] of [[0, 0], [200, 30], [400, 30], [400, 200]] as const) {
      for (let seed = 1; seed <= 6; seed++) {
        const sim = createSim([FLOOR], { host: { x: 400, y: FLOOR_Y }, guest: { x: 560, y: FLOOR_Y } },
          { delayMs, jitterMs, loss01: 0.2, reorder01: 0.2, duplicate01: 0.2 }, seed);
        sim.run(1500);
        const start = sim.nowMs();
        sim.run(3000, (who, t) => {
          const toward = who === 'host' ? keys(false, true) : keys(true, false);
          return t - start < 250 ? { ...toward, jump: true } : t - start < 900 ? toward : IDLE;
        });
        outcomes.push(`${sim.host.client.knocksTaken()}/${sim.guest.client.knocksTaken()}`);
      }
    }
    // Both candles take one knock, or (when neither game saw the bodies touch: each sees the other in the past) none.
    expect(outcomes.filter((outcome) => outcome !== '1/1' && outcome !== '0/0')).toEqual([]);
    expect(outcomes.filter((outcome) => outcome === '1/1').length).toBeGreaterThan(0);
  });

  it('the other game\'s half of a contact this candle already took is ignored, however late it arrives', () => {
    const arbiter = createContactArbiter(V, G.player, G.walkSpeed, STEP_MS, V.knock.contactWindowMs + N.maxPlaybackDelayMs);
    const flying = { ...createPlayer(300, 300), jumpLatch: false, vx: 300, launchVx: 300 };
    const other: OtherBody = { id: 'guest', x: 300 + BW, y: 300, vx: -300, vy: 0, width: BW, height: H, grounded: false };
    expect(arbiter.beforeStep(flying, other, 1000).send).toHaveLength(1);
    // The same contact as the other game saw it, 300 ms later on its clock, arriving 700 ms later (resends).
    arbiter.receive({ kind: 'knock', dvx: -100, dvy: 0 }, 1300, 2000);
    arbiter.beforeStep(flying, null, 2001);
    expect(arbiter.knocksTaken()).toBe(1);
  });
});

describe('should-fix 6: a pause does not drop a candle off a moving ledge', () => {
  const MOVER: SimLedge = { id: 'm', x: 480, y: 404, width: 140, height: 16, motion: { axis: 'x', distance: 60, periodMs: 2600 } };
  const LIFT: SimLedge = { id: 'lift', x: 160, y: 404, width: 100, height: 16, motion: { axis: 'y', distance: 18, periodMs: 5600 } };

  it.each([3100, 3700, 4300, 4900, 5500, 6100])('the host pauses for %i ms on a moving ledge, resumes, and is still on it', (pauseMs) => {
    const sim = createSim([FLOOR, MOVER, LIFT], { host: { x: 480, y: 370 }, guest: { x: 160, y: 370 } }, { delayMs: 80, jitterMs: 30, loss01: 0.05 }, 5);
    sim.run(2000);
    expect(sim.host.state.platformId).toBe('m');
    sim.host.paused = true;
    sim.run(pauseMs);
    sim.host.paused = false;
    sim.run(1500);
    expect(sim.host.state.platformId).toBe('m');
    // The guest stood on a vertical lift through the clock's nudges the whole time.
    expect(sim.guest.state.platformId).toBe('lift');
  });
});

describe('should-fix 7: a silence is not the end', () => {
  it('after 10 s of silence the same two players pick up again: connected, faded back in, said so', () => {
    const sim = createSim([FLOOR], { host: { x: 400, y: FLOOR_Y }, guest: { x: 600, y: FLOOR_Y } }, { delayMs: 80, jitterMs: 30, loss01: 0.05 }, 2);
    sim.run(1500);
    sim.link.silence('a', true);
    sim.link.silence('b', true);
    sim.run(10_000);
    expect(sim.guest.client.session.status()).toBe('left');
    expect(sim.host.client.session.status()).toBe('left');
    sim.link.silence('a', false);
    sim.link.silence('b', false);
    sim.run(2000);
    expect(sim.guest.client.session.status()).toBe('connected');
    expect(sim.host.client.session.status()).toBe('connected');
    expect(sim.guest.client.session.resumed()).toBe(true);
    expect(sim.guest.client.otherBody(sim.guest.client.session.nowMs(), sim.guest.state)).not.toBeNull();
    sim.run(N.fadeMs);
    expect(sim.guest.client.session.remoteAlpha()).toBe(1);
  });

  it('a drop the other player took while unheard is re-agreed when they are back', () => {
    const sim = createSim([FLOOR], { host: { x: 400, y: FLOOR_Y }, guest: { x: 600, y: FLOOR_Y } }, { delayMs: 0 }, 2);
    sim.run(1500);
    sim.link.silence('a', true);
    sim.link.silence('b', true);
    sim.host.client.waxTaken('e2:wax-p1');
    // Longer than the event's resend give-up time: only the re-agreement after the silence can carry it.
    sim.run(N.giveUpMs + 2000);
    sim.link.silence('a', false);
    sim.link.silence('b', false);
    sim.run(2000);
    expect(sim.guest.hidden.has('e2:wax-p1')).toBe(true);
  });
});

describe('should-fix 8: a lost welcome does not leave the pair half-connected', () => {
  it('the first welcomes are lost: both still connect', () => {
    const sim = createSim([FLOOR], { host: { x: 400, y: FLOOR_Y }, guest: { x: 600, y: FLOOR_Y } }, {}, 1);
    let dropped = 0;
    const send = sim.link.b.send.bind(sim.link.b);
    sim.link.b.send = (data: unknown) => {
      if ((data as { msg?: { type?: string } }).msg?.type === 'welcome' && dropped < 3) { dropped++; return; }
      send(data);
    };
    sim.run(3000);
    expect(dropped).toBe(3);
    expect(sim.host.client.session.status()).toBe('connected');
    expect(sim.guest.client.session.status()).toBe('connected');
    expect(sim.guest.client.session.stats().receivedStates).toBeGreaterThan(0);
  });

  it('no welcome ever arrives: both give up, neither thinks it is connected', () => {
    const sim = createSim([FLOOR], { host: { x: 400, y: FLOOR_Y }, guest: { x: 600, y: FLOOR_Y } }, {}, 1);
    // Every welcome is lost: the guest has the world but never a state; the host never hears it accept.
    const send = sim.link.b.send.bind(sim.link.b);
    sim.link.b.send = (data: unknown) => { if ((data as { msg?: { type?: string } }).msg?.type !== 'welcome') send(data); };
    sim.run(N.handshakeTimeoutMs + 2000);
    expect(sim.guest.client.session.status()).toBe('refused');
    expect(sim.guest.client.session.refusedReason()).toBe('timeout');
    expect(sim.host.client.session.status()).toBe('waiting');
    expect(sim.host.client.session.peerId()).toBeNull();
  });
});

describe('should-fix 9: a reload whose goodbye was lost', () => {
  it('the new guest takes the silent one\'s place, and is told which drops the host already took', () => {
    const sim = createSim([FLOOR], { host: { x: 400, y: FLOOR_Y }, guest: { x: 600, y: FLOOR_Y } }, { delayMs: 80, jitterMs: 30, loss01: 0.05 }, 4);
    sim.run(1500);
    sim.host.client.waxTaken('e1:wax-s5');
    sim.run(500);
    sim.replaceGuest({ x: 600, y: FLOOR_Y });
    sim.run(4000);
    expect(sim.guest.client.session.status()).toBe('connected');
    expect(sim.host.client.session.status()).toBe('connected');
    expect(sim.guest.hidden.has('e1:wax-s5')).toBe(true);
  });
});

describe('what the earlier tests missed', () => {
  it('a shove older than maxEventAgeMs on arrival is dropped', () => {
    const arbiter = createContactArbiter(V, G.player, G.walkSpeed, STEP_MS);
    const standing = { ...createPlayer(300, FLOOR_Y), grounded: true };
    arbiter.receive({ kind: 'shove', dir: 1 }, 1000, 1000 + V.maxEventAgeMs + 1);
    expect(arbiter.beforeStep(standing, null, 1000 + V.maxEventAgeMs + 2).pushVx).toBe(0);
    arbiter.receive({ kind: 'shove', dir: 1 }, 2000, 2000 + V.maxEventAgeMs - 1);
    expect(arbiter.beforeStep(standing, null, 2000 + V.maxEventAgeMs).pushVx).toBeGreaterThan(0);
  });

  it('a crumbling ledge started by the other player is already as far along as the travel time', () => {
    const rules = G.ledgeKinds!.crumble;
    expect(startRemoteCrumble(NO_CRUMBLE, 'c', 250, rules).get('c')).toEqual({ heldMs: 250, goneMs: null });
    expect(startRemoteCrumble(NO_CRUMBLE, 'c', rules.holdMs + 40, rules).get('c')).toEqual({ heldMs: rules.holdMs, goneMs: 40 });
    expect(startRemoteCrumble(NO_CRUMBLE, 'c', rules.holdMs + rules.regrowMs + 1, rules).has('c')).toBe(false);
  });

});
