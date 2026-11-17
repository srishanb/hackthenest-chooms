/**
 * Set-piece tuning for the endless climb. Owner: game lane.
 *
 * A chunk of the endless climb is assembled from set pieces: short runs of ledges with a shape you can
 * recognise (a staircase, a zigzag shaft, a long traverse, a detour down, ...), see
 * src/game/endless/pieces/. This file holds how often each piece is chosen, the chunk it unlocks at,
 * and its own numbers, each with its unit. Nothing here changes gravity, walking or the jump: a piece
 * only chooses WHERE ledges go, and every jump it asks for is replayed with the real physics.
 *
 * Still hard: pieces use the ordinary ledge widths of endless.config.ts (`width`) or narrower, never
 * wider, and the ordinary rise. A piece asks for a different skill, not less of it.
 *
 * Common fields of every piece:
 *   weight      how often it is picked, relative to the others available (no unit)
 *   fromChunk   the first chunk it can appear in (each chunk is about 30 m)
 *   demanding   true for a piece that asks a lot; the next piece after it is always a calm one
 */
export const ENDLESS_PIECES_CONFIG = {
  /** Lay pieces until the next anchor is this close (px); a plain approach ladder climbs the rest onto it. */
  approachPx: 240,
  /**
   * Physics steps the route replays of one chunk's pieces may simulate before the approach ladder takes over
   * (a count, not a time, so a chunk is the same on every machine). About 2,000 steps cost 1 ms here; at
   * 20,000 the slowest chunk of 1,200 took 48 ms (75 without the bound) and pieces per chunk went from 3.32
   * to 3.21. Half of all chunks use under 9,000.
   */
  pieceWorkSteps: 20_000,
  /** Pieces that may fail to fit in one chunk before the approach ladder takes over (bounds the cost). */
  maxPieceFailures: 8,
  /** Candidate ledges tried for one ledge of a piece before the piece gives up. */
  attemptsPerLedge: 18,
  /** Candidate ledges tried for one ledge of the approach ladder before it takes a ledge back. */
  approachAttempts: 20,
  /** Ledges the approach ladder may take back in one try (bounds the worst case). */
  approachBacktracks: 8,
  /** Pieces that may be taken back, last first, when the approach cannot reach the next anchor from where they ended. */
  approachUndoPieces: 2,
  /**
   * Whole tries at one chunk. Each try uses fresh random numbers from (seed, index, try); the last try
   * lays no pieces, only the plain ladder (the generator before set pieces), so a chunk always comes out.
   */
  chunkTries: 3,
  /**
   * A chunk of pieces has more main-path ledges than a plain ladder (traverses and pillar rows gain
   * little height per jump), so the chance of an optional side ledge per main-path ledge, and of wax on
   * a main-path ledge (endless.config.ts `sideLedgeChance`, `pathWaxChance`), is scaled by this. It keeps
   * the number of side ledges, the safety net they make under a miss, and the wax per chunk near what
   * the plain ladder had (measured with tools/endless/chunk-map.ts --compare).
   */
  // Typed as plain numbers so a tool can compare against the plain ladder (scale 1).
  sideLedgeScale: 0.7 as number,
  pathWaxScale: 0.75 as number,
  /** A piece reaches its full weight this many chunks after it unlocks (it fades in, no unit). */
  fadeInChunks: 3,
  /** The plain ladder: a few ordinary jumps, mostly zigzag, sometimes straight up. Breathing room. */
  ladder: { weight: 3, fromChunk: 0, demanding: false, rungs: [2, 3] as const },
  /**
   * Staircase: the same jump again and again in one direction, a rhythm section. One charge level
   * (`levels`, 1..12 of `chargeLevels`) is picked for the whole stair; each step rises by `risePx`.
   */
  staircase: { weight: 2, fromChunk: 0, demanding: false, steps: [4, 6] as const, risePx: [54, 70] as const, levels: [7, 9] as const },
  /**
   * Traverse: a long run sideways across the screen that gains little height, before the path turns
   * up. Each hop rises `risePx` (never lower: a landing below the takeoff would shake the candle) and
   * travels at least `minHopPx` sideways. `minSpanPx` is the least total sideways distance.
   */
  traverse: { weight: 1.2, fromChunk: 1, demanding: false, hops: [3, 4] as const, risePx: [0, 30] as const, minHopPx: 170, minSpanPx: 400 },
  /**
   * Zigzag shaft: up a narrow column of space, from one side of it to the other. The column is
   * `columnPx` wide (between the outer edges of its ledges); ledges are `widthScale` of ordinary width.
   */
  zigzag: { weight: 2, fromChunk: 1, demanding: true, ledges: [4, 6] as const, columnPx: [270, 360] as const, widthScale: 0.8 },
  /**
   * Detour down: the way on is below. Walk off the edge onto a lower ledge (`drops` times), then jump
   * from there to a ledge above the one you started on. Each drop falls `fallPx`; keep the top below
   * the composure fall threshold (60 px) so taking the intended way never shakes the candle.
   * `gainPx` is how far above the start the way up ends.
   */
  detour: { weight: 2, fromChunk: 2, demanding: false, drops: [1, 2] as const, fallPx: [30, 56] as const, gainPx: [40, 96] as const },
  /**
   * Pillar hops: a row of very narrow ledges (`widthPx`, narrower than any ordinary ledge) at nearly
   * one height, where where you land matters. Each hop rises `risePx` and travels at least `minHopPx`.
   */
  pillars: { weight: 2, fromChunk: 3, demanding: true, hops: [3, 4] as const, widthPx: 56, risePx: [-12, 40] as const, minHopPx: 110 },
  /**
   * Big leap: one full-charge jump (charge level at least `minLevel` of 12) across a gap of at least
   * `minGapPx` sideways, from the edge of the ledge, onto a landing as wide as an ordinary ledge gets
   * at that height. Nothing is placed under the gap.
   */
  bigLeap: { weight: 1.5, fromChunk: 3, demanding: true, minLevel: 10, minGapPx: 250, risePx: [-30, 40] as const },
  /**
   * Fork: two ways up that rejoin. The safe way is `safeJumps` ordinary jumps; the risky way is one
   * narrow ledge (`riskyWidthPx`) between two big jumps, and holds a wax drop as its reward.
   * `rejoinPx` is how far above the start the two ways meet.
   */
  fork: { weight: 1.5, fromChunk: 2, demanding: true, safeJumps: [3, 3] as const, riskyWidthPx: 64, rejoinPx: [200, 260] as const },
  /**
   * Ice run, snow bands only: hops between icy ledges (`ice01`, how slippery, 0..1) where each jump
   * goes from the far edge of the ice, so you must walk across it and stop in time.
   */
  iceRun: { weight: 2.5, fromChunk: 3, demanding: true, hops: [3, 4] as const, risePx: [20, 90] as const, ice01: [0.8, 1] as const },
  /**
   * Moving crossing: a sideways crossing that goes over a ledge sliding left and right (`distancePx`
   * either way, once every `periodMs`). It is on the main path, so its landing and takeoff are checked
   * at both ends of its travel. Unlocks with the moving side ledges (endless.config.ts `moving.fromChunk`).
   */
  movingCrossing: { weight: 2, fromChunk: 4, demanding: true, distancePx: [18, 30] as const, periodMs: [4200, 6000] as const, risePx: [0, 50] as const },
  /**
   * The special ledges of Decision D-36 unlock one at a time up the ramp, from these chunks (about 30 m
   * each): bounce caps, then crumbling ledges, then updraft columns. Each piece below needs its kind.
   */
  ledgeKinds: { bounceFromChunk: 5, crumbleFromChunk: 6, updraftFromChunk: 7 },
  /**
   * Time the route keeps in hand on a crumbling ledge (ms): the reaction allowance, then the walk from the
   * landing, then the charge, must fit in the ledge's hold time (game.config.ts `ledgeKinds.crumble.holdMs`,
   * 600 ms) less this, so a person (and the bot, which may stop up to 1.5 px early) has a few frames of slack.
   */
  crumbleMarginMs: 60,
  /**
   * How long a person may take to react to landing on a crumbling ledge before pressing jump (ms). A key held
   * through the landing does nothing (the jump latch), so every step off a crumbling ledge is proved with the
   * candle standing still this long first, then walking, then charging.
   */
  crumbleReactionMs: 250,
  /**
   * A jump through an updraft column, off a bounce cap or off a crumbling ledge must land from every takeoff
   * `takeoffSamplePx` apart across +-`takeoffTolerancePx` of the stored one (px). 0.25 px is the narrowest
   * failing window measured over 2,150 such steps; 2 px covers the bot's 1.5 px and a walking step (1.8 px).
   */
  takeoffTolerancePx: 2,
  takeoffSamplePx: 0.25,
  /** Physics steps a traced flight (`fly`) is followed before it counts as lost (120 per second, so 5 s). */
  flightSteps: 600,
  /** Takeoffs and charges tried for one traced flight (`fly`) before the piece gives up (bounds the cost). */
  flightAttempts: 10,
  /**
   * Mushroom launch: an ordinary jump (charge `levels`, 1..12) down or across onto a bounce cap
   * (`capWidthPx` wide, its top `capRisePx` above the takeoff: negative is lower, at most 50 px so the way down
   * onto it never counts as a fall that shakes the candle, 60 px), whose throw carries the
   * candle to a ledge `risePx` above the takeoff: more than the 217 px a full jump can rise, so the cap is
   * the only way. Nothing is under the gap; a miss falls.
   */
  mushroomLaunch: { weight: 1.6, fromChunk: 5, demanding: true, capWidthPx: [80, 104] as const, capRisePx: [-50, 10] as const,
    risePx: [240, 330] as const, levels: [3, 9] as const },
  /**
   * Crumbling run: `ledges` crumbling ledges in a row, each a small hop (charge `levels`, at most 5 of 12,
   * which fits the hold time after a 250 ms reaction) of `risePx`, at least `minHopPx` sideways. There is no
   * time to wait: each one falls 600 ms after you land on it.
   */
  crumblingRun: { weight: 2.4, fromChunk: 6, demanding: true, ledges: [2, 4] as const, risePx: [-10, 40] as const, levels: [3, 5] as const,
    minHopPx: 60, widthScale: 0.85 },
  /**
   * Updraft rise: a rise column (`widthPx` x `heightPx`) beside the takeoff ledge, `gapPx` from its edge;
   * a short sideways hop (charge `levels`) into it is carried up and drifts out of its far side onto a
   * ledge `risePx` above the takeoff (a plain jump rises 169..217 px at most). Calm: a floaty breather.
   */
  updraftRise: { weight: 1.5, fromChunk: 7, demanding: false, widthPx: [200, 280] as const, heightPx: [320, 460] as const,
    risePx: [180, 320] as const, levels: [3, 7] as const, gapPx: [10, 50] as const },
  /**
   * Updraft crossing: a drift column (`widthPx` x `heightPx`) in the middle of a wide gap; a strong jump
   * (charge `levels`) through it floats across onto a ledge at `risePx`, at least `beyondJumpPx` farther
   * than any ordinary jump reaches at that height (a full jump reaches about 360 px at the same height;
   * through the column it carries 100..150 px further), so only the column crosses it. `gapPx` is the air between the takeoff ledge and
   * the column. Nothing is under it but the climb below.
   */
  updraftCrossing: { weight: 1.4, fromChunk: 8, demanding: true, widthPx: [170, 240] as const, heightPx: [240, 320] as const,
    risePx: [-40, 100] as const, levels: [8, 12] as const, beyondJumpPx: 24, gapPx: [30, 90] as const },
} as const;

export type EndlessPiecesConfig = typeof ENDLESS_PIECES_CONFIG;
