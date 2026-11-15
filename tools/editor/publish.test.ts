/** Publication tests exercise the GitHub transaction without changing a live repository. */
import { expect, it, vi } from 'vitest';
import { DEFAULT_SECTIONS } from '../../src/content/sections/defaults';
import { layoutSource, LAYOUT_FILE, publishLayouts, type Run } from './publish';
function github(blob = 'original') {
  const run = vi.fn<Run>();
  run.mockResolvedValueOnce(JSON.stringify({ nameWithOwner: 'team/game', defaultBranchRef: { name: 'main' } }))
    .mockResolvedValueOnce(JSON.stringify({ object: { sha: 'base-commit' } }))
    .mockResolvedValueOnce(JSON.stringify({ sha: blob, content: Buffer.from('original layout').toString('base64') }))
    .mockResolvedValueOnce('{}').mockResolvedValueOnce('{}')
    .mockResolvedValueOnce(JSON.stringify({ html_url: 'https://github.com/team/game/pull/123' }));
  return run;
}
it('publishes only the validated layout file on a new review branch based on current main', async () => {
  const run = github();
  const edited = structuredClone(DEFAULT_SECTIONS);
  edited[0]!.platforms[1]!.x += 10;
  expect(await publishLayouts(edited, 'original', run, 'unique')).toBe('https://github.com/team/game/pull/123');
  expect(run.mock.calls[3]).toEqual([['api', 'repos/team/game/git/refs', '--method', 'POST', '--input', '-'], { ref: 'refs/heads/codex/stage-layout-unique', sha: 'base-commit' }]);
  const [args, payload] = run.mock.calls[4]!;
  expect(args).toContain(`repos/team/game/contents/${LAYOUT_FILE}`);
  const update = payload as { content: string; sha: string; branch: string };
  expect(Buffer.from(update.content, 'base64').toString()).toBe(layoutSource(edited));
  expect(update.sha).toBe('original'); expect(update.branch).toBe('codex/stage-layout-unique');
  expect(run.mock.calls[5]![1]).toMatchObject({ base: 'main', head: 'codex/stage-layout-unique' });
});
it('rejects stale edits before creating a branch or writing any remote data', async () => {
  const run = github('newer-team-layout');
  await expect(publishLayouts(DEFAULT_SECTIONS, 'original', run, 'unique')).rejects.toThrow('team layout changed');
  expect(run).toHaveBeenCalledTimes(3);
});
it('does not report success when GitHub rejects the write', async () => {
  const run = github(); run.mockReset(); run.mockRejectedValue(new Error('not authenticated'));
  await expect(publishLayouts(DEFAULT_SECTIONS, 'original', run, 'unique')).rejects.toThrow('not authenticated');
  expect(run).toHaveBeenCalledTimes(1);
});
