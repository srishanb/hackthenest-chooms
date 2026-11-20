/**
 * One physics step of the candle and the world around it: crumbling ledges, then `stepPlayer`.
 *
 * Why one function: the game scene and the generator's route replay must advance a crumbling ledge's
 * timer at exactly the same moment relative to the candle's own step, or the replay could prove a hop
 * that the game then drops. Both call this. Order inside a step: the physics sees only the ledges that
 * are solid at the start of the step (crumble.ts `solidLedges`), the candle moves, then the timers move
 * on with the candle's new position. Pure and deterministic; never the signal (binding rule 2).
 */
import type { GameConfig } from '../../shared/contracts/config';
import { solidLedges, stepCrumble, type CrumbleState } from './crumble';
import { stepPlayer, type StepEnvironment } from './movement';
import type { PlatformBox, PlayerInput, PlayerState, StepEvents, UpdraftBox } from './types';

export interface WorldStep {
  player: PlayerState;
  crumble: CrumbleState;
  events: StepEvents;
  /** Ids of crumbling ledges that fell during this step. */
  crumbled: string[];
}

export function stepWorld(player: PlayerState, crumble: CrumbleState, input: PlayerInput, platforms: readonly PlatformBox[],
  updrafts: readonly UpdraftBox[], worldWidth: number, config: GameConfig, dtMs: number,
  /** Two-player climb only (versus.ts): the other candle and a shove. Absent in solo play and in the replay. */
  versus?: Pick<StepEnvironment, 'others' | 'pushVx'>): WorldStep {
  const out = stepPlayer(player, input, solidLedges(platforms, crumble), worldWidth, config, dtMs, versus ? { updrafts, ...versus } : { updrafts });
  const next = stepCrumble(crumble, platforms, out.state, config, dtMs);
  const crumbled: string[] = [];
  if (next !== crumble) {
    for (const [id, timer] of next) if (timer.goneMs === 0 && crumble.get(id)?.goneMs == null) crumbled.push(id);
  }
  return { player: out.state, crumble: next, events: out.events, crumbled };
}
