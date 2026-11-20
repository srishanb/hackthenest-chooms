/**
 * Two simulated players over the in-process link (no network), at 0, 80 and 200 ms delay with jitter and 5% loss:
 * the other candle follows the truth closely, a shove moves the pushed candle on both screens and is applied once,
 * a knock is taken once per candle, nobody is pushed through a ledge, nothing oscillates, a wax drop has one
 * winner, a crumbling ledge falls on both sides, and a player who goes silent fades out while the other plays on.
 */
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../config/game.config';
import { NETPLAY_CONFIG } from '../../config/netplay.config';
import type { PlatformBox, PlayerInput } from '../player/types';
import { headId } from '../player/versus';
import { createSim, IDLE, STEP_MS, truthAt, type Sim } from './netplay-sim';

const H = GAME_CONFIG.player.height;
const BW = GAME_CONFIG.player.width;
const V = GAME_CONFIG.versus!;
const FLOOR: PlatformBox = { id: 'floor', x: 480, y: 500, width: 960, height: 24 };
const FLOOR_Y = 488 - H / 2;
const LEDGE: PlatformBox = { id: 'ledge', x: 600, y: 396, width: 200, height: 16 };
const LEDGE_Y = 388 - H / 2;
const CRUMBLY: PlatformBox = { id: 'c1', x: 200, y: 396, width: 80, height: 16, type: 'crumbling' };
const WORLD = [FLOOR, LEDGE, CRUMBLY];
const DELAYS = [0, 80, 200];
const conditionsFor = (delayMs: number) => ({ delayMs, jitterMs: delayMs > 0 ? 30 : 0, loss01: 0.05 });

const keys = (left: boolean, right: boolean, jump = false): PlayerInput => ({ left, right, jump });
/** Connect and let the clock settle, then return the sim. */
function connected(delayMs: number, host = { x: 300, y: FLOOR_Y }, guest = { x: 700, y: FLOOR_Y }, seed = 3): Sim {
  const sim = createSim(WORLD, { host, guest }, conditionsFor(delayMs), seed);
  sim.run(1500);
  expect(sim.host.client.session.status()).toBe('connected');
  expect(sim.guest.client.session.status()).toBe('connected');
  return sim;
}

