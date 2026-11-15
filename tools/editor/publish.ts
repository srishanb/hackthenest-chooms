/** Publish one validated layout file through GitHub's API; never changes or pushes the user's checkout. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SectionData } from '../../src/shared/contracts/content';
export const LAYOUT_FILE = 'src/content/sections/published-layouts.ts';
export type Run = (args: string[], input?: unknown) => Promise<string>;
const exec = promisify(execFile);
export function githubRunner(root: string): Run {
  const windowsGh = join(process.env.ProgramFiles ?? 'C:\\Program Files', 'GitHub CLI', 'gh.exe');
  const executable = process.platform === 'win32' && existsSync(windowsGh) ? windowsGh : 'gh';
  return async (args, input) => {
    const child = exec(executable, args,
      { cwd: root, timeout: 30_000, maxBuffer: 2_000_000, windowsHide: true, env: { ...process.env, GH_PROMPT_DISABLED: '1' } });
    if (input !== undefined) child.child.stdin?.end(JSON.stringify(input));
    return (await child).stdout;
  };
}
export function layoutSource(stages: readonly SectionData[]): string {
  return "/** Team layouts published by the stage editor. */\nimport type { SectionData } from '../../shared/contracts/content';\nexport const PUBLISHED_LAYOUTS: readonly SectionData[] = " + JSON.stringify(stages, null, 2) + ';\n';
}
export async function publishLayouts(stages: readonly SectionData[], expectedBlob: string, run: Run, id: string): Promise<string> {
  const repo = JSON.parse(await run(['repo', 'view', '--json', 'nameWithOwner,defaultBranchRef'])) as { nameWithOwner: string; defaultBranchRef: { name: string } };
  const prefix = `repos/${repo.nameWithOwner}`;
  const api = async (path: string, method?: string, input?: unknown) => JSON.parse(await run(
    ['api', `${prefix}/${path}`, ...(method ? ['--method', method, '--input', '-'] : [])], input)) as Record<string, unknown>;
  const base = repo.defaultBranchRef.name;
  const ref = await api(`git/ref/heads/${encodeURIComponent(base)}`);
  const commit = (ref.object as { sha: string }).sha;
  const file = await api(`contents/${LAYOUT_FILE}?ref=${commit}`);
  if (file.sha !== expectedBlob) throw new Error('The team layout changed. Sync your project with the default branch, restart the server, and reapply your edits before publishing.');
  const content = Buffer.from(layoutSource(stages)).toString('base64');
  if (String(file.content).replace(/\s/g, '') === content) throw new Error('This layout is already published.');
  const branch = `codex/stage-layout-${id}`;
  await api('git/refs', 'POST', { ref: `refs/heads/${branch}`, sha: commit });
  await api(`contents/${LAYOUT_FILE}`, 'PUT', { message: 'feat(content): publish edited stage layouts', content, sha: file.sha, branch });
  const pr = await api('pulls', 'POST', { title: 'feat(content): publish edited stage layouts', head: branch, base,
    body: 'Stage editor publication. Changes only the validated shared layout data. After review and merge, teammates receive it on their next pull and builds use it as the default. Geometry was validated; playability and difficulty still need review.' });
  return String(pr.html_url);
}
