/** Real events and stores, with only the audio clock mocked: approved moment routing. */
import { expect, it, vi } from 'vitest';
import { createEventBus } from '../../shared/bus';
import { createStore } from '../../shared/store';
import { INITIAL_GAME_SNAPSHOT, type GameSnapshot } from '../../shared/contracts/game-state';
import { DEFAULT_SETTINGS } from '../../shared/contracts/settings';
import type { EffectsFrame } from '../../shared/contracts/effects';
import type { NarratorLine, NarratorMoment } from '../../shared/contracts/content';
import { createIntroPlayer } from '../narrator/intro-player';
import { watchNarratorMoments } from '../narrator/moments';
const moments: NarratorMoment[] = ['welcome','tutorial','height','fall','stage','finish','low-fuel'];
function setup() {
  const sources: Array<{onended: (()=>void)|null; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>}> = [];
  const raw = {currentTime:0,state:'running',createGain:()=>({gain:{setValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()}),createBufferSource:()=>{
    const source={buffer:null,onended:null as (()=>void)|null,start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn()};sources.push(source);return source;
  }};
  const bus=createEventBus();
  const stores={snapshot:createStore<GameSnapshot>({...INITIAL_GAME_SNAPSHOT,phase:'menu',stage:{id:'tutorial',index:0,total:5,completed:0}}),settings:createStore(structuredClone(DEFAULT_SETTINGS)),effects:createStore({} as EffectsFrame)};
  const lines: NarratorLine[]=moments.map(moment=>({id:`intro-chris-${moment}`,moment,text:`Approved ${moment} line.`,clip:`${moment}.mp3`}));
  const player=createIntroPlayer(raw as unknown as AudioContext,{} as GainNode,bus,stores,lines,{cooldownMs:8000,repeatCooldownMs:120000},async()=>({duration:4} as AudioBuffer),()=>0,'intro-chris-',500);
  const end=()=>sources.at(-1)?.onended?.();
  const start=()=>{stores.snapshot.set({...stores.snapshot.get(),phase:'playing'});bus.emit({type:'start'});};
  return {raw,bus,stores,player,sources,end,start};
}
it('routes welcome, actual tutorial completion, big fall, personal best and stage to the right clips',async()=>{
  const s=setup();await s.player.ready;s.start();expect(s.player.getActiveLine()).toBe('intro-chris-welcome');s.end();
  s.raw.currentTime=31;s.bus.emit({type:'stage_completed',stageId:'tutorial',index:0});s.player.tick();expect(s.player.getActiveLine()).toBe('intro-chris-tutorial');s.end();
  s.raw.currentTime=62;s.bus.emit({type:'fall',heightPx:801,big:true});s.player.tick();expect(s.player.getActiveLine()).toBe('intro-chris-fall');s.end();
  s.raw.currentTime=93;s.stores.snapshot.set({...s.stores.snapshot.get(),navigation:{originY:1000,player:{x:0,y:200},lanternRadiusPx:100,checkpoints:[]}});expect(s.player.getActiveLine()).toBe('intro-chris-height');s.end();
  s.raw.currentTime=124;s.bus.emit({type:'stage_completed',stageId:'normal',index:1});s.player.tick();expect(s.player.getActiveLine()).toBe('intro-chris-stage');s.player.dispose();
});
it('never says personal best below the saved record, or for each pixel or repeated ascent',()=>{
  const bus=createEventBus(),snapshot=createStore<GameSnapshot>(structuredClone(INITIAL_GAME_SNAPSHOT)),request=vi.fn();
  const off=watchNarratorMoments(bus,snapshot,request,1000);
  const height=(h:number)=>snapshot.set({...snapshot.get(),navigation:{originY:2000,player:{x:0,y:2000-h},lanternRadiusPx:100,checkpoints:[]}});
  height(500);height(1001);expect(request).not.toHaveBeenCalled();height(1300);expect(request).toHaveBeenCalledExactlyOnceWith('height');
  height(500);height(1300);height(1400);expect(request).toHaveBeenCalledTimes(1);off();height(1800);expect(request).toHaveBeenCalledTimes(1);
});
it('drops stale falls, ignores small falls, deduplicates and obeys repeat cooldown',async()=>{
  const s=setup();await s.player.ready;s.start();s.end();
  s.raw.currentTime=2;s.bus.emit({type:'fall',heightPx:20,big:false});s.player.tick();expect(s.sources).toHaveLength(1);
  s.bus.emit({type:'fall',heightPx:801,big:true});s.bus.emit({type:'fall',heightPx:801,big:true});s.raw.currentTime=31;s.player.tick();expect(s.sources).toHaveLength(1);
  s.bus.emit({type:'fall',heightPx:801,big:true});s.player.tick();expect(s.sources).toHaveLength(2);s.end();
  s.raw.currentTime=62;s.bus.emit({type:'fall',heightPx:801,big:true});s.player.tick();expect(s.sources).toHaveLength(2);s.player.dispose();
});
it('holds tutorial completion through pause, gives it priority, and does not promise another final stage',async()=>{
  const s=setup();await s.player.ready;s.start();s.end();s.raw.currentTime=5;
  s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'paused'});s.bus.emit({type:'stage_completed',stageId:'tutorial',index:0});
  s.raw.currentTime=40;s.player.tick();expect(s.sources).toHaveLength(1);s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'playing'});expect(s.player.getActiveLine()).toBe('intro-chris-tutorial');s.end();
  s.raw.currentTime=80;s.bus.emit({type:'stage_completed',stageId:'final',index:4});s.player.tick();expect(s.sources).toHaveLength(2);s.player.dispose();
});
it('finish replaces stale events with its closing line; dispose removes listeners',async()=>{
  const s=setup();await s.player.ready;s.player.preview();expect(s.player.getActiveLine()).toBe('intro-chris-welcome');s.player.stopPreview();s.start();s.end();
  s.bus.emit({type:'stage_completed',stageId:'tutorial',index:0});s.bus.emit({type:'finish'});s.raw.currentTime=60;s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'finished'});s.player.tick();expect(s.player.getActiveLine()).toBe('intro-chris-finish');s.player.dispose();
  s.bus.emit({type:'fall',heightPx:500,big:true});s.player.tick();expect(s.player.getActiveLine()).toBeNull();
});

