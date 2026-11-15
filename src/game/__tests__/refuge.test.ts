/** Entering or revisiting a rest area never creates a checkpoint or changes ember ownership. */
import { describe, expect, it } from 'vitest';
import { createEventBus } from '../../shared/bus';
import type { SectionData } from '../../shared/contracts/content';
import type { GameEvent } from '../../shared/contracts/events';
import { INITIAL_GAME_SNAPSHOT } from '../../shared/contracts/game-state';
import { createStore } from '../../shared/store';
import { createRefugeController } from '../world/refuge';
describe('rest areas without automatic checkpoints', () => {
  it('only publishes safe-area entry/exit; never saves or refills', () => {
    const sections: SectionData[] = [{id: 'rest', spawn: {x:50,y:100}, platforms: [], finish:null,
      refuge: {id:'rest-zone',x:50,y:100,width:100,height:60}}];
    const snapshot = createStore({...INITIAL_GAME_SNAPSHOT, ember: {...INITIAL_GAME_SNAPSHOT.ember, available:false}});
    const bus=createEventBus(); const events:GameEvent[]=[]; bus.onAny(event=>events.push(event));
    const controller=createRefugeController({sections,snapshot,bus});
    controller.update({x:50,y:100}); controller.update({x:50,y:100});
    expect(snapshot.get().inRefuge).toBe(true); expect(snapshot.get().ember.available).toBe(false);
    controller.update({x:500,y:100}); expect(snapshot.get().inRefuge).toBe(false);
    controller.update({x:50,y:100});
    expect(events).toEqual([{type:'refuge_enter',refugeId:'rest-zone',firstVisit:true},{type:'refuge_enter',refugeId:'rest-zone',firstVisit:false}]);
    expect(snapshot.get().ember.available).toBe(false);
  });
});
