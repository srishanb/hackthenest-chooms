/**
 * Tests for the run tooling (run.mjs, run/*.mjs, tools/pipeline/build.mjs).
 *
 * The scripts are plain Node (.mjs) so they run on every laptop without a build step; here they
 * are started as child processes, the same way a person starts them.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const node = (...args: string[]) => spawnSync(process.execPath, args, { cwd: repoRoot, encoding: 'utf8' });

interface ListedFeature {
  id: string;
  title: string;
  status: string;
  tests: string[];
  query?: string;
}

describe('run tooling', () => {
  it('passes its own self-test (pure helpers and every feature file is well formed)', () => {
    const result = node('run.mjs', 'selftest');
    expect(result.stdout + result.stderr).toContain('self-test passed');
    expect(result.status).toBe(0);
  });

  it('lists one feature per run file, each with a unique id matching its file name', () => {
    const features = JSON.parse(execFileSync(process.execPath, ['run.mjs', 'list', '--json'], { cwd: repoRoot, encoding: 'utf8' })) as ListedFeature[];
    const files = readdirSync(join(repoRoot, 'run')).filter((name) => name.endsWith('.mjs') && !name.startsWith('_'));
    expect(features.map((feature) => `${feature.id}.mjs`).sort()).toEqual([...files].sort());
    expect(new Set(features.map((feature) => feature.id)).size).toBe(features.length);
  });

  it('every READY feature names test files that exist', () => {
    const features = JSON.parse(execFileSync(process.execPath, ['run.mjs', 'list', '--json'], { cwd: repoRoot, encoding: 'utf8' })) as ListedFeature[];
    for (const feature of features.filter((item) => item.status === 'ready')) {
      for (const file of feature.tests) expect(existsSync(join(repoRoot, file)), `${feature.id}: ${file}`).toBe(true);
    }
  });

  it('prints the menu with no arguments and fails clearly on an unknown name', () => {
    const menu = node('run.mjs');
    expect(menu.status).toBe(0);
    expect(menu.stdout).toContain('game-movement');
    const unknown = node('run.mjs', 'no-such-thing');
    expect(unknown.status).toBe(1);
    expect(unknown.stderr).toContain('Unknown command or feature');
  });

  it('a feature file can be started on its own and reports planned work without failing', () => {
    const result = node(join('run', 'narrator.mjs'), '--tests-only');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('PLANNED');
  });
});
