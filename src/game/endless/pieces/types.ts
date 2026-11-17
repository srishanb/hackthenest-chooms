/**
 * The shapes shared by the set pieces of the endless climb: a piece, the kit it builds with, and the
 * run of ledges it lays down.
 *
 * A piece is a small generator: given the kit (seeded random numbers, the real jump arcs, the checks)
 * and an entry ledge, it lays a short run of ledges with a recognisable shape and the route through
 * them. The generator strings pieces together from a chunk's anchor towards the next anchor
 * (generator.ts). A piece never checks reachability itself: the kit only accepts a ledge whose jump
 * (or drop) has been replayed with `stepPlayer` against everything placed so far.
 *
 * Adding a piece later (new ledge kinds, a wall jump): write one file that exports a `Piece`, add a
 * line to registry.ts with its weight, unlock chunk and the features it needs, and, if it needs a new
 * feature, add the feature's name to `PieceFeature` and say in features.ts where it is available.
 */
import type { GameConfig } from '../../../shared/contracts/config';
import type { PlatformData, UpdraftData } from '../../../shared/contracts/content';
import type { EndlessConfig } from '../../../config/endless.config';
import type { EndlessPiecesConfig } from '../../../config/endless-pieces.config';
import type { RouteStep } from '../route-replay';

/**
 * Something a piece may need that is not available everywhere in the climb. `snow`: the chunk is in a
 * snow band (ice is allowed). `moving`: sliding ledges have unlocked. `bounce`, `crumble`, `updraft`:
 * bounce caps, crumbling ledges and updraft columns have unlocked (Decision D-36). Later tasks add their
 * own (for example walls for a wall jump).
 */
export type PieceFeature = 'snow' | 'moving' | 'bounce' | 'crumble' | 'updraft';

/** A ledge laid by a piece, with the step that reaches it and where that step lands (world x). */
export interface Candidate {
  ledge: PlatformData;
  step: RouteStep;
  landingX: number;
  /** Highest point of the step's feet (world y), or the takeoff height for a drop. */
  apexTopPx: number;
}

/** What a piece asks of one jump. Ranges are [least, most]. */
export interface JumpSpec {
  /** Height of the new ledge's top above the takeoff ledge's top (px). Negative is lower. */
  risePx: readonly [number, number];
  direction: -1 | 0 | 1;
  /** Width of the new ledge (px). */
  widthPx: number;
  /** Charge levels allowed (1..`chargeLevels`). Default: `minChargeLevel` and up. */
  levels?: readonly [number, number];
  /** Where on the takeoff ledge to stand: anywhere, or near the edge it jumps toward (`front`). */
  takeoff?: 'any' | 'front';
  /** Only when the new ledge's centre can be in this range (world x). */
  centreX?: readonly [number, number];
  /** The jump must travel at least this far sideways (px). */
  minDxPx?: number;
  /** How far (0..1 of the room there is) the ledge may sit off-centre from the landing point. Default 1. */
  jitter01?: number;
  /** Id kind: 'p' for the main path (default), 'a' for an alternative branch. */
  kind?: 'p' | 'a';
}

/** What a piece asks of one drop: walk off the edge toward `direction` and land `fallPx` below. */
export interface DropSpec {
  fallPx: readonly [number, number];
  direction: -1 | 1;
  widthPx: number;
}

/** The ledges and steps one piece has laid so far. Discarded whole if the piece cannot be completed. */
export interface PieceRun {
  /** Every ledge the piece placed (main path and alternative branches). */
  ledges: PlatformData[];
  /** The main path through the piece, in order: the first starts on the entry ledge. */
  steps: RouteStep[];
  /** Steps of alternative branches (a fork's other way). Optional for the player, checked like the rest. */
  altSteps: RouteStep[];
  /** Ledge ids that should hold wax, whatever the chance (a reward for a risky branch). */
  waxOn: string[];
  /** Updraft columns the piece placed. Every step of the chunk is replayed through them. */
  updrafts: UpdraftData[];
}

/**
 * What a piece asks of a flight it traces (`fly`): a jump from `from` with these settings is replayed
 * through everything placed (bounce caps, updraft columns), and a new ledge is put where the flight comes
 * down at a height in `risePx`, after it has bounced on `via` and/or ridden out of `ride`.
 */
export interface FlightSpec {
  /** Height of the new ledge's top above the takeoff ledge's top (px). */
  risePx: readonly [number, number];
  direction: -1 | 0 | 1;
  widthPx: number;
  /** Charge levels allowed (1..`chargeLevels`). */
  levels: readonly [number, number];
  takeoff?: 'any' | 'front';
  /** The landing must be at least this far sideways from the takeoff (px). */
  minDxPx?: number;
  /** The landing must be this much farther sideways (px) than any ordinary jump reaches at that height. */
  beyondJumpPx?: number;
  /** The flight must come down on this bounce cap first (its id; the cap must already be in the run). */
  via?: string;
  /** The flight must have been inside this column and left it before it lands. */
  ride?: string;
  /** How far (0..1 of the room) the ledge may sit off-centre from the landing point. Default 0.6. */
  jitter01?: number;
}

