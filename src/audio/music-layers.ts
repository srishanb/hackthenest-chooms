/** Start the available local loops at one audio clock time; absent layers stay silent.
 * API: https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
 */
export function startMusicLayers(context: AudioContext, outputs: { quiet: GainNode; tense: GainNode },
  buffers: { quiet: AudioBuffer | null; tense: AudioBuffer | null }, trims: { quiet: number; tense: number } = { quiet: 1, tense: 1 }): () => void {
  const sources: AudioBufferSourceNode[] = [];
  const trimNodes: GainNode[] = [];
  const when = context.currentTime + 0.02;
  for (const bus of ['quiet', 'tense'] as const) {
    if (!buffers[bus]) continue;
    const source = context.createBufferSource(); source.buffer = buffers[bus]; source.loop = true;
    const trim = context.createGain(); trim.gain.value = Number.isFinite(trims[bus]) ? Math.max(0, trims[bus]) : 1;
    source.connect(trim); trim.connect(outputs[bus]); source.start(when); sources.push(source); trimNodes.push(trim);
  }
  return () => {
    for (const source of sources) { try { source.stop(); } catch { /* Already stopped. */ } source.disconnect(); }
    for (const trim of trimNodes) trim.disconnect();
  };
}
