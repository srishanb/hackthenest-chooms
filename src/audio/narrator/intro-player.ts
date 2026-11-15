/** One original local intro per run, with cooldowns, caption sync and resumable silence.
 * Never fetches an API or changes gameplay. The existing audio loader supplies local buffers.
 */
import { narrationGain } from './level';
import type { Stores } from '../../shared/contracts/app';
import type { AudioConfig } from '../../shared/contracts/config';
import type { NarratorLine } from '../../shared/contracts/content';
import type { EventBus } from '../../shared/contracts/events';
interface Speech { line: NarratorLine; buffer: AudioBuffer; offset: number; startedAt: number; node: AudioBufferSourceNode | null; gain: GainNode | null }
export function createIntroPlayer(context: AudioContext, output: GainNode, bus: EventBus, stores: Stores,
  lines: readonly NarratorLine[], config: AudioConfig['narrator'], load: (path: string | null) => Promise<AudioBuffer | null>,
  random: () => number = Math.random, voicePrefix: string | null = null) {
  const buffers = new Map<string, AudioBuffer | null>(), used = new Map<string, number>();
  const levels = new Map<string, number>();
  let previewing = false, previewLine: NarratorLine | null = null;
  let disposed = false, loaded = false, served = false;
  let pending = stores.snapshot.get().phase === 'playing', speech: Speech | null = null, lastStart = -Infinity;
  const clearCaption = (lineId: string): void => bus.emit({type:'narrator_line',lineId,text:'',durationMs:0});
  const detach = (value: Speech): void => {
    const node = value.node; if (!node) return;
    value.offset = Math.min(value.buffer.duration, value.offset + Math.max(0, context.currentTime - value.startedAt));
    value.node = null; node.onended = null;
    try { node.stop(); } catch { /* Already ended. */ }
    node.disconnect(); value.gain?.disconnect(); value.gain = null; clearCaption(value.line.id);
  };
  const cancel = (): void => { if (speech) detach(speech); speech = null; previewLine = null; previewing = false; };
  const blocked = (): boolean => (!previewing && !['playing', 'ember'].includes(stores.snapshot.get().phase)) ||
    stores.settings.get().volumes.master <= 0 || stores.settings.get().volumes.narrator <= 0;
  const startSpeech = (value: Speech): void => {
    const remaining = value.buffer.duration - value.offset;
    if (remaining <= 0.02) { speech = null; previewing = false; return; }
    const source = context.createBufferSource(); source.buffer = value.buffer;
    const gain = context.createGain(); gain.gain.setValueAtTime(levels.get(value.line.id) ?? 1, context.currentTime);
    source.connect(gain); gain.connect(output); value.gain = gain;
    value.node = source; value.startedAt = context.currentTime;
    source.onended = () => { if (value.node !== source) return; value.node = null; source.disconnect(); gain.disconnect(); value.gain = null; if (speech === value) { speech = null; previewing = false; clearCaption(value.line.id); } };
    source.start(context.currentTime, value.offset);
    bus.emit({type:'narrator_line',lineId:value.line.id,text:value.line.text,durationMs:remaining*1000});
  };
  const tick = (): void => {
    if (disposed) return;
    if (blocked()) { if (speech) detach(speech); return; }
    if (context.state !== 'running' || !loaded) return;
    if (previewLine) {
      const line = previewLine; previewLine = null;
      const buffer = buffers.get(line.id);
      if (buffer) { speech = {line,buffer,offset:0,startedAt:context.currentTime,node:null,gain:null}; startSpeech(speech); }
      else { previewing = false; bus.emit({type:'narrator_line',lineId:line.id,text:line.text,durationMs:4000}); }
      return;
    }
    if (speech) { if (!speech.node) startSpeech(speech); return; }
    if (!pending || served) return;
    const now = context.currentTime * 1000;
    if (now - lastStart < config.cooldownMs) return;
    const available = lines.filter((line) => (voicePrefix === null || line.id.startsWith(voicePrefix)) && now - (used.get(line.id) ?? -Infinity) >= config.repeatCooldownMs);
    if (!available.length) return;
    const line = available[Math.min(available.length - 1, Math.max(0, Math.floor(random() * available.length)))];
    if (!line) return;
    pending = false; served = true; lastStart = now; used.set(line.id, now);
    const buffer = buffers.get(line.id);
    if (!buffer) {
      bus.emit({type:'narrator_line',lineId:line.id,text:line.text,durationMs:Math.max(4000,line.text.split(/\s+/).length*400)});
      return;
    }
    speech = {line,buffer,offset:0,startedAt:context.currentTime,node:null,gain:null}; startSpeech(speech);
  };
  const cleanups = [bus.on('start', () => { if (!served) pending = true; tick(); }),
    bus.on('run_restart', () => { cancel(); served = false; pending = true; tick(); }),
    bus.on('finish', () => { pending = false; cancel(); }),
    stores.snapshot.subscribe(tick), stores.settings.subscribe(tick)];
  const ready = Promise.all(lines.map(async (line) => { const buffer = await load(line.clip); if (!disposed) { buffers.set(line.id, buffer); if (buffer) levels.set(line.id,narrationGain(buffer)); } }))
    .then(() => { loaded = true; tick(); });
  return {ready,tick,
    setVoice(prefix: string): void { cancel(); voicePrefix = prefix; },
    preview(): void {
      const line = lines.find(candidate => voicePrefix === null || candidate.id.startsWith(voicePrefix));
      if (!line || disposed) return;
      cancel(); previewing = true; previewLine = line; tick();
    },
    stopPreview(): void { if (previewing) cancel(); },
    getActiveLine: (): string | null => speech?.line.id ?? null,
    getLoadedClipCount: (): number => [...buffers.values()].filter((buffer) => buffer !== null).length,
    dispose(): void { if (disposed) return; disposed = true; pending = false; cancel(); for (const cleanup of cleanups) cleanup(); buffers.clear(); levels.clear(); },
  };
}
