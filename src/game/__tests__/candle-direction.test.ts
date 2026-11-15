/** The candle shows its jump direction through facing, wick, flame and sparks, never by bending the body. */
import { describe, expect, it } from 'vitest';
import { createCandleGenome } from '../candle/candle-genome';
import { bodyShape, INITIAL_POSE, stepPose } from '../candle/candle-pose';
import { type CueInput, flameLean, flightSparks, wickLean } from '../candle/direction-cues';
import { rasterFlame } from '../candle/flame';

const charging = (aim: -1 | 0 | 1, charge01: number): CueInput => ({ charging: true, charge01, aim, grounded: true, vx: 0, vy: 0 });
const flying = (vx: number, vy: number): CueInput => ({ charging: false, charge01: 0, aim: 0, grounded: false, vx, vy });
const genome = createCandleGenome(77);

describe('aiming while charging', () => {
  it('the candle turns to face the held direction', () => {
    const standing = { ...INITIAL_POSE, wasGrounded: true };
    const left = stepPose(standing, { vx: 0, vy: 0, grounded: true, charging: true, aim: -1 }, 16, false);
    expect(left.facingLeft).toBe(true);
    expect(stepPose(left, { vx: 0, vy: 0, grounded: true, charging: true, aim: 1 }, 16, false).facingLeft).toBe(false);
    expect(stepPose(left, { vx: 0, vy: 0, grounded: true, charging: true, aim: 0 }, 16, false).facingLeft).toBe(true);
  });

  it('the flame leans toward the aim, more the longer the charge', () => {
    expect(flameLean(charging(1, 0))).toBe(1);
    expect(flameLean(charging(1, 1))).toBe(3);
    expect(flameLean(charging(-1, 1))).toBe(-3);
    expect(flameLean(charging(0, 1))).toBe(0);
  });

  it('the wick tilts once the charge builds, only with a direction held', () => {
    expect(wickLean(charging(1, 0.1))).toBe(0);
    expect(wickLean(charging(1, 0.5))).toBe(1);
    expect(wickLean(charging(0, 1))).toBe(0);
  });

  it('the body shape is the same whichever way you aim', () => {
    const tracker = { ...INITIAL_POSE, pose: 'charge' as const };
    expect(bodyShape(tracker, 0.8)).toEqual(bodyShape({ ...tracker, facingLeft: true }, 0.8));
  });
});

describe('in flight', () => {
  it('the flame streams behind the movement, at most 3 px', () => {
    expect(flameLean(flying(400, -500))).toBe(-3);
    expect(flameLean(flying(-400, -500))).toBe(3);
    expect(flameLean(flying(0, -700))).toBe(0);
  });

  it('sparks trail opposite to the flight direction', () => {
    for (let frame = 0; frame < 30; frame++) {
      for (const spark of flightSparks(genome, flying(300, -400), frame, false)) expect(spark.x).toBeLessThan(0);
      for (const spark of flightSparks(genome, flying(-300, -400), frame, false)) expect(spark.x).toBeGreaterThan(0);
    }
    const shown = Array.from({ length: 30 }, (_, frame) => flightSparks(genome, flying(300, -400), frame, false).length);
    expect(Math.max(...shown)).toBeGreaterThan(0);
    expect(Math.max(...shown)).toBeLessThanOrEqual(3);
  });

  it('no sparks on the ground, when slow, or with reduced motion', () => {
    expect(flightSparks(genome, { ...flying(300, -400), grounded: true }, 3, false)).toEqual([]);
    expect(flightSparks(genome, flying(50, 40), 3, false)).toEqual([]);
    expect(flightSparks(genome, flying(300, -400), 3, true)).toEqual([]);
  });
});

describe('the drawn flame', () => {
  // Mean x of the top third of the flame, relative to its base row: where the tip points.
  const tipShift = (cue: CueInput): number => {
    const pixels = rasterFlame(genome, { size01: 0.7, timeMs: 0, reducedMotion: true, lean: flameLean(cue) });
    const top = Math.min(...pixels.map((p) => p.y));
    const mean = (rows: typeof pixels) => rows.reduce((sum, p) => sum + p.x, 0) / rows.length;
    return mean(pixels.filter((p) => p.y <= top * (2 / 3))) - mean(pixels.filter((p) => p.y === -1));
  };

  it('points toward the aim while charging', () => {
    expect(tipShift(charging(1, 1))).toBeGreaterThan(1);
    expect(tipShift(charging(-1, 1))).toBeLessThan(-1);
  });

  it('points behind the movement in flight', () => {
    expect(tipShift(flying(360, -420))).toBeLessThan(-1);
    expect(tipShift(flying(-360, -420))).toBeGreaterThan(1);
  });
});
