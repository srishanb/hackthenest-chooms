/** Real bus/store orchestration with mocked audio: timing, silence, captions and cleanup. */
import { expect, it, vi } from 'vitest';
import { createEventBus } from '../../shared/bus';
import { createStore } from '../../shared/store';
import { INITIAL_GAME_SNAPSHOT, type GameSnapshot } from '../../shared/contracts/game-state';
import { DEFAULT_SETTINGS } from '../../shared/contracts/settings';
import type { EffectsFrame } from '../../shared/contracts/effects';
import type { GameEvent } from '../../shared/contracts/events';
import { createIntroPlayer } from '../narrator/intro-player';
function setup(missing = false) {
  const sources: Array<{start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; onended: null | (() => void)}> = [];
  const raw = {currentTime:0,state:'running',createGain(){return {gain:{setValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()};},createBufferSource(){
    const source = {buffer:null,connect:vi.fn(),start:vi.fn(),stop:vi.fn(),disconnect:vi.fn(),onended:null as null | (() => void)};
    sources.push(source); return source;
  }};
  const context = raw as unknown as AudioContext;
  const bus = createEventBus(), events: GameEvent[] = []; bus.onAny((event) => events.push(event));
  const stores = {snapshot:createStore<GameSnapshot>({...INITIAL_GAME_SNAPSHOT,phase:'menu'}),settings:createStore(structuredClone(DEFAULT_SETTINGS)),effects:createStore({} as EffectsFrame)};
  const lines = [1,2].map((id)=>({id:`intro-${id}`,text:`Welcome to the climb. Gravity has prepared a very detailed counterargument, and it intends to repeat itself.`,clip:missing?null:`assets/audio/narrator/intro-${id}.mp3`}));
  const player = createIntroPlayer(context,{} as GainNode,bus,stores,lines,{cooldownMs:8000,repeatCooldownMs:120000},async()=>missing?null:({duration:5} as AudioBuffer),()=>0);
  const start=()=>{stores.snapshot.set({...stores.snapshot.get(),phase:'playing'});bus.emit({type:'start'});};
  return {raw,sources,bus,events,stores,player,start};
}
it('starts once after Play, uses actual clip duration, and ignores menu continuation',async()=>{
  const s=setup();await s.player.ready;expect(s.sources).toHaveLength(0);s.start();s.player.tick();
  expect(s.sources).toHaveLength(1);
  expect(s.events.filter(e=>e.type==='narrator_line')).toMatchObject([{lineId:'intro-1',durationMs:5000}]);
  s.sources[0]!.onended?.();s.bus.emit({type:'start'});s.player.tick();expect(s.sources).toHaveLength(1);s.player.dispose();
});
it('parks on pause, resumes at exact audio offset, and keeps speaking through jumps and Ember recovery',async()=>{
  const s=setup();await s.player.ready;s.start();s.raw.currentTime=1.5;
  s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'paused'});expect(s.sources[0]!.stop).toHaveBeenCalledTimes(1);
  s.raw.currentTime=8;s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'playing'});
  expect(s.sources[1]!.start).toHaveBeenCalledWith(8,1.5);
  expect(s.events.at(-1)).toMatchObject({type:'narrator_line',durationMs:3500});
  s.bus.emit({type:'jump',charge01:0.8});
  s.bus.emit({type:'precision_window',active:true});
  s.player.tick();expect(s.sources).toHaveLength(2);
  expect(s.sources[1]!.stop).not.toHaveBeenCalled();
  s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'ember'});
  expect(s.sources[1]!.stop).not.toHaveBeenCalled();
  s.bus.emit({type:'precision_window',active:false});
  s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'playing'});
  expect(s.sources).toHaveLength(2);
  s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'paused'});
  expect(s.sources[1]!.stop).toHaveBeenCalledTimes(1);s.player.dispose();
});
it('honors global and repeat cooldowns on restart, with no overlap',async()=>{
  const s=setup();await s.player.ready;s.start();s.raw.currentTime=1;s.bus.emit({type:'run_restart'});
  expect(s.sources[0]!.stop).toHaveBeenCalledTimes(1);expect(s.sources).toHaveLength(1);
  s.raw.currentTime=9;s.player.tick();expect(s.sources).toHaveLength(2);expect(s.player.getActiveLine()).toBe('intro-2');s.player.dispose();
});
it('waits for gesture unlock, respects mute and uses captions when a clip is unavailable',async()=>{
  const s=setup(true);s.raw.state='suspended';await s.player.ready;s.start();expect(s.events.filter(e=>e.type==='narrator_line')).toHaveLength(0);
  s.raw.state='running';s.stores.settings.set({...s.stores.settings.get(),volumes:{...s.stores.settings.get().volumes,narrator:0}});s.player.tick();
  expect(s.events.filter(e=>e.type==='narrator_line')).toHaveLength(0);
  s.stores.settings.set({...s.stores.settings.get(),volumes:{...s.stores.settings.get().volumes,narrator:1}});
  expect(s.events.at(-1)).toMatchObject({type:'narrator_line',lineId:'intro-1'});expect(s.sources).toHaveLength(0);s.player.dispose();
});
it('does not start a late decode after dispose and removes bus/store listeners',async()=>{
  const s=setup();s.player.dispose();await s.player.ready;s.start();s.player.tick();expect(s.sources).toHaveLength(0);
});
it('previews during paused settings without consuming the next normal intro',async()=>{
  const s=setup();await s.player.ready;s.player.setVoice('intro-');
  s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'paused'});s.player.preview();
  expect(s.sources).toHaveLength(1);expect(s.player.getActiveLine()).toBe('intro-1');
  s.player.stopPreview();expect(s.sources[0]!.stop).toHaveBeenCalledTimes(1);
  s.start();expect(s.sources).toHaveLength(2);s.player.dispose();
});
it('changes voice-bank eligibility without overlapping the old voice',async()=>{
  const s=setup();await s.player.ready;s.player.setVoice('intro-2');s.start();
  expect(s.player.getActiveLine()).toBe('intro-2');
  s.player.setVoice('intro-1');expect(s.sources[0]!.stop).toHaveBeenCalledTimes(1);
  s.player.preview();expect(s.player.getActiveLine()).toBe('intro-1');s.player.dispose();
});

it('mute remains an explicit interruption and resumes the existing speech',async()=>{
  const s=setup();await s.player.ready;s.start();s.raw.currentTime=2;
  const settings=s.stores.settings.get();
  s.stores.settings.set({...settings,volumes:{...settings.volumes,narrator:0}});
  expect(s.sources[0]!.stop).toHaveBeenCalledTimes(1);
  s.raw.currentTime=5;s.stores.settings.set(settings);
  expect(s.sources[1]!.start).toHaveBeenCalledWith(5,2);s.player.dispose();
});

it('explains the game before start without stepping gameplay or repeating the welcome after Play',async()=>{
  const s=setup();await s.player.ready;s.bus.emit({type:'narrator_intro_requested'});
  expect(s.stores.snapshot.get().phase).toBe('menu');expect(s.sources).toHaveLength(1);
  s.start();expect(s.sources).toHaveLength(1);expect(s.sources[0]!.stop).not.toHaveBeenCalled();
  s.raw.currentTime=1;s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'paused'});
  expect(s.sources[0]!.stop).toHaveBeenCalledTimes(1);
  s.raw.currentTime=3;s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'playing'});
  expect(s.sources[1]!.start).toHaveBeenCalledWith(3,1);s.sources[1]!.onended?.();
  s.bus.emit({type:'start'});s.player.tick();expect(s.sources).toHaveLength(2);s.player.dispose();
});
