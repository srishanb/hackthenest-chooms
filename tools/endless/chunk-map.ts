/**
 * Looks at the endless climb's set pieces without a browser: `npx tsx tools/endless/chunk-map.ts`.
 *
 * Why: a screenshot shows one screen, and a chunk is almost two screens tall. This prints chunks as text
 * maps with each ledge labelled by the set piece that laid it, and can also measure what the pieces do
 * to the climb. Development only; nothing in the game imports it.
 *
 *   --seed 42 --chunks 0,3,6     text maps of those chunks (default seed 42, chunks 0..9)
 *   --bot 300 [--start 6]        the route bot climbs headless for that many seconds from a chunk's anchor
 *                                (with wax growth, as in the game; --no-growth leaves it out; --plain uses no pieces) and prints its
 *                                height every 5 s and any stall (30 s without a new best height)
 *   --compare                    set pieces against the plain ladder (no pieces): ledges, jumps and
 *                                wax per chunk, and the height lost when a jump is missed by a charge level
 *   --time [--plain]             generation time per chunk, average and worst, over many seeds
 *
 * Map legend: one character is 12 px across and 20 px down. Each ledge is drawn with its piece's
 * letter (see LETTERS); `#` is an anchor, `s` an optional side ledge, lower case marks a fork's
 * alternative branch, `~` after a ledge means it slides, `*` that it is icy, `v` a drop step's takeoff,
 * `%` that it crumbles; `o` is a bounce cap, and `:` the left and right sides of an updraft column.
 */
import { ENDLESS_CONFIG as C } from '../../src/config/endless.config';
import { ENDLESS_PIECES_CONFIG as T } from '../../src/config/endless-pieces.config';
import { GAME_CONFIG as G } from '../../src/config/game.config';
import { WAX_CONFIG } from '../../src/config/wax.config';
import type { PlatformData } from '../../src/shared/contracts/content';
import { grownMovement, waxGrowth } from '../../src/game/candle/growth';
import { createChunkStream } from '../../src/game/endless/chunk-stream';
import { createEndlessGenerator, type EndlessChunk } from '../../src/game/endless/generator';
import { createRouteBot } from '../../src/game/endless/route-bot';
import { NO_CRUMBLE } from '../../src/game/player/crumble';
import { stepPlayer, teleportPlayer } from '../../src/game/player/movement';
import { stepWorld } from '../../src/game/player/world-step';
import type { PlayerState } from '../../src/game/player/types';
import { platformsAt } from '../../src/game/world/environment';

const LETTERS: Record<string, string> = {
  ladder: 'L', staircase: 'S', traverse: 'T', zigzag: 'Z', detour: 'D', pillars: 'P', 'big-leap': 'B',
  fork: 'F', 'ice-run': 'I', 'moving-crossing': 'M', approach: 'A',
  'mushroom-launch': 'O', 'crumbling-run': 'C', 'updraft-rise': 'R', 'updraft-crossing': 'X',
};
const CELL_X = 12;
const CELL_Y = 20;
const STEP_MS = 1000 / G.stepHz;
const topOf = (p: { y: number; height: number }): number => p.y - p.height / 2;

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const at = args.indexOf(`--${name}`);
  return at < 0 ? undefined : args[at + 1] && !args[at + 1]!.startsWith('--') ? args[at + 1] : '';
};
const seed = Number(flag('seed') ?? 42);

