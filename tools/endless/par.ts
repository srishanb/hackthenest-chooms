/**
 * Measures the endless climb with the route bot, without a browser: `npx tsx tools/endless/par.ts`.
 *
 * Why: fuel numbers should come from how long the climb really takes. The bot follows the
 * generator's own route with the real `stepPlayer`, so its time per chunk is the "par" of a
 * perfect run. A person is modelled as a few times slower. The printout shows, per chunk, the
 * bot's seconds, the wax it touched on the way, all the wax in the chunk, and the fuel a person
 * would gain or lose (taking only the wax on the path, or all of it at about 6 s a detour).
 * Read it before changing `fuel` or the wax chances in src/config/endless.config.ts.
 */
import { ENDLESS_CONFIG as C } from '../../src/config/endless.config';
import { GAME_CONFIG as G } from '../../src/config/game.config';
import { createEndlessGenerator } from '../../src/game/endless/generator';
import { createRouteBot } from '../../src/game/endless/route-bot';
import { createChunkStream } from '../../src/game/endless/chunk-stream';
import { stepPlayer, teleportPlayer } from '../../src/game/player/movement';
import { burnPerSecond } from '../../src/game/endless/flame-fuel';
const stepMs = 1000 / G.stepHz;
const rows: string[] = [];
for (const seed of [1, 2, 3, 4, 5, 6]) {
  const gen = createEndlessGenerator(seed, G, C); const stream = createChunkStream(gen, C); const bot = createRouteBot();
  let state = teleportPlayer(G.view.width / 2, C.baseFloorTopPx - G.player.height / 2);
  const feet = () => state.y + G.player.height / 2;
  let t = 0, chunk = 0, chunkStart = 0; const times: number[] = []; const pathWax: number[] = []; const allWax: number[] = [];
  const got = new Set<string>(); let onPath = 0;
  stream.update(feet());
  while (chunk < 22 && t < 3_600_000) {
    const input = bot.input(state, stream.chunks().flatMap(c => c.route), id => stream.platforms().find(p => p.id === id));
    state = stepPlayer(state, input, stream.platforms(), G.view.width, G, stepMs).state; t += stepMs; stream.update(feet());
    for (const w of stream.wax()) if (!got.has(w.id) && Math.abs(state.x - w.x) <= 25 && Math.abs(state.y - w.y) <= 31) { got.add(w.id); onPath++; }
    const now = stream.indexAt(feet());
    if (state.grounded && now > chunk) { times.push((t - chunkStart) / 1000); pathWax.push(onPath); allWax.push(gen.chunk(chunk).wax.length); onPath = 0; chunkStart = t; chunk = now; }
  }
  rows.push(`seed ${seed}: bot s/chunk ${times.map(x => x.toFixed(0)).join(' ')} | wax touched ${pathWax.join(' ')} | wax total ${allWax.join(' ')}`);
  if (seed === 1) for (const human of [2, 2.6, 3.2]) {
    const net = times.map((s, i) => (pathWax[i]! * C.fuel.waxRefill01 - s * human * burnPerSecond(i, C)));
    const netAll = times.map((s, i) => (allWax[i]! * C.fuel.waxRefill01 - (s * human + (allWax[i]! - pathWax[i]!) * 6) * burnPerSecond(i, C)));
    rows.push(`  human x${human}: net fuel/chunk path-only ${net.map(x => x.toFixed(2)).join(' ')}`);
    rows.push(`  human x${human}: net fuel/chunk all wax   ${netAll.map(x => x.toFixed(2)).join(' ')}`);
  }
}
console.log(rows.join('\n'));
