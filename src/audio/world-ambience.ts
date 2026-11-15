/** Low-level local forest/wind loops and cooldown-limited cues; no game or signal lane imports. */
import type { Stores } from '../shared/contracts/app';
import { WORLD_AUDIO_CONFIG as C } from '../config/audio.config';
import type { SfxId } from './sfx-map';
import { startMusicLayers } from './music-layers';
export function createWorldAmbience(context: AudioContext, output: GainNode, stores: Stores,
  load: (path: string | null) => Promise<AudioBuffer | null>, play: (id: SfxId) => boolean) {
  const forest = context.createGain(), wind = context.createGain();
  forest.gain.value = 0; wind.gain.value = 0; forest.connect(output); wind.connect(output);
  let disposed = false, stop = () => {}, nextCue = 0, nextEntry = 0, corrupt = false;
  const ready = Promise.all([load('assets/audio/ember/forest-air.wav'), load('assets/audio/ember/wind-air.wav')]).then(([quiet, tense]) => {
    if (!disposed) stop = startMusicLayers(context, { quiet: forest, tense: wind }, { quiet: quiet ?? null, tense: tense ?? null });
  });
  return { ready,
    update(c: number) {
      const snapshot = stores.snapshot.get(), running = snapshot.phase === 'playing' && context.state === 'running';
      const section = snapshot.sectionId ?? '', snow = section.includes('snow'), windy = section.includes('wind');
      const amount = Math.max(0, Math.min(1, (c - C.normalMax01) / (1 - C.normalMax01)));
      const target = running ? C.ambienceGain : 0;
      forest.gain.setTargetAtTime(target * (1 - amount) * (windy ? 0.3 : 1), context.currentTime, 0.8);
      wind.gain.setTargetAtTime(target * (windy ? 1 : 0.12) * (0.6 + amount * 0.4), context.currentTime, 0.8);
      if (!running) return;
      const now = context.currentTime;
      if (c > 0.55 && !corrupt && now >= nextEntry) { play('corruptionEntry'); nextEntry = now + C.entryCooldownSeconds; corrupt = true; }
      if (c <= C.normalMax01) corrupt = false;
      if (now < nextCue) return;
      if ((snapshot.lanternFuel01 ?? 1) < C.lowFuel01) play('lowFuel');
      else if (snow) play('iceCreak');
      else if (c <= C.normalMax01) play('bird');
      nextCue = now + C.cueCooldownSeconds;
    },
    dispose() { disposed = true; stop(); forest.disconnect(); wind.disconnect(); },
  };
}
