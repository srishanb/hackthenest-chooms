/**
 * Enforces the architecture rules in AGENTS.md by reading every source file's imports.
 *
 *  1. A lane imports only itself, src/shared and src/config. Never another lane.
 *  2. src/shared imports only src/shared. src/config imports only src/shared and src/config.
 *  3. src/game/player (movement) never imports the composure or signal contracts:
 *     EEG must not be able to change the controls.
 *  src/main.ts is the composition root and may import everything.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FORBIDDEN_IN_PLAYER = ['contracts/composure', 'contracts/signal-api', 'contracts/signal-internal'];

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listSourceFiles(full);
    return /\.ts$/.test(name) ? [full] : [];
  });
}

/** Relative import specifiers in a file, for example '../shared/bus'. */
function relativeImports(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  const pattern = /(?:from|import)\s+['"](\.{1,2}\/[^'"]+)['"]/g;
  return [...text.matchAll(pattern)].map((match) => match[1] ?? '');
}

/** First folder under src/, or '' for a file directly in src/ (main.ts). */
function laneOf(absolutePath: string): string {
  const parts = relative(SRC, absolutePath).split(sep);
  return parts.length > 1 ? (parts[0] ?? '') : '';
}

function isAllowed(lane: string, targetLane: string): boolean {
  if (targetLane === lane) return true;
  if (lane === 'shared') return false;
  if (lane === 'config') return targetLane === 'shared';
  return targetLane === 'shared' || targetLane === 'config';
}

function findViolations(): string[] {
  const violations: string[] = [];
  for (const file of listSourceFiles(SRC)) {
    const lane = laneOf(file);
    if (lane === '') continue; // src/main.ts
    const shown = relative(SRC, file).split(sep).join('/');

    for (const specifier of relativeImports(file)) {
      const target = resolve(dirname(file), specifier);
      const targetLane = laneOf(target);
      const targetShown = relative(SRC, target).split(sep).join('/');

      if (!isAllowed(lane, targetLane)) {
        violations.push(`${shown} imports ${targetShown} (lane "${lane}" may not import "${targetLane || 'src root'}")`);
      }

      if (shown.startsWith('game/player/') && FORBIDDEN_IN_PLAYER.some((path) => targetShown.startsWith(`shared/${path}`))) {
        violations.push(`${shown} imports ${targetShown} (movement must never see the signal)`);
      }
    }
  }
  return violations;
}

describe('lane boundaries', () => {
  it('no lane imports another lane, and movement never imports the signal contracts', () => {
    expect(findViolations()).toEqual([]);
  });
});
