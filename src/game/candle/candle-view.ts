/**
 * Draws the procedural candle in the scene: same poses, timing, depth and feet line as the
 * Ruby sprite it replaces (ruby-view.ts), so the scene swaps one for the other in one line.
 *
 * How: one Graphics object at depth 210 holds the candle as filled squares, one per art
 * pixel (FOREST_CONFIG.pixelScale world px each). It moves with setPosition every frame and
 * redraws only when the picture changes (pose frame, flame frame, facing, size or growth).
 * Reads only player state, the light radius and the wax growth: it never feeds movement.
 *
 * What leaves the candle (landing droplets, breath, wick smoke, flight sparks) goes into a second
 * Graphics object that never moves: each is pinned to the world point it was shed at (detached.ts),
 * so it falls and fades there while the candle moves on. The body, flame, hanging drips and the
 * emote signs stay in the first object and follow the candle.
 *
 * The view also keeps the candle's expression (expression.ts): it notices hard landings itself and
 * the scene reports wax pickups and new best heights through `cheer()` and `celebrate()`.
 */
import type * as Phaser from 'phaser';
import { FOREST_CONFIG } from '../../config/forest.config';
import { snapToGrid } from '../forest/pixel-grid-snap';
import type { PlayerState } from '../player/types';
import { createCandleGenome, type CandleGenome } from './candle-genome';
import { bodyShape, INITIAL_POSE, poseFrame, slumpShape, stepPose, type BodyShape, type PoseTracker } from './candle-pose';
import { rasterCandle, type Pixel } from './candle-raster';
import { makeAnchor, pinPerCycle, stepShed, toWorld, type Anchor, type Pinned, type Shed, type WorldPixel } from './detached';
import { type Aim, flameLean, flightSparks, fullChargeTremble, wickLean } from './direction-cues';
import type { Surroundings } from './awareness';
import { BREATH_EVERY_MS, BREATH_MS, coldBreath, DROPLET_MS, emotePixels, flowNote, landingDroplets } from './emotes';
import { faceFor, INITIAL_EXPRESSION, stepExpression, type CandleFace, type ExpressionEvents, type ExpressionTracker } from './expression';
import { fallIntensity, FLAME_FPS, flameSizeFromRadius, flickerRate, rasterFlame, wickSmoke, wickSmokePuffs } from './flame';

/** The light, the wax growth and the settings the candle draws from this frame. */
export interface CandleLook {
  ember?: boolean;
  corruptedEmber?: boolean;
  radiusPx: number;
  /** The lantern rule's caps, so the flame spans its full range. */
  minRadiusPx: number;
  maxRadiusPx: number;
  /** 1 with no wax; see growth.ts. */
  growth: number;
  /** 0..1 of a full jump charge. */
  charge01: number;
  /** Direction held this step (-1, 0, 1): shows where a charged jump will go. */
  aim: Aim;
  reducedMotion: boolean;
  /** 0..1 fuel left, for the worried look. Optional: a full candle by default. */
  fuel01?: number;
  /** 0..1 through the last moment of a run, after the wick has gone cold: the candle slumps and its eyes close. */
  spent01?: number;
  /** What the candle notices around it (awareness.ts): where to look, and whether it is sliding on ice. */
  around?: Surroundings;
  /** 0..1 how much the candle has melted over the run (its drips grow). Optional: not melted by default. */
  melt01?: number;
  /** True in the cold (a snow band): the candle's breath shows. */
  cold?: boolean;
  /** True while the candle is in flow (several clean jumps in a row): it hums. */
  flow?: boolean;
  /** True while a fall has left the candle shaken (endless composure): wide darting eyes. */
  shaken?: boolean;
  /** True while it stands still to steady itself: eyes shut, a slow breath. */
  steadying?: boolean;
}

/** A bead of wax runs down a drip for `BEAD_RUN_MS` once every `BEAD_EVERY_MS`, in `BEAD_STEPS` steps. */
const BEAD_EVERY_MS = 5200;
const BEAD_RUN_MS = 1300;
const BEAD_STEPS = 6;

