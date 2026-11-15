/** Check authored levels headlessly; exit nonzero with the IDs that need content changes. */
import { GAME_CONFIG } from '../../src/config/game.config';
import { SECTIONS } from '../../src/content/sections';
import { checkReachability } from './reach';

try {
  const results = checkReachability(SECTIONS, GAME_CONFIG);
  for (const result of results) {
    console.log(`${result.sectionId}: ${result.unreachable.length ? `unreachable: ${result.unreachable.join(', ')}` : 'all reachable'}`);
  }
  if (results.some((result) => result.unreachable.length)) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
