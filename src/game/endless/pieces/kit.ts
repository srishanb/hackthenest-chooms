/**
 * The piece kit: the shared tools every set piece builds with, one kit per try at a chunk.
 *
 * Why one kit: every piece must obey the same rules, and they are easy to get subtly wrong. A ledge is
 * only kept when (1) a real traced jump arc (jump-arcs.ts) or walk-off fall lands on it, (2) it sits
 * inside the walls and between this chunk's anchor and the next, (3) it keeps its distance from every
 * other ledge, (4) the jump peaks low enough that no ledge of the next chunk can catch it, and (5) every
 * step of the chunk so far, this one included, replays onto its own ledge with `stepPlayer`
 * (route-replay.ts). Pieces only describe shapes; the kit decides what is kept.
 */
import type { GameConfig } from '../../../shared/contracts/config';
import type { PlatformData } from '../../../shared/contracts/content';
import type { EndlessConfig } from '../../../config/endless.config';
import type { EndlessPiecesConfig } from '../../../config/endless-pieces.config';
import { stepPlayer } from '../../player/movement';
import { descentAt, standOn, type JumpArc } from '../jump-arcs';
import { replayStep, stepsHold, type RouteStep } from '../route-replay';
import type { Candidate, DropSpec, JumpSpec, PieceFeature, PieceKit, PieceRun } from './types';

/** What has been laid in this chunk before the current piece: the anchor first. */
export interface Committed {
  ledges: PlatformData[];
  steps: RouteStep[];
  altSteps: RouteStep[];
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
}

const IDLE = { left: false, right: false, jump: false };
const topOf = (platform: { y: number; height: number }): number => platform.y - platform.height / 2;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** An empty run of ledges for one piece. */
export function emptyRun(): PieceRun {
  return { ledges: [], steps: [], altSteps: [], waxOn: [] };
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

export function createPieceKit(setup: KitSetup): GeneratorKit {
  const { random, index, game, config, tuning, arcs, committed, nextFloor } = setup;
  const worldWidth = game.view.width;
  const body = game.player;
  const nextTop = topOf(nextFloor);
  const meanWidth = lerp(config.width.easyPx, config.width.hardPx, setup.difficulty);
  const maxRisePx = lerp(config.rise.easyMaxPx, config.rise.hardMaxPx, setup.difficulty);
  const ceilingTopPx = nextTop + config.finalRise.minPx;
  const floorTopPx = setup.floorTopPx - config.rise.minPx;
  // A jump's feet must stay below every ledge of the next chunk but its anchor (all at least
  // `rise.minPx` above that anchor), so a chunk built alone can never be caught by the next one.
  const apexLimitTopPx = nextTop - config.rise.minPx + config.apexClearancePx;

  const between = (range: readonly [number, number]): number => lerp(range[0], range[1], random());
  const others = (run: PieceRun): PlatformData[] => [...committed.ledges, ...run.ledges];
  const allSteps = (run: PieceRun): RouteStep[] => [...run.steps, ...run.altSteps, ...committed.steps, ...committed.altSteps];

  /** Where the body can stand on `ledge`, inside the walls, wherever a moving ledge is in its travel. */
  const standRange = (ledge: PlatformData): [number, number] => {
    const travel = ledge.motion?.distance ?? 0;
    return [
      Math.max(body.width / 2 + 1, ledge.x - ledge.width / 2 + travel + body.width / 2 + 2),
      Math.min(worldWidth - body.width / 2 - 1, ledge.x + ledge.width / 2 - travel - body.width / 2 - 2),
    ];
  };

  const nextId = (run: PieceRun, kind: 'p' | 'a'): string => {
    const prefix = `e${index}:${kind}`;
    const used = others(run).filter((ledge) => ledge.id.startsWith(prefix)).length;
    return `${prefix}${used + 1}`;
  };

  /** True when `candidate` keeps the required distance from every ledge in `placed`. */
  const clear = (candidate: PlatformData, placed: readonly PlatformData[]): boolean => {
    for (const other of placed) {
      if (other.id === candidate.id) continue;
      // A ledge that slides needs its whole travel kept clear, not only where it rests.
      const travel = (other.motion?.distance ?? 0) + (candidate.motion?.distance ?? 0);
      const gapX = Math.abs(candidate.x - other.x) - (candidate.width + other.width) / 2 - travel;
      const gapY = Math.abs(topOf(candidate) - topOf(other));
      if (gapX < config.sideClearancePx && gapY < config.stackClearancePx) return false;
    }
    return true;
  };

  /** Inside the walls (over its whole travel) and between the chunk's floor limit and ceiling. */
  const inBounds = (ledge: PlatformData): boolean => {
    const travel = ledge.motion?.distance ?? 0;
    const top = topOf(ledge);
    return ledge.x - ledge.width / 2 - travel >= 0 && ledge.x + ledge.width / 2 + travel <= worldWidth
      && top >= ceilingTopPx && top <= floorTopPx && ledge.width >= 1;
  };

  const kit: GeneratorKit = {
    random, index, difficulty: setup.difficulty, features: setup.features, game, config, tuning, worldWidth,
    maxRisePx, ceilingTopPx, floorTopPx,
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
      for (const arc of table) {
        if (arc.level < Math.max(low, config.minChargeLevel) || arc.level > high) continue;
        const hit = descentAt(arc, risePx, config.apexClearancePx);
        if (hit && hit.after.dx >= (spec.minDxPx ?? 0)) usable.push({ arc, dx: hit.after.dx });
      }
      if (!usable.length) return null;
      const pick = usable[Math.floor(random() * usable.length)]!;
      let [minX, maxX] = standRange(from);
      if (minX > maxX) return null;
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
      const step: RouteStep = { fromId: from.id, toId: id, takeoffX, chargeSteps: pick.arc.chargeSteps, direction };
      return { ledge, step, landingX, apexTopPx: topOf(from) - pick.arc.apexPx };
    },

    drop(run, from, spec) {
      if (from.motion || from.type === 'slippery') return null;
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
      const all = [...placed, ledge, nextFloor];
      // The new step first: it is the one most likely to miss.
      if (!stepsHold([step, ...allSteps(run)], all, worldWidth, game)) return false;
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
      const toward: -1 | 1 = target.x >= from.x ? 1 : -1;
      const away = -toward as -1 | 1;
      const directions: Array<-1 | 0 | 1> = random() < 0.5 ? [toward, 0, away] : [0, toward, away];
      const all = [...others(run), nextFloor];
      if (!all.includes(target)) all.push(target);
      for (const direction of directions) {
        for (const arc of direction === 0 ? arcs.up : arcs.side) {
          if (arc.level < config.minChargeLevel || topOf(from) - arc.apexPx < apexLimitTopPx) continue;
          const hit = descentAt(arc, risePx, config.apexClearancePx);
          if (!hit) continue;
          const dx = direction * hit.after.dx;
          // Aim somewhere inside the target, then at its middle if that misses.
          for (const aim of [(random() * 2 - 1) * slack, 0]) {
            const takeoffX = Math.round(target.x + aim - dx);
            if (takeoffX < minX || takeoffX > maxX) continue;
            const step: RouteStep = { fromId: from.id, toId: target.id, takeoffX, chargeSteps: arc.chargeSteps, direction };
            if (replayStep(step, all, worldWidth, game) !== target.id) continue;
            if (!stepsHold([step, ...allSteps(run)], all, worldWidth, game)) continue;
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
      if (!stepsHold(allSteps(run), [...ledges, nextFloor], worldWidth, game)) return null;
      run.ledges[at] = moved;
      return moved;
    },

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
