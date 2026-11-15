/** Exercise lifecycle and gain wiring without speakers, network services or real timers. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUDIO_CONFIG, INTRO_MUSIC_DUCK } from '../../config/audio.config';
import { INITIAL_GAME_SNAPSHOT } from '../../shared/contracts/game-state';
import { DEFAULT_SETTINGS } from '../../shared/contracts/settings';
import type { EffectsFrame } from '../../shared/contracts/effects';
import { createEventBus } from '../../shared/bus';
import { createStore } from '../../shared/store';
import { createAudio } from '../index';
import { createAudioEngine } from '../engine';
import { createAudioLoader } from '../loader';
import { startMusicLayers } from '../music-layers';

function fakeContext() {
  const nodes: Array<ReturnType<typeof gain>> = [], sources: Array<ReturnType<typeof source>> = [];
  function gain() { return { gain: { value: 0, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), setTargetAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }; }
  function source() { return { buffer: null, loop: false, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn() }; }
  const context = {
    currentTime: 10, state: 'suspended', destination: {},
    createGain: () => { const next = gain(); nodes.push(next); return next; },
    createBufferSource: () => { const next = source(); sources.push(next); return next; },
    decodeAudioData: vi.fn(async () => ({ duration: 2 } as AudioBuffer)),
    resume: vi.fn(async () => { context.state = 'running'; }),
    close: vi.fn(async () => { context.state = 'closed'; }),
  };
  return { context: context as unknown as AudioContext, raw: context, nodes, sources };
}
function deps() {
  return { bus: createEventBus(), config: AUDIO_CONFIG, narratorLines: [], stores: {
    snapshot: createStore(structuredClone(INITIAL_GAME_SNAPSHOT)), settings: createStore(structuredClone(DEFAULT_SETTINGS)),
    effects: createStore({ musicTenseMix: 0.3 } as EffectsFrame),
  } };
}
const fetchAudio = () => vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(new Uint8Array([1, 2, 3])));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('audio engine', () => {
  it('starts silent and applies master once through already-computed targets', () => {
    const fake = fakeContext(), engine = createAudioEngine(fake.context, 2000);
    expect(fake.nodes.every((node) => node.gain.value === 0)).toBe(true);
    engine.apply({ quiet: 0.4, tense: 0.2, sfx: 0.72, narrator: 0.8 }, true);
    expect(engine.getGains().sfx).toBe(0.72);
    expect(fake.nodes[0]!.gain.setTargetAtTime).toHaveBeenCalledWith(0.4, 10, 2/3);
    engine.apply({ quiet: 0, tense: 0, sfx: 0, narrator: 0 }, true);
    expect(fake.nodes[0]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 10, 0.005);
    engine.dispose(); engine.dispose(); expect(fake.raw.close).toHaveBeenCalledTimes(1);
  });
  it('starts both available loops at one time and stops them during cleanup', () => {
    const fake = fakeContext(), engine = createAudioEngine(fake.context, 1), buffer = {} as AudioBuffer;
    const stop = startMusicLayers(fake.context, engine.nodes, { quiet: buffer, tense: buffer });
    expect(fake.sources).toHaveLength(2);
    expect(fake.sources.every((node) => node.loop)).toBe(true);
    expect(fake.sources[0]!.start).toHaveBeenCalledWith(10.02);
    expect(fake.sources[1]!.start).toHaveBeenCalledWith(10.02);
    stop(); expect(fake.sources.every((node) => node.stop.mock.calls.length === 1)).toBe(true);
    engine.dispose();
  });
  it('unlocks only on a gesture, retries refused resume and removes listeners on success', async () => {
    vi.useFakeTimers(); const fake = fakeContext(), gestures = new EventTarget();
    fake.raw.resume.mockRejectedValueOnce(new Error('not allowed'));
    const audio = createAudio(deps(), { createContext: () => fake.context, gestures,
      baseURL: new URL('http://localhost/game/'), sfxAssets: {}, assets: { quiet: null, tense: null } });
    await audio.ready; expect(fake.raw.resume).not.toHaveBeenCalled();
    gestures.dispatchEvent(new Event('keydown')); await Promise.resolve(); await Promise.resolve();
    gestures.dispatchEvent(new Event('pointerdown')); await Promise.resolve(); await Promise.resolve();
    expect(fake.raw.resume).toHaveBeenCalledTimes(2);
    gestures.dispatchEvent(new Event('keydown')); expect(fake.raw.resume).toHaveBeenCalledTimes(2);
    audio.dispose(); expect(vi.getTimerCount()).toBe(0);
  });
  it('keeps a mute made while audio loads and cannot start loops after disposal', async () => {
    vi.useFakeTimers(); const fake = fakeContext(), data = deps();
    let resolve!: (response: Response) => void;
    const fetcher = vi.fn(() => new Promise<Response>((done) => { resolve = done; }));
    const audio = createAudio(data, { createContext: () => fake.context, gestures: new EventTarget(),
      baseURL: new URL('http://localhost/'), fetcher, sfxAssets: {}, assets: { quiet: 'assets/audio/test.ogg', tense: null } });
    data.stores.settings.set({ ...data.stores.settings.get(), volumes: { ...data.stores.settings.get().volumes, master: 0 } });
    expect(audio.getDiagnostics().gains).toEqual({ quiet: 0, tense: 0, sfx: 0, narrator: 0 });
    audio.dispose(); resolve(new Response(new Uint8Array([1]))); await audio.ready;
    expect(fake.sources).toHaveLength(0); expect(fake.raw.decodeAudioData).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('follows effects at ten Hz and phase/volume changes without polling forever after dispose', async () => {
    vi.useFakeTimers(); const fake = fakeContext(), data = deps();
    const audio = createAudio(data, { createContext: () => fake.context, gestures: new EventTarget(),
      baseURL: new URL('http://localhost/'), sfxAssets: {}, assets: { quiet: null, tense: null } });
    await audio.ready; const playing = audio.getDiagnostics().gains.quiet;
    data.stores.snapshot.set({ ...data.stores.snapshot.get(), inRefuge: true });
    vi.advanceTimersByTime(100); expect(audio.getDiagnostics().gains.quiet).toBeCloseTo(playing * 0.5);
    data.stores.effects.set({ musicTenseMix: 1 } as EffectsFrame);
    vi.advanceTimersByTime(99); expect(audio.getDiagnostics().gains.quiet).toBeGreaterThan(0);
    vi.advanceTimersByTime(1); expect(audio.getDiagnostics().gains.quiet).toBe(0);
    data.stores.settings.set({ ...data.stores.settings.get(), volumes: { ...data.stores.settings.get().volumes, music: 0 } });
    expect(audio.getDiagnostics().gains.tense).toBe(0);
    audio.dispose(); expect(vi.getTimerCount()).toBe(0);
  });
  it('releases the music duck while a narrator line is parked by mute', async () => {
    vi.useFakeTimers(); const fake = fakeContext(), data = { ...deps(), narratorLines: [{ id: 'intro-test', text: 'Hello.', clip: 'assets/audio/narrator/test.mp3' }] };
    fake.raw.state = 'running';
    const audio = createAudio(data, { createContext: () => fake.context, gestures: new EventTarget(),
      baseURL: new URL('http://localhost/'), fetcher: fetchAudio(), sfxAssets: {}, assets: { quiet: null, tense: null } });
    await audio.ready; const full = audio.getDiagnostics().gains.quiet;
    vi.advanceTimersByTime(100); expect(audio.getDiagnostics().narratorLine).toBe('intro-test');
    expect(audio.getDiagnostics().gains.quiet).toBeCloseTo(full * INTRO_MUSIC_DUCK);
    const settings = data.stores.settings.get();
    data.stores.settings.set({ ...settings, volumes: { ...settings.volumes, narrator: 0 } });
    vi.advanceTimersByTime(100); expect(audio.getDiagnostics().gains.quiet).toBeCloseTo(full);
    audio.dispose();
  });
  it('fails quietly if no audio context exists', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const audio = createAudio(deps(), { createContext() { throw new Error('unsupported'); }, gestures: new EventTarget(), baseURL: new URL('http://localhost/') });
    await audio.ready; expect(audio.getDiagnostics().state).toBe('unavailable'); audio.dispose();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('local audio loader', () => {
  it('fetches a local asset once, relative to a nested deployment base', async () => {
    const fake = fakeContext(), fetcher = fetchAudio();
    const load = createAudioLoader(fake.context, new URL('http://localhost/game/'), new AbortController().signal, fetcher);
    const a = load('assets/audio/music/test.ogg'), b = load('assets/audio/music/test.ogg');
    expect(a).toBe(b); expect(await a).not.toBeNull(); expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0]![0])).toBe('http://localhost/game/assets/audio/music/test.ogg');
  });
  it('caches missing files and prevents external/traversal requests', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fake = fakeContext(), fetcher = vi.fn(async () => new Response('', { status: 404 }));
    const load = createAudioLoader(fake.context, new URL('http://localhost/'), new AbortController().signal, fetcher);
    expect(await load('assets/audio/missing.ogg')).toBeNull(); expect(await load('assets/audio/missing.ogg')).toBeNull();
    expect(await load('https://example.invalid/file.ogg')).toBeNull();
    expect(await load('assets/audio/../other.ogg')).toBeNull(); expect(await load(null)).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
