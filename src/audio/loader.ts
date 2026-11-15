/** Cached, same-origin audio loading; missing/invalid files become silence once.
 * API: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
 */
export function createAudioLoader(context: AudioContext, baseURL: URL, signal: AbortSignal,
  fetcher: typeof fetch = fetch) {
  const cache = new Map<string, Promise<AudioBuffer | null>>();
  return (path: string | null): Promise<AudioBuffer | null> => {
    if (path === null || signal.aborted) return Promise.resolve(null);
    const existing = cache.get(path); if (existing) return existing;
    const pending = (async (): Promise<AudioBuffer | null> => {
      try {
        if (!/^assets\/audio\/[a-zA-Z0-9_./-]+\.(?:ogg|mp3|wav)$/.test(path) || path.split('/').includes('..')) {
          throw new Error('Only local audio assets are allowed');
        }
        const response = await fetcher(new URL(path, baseURL), { signal });
        if (!response.ok) throw new Error('Audio unavailable');
        const bytes = await response.arrayBuffer();
        if (signal.aborted) return null;
        return await context.decodeAudioData(bytes);
      } catch {
        if (!signal.aborted) console.warn('[audio] unavailable local asset; using silence:', path);
        return null;
      }
    })();
    cache.set(path, pending); return pending;
  };
}