describe.each(DELAYS)('two players at %i ms delay, 30 ms jitter, 5 percent loss', (delayMs) => {
  it('the guest sees the host candle within 10 px of where it really was at the shown time, and within delay x speed of now', () => {
    const sim = connected(delayMs);
    // The host walks right, jumps, walks back; the guest stands still.
    const script = (who: 'host' | 'guest', t: number): PlayerInput => {
      if (who === 'guest') return IDLE;
      const phase = (t - 1500) % 3000;
      return phase < 900 ? keys(false, true) : phase < 1250 ? keys(false, false, true) : phase < 2400 ? keys(true, false) : IDLE;
    };
    let worstShown = 0, worstNow = 0, worstClock = 0;
    sim.run(6000, script, () => {
      const shown = sim.guest.client.session.remote(sim.guest.client.session.nowMs());
      if (!shown) return;
      // States carry the host's own time, and the guest plays them back by that time: compare with where the host
      // really was at that time. The guest's estimate of the host's clock only shifts how far back it plays; bound it too.
      worstClock = Math.max(worstClock, Math.abs(sim.guest.client.session.nowMs() - sim.nowMs()));
      const truth = truthAt(sim.host, shown.atMs);
      if (truth) worstShown = Math.max(worstShown, Math.hypot(shown.body.x - truth.x, shown.body.y - truth.y));
      const present = sim.host.truth[sim.host.truth.length - 1]!;
      worstNow = Math.max(worstNow, Math.hypot(shown.body.x - present.x, shown.body.y - present.y));
    });
    // Measured 7 to 9 px: blending across a lost update while the host turns round.
    expect(worstShown).toBeLessThan(10);
    expect(worstClock).toBeLessThan(2 * STEP_MS + 1);
    // Behind by the playback delay at most: at most 780 px/s (a full jump's launch speed) times that delay.
    expect(worstNow).toBeLessThan(780 * sim.guest.client.session.stats().delayMs / 1000 + 10);
  });

  it('a shove: walking into the standing host pushes it on both screens, applied once, never through a ledge, with no oscillation', () => {
    const sim = connected(delayMs, { x: 450, y: FLOOR_Y }, { x: 390, y: FLOOR_Y });
    const hostStart = sim.host.state.x;
    // The guest walks right into the host for 1.2 s, then stops.
    sim.run(1200, (who) => (who === 'guest' ? keys(false, true) : IDLE));
    const pushedBy = sim.host.state.x - hostStart;
    // Pushed at the shove speed for most of the contact (the first contact waits for the guest to reach it).
    const shoveSpeed = V.shoveSpeed01 * GAME_CONFIG.walkSpeed;
    expect(pushedBy).toBeGreaterThan(shoveSpeed * 0.6);
    expect(pushedBy).toBeLessThan(shoveSpeed * (1.2 + V.shoveHoldMs / 1000) + 1);
    // On the guest's screen the host moved too, and the guest is stopped against it, never inside it.
    sim.run(1000);
    const shown = sim.guest.client.session.remote(sim.guest.client.session.nowMs())!;
    expect(Math.abs(shown.body.x - sim.host.state.x)).toBeLessThan(1);
    expect(shown.body.x - sim.guest.state.x).toBeGreaterThanOrEqual(BW - 1);
    // Nothing moves once the guest has stopped: no back-and-forth.
    const settledX = sim.host.state.x, guestX = sim.guest.state.x;
    sim.run(1000);
    expect(sim.host.state.x).toBe(settledX);
    expect(sim.guest.state.x).toBe(guestX);
    expect(sim.host.throughLedges).toEqual([]);
    expect(sim.guest.throughLedges).toEqual([]);
  });

  it('a shove pushes a candle off a ledge, and it lands on the floor below, not through anything', () => {
    // The host stands near the ledge's right end; the guest stands on the ledge left of it and walks right.
    const sim = connected(delayMs, { x: 660, y: LEDGE_Y }, { x: 600, y: LEDGE_Y });
    sim.run(2500, (who) => (who === 'guest' ? keys(false, true) : IDLE));
    sim.run(1500);
    expect(sim.host.state.platformId).toBe('floor');
    expect(sim.host.state.y).toBeCloseTo(FLOOR_Y, 6);
    expect(sim.host.throughLedges).toEqual([]);
    expect(sim.guest.throughLedges).toEqual([]);
  });

  it('a knock in the air is taken once by each candle', () => {
    const sim = connected(delayMs, { x: 400, y: FLOOR_Y }, { x: 560, y: FLOOR_Y });
    // Both charge a short jump toward each other and release together.
    const script = (who: 'host' | 'guest', t: number): PlayerInput => {
      const local = t - 1500;
      const toward = who === 'host' ? keys(false, true) : keys(true, false);
      return local < 250 ? { ...toward, jump: true } : local < 900 ? toward : IDLE;
    };
    sim.run(3000, script);
    expect(sim.host.client.knocksTaken()).toBe(1);
    expect(sim.guest.client.knocksTaken()).toBe(1);
    // With no delay they bounced apart. With a delay each saw the other late, so where they end up differs by screen.
    if (delayMs === 0) expect(sim.host.state.x).toBeLessThan(sim.guest.state.x - BW);
    expect(sim.host.throughLedges).toEqual([]);
    expect(sim.guest.throughLedges).toEqual([]);
  });

  it('a candle that jumps onto the other candle stands on its head on both screens', () => {
    const sim = connected(delayMs, { x: 480, y: FLOOR_Y }, { x: 480 - BW - 1, y: FLOOR_Y });
    // The guest, right beside the host, jumps straight up and steers right over the host's head.
    const script = (who: 'host' | 'guest', t: number): PlayerInput => {
      const local = t - 1500;
      if (who !== 'guest') return IDLE;
      return local < 300 ? keys(false, false, true) : local < 420 ? IDLE : local < 880 ? keys(false, true) : IDLE;
    };
    sim.run(2500, script);
    expect(sim.guest.state.platformId).toBe(headId('host'));
    expect(sim.guest.state.y).toBeCloseTo(FLOOR_Y - H, 6);
    // The host's game draws the guest on the host's real head.
    const shown = sim.host.client.otherBody(sim.host.client.session.nowMs(), sim.host.state)!;
    expect(shown.ridesMe).toBe(true);
    expect(shown.y).toBeCloseTo(sim.host.state.y - H, 3);
  });

  it('a wax drop both reach for has one winner', () => {
    const sim = connected(delayMs);
    // Both pick it up before either hears of the other's pickup (the guest a frame later when there is a delay).
    sim.host.client.waxTaken('e1:wax-p1');
    if (delayMs > 0) sim.run(10);
    sim.guest.client.waxTaken('e1:wax-p1');
    sim.run(1500);
    // The host claimed first (by the shared clock): the guest's pickup is undone and the drop is gone for both.
    expect(sim.host.revoked).toEqual([]);
    expect(sim.guest.revoked).toEqual(['e1:wax-p1']);
    expect(sim.host.hidden.has('e1:wax-p1')).toBe(false);
    expect(sim.guest.hidden.has('e1:wax-p1')).toBe(true);
    // A later claim the other way round keeps its first winner: the guest first, a frame before the host.
    if (delayMs === 0) return;
    sim.guest.client.waxTaken('e1:wax-p2');
    sim.run(10);
    sim.host.client.waxTaken('e1:wax-p2');
    sim.run(1500);
    expect(sim.host.revoked).toEqual(['e1:wax-p2']);
    expect(sim.guest.revoked).toEqual(['e1:wax-p1']);
  });

  it('a crumbling ledge the host stands on falls on the guest side at about the same time', () => {
    const sim = connected(delayMs, { x: 200, y: 300 }, { x: 700, y: FLOOR_Y });
    let hostFellAt: number | null = null, guestFellAt: number | null = null;
    sim.run(2000, undefined, () => {
      if (hostFellAt === null && sim.host.crumble.get('c1')?.goneMs != null) hostFellAt = sim.host.client.session.nowMs();
      if (guestFellAt === null && sim.guest.crumble.get('c1')?.goneMs != null) guestFellAt = sim.guest.client.session.nowMs();
    });
    expect(hostFellAt).not.toBeNull();
    expect(guestFellAt).not.toBeNull();
    // The same shared moment, give or take a frame and the clock's estimate (plus one resend after a loss).
    expect(Math.abs(guestFellAt! - hostFellAt!)).toBeLessThan(40 + (delayMs > 0 ? NETPLAY_CONFIG.resendMs : 0));
  });

  it('the session survives the other side going silent: the candle fades and the guest plays on alone', () => {
    const sim = connected(delayMs);
    sim.link.silence('a', true);
    sim.run(NETPLAY_CONFIG.silentAfterMs + 500, (who) => (who === 'guest' ? keys(true, false) : IDLE));
    expect(sim.guest.client.session.status()).toBe('left');
    expect(sim.guest.client.otherBody(sim.guest.client.session.nowMs(), sim.guest.state)).toBeNull();
    sim.run(NETPLAY_CONFIG.fadeMs + 100, (who) => (who === 'guest' ? keys(false, true) : IDLE));
    expect(sim.guest.client.session.remoteAlpha()).toBe(0);
    expect(sim.guest.state.grounded).toBe(true);
  });
});

describe('moving ledges follow the shared clock', () => {
  it('both sides keep the same world time within a few ms', () => {
    const sim = connected(80);
    sim.run(3000);
    expect(Math.abs(sim.host.worldMs - sim.guest.worldMs)).toBeLessThan(STEP_MS * 3);
  });
});
