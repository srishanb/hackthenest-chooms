/** Local three-stage music behind existing quiet/tense buses, retaining Insistent as a transition bed. */
import { WORLD_AUDIO_CONFIG as C } from '../config/audio.config';
import { startMusicLayers } from './music-layers';
export function soundtrackPosition(c: number): number {
  if (!Number.isFinite(c)) return 0;
  return Math.max(0, Math.min(1, (c - C.normalMax01) / (C.metalFull01 - C.normalMax01)));
}
export function metalPosition(c: number): number {
  if (!Number.isFinite(c)) return 0;
  return Math.max(0, Math.min(1, (c - C.metalStart01) / (C.metalFull01 - C.metalStart01)));
}
export function startWorldSoundtrack(context: AudioContext, outputs: { quiet: GainNode; tense: GainNode },
  buffers: { quiet: AudioBuffer | null; tense: AudioBuffer | null; transition: AudioBuffer | null; metal: AudioBuffer | null }) {
  const transition = context.createGain(), metal = context.createGain(), insistent = context.createGain();
  for (const node of [transition, metal, insistent]) { node.gain.value = 0; node.connect(outputs.tense); }
  const stops = [startMusicLayers(context, { quiet: outputs.quiet, tense: insistent }, buffers, { quiet: 1, tense: 1.74 }),
    startMusicLayers(context, { quiet: transition, tense: metal }, { quiet: buffers.transition, tense: buffers.metal })];
  return {
    update(c: number) {
      const t = metalPosition(c);
      const hasTransition = buffers.transition !== null, hasMetal = buffers.metal !== null;
      transition.gain.setTargetAtTime(hasTransition ? (hasMetal ? Math.cos(t * Math.PI / 2) : 1) : 0, context.currentTime, C.musicEaseSeconds);
      metal.gain.setTargetAtTime(hasMetal ? (hasTransition ? Math.sin(t * Math.PI / 2) : 1) : 0, context.currentTime, C.musicEaseSeconds);
      insistent.gain.setTargetAtTime(hasTransition || hasMetal ? C.insistentGain * (1 - t) : 1, context.currentTime, C.musicEaseSeconds);
    },
    stop() { stops.forEach(stop => stop()); [transition, metal, insistent].forEach(node => node.disconnect()); },
  };
}
