/**
 * Bounce caps, crumbling ledges and updraft columns (Decision D-36): the pure physics rules, checked with
 * the same `stepPlayer` / `stepWorld` the game and the generator's replay run.
 */
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG as G } from '../../config/game.config';
import { bounceSpeed } from '../player/bounce';
import { NO_CRUMBLE, solidLedges, type CrumbleState } from '../player/crumble';
import { createPlayer, stepPlayer } from '../player/movement';
import type { PlatformBox, PlayerInput, PlayerState, UpdraftBox } from '../player/types';
import { updraftAt, updraftVy } from '../player/updraft';
import { stepWorld } from '../player/world-step';

const W = 960;
const DT = 1000 / G.stepHz;
const K = G.ledgeKinds!;
const IDLE: PlayerInput = { left: false, right: false, jump: false };
const H = G.player.height;
const topOf = (p: PlatformBox): number => p.y - p.height / 2;
const standOn = (p: PlatformBox, x = p.x): PlayerState => ({ ...createPlayer(x, topOf(p) - H / 2), grounded: true, platformId: p.id, jumpLatch: false });

const FLOOR: PlatformBox = { id: 'floor', x: 480, y: 1510, width: 960, height: 20 };
const CAP: PlatformBox = { id: 'cap', x: 480, y: 1010, width: 96, height: 20, type: 'bounce' };

/** Run `steps` steps; returns the states after each. */
function trace(start: PlayerState, platforms: PlatformBox[], steps: number, input: (i: number) => PlayerInput = () => IDLE, updrafts: UpdraftBox[] = []) {
  const states: PlayerState[] = [];
  const events = [];
  let s = start;
  for (let i = 0; i < steps; i++) {
    const out = stepPlayer(s, input(i), platforms, W, G, DT, { updrafts });
    s = out.state; states.push(s); events.push(out.events);
  }
  return { states, events, last: s };
}

/** Highest rise of the feet above `topY` over a trace. */
const apexAbove = (states: PlayerState[], topY: number): number => Math.max(...states.map((s) => topY - (s.y + H / 2)));

/** The straight-up full-charge jump from a ledge: its apex above the ledge (px). */
function fullJumpApex(): number {
  const ledge: PlatformBox = { id: 'l', x: 480, y: 1010, width: 200, height: 20 };
  const charge = Math.ceil(G.jump.maxChargeMs / DT);
  const { states } = trace(standOn(ledge), [ledge, FLOOR], 400, (i) => ({ ...IDLE, jump: i < charge }));
  return apexAbove(states, topOf(ledge));
}

describe('bounce caps', () => {
  it('throw the candle about twice as high as a full jump, from any landing, and never let it stand', () => {
    const plain = fullJumpApex();
    expect(plain).toBeGreaterThan(200);
    for (const dropPx of [20, 120, 300]) {
      const start = createPlayer(CAP.x, topOf(CAP) - dropPx - H / 2);
      const { states, events } = trace(start, [CAP, FLOOR], 300);
      const bounce = events.findIndex((e) => e.bounced);
      expect(bounce).toBeGreaterThanOrEqual(0);
      const speed = events[bounce]!.bounced!.launchSpeed;
      expect(speed).toBeGreaterThanOrEqual(K.bounce.launchSpeed);
      expect(speed).toBeLessThanOrEqual(K.bounce.maxLaunchSpeed);
      expect(states.slice(0, bounce + 120).some((s) => s.grounded)).toBe(false);
      const apex = apexAbove(states.slice(bounce), topOf(CAP));
      expect(apex).toBeGreaterThan(1.6 * plain);
      expect(apex).toBeLessThan(2.2 * plain);
    }
    // A harder landing throws a little higher, never past the cap.
    expect(bounceSpeed(600, K.bounce)).toBeGreaterThan(bounceSpeed(100, K.bounce));
    expect(bounceSpeed(1e6, K.bounce)).toBe(K.bounce.maxLaunchSpeed);
  });

  it('keep the horizontal speed (the bounce is aimed by how you arrive) and steer normally afterwards', () => {
    const start = { ...createPlayer(CAP.x - 30, topOf(CAP) - 80 - H / 2), vx: 120, launchVx: 120 };
    const { states, events } = trace(start, [CAP, FLOOR], 200);
    const bounce = events.findIndex((e) => e.bounced);
    expect(states[bounce + 1]!.vx).toBeCloseTo(120, 5);
    const steered = trace(start, [CAP, FLOOR], 200, () => ({ ...IDLE, right: true }));
    expect(steered.states[bounce + 5]!.x).toBeGreaterThan(states[bounce + 5]!.x);
  });

  it('walking onto a cap from a ledge at its height bounces, and a held jump does not charge or fire', () => {
    const ledge: PlatformBox = { id: 'side', x: CAP.x - 48 - 60, y: CAP.y, width: 120, height: 20 };
    const walk = trace(standOn(ledge, ledge.x + 40), [ledge, CAP, FLOOR], 200, () => ({ ...IDLE, right: true }));
    expect(walk.events.some((e) => e.bounced)).toBe(true);
    // Hold jump from high above the cap all the way through the bounce and the landing on the floor.
    const held = trace({ ...createPlayer(CAP.x, topOf(CAP) - 100), vx: 150, launchVx: 150 }, [CAP, FLOOR], 600, () => ({ ...IDLE, jump: true }));
    expect(held.events.some((e) => e.bounced)).toBe(true);
    expect(held.events.some((e) => e.jumped)).toBe(false);
    expect(held.last.grounded).toBe(true);
    expect(held.last.platformId).toBe('floor');
    expect(held.last.charging).toBe(false);
  });
});

