/** Local audio composition: gesture unlock, music loading and live mix subscriptions.
 * No runtime APIs/CDNs; missing assets are silence. SFX consumes game events; narrator remains a later task.
 */
import type { Stores } from '../shared/contracts/app';
import type { AudioConfig } from '../shared/contracts/config';
import type { NarratorLine } from '../shared/contracts/content';
import type { EventBus } from '../shared/contracts/events';
import { EMBER_CONFIG } from '../config/ember.config';
import { MUSIC_ASSETS, SFX_ASSETS, type MusicAssets } from './asset-list';
import { createAudioEngine } from './engine';
import { createAudioLoader } from './loader';
import { computeMix, type MixGains } from './mix-rules';
import { startMusicLayers } from './music-layers';
import { createSfxPlayer, type SfxAssets } from './sfx';
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
  getDiagnostics(): { state: AudioContextState | 'unavailable'; gains: MixGains; loaded: boolean; sfxVoices: number };
}

export function createAudio(deps: AudioDeps, environment?: AudioEnvironment): AudioHandle {
  const env = environment ?? { createContext: () => new AudioContext(), gestures: window,
    baseURL: new URL('./', document.baseURI) };
  let context: AudioContext;
  try { context = env.createContext(); }
  catch {
    console.warn('[audio] unavailable audio context; using silence');
    return { ready: Promise.resolve(), dispose() {}, getDiagnostics: () => ({ state: 'unavailable',
      gains: { quiet: 0, tense: 0, sfx: 0, narrator: 0 }, loaded: false, sfxVoices: 0 }) };
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
    engine.apply(computeMix({ tenseMix01: deps.stores.effects.get().musicTenseMix,
      volumes: deps.stores.settings.get().volumes, phase: snapshot.phase,
      inRefuge: snapshot.inRefuge, emberActive: snapshot.ember.active }, deps.config), force);
    dirty = false;
  };
  let unlocking = false;
  const unlock = (): void => {
    if (disposed || unlocking) return;
    unlocking = true;
    // resume is called inside the original gesture, before awaiting anything.
    void context.resume().then(() => {
      unlocking = false;
      if (!disposed && context.state === 'running') {
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
  const timer = setInterval(() => { if (dirty) apply(); }, 100);
  apply(true);
  const assets = env.assets ?? MUSIC_ASSETS;
  const musicReady = Promise.all([load(assets.quiet), load(assets.tense)]).then(([quiet, tense]) => {
    if (disposed) return;
    apply(true); stopMusic = startMusicLayers(context, engine.nodes, { quiet, tense }); loaded = quiet !== null || tense !== null;
  });
  const ready = Promise.all([musicReady, sfx.ready]).then(() => {});
  const dispose = (): void => {
    if (disposed) return; disposed = true; abort.abort(); clearInterval(timer);
    for (const cleanup of cleanups) cleanup();
    env.gestures.removeEventListener('keydown', unlock); env.gestures.removeEventListener('pointerdown', unlock);
    env.gestures.removeEventListener('pagehide', dispose);
    stopMusic(); sfx.dispose(); engine.dispose();
  };
  env.gestures.addEventListener('pagehide', dispose);
  return { ready, dispose, getDiagnostics: () => ({ state: context.state, gains: engine.getGains(), loaded, sfxVoices: sfx.getVoiceCount() }) };
}
