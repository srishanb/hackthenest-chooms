/** Saved authored edits must reach gameplay unchanged; invalid edits cannot replace a valid save. */
import { expect, it } from 'vitest';
import type { SectionData } from '../../shared/contracts/content';
import { createMemorySaveStorage } from '../save';
import { readLayouts, writeLayouts, layoutStorageKey, STAGE_LAYOUT_KEY } from '../editor/layouts';
const original: SectionData[] = [{ id:'tutorial',spawn:{x:480,y:460},refuge:null,finish:null,
 stage:{kind:'tutorial',finalPlatformId:'top',snow01:0,wind01:0},platforms:[
 {id:'floor',x:480,y:500,width:960,height:24,type:'static'},
 {id:'top',x:480,y:300,width:200,height:20,type:'static'}]}];
it('does not let a previous browser preview hide a new team layout', () => {
 const storage=createMemorySaveStorage(),newTeam=structuredClone(original);
 writeLayouts(storage,layoutStorageKey(original),original,original);
 newTeam[0]!.platforms[1]!.x=600;
 expect(layoutStorageKey(newTeam)).not.toBe(layoutStorageKey(original));
 expect(readLayouts(storage,layoutStorageKey(newTeam),newTeam)).toEqual(newTeam);
});
it('persists coordinates, spawn, surface and combined weather for gameplay',()=>{
 const storage=createMemorySaveStorage(),edited=structuredClone(original);
 edited[0]!.platforms[1]!.x=600;edited[0]!.platforms[1]!.type='slippery';edited[0]!.spawn.x=400;
 edited[0]!.stage!.snow01=1;edited[0]!.stage!.wind01=1;
 edited[0]!.wind=[{x:480,y:350,width:960,height:300,accelerationX:-120,periodMs:4000}];
 writeLayouts(storage,STAGE_LAYOUT_KEY,edited,original);
 expect(readLayouts(storage,STAGE_LAYOUT_KEY,original)).toEqual(edited);
 expect(original[0]!.platforms[1]!.x).toBe(480);
 edited[0]!.platforms[1]!.x=5000;
 expect(()=>writeLayouts(storage,STAGE_LAYOUT_KEY,edited,original)).toThrow();
 expect(readLayouts(storage,STAGE_LAYOUT_KEY,original)[0]!.platforms[1]!.x).toBe(600);
});
it('falls back to independent original layouts for invalid or blocked storage',()=>{
 const storage=createMemorySaveStorage();storage.setItem(STAGE_LAYOUT_KEY,'broken');
 const loaded=readLayouts(storage,STAGE_LAYOUT_KEY,original);loaded[0]!.spawn.x=10;
 expect(original[0]!.spawn.x).toBe(480);
 expect(readLayouts(undefined,STAGE_LAYOUT_KEY,original)).toEqual(original);
 expect(()=>writeLayouts(undefined,STAGE_LAYOUT_KEY,original,original)).toThrow('unavailable');
});
