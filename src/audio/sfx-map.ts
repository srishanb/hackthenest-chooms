/** Pure game-event to sound mapping. Big-land threshold is supplied from ember config. */
import type { GameEvent } from '../shared/contracts/events';
export type SfxId = 'jump' | 'land' | 'landHard' | 'refuge' | 'save' | 'emberGained'
  | 'emberRequested' | 'emberReturned' | 'emberCancelled' | 'finish' | 'wax' | 'landSnow' | 'corruptionEntry' | 'lowFuel' | 'bird' | 'iceCreak';
export function sfxForEvent(event: GameEvent, bigFallPx: number): SfxId | null {
  switch (event.type) {
    case 'jump': return 'jump';
    case 'land': return event.fallHeightPx >= bigFallPx ? 'landHard' : 'land';
    case 'refuge_enter': return 'refuge';
    case 'checkpoint_saved': return 'save';
    case 'ember_gained': return 'emberGained';
    case 'ember_requested': return 'emberRequested';
    case 'ember_returned': return 'emberReturned';
    case 'ember_cancelled': return 'emberCancelled';
    case 'finish': return 'finish';
    case 'wax_collected': return 'wax';
    default: return null;
  }
}