/** Landing faster than this (px/s, downward) makes the candle wince. */
const HARD_LANDING_PX_S = 620;
/** Between these landing speeds (px/s) the wince grows into a daze: about a 3 m fall to a 9 m one. */
const DAZE_FROM_PX_S = 900;
const DAZE_FULL_PX_S = 1500;

/** How long the flame leaps after a happy moment, and how long it stays pressed down after a landing (ms). */
const FLARE_MS = 520;
const DUCK_MS = 240;
/** Flare, duck and gather are drawn in this many steps, so the picture is redrawn only when one changes visibly. */
const REACTION_STEPS = 5;

/** Emotes are anchored this many art px to the right of the wick. */
const EMOTE_OFFSET_X = 6;

/** Size steps for the flame: enough to look smooth in pixel art, few enough to redraw rarely. */
const SIZE_STEPS = 24;
const DEPTH = 210;
/** Flight sparks are shed once per flame frame and linger this long (two flame frames), pinned where they were shed. */
const SPARK_LIFE_MS = (2 * 1000) / FLAME_FPS;

/** What a landing knocked off: how hard, and the candle's size and wax colour at that moment. */
interface Landing { impact: number; halfWidth: number; height: number; color: number }
/** A puff of cold breath: the candle's facing and size when it was breathed out. */
interface Breath { cycle: number; anchor: Anchor; facingLeft: boolean; halfWidth: number; height: number }

