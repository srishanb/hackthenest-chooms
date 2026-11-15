/** Saving must await GitHub success; static hosting and API failure are never local-only success. */
import { expect, it, vi } from 'vitest';
import { publishLayout } from './publish-layout';
it('sends the token and draft, and returns the review link after publication', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ token: 'local-token' }))
    .mockResolvedValueOnce(Response.json({ url: 'https://github.com/team/game/pull/123' }));
  expect(await publishLayout([], fetcher)).toContain('/pull/123');
  expect(fetcher.mock.calls[1]![1]).toMatchObject({ method: 'POST', body: '[]', headers: { 'X-Stage-Editor-Token': 'local-token' } });
});
it('explains that a static build cannot publish', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('<html>game</html>', { headers: { 'Content-Type': 'text/html' } }));
  await expect(publishLayout([], fetcher)).rejects.toThrow('development server');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('shows stale-layout failure instead of saying saved', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ token: 'token' }))
    .mockResolvedValueOnce(Response.json({ error: 'The team layout changed.' }, { status: 409 }));
  await expect(publishLayout([], fetcher)).rejects.toThrow('team layout changed');
});
