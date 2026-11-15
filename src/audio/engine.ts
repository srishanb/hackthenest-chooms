/** Four gain buses, initially silent. computeMix already includes master exactly once.
 * API: MDN AudioContext and AudioParam/setTargetAtTime; gains ease over fadeMs/3.
 * A zero-volume target uses a 5 ms time constant so mute does not wait for the music fade.
 */
import type { MixGains } from './mix-rules';
export type AudioBus = keyof MixGains;
export const AUDIO_BUSES: readonly AudioBus[] = ['quiet', 'tense', 'sfx', 'narrator'];
export function createAudioEngine(context: AudioContext, fadeMs: number) {
  const nodes = {} as Record<AudioBus, GainNode>;
  let targets: MixGains = { quiet: 0, tense: 0, sfx: 0, narrator: 0 };
  let disposed = false;
  for (const bus of AUDIO_BUSES) {
    const node = context.createGain(); node.gain.value = 0; node.connect(context.destination); nodes[bus] = node;
  }
  return {
    nodes,
    getGains: (): MixGains => ({ ...targets }),
    apply(next: MixGains, force = false): void {
      if (disposed) return;
      const safeFadeMs = Number.isFinite(fadeMs) ? Math.max(1, fadeMs) : 2000;
      for (const bus of AUDIO_BUSES) {
        const raw = next[bus], value = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0;
        if (value === targets[bus] || (!force && value !== 0 && Math.abs(value - targets[bus]) < 0.01)) continue;
        const param = nodes[bus].gain, now = context.currentTime;
        param.cancelScheduledValues(now); param.setValueAtTime(param.value, now);
        param.setTargetAtTime(value, now, value === 0 ? 0.005 : safeFadeMs / 3000);
        targets = { ...targets, [bus]: value };
      }
    },
    dispose(): void {
      if (disposed) return; disposed = true;
      for (const bus of AUDIO_BUSES) nodes[bus].disconnect();
      void context.close().catch(() => {});
    },
  };
}
