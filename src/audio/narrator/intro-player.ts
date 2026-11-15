/** Local welcome and event commentary, with cooldowns, caption sync and resumable silence.
 * Never fetches an API or changes gameplay. The existing audio loader supplies local buffers.
 */
import { NARRATOR_MOMENTS } from '../../config/audio.config';
import { watchNarratorMoments } from './moments';
import { narrationGain } from './level';
import type { Stores } from '../../shared/contracts/app';
import type { AudioConfig } from '../../shared/contracts/config';
import type { NarratorLine, NarratorMoment } from '../../shared/contracts/content';
import type { EventBus } from '../../shared/contracts/events';
interface Speech { line: NarratorLine; buffer: AudioBuffer; offset: number; startedAt: number; node: AudioBufferSourceNode | null; gain: GainNode | null }
export function createIntroPlayer(context: AudioContext, output: GainNode, bus: EventBus, stores: Stores,
  lines: readonly NarratorLine[], config: AudioConfig['narrator'], load: (path: string | null) => Promise<AudioBuffer | null>,
  random: () => number = Math.random, voicePrefix: string | null = null, initialBestPx = 0) {
  const buffers = new Map<string, AudioBuffer | null>(), used = new Map<string, number>();
  const levels = new Map<string, number>();
  let introducing = false, previewing = false, previewLine: NarratorLine | null = null;
  let disposed = false, loaded = false, served = false;
  let pending = stores.snapshot.get().phase === 'playing', speech: Speech | null = null, parked: Speech | null = null, lastStart = -Infinity;
  const queue: Array<{moment: NarratorMoment; at: number}> = [];
  const hasMoments = lines.some(line => line.moment !== undefined);
  const matchesVoice = (line: NarratorLine): boolean => voicePrefix === null || line.id.startsWith(voicePrefix);
  const request = (moment: NarratorMoment): void => {
    if (!lines.some(line => line.moment === moment && matchesVoice(line))) return;
    if (queue.some(item => item.moment === moment)) return;
    // Completion guidance wins over a simultaneous height milestone.
    if (moment === 'stage' || moment === 'tutorial' || moment === 'finish') queue.splice(0, queue.length);
    if (queue.length < 3) queue.push({moment,at:context.currentTime*1000});
  };
  const clearCaption = (lineId: string): void => bus.emit({type:'narrator_line',lineId,text:'',durationMs:0});
  const detach = (value: Speech): void => {
    const node = value.node; if (!node) return;
    value.offset = Math.min(value.buffer.duration, value.offset + Math.max(0, context.currentTime - value.startedAt));
    value.node = null; node.onended = null;
    try { node.stop(); } catch { /* Already ended. */ }
    node.disconnect(); value.gain?.disconnect(); value.gain = null; clearCaption(value.line.id);
  };
  const cancel = (): void => { if (speech) detach(speech); speech = null; parked = null; previewLine = null; previewing = false; introducing = false; };
  const blocked = (): boolean => (!previewing && !['playing', 'ember', 'finished', ...(introducing ? ['menu'] : [])].includes(stores.snapshot.get().phase)) ||
    stores.settings.get().volumes.master <= 0 || stores.settings.get().volumes.narrator <= 0;
  const startSpeech = (value: Speech): void => {
    const remaining = value.buffer.duration - value.offset;
    if (remaining <= 0.02) { speech = null; previewing = false; introducing = false; return; }
    const source = context.createBufferSource(); source.buffer = value.buffer;
    const gain = context.createGain(); gain.gain.setValueAtTime(levels.get(value.line.id) ?? 1, context.currentTime);
    source.connect(gain); gain.connect(output); value.gain = gain;
    value.node = source; value.startedAt = context.currentTime;
    source.onended = () => { if (value.node !== source) return; value.node = null; source.disconnect(); gain.disconnect(); value.gain = null; if (speech === value) { speech = parked; parked = null; previewing = false; introducing = false; clearCaption(value.line.id); } };
    source.start(context.currentTime, value.offset);
    bus.emit({type:'narrator_line',lineId:value.line.id,text:value.line.text,durationMs:remaining*1000,offsetMs:value.offset*1000});
  };
  const tick = (): void => {
    if (disposed) return;
    if (blocked()) { if (speech) detach(speech); return; }
    if (context.state !== 'running' || !loaded) return;
    if (previewLine) {
      const line = previewLine; previewLine = null;
      if (introducing) { lastStart = context.currentTime * 1000; used.set(line.id, lastStart); }
      const buffer = buffers.get(line.id);
      if (buffer) { speech = {line,buffer,offset:0,startedAt:context.currentTime,node:null,gain:null}; startSpeech(speech); }
      else { previewing = false; introducing = false; speech = parked; parked = null; bus.emit({type:'narrator_line',lineId:line.id,text:line.text,durationMs:4000}); }
      return;
    }
    if (speech) { if (!speech.node) startSpeech(speech); return; }
    const now = context.currentTime * 1000;
    const fuel = stores.snapshot.get().lanternFuel01;
    if (!(fuel !== undefined && Number.isFinite(fuel) && fuel > 0 && fuel < NARRATOR_MOMENTS.lowFuel01)) {
      for (let i = queue.length - 1; i >= 0; i--) if (queue[i]!.moment === 'low-fuel') queue.splice(i, 1);
    }
    while (queue.length && now - queue[0]!.at > NARRATOR_MOMENTS.eventExpiryMs && !['tutorial','finish','low-fuel'].includes(queue[0]!.moment)) queue.shift();
    const opening = pending && !served;
    const moment = opening ? 'welcome' : queue[0]?.moment;
    if (!moment || now - lastStart < (hasMoments ? NARRATOR_MOMENTS.cooldownMs : config.cooldownMs)) return;
    const available = lines.filter((line) => matchesVoice(line) && (opening ? line.moment === 'welcome' || (!line.moment && !lines.some(l => matchesVoice(l) && l.moment === 'welcome')) : line.moment === moment) && now - (used.get(line.id) ?? -Infinity) >= config.repeatCooldownMs);
    // A restart inside the repeat cooldown skips the welcome rather than holding every moment for it.
    if (!available.length) { if (opening) { pending = false; served = true; tick(); } else queue.shift(); return; }
    const line = available[Math.min(available.length - 1, Math.max(0, Math.floor(random() * available.length)))];
    if (!line) return;
    if (opening) { pending = false; served = true; } else queue.shift();
    lastStart = now; used.set(line.id, now);
    const buffer = buffers.get(line.id);
    if (!buffer) {
      bus.emit({type:'narrator_line',lineId:line.id,text:line.text,durationMs:Math.max(4000,line.text.split(/\s+/).length*400)});
      return;
    }
    speech = {line,buffer,offset:0,startedAt:context.currentTime,node:null,gain:null}; startSpeech(speech);
  };
  const cleanups = [bus.on('narrator_intro_requested', () => {
    const line = lines.find(candidate => matchesVoice(candidate) && candidate.moment === 'welcome') ?? lines.find(matchesVoice);
    if (!line || disposed || stores.snapshot.get().phase !== 'menu') return;
    cancel(); served = true; pending = false; introducing = true; previewLine = line; tick();
  }), bus.on('start', () => { if (!served) pending = true; tick(); }),
    bus.on('run_restart', () => { cancel(); queue.length = 0; served = false; pending = true; tick(); }),
    bus.on('finish', () => { pending = false; queue.length = 0; }),
    watchNarratorMoments(bus, stores.snapshot, request, initialBestPx),
    stores.snapshot.subscribe(tick), stores.settings.subscribe(tick)];
  const ready = Promise.all(lines.map(async (line) => { const buffer = await load(line.clip); if (!disposed) { buffers.set(line.id, buffer); if (buffer) levels.set(line.id,narrationGain(buffer)); } }))
    .then(() => { loaded = true; tick(); });
  return {ready,tick,
    setVoice(prefix: string): void { if (prefix === voicePrefix) return; cancel(); queue.length = 0; voicePrefix = prefix; },
    preview(): void {
      const line = lines.find(candidate => matchesVoice(candidate) && candidate.moment === 'welcome') ?? lines.find(matchesVoice);
      if (!line || disposed) return;
      // A game line parked by pause comes back after the preview; a live one is replaced as before.
      const keep = !previewing && speech && !speech.node ? speech : parked;
      cancel(); parked = keep; previewing = true; previewLine = line; tick();
    },
    stopPreview(): void { if (previewing) { const keep = parked; cancel(); speech = keep; } },
    getActiveLine: (): string | null => speech?.line.id ?? null,
    isSpeaking: (): boolean => Boolean(speech?.node),
    getLoadedClipCount: (): number => [...buffers.values()].filter((buffer) => buffer !== null).length,
    dispose(): void { if (disposed) return; disposed = true; pending = false; cancel(); for (const cleanup of cleanups) cleanup(); buffers.clear(); levels.clear(); },
  };
}