it('does not cut an ongoing line on finish, jump or recovery, and pauses the closing speech',async()=>{
  const s=setup();await s.player.ready;s.start();s.raw.currentTime=1;
  s.bus.emit({type:'precision_window',active:true});
  s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'ember'});
  expect(s.sources[0]!.stop).not.toHaveBeenCalled();
  s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'finished'});s.bus.emit({type:'finish'});
  expect(s.sources[0]!.stop).not.toHaveBeenCalled();expect(s.player.getActiveLine()).toBe('intro-chris-welcome');
  s.end();s.raw.currentTime=31;s.player.tick();expect(s.player.getActiveLine()).toBe('intro-chris-finish');
  s.raw.currentTime=32;s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'paused'});
  expect(s.sources[1]!.stop).toHaveBeenCalledTimes(1);s.player.dispose();
});

it('requires a finite fall strictly greater than 25 HUD metres, independently of the game big flag',()=>{
  const bus=createEventBus(),snapshot=createStore<GameSnapshot>(structuredClone(INITIAL_GAME_SNAPSHOT)),request=vi.fn();
  const off=watchNarratorMoments(bus,snapshot,request);
  for (const heightPx of [-1,300,799,800,NaN,Infinity]) bus.emit({type:'fall',heightPx,big:true});
  expect(request).not.toHaveBeenCalled();
  bus.emit({type:'fall',heightPx:801,big:false});expect(request).toHaveBeenCalledExactlyOnceWith('fall');
  snapshot.set({...snapshot.get(),phase:'paused'});bus.emit({type:'fall',heightPx:1000,big:true});
  expect(request).toHaveBeenCalledTimes(1);off();
});

