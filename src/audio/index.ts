/** Local audio composition: gesture unlock, music loading and live mix subscriptions.
 * No runtime APIs/CDNs; missing assets are silence. SFX consumes game events; intros use downloaded clips and matching captions.
 */
import type { Stores } from '../shared/contracts/app';
import type { AudioConfig } from '../shared/contracts/config';
import type { NarratorLine } from '../shared/contracts/content';
import type { EventBus } from '../shared/contracts/events';
import { getLocalStorage } from '../shared/safe-storage';
import { INTRO_MUSIC_DUCK, NARRATOR_VOICES, DEFAULT_NARRATOR_VOICE, NARRATOR_VOICE_STORAGE_KEY, NARRATOR_VOICE_EVENT } from '../config/audio.config';
import { EMBER_CONFIG } from '../config/ember.config';
import { MUSIC_ASSETS, MUSIC_LEVEL_TRIM, SFX_ASSETS, type MusicAssets } from './asset-list';
import { createAudioEngine } from './engine';
import { createAudioLoader } from './loader';
import { computeMix, type MixGains } from './mix-rules';
import { startMusicLayers } from './music-layers';
import { createSfxPlayer, type SfxAssets } from './sfx';
import { createIntroPlayer } from './narrator/intro-player';
import { sfxForEvent } from './sfx-map';

export interface AudioDeps {
  bus: EventBus;
  stores: Stores;
  config: AudioConfig;
  narratorLines: readonly NarratorLine[];
}
export interface AudioEnvironment {
  createContext(): AudioContext;
  gestures: EventTarget;
  baseURL: URL;
  fetcher?: typeof fetch;
  assets?: MusicAssets;
  sfxAssets?: SfxAssets;
}
export interface AudioHandle {
  ready: Promise<void>;
  dispose(): void;
  getDiagnostics(): { state: AudioContextState | 'unavailable'; gains: MixGains; loaded: boolean; sfxVoices: number; narratorClips: number; narratorLine: string | null };
}

