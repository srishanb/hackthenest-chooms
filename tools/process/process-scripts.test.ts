/**
 * Tests for the process scripts: report-check.mjs (reads `cwd` from the hook input) and wt.sh
 * (new branches do not track origin/main). Each test builds a throwaway git repo in a temp folder.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const git = (cwd: string, ...args: string[]): string => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** A repo with one commit on main, plus a bare "origin" it pushed to. */
function makeRepo(): { origin: string; work: string } {
  const base = mkdtempSync(join(tmpdir(), 'lighten-proc-'));
  const origin = join(base, 'origin.git');
  const work = join(base, 'work');
  mkdirSync(work);
  git(base, 'init', '-q', '--bare', '-b', 'main', origin);
  git(work, 'init', '-q', '-b', 'main');
  git(work, 'config', 'user.email', 't@example.com');
  git(work, 'config', 'user.name', 't');
  writeFileSync(join(work, 'a.txt'), 'a');
  git(work, 'add', '.');
  git(work, 'commit', '-q', '-m', 'init');
  git(work, 'remote', 'add', 'origin', origin);
  git(work, 'push', '-q', '-u', 'origin', 'main');
  return { origin, work };
}

describe('report-check.mjs', () => {
  it('judges the folder named by `cwd` in the hook input, not the folder the script lives in', () => {
    const { work } = makeRepo();
    git(work, 'checkout', '-q', '-b', 'sonnet/x');
    writeFileSync(join(work, 'feature.txt'), 'work, no report');
    git(work, 'add', '.');
    git(work, 'commit', '-q', '-m', 'work');
    // The script runs from this repo (a different checkout) but is told to look at `work`.
    const out = execFileSync('node', [join(repoRoot, 'scripts/hooks/report-check.mjs'), 'claude'], {
      cwd: repoRoot,
      input: JSON.stringify({ cwd: work }),
      encoding: 'utf8',
    });
    const answer = JSON.parse(out) as { decision?: string; reason?: string };
    expect(answer.decision).toBe('block');
    expect(answer.reason).toContain('sonnet/x');
  });

  it('allows when the named folder is on main', () => {
    const { work } = makeRepo();
    const out = execFileSync('node', [join(repoRoot, 'scripts/hooks/report-check.mjs'), 'claude'], { cwd: repoRoot, input: JSON.stringify({ cwd: work }), encoding: 'utf8' });
    expect(JSON.parse(out)).toEqual({});
  });
});

describe('wt.sh new', () => {
  it('creates a branch that tracks nothing, so a bare git push cannot reach main', () => {
    const { work } = makeRepo();
    mkdirSync(join(work, 'scripts'));
    copyFileSync(join(repoRoot, 'scripts/wt.sh'), join(work, 'scripts/wt.sh'));
    execFileSync('bash', ['scripts/wt.sh', 'new', 'tester', 'task'], { cwd: work, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const dir = join(work, '..', 'wt-tester-task');
    expect(git(dir, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('tester/task');
    expect(() => git(dir, 'rev-parse', '--abbrev-ref', 'tester/task@{upstream}')).toThrow();
  });
});
