#!/usr/bin/env node
// @ts-check
/**
 * After-job report check. One script shared by the Stop hooks of Claude Code,
 * Codex and Antigravity (see .claude/settings.json, .codex/hooks.json, .agents/hooks.json).
 *
 * What it does: when an agent tries to finish on a task branch that has work but no
 * report file under docs/agent-reports/, it asks the agent to write one. It blocks
 * ONCE per worktree branch, then lets the agent stop, so it can never loop.
 *
 * Why Node and not bash: every laptop has Node (the game needs it), and JSON on
 * stdin/stdout is awkward in bash on Windows.
 *
 * Usage: node scripts/hooks/report-check.mjs <claude|codex|antigravity>
 * Test:  echo '{}' | node scripts/hooks/report-check.mjs claude
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const tool = process.argv[2] ?? 'claude';
const scriptDir = dirname(fileURLToPath(import.meta.url));

/** @param {string[]} args @returns {string} stdout, or '' if git fails */
function git(args) {
  try {
    return execFileSync('git', args, {
      cwd: scriptDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

/** @returns {Record<string, unknown>} the hook input JSON, or {} */
function readInput() {
  if (process.stdin.isTTY) return {};
  try {
    return JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

/** Let the agent stop. Codex requires JSON on stdout even when allowing. */
function allow() {
  process.stdout.write('{}\n');
  process.exit(0);
}

/** @param {string} reason */
function block(reason) {
  // Claude Code and Codex: {"decision":"block","reason"}. Antigravity: {"decision":"continue","reason"}.
  const decision = tool === 'antigravity' ? 'continue' : 'block';
  process.stdout.write(`${JSON.stringify({ decision, reason })}\n`);
  process.exit(0);
}

/** @param {string} path */
const isReport = (path) => /^docs\/agent-reports\/(?!TEMPLATE\.md$).+\.md$/.test(path);

const input = readInput();
// Already continuing because of a stop hook (Claude Code, Codex), or background work still running (Antigravity).
if (input.stop_hook_active === true || input.fullyIdle === false) allow();

const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
if (!branch || branch === 'main' || branch === 'HEAD') allow();

const base = git(['merge-base', 'HEAD', 'origin/main']) || git(['merge-base', 'HEAD', 'main']);
if (!base) allow();

const committed = git(['diff', '--name-only', base, 'HEAD']).split('\n');
// -uall lists each untracked file, so an uncommitted report inside a new folder is still seen.
const uncommitted = git(['status', '--porcelain', '-uall'])
  .split('\n')
  .map((line) => line.slice(3).trim());
const changed = [...committed, ...uncommitted].filter(Boolean);

const work = changed.filter((path) => !isReport(path));
if (work.length === 0) allow(); // nothing done yet
if (changed.some(isReport)) allow(); // report already written
if (work.every((path) => path.startsWith('docs/plans/'))) allow(); // plan only: waiting for approval

// Block once per worktree + branch. The marker lives in this worktree's git dir, so it is never committed.
const marker = join(git(['rev-parse', '--absolute-git-dir']), 'report-check-nagged');
if (existsSync(marker) && readFileSync(marker, 'utf8') === branch) allow();
try {
  writeFileSync(marker, branch);
} catch {
  allow(); // cannot remember that we asked, so do not risk a loop
}

block(
  `Branch ${branch} has changes but no after-job report. If the task is complete, copy ` +
    'docs/agent-reports/TEMPLATE.md to docs/agent-reports/<YYYYMMDD-HHMM>-<agent>-<task>.md, fill in every ' +
    'section honestly (including what you did NOT verify), commit it, and link it in the PR. ' +
    'If you are only pausing to ask the human a question, say so and stop again.',
);
