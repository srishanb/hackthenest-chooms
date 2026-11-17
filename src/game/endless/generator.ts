/**
 * The endless generator: builds one chunk of the climb from a seed and a chunk number.
 *
 * A chunk runs from its anchor ledge to the next chunk's anchor. Only chunk 0's anchor, the ground the
 * run starts on, spans the whole width; every later anchor is an ordinary-width ledge (Decision D-33).
 * In between, the chunk is assembled from set pieces (pieces/, Decision D-35): short runs of ledges
 * with a shape you can recognise, a staircase, a zigzag shaft, a traverse, a detour down, pillar hops,
 * a big leap, a fork, an ice run, a moving crossing, or a plain ladder. pieces/pacing.ts picks them by
 * the seed. When the next anchor is close (`approachPx`), a plain approach ladder climbs the rest and
 * its last jump lands on the next anchor.
 *
 * Four rules make it safe to run unattended:
 *   1. Random access. A chunk depends only on (seed, index), never on its neighbours, because every
 *      anchor sits at a known height and its position and width come from (seed, index) alone
 *      (`floor`). A chunk below can be rebuilt after a fall and comes out identical.
 *   2. Reachable by construction. Each ledge is placed under a real jump arc (jump-arcs.ts) or a real
 *      walk-off fall, and every step of the route is then replayed with `stepPlayer` against
 *      everything placed (route-replay.ts); a ledge the replay does not land on is never kept. A jump's
 *      feet never rise to where a ledge of the next chunk could be, so the next chunk cannot catch it.
 *   3. It always ends. A piece that cannot be completed is thrown away and another is tried, a bounded
 *      number of times. If the approach cannot reach the anchor, the whole chunk is tried again with
 *      fresh numbers from (seed, index, try); the last try is the plain ladder alone.
 *   4. Falls are not bounded. Nothing catches a missed jump but a ledge below or the ground, so a
 *      mistake costs as much height as it costs (in the spirit of Bennett Foddy's climbs). The chunk
 *      stream keeps the chunks below the candle loaded while it falls (chunk-stream.ts).
 *
 * Side ledges hold wax and are optional: they are reachable from the main path, but getting back
 * may mean dropping down. Nothing here reads the signal or changes how the candle moves.
 */
import type { GameConfig } from '../../shared/contracts/config';
import type { PlatformData, UpdraftData } from '../../shared/contracts/content';
import { BOUNCE_TYPE } from '../player/bounce';
import { CRUMBLING_TYPE } from '../player/crumble';
import type { EndlessConfig } from '../../config/endless.config';
import { ENDLESS_PIECES_CONFIG, type EndlessPiecesConfig } from '../../config/endless-pieces.config';
import { seededRandom } from '../candle/candle-genome';
import { biomeOf } from './biome';
import { buildArcTable } from './jump-arcs';
import { featuresAt } from './pieces/features';
import { apexLimitTop, createPieceKit, emptyRun, keepsClear, traceDrop, type Committed, type GeneratorKit } from './pieces/kit';
import { choosePiece } from './pieces/pacing';
import { PIECES, type PieceEntry } from './pieces/registry';
import { lastLedge } from './pieces/shared';
import type { Candidate, PieceRun } from './pieces/types';
import { replayStep, stepsHold, type RouteStep } from './route-replay';

export { replayStep, stepsHold } from './route-replay';
export type { RouteStep } from './route-replay';

export interface WaxSpot {
  id: string;
  /** Centre of the drop in world px. */
  x: number;
  y: number;
  /** Set when the drop sits on a moving ledge: the ledge's id and its resting centre, so the drop can ride along. */
  ledgeId?: string;
  ledgeX?: number;
}

/** One set piece as it was laid in a chunk, for the tests and the dev tool (tools/endless/chunk-map.ts). */
export interface PieceSpan {
  /** The piece's id from pieces/registry.ts, or 'approach' for the closing ladder onto the next anchor. */
  id: string;
  entryId: string;
  exitId: string;
  /** Its main-path steps are `route[firstStep]` .. `route[firstStep + stepCount - 1]`. */
  firstStep: number;
  stepCount: number;
  /** Every ledge it laid (main path and alternative branches). */
  ledgeIds: string[];
  /** Steps of its alternative branch (a fork's risky way), also in the chunk's `altRoute`. */
  altSteps: RouteStep[];
  /** Ids of the updraft columns it placed. */
  updraftIds: string[];
}