describe('crumbling ledges', () => {
  const CRUMB: PlatformBox = { id: 'crumb', x: 480, y: 1010, width: 120, height: 20, type: 'crumbling' };
  const run = (player: PlayerState, crumble: CrumbleState, steps: number, input: (i: number) => PlayerInput = () => IDLE, platforms = [CRUMB, FLOOR]) => {
    let p = player, c = crumble;
    const log: Array<{ player: PlayerState; crumble: CrumbleState; crumbled: string[]; jumped: boolean }> = [];
    for (let i = 0; i < steps; i++) {
      const out = stepWorld(p, c, input(i), platforms, [], W, G, DT);
      p = out.player; c = out.crumble;
      log.push({ player: p, crumble: c, crumbled: out.crumbled, jumped: out.events.jumped !== null });
    }
    return { log, player: p, crumble: c };
  };
  const landOn = () => run(createPlayer(CRUMB.x, topOf(CRUMB) - H / 2 - 30), NO_CRUMBLE, 100);

  it('hold for holdMs after the first landing, then fall away and stop being solid', () => {
    const { log } = landOn();
    const landed = log.findIndex((s) => s.player.grounded);
    const fell = log.findIndex((s) => s.crumbled.includes('crumb'));
    expect(landed).toBeGreaterThan(0);
    expect((fell - landed) * DT).toBeGreaterThanOrEqual(K.crumble.holdMs - DT);
    expect((fell - landed) * DT).toBeLessThanOrEqual(K.crumble.holdMs + DT + 1e-6);
    expect(solidLedges([CRUMB, FLOOR], log[fell]!.crumble).map((p) => p.id)).toEqual(['floor']);
    // Standing still, the candle drops with it: a normal fall onto the floor below.
    const after = run(log.at(-1)!.player, log.at(-1)!.crumble, 120);
    expect(after.player.grounded).toBe(true);
    expect(after.player.platformId).toBe('floor');
  });

  it('allows a small jump but never a full charge: the charge is lost when it falls', () => {
    const { log } = landOn();
    const landed = log.findIndex((s) => s.player.grounded);
    const onIt = log[landed]!;
    // Hold jump from the step after landing for a full charge: the ledge goes first and the charge is lost.
    const full = run(onIt.player, onIt.crumble, 200, () => ({ ...IDLE, jump: true }));
    expect(full.log.some((s) => s.jumped)).toBe(false);
    expect(full.player.platformId).toBe('floor');
    expect(full.player.charging).toBe(false);
    // A charge of 8 of 12 levels (400 ms less a margin) jumps in time.
    const steps = Math.floor((K.crumble.holdMs - 40) / DT);
    const small = run(onIt.player, onIt.crumble, 4, (i) => ({ ...IDLE, jump: i < steps }));
    const quick = run(onIt.player, onIt.crumble, steps + 1, (i) => ({ ...IDLE, jump: i < steps }));
    expect(small.log.some((s) => s.jumped)).toBe(false);
    expect(quick.log.at(-1)!.jumped).toBe(true);
  });

  it('grows back after regrowMs once the candle is clear, but not while it is still close', () => {
    const { log } = landOn();
    const fell = log.findIndex((s) => s.crumbled.includes('crumb'));
    // The candle falls to the floor 500 px below (clear of the ledge) and waits.
    const waited = run(log[fell]!.player, log[fell]!.crumble, Math.ceil(K.crumble.regrowMs / DT) + 4);
    expect(waited.crumble.has('crumb')).toBe(false);
    // With a ledge just under it, the candle stays within reach of the gone ledge: it does not grow back yet.
    const under: PlatformBox = { id: 'under', x: 480, y: topOf(CRUMB) + 40, width: 200, height: 20 };
    const near = run(log[fell]!.player, log[fell]!.crumble, Math.ceil(K.crumble.regrowMs / DT) + 4, () => IDLE, [CRUMB, under, FLOOR]);
    expect(near.player.platformId).toBe('under');
    expect(near.crumble.get('crumb')?.goneMs).not.toBeNull();
  });
});

