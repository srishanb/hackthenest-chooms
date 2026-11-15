/** Start the available local loops at one audio clock time; absent layers stay silent.
 * API: https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
 */
export function startMusicLayers(context: AudioContext, outputs: { quiet: GainNode; tense: GainNode },
  buffers: { quiet: AudioBuffer | null; tense: AudioBuffer | null }): () => void {
  const sources: AudioBufferSourceNode[] = [];
  const when = context.currentTime + 0.02;
  for (const bus of ['quiet', 'tense'] as const) {
    if (!buffers[bus]) continue;
    const source = context.createBufferSource(); source.buffer = buffers[bus]; source.loop = true;
    source.connect(outputs[bus]); source.start(when); sources.push(source);
  }
  return () => {
    for (const source of sources) { try { source.stop(); } catch { /* Already stopped. */ } source.disconnect(); }
  };
}
