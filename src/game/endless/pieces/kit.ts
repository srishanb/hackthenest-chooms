/**
 * The piece kit: the shared tools every set piece builds with, one kit per try at a chunk.
 *
 * Why one kit: every piece must obey the same rules, and they are easy to get subtly wrong. A ledge is
 * only kept when (1) a real traced jump arc (jump-arcs.ts) or walk-off fall lands on it, (2) it sits
 * inside the walls and between this chunk's anchor and the next, (3) it keeps its distance from every
 * other ledge, (4) the jump peaks low enough that no ledge of the next chunk can catch it, and (5) every
 * step of the chunk so far, this one included, replays onto its own ledge with `stepPlayer`
 * (route-replay.ts). Pieces only describe shapes; the kit decides what is kept.
 *
 * The special ledges (Decision D-36): every replay goes through the chunk's updraft columns; a bounce cap
 * is kept with the jump that bounces off it (`placeCap`, then `fly`); a step from a crumbling ledge must
 * fit in the ledge's hold time, counting the walk from where the candle lands on it (`arriveX`); a traced
 * flight (`fly`) places a ledge wherever the real physics brings the candle down, which is how a bounce
 * or a ride on a column is proved like any other step.
 *
 * Walls (Decision D-37, only with `?walls=1`): a wall is kept in the run's ledges (`addWall`), so every later
 * replay meets it; it must keep clear of the other ledges by its whole box, stay inside the chunk (its
 * underside clear of the chunk below's highest flights), and leave every earlier step landing where it did. A
 * traced flight with `kicks` places its ledge only after the last kick.
 */
import type { GameConfig } from '../../../shared/contracts/config';
import type { PlatformData, UpdraftData } from '../../../shared/contracts/content';
import type { EndlessConfig } from '../../../config/endless.config';
import type { EndlessPiecesConfig } from '../../../config/endless-pieces.config';
import { BOUNCE_TYPE } from '../../player/bounce';
import { CRUMBLING_TYPE } from '../../player/crumble';
import { stepPlayer } from '../../player/movement';
import { WALL_TYPE } from '../../player/wall';
import { updraftAt } from '../../player/updraft';
import { chargeStepsFor, descentAt, standOn, type JumpArc } from '../jump-arcs';
import { createRouteChecker, flyStep, replayStep, standMsBefore, stepsHold, wallStepVariants, type RouteStep } from '../route-replay';
import type { Candidate, DropSpec, FlightSpec, JumpSpec, PieceFeature, PieceKit, PieceRun } from './types';

/** What has been laid in this chunk before the current piece: the anchor first. */
export interface Committed {
  ledges: PlatformData[];
  steps: RouteStep[];
  altSteps: RouteStep[];
  /** Updraft columns laid so far in this chunk. */
  updrafts: UpdraftData[];
}

export interface KitSetup {
  random: () => number;
  index: number;
  difficulty: number;
  features: ReadonlySet<PieceFeature>;
  game: GameConfig;
  config: EndlessConfig;
  tuning: EndlessPiecesConfig;
  arcs: { side: JumpArc[]; up: JumpArc[] };
  /** The walk-off fall from a ledge's right edge: feet offset from the edge per physics step. */
  dropTrace: ReadonlyArray<{ dx: number; dy: number }>;
  committed: Committed;
  /** This chunk's anchor top and the next chunk's anchor (world y, px). */
  floorTopPx: number;
  nextFloor: PlatformData;
}

/** The kit, plus what only the generator uses: taking the last ledge back out of a run. */
export interface GeneratorKit extends PieceKit {
  takeBack(run: PieceRun): void;
  /** The steps among `steps` that `ledge` could catch, given `ledges` and the columns (see route-replay.ts). */
  affected(steps: readonly RouteStep[], ledge: PlatformData, ledges: readonly PlatformData[], updrafts?: readonly UpdraftData[]): RouteStep[];
}

const IDLE = { left: false, right: false, jump: false };
const topOf = (platform: { y: number; height: number }): number => platform.y - platform.height / 2;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** An empty run of ledges for one piece. */
export function emptyRun(): PieceRun {
  return { ledges: [], steps: [], altSteps: [], waxOn: [], updrafts: [] };
}

/**
 * The feet's path after walking off a ledge's right edge (dx right of the edge, dy below its top),
 * traced with `stepPlayer`. The left edge mirrors it. Walking speed is constant, so one trace serves
 * every ledge.
 */
