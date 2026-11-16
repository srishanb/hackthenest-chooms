/**
 * Endless mode tuning. Owner: game lane.
 *
 * Why one file: the generator, the fuel rule and the mood curve must all be tunable without a code
 * edit, and a judge or teammate should be able to read every number with its unit. Nothing here
 * changes gravity, walking or jump strength: the generator only chooses WHERE ledges go.
 */
export const ENDLESS_CONFIG = {
  /** World y (px, grows downward) of the top surface of the very first landing. */
  baseFloorTopPx: 500,
  /** Height of one chunk in px: a full-width landing, then generated ledges up to the next landing. */
  chunkHeightPx: 960,
  /** Thickness of every generated ledge and landing in px. */
  ledgeHeightPx: 20,
  /** Chunks kept alive below and above the one the player is in. */
  keepBelow: 1,
  keepAbove: 1,
  /** Difficulty reaches 1 after this many chunks (about 30 m each). */
  rampChunks: 14,
  /** Ledge width in px at difficulty 0 and 1; each ledge varies by +/- `widthJitter01`. */
  width: { easyPx: 176, hardPx: 88, minPx: 72, widthJitter01: 0.16 },
  /** Vertical step between ledges in px. The top end grows with difficulty. */
  rise: { minPx: 64, easyMaxPx: 104, hardMaxPx: 148 },
  /** The last ledge of a chunk sits this far below the next landing (px). */
  finalRise: { minPx: 56, maxPx: 140 },
  /** Jump charges are sampled in this many levels (the same count the reach check uses). */
  chargeLevels: 12,
  /** The generator never relies on charges below this level: small taps are hard to repeat. */
  minChargeLevel: 3,
  /** A sample arc must peak at least this far above the ledge it lands on (px), so it arrives falling. */
  apexClearancePx: 14,
  /** The landing point stays at least this far inside the ledge's edges (px), beyond the body's half width. */
  landingInsetPx: 10,
  /** Ledges that overlap sideways must differ in height by at least this much (px). */
  stackClearancePx: 60,
  /** Sideways gap kept between two ledges at similar heights (px). */
  sideClearancePx: 18,
  /** Chance that a jump goes straight up through the ledge above (0..1). */
  straightUpChance: 0.12,
  /** Chance that a ledge gets an optional side ledge holding wax (0..1). */
  sideLedgeChance: 0.34,
  /** Chance that a ledge on the main path holds wax (0..1). */
  pathWaxChance: 0.16,
  /** Wax hovers this far above the ledge (px between the ledge top and the drop's lowest point). */
  waxHoverPx: 10,
  fuel: {
    /** Seconds a full candle lasts at height 0 and at full difficulty. */
    burnSecondsEasy: 80,
    burnSecondsHard: 52,
    /** Fuel added by one wax, 0..1. */
    waxRefill01: 0.3,
    /** After the fuel reaches 0 the wick still glows this long (ms); wax in that time relights it. */
    graceMs: 4000,
  },
  mood: {
    /** At or above this fuel the world is calm. */
    calmAboveFuel01: 0.5,
    /** Effect intensity (0..1) while calm, and with the flame out. */
    calmIntensity: 0.14,
    peakIntensity: 0.9,
  },
  /** Storage key for the best height in px. */
  bestKey: 'lighten.endless.best-px.v1',
} as const;

export type EndlessConfig = typeof ENDLESS_CONFIG;