it('low fuel warns once per depletion, rearms after refill, ignores empty/invalid and paused data',()=>{
  const bus=createEventBus(),snapshot=createStore<GameSnapshot>(structuredClone(INITIAL_GAME_SNAPSHOT)),request=vi.fn();
  const off=watchNarratorMoments(bus,snapshot,request);
  const fuel=(lanternFuel01:number)=>snapshot.set({...snapshot.get(),lanternFuel01});
  for (const value of [NaN,Infinity,-1,1.1,0,0.25]) fuel(value);expect(request).not.toHaveBeenCalled();
  fuel(0.24);fuel(0.2);fuel(0.1);expect(request).toHaveBeenCalledExactlyOnceWith('low-fuel');
  fuel(0.5);fuel(0.2);expect(request).toHaveBeenCalledTimes(1);
  fuel(0.6);snapshot.set({...snapshot.get(),phase:'paused'});fuel(0.2);expect(request).toHaveBeenCalledTimes(1);
  snapshot.set({...snapshot.get(),phase:'playing'});expect(request).toHaveBeenCalledTimes(2);
  bus.emit({type:'run_restart'});fuel(0.2);expect(request).toHaveBeenCalledTimes(3);off();
});
it('a low-fuel reminder waits for ongoing speech and cooldown, and a refill cancels a pending warning',async()=>{
  const s=setup();await s.player.ready;s.start();
  s.raw.currentTime=1;s.stores.snapshot.set({...s.stores.snapshot.get(),lanternFuel01:0.2});
  expect(s.sources[0]!.stop).not.toHaveBeenCalled();s.end();s.raw.currentTime=31;s.player.tick();
  expect(s.player.getActiveLine()).toBe('intro-chris-low-fuel');s.end();
  s.raw.currentTime=160;s.stores.snapshot.set({...s.stores.snapshot.get(),lanternFuel01:0.8});
  s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'paused',lanternFuel01:0.2});
  s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'playing',lanternFuel01:0.2});
  expect(s.player.getActiveLine()).toBe('intro-chris-low-fuel');s.end();
  s.raw.currentTime=161;s.stores.snapshot.set({...s.stores.snapshot.get(),lanternFuel01:0.8});s.stores.snapshot.set({...s.stores.snapshot.get(),lanternFuel01:0.2});
  s.stores.snapshot.set({...s.stores.snapshot.get(),lanternFuel01:0.7});s.raw.currentTime=300;s.player.tick();
  expect(s.player.getActiveLine()).toBeNull();s.player.dispose();
});
it('a quick Play again skips the cooling welcome instead of blocking moments, and never welcomes mid-climb',async()=>{
  const s=setup();await s.player.ready;s.start();expect(s.player.getActiveLine()).toBe('intro-chris-welcome');s.raw.currentTime=8;s.end();
  s.raw.currentTime=40;s.bus.emit({type:'finish'});s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'finished'});expect(s.player.getActiveLine()).toBe('intro-chris-finish');s.end();
  s.raw.currentTime=60;s.bus.emit({type:'run_restart'});s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'playing'});
  s.raw.currentTime=75;s.bus.emit({type:'stage_completed',stageId:'tutorial',index:0});s.player.tick();expect(s.player.getActiveLine()).toBe('intro-chris-tutorial');s.end();
  s.raw.currentTime=121;s.player.tick();expect(s.player.getActiveLine()).toBeNull();s.player.dispose();
});
it('a voice preview during pause keeps the parked game line, whether stopped or finished naturally',async()=>{
  const s=setup();await s.player.ready;s.start();s.end();
  s.raw.currentTime=31;s.bus.emit({type:'stage_completed',stageId:'tutorial',index:0});s.player.tick();expect(s.player.getActiveLine()).toBe('intro-chris-tutorial');
  s.raw.currentTime=33;s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'paused'});
  s.player.setVoice('intro-chris-');s.player.preview();expect(s.player.getActiveLine()).toBe('intro-chris-welcome');
  s.raw.currentTime=34;s.player.stopPreview();
  s.raw.currentTime=40;s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'playing'});
  expect(s.player.getActiveLine()).toBe('intro-chris-tutorial');expect(s.sources.at(-1)!.start).toHaveBeenCalledWith(40,2);
  s.raw.currentTime=41;s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'paused'});s.player.preview();s.end();
  s.raw.currentTime=50;s.stores.snapshot.set({...s.stores.snapshot.get(),phase:'playing'});
  expect(s.player.getActiveLine()).toBe('intro-chris-tutorial');expect(s.sources.at(-1)!.start).toHaveBeenCalledWith(50,3);s.player.dispose();
});
