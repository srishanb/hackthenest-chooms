/** Explicit authoring action only: publish a snapshot via the local development server. */
import type { SectionData } from '../../../shared/contracts/content';
import { t } from '../../strings';
export async function publishLayout(stages: SectionData[], fetcher: typeof fetch = fetch): Promise<string> {
  const endpoint = './__stage-editor/publish';
  const capability = await fetcher(endpoint);
  if (!capability.ok || !capability.headers.get('content-type')?.includes('application/json')) throw new Error(t('editor.requiresDev'));
  const { token } = await capability.json() as { token?: string };
  if (!token) throw new Error(t('editor.requiresDev'));
  const response = await fetcher(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Stage-Editor-Token': token }, body: JSON.stringify(stages) });
  const result = await response.json() as { url?: string; error?: string };
  if (!response.ok || !result.url) throw new Error(result.error ?? t('editor.publishFailed'));
  const url = new URL(result.url);
  if (url.protocol !== 'https:') throw new Error(t('editor.publishFailed'));
  return url.href;
}