describe('updraft columns', () => {
  const DRIFT: UpdraftBox = { id: 'drift', kind: 'drift', x: 480, y: 600, width: 200, height: 800 };
  const RISE: UpdraftBox = { ...DRIFT, id: 'rise', kind: 'rise' };

  it('slow a fall to a gentle sink, or turn it into a rise, at their terminal speeds', () => {
    const falling = { ...createPlayer(480, 700), vy: 700 };
    const drift = trace(falling, [FLOOR], 240, () => IDLE, [DRIFT]);
    expect(drift.states[239]!.vy).toBeCloseTo(K.updraft.driftVy, 0);
    const rise = trace(falling, [FLOOR], 240, () => IDLE, [RISE]);
    expect(rise.states[239]!.vy).toBeCloseTo(K.updraft.riseVy, 0);
    expect(rise.states[200]!.y).toBeLessThan(rise.states[100]!.y);
  });

  it('a jump into a column floats higher than the same jump in still air, with normal steering', () => {
    const ledge: PlatformBox = { id: 'l', x: 480, y: 1010, width: 200, height: 20 };
    const column: UpdraftBox = { ...DRIFT, y: 700, height: 600 };
    const charge = Math.ceil(G.jump.maxChargeMs / DT);
    const jump = (i: number): PlayerInput => ({ ...IDLE, jump: i < charge });
    const still = trace(standOn(ledge), [ledge, FLOOR], 500, jump);
    const lifted = trace(standOn(ledge), [ledge, FLOOR], 500, jump, [column]);
    expect(apexAbove(lifted.states, topOf(ledge))).toBeGreaterThan(1.6 * apexAbove(still.states, topOf(ledge)));
    // Longer too: when the plain jump is back on its ledge, the lifted one is still in the air.
    const back = still.states.findIndex((s, i) => i > charge && s.grounded);
    expect(back).toBeGreaterThan(charge);
    expect(lifted.states[back]!.grounded).toBe(false);
  });

  it('leaving the column restores plain gravity at once', () => {
    const column: UpdraftBox = { id: 'c', kind: 'drift', x: 200, y: 600, width: 100, height: 400 };
    // Moving right out of the column at a steady sink.
    const start = { ...createPlayer(240, 600), vy: K.updraft.driftVy, vx: 200, launchVx: 200 };
    const { states } = trace(start, [FLOOR], 40, () => IDLE, [column]);
    const out = states.findIndex((s) => !updraftAt([column], s.x, s.y));
    expect(out).toBeGreaterThan(0);
    const gained = states[out + 2]!.vy - states[out + 1]!.vy;
    expect(gained).toBeCloseTo(G.gravityY * DT / 1000, 5);
    // And the rule itself: a fast fall bleeds toward the terminal speed, a fast rise feels gravity01.
    expect(updraftVy(-500, 'drift', K.updraft, G.gravityY, 0.01)).toBeCloseTo(-500 + G.gravityY * K.updraft.gravity01 * 0.01, 6);
    expect(updraftVy(500, 'drift', K.updraft, G.gravityY, 0.01)).toBeLessThan(500);
  });

  it('do nothing to a candle standing on a ledge inside them', () => {
    const ledge: PlatformBox = { id: 'l', x: 480, y: 610, width: 200, height: 20 };
    const { last } = trace(standOn(ledge), [ledge, FLOOR], 120, () => IDLE, [DRIFT]);
    expect(last.grounded).toBe(true);
    expect(last.platformId).toBe('l');
  });
});
