/**
 * The endless generator: builds one chunk of the climb from a seed and a chunk number.
 *
 * A chunk is an anchor ledge followed by ledges up to the next chunk's anchor. Only chunk 0's anchor,
 * the ground the run starts on, spans the whole width; every later anchor is an ordinary-width ledge
 * (Decision D-33). Three rules make it safe to run unattended:
 *   1. Random access. A chunk depends only on (seed, index), never on its neighbours, because every
 *      anchor sits at a known height and its position and width come from (seed, index) alone
 *      (`floor`). A chunk below can be rebuilt after a fall and comes out identical.
 *   2. Reachable by construction. Each ledge is placed under a real jump arc (jump-arcs.ts), and the
 *      jump is then replayed with `stepPlayer` against the finished chunk. A ledge that the replay
 *      does not land on is never kept. The inputs of every jump are stored in `route`; the last one
 *      lands on the next chunk's anchor and is replayed like the rest.
 *   3. Falls are not bounded. Nothing catches a missed jump but a ledge below or the ground, so a
 *      mistake costs as much height as it costs (in the spirit of Bennett Foddy's climbs). The chunk
 *      stream keeps the chunks below the candle loaded while it falls (chunk-stream.ts).
 *
 * Side ledges hold wax and are optional: they are reachable from the main path, but getting back
 * may mean dropping down. Nothing here reads the signal or changes how the candle moves.
 */
import type { GameConfig } from '../../shared/contracts/config';
import type { PlatformData } from '../../shared/contracts/content';
import type { EndlessConfig } from '../../config/endless.config';
import { seededRandom } from '../candle/candle-genome';
import { stepPlayer } from '../player/movement';
import type { PlatformBox } from '../player/types';
import { biomeOf } from './biome';
import { buildArcTable, descentAt, launch, standOn, type JumpArc } from './jump-arcs';

export interface WaxSpot {
  id: string;
  /** Centre of the drop in world px. */
  x: number;
  y: number;
  /** Set when the drop sits on a moving ledge: the ledge's id and its resting centre, so the drop can ride along. */
  ledgeId?: string;
  ledgeX?: number;
}

/** One jump of the guaranteed path: stand at `takeoffX` on `fromId`, hold jump `chargeSteps`, release holding `direction`. */
export interface RouteStep {
  fromId: string;
  toId: string;
  takeoffX: number;
  chargeSteps: number;
  direction: -1 | 0 | 1;
}