export interface EndlessChunk {
  index: number;
  /** Top surface of this chunk's anchor ledge (world y, px). */
  floorTopPx: number;
  /** The anchor first, then the main path in route order, then alternative-branch ledges, then side ledges. */
  platforms: PlatformData[];
  wax: WaxSpot[];
  /** Steps (jumps and drops) from this chunk's anchor to the next chunk's anchor. */
  route: RouteStep[];
  /** Alternative branches that leave the main path and rejoin it (a fork's other way). */
  altRoute: RouteStep[];
  /** The jump that reaches each optional side ledge, from a ledge of the main path. */
  sideRoute: RouteStep[];
  /** The set pieces of this chunk, from the anchor up, ending with the approach. */
  pieces: PieceSpan[];
  /** Updraft columns (Decision D-36). Every stored step is replayed through them. */
  updrafts: UpdraftData[];
}

export interface EndlessGenerator {
  chunk(index: number): EndlessChunk;
  floorTopPx(index: number): number;
  /**
   * The anchor of any chunk, without generating the rest of it: the ledge the chunk starts on. Chunk 0's
   * is the full-width ground; every later one is an ordinary-width ledge. Its id ends in `:floor`.
   */
  floor(index: number): PlatformData;
}

/** Mixed into the seed for anchors, so an anchor's place does not share the chunk's own random numbers. */
const ANCHOR_SALT = 0x5bd1e995;
/** Mixed into the seed for a second or later try at a chunk. */
const TRY_SALT = 0x27d4eb2f;

const topOf = (platform: { y: number; height: number }): number => platform.y - platform.height / 2;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Mix the run seed with the chunk number so neighbouring chunks are unrelated. */
function chunkSeed(seed: number, index: number): number {
  let h = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}

/** 0 at the start, 1 once the ramp is over. */
export function difficultyAt(index: number, config: EndlessConfig): number {
  return Math.min(1, Math.max(0, index / config.rampChunks));
}

interface Assembled {
  kit: GeneratorKit;
  committed: Committed;
  spans: PieceSpan[];
  waxOn: string[];
}