export function traceDrop(game: GameConfig, depthPx: number): Array<{ dx: number; dy: number }> {
  const stepMs = 1000 / game.stepHz;
  const ledge = { id: 'trace', x: 0, y: 10, width: 400, height: 20 };
  const edge = ledge.x + ledge.width / 2;
  let state = standOn(ledge, edge - game.player.width / 2 - 4, game);
  const walk = { ...IDLE, right: true };
  for (let i = 0; i < 400 && state.grounded; i++) state = stepPlayer(state, walk, [ledge], 1_000_000, game, stepMs).state;
  const points: Array<{ dx: number; dy: number }> = [];
  const top = topOf(ledge);
  for (let i = 0; i < 2000; i++) {
    const feet = state.y + game.player.height / 2;
    points.push({ dx: state.x - edge, dy: feet - top });
    if (feet - top > depthPx) break;
    state = stepPlayer(state, IDLE, [], 1_000_000, game, stepMs).state;
  }
  return points;
}

/** True when `candidate` keeps the required distance from every ledge in `placed` (itself excepted). */
export function keepsClear(candidate: PlatformData, placed: readonly PlatformData[], config: EndlessConfig): boolean {
  for (const other of placed) {
    if (other.id === candidate.id) continue;
    // A ledge that slides needs its whole travel kept clear, not only where it rests.
    const travel = (other.motion?.distance ?? 0) + (candidate.motion?.distance ?? 0);
    const gapX = Math.abs(candidate.x - other.x) - (candidate.width + other.width) / 2 - travel;
    // A wall is tall: what matters is the gap between the two boxes, not between their tops.
    const gapY = candidate.type === WALL_TYPE || other.type === WALL_TYPE
      ? 2 * (Math.abs(candidate.y - other.y) - (candidate.height + other.height) / 2)
      : Math.abs(topOf(candidate) - topOf(other));
    if (gapX < config.sideClearancePx && gapY < config.stackClearancePx) return false;
  }
  return true;
}

/**
 * The highest a jump's feet may reach in a chunk (world y): below every ledge of the next chunk but its
 * anchor (all at least `rise.minPx` above that anchor), so a chunk built alone is never caught by the next.
 */
export function apexLimitTop(nextFloor: PlatformData, config: EndlessConfig): number {
  return topOf(nextFloor) - config.rise.minPx + config.apexClearancePx;
}

