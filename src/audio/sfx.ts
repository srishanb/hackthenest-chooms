/** Local one-shot cues, bounded to four voices. Missing clips use a quiet 100 ms tone.
 * Same-file bursts within 80 ms coalesce (e.g. direct ember request + return).
 * These lane-local limits protect against duplicate event bursts; tune after listening.
 * Web Audio source/oscillator/gain methods follow the MDN sources in the audio reports.
 */
import type { SfxId } from './sfx-map';
export type SfxAssets = Partial<Record<SfxId, string | null>>;
const MAX_VOICES = 4;
const COALESCE_SECONDS = 0.08;
interface Voice { node: AudioBufferSourceNode | OscillatorNode; gain?: GainNode }
export function createSfxPlayer(context: AudioContext, output: GainNode,
  assets: SfxAssets, load: (path: string | null) => Promise<AudioBuffer | null>, silent: () => boolean) {
  const buffers = new Map<SfxId, AudioBuffer | null>(), voices = new Set<Voice>();
  let disposed = false, previousPath: string | null | undefined, previousTime = -Infinity;
  const cleanup = (voice: Voice): void => {
    if (!voices.delete(voice)) return;
    voice.node.disconnect(); voice.gain?.disconnect();
  };
  const stopVoice = (voice: Voice): void => { try { voice.node.stop(); } catch { /* Ended. */ } cleanup(voice); };
  const stop = (): void => { for (const voice of [...voices]) stopVoice(voice); };
  const ready = Promise.all((Object.entries(assets) as Array<[SfxId, string | null]>).map(async ([id, path]) => {
    const buffer = await load(path); if (!disposed) buffers.set(id, buffer);
  })).then(() => {});
  return {
    ready, stop,
    getVoiceCount: (): number => voices.size,
    play(id: SfxId): boolean {
      if (disposed || silent() || context.state !== 'running') return false;
      const path = assets[id], now = context.currentTime;
      if (path && path === previousPath && now - previousTime < COALESCE_SECONDS) return false;
      const oldest = voices.values().next().value;
      if (voices.size >= MAX_VOICES && oldest) stopVoice(oldest);
      const buffer = buffers.get(id);
      let voice: Voice;
      if (buffer) {
        const source = context.createBufferSource(); source.buffer = buffer; source.connect(output); voice = { node: source };
      } else {
        const source = context.createOscillator(), gain = context.createGain();
        source.frequency.value = id === 'landHard' ? 220 : 660;
        gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        source.connect(gain); gain.connect(output); voice = { node: source, gain };
      }
      previousPath = path; previousTime = now; voices.add(voice);
      voice.node.onended = () => cleanup(voice);
      voice.node.start(now);
      if (!buffer) voice.node.stop(now + 0.11);
      return true;
    },
    dispose(): void { disposed = true; stop(); },
  };
}
