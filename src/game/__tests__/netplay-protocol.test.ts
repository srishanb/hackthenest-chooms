/**
 * The two-player message format and handshake: a malformed message is dropped, another protocol or build is
 * refused politely with a reason, a third player is refused, a repeated event is applied once, and a repeated
 * shove only renews its window. No network: the in-process link and a test clock.
 */
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../config/game.config';
import { NETPLAY_CONFIG } from '../../config/netplay.config';
import { buildId } from '../netplay/build-id';
import { createContactArbiter } from '../netplay/contact-arbiter';
import { createMemoryLink } from '../netplay/memory-transport';
import { envelope, parseEnvelope, PROTOCOL_VERSION } from '../netplay/protocol';
import { createNetplaySession, type SessionOptions } from '../netplay/session';
import { readNetplaySwitch } from '../netplay/switch';
import { createPlayer } from '../player/movement';

const BODY = { x: 0, y: 0, vx: 0, vy: 0, grounded: true, platformId: null, charging: false, charge01: 0, aim: 0 as const, fuel01: 1, out: false, candleSeed: 1, run: 0 };

function pair(guestBuild = 'b1') {
  let t = 0;
  const now = (): number => t;
  const link = createMemoryLink(now);
  const common: Omit<SessionOptions, 'role' | 'transport' | 'build' | 'look'> = { config: NETPLAY_CONFIG, gravityY: GAME_CONFIG.gravityY, now };
  const host = createNetplaySession({ ...common, role: 'host', transport: link.a, build: 'b1', look: { candleSeed: 1 }, world: { seed: 9, walls: true }, peerId: 'H' });
  const guest = createNetplaySession({ ...common, role: 'guest', transport: link.b, build: guestBuild, look: { candleSeed: 2 }, peerId: 'G' });
  const run = (ms: number): void => { for (let end = t + ms; t < end;) { t += 16; host.update(BODY); guest.update(BODY); } };
  return { link, host, guest, run, advance: (ms: number) => { t += ms; } };
}

describe('message format', () => {
  it('drops anything malformed and reports another protocol version with its sender', () => {
    expect(parseEnvelope(null).ok).toBe(false);
    expect(parseEnvelope({ v: PROTOCOL_VERSION, from: 'a', to: '*', msg: { type: 'state', seq: 1, atMs: 0, body: { x: 'no' } } }).ok).toBe(false);
    expect(parseEnvelope({ v: PROTOCOL_VERSION, from: 'a', to: '*', msg: { type: 'event', id: 'x', atMs: 0, event: { kind: 'knock', dvx: Infinity, dvy: 0 } } }).ok).toBe(false);
    expect(parseEnvelope({ v: PROTOCOL_VERSION + 1, from: 'a', to: '*', msg: { type: 'join' } })).toEqual({ ok: false, reason: 'version', from: 'a', type: 'join' });
    const good = envelope('a', 'b', { type: 'state', seq: 1, atMs: 5, body: BODY });
    expect(parseEnvelope(JSON.parse(JSON.stringify(good)))).toEqual({ ok: true, envelope: good });
    expect(parseEnvelope(structuredClone(good))).toEqual({ ok: true, envelope: good });
  });

  it('the switch is off unless it names a role and a valid room', () => {
    expect(readNetplaySwitch('')).toBeNull();
    expect(readNetplaySwitch('?mp=host')).toBeNull();
    expect(readNetplaySwitch('?mp=host&room=a b')).toBeNull();
    expect(readNetplaySwitch('?mp=watch&room=t1')).toBeNull();
    expect(readNetplaySwitch('?mp=host&room=t1')).toEqual({ role: 'host', room: 't1' });
    expect(readNetplaySwitch('?mp=join&room=t1&seed=4')).toEqual({ role: 'guest', room: 't1' });
  });

  it('the build fingerprint changes with the world config', () => {
    expect(buildId({ a: 1 })).toBe(buildId({ a: 1 }));
    expect(buildId({ a: 1 })).not.toBe(buildId({ a: 2 }));
  });
});