export function createAudio(deps: AudioDeps, environment?: AudioEnvironment): AudioHandle {
  const env = environment ?? { createContext: () => new AudioContext(), gestures: window,
    baseURL: new URL('./', document.baseURI) };
  let context: AudioContext;
  try { context = env.createContext(); }
  catch {
    console.warn('[audio] unavailable audio context; using silence');
    return { ready: Promise.resolve(), dispose() {}, getDiagnostics: () => ({ state: 'unavailable',
      gains: { quiet: 0, tense: 0, sfx: 0, narrator: 0 }, loaded: false, sfxVoices: 0, narratorClips: 0, narratorLine: null }) };
  }
  const engine = createAudioEngine(context, deps.config.musicCrossfadeMs);
  const abort = new AbortController();
  const load = createAudioLoader(context, env.baseURL, abort.signal, env.fetcher);
  const sfx = createSfxPlayer(context, engine.nodes.sfx, env.sfxAssets ?? SFX_ASSETS, load,
    () => ['paused', 'menu', 'calibrating'].includes(deps.stores.snapshot.get().phase));
  let disposed = false, dirty = true, loaded = false, stopMusic = (): void => {};
  const apply = (force = false): void => {
    if (disposed) return;
    const snapshot = deps.stores.snapshot.get();
    const mix = computeMix({ tenseMix01: deps.stores.effects.get().musicTenseMix,
      volumes: deps.stores.settings.get().volumes, phase: snapshot.phase,
      inRefuge: snapshot.inRefuge, emberActive: snapshot.ember.active }, deps.config);
    const duck = narrator.getActiveLine() === null ? 1 : INTRO_MUSIC_DUCK;
    engine.apply({ ...mix, quiet: mix.quiet * duck, tense: mix.tense * duck }, force);
    dirty = false;
  };
  const voiceStorage = typeof window === 'undefined' ? undefined : getLocalStorage(window);
  let storedVoice: string | null = null;
  try { storedVoice = voiceStorage?.getItem(NARRATOR_VOICE_STORAGE_KEY) ?? null; } catch { /* Private mode. */ }
  const chosenVoice = NARRATOR_VOICES.find(voice => voice.id === storedVoice) ?? NARRATOR_VOICES.find(voice => voice.id === DEFAULT_NARRATOR_VOICE)!;
  const narrator = createIntroPlayer(context, engine.nodes.narrator, deps.bus, deps.stores,
    deps.narratorLines, deps.config.narrator, load, Math.random,
    deps.narratorLines.some(line => line.id.startsWith(chosenVoice.prefix)) ? chosenVoice.prefix : null);
  const onVoice = (event: Event): void => {
    const detail: unknown = (event as CustomEvent<unknown>).detail;
    if (!detail || typeof detail !== 'object') return;
    const request = detail as { voice?: unknown; preview?: unknown; stop?: unknown };
    if (request.stop === true) { narrator.stopPreview(); return; }
    const voice = NARRATOR_VOICES.find(candidate => candidate.id === request.voice);
    if (!voice) return;
    narrator.setVoice(voice.prefix);
    if (request.preview === true) narrator.preview();
  };
  env.gestures.addEventListener(NARRATOR_VOICE_EVENT, onVoice);
  let unlocking = false;
  const unlock = (): void => {
    if (disposed || unlocking) return;
    unlocking = true;
    // resume is called inside the original gesture, before awaiting anything.
    void context.resume().then(() => {
      unlocking = false;
      if (!disposed && context.state === 'running') {
        narrator.tick();
        env.gestures.removeEventListener('keydown', unlock); env.gestures.removeEventListener('pointerdown', unlock);
      }
    }).catch(() => { unlocking = false; }); // Next gesture retries if the browser refused.
  };
  env.gestures.addEventListener('keydown', unlock); env.gestures.addEventListener('pointerdown', unlock);
  const cleanups = [deps.bus.onAny((event) => { const id = sfxForEvent(event, EMBER_CONFIG.bigFallPx); if (id) sfx.play(id); }),
    deps.stores.effects.subscribe(() => { dirty = true; }),
    deps.stores.snapshot.subscribe(() => { dirty = true;
      if (['paused', 'menu', 'calibrating'].includes(deps.stores.snapshot.get().phase)) sfx.stop(); }),
    deps.stores.settings.subscribe(() => apply(true))];
  let wasNarrating = false;
  const timer = setInterval(() => {
    narrator.tick();
    const narrating = narrator.getActiveLine() !== null;
    if (narrating !== wasNarrating) { wasNarrating = narrating; dirty = true; }
    if (dirty) apply();
  }, 100);
  apply(true);
  const assets = env.assets ?? MUSIC_ASSETS;
  const musicReady = Promise.all([load(assets.quiet), load(assets.tense)]).then(([quiet, tense]) => {
    if (disposed) return;
    apply(true); stopMusic = startMusicLayers(context, engine.nodes, { quiet, tense }, MUSIC_LEVEL_TRIM); loaded = quiet !== null || tense !== null;
  });
  const ready = Promise.all([musicReady, sfx.ready, narrator.ready]).then(() => {});
  const dispose = (): void => {
    if (disposed) return; disposed = true; abort.abort(); clearInterval(timer);
    for (const cleanup of cleanups) cleanup();
    env.gestures.removeEventListener('keydown', unlock); env.gestures.removeEventListener('pointerdown', unlock);
    env.gestures.removeEventListener('pagehide', dispose);
    env.gestures.removeEventListener(NARRATOR_VOICE_EVENT, onVoice);
    stopMusic(); sfx.dispose(); narrator.dispose(); engine.dispose();
  };
  env.gestures.addEventListener('pagehide', dispose);
  return { ready, dispose, getDiagnostics: () => ({ state: context.state, gains: engine.getGains(), loaded, sfxVoices: sfx.getVoiceCount(), narratorClips: narrator.getLoadedClipCount(), narratorLine: narrator.getActiveLine() }) };
}
