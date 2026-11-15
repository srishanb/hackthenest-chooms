#!/usr/bin/env node
// @ts-check
/**
 * Claude Code PreToolUse hook for the Bash tool: blocks commands that delete or rewrite
 * git history (AGENTS.md, rule one). Reads the hook JSON on stdin and takes
 * tool_input.command. A violation is written to stderr and the process exits 2, which
 * makes Claude Code refuse the tool call. Anything else (including unparsable input)
 * exits 0 silently.
 *
 * Why tokenise instead of grepping: a commit message that merely mentions "git push --force"
 * must still be allowed, so we split the command into shell words, look only at the words
 * of each simple command, and ignore heredoc bodies and quoted text.
 *
 * Limits: this is a guardrail against honest mistakes, not a sandbox. It does not follow
 * aliases, scripts or variables. The pre-push hook (.githooks/pre-push) is the backstop.
 *
 * Usage: node scripts/hooks/no-history-rewrite.mjs --self-test
 *        echo '{"tool_input":{"command":"git push --force"}}' | node scripts/hooks/no-history-rewrite.mjs
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const RULE = 'Never delete or rewrite git history (AGENTS.md, rule one).';

/** @param {string} what @param {string} fix @returns {string} */
function block(what, fix) {
  return `Blocked: ${what}. ${RULE} ${fix}`;
}

const MERGE_HINT = 'To update a branch, merge: git fetch origin && git merge origin/<branch>.';
const REVERT_HINT = 'To undo a pushed change, add a new commit with git revert.';
const STOP_HINT = 'If you think history must be rewritten, stop and tell Srishan.';

/** Drops heredoc bodies so prose inside them is never read as commands. @param {string} text */
function stripHeredocs(text) {
  const lines = text.split('\n');
  const out = [];
  let end = null;
  for (const line of lines) {
    if (end !== null) {
      if (line.trim() === end) end = null;
      continue;
    }
    out.push(line);
    const m = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/.exec(line);
    if (m) end = m[2];
  }
  return out.join('\n');
}

/**
 * Splits a command into simple commands, each an array of unquoted words.
 * @param {string} text
 * @returns {string[][] | null} null when a quote is never closed
 */
function tokenise(text) {
  /** @type {string[][]} */
  const segments = [];
  /** @type {string[]} */
  let words = [];
  let word = '';
  let inWord = false;
  /** @type {"'" | '"' | null} */
  let quote = null;

  const endWord = () => {
    if (inWord) words.push(word);
    word = '';
    inWord = false;
  };
  const endSegment = () => {
    endWord();
    if (words.length > 0) segments.push(words);
    words = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote === "'") {
      if (c === "'") quote = null;
      else word += c;
    } else if (quote === '"') {
      if (c === '"') quote = null;
      else if (c === '\\' && i + 1 < text.length) word += text[++i];
      else word += c;
    } else if (c === "'" || c === '"') {
      quote = c;
      inWord = true;
    } else if (c === '\\' && i + 1 < text.length) {
      word += text[++i];
      inWord = true;
    } else if (c === '#' && !inWord) {
      while (i + 1 < text.length && text[i + 1] !== '\n') i++;
    } else if (/\s/.test(c) && c !== '\n') {
      endWord();
    } else if (';&|\n()`'.includes(c)) {
      endSegment();
    } else {
      word += c;
      inWord = true;
    }
  }
  if (quote !== null) return null;
  endSegment();
  return segments;
}

