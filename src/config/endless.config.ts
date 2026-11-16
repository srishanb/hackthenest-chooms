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
    /** Seconds a full candle lasts at height 0 and at the end of the difficulty ramp (`rampChunks`). */
    burnSecondsEasy: 80,
    burnSecondsHard: 52,
    /**
     * Past the ramp the candle keeps burning a little faster, down to this many seconds at `lateChunks`.
     * Measured with the route bot: a clean climb takes about 15 s a chunk, so even a perfect run ends one day.
     */
    burnSecondsLate: 34,
    lateChunks: 60,
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
  biome: {
    /** Forest and snow alternate in bands this many chunks tall, starting with forest. */
    chunksPerBand: 3,
    /** The snowfall fades in and out over this height (px) around a snowy band. */
    blendPx: 480,
    /** Snowfall strength (0..1) in the first snowy band, and how much stronger each later one is. */
    firstSnow01: 0.55,
    snowStep01: 0.15,
  },
  /**
   * The last moment of a run: after the wick goes cold the candle slumps and the world goes dark for
   * `ms` before the end screen opens. `veilAlpha` is how dark the world gets (0..1); the candle stays visible.
   */
  ending: { ms: 1700, veilAlpha: 0.88 },
  /** Camera shake after a fall, only when the player turns the setting on. Intensity is a fraction of the view. */
  landingShake: { minFallPx: 120, fullFallPx: 700, maxIntensity: 0.006, durationMs: 140 },
  /** Storage key for the best height in px. */
  bestKey: 'lighten.endless.best-px.v1',
} as const;

export type EndlessConfig = typeof ENDLESS_CONFIG;