export function createPieceKit(setup: KitSetup): GeneratorKit {
  const { random, index, game, config, tuning, arcs, committed, nextFloor } = setup;
  const worldWidth = game.view.width;
  const body = game.player;
  const nextTop = topOf(nextFloor);
  const meanWidth = lerp(config.width.easyPx, config.width.hardPx, setup.difficulty);
  const maxRisePx = lerp(config.rise.easyMaxPx, config.rise.hardMaxPx, setup.difficulty);
  const ceilingTopPx = nextTop + config.finalRise.minPx;
  const floorTopPx = setup.floorTopPx - config.rise.minPx;
  const apexLimitTopPx = apexLimitTop(nextFloor, config);
  /** A wall's underside may come no lower than this (world y): clear of the heads of the chunk below's highest flights. */
  const wallFloorPx = setup.floorTopPx - config.rise.minPx + config.apexClearancePx - body.height - 2;
  /** The highest any charge jump lifts the feet (px): a full straight-up jump. */
  let plainApexPx = 0;
  for (const arc of arcs.up) plainApexPx = Math.max(plainApexPx, arc.apexPx);

  const checker = createRouteChecker(worldWidth, game);
  const between = (range: readonly [number, number]): number => lerp(range[0], range[1], random());
  const others = (run: PieceRun): PlatformData[] => [...committed.ledges, ...run.ledges];
  const allSteps = (run: PieceRun): RouteStep[] => [...run.steps, ...run.altSteps, ...committed.steps, ...committed.altSteps];
  const columns = (run: PieceRun): UpdraftData[] => [...committed.updrafts, ...run.updrafts];
  const stepMs = 1000 / game.stepHz;
  /** Time a step from a crumbling ledge may take, walk and charge, after the reaction allowance (ms); Infinity elsewhere. */
  const crumbleBudgetMs = (ledge: PlatformData): number => ledge.type === CRUMBLING_TYPE && game.ledgeKinds
    ? game.ledgeKinds.crumble.holdMs - tuning.crumbleMarginMs - tuning.crumbleReactionMs : Number.POSITIVE_INFINITY;
  /**
   * Where the candle lands on `ledge` when it arrives by the route, in the world given (default: as placed
   * now), or null. Null also when more than one step arrives on it, or the one that does leaves a moving
   * ledge: then there is no single landing point to time the next step from, so nothing may leave it.
   */
  const arrivalX = (run: PieceRun, ledge: PlatformData, ledges?: readonly PlatformData[], updrafts?: readonly UpdraftData[]): number | null => {
    const incoming = allSteps(run).filter((step) => step.toId === ledge.id);
    if (incoming.length !== 1) return null;
    const world = ledges ?? [...others(run), nextFloor];
    if (world.find((other) => other.id === incoming[0]!.fromId)?.motion) return null;
    const flight = flyStep(incoming[0]!, world, worldWidth, game, { updrafts: updrafts ?? columns(run) });
    return flight.landedId === ledge.id ? flight.state.x : null;
  };
  /**
   * The timing invariant of crumbling ledges: every stored step that leaves a crumbling ledge was timed from
   * `arriveX`, where the step onto that ledge lands. Anything added later that can bend a flight without
   * making it miss (a bounce cap, an updraft column) could move that landing and make the stored timing
   * wrong, so such an addition is kept only if, in the world with it, every such landing is still where it
   * was (to 0.01 px, the stored precision). A plain ledge can only catch a flight, which the replay already
   * refuses.
   */
  const arrivalsHold = (run: PieceRun, ledges: readonly PlatformData[], updrafts: readonly UpdraftData[]): boolean => {
    for (const step of allSteps(run)) {
      if (step.arriveX === undefined) continue;
      const from = ledges.find((ledge) => ledge.id === step.fromId);
      if (!from) continue;
      const x = arrivalX(run, from, ledges, updrafts);
      if (x === null || Math.abs(Math.round(x * 100) / 100 - step.arriveX) > 0.011) return false;
    }
    return true;
  };
  /** The takeoffs a step from a crumbling ledge may use: within walking reach of the landing in the time left. */
  /** `arrivalX` as placed now, remembered until a ledge or column is added (only a cap or column could move it). */
  const arrivals = new Map<string, number | null>();
  const arrivalNow = (run: PieceRun, ledge: PlatformData): number | null => {
    const key = `${ledge.id}|${others(run).length}|${columns(run).length}|${allSteps(run).length}`;
    if (!arrivals.has(key)) arrivals.set(key, arrivalX(run, ledge));
    return arrivals.get(key)!;
  };
  const crumbleReach = (run: PieceRun, ledge: PlatformData, chargeSteps: number): { arriveX: number; walkPx: number } | null => {
    const budget = crumbleBudgetMs(ledge);
    if (!Number.isFinite(budget)) return null;
    const arriveX = arrivalNow(run, ledge);
    const walkMs = budget - (chargeSteps + 1) * stepMs;
    if (arriveX === null || walkMs < 0) return { arriveX: arriveX ?? ledge.x, walkPx: -1 };
    // Whole walking steps only (the replay counts them the same way), a little short to be safe.
    // ...and short by the takeoff tolerance, since the step must also work from takeoffs that far either side.
    return { arriveX, walkPx: Math.floor(walkMs / stepMs) * game.walkSpeed * stepMs / 1000 - 1 - tuning.takeoffTolerancePx };
  };
  /** The step leaves its ledge in time (a crumbling ledge), or the ledge does not crumble. */
  const inTime = (step: RouteStep, from: PlatformData | undefined): boolean =>
    !from || from.type !== CRUMBLING_TYPE || (step.arriveX !== undefined
      && Math.max(standMsBefore(step, game, -tuning.takeoffTolerancePx), standMsBefore(step, game, tuning.takeoffTolerancePx)) <= crumbleBudgetMs(from));

  /** Where the body can stand on `ledge`, inside the walls, wherever a moving ledge is in its travel. */
  const standRange = (ledge: PlatformData): [number, number] => {
    const travel = ledge.motion?.distance ?? 0;
    return [
      Math.max(body.width / 2 + 1, ledge.x - ledge.width / 2 + travel + body.width / 2 + 2),
      Math.min(worldWidth - body.width / 2 - 1, ledge.x + ledge.width / 2 - travel - body.width / 2 - 2),
    ];
  };

  const nextId = (run: PieceRun, kind: 'p' | 'a' | 'b' | 'w'): string => {
    const prefix = `e${index}:${kind}`;
    const used = others(run).filter((ledge) => ledge.id.startsWith(prefix)).length;
    return `${prefix}${used + 1}`;
  };

  const clear = (candidate: PlatformData, placed: readonly PlatformData[]): boolean => keepsClear(candidate, placed, config);

  /** Inside the walls (over its whole travel) and between the chunk's floor limit and ceiling. */
  const inBounds = (ledge: PlatformData): boolean => {
    const travel = ledge.motion?.distance ?? 0;
    const top = topOf(ledge);
    return ledge.x - ledge.width / 2 - travel >= 0 && ledge.x + ledge.width / 2 + travel <= worldWidth
      && top >= ceilingTopPx && top <= floorTopPx && ledge.width >= 1;
  };

  /** The farthest sideways an ordinary jump (no steering, no column) travels to come down `risePx` above its takeoff. */
  const plainReach = new Map<number, number>();
  const plainReachPx = (risePx: number): number => {
    const key = Math.round(risePx);
    let best = plainReach.get(key);
    if (best === undefined) {
      best = 0;
      for (const arc of arcs.side) best = Math.max(best, descentAt(arc, key, 0)?.after.dx ?? 0);
      plainReach.set(key, best);
    }
    return best;
  };

  const kit: GeneratorKit = {
    random, index, difficulty: setup.difficulty, features: setup.features, game, config, tuning, worldWidth,
    maxRisePx, ceilingTopPx, floorTopPx, plainApexPx, wallFloorPx,
    between,
    count: (range) => Math.min(range[1], Math.floor(between([range[0], range[1] + 1]))),
    ledgeWidth: (scale = 1) => Math.max(config.width.minPx,
      meanWidth * (1 + (random() * 2 - 1) * config.width.widthJitter01) * Math.min(1, scale)),
    widestWidth: () => Math.max(config.width.minPx, meanWidth * (1 + config.width.widthJitter01)),

    jump(run, from, spec) {
      const direction = spec.direction;
      const table = direction === 0 ? arcs.up : arcs.side;
      const [low, high] = spec.levels ?? [config.minChargeLevel, config.chargeLevels];
      const risePx = Math.round(between(spec.risePx));
      const usable: Array<{ arc: JumpArc; dx: number }> = [];
      const budget = crumbleBudgetMs(from);
      for (const arc of table) {
        if (arc.level < Math.max(low, config.minChargeLevel) || arc.level > high) continue;
        if ((arc.chargeSteps + 1) * stepMs > budget) continue;
        const hit = descentAt(arc, risePx, config.apexClearancePx);
        if (hit && hit.after.dx >= (spec.minDxPx ?? 0)) usable.push({ arc, dx: hit.after.dx });
      }
      if (!usable.length) return null;
      const pick = usable[Math.floor(random() * usable.length)]!;
      let [minX, maxX] = standRange(from);
      if (minX > maxX) return null;
      const reach = crumbleReach(run, from, pick.arc.chargeSteps);
      if (reach) {
        if (reach.walkPx < 0) return null;
        minX = Math.max(minX, Math.ceil(reach.arriveX - reach.walkPx));
        maxX = Math.min(maxX, Math.floor(reach.arriveX + reach.walkPx));
        if (minX > maxX) return null;
      }
      if (spec.takeoff === 'front' && direction !== 0) {
        // The last third of the ledge toward the jump: a run-up to the edge.
        const span = (maxX - minX) / 3;
        if (direction > 0) minX = maxX - span; else maxX = minX + span;
      }
      const takeoffX = Math.round(lerp(minX, maxX, random()));
      const landingX = takeoffX + direction * pick.dx;
      const width = Math.round(spec.widthPx);
      // The landing point must sit well inside the ledge; the ledge may sit off-centre within that limit.
      const slack = width / 2 - body.width / 2 - config.landingInsetPx;
      if (slack < 0) return null;
      let centre = landingX + (random() * 2 - 1) * slack * (spec.jitter01 ?? 1);
      if (spec.centreX) centre = Math.min(spec.centreX[1], Math.max(spec.centreX[0], centre));
      centre = Math.round(Math.min(worldWidth - width / 2 - 2, Math.max(width / 2 + 2, centre)));
      if (Math.abs(centre - landingX) > slack) return null;
      const id = nextId(run, spec.kind ?? 'p');
      const ledge: PlatformData = { id, x: centre, y: topOf(from) - risePx + config.ledgeHeightPx / 2, width,
        height: config.ledgeHeightPx, type: 'static' };
      const step: RouteStep = { fromId: from.id, toId: id, takeoffX, chargeSteps: pick.arc.chargeSteps, direction,
        ...(reach ? { arriveX: Math.round(reach.arriveX * 100) / 100 } : {}) };
      return { ledge, step, landingX, apexTopPx: topOf(from) - pick.arc.apexPx };
    },

    drop(run, from, spec) {
      if (from.motion || (from.type !== undefined && from.type !== 'static')) return null;
      const direction = spec.direction;
      const fallPx = Math.round(between(spec.fallPx));
      const point = setup.dropTrace.find((p) => p.dy >= fallPx);
      if (!point) return null;
      const edge = from.x + direction * from.width / 2;
      const landingX = edge + direction * point.dx;
      const width = Math.round(spec.widthPx);
      const slack = width / 2 - body.width / 2 - config.landingInsetPx;
      if (slack < 0) return null;
      const centre = Math.round(Math.min(worldWidth - width / 2 - 2, Math.max(width / 2 + 2, landingX + (random() * 2 - 1) * slack)));
      if (Math.abs(centre - landingX) > slack) return null;
      const takeoffX = Math.round(edge - direction * (body.width / 2 + 4));
      const id = nextId(run, 'p');
      const ledge: PlatformData = { id, x: centre, y: topOf(from) + fallPx + config.ledgeHeightPx / 2, width,
        height: config.ledgeHeightPx, type: 'static' };
      const step: RouteStep = { fromId: from.id, toId: id, takeoffX, chargeSteps: 0, direction, kind: 'drop' };
      return { ledge, step, landingX, apexTopPx: topOf(from) };
    },

    accept(run, candidate, alt = false) {
      const { ledge, step } = candidate;
      if (!inBounds(ledge) || candidate.apexTopPx < apexLimitTopPx) return false;
      const placed = others(run);
      if (!clear(ledge, placed)) return false;
      if (!inTime(step, placed.find((other) => other.id === step.fromId))) return false;
      const all = [...placed, ledge, nextFloor];
      // The new step first: it is the one most likely to miss. Earlier steps only where the new ledge could catch them.
      const earlier = checker.affected(allSteps(run), ledge, [...placed, nextFloor], columns(run));
      if (!stepsHold([step, ...earlier], all, worldWidth, game, columns(run))) return false;
      run.ledges.push(ledge);
      (alt ? run.altSteps : run.steps).push(step);
      return true;
    },

    place(run, from, spec, alt = false) {
      for (let attempt = 0; attempt < tuning.attemptsPerLedge; attempt++) {
        const candidate = kit.jump(run, from, spec());
        if (candidate && kit.accept(run, candidate, alt)) return candidate.ledge;
      }
      return null;
    },

    placeDrop(run, from, spec) {
      for (let attempt = 0; attempt < tuning.attemptsPerLedge; attempt++) {
        const candidate = kit.drop(run, from, spec());
        if (candidate && kit.accept(run, candidate)) return candidate.ledge;
      }
      return null;
    },

    link(run, from, target, alt = false) {
      const risePx = topOf(from) - topOf(target);
      const travel = target.motion?.distance ?? 0;
      const slack = target.width / 2 - body.width / 2 - config.landingInsetPx - travel;
      const [minX, maxX] = standRange(from);
      if (slack < 0 || minX > maxX) return false;
      const budget = crumbleBudgetMs(from);
      const arriveX = Number.isFinite(budget) ? arrivalNow(run, from) : null;
      if (Number.isFinite(budget) && arriveX === null) return false;
      const toward: -1 | 1 = target.x >= from.x ? 1 : -1;
      const away = -toward as -1 | 1;
      const directions: Array<-1 | 0 | 1> = random() < 0.5 ? [toward, 0, away] : [0, toward, away];
      const all = [...others(run), nextFloor];
      if (!all.includes(target)) all.push(target);
      for (const direction of directions) {
        for (const arc of direction === 0 ? arcs.up : arcs.side) {
          if (arc.level < config.minChargeLevel || topOf(from) - arc.apexPx < apexLimitTopPx) continue;
          if ((arc.chargeSteps + 1) * stepMs > budget) continue;
          const hit = descentAt(arc, risePx, config.apexClearancePx);
          if (!hit) continue;
          const dx = direction * hit.after.dx;
          // Aim somewhere inside the target, then at its middle if that misses.
          for (const aim of [(random() * 2 - 1) * slack, 0]) {
            const takeoffX = Math.round(target.x + aim - dx);
            if (takeoffX < minX || takeoffX > maxX) continue;
            const step: RouteStep = { fromId: from.id, toId: target.id, takeoffX, chargeSteps: arc.chargeSteps, direction,
              ...(arriveX !== null ? { arriveX: Math.round(arriveX * 100) / 100 } : {}) };
            if (!inTime(step, from)) continue;
            if (replayStep(step, all, worldWidth, game, 0, false, columns(run)) !== target.id) continue;
            // No ledge was added, so only the new step (with any moving ledges at both ends) needs checking.
            if (!stepsHold([step], all, worldWidth, game, columns(run))) continue;
            (alt ? run.altSteps : run.steps).push(step);
            return true;
          }
        }
      }
      return false;
    },

    makeMoving(run, ledge, distancePx, periodMs) {
      const at = run.ledges.indexOf(ledge);
      if (at < 0) return null;
      const moved: PlatformData = { ...ledge, type: 'moving', motion: { axis: 'x', distance: Math.floor(distancePx), periodMs: Math.round(periodMs) } };
      const ledges = others(run).map((other) => (other === ledge ? moved : other));
      if (!inBounds(moved) || !clear(moved, ledges)) return null;
      if (!stepsHold(allSteps(run), [...ledges, nextFloor], worldWidth, game, columns(run))) return null;
      run.ledges[at] = moved;
      return moved;
    },

    makeCrumbling(run, ledge) {
      const at = run.ledges.indexOf(ledge);
      if (at < 0 || ledge.motion || !game.ledgeKinds) return null;
      // Nothing may leave it yet: later steps from it are held to the crumble time as they are placed.
      if ([...run.steps, ...run.altSteps].some((step) => step.fromId === ledge.id)) return null;
      // There must be one landing point to time the steps from it by (see `arrivalX`).
      if (arrivalX(run, ledge) === null) return null;
      const crumbling: PlatformData = { ...ledge, type: CRUMBLING_TYPE };
      run.ledges[at] = crumbling;
      return crumbling;
    },

    placeCap(run, from, spec) {
      for (let attempt = 0; attempt < tuning.attemptsPerLedge; attempt++) {
        const raw = kit.jump(run, from, spec);
        if (!raw) continue;
        const cap: PlatformData = { ...raw.ledge, id: nextId(run, 'b'), type: BOUNCE_TYPE };
        const step: RouteStep = { ...raw.step, toId: cap.id, via: cap.id };
        if (!inBounds(cap) || !clear(cap, others(run))) continue;
        // The cap must not catch (and throw) any earlier step.
        const placed = [...others(run), nextFloor];
        const earlier = checker.affected(allSteps(run), cap, placed, columns(run));
        if (!stepsHold(earlier, [...placed, cap], worldWidth, game, columns(run))) continue;
        if (!arrivalsHold(run, [...placed, cap], columns(run))) continue;
        checker.forget(earlier);
        run.ledges.push(cap);
        return { cap, step };
      }
      return null;
    },

    addColumn(run, column) {
      const top = column.y - column.height / 2, bottom = column.y + column.height / 2;
      // Inside the walls, under the next anchor and clear of the chunk below (whose jumps never rise this far).
      if (column.x - column.width / 2 < 0 || column.x + column.width / 2 > worldWidth) return false;
      if (top < ceilingTopPx || bottom > floorTopPx - body.height / 2 - 2) return false;
      if (columns(run).some((other) => Math.abs(other.x - column.x) < (other.width + column.width) / 2
        && Math.abs(other.y - column.y) < (other.height + column.height) / 2)) return false;
      const placed = [...others(run), nextFloor];
      const touched = checker.affectedByColumn(allSteps(run), column, placed, columns(run));
      if (!stepsHold(touched, placed, worldWidth, game, [...columns(run), column])) return false;
      if (!arrivalsHold(run, placed, [...columns(run), column])) return false;
      checker.forget(touched);
      run.updrafts.push(column);
      return true;
    },

    wallId: (run) => nextId(run, 'w'),

    addWall(run, wall) {
      const top = wall.y - wall.height / 2, bottom = wall.y + wall.height / 2;
      if (wall.type !== WALL_TYPE || wall.x - wall.width / 2 < 0 || wall.x + wall.width / 2 > worldWidth) return false;
      if (top < ceilingTopPx || bottom > wallFloorPx || wall.height < body.height) return false;
      const placed = [...others(run), nextFloor];
      if (!clear(wall, placed)) return false;
      if (columns(run).some((c) => Math.abs(c.x - wall.x) < (c.width + wall.width) / 2 && Math.abs(c.y - wall.y) < (c.height + wall.height) / 2)) return false;
      const touched = checker.affected(allSteps(run), wall, placed, columns(run));
      if (!stepsHold(touched, [...placed, wall], worldWidth, game, columns(run))) return false;
      if (!arrivalsHold(run, [...placed, wall], columns(run))) return false;
      checker.forget(touched);
      run.ledges.push(wall);
      return true;
    },

    fly(run, from, spec, fixed) {
      const placedNow = (): PlatformData[] => [...others(run), nextFloor];
      /**
       * A wall step is proved from every takeoff shift and press time (route-replay.ts), and those flights part
       * after the kicks. So its ledge goes only where all of them come down through the same row close enough
       * together to land on one ledge: for each variant, its downward moves after the last kick (feet before,
       * feet after, x, highest feet since the kick; a variant need not peak well above the row, only cross it
       * coming down). Null when a variant does not kick the step's walls.
       */
      const variantDescents = (probe: RouteStep): Array<number[]> | null => {
        const all: Array<number[]> = [];
        for (const variant of wallStepVariants()) {
          const moves: number[] = [];
          let left = probe.kicks!.length, since = Infinity, previous = topOf(from);
          const flight = flyStep(probe, placedNow(), worldWidth, game, { updrafts: columns(run), maxSteps: tuning.flightSteps, ...variant,
            onKick: () => { left--; since = Infinity; },
            onState: (state) => {
              const feet = state.y + body.height / 2;
              since = Math.min(since, feet);
              if (left <= 0 && state.vy > 0 && !state.grounded && feet > previous) moves.push(previous, feet, state.x, since);
              previous = feet;
            } });
          if (!(flight.kicks.length === probe.walls!.length && flight.kicks.every((id, i) => id === probe.walls![i]))) return null;
          all.push(moves);
        }
        return all;
      };
      /** Where a variant's feet cross the ledge top `row` coming down after its kicks (arriving falling), or null. */
      const crossingX = (moves: number[], row: number): number | null => {
        for (let i = 0; i < moves.length; i += 4) {
          if (moves[i]! - 1e-6 <= row && row <= moves[i + 1]! + 1e-6) return moves[i + 2]!;
        }
        return null;
      };
      let descents: Array<number[]> | null | undefined;
      for (let attempt = 0; attempt < tuning.flightAttempts; attempt++) {
        let probe: RouteStep;
        if (fixed) probe = { ...fixed };
        else {
          const level = Math.max(config.minChargeLevel, Math.round(between([spec.levels[0], spec.levels[1]])));
          const chargeSteps = chargeStepsFor(level, config.chargeLevels, game);
          let [minX, maxX] = standRange(from);
          if (minX > maxX) return null;
          if (spec.takeoff === 'front' && spec.direction !== 0) {
            const span = (maxX - minX) / 3;
            if (spec.direction > 0) minX = maxX - span; else maxX = minX + span;
          }
          // From a crumbling ledge: a charge that fits its hold time, and a takeoff within walking reach of the landing.
          if ((chargeSteps + 1) * stepMs > crumbleBudgetMs(from)) continue;
          const reach = crumbleReach(run, from, chargeSteps);
          if (reach) {
            if (reach.walkPx < 0) continue;
            minX = Math.max(minX, Math.ceil(reach.arriveX - reach.walkPx));
            maxX = Math.min(maxX, Math.floor(reach.arriveX + reach.walkPx));
            if (minX > maxX) continue;
          }
          probe = { fromId: from.id, toId: '', takeoffX: Math.round(lerp(minX, maxX, random())), chargeSteps, direction: spec.direction,
            ...(reach ? { arriveX: Math.round(reach.arriveX * 100) / 100 } : {}) };
        }
        if (spec.via) probe.via = spec.via;
        if (spec.ride) probe.ride = spec.ride;
        // Trace the flight through everything placed; note where it may come down onto a new ledge.
        const column = spec.ride ? columns(run).find((c) => c.id === spec.ride) : undefined;
        let bounced = !spec.via, entered = false, left = !column, topFeet = topOf(from);
        // A wall step comes down onto its ledge only after its last kick.
        let kicksLeft = probe.kicks?.length ?? 0;
        // Highest feet since the last kick: a ledge is put only where the flight arrives falling after it.
        let topSince = topFeet;
        let previousVy: number | null = null;
        let previousFeet = topFeet;
        // `feet` is a whole-pixel ledge top the feet cross on this physics step (from `previousFeet` down to theirs).
        const spots: Array<{ x: number; feet: number; top: number }> = [];
        const flight = flyStep(probe, placedNow(), worldWidth, game, { updrafts: columns(run), maxSteps: tuning.flightSteps, onKick: () => { kicksLeft--; topSince = Infinity; }, onState: (state) => {
          const feet = state.y + body.height / 2;
          // Only a bounce turns a fall into a rise in mid-air (the first state is the launch itself).
          if (!bounced && previousVy !== null && previousVy >= 0 && state.vy < 0 && !state.grounded) bounced = true;
          previousVy = state.vy;
          if (column) {
            const inside = updraftAt([column], state.x, state.y) !== null;
            if (inside) entered = true; else if (entered) left = true;
          }
          topFeet = Math.min(topFeet, feet);
          topSince = Math.min(topSince, feet);
          const crossed = Math.ceil(previousFeet);
          previousFeet = feet;
          // Like a traced arc (jump-arcs.ts `descentAt`): only once it peaked `apexClearancePx` above, so it arrives falling.
          if (bounced && left && kicksLeft <= 0 && state.vy > 0 && !state.grounded && crossed <= feet && topSince <= crossed - config.apexClearancePx) {
            spots.push({ x: state.x, feet: crossed, top: topFeet });
          }
        } });
        if (spec.via && !flight.bounces.includes(spec.via)) continue;
        if (probe.walls && !(flight.kicks.length === probe.walls.length && flight.kicks.every((id, i) => id === probe.walls![i]))) { if (fixed) return null; continue; }
        const rise = (feet: number): number => topOf(from) - feet;
        const width = Math.round(spec.widthPx);
        const slack = width / 2 - body.width / 2 - config.landingInsetPx;
        if (slack < 0) return null;
        // Only spots a ledge can be put under: at the asked height, inside the chunk, with room to the walls.
        const usable = spots.filter((spot) => rise(spot.feet) >= spec.risePx[0] && rise(spot.feet) <= spec.risePx[1]
          && Math.abs(spot.x - probe.takeoffX) >= Math.max(spec.minDxPx ?? 0, spec.beyondJumpPx === undefined ? 0 : plainReachPx(rise(spot.feet)) + spec.beyondJumpPx)
          && spot.top >= apexLimitTopPx
          && spot.feet >= ceilingTopPx && spot.feet <= floorTopPx
          && spot.x - slack <= worldWidth - width / 2 - 2 && spot.x + slack >= width / 2 + 2);
        // A wall step: keep only the rows every variant crosses close enough together, and aim at their middle.
        // How far the ledge's centre may sit from the spot, by spot (a wall step's variants use up some of the slack).
        const roomAt = new Map<number, number>();
        if (probe.kicks && probe.walls && usable.length) {
          if (descents === undefined || !fixed) descents = variantDescents(probe);
          if (!descents) { if (fixed) return null; continue; }
          const agreed: typeof usable = [];
          for (const spot of usable) {
            const xs = descents.map((moves) => crossingX(moves, spot.feet));
            if (xs.some((x) => x === null)) continue;
            const low = Math.min(spot.x, ...(xs as number[])), high = Math.max(spot.x, ...(xs as number[]));
            // Every variant must come down well over the ledge (its inset may be spent on them, never more).
            const spare = slack + config.landingInsetPx - (high - low) / 2 - 2;
            if (spare < 0) continue;
            agreed.push({ ...spot, x: (low + high) / 2 });
            roomAt.set(agreed.length - 1, Math.min(slack, spare));
          }
          usable.length = 0;
          usable.push(...agreed);
        }
        // A pinned takeoff flies the same way every time: if it gives no spot now, it never will.
        if (!usable.length) { if (fixed) return null; continue; }
        const pick = Math.floor(random() * usable.length);
        const spot = usable[pick]!;
        const room = roomAt.get(pick) ?? slack;
        const centre = Math.round(Math.min(worldWidth - width / 2 - 2, Math.max(width / 2 + 2,
          spot.x + (random() * 2 - 1) * room * (spec.jitter01 ?? 0.6))));
        if (Math.abs(centre - spot.x) > room) continue;
        const id = nextId(run, 'p');
        const top = spot.feet;
        const ledge: PlatformData = { id, x: centre, y: top + config.ledgeHeightPx / 2, width, height: config.ledgeHeightPx, type: 'static' };
        const step: RouteStep = { ...probe, toId: id };
        if (kit.accept(run, { ledge, step, landingX: spot.x, apexTopPx: spot.top })) {
          checker.forget([step]);
          return ledge;
        }
      }
      return null;
    },

    affected: (steps, ledge, ledges, updrafts) => checker.affected(steps, ledge, ledges, updrafts),
    columns: () => [...committed.updrafts],

    takeBack(run) {
      const ledge = run.ledges.pop();
      if (!ledge) return;
      const index = run.steps.findIndex((step) => step.toId === ledge.id);
      if (index >= 0) run.steps.splice(index, 1);
      else run.altSteps = run.altSteps.filter((step) => step.toId !== ledge.id);
    },
  };
  return kit;
}