export function createCandleView(scene: Phaser.Scene, bodyHeight: number, seed: number) {
  const graphics = scene.add.graphics().setDepth(DEPTH);
  /** Everything shed by the candle, drawn in world px and never moved. Added after the candle so it draws over it. */
  const shedGraphics = scene.add.graphics().setDepth(DEPTH);
  const px = FOREST_CONFIG.pixelScale;
  let genome: CandleGenome = createCandleGenome(seed);
  let tracker: PoseTracker = INITIAL_POSE;
  let clockMs = 0;
  let lastShape: BodyShape = bodyShape(INITIAL_POSE, 0);
  let drawnKey = '';
  let expression: ExpressionTracker = INITIAL_EXPRESSION;
  let lastFace: CandleFace | undefined;
  /** Moments reported since the last frame; cleared once the expression has seen them. */
  let pending: ExpressionEvents = {};
  /** Downward speed in the last airborne frame, to judge how hard a landing was. */
  let airVy = 0;
  let flareMs = 0;
  let duckMs = 0;
  /** How hard the landing that started the current duck was, 0..1. */
  let duckStrength = 0;
  /** Time since the latest landing, for the wax droplets it knocks off. */
  let lastReactions = { flare01: 0, duck01: 0, gather01: 0 };
  let lastMelting: { melt01: number; bead01: number | undefined } = { melt01: 0, bead01: undefined };
  let landings: Shed<Landing>[] = [];
  let sparkShed: Shed<Pixel[]>[] = [];
  let lastSparkFrame = -1;
  let breath: Breath | undefined;
  const smokeAnchors = new Map<number, Pinned>();
  /** The wick tip of the last drawn body, art px from the feet; it only changes when the body is redrawn. */
  let wickTip = { x: 0, y: 0 };
  let shedKey = '';

  return {
    /** A new candle (a new run). */
    reseed(next: number): void {
      genome = createCandleGenome(next);
      tracker = INITIAL_POSE;
      expression = INITIAL_EXPRESSION;
      pending = {};
      drawnKey = '';
      landings = []; sparkShed = []; breath = undefined; smokeAnchors.clear(); lastSparkFrame = -1;
      shedKey = ''; shedGraphics.clear();
    },
    /** Wax was picked up: a short delighted look. */
    cheer(): void { pending.wax = true; },
    /** Wax relit a wick that was only glowing: a breath of relief, and the flame bursts back. */
    relit(): void { pending.relit = true; pending.wax = true; },
    /** A new best height: a short proud look. */
    celebrate(): void { pending.newBest = true; },
    /** The face drawn this frame, so the portrait shows the same expression. */
    face: (): CandleFace | undefined => lastFace,
    /** How melted the candle looks this frame and where the running bead is, so the portrait shows the same. */
    melting: (): { melt01: number; bead01: number | undefined } => lastMelting,
    /** The flame's reactions this frame, so the portrait's flame leaps, ducks and gathers with the hero's. */
    reactions: (): { flare01: number; duck01: number; gather01: number } => lastReactions,
    seed: (): number => genome.seed,
    /** The current candle's genome, so the portrait draws the same candle. */
    genome: (): CandleGenome => genome,
    /** The body shape drawn this frame, so the bottom-left portrait can copy the hero's squash and stretch. */
    shape: (): BodyShape => lastShape,
    update(state: PlayerState, deltaMs: number, paused: boolean, look: CandleLook): void {
      const landedNow = state.grounded && !tracker.wasGrounded;
      tracker = stepPose(tracker, { ...state, aim: look.aim }, deltaMs, paused);
      // Falling feeds the flame air: its flicker clock runs up to 2.5x faster (flame.ts).
      const fall01 = Math.round(fallIntensity(state.grounded, state.vy) * 10) / 10;
      if (!paused) clockMs += Math.max(0, deltaMs) * flickerRate(fall01);
      // At full charge the whole candle trembles an art pixel either way: the picture is not redrawn, only moved.
      const tremble = fullChargeTremble(state.charging, look.charge01, look.reducedMotion ? 0 : Math.floor((clockMs / 1000) * FLAME_FPS), look.reducedMotion);
      // Drawn on the art grid (pixel-grid-snap.ts), like the ledges it stands on; the body's own position stays exact.
      const gx = snapToGrid(state.x) + tremble * px;
      const gy = snapToGrid(state.y + bodyHeight / 2);
      graphics.setPosition(gx, gy);
      const feet = makeAnchor(gx, gy);

      const size01 = Math.round(flameSizeFromRadius(look.radiusPx, look.minRadiusPx, look.maxRadiusPx) * SIZE_STEPS) / SIZE_STEPS;
      const flameFrame = look.reducedMotion ? 0 : Math.floor((clockMs / 1000) * FLAME_FPS);
      const cue = { charging: state.charging, charge01: look.charge01, aim: look.aim, grounded: state.grounded, vx: state.vx, vy: state.vy };
      // Direction cues never bend the body: only the wick tilts, the flame leans and sparks trail.
      // Five steps are plenty for a two-pixel slump, and keep the redraws few.
      const spent01 = Math.round(Math.min(Math.max(look.spent01 ?? 0, 0), 1) * 5) / 5;
      const shape = slumpShape({ ...bodyShape(tracker, look.charge01), lean: wickLean(cue) }, spent01);
      lastShape = shape;
      if (landedNow && airVy > HARD_LANDING_PX_S) {
        pending.hardLanding = true;
        pending.daze01 = Math.min(1, Math.max(0, (airVy - DAZE_FROM_PX_S) / (DAZE_FULL_PX_S - DAZE_FROM_PX_S)));
      }
      const dt = paused ? 0 : Math.max(0, deltaMs);
      if (pending.wax || pending.newBest) flareMs = FLARE_MS;
      if (landedNow) { duckMs = DUCK_MS; duckStrength = 0.35 + 0.65 * (tracker.impact01 ?? 0); }
      flareMs = Math.max(0, flareMs - dt);
      duckMs = Math.max(0, duckMs - dt);
      const steps = (value: number): number => Math.round(Math.min(Math.max(value, 0), 1) * REACTION_STEPS) / REACTION_STEPS;
      // Reduced motion keeps the charge gathering (it carries information) and drops the two bounces.
      const flare01 = look.reducedMotion ? 0 : steps(flareMs / FLARE_MS);
      const duck01 = look.reducedMotion ? 0 : steps((duckMs / DUCK_MS) * duckStrength);
      const gather01 = state.charging ? steps(look.charge01) : 0;
      if (lastReactions.flare01 !== flare01 || lastReactions.duck01 !== duck01 || lastReactions.gather01 !== gather01) lastReactions = { flare01, duck01, gather01 };
      airVy = state.grounded ? 0 : state.vy;
      const lit = !look.ember;
      const mood = { pose: tracker.pose, charge01: look.charge01, fall01, aim: look.aim, facingLeft: tracker.facingLeft,
        fuel01: look.fuel01 ?? 1, lit, reducedMotion: look.reducedMotion, spent: spent01 > 0,
        sliding: look.around?.sliding, look: look.around?.look, flow: look.flow && !look.shaken,
        shaken: look.shaken, steadying: look.steadying };
      expression = stepExpression(expression, mood, pending, deltaMs, paused);
      pending = {};
      const face = faceFor(expression, mood, genome.seed);
      lastFace = face;
      // The wax cools as the fuel runs low: warm above 40%, cold with the flame out.
      const warmth01 = !lit ? 0 : Math.round(Math.min(1, 0.35 + (look.fuel01 ?? 1) * 1.65) * 10) / 10;
      // Emotes are drawn at the flame's frame rate, like the rest of the candle's animation.
      const emoteMs = Math.floor(expression.moodMs / (1000 / FLAME_FPS)) * (1000 / FLAME_FPS);
      // A mood's own sign comes first; in flow, and with no louder sign showing, the candle hums a note.
      const moodEmotes = emotePixels(expression.mood, emoteMs, look.reducedMotion);
      const emotes = moodEmotes.length === 0 && look.flow && !look.shaken && !look.steadying && lit && expression.mood !== 'fading'
        ? flowNote(Math.floor(clockMs / (1000 / FLAME_FPS)) * (1000 / FLAME_FPS), look.reducedMotion) : moodEmotes;
      const size = { halfWidth: Math.ceil((genome.width * Math.max(1, look.growth)) / 2), height: Math.round(genome.height * Math.max(1, look.growth)) };
      // A landing sheds its droplets at the feet where it happened; each landing keeps its own anchor.
      landings = stepShed(landings, dt, DROPLET_MS, landedNow
        ? { anchor: feet, data: { impact: tracker.impact01 ?? 0, halfWidth: size.halfWidth, height: size.height, color: genome.wax.light } } : undefined);
      const world: WorldPixel[] = [];
      const halfFrame = 1000 / FLAME_FPS / 2;
      for (const l of landings) {
        world.push(...toWorld(l.anchor, landingDroplets(genome.seed, Math.floor(l.ageMs / halfFrame) * halfFrame, l.data.impact,
          l.data.halfWidth, l.data.height, l.data.color, look.reducedMotion), px));
      }
      // Melting: drips lengthen in a few steps over the run, and now and then a bead runs down one (not under reduced motion).
      const melt01 = Math.round(Math.min(Math.max(look.melt01 ?? 0, 0), 1) * 3) / 3;
      const beadAt = clockMs % BEAD_EVERY_MS;
      const bead01 = lit && !look.reducedMotion && beadAt < BEAD_RUN_MS ? Math.floor((beadAt / BEAD_RUN_MS) * BEAD_STEPS) / (BEAD_STEPS - 1) : undefined;
      if (lastMelting.melt01 !== melt01 || lastMelting.bead01 !== bead01) lastMelting = { melt01, bead01 };
      // Breath in the cold, only breathed out while standing or walking with the flame lit; it then stays where it left the mouth.
      const breathCycle = Math.floor(clockMs / BREATH_EVERY_MS);
      const breathing = clockMs % BREATH_EVERY_MS < BREATH_MS;
      if (look.cold && lit && state.grounded && !state.charging && breathing && breath?.cycle !== breathCycle) {
        breath = { cycle: breathCycle, anchor: feet, facingLeft: tracker.facingLeft, halfWidth: size.halfWidth, height: size.height };
      }
      if (breath && breath.cycle === breathCycle && breathing) {
        world.push(...toWorld(breath.anchor, coldBreath(Math.floor(clockMs / 100) * 100, breath.facingLeft, breath.halfWidth, breath.height, look.reducedMotion), px));
      }
      const lean = flameLean(cue);
      const key = `${look.ember}|${look.corruptedEmber}|${tracker.pose}|${poseFrame(tracker)}|${JSON.stringify(shape)}|${tracker.facingLeft}|${look.growth}|${size01}|${flameFrame}|${lean}|${fall01}|${JSON.stringify(face)}|${flare01}|${duck01}|${gather01}|${warmth01}|${JSON.stringify(emotes)}|${spent01}|${melt01}|${bead01}`;
      if (key !== drawnKey) {
        drawnKey = key;
        // The flame lights the top of the body; a glowing wick barely does.
        const body = rasterCandle(genome, shape, look.growth, tracker.facingLeft, { face, glow01: lit ? 0.35 + 0.65 * size01 : 0.08, warmth01, melt01, bead01 });
        // The flame is drawn from the frame's own time so it matches the frame index above.
        const flame = rasterFlame(genome, { size01, timeMs: (flameFrame * 1000) / FLAME_FPS, reducedMotion: look.reducedMotion, lean, fall01, flare01, duck01, gather01 });
        graphics.clear();
        for (const p of body.pixels) {
          graphics.fillStyle(p.color, 1);
          graphics.fillRect(p.x * px, p.y * px, px, px);
        }
        // A dead wick keeps a glowing tip and lets off smoke.
        // The glow on the wick dies halfway through the last moment; the smoke goes on.
        const emberTip = spent01 > 0.5 ? [] : [{ x: 0, y: -1, color: look.corruptedEmber ? 0xb74038 : spent01 > 0 ? 0x8a3f22 : 0xd58138 }];
        // Smoke is shed into the world (below); only the one still wisp of reduced motion stays on the wick.
        const light = look.ember ? [...emberTip, ...(look.reducedMotion ? wickSmoke(genome, 0, true) : [])] : flame;
        for (const p of light) {
          graphics.fillStyle(p.color, 1);
          graphics.fillRect((body.wickTip.x + p.x) * px, (body.wickTip.y + p.y) * px, px, px);
        }
        // Beside the flame, always on the right, so the glyphs (a z, an exclamation mark) are never mirrored.
        for (const p of emotes) {
          graphics.fillStyle(p.color, 1);
          graphics.fillRect((body.wickTip.x + EMOTE_OFFSET_X + p.x) * px, (body.wickTip.y + p.y) * px, px, px);
        }
        wickTip = body.wickTip;
      }
      // The wick tip's world point: where smoke and sparks are let go.
      const tip = makeAnchor(gx + wickTip.x * px, gy + wickTip.y * px);

      // Sparks left behind in flight: shed once per flame frame, each set pinned where it was shed.
      const shedSparks = !look.ember && flameFrame !== lastSparkFrame ? flightSparks(genome, cue, flameFrame, look.reducedMotion) : [];
      lastSparkFrame = flameFrame;
      sparkShed = stepShed(sparkShed, dt, SPARK_LIFE_MS, shedSparks.length > 0 ? { anchor: tip, data: shedSparks } : undefined);
      for (const s of sparkShed) world.push(...toWorld(s.anchor, s.data, px));
      // Smoke off a dead wick: each puff is pinned where it was born at the wick and drifts up from there.
      if (look.ember && !look.reducedMotion) {
        for (const puff of wickSmokePuffs(genome, (flameFrame * 1000) / FLAME_FPS)) {
          world.push(...toWorld(pinPerCycle(smokeAnchors, puff.index, puff.cycle, tip), [puff.pixel], px));
        }
      } else smokeAnchors.clear();

      const nextShedKey = JSON.stringify(world);
      if (nextShedKey !== shedKey) {
        shedKey = nextShedKey;
        shedGraphics.clear();
        for (const p of world) {
          shedGraphics.fillStyle(p.color, 1);
          shedGraphics.fillRect(p.x, p.y, px, px);
        }
      }
    },
    destroy(): void { graphics.destroy(); shedGraphics.destroy(); },
  };
}