/** One chunk as a text map, top row first, with the piece list under it. */
function drawChunk(chunk: EndlessChunk, next: PlatformData): string {
  const cols = Math.ceil(G.view.width / CELL_X);
  const topY = topOf(next) - CELL_Y;
  const rows = Math.ceil((chunk.floorTopPx - topY) / CELL_Y) + 1;
  const grid = Array.from({ length: rows }, () => Array<string>(cols).fill(' '));
  const pieceOf = new Map<string, string>();
  for (const span of chunk.pieces) for (const id of span.ledgeIds) pieceOf.set(id, span.id);
  const alt = new Set(chunk.altRoute.map((step) => step.toId));
  const put = (ledge: PlatformData, char: string): void => {
    const row = Math.round((topOf(ledge) - topY) / CELL_Y);
    const from = Math.max(0, Math.floor((ledge.x - ledge.width / 2) / CELL_X));
    const to = Math.min(cols - 1, Math.ceil((ledge.x + ledge.width / 2) / CELL_X) - 1);
    if (row < 0 || row >= rows) return;
    for (let c = from; c <= to; c++) grid[row]![c] = char;
    const mark = ledge.motion ? '~' : ledge.type === 'slippery' ? '*' : ledge.type === 'crumbling' ? '%' : '';
    if (mark && to + 1 < cols) grid[row]![to + 1] = mark;
  };
  put(next, '#');
  for (const column of chunk.updrafts) {
    const left = Math.max(0, Math.floor((column.x - column.width / 2) / CELL_X));
    const right = Math.min(cols - 1, Math.floor((column.x + column.width / 2) / CELL_X));
    for (let r = 0; r < rows; r++) {
      const y = topY + r * CELL_Y;
      if (Math.abs(y - column.y) > column.height / 2) continue;
      grid[r]![left] = ':'; grid[r]![right] = ':';
    }
  }
  for (const ledge of chunk.platforms) {
    if (ledge.id.endsWith(':floor')) { put(ledge, '#'); continue; }
    if (ledge.type === 'bounce') { put(ledge, 'o'); continue; }
    if (ledge.id.includes(':s')) { put(ledge, 's'); continue; }
    const letter = LETTERS[pieceOf.get(ledge.id) ?? ''] ?? '?';
    put(ledge, alt.has(ledge.id) && !chunk.route.some((step) => step.toId === ledge.id) ? letter.toLowerCase() : letter);
  }
  for (const step of chunk.route) {
    if (step.kind !== 'drop') continue;
    const from = chunk.platforms.find((ledge) => ledge.id === step.fromId)!;
    const row = Math.round((topOf(from) - topY) / CELL_Y) - 1;
    if (row >= 0) grid[row]![Math.floor(step.takeoffX / CELL_X)] = 'v';
  }
  const lines = grid.map((row, r) => `${String(Math.round(chunk.floorTopPx - (topY + r * CELL_Y))).padStart(5)} |${row.join('')}|`);
  const pieces = chunk.pieces.map((span) => {
    const steps = chunk.route.slice(span.firstStep, span.firstStep + span.stepCount)
      .map((step) => (step.kind === 'drop' ? 'drop'
        : `j${step.chargeSteps}${step.direction < 0 ? '<' : step.direction > 0 ? '>' : '^'}${step.via ? ' (bounce)' : step.ride ? ' (ride)' : ''}`));
    const alt = span.altSteps.length ? ` | other way: ${span.altSteps.map((step) => `j${step.chargeSteps}`).join(' ')}` : '';
    return `  ${LETTERS[span.id] ?? '?'} ${span.id.padEnd(16)} ${steps.join(' ')}${alt}`;
  });
  return [`seed ${seed}, chunk ${chunk.index} (height above its anchor in px on the left; j<steps> = jump held that many 1/120 s steps)`,
    ...lines, ...pieces, ''].join('\n');
}

/** The route bot climbing headless, as in the game: moving ledges move, wax is collected and grows the candle. */
function botClimb(seconds: number, startChunk: number): string {
  const generator = flag('plain') !== undefined
    ? createEndlessGenerator(seed, G, C, { ...T, sideLedgeScale: 1, pathWaxScale: 1 }, []) : createEndlessGenerator(seed, G, C);
  const stream = createChunkStream(generator, C);
  const bot = createRouteBot();
  const anchor = generator.floor(startChunk);
  let state = teleportPlayer(anchor.x, topOf(anchor) - G.player.height / 2);
  const feet = (): number => state.y + G.player.height / 2;
  const startFeet = feet();
  const taken = new Set<string>();
  const out: string[] = [];
  let best = 0;
  let bestAtMs = 0;
  let stalls = 0;
  let crumble = NO_CRUMBLE;
  stream.update(feet());
  for (let ms = 0; ms <= seconds * 1000; ms += STEP_MS) {
    const platforms = platformsAt(stream.platforms(), ms, STEP_MS);
    const movement = flag('no-growth') !== undefined ? G : grownMovement(G, waxGrowth(taken.size, WAX_CONFIG.growthPerWax, WAX_CONFIG.growthCapWax));
    const input = bot.input(state, stream.chunks().flatMap((chunk) => chunk.route), (id) => platforms.find((p) => p.id === id), { base: G, current: movement });
    // The game's own step: crumbling ledges and updraft columns as in the scene.
    const stepped = stepWorld(state, crumble, input, platforms, stream.updrafts(), G.view.width, movement, STEP_MS);
    state = stepped.player; crumble = stepped.crumble;
    stream.update(feet(), 2 * Math.max(0, state.vy) / G.stepHz);
    for (const drop of stream.wax()) {
      if (Math.abs(state.x - drop.x) <= G.player.width / 2 + WAX_CONFIG.pickupRadiusPx
        && Math.abs(state.y - drop.y) <= G.player.height / 2 + WAX_CONFIG.pickupRadiusPx) taken.add(drop.id);
    }
    const height = Math.round(startFeet - feet());
    if (state.grounded && height > best) { best = height; bestAtMs = ms; }
    if (ms - bestAtMs > 30_000) {
      const chunk = stream.chunks().find((c) => c.platforms.some((p) => p.id === state.platformId));
      const span = chunk?.pieces.find((s) => s.ledgeIds.includes(state.platformId ?? '') || s.entryId === state.platformId);
      out.push(`  STALL at ${(ms / 1000).toFixed(0)} s on ${state.platformId} (piece ${span?.id ?? '?'})`);
      stalls++;
      bestAtMs = ms;
      if (stalls > 3) break;
    }
    if (Math.round(ms) % 5000 === 0) out.push(`  ${String(Math.round(ms / 1000)).padStart(4)} s  height ${String(height).padStart(6)} px  best ${best}  chunk ${stream.indexAt(feet())}  wax ${taken.size}`);
  }
  return [`route bot, seed ${seed}, from chunk ${startChunk}:`, ...out, `  stalls: ${stalls}`].join('\n');
}