export interface EndlessChunk {
  index: number;
  /** Top surface of this chunk's anchor ledge (world y, px). */
  floorTopPx: number;
  /** The anchor first, then the main path from low to high, then side ledges. */
  platforms: PlatformData[];
  wax: WaxSpot[];
  /** Jumps from this chunk's anchor to the next chunk's anchor. */
  route: RouteStep[];
  /** The jump that reaches each optional side ledge, from a ledge of the main path. */
  sideRoute: RouteStep[];
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

const IDLE = { left: false, right: false, jump: false };
const ATTEMPTS_PER_LEDGE = 60;
/** How many times one chunk may take back a main-path ledge that left the next anchor out of reach. */
const MAX_BACKTRACKS = 80;
/** Mixed into the seed for anchors, so an anchor's place does not share the chunk's own random numbers. */
const ANCHOR_SALT = 0x5bd1e995;

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

/**
 * Replay one route step with the real physics. Returns the id of the ledge it lands on, or null
 * if it falls out of `platforms`. Exported for the tests, which replay every route.
 */
export function replayStep(step: RouteStep, platforms: readonly PlatformBox[], worldWidth: number, config: GameConfig): string | null {
  const from = platforms.find((platform) => platform.id === step.fromId);
  if (!from) return null;
  const stepMs = 1000 / config.stepHz;
  let state = launch(standOn(from, step.takeoffX, config), platforms, step.chargeSteps, step.direction, worldWidth, config);
  const lowest = Math.max(...platforms.map((platform) => platform.y)) + 200;
  for (let i = 0; i < 6000; i++) {
    if (state.grounded) return state.platformId;
    if (state.y > lowest) return null;
    state = stepPlayer(state, IDLE, platforms, worldWidth, config, stepMs).state;
  }
  return null;
}

export function createEndlessGenerator(seed: number, gameConfig: GameConfig, config: EndlessConfig): EndlessGenerator {
  const arcs = buildArcTable(gameConfig, config.chargeLevels);
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

  /** True when `candidate` keeps the required distance from every ledge already placed. */
  function clear(candidate: PlatformData, placed: readonly PlatformData[]): boolean {
    for (const other of placed) {
      // A ledge that slides needs its whole travel kept clear, not only where it rests.
      const travel = (other.motion?.distance ?? 0) + (candidate.motion?.distance ?? 0);
      const gapX = Math.abs(candidate.x - other.x) - (candidate.width + other.width) / 2 - travel;
      const gapY = Math.abs(topOf(candidate) - topOf(other));
      if (gapX < config.sideClearancePx && gapY < config.stackClearancePx) return false;
    }
    return true;
  }

  /**
   * Try to place a ledge `risePx` above `from`, under one sampled jump. Returns the ledge and the
   * jump that reaches it, or null when this attempt does not fit the walls.
   */
  function tryLedge(random: () => number, from: PlatformData, id: string, risePx: number, width: number,
    direction: -1 | 0 | 1): { ledge: PlatformData; step: RouteStep; landingX: number } | null {
    const table = direction === 0 ? arcs.up : arcs.side;
    const usable: Array<{ arc: JumpArc; dx: number }> = [];
    for (const arc of table) {
      if (arc.level < config.minChargeLevel) continue;
      const hit = descentAt(arc, risePx, config.apexClearancePx);
      if (hit) usable.push({ arc, dx: hit.after.dx });
    }
    if (!usable.length) return null;
    const pick = usable[Math.floor(random() * usable.length)]!;
    // Anywhere the body can stand on `from`, inside the walls.
    const minX = Math.max(body.width / 2 + 1, from.x - from.width / 2 + body.width / 2 + 2);
    const maxX = Math.min(worldWidth - body.width / 2 - 1, from.x + from.width / 2 - body.width / 2 - 2);
    if (minX > maxX) return null;
    const takeoffX = Math.round(lerp(minX, maxX, random()));
    const landingX = takeoffX + direction * pick.dx;
    // The landing point must sit well inside the ledge; the ledge may slide sideways within that limit.
    const slack = width / 2 - body.width / 2 - config.landingInsetPx;
    if (slack < 0) return null;
    const centre = Math.min(worldWidth - width / 2 - 2, Math.max(width / 2 + 2, landingX + (random() * 2 - 1) * slack));
    if (Math.abs(centre - landingX) > slack) return null;
    const ledge: PlatformData = {
      id, x: Math.round(centre), y: topOf(from) - risePx + config.ledgeHeightPx / 2,
      width: Math.round(width), height: config.ledgeHeightPx, type: 'static',
    };
    return { ledge, step: { fromId: from.id, toId: id, takeoffX, chargeSteps: pick.arc.chargeSteps, direction }, landingX };
  }

  /**
   * Find a jump from `from` that lands on `target` (a fixed ledge: the next chunk's anchor), replayed
   * against `platforms`. The jump peaks at least `apexClearancePx` short of `rise.minPx` above the anchor:
   * every other ledge of the next chunk is at least `rise.minPx` above its anchor, so none of them can
   * catch this jump, though this chunk is built without looking at the next one. Null when no arc fits.
   */
  function jumpTo(random: () => number, from: PlatformData, target: PlatformData, platforms: readonly PlatformData[]): RouteStep | null {
    const risePx = topOf(from) - topOf(target);
    const apexLimitPx = risePx + config.rise.minPx - config.apexClearancePx;
    const slack = target.width / 2 - body.width / 2 - config.landingInsetPx;
    const minX = Math.max(body.width / 2 + 1, from.x - from.width / 2 + body.width / 2 + 2);
    const maxX = Math.min(worldWidth - body.width / 2 - 1, from.x + from.width / 2 - body.width / 2 - 2);
    if (slack < 0 || minX > maxX) return null;
    const toward: -1 | 1 = target.x >= from.x ? 1 : -1;
    const away = -toward as -1 | 1;
    const directions: Array<-1 | 0 | 1> = random() < 0.5 ? [toward, 0, away] : [0, toward, away];
    for (const direction of directions) {
      for (const arc of direction === 0 ? arcs.up : arcs.side) {
        if (arc.level < config.minChargeLevel || arc.apexPx >= apexLimitPx) continue;
        const hit = descentAt(arc, risePx, config.apexClearancePx);
        if (!hit) continue;
        const dx = direction * hit.after.dx;
        // Aim somewhere inside the anchor, then at its middle if that misses.
        for (const aim of [(random() * 2 - 1) * slack, 0]) {
          const takeoffX = Math.round(target.x + aim - dx);
          if (takeoffX < minX || takeoffX > maxX) continue;
          const step: RouteStep = { fromId: from.id, toId: target.id, takeoffX, chargeSteps: arc.chargeSteps, direction };
          if (replayStep(step, platforms, worldWidth, gameConfig) === target.id) return step;
        }
      }
    }
    return null;
  }

  function build(index: number): EndlessChunk {
    const random = seededRandom(chunkSeed(seed, index));
    const difficulty = difficultyAt(index, config);
    const base = floor(index);
    const nextFloor = floor(index + 1);
    const nextTop = topOf(nextFloor);
    const main: PlatformData[] = [base];
    const route: RouteStep[] = [];
    const ledgeWidth = (): number => {
      const mean = lerp(config.width.easyPx, config.width.hardPx, difficulty);
      return Math.max(config.width.minPx, mean * (1 + (random() * 2 - 1) * config.width.widthJitter01));
    };
    const maxRise = lerp(config.rise.easyMaxPx, config.rise.hardMaxPx, difficulty);
    let heading: -1 | 1 = random() < 0.5 ? -1 : 1;
    let finalStep: RouteStep | null = null;
    let backtracks = 0;

    // Climb until the next anchor is one jump away, and that jump has been found and replayed.
    for (let guard = 0; guard < 400 && !finalStep; guard++) {
      const from = main[main.length - 1]!;
      const remaining = topOf(from) - nextTop;
      // Near the top, lean toward the next anchor: it is an ordinary ledge, not a full-width landing.
      const nearTop = remaining <= 2 * maxRise + config.finalRise.maxPx;
      const toward: -1 | 1 = nextFloor.x >= from.x ? 1 : -1;
      let placed: { ledge: PlatformData; step: RouteStep; last: RouteStep | null } | null = null;
      for (let attempt = 0; attempt < ATTEMPTS_PER_LEDGE && !placed; attempt++) {
        // Never leave less than a real jump to the next anchor.
        const top = Math.min(maxRise, remaining - config.finalRise.minPx);
        const risePx = Math.round(lerp(config.rise.minPx, Math.max(config.rise.minPx, top), random()));
        // Mostly zig-zag; sometimes keep going the same way, sometimes straight up.
        const roll = random();
        const direction: -1 | 0 | 1 = main.length > 1 && roll < config.straightUpChance ? 0
          : nearTop ? (roll < 0.8 ? toward : (-toward as -1 | 1))
            : roll < 0.75 ? (-heading as -1 | 1) : heading;
        const candidate = tryLedge(random, from, `e${index}:p${main.length}`, risePx, ledgeWidth(), direction);
        if (!candidate || !clear(candidate.ledge, main.slice(0, -1))) continue;
        // The new jump must land on the new ledge, and no earlier jump may now be caught by it.
        const all = [...main, candidate.ledge, nextFloor];
        if (![...route, candidate.step].every((step) => replayStep(step, all, worldWidth, gameConfig) === step.toId)) continue;
        // The last ledge of the path must have a real jump onto the next anchor.
        let last: RouteStep | null = null;
        if (topOf(candidate.ledge) - nextTop <= config.finalRise.maxPx) {
          last = jumpTo(random, candidate.ledge, nextFloor, all);
          if (!last) continue;
        }
        placed = { ...candidate, last };
      }
      if (!placed) {
        // A dead end: the path wandered out of reach of the anchor. Take back one ledge and try again.
        if (main.length > 1 && backtracks++ < MAX_BACKTRACKS) { main.pop(); route.pop(); continue; }
        throw new Error(`endless generator: no ledge fits above ${from.id} (seed ${seed})`);
      }
      main.push(placed.ledge);
      route.push(placed.step);
      if (placed.step.direction !== 0) heading = placed.step.direction;
      finalStep = placed.last;
    }
    if (!finalStep) throw new Error(`endless generator: the next anchor is out of reach in chunk ${index} (seed ${seed})`);
    route.push(finalStep);

    // Optional side ledges with wax. Each must be reachable, and must not catch a main-path jump or an earlier side jump.
    const sides: PlatformData[] = [];
    const sideRoute: RouteStep[] = [];
    const wax: WaxSpot[] = [];
    const waxAbove = (platform: PlatformData, id: string): WaxSpot => ({ id, x: platform.x,
      y: topOf(platform) - config.waxHoverPx - body.height / 2 });
    const routeHolds = (extra: PlatformData): boolean => {
      const all = [...main, ...sides, extra, nextFloor];
      return route.every((step) => replayStep(step, all, worldWidth, gameConfig) === step.toId);
    };
    /** Each earlier side jump still lands on its own ledge with `extra` added, wherever a moving one is in its travel. */
    const sideJumpsHold = (extra: PlatformData): boolean => {
      const all = [...main, ...sides, extra, nextFloor];
      return sideRoute.every((step, k) => {
        const own = sides[k]!;
        const distance = own.motion?.distance ?? 0;
        return (distance ? [-distance, 0, distance] : [0]).every((offset) => replayStep(step,
          all.map((p) => (p.id === own.id ? { ...p, x: p.x + offset } : p)), worldWidth, gameConfig) === step.toId);
      });
    };
    /**
     * Turn a side ledge into one that slides left and right, if there is room. It may move only as far
     * as the landing spot of its jump stays on it, so the jump lands whenever it is made. At both ends
     * and in between it must stay clear of the walls and other ledges, still catch its own jump, and
     * never catch a jump of the main path. Returns null when it should stay still.
     */
    const moving = (candidate: { ledge: PlatformData; step: RouteStep; landingX: number }): PlatformData | null => {
      if (index < config.moving.fromChunk || random() >= config.moving.chance) return null;
      const { ledge, step, landingX } = candidate;
      const room = ledge.width / 2 - body.width / 2 - 4 - Math.abs(ledge.x - landingX);
      const walls = Math.min(ledge.x - ledge.width / 2, worldWidth - ledge.x - ledge.width / 2) - 2;
      const distance = Math.floor(Math.min(config.moving.maxDistancePx, room, walls));
      if (distance < config.moving.minDistancePx) return null;
      const others = [...main, ...sides];
      for (const offset of [-distance, -distance / 2, distance / 2, distance]) {
        const shifted = { ...ledge, x: ledge.x + offset };
        if (!clear(shifted, others)) return null;
        const all = [...others, shifted, nextFloor];
        if (replayStep(step, all, worldWidth, gameConfig) !== ledge.id) return null;
        if (!route.every((mainStep) => replayStep(mainStep, all, worldWidth, gameConfig) === mainStep.toId)) return null;
        if (!sideJumpsHold(shifted)) return null;
      }
      const periodMs = Math.round(lerp(config.moving.periodMs[0], config.moving.periodMs[1], random()));
      return { ...ledge, type: 'moving', motion: { axis: 'x', distance, periodMs } };
    };
    for (let i = 1; i < main.length; i++) {
      const from = main[i]!;
      if (random() < config.pathWaxChance) wax.push(waxAbove(from, `e${index}:wax-p${i}`));
      if (random() >= config.sideLedgeChance) continue;
      const mainDirection = route[i]?.direction ?? 0;
      for (let attempt = 0; attempt < 12; attempt++) {
        const direction: -1 | 1 = mainDirection !== 0 ? (-mainDirection as -1 | 1) : random() < 0.5 ? -1 : 1;
        const risePx = Math.round(lerp(config.rise.minPx * 0.7, maxRise * 0.85, random()));
        const id = `e${index}:s${i}`;
        const candidate = tryLedge(random, from, id, risePx, Math.max(config.width.minPx, ledgeWidth() * 0.75), direction);
        if (!candidate || topOf(candidate.ledge) < nextTop + config.stackClearancePx) continue;
        if (!clear(candidate.ledge, [...main, ...sides])) continue;
        const all = [...main, ...sides, candidate.ledge, nextFloor];
        if (replayStep(candidate.step, all, worldWidth, gameConfig) !== id || !routeHolds(candidate.ledge) || !sideJumpsHold(candidate.ledge)) continue;
        const ledge = moving(candidate) ?? candidate.ledge;
        sides.push(ledge);
        sideRoute.push(candidate.step);
        wax.push(ledge.motion ? { ...waxAbove(ledge, `e${index}:wax-s${i}`), ledgeId: ledge.id, ledgeX: ledge.x } : waxAbove(ledge, `e${index}:wax-s${i}`));
        break;
      }
    }
    // A chunk never goes without wax: the fuel rule assumes at least one per chunk.
    if (!wax.length && main.length > 1) {
      const holder = main[1 + Math.floor(random() * (main.length - 1))]!;
      wax.push(waxAbove(holder, `e${index}:wax-p`));
    }
    // Ice, in the snow bands only. It changes how walking feels on a ledge, not the jump from it,
    // so every stored jump still lands where it says (the tests replay them). Anchors stay firm.
    const iced = (ledge: PlatformData): PlatformData => {
      if (ledge.motion || biomeOf(index, config) !== 'snow' || random() >= config.ice.chance) return ledge;
      const ice01 = Math.round(lerp(config.ice.min01, config.ice.max01, random()) * 100) / 100;
      return { ...ledge, type: 'slippery', ice01 };
    };
    const ledges = [base, ...main.slice(1).map(iced), ...sides.map(iced)];
    return { index, floorTopPx: floorTopPx(index), platforms: ledges, wax, route, sideRoute };
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
