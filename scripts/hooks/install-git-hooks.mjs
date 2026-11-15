#!/usr/bin/env node
// @ts-check
/**
 * Points git at the committed hooks folder (.githooks) so the pre-push guard against
 * deleting or rewriting history is active. Runs from the npm "prepare" script, i.e. after
 * every `npm ci` and `npm install`. Silently does nothing outside a git work tree.
 *
 * Why Node: it works the same on macOS, Linux and Windows, and Node is already required.
 */
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

try {
  execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: root, stdio: 'ignore' });
} catch {
  // Not a git checkout (for example a source tarball) or git is missing: nothing to install.
}