describe('handshake', () => {
  it('a guest learns the host world and both connect', () => {
    const { host, guest, run } = pair();
    expect(guest.world()).toBeNull();
    run(500);
    expect(host.status()).toBe('connected');
    expect(guest.status()).toBe('connected');
    expect(guest.world()).toEqual({ seed: 9, walls: true });
    expect(host.remoteLook()).toEqual({ candleSeed: 2 });
    expect(guest.remoteLook()).toEqual({ candleSeed: 1 });
  });

  it('a different build is refused politely, with the reason, and never connects', () => {
    const { host, guest, run } = pair('b2');
    run(2000);
    expect(guest.status()).toBe('refused');
    expect(guest.refusedReason()).toBe('version');
    expect(host.status()).toBe('waiting');
  });

  it('a game speaking another protocol version is refused with a reason', () => {
    let t = 0;
    const link = createMemoryLink(() => t);
    const host = createNetplaySession({ role: 'host', transport: link.a, config: NETPLAY_CONFIG, gravityY: 1400, now: () => t, build: 'b1',
      look: { candleSeed: 1 }, world: { seed: 1, walls: false }, peerId: 'H' });
    link.b.send({ v: PROTOCOL_VERSION + 1, from: 'old', to: '*', msg: { type: 'join', build: 'b1', look: { candleSeed: 3 } } });
    t += 16; host.update(BODY);
    const answers = link.b.receive().map(parseEnvelope);
    expect(answers).toContainEqual({ ok: true, envelope: envelope('H', 'old', { type: 'refuse', reason: 'version' }) });
    expect(host.status()).toBe('waiting');
    // And a guest told by another version's host that it is refused stops asking.
    const guest = createNetplaySession({ role: 'guest', transport: link.b, config: NETPLAY_CONFIG, gravityY: 1400, now: () => t, build: 'b1', look: { candleSeed: 2 } });
    link.a.send({ v: PROTOCOL_VERSION + 1, from: 'new', to: '*', msg: { type: 'hello' } });
    t += 16; guest.update(BODY);
    expect(guest.refusedReason()).toBe('version');
  });

  it('a third player is refused: the room is full', () => {
    const { link, host, run, advance } = pair();
    run(500);
    link.b.receive();
    link.b.send(envelope('X', '*', { type: 'join', build: 'b1', look: { candleSeed: 5 } }));
    advance(16);
    host.update(BODY);
    const answers = link.b.receive().map(parseEnvelope);
    expect(answers).toContainEqual({ ok: true, envelope: envelope('H', 'X', { type: 'refuse', reason: 'full' }) });
    expect(host.status()).toBe('connected');
  });

  it('a repeated event is applied once and acknowledged each time', () => {
    const { link, guest, run } = pair();
    run(500);
    guest.takeEvents();
    const message = { type: 'event' as const, id: 'H:77', atMs: 100, event: { kind: 'crumble' as const, ledgeId: 'e1:3' } };
    link.a.send(envelope('H', 'G', message));
    link.a.send(envelope('H', 'G', message));
    run(20);
    expect(guest.takeEvents()).toEqual([{ id: 'H:77', atMs: 100, event: { kind: 'crumble', ledgeId: 'e1:3' } }]);
    run(20);
    expect(guest.takeEvents()).toEqual([]);
  });

  it('an event is sent again until it is acknowledged, then no more', () => {
    const { link, host, guest, run } = pair();
    run(500);
    link.setConditions({ loss01: 1 });
    host.sendEvent({ kind: 'run_reset', run: 1 });
    run(NETPLAY_CONFIG.resendMs * 3);
    expect(host.stats().pendingEvents).toBe(1);
    link.setConditions({ loss01: 0 });
    run(NETPLAY_CONFIG.resendMs * 3);
    expect(host.stats().pendingEvents).toBe(0);
    expect(guest.takeEvents().map((event) => event.event)).toEqual([{ kind: 'run_reset', run: 1 }]);
  });
});

describe('the contact arbiter', () => {
  const V = GAME_CONFIG.versus!;
  const arbiter = () => createContactArbiter(V, GAME_CONFIG.player, GAME_CONFIG.walkSpeed, 1000 / GAME_CONFIG.stepHz);

  it('a shove that arrives twice pushes at the same speed and only renews its window', () => {
    const once = arbiter(), twice = arbiter();
    const state = { ...createPlayer(300, 470), grounded: true };
    once.receive({ kind: 'shove', dir: 1 }, 1000, 1010);
    twice.receive({ kind: 'shove', dir: 1 }, 1000, 1010);
    twice.receive({ kind: 'shove', dir: 1 }, 1000, 1010);
    const speed = V.shoveSpeed01 * GAME_CONFIG.walkSpeed;
    expect(once.beforeStep(state, null, 1020).pushVx).toBe(speed);
    expect(twice.beforeStep(state, null, 1020).pushVx).toBe(speed);
    expect(twice.beforeStep(state, null, 1010 + V.shoveHoldMs + 1).pushVx).toBe(0);
  });

  it('a knock is taken once per contact window, and a late one is dropped', () => {
    const a = arbiter();
    const state = { ...createPlayer(300, 300), jumpLatch: false };
    a.receive({ kind: 'knock', dvx: 100, dvy: 0 }, 1000, 1050);
    a.receive({ kind: 'knock', dvx: 100, dvy: 0 }, 1001, 1060);
    const after = a.beforeStep(state, null, 1070).state;
    expect(after.vx).toBe(100);
    expect(a.knocksTaken()).toBe(1);
    a.receive({ kind: 'knock', dvx: 100, dvy: 0 }, 2000, 2000 + V.maxEventAgeMs + 1);
    a.beforeStep(after, null, 3000);
    expect(a.knocksTaken()).toBe(1);
  });
});
