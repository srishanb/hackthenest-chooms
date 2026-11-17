/**
 * Endless mode tuning. Owner: game lane.
 *
 * Why one file: the generator, the fuel rule and the mood curve must all be tunable without a code
 * edit, and a judge or teammate should be able to read every number with its unit. Nothing here
 * changes gravity, walking or jump strength: the generator only chooses WHERE ledges go.
 */
export const ENDLESS_CONFIG = {
  /** World y (px, grows downward) of the top surface of the ground the run starts on (chunk 0's anchor). */
  baseFloorTopPx: 500,
  /**
   * Height of one chunk in px: an anchor ledge, then generated ledges up to the next chunk's anchor.
   * Only chunk 0's anchor (the ground) spans the screen; nothing else catches a fall (Decision D-33).
   */
  chunkHeightPx: 960,
  /** Thickness of every generated ledge and anchor in px. */
  ledgeHeightPx: 20,
  /**
   * Chunks kept alive below and above the one the player is in, always. With no full-width landings a
   * fall can go through any number of chunks, so the chunk below is never dropped while the player is
   * in this one; the window moves down with a fall, one chunk at a time.
   */
  keepBelow: 1,
  keepAbove: 1,
  /**
   * Each chunk above the ground starts on an anchor: an ordinary main-path ledge at the chunk's known
   * height, placed from the seed alone so any chunk can be rebuilt by itself. `widthScale` times the
   * average main-path width at that height (`width.easyPx`..`width.hardPx`); keep it at 1 or below so
   * an anchor is never wider than an ordinary ledge. `wallMarginPx` is the least gap to a wall (px).
   */
  anchor: { widthScale: 1, wallMarginPx: 2 },
  /** Difficulty reaches 1 after this many chunks (about 30 m each). */
  rampChunks: 14,
  /** Ledge width in px at difficulty 0 and 1; each ledge varies by +/- `widthJitter01`. */
  width: { easyPx: 176, hardPx: 88, minPx: 72, widthJitter01: 0.16 },
  /** Vertical step between ledges in px. The top end grows with difficulty. */
  rise: { minPx: 64, easyMaxPx: 104, hardMaxPx: 148 },
  /** The last ledge of a chunk's path sits this far below the next chunk's anchor (px). */
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
  /**
   * The candle's composure: how shaken it is by the climb, from 0 (steady) to 1 (badly shaken). It stands
   * in for the signal of the EEG game: it feeds the same effects table (forest corruption, tense music, a
   * narrower view), and a shaken candle burns faster. It never changes how the candle moves.
   */
  composure: {
    /**
     * A fall shakes the candle when it lands at least `minPx` below its takeoff: by `min01` there, rising
     * to `max01` for a fall of `fullPx` or more (half a chunk). A fall of two ledges (about 200 px) is
     * enough for the forest to start turning.
     */
    fall: { minPx: 60, fullPx: 480, min01: 0.25, max01: 0.8 },
    /** Standing still on a ledge, not charging, for this long (ms) starts to steady the candle... */
    settleMs: 350,
    /** ...by this much per second while it stays still. A badly shaken candle is steady again in about 2.5 s. */
    steadyPerSecond: 0.42,
    /** On the move the candle still steadies, slowly: this much per second. */
    easePerSecond: 0.035,
    /** A jump that lands no lower than it took off steadies by this much; one wax by `wax01`. */
    cleanLanding01: 0.05,
    wax01: 0.2,
    /** The extra burn starts at this much shaken and reaches `burnScaleMax` times the normal burn at 1. */
    burnFrom01: 0.25,
    burnScaleMax: 1.7,
    /** From this much shaken the candle looks it, and the HUD says how to steady it. */
    shownFrom01: 0.4,
  },
  /**
   * Moving side ledges. From `fromChunk` up, a side ledge slides left and right with this chance (0..1),
   * up to `maxDistancePx` either way (less when the landing spot needs the room), once every
   * `periodMs` (shortest to longest). Side ledges move, and so does the main path in a moving crossing
   * (the moving-crossing piece); every other main-path ledge stands still.
   */
  moving: { fromChunk: 4, chance: 0.55, minDistancePx: 18, maxDistancePx: 60, periodMs: [3400, 5600] as const },
  /**
   * At night a reachable ledge is outlined (LAN-3) when it is higher than the one underfoot or at most this
   * far below it (px). Set pieces put the next route ledge level with or a little lower than the takeoff:
   * the deepest is a detour's drop, 56 px down. The ledges already climbed past are at least 50 px below
   * a staircase step and 64 below a ladder step, so they stay mostly dark.
   */
  outlineLowerReachPx: 60,
  /**
   * Night falls with height: none below `fromChunk`, as dark as it gets (`max01`, 0..1) from `fullChunk`.
   * In the dark the view is the candle's own circle: `radiusEmptyPx` with no fuel, `radiusFullPx` when
   * full. `shadowAlpha` is how dark the unlit part of the screen becomes at full night.
   */
  night: { fromChunk: 1.5, fullChunk: 10, max01: 1, radiusEmptyPx: 130, radiusFullPx: 330, shadowAlpha: 0.93 },
  /**
   * Ice in the snow bands. `chance` is how likely a ledge there is icy (0..1); `min01`..`max01` is how
   * slippery (the game's own ice rule: less grip while walking, the jump itself is unchanged).
   */
  ice: { chance: 0.32, min01: 0.55, max01: 1 },
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
  /** Clean jumps in a row (landings no lower than their takeoff) before the candle starts to hum. */
  flowAfterJumps: 4,
  /** Camera shake after a fall, only when the player turns the setting on. Intensity is a fraction of the view. */
  landingShake: { minFallPx: 120, fullFallPx: 700, maxIntensity: 0.006, durationMs: 140 },
  /** Storage key for the best height in px. */
  bestKey: 'lighten.endless.best-px.v1',
} as const;

export type EndlessConfig = typeof ENDLESS_CONFIG;