export function createEndlessGenerator(seed: number, gameConfig: GameConfig, config: EndlessConfig,
  tuning: EndlessPiecesConfig = ENDLESS_PIECES_CONFIG, pieces: readonly PieceEntry[] = PIECES): EndlessGenerator {
  const arcs = buildArcTable(gameConfig, config.chargeLevels);
  const dropTrace = traceDrop(gameConfig, config.chunkHeightPx);
  const worldWidth = gameConfig.view.width;
  const body = gameConfig.player;
  const cache = new Map<number, EndlessChunk>();

  const floorTopPx = (index: number): number => config.baseFloorTopPx - index * config.chunkHeightPx;
  /** The anchor of chunk `index`, from (seed, index) only. Firm: never moving, never icy. */
  const floor = (index: number): PlatformData => {
    const y = floorTopPx(index) + config.ledgeHeightPx / 2;
    if (index === 0) return { id: 'e0:floor', x: worldWidth / 2, y, width: worldWidth, height: config.ledgeHeightPx, type: 'static' };
    const random = seededRandom(chunkSeed(seed ^ ANCHOR_SALT, index));
    const mean = lerp(config.width.easyPx, config.width.hardPx, difficultyAt(index, config));
    const width = Math.round(Math.max(config.width.minPx, mean * config.anchor.widthScale));
    const margin = width / 2 + config.anchor.wallMarginPx;
    const x = Math.round(lerp(margin, worldWidth - margin, random()));
    return { id: `e${index}:floor`, x, y, width, height: config.ledgeHeightPx, type: 'static' };
  };

  /** The ledge the main path has reached. */
  const current = (committed: Committed): PlatformData => {
    const step = committed.steps.at(-1);
    return step ? committed.ledges.find((ledge) => ledge.id === step.toId)! : committed.ledges[0]!;
  };

  /** Keep a finished run in the chunk, and note it as a piece. */
  function commit(assembled: Assembled, id: string, entry: PlatformData, run: PieceRun): void {
    const { committed } = assembled;
    assembled.spans.push({ id, entryId: entry.id, exitId: run.steps.at(-1)!.toId, firstStep: committed.steps.length,
      stepCount: run.steps.length, ledgeIds: run.ledges.map((ledge) => ledge.id), altSteps: run.altSteps,
      updraftIds: run.updrafts.map((column) => column.id) });
    committed.ledges.push(...run.ledges);
    committed.updrafts.push(...run.updrafts);
    committed.steps.push(...run.steps);
    committed.altSteps.push(...run.altSteps);
    assembled.waxOn.push(...run.waxOn);
  }

  /**
   * The approach: ordinary jumps up from where the pieces ended until the next anchor is one jump away,
   * and that jump has been found and replayed. Leans toward the anchor near the top, since it is an
   * ordinary ledge, not a full-width landing. False when it cannot get there.
   */
  function approach(assembled: Assembled, nextFloor: PlatformData): boolean {
    const { kit, committed } = assembled;
    const start = current(committed);
    const run = emptyRun();
    const nextTop = topOf(nextFloor);
    let heading: -1 | 1 = kit.random() < 0.5 ? -1 : 1;
    let backtracks = 0;
    let done = topOf(start) - nextTop <= config.finalRise.maxPx && kit.link(run, start, nextFloor);
    for (let guard = 0; guard < 200 && !done; guard++) {
      const from = lastLedge(run, start);
      const remaining = topOf(from) - nextTop;
      const nearTop = remaining <= 2 * kit.maxRisePx + config.finalRise.maxPx;
      const toward: -1 | 1 = nextFloor.x >= from.x ? 1 : -1;
      let placed = false;
      for (let attempt = 0; attempt < tuning.approachAttempts && !placed; attempt++) {
        // Never leave less than a real jump to the next anchor.
        const top = Math.min(kit.maxRisePx, remaining - config.finalRise.minPx);
        const risePx = Math.round(lerp(config.rise.minPx, Math.max(config.rise.minPx, top), kit.random()));
        // Mostly zig-zag; sometimes keep going the same way, sometimes straight up.
        const roll = kit.random();
        const direction: -1 | 0 | 1 = from !== committed.ledges[0] && roll < config.straightUpChance ? 0
          : nearTop ? (roll < 0.8 ? toward : (-toward as -1 | 1))
            : roll < 0.75 ? (-heading as -1 | 1) : heading;
        const candidate = kit.jump(run, from, { risePx: [risePx, risePx], direction, widthPx: kit.ledgeWidth() });
        if (!candidate || !kit.accept(run, candidate)) continue;
        // The last ledge of the path must have a real jump onto the next anchor.
        if (topOf(candidate.ledge) - nextTop <= config.finalRise.maxPx) {
          if (!kit.link(run, candidate.ledge, nextFloor)) { kit.takeBack(run); continue; }
          done = true;
        }
        placed = true;
        if (direction !== 0) heading = direction;
      }
      if (placed) continue;
      // A dead end: the path wandered out of reach of the anchor. Take back one ledge and try again.
      if (run.ledges.length && backtracks++ < tuning.approachBacktracks) { kit.takeBack(run); continue; }
      return false;
    }
    if (!done) return false;
    commit(assembled, 'approach', start, run);
    return true;
  }

  /** One try at a chunk's main path: pieces (unless `usePieces` is false), then the approach. Null when it fails. */
  function assemble(index: number, attempt: number, usePieces: boolean): Assembled | null {
    const random = seededRandom(attempt === 0 ? chunkSeed(seed, index) : chunkSeed((seed ^ Math.imul(TRY_SALT, attempt)) >>> 0, index));
    const base = floor(index);
    const nextFloor = floor(index + 1);
    const committed: Committed = { ledges: [base], steps: [], altSteps: [], updrafts: [] };
    const features = featuresAt(index, config, tuning);
    const kit = createPieceKit({ random, index, difficulty: difficultyAt(index, config), features, game: gameConfig, config, tuning,
      arcs, dropTrace, committed, floorTopPx: floorTopPx(index), nextFloor });
    const assembled: Assembled = { kit, committed, spans: [], waxOn: [] };
    let previous: PieceEntry | null = null;
    let excluded = new Set<string>();
    let failures = 0;
    while (usePieces && failures < tuning.maxPieceFailures) {
      const entry = current(committed);
      if (topOf(entry) - topOf(nextFloor) <= tuning.approachPx) break;
      const choice = choosePiece(pieces, index, features, { previous, excluded }, tuning, random);
      if (!choice) break;
      const run = emptyRun();
      if (choice.piece.build(kit, entry, run) && run.steps.length && run.steps[0]!.fromId === entry.id) {
        commit(assembled, choice.piece.id, entry, run);
        previous = choice;
        excluded = new Set();
      } else {
        failures++;
        excluded = new Set([...excluded, choice.piece.id]);
      }
    }
    // If the approach cannot reach the anchor from where the pieces ended, take the last piece back and try again.
    for (let undo = 0; undo <= tuning.approachUndoPieces; undo++) {
      if (approach(assembled, nextFloor)) return assembled;
      const last = assembled.spans.pop();
      if (!last) return null;
      committed.ledges.length -= last.ledgeIds.length;
      committed.steps.length = last.firstStep;
      committed.altSteps.length -= last.altSteps.length;
      committed.updrafts.length -= last.updraftIds.length;
      assembled.waxOn = assembled.waxOn.filter((id) => !last.ledgeIds.includes(id));
    }
    return null;
  }

  /** Wax, optional side ledges and ice on a finished main path. */
  function finish(index: number, assembled: Assembled): EndlessChunk {
    const { kit, committed, spans, waxOn } = assembled;
    const random = kit.random;
    const base = committed.ledges[0]!;
    const nextFloor = floor(index + 1);
    const nextTop = topOf(nextFloor);
    const route = committed.steps;
    const altRoute = committed.altSteps;
    const byId = new Map(committed.ledges.map((ledge) => [ledge.id, ledge]));
    const main = [base, ...route.slice(0, -1).map((step) => byId.get(step.toId)!)];
    const onMain = new Set(main.map((ledge) => ledge.id));
    // Bounce caps are never stood on: no wax, no ice, no side ledges from them.
    const alt = committed.ledges.filter((ledge) => !onMain.has(ledge.id) && ledge.type !== BOUNCE_TYPE);
    const caps = committed.ledges.filter((ledge) => ledge.type === BOUNCE_TYPE);
    const columns = committed.updrafts;
    const pathSteps = [...route, ...altRoute];
    const apexLimit = apexLimitTop(nextFloor, config);

    // Optional side ledges with wax. Each must be reachable, and must not catch a path jump or an earlier side jump.
    const sides: PlatformData[] = [];
    const sideRoute: RouteStep[] = [];
    const wax: WaxSpot[] = [];
    const waxAbove = (platform: PlatformData, id: string): WaxSpot => {
      const spot = { id, x: platform.x, y: topOf(platform) - config.waxHoverPx - body.height / 2 };
      return platform.motion ? { ...spot, ledgeId: platform.id, ledgeX: platform.x } : spot;
    };
    const ledgesWith = (extra: PlatformData): PlatformData[] => [...committed.ledges, ...sides, extra, nextFloor];
    const affected = (ledge: PlatformData): RouteStep[] => kit.affected(pathSteps, ledge, [...committed.ledges, nextFloor], columns);
    /** Each earlier side jump still lands on its own ledge with `extra` added, wherever a moving one is in its travel. */
    const sideJumpsHold = (extra: PlatformData): boolean => {
      const all = ledgesWith(extra);
      return sideRoute.every((step, k) => {
        const own = sides[k]!;
        const distance = own.motion?.distance ?? 0;
        return (distance ? [-distance, 0, distance] : [0]).every((offset) => replayStep(step,
          all.map((p) => (p.id === own.id ? { ...p, x: p.x + offset } : p)), worldWidth, gameConfig, 0, false, columns) === step.toId);
      });
    };
    /**
     * Turn a side ledge into one that slides left and right, if there is room. It may move only as far
     * as the landing spot of its jump stays on it, so the jump lands whenever it is made. At both ends
     * and in between it must stay clear of the walls and other ledges, still catch its own jump, and
     * never catch a jump of the path. Returns null when it should stay still.
     */
    const moving = (candidate: Candidate): PlatformData | null => {
      if (index < config.moving.fromChunk || random() >= config.moving.chance) return null;
      const { ledge, step, landingX } = candidate;
      const room = ledge.width / 2 - body.width / 2 - 4 - Math.abs(ledge.x - landingX);
      const walls = Math.min(ledge.x - ledge.width / 2, worldWidth - ledge.x - ledge.width / 2) - 2;
      const distance = Math.floor(Math.min(config.moving.maxDistancePx, room, walls));
      if (distance < config.moving.minDistancePx) return null;
      const others = [...committed.ledges, ...sides];
      for (const offset of [-distance, -distance / 2, distance / 2, distance]) {
        const shifted = { ...ledge, x: ledge.x + offset };
        if (!keepsClear(shifted, others, config)) return null;
        const all = [...others, shifted, nextFloor];
        if (replayStep(step, all, worldWidth, gameConfig, 0, false, columns) !== ledge.id) return null;
        if (!stepsHold(kit.affected(pathSteps, shifted, [...committed.ledges, nextFloor], columns), all, worldWidth, gameConfig, columns)) return null;
        if (!sideJumpsHold(shifted)) return null;
      }
      const periodMs = Math.round(lerp(config.moving.periodMs[0], config.moving.periodMs[1], random()));
      return { ...ledge, type: 'moving', motion: { axis: 'x', distance, periodMs } };
    };
    const sideRun = emptyRun();
    for (let i = 1; i < main.length; i++) {
      const from = main[i]!;
      if (random() < config.pathWaxChance * tuning.pathWaxScale) wax.push(waxAbove(from, `e${index}:wax-p${i}`));
      // Never from a moving or crumbling ledge (a side jump is not held to the crumble time).
      if (from.motion || from.type === CRUMBLING_TYPE || random() >= config.sideLedgeChance * tuning.sideLedgeScale) continue;
      const mainDirection = route[i]?.direction ?? 0;
      for (let attempt = 0; attempt < 12; attempt++) {
        const direction: -1 | 1 = mainDirection !== 0 ? (-mainDirection as -1 | 1) : random() < 0.5 ? -1 : 1;
        const risePx = Math.round(lerp(config.rise.minPx * 0.7, kit.maxRisePx * 0.85, random()));
        const id = `e${index}:s${i}`;
        const raw = kit.jump(sideRun, from, { risePx: [risePx, risePx], direction, widthPx: Math.max(config.width.minPx, kit.ledgeWidth() * 0.75) });
        if (!raw || raw.apexTopPx < apexLimit) continue;
        const candidate: Candidate = { ...raw, ledge: { ...raw.ledge, id }, step: { ...raw.step, toId: id } };
        if (topOf(candidate.ledge) < nextTop + config.stackClearancePx) continue;
        if (!keepsClear(candidate.ledge, [...committed.ledges, ...sides], config)) continue;
        const all = ledgesWith(candidate.ledge);
        if (replayStep(candidate.step, all, worldWidth, gameConfig, 0, false, columns) !== id
          || !stepsHold(affected(candidate.ledge), all, worldWidth, gameConfig, columns)
          || !sideJumpsHold(candidate.ledge)) continue;
        const ledge = moving(candidate) ?? candidate.ledge;
        sides.push(ledge);
        sideRoute.push(candidate.step);
        wax.push(waxAbove(ledge, `e${index}:wax-s${i}`));
        break;
      }
    }
    // Wax on alternative branches: always where a piece asks for it (a reward for risk), else by chance.
    for (const ledge of alt) {
      if (waxOn.includes(ledge.id) || random() < config.pathWaxChance) wax.push(waxAbove(ledge, `e${index}:wax-${ledge.id.split(':')[1]}`));
    }
    // A chunk never goes without wax: the fuel rule assumes at least one per chunk.
    if (!wax.length && main.length > 1) {
      const holder = main[1 + Math.floor(random() * (main.length - 1))]!;
      wax.push(waxAbove(holder, `e${index}:wax-p`));
    }
    // Ice, in the snow bands only. It changes how walking feels on a ledge, not a jump from it, so every
    // stored jump still lands where it says (the tests replay them). Anchors stay firm, and a ledge you
    // walk off (a drop) is never icy, since walking is the step.
    const dropFrom = new Set(pathSteps.filter((step) => step.kind === 'drop').map((step) => step.fromId));
    const iced = (ledge: PlatformData): PlatformData => {
      if (ledge.motion || (ledge.type !== undefined && ledge.type !== 'static') || dropFrom.has(ledge.id)) return ledge;
      if (biomeOf(index, config) !== 'snow' || random() >= config.ice.chance) return ledge;
      const ice01 = Math.round(lerp(config.ice.min01, config.ice.max01, random()) * 100) / 100;
      return { ...ledge, type: 'slippery', ice01 };
    };
    const platforms = [base, ...main.slice(1).map(iced), ...alt.map(iced), ...caps, ...sides.map(iced)];
    return { index, floorTopPx: floorTopPx(index), platforms, wax, route, altRoute, sideRoute, pieces: spans, updrafts: [...columns] };
  }

  function build(index: number): EndlessChunk {
    for (let attempt = 0; attempt < tuning.chunkTries; attempt++) {
      const assembled = assemble(index, attempt, attempt < tuning.chunkTries - 1);
      if (assembled) return finish(index, assembled);
    }
    throw new Error(`endless generator: the next anchor is out of reach in chunk ${index} (seed ${seed})`);
  }

  return {
    floorTopPx,
    floor,
    chunk(index) {
      if (!Number.isInteger(index) || index < 0) throw new Error(`endless generator: bad chunk index ${index}`);
      let chunk = cache.get(index);
      if (!chunk) {
        chunk = build(index);
        cache.set(index, chunk);
        // Keep the cache small: chunks rebuild identically, so dropping old ones loses nothing.
        if (cache.size > 12) cache.delete(cache.keys().next().value!);
      }
      return chunk;
    },
  };
}