/** @param {string} command @returns {string[][]} */
function segmentsOf(command) {
  const text = stripHeredocs(command);
  // Unbalanced quote (for example an apostrophe in prose): fail closed by ignoring quotes.
  return tokenise(text) ?? tokenise(text.replace(/['"]/g, '')) ?? [];
}

const SKIP_PREFIX = new Set([
  'sudo', 'command', 'time', 'nohup', 'exec', 'env', '!', '{', '}', 'then', 'do', 'else', 'if', 'while', 'until',
]);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash']);

/** @param {string} kv a `-c` argument such as core.hooksPath=x @returns {boolean} */
function setsBadHooksPath(kv) {
  const m = /^core\.hookspath=(.*)$/i.exec(kv);
  return m !== null && m[1] !== '.githooks';
}

/** @param {string[]} args arguments after `git push` @returns {string | null} */
function checkPush(args) {
  for (const a of args) {
    if (a.startsWith('--')) {
      const name = a.split('=')[0];
      if (name === '--no-verify') {
        return block('git push --no-verify skips the pre-push history guard', STOP_HINT);
      }
      if (name.startsWith('--force') || name === '--mirror') {
        return block(`git push ${name} can overwrite remote history`, `${MERGE_HINT} ${STOP_HINT}`);
      }
      if (name === '--delete' || name === '--prune') {
        return block(`git push ${name} deletes remote refs`, `Merged branches stay. ${STOP_HINT}`);
      }
    } else if (/^-[A-Za-z]+$/.test(a)) {
      if (a.includes('f')) return block('git push -f can overwrite remote history', `${MERGE_HINT} ${STOP_HINT}`);
      if (a.includes('d')) return block('git push -d deletes a remote ref', `Merged branches stay. ${STOP_HINT}`);
    } else if (a.startsWith('+')) {
      return block(`the refspec ${a} forces an overwrite of a remote ref`, `${MERGE_HINT} ${STOP_HINT}`);
    } else if (/^:./.test(a)) {
      return block(`the refspec ${a} deletes a remote ref`, `Merged branches stay. ${STOP_HINT}`);
    }
  }
  return null;
}

/** @param {string[]} args arguments after `git config` @returns {string | null} */
function checkConfig(args) {
  const keyAt = args.findIndex((a) => /^core\.hookspath$/i.test(a));
  if (keyAt === -1) return null;
  const unset = args.some((a) => a.startsWith('--unset') || a === '--remove-section');
  const value = args.slice(keyAt + 1).find((a) => !a.startsWith('-'));
  if (unset || (value !== undefined && value !== '.githooks')) {
    return block('changing core.hooksPath disables the pre-push history guard', STOP_HINT);
  }
  return null;
}

/** @param {string[]} args arguments after `git` @returns {string | null} */
function checkGit(args) {
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) {
    const a = args[i];
    if (a === '-c') {
      if (setsBadHooksPath(args[i + 1] ?? '')) {
        return block('git -c core.hooksPath bypasses the pre-push history guard', STOP_HINT);
      }
      i += 2;
    } else if (a.startsWith('-c') && a.length > 2 && setsBadHooksPath(a.slice(2))) {
      return block('git -c core.hooksPath bypasses the pre-push history guard', STOP_HINT);
    } else if (a.startsWith('--config-env=') && /^--config-env=core\.hookspath=/i.test(a)) {
      return block('git --config-env core.hooksPath bypasses the pre-push history guard', STOP_HINT);
    } else if (['-C', '--git-dir', '--work-tree', '--namespace', '--super-prefix'].includes(a)) {
      i += 2;
    } else {
      i += 1;
    }
  }
  const sub = args[i];
  const rest = args.slice(i + 1);
  const has = (/** @type {string} */ f) => rest.includes(f);

  switch (sub) {
    case 'push':
      return checkPush(rest);
    case 'config':
      return checkConfig(rest);
    case 'filter-branch':
    case 'filter-repo':
      return block(`git ${sub} rewrites history`, STOP_HINT);
    case 'rebase':
      return block('git rebase rewrites history', `${MERGE_HINT} scripts/wt.sh sync does this.`);
    case 'pull':
      if (rest.some((a) => (a.startsWith('--rebase') && a !== '--rebase=false') || /^-[A-Za-z]*r[A-Za-z]*$/.test(a))) {
        return block('git pull --rebase rewrites history', `${MERGE_HINT} scripts/wt.sh sync does this.`);
      }
      return null;
    case 'reflog':
      if (rest[0] === 'expire' || rest[0] === 'delete') {
        return block(`git reflog ${rest[0]} erases history records`, STOP_HINT);
      }
      return null;
    case 'gc':
      if (rest.some((a) => a.startsWith('--prune'))) return block('git gc --prune erases unreachable commits', STOP_HINT);
      return null;
    case 'update-ref':
      if (has('-d') || has('--delete')) return block('git update-ref -d deletes a ref', STOP_HINT);
      return null;
    case 'branch': {
      const cluster = rest.filter((a) => /^-[A-Za-z]+$/.test(a)).join('');
      const del = cluster.includes('d') || has('--delete');
      const force = cluster.includes('f') || has('--force');
      if (cluster.includes('D') || (del && force)) {
        return block('git branch -D force-deletes a branch', 'Merged branches stay. Use git branch -d only on merged local branches.');
      }
      return null;
    }
    default:
      return null;
  }
}

/** @param {string[]} args arguments after `gh` @returns {string | null} */
function checkGh(args) {
  const pos = args.filter((a) => !a.startsWith('-'));
  if (pos[0] === 'repo' && pos[1] === 'delete') {
    return block('gh repo delete destroys the repository and all history', STOP_HINT);
  }
  if (pos[0] === 'pr' && (pos[1] === 'merge' || pos[1] === 'close')) {
    if (args.some((a) => a === '--delete-branch' || /^-[A-Za-z]*d[A-Za-z]*$/.test(a))) {
      return block(`gh pr ${pos[1]} --delete-branch deletes a branch`, 'Merged branches stay.');
    }
  }
  if (pos[0] === 'api') {
    const methodAt = args.findIndex((a) => a === '-X' || a === '--method');
    const method = methodAt !== -1 ? args[methodAt + 1] : (args.find((a) => /^(-X|--method=)/.test(a)) ?? '');
    const isDelete = /delete/i.test(method ?? '');
    if (isDelete && args.some((a) => a.includes('/git/refs') || a.includes('/branches'))) {
      return block('gh api DELETE on refs or branches deletes history', 'Merged branches stay.');
    }
  }
  return null;
}

/** @param {string[]} args arguments after `rm` @returns {string | null} */
function checkRm(args) {
  const recursive = args.some((a) => a === '--recursive' || /^-[A-Za-z]*[rR][A-Za-z]*$/.test(a));
  if (!recursive) return null;
  const hitsGit = args
    .filter((a) => !a.startsWith('-'))
    .some((a) => /(^|\/)\.git(\/\*?)?$/.test(a) || a.replace(/\/+$/, '').endsWith('.git'));
  return hitsGit ? block('removing a .git folder deletes all local history', STOP_HINT) : null;
}

/** @param {string[]} words one simple command @returns {string | null} */
function checkWords(words) {
  const w = [...words];
  while (w.length > 0 && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0]) || SKIP_PREFIX.has(w[0]))) w.shift();
  if (w.length === 0) return null;
  const cmd = basename(w[0]);
  const args = w.slice(1);
  if (cmd === 'git') return checkGit(args);
  if (cmd === 'gh') return checkGh(args);
  if (cmd === 'rm') return checkRm(args);
  if (SHELLS.has(cmd)) {
    const at = args.findIndex((a) => /^-[A-Za-z]*c$/.test(a));
    if (at !== -1 && args[at + 1] !== undefined) return findViolation(args[at + 1]);
  }
  return null;
}

