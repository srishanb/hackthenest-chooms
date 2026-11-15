/** One original local intro per run, with cooldowns, caption sync and resumable silence.
 * Never fetches an API or changes gameplay. The existing audio loader supplies local buffers.
 */
import type { Stores } from '../../shared/contracts/app';
import type { AudioConfig } from '../../shared/contracts/config';
import type { NarratorLine } from '../../shared/contracts/content';
import type { EventBus } from '../../shared/contracts/events';
interface Speech { line: NarratorLine; buffer: AudioBuffer; offset: number; startedAt: number; node: AudioBufferSourceNode | null }
export function createIntroPlayer(context: AudioContext, output: GainNode, bus: EventBus, stores: Stores,
  lines: readonly NarratorLine[], config: AudioConfig['narrator'], load: (path: string | null) => Promise<AudioBuffer | null>,
  random: () => number = Math.random) {
  const buffers = new Map<string, AudioBuffer | null>(), used = new Map<string, number>();
  let disposed = false, loaded = false, precision = false, served = false;
  let pending = stores.snapshot.get().phase === 'playing', speech: Speech | null = null, lastStart = -Infinity;
  const clearCaption = (lineId: string): void => bus.emit({type:'narrator_line',lineId,text:'',durationMs:0});
  const detach = (value: Speech): void => {
    const node = value.node; if (!node) return;
    value.offset = Math.min(value.buffer.duration, value.offset + Math.max(0, context.currentTime - value.startedAt));
    value.node = null; node.onended = null;
    try { node.stop(); } catch { /* Already ended. */ }
    node.disconnect(); clearCaption(value.line.id);
  };
  const cancel = (): void => { if (speech) detach(speech); speech = null; };
  const blocked = (): boolean => stores.snapshot.get().phase !== 'playing' || precision ||
    stores.settings.get().volumes.master <= 0 || stores.settings.get().volumes.narrator <= 0;
  const startSpeech = (value: Speech): void => {
    const remaining = value.buffer.duration - value.offset;
    if (remaining <= 0.02) { speech = null; return; }
    const source = context.createBufferSource(); source.buffer = value.buffer; source.connect(output);
    value.node = source; value.startedAt = context.currentTime;
    source.onended = () => { if (value.node !== source) return; value.node = null; source.disconnect(); if (speech === value) { speech = null; clearCaption(value.line.id); } };
    source.start(context.currentTime, value.offset);
    bus.emit({type:'narrator_line',lineId:value.line.id,text:value.line.text,durationMs:remaining*1000});
  };
  const tick = (): void => {
    if (disposed) return;
    if (blocked()) { if (speech) detach(speech); return; }
    if (context.state !== 'running' || !loaded) return;
    if (speech) { if (!speech.node) startSpeech(speech); return; }
    if (!pending || served) return;
    const now = context.currentTime * 1000;
    if (now - lastStart < config.cooldownMs) return;
    const available = lines.filter((line) => now - (used.get(line.id) ?? -Infinity) >= config.repeatCooldownMs);
    if (!available.length) return;
    const line = available[Math.min(available.length - 1, Math.max(0, Math.floor(random() * available.length)))];
    if (!line) return;
    pending = false; served = true; lastStart = now; used.set(line.id, now);
    const buffer = buffers.get(line.id);
    if (!buffer) {
      bus.emit({type:'narrator_line',lineId:line.id,text:line.text,durationMs:Math.max(4000,line.text.split(/\s+/).length*400)});
      return;
    }
    speech = {line,buffer,offset:0,startedAt:context.currentTime,node:null}; startSpeech(speech);
  };
  const cleanups = [bus.on('start', () => { if (!served) pending = true; tick(); }),
    bus.on('run_restart', () => { cancel(); served = false; pending = true; tick(); }),
    bus.on('finish', () => { pending = false; cancel(); }),
    bus.on('precision_window', (event) => { precision = event.active; tick(); }),
    stores.snapshot.subscribe(tick), stores.settings.subscribe(tick)];
  const ready = Promise.all(lines.map(async (line) => { const buffer = await load(line.clip); if (!disposed) buffers.set(line.id, buffer); }))
    .then(() => { loaded = true; tick(); });
  return {ready,tick,
    getActiveLine: (): string | null => speech?.line.id ?? null,
    getLoadedClipCount: (): number => [...buffers.values()].filter((buffer) => buffer !== null).length,
    dispose(): void { if (disposed) return; disposed = true; pending = false; cancel(); for (const cleanup of cleanups) cleanup(); buffers.clear(); },
  };
}
