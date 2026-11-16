/** The candle's eyes follow what is near it: wax in reach, the edge of its ledge, ice underfoot. */
import { describe, expect, it } from 'vitest';
import { AWARENESS, surroundings } from '../candle/awareness';
import { faceFor, INITIAL_EXPRESSION, stepExpression, type ExpressionInput } from '../candle/expression';

const WIDTH = 960;
const standing = { x: 400, y: 300, vx: 0, grounded: true };
const ledge = { x: 400, width: 160, type: 'static' };

describe('surroundings', () => {
  it('looks toward the nearest wax in range, and at nothing when it is too far or right on top', () => {
    expect(surroundings(standing, [{ x: 520, y: 180 }], ledge, WIDTH).look).toEqual({ x: 1, y: -1, peek: false });
    expect(surroundings(standing, [{ x: 280, y: 300 }], ledge, WIDTH).look).toEqual({ x: -1, y: 0, peek: false });
    expect(surroundings(standing, [{ x: 400 + AWARENESS.waxRangePx + 50, y: 300 }], ledge, WIDTH).look).toBeNull();
    expect(surroundings(standing, [{ x: 405, y: 296 }], ledge, WIDTH).look).toBeNull();
    // Two drops: the nearer one wins.
    expect(surroundings(standing, [{ x: 100, y: 300 }, { x: 480, y: 300 }], ledge, WIDTH).look?.x).toBe(1);
  });

  it('peers over the edge of a ledge when it stands at one, but never off a full-width landing or in the air', () => {
    const atLeftEdge = { ...standing, x: ledge.x - ledge.width / 2 + 6 };
    expect(surroundings(atLeftEdge, [], ledge, WIDTH).look).toEqual({ x: -1, y: 1, peek: true });
    expect(surroundings({ ...standing, x: ledge.x + ledge.width / 2 - 6 }, [], ledge, WIDTH).look).toEqual({ x: 1, y: 1, peek: true });
    expect(surroundings(standing, [], ledge, WIDTH).look).toBeNull();
    expect(surroundings({ ...standing, x: 6 }, [], { x: WIDTH / 2, width: WIDTH }, WIDTH).look).toBeNull();
    expect(surroundings({ ...atLeftEdge, grounded: false }, [], ledge, WIDTH).look).toBeNull();
    // Wax nearby beats the edge.
    expect(surroundings(atLeftEdge, [{ x: 500, y: 200 }], ledge, WIDTH).look?.peek).toBe(false);
  });

  it('is sliding only on ice, on the ground and moving', () => {
    const ice = { ...ledge, type: 'slippery' };
    expect(surroundings({ ...standing, vx: 120 }, [], ice, WIDTH).sliding).toBe(true);
    expect(surroundings({ ...standing, vx: 5 }, [], ice, WIDTH).sliding).toBe(false);
    expect(surroundings({ ...standing, vx: 120 }, [], ledge, WIDTH).sliding).toBe(false);
    expect(surroundings({ ...standing, vx: 120, grounded: false }, [], ice, WIDTH).sliding).toBe(false);
    expect(surroundings({ ...standing, vx: 120 }, [], undefined, WIDTH).sliding).toBe(false);
  });
});

describe('the face uses it', () => {
  const calm: ExpressionInput = { pose: 'idle', charge01: 0, fall01: 0, aim: 0, facingLeft: false, fuel01: 1, lit: true, reducedMotion: true };
  const face = (input: Partial<ExpressionInput>) => faceFor(INITIAL_EXPRESSION, { ...calm, ...input }, 5);

  it('eyes turn toward wax, mirrored correctly when the candle faces left', () => {
    const right = { x: 1 as const, y: -1 as const, peek: false };
    expect(face({ look: right })).toMatchObject({ gazeX: 1, gazeY: -1, mouth: 'smile' });
    expect(face({ look: right, facingLeft: true })).toMatchObject({ gazeX: -1, gazeY: -1 });
    // Not while charging: the charge has its own look.
    expect(face({ look: right, pose: 'charge' }).gazeY).toBe(0);
  });

  it('peering over an edge looks down with a small mouth', () => {
    expect(face({ look: { x: -1, y: 1, peek: true } })).toMatchObject({ gazeY: 1, mouth: 'small' });
  });

  it('sliding on ice is its own uneasy mood, below a fall and above low-fuel worry', () => {
    const mood = (input: Partial<ExpressionInput>) => stepExpression(INITIAL_EXPRESSION, { ...calm, ...input }, {}, 16, false).mood;
    expect(mood({ pose: 'run', sliding: true })).toBe('uneasy');
    expect(mood({ pose: 'run', sliding: true, fuel01: 0.1 })).toBe('uneasy');
    expect(mood({ pose: 'fall', fall01: 0.9, sliding: true })).toBe('alarmed');
    expect(faceFor({ ...INITIAL_EXPRESSION, mood: 'uneasy' }, calm, 5)).toMatchObject({ eyes: 'wide', mouth: 'wobble', sweat: true });
  });
});