/**
 * @param {string} command a Bash command line
 * @returns {string | null} the reason it must be blocked, or null if it is allowed
 */
export function findViolation(command) {
  for (const words of segmentsOf(command)) {
    const reason = checkWords(words);
    if (reason !== null) return reason;
  }
  return null;
}

/** @type {Array<[string, boolean]>} command and whether it must be blocked */
const CASES = [
  // blocked: force and delete pushes
  ['git push --force origin main', true],
  ['git push -f', true],
  ['git push origin main --force-with-lease', true],
  ['git push --force-with-lease=main:abc origin main', true],
  ['git push --force-if-includes origin main', true],
  ['git push --mirror backup', true],
  ['git push origin --delete old-branch', true],
  ['git push -d origin old-branch', true],
  ['git push --prune origin', true],
  ['git push origin +main', true],
  ['git push origin +HEAD:main', true],
  ['git push origin :old-branch', true],
  ['git push -uf origin main', true],
  ['git -C ../other push --force', true],
  ['cd x && git push origin main -f', true],
  ['echo hi; git push --force', true],
  ['bash -c "git push --force"', true],
  // blocked: rewriting and erasing
  ['git filter-branch --all', true],
  ['git filter-repo --path src', true],
  ['git reflog expire --expire=now --all', true],
  ['git reflog delete HEAD@{1}', true],
  ['git gc --prune=now', true],
  ['git update-ref -d refs/heads/x', true],
  ['git branch -D feature', true],
  ['git branch --delete --force feature', true],
  ['git branch -df feature', true],
  ['git rebase origin/main', true],
  ['git rebase -i HEAD~3', true],
  ['git pull --rebase', true],
  ['git pull --rebase=true origin main', true],
  ['git pull -r', true],
  ['gh repo delete srishanb/x --yes', true],
  ['gh api -X DELETE repos/o/r/git/refs/heads/x', true],
  ['gh api --method DELETE repos/o/r/branches/x', true],
  ['gh pr merge 5 --squash --delete-branch', true],
  ['rm -rf .git', true],
  ['rm -rf ./repo/.git', true],
  ['rm -fr .git/', true],
  ['rm -r foo.git', true],
  // blocked: guard bypass
  ['git push --no-verify origin x', true],
  ['git -c core.hooksPath=/dev/null push origin x', true],
  ['git -c core.hooksPath= push origin x', true],
  ['git config core.hooksPath /tmp/nothing', true],
  ['git config --global core.hooksPath ~/hooks', true],
  ['git config --unset core.hooksPath', true],
  // allowed
  ['git push -u origin claude/x', false],
  ['git push', false],
  ['git push origin HEAD', false],
  ['git push origin v1.0', false],
  ['git commit -m "docs: explain why we never force push"', false],
  ['git commit -m "do not run git push --force; no git rebase either"', false],
  ['git commit --amend --no-edit', false],
  ['git commit -F - <<\'EOF\'\ngit push --force is banned\nEOF', false],
  ['git merge origin/main', false],
  ['git pull', false],
  ['git pull --no-rebase', false],
  ['git reset --hard HEAD', false],
  ['git branch -d merged', false],
  ['git branch -a', false],
  ['git tag -d local-tag', false],
  ['git gc', false],
  ['git reflog', false],
  ['git log --oneline -5', false],
  ['git config core.hooksPath', false],
  ['git config core.hooksPath .githooks', false],
  ['git -c core.hooksPath=.githooks status', false],
  ['gh pr create --draft', false],
  ['gh pr merge 5 --squash', false],
  ['gh api repos/o/r/pulls', false],
  ['gh api -X DELETE repos/o/r/issues/comments/9', false],
  ['rm -rf node_modules', false],
  ['rm -rf dist .vite', false],
  ['rm .gitignore.bak', false],
  ['echo "git push --force"', false],
  ['grep -rn "git rebase" docs', false],
  ['npm run check', false],
];

/** @returns {number} number of mismatches */
function selfTest() {
  let failures = 0;
  for (const [command, shouldBlock] of CASES) {
    const reason = findViolation(command);
    const blocked = reason !== null;
    if (blocked !== shouldBlock) {
      failures++;
      console.error(`FAIL: expected ${shouldBlock ? 'block' : 'allow'}, got ${blocked ? 'block' : 'allow'}: ${command}`);
    }
  }
  console.log(`${CASES.length - failures}/${CASES.length} self-test cases passed`);
  return failures;
}

/** Reads the PreToolUse JSON from stdin and exits 2 on a violation. */
function runHook() {
  let command;
  try {
    const input = JSON.parse(readFileSync(0, 'utf8'));
    command = input?.tool_input?.command;
  } catch {
    process.exit(0);
  }
  if (typeof command !== 'string') process.exit(0);
  const reason = findViolation(command);
  if (reason !== null) {
    process.stderr.write(`${reason}\n`);
    process.exit(2);
  }
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) process.exit(selfTest() === 0 ? 0 : 1);
  runHook();
}