/** Ledges, jumps and wax per chunk, and the height lost when a jump is held one charge level too short or too long. */
function compare(): string {
  const rows: string[] = [];
  const plainTuning = { ...T, sideLedgeScale: 1, pathWaxScale: 1 };
  for (const [name, make] of [
    ['plain ladder', (s: number) => createEndlessGenerator(s, G, C, plainTuning, [])],
    ['set pieces', (s: number) => createEndlessGenerator(s, G, C)],
  ] as const) {
    let chunks = 0, ledges = 0, steps = 0, wax = 0, misses = 0, lost = 0, overChunk = 0;
    for (let s = 1; s <= 12; s++) {
      const generator = make(s * 101);
      const all = [...Array.from({ length: 12 }, (_, i) => generator.chunk(i).platforms).flat(), generator.floor(12)];
      for (let index = 1; index < 11; index++) {
        const chunk = generator.chunk(index);
        chunks++; ledges += chunk.platforms.length; steps += chunk.route.length; wax += chunk.wax.length;
        for (const step of chunk.route) {
          if (step.kind === 'drop') continue;
          const from = all.find((p) => p.id === step.fromId)!;
          for (const off of [-12, 12]) {
            let state: PlayerState = { ...teleportPlayer(step.takeoffX, topOf(from) - G.player.height / 2), grounded: true, platformId: from.id, jumpLatch: false };
            for (let k = 0; k < Math.max(1, step.chargeSteps + off); k++) state = stepPlayer(state, { left: false, right: false, jump: true }, all, G.view.width, G, STEP_MS).state;
            state = stepPlayer(state, { left: step.direction < 0, right: step.direction > 0, jump: false }, all, G.view.width, G, STEP_MS).state;
            for (let k = 0; k < 20_000 && !state.grounded; k++) state = stepPlayer(state, { left: false, right: false, jump: false }, all, G.view.width, G, STEP_MS).state;
            const drop = Math.max(0, state.y + G.player.height / 2 - topOf(from));
            misses++; lost += drop; if (drop > C.chunkHeightPx) overChunk++;
          }
        }
      }
    }
    const perJump = lost / misses;
    rows.push(`${name.padEnd(13)} ledges/chunk ${(ledges / chunks).toFixed(1)}  jumps/chunk ${(steps / chunks).toFixed(1)}  wax/chunk ${(wax / chunks).toFixed(1)}  `
      + `miss by one charge level: ${perJump.toFixed(0)} px lost per miss, ${(100 * overChunk / misses).toFixed(1)}% over a chunk, `
      + `${(perJump * steps / chunks).toFixed(0)} px per chunk if every jump is missed once`);
  }
  return ['12 seeds x chunks 1..10:', ...rows].join('\n');
}

/** Generation time per chunk over many seeds, after a warm-up. */
function time(): string {
  const make = (s: number) => (flag('plain') !== undefined
    ? createEndlessGenerator(s, G, C, { ...T, sideLedgeScale: 1, pathWaxScale: 1 }, []) : createEndlessGenerator(s, G, C));
  for (let s = 0; s < 3; s++) { const generator = make(900 + s); for (let i = 0; i < 10; i++) generator.chunk(i); }
  const times: number[] = [];
  for (let s = 1; s <= 60; s++) {
    const generator = make(s * 7919);
    for (let i = 0; i < 40; i++) { const t = performance.now(); generator.chunk(i); times.push(performance.now() - t); }
  }
  times.sort((a, b) => a - b);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  return `${times.length} chunks (60 seeds x chunks 0..39): mean ${mean.toFixed(2)} ms, median ${times[times.length >> 1]!.toFixed(2)} ms, `
    + `99th ${times[Math.floor(times.length * 0.99)]!.toFixed(1)} ms, worst ${times.at(-1)!.toFixed(1)} ms`;
}

if (flag('time') !== undefined) console.log(time());
else if (flag('compare') !== undefined) console.log(compare());
else if (flag('bot') !== undefined) console.log(botClimb(Number(flag('bot') || 300), Number(flag('start') ?? 0)));
else {
  const generator = createEndlessGenerator(seed, G, C);
  const chunks = (flag('chunks') ?? '0,1,2,3,4,5,6,7,8,9').split(',').map(Number);
  for (const index of chunks) console.log(drawChunk(generator.chunk(index), generator.floor(index + 1)));
}
