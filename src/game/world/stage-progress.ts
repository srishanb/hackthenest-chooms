/** Advance only on a new landing at the active stage's last ledge; never move or reload the player. */
import type { SectionData } from '../../shared/contracts/content';
import type { EventBus } from '../../shared/contracts/events';
import type { GameSnapshot } from '../../shared/contracts/game-state';
import type { Store } from '../../shared/store';

export function createStageProgress(sections: readonly SectionData[], snapshot: Store<GameSnapshot>, bus: EventBus,
  resumePlatformId?: string) {
  const stages = sections.filter((section) => section.stage);
  // A saved manual ember already required traversing all lower stage boundaries.
  let completed = Math.max(0, stages.findIndex((stage) => stage.platforms.some((platform) => platform.id === resumePlatformId)));
  let pending = false;
  function publish(): void {
    const index = Math.min(completed, stages.length - 1);
    const current = stages[index];
    if (current) snapshot.set({ ...snapshot.get(), stage: { id: current.stage!.kind, index, total: stages.length, completed } });
  }
  publish();
  return {
    /** Called only for the collision solver's landed event, never for height or overlap. */
    land(platformId: string, normalWorld = true): boolean {
      const stage = stages[completed];
      if (snapshot.get().phase !== 'playing' || !stage || stage.stage!.finalPlatformId !== platformId) return false;
      if (completed === stages.length - 1 && !normalWorld) { pending = true; return false; }
      pending = false;
      completed++;
      publish();
      bus.emit({ type: 'stage_completed', stageId: stage.id, index: completed - 1 });
      return completed === stages.length;
    },
    finishIfReady(platformId: string | null, normalWorld: boolean): boolean {
      return pending && platformId !== null && normalWorld ? this.land(platformId, true) : false;
    },
    isFinishBlocked: (): boolean => pending,
    reset(): void { pending = false; completed = 0; publish(); },
  };
}