/** The tools a piece builds with. One kit per chunk try; everything random comes from `random`. */
export interface PieceKit {
  readonly random: () => number;
  readonly index: number;
  /** 0 at the start of the climb, 1 at the end of the difficulty ramp. */
  readonly difficulty: number;
  readonly features: ReadonlySet<PieceFeature>;
  readonly game: GameConfig;
  readonly config: EndlessConfig;
  readonly tuning: EndlessPiecesConfig;
  readonly worldWidth: number;
  /** The tallest ordinary rise at this height (px). */
  readonly maxRisePx: number;
  /** No ledge of a piece may have its top above this (world y): it leaves room for the jump onto the next anchor. */
  readonly ceilingTopPx: number;
  /** No ledge of a piece may have its top below this (world y): keeps clear of the chunk below. */
  readonly floorTopPx: number;
  /** A random number in [a, b]. */
  between(range: readonly [number, number]): number;
  /** A whole number in [a, b]. */
  count(range: readonly [number, number]): number;
  /** One ordinary ledge width at this height (px), scaled by `scale` (keep it at 1 or below). */
  ledgeWidth(scale?: number): number;
  /** The widest ordinary ledge at this height (px): the mean width at the top of its jitter. */
  widestWidth(): number;
  /** One random try at a jump from `from` (geometry only; not yet checked or kept). */
  jump(run: PieceRun, from: PlatformData, spec: JumpSpec): Candidate | null;
  /** One random try at a drop from `from` (geometry only). */
  drop(run: PieceRun, from: PlatformData, spec: DropSpec): Candidate | null;
  /**
   * Keep `candidate` if it fits: inside the walls and the chunk, clear of every other ledge, and every
   * step of the chunk so far (with this one) replays onto its own ledge. `alt` keeps its step as part
   * of an alternative branch. Returns true when kept (the ledge and step are added to `run`).
   */
  accept(run: PieceRun, candidate: Candidate, alt?: boolean): boolean;
  /** Try `spec()` up to the configured number of times; the ledge kept, or null. */
  place(run: PieceRun, from: PlatformData, spec: () => JumpSpec, alt?: boolean): PlatformData | null;
  /** Try a drop up to the configured number of times; the ledge kept, or null. */
  placeDrop(run: PieceRun, from: PlatformData, spec: () => DropSpec): PlatformData | null;
  /** A replayed jump from `from` onto `target` (both already placed), added to `run`; false when none fits. */
  link(run: PieceRun, from: PlatformData, target: PlatformData, alt?: boolean): boolean;
  /** Turn a kept ledge into one that slides left and right, if its steps still hold everywhere in its travel. */
  makeMoving(run: PieceRun, ledge: PlatformData, distancePx: number, periodMs: number): PlatformData | null;
  /**
   * Turn a kept ledge that no step leaves yet into a crumbling one. Every later step from it is then held
   * to the crumble time: the walk from where the candle lands plus the charge must fit in `holdMs` less
   * the margin, and the replay runs the crumble timer (route-replay.ts).
   */
  makeCrumbling(run: PieceRun, ledge: PlatformData): PlatformData | null;
  /**
   * A bounce cap reached by an ordinary jump from `from` (`spec`, the cap's rise and width), kept in the run
   * if it fits and catches no earlier step. Returns the cap and the jump onto it (for `fly` to continue).
   */
  placeCap(run: PieceRun, from: PlatformData, spec: JumpSpec): { cap: PlatformData; step: RouteStep } | null;
  /** The updraft columns already kept in this chunk by earlier pieces. */
  columns(): UpdraftData[];
  /** Keep an updraft column if it fits in the chunk and every step so far still lands through it. */
  addColumn(run: PieceRun, column: UpdraftData): boolean;
  /**
   * Trace a jump through everything placed and keep a new ledge where it comes down (see `FlightSpec`).
   * `fixed` pins the takeoff and charge (a jump already aimed at a cap). Tries up to the configured number.
   */
  fly(run: PieceRun, from: PlatformData, spec: FlightSpec, fixed?: RouteStep): PlatformData | null;
}

/** A set piece. `build` lays its ledges into `run` starting from `entry`; false when it cannot be completed. */
export interface Piece {
  /** Short stable name, used in the registry, the chunk's piece list and the dev tool. */
  readonly id: string;
  /** One line for people: what the shape is. */
  readonly label: string;
  build(kit: PieceKit, entry: PlatformData, run: PieceRun): boolean;
}
