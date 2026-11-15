/** Refuges save progress on entry; only a first visit can refill the one recovery ember. */
import type { SectionData } from '../../shared/contracts/content';
import type { EventBus } from '../../shared/contracts/events';
import type { GameSnapshot } from '../../shared/contracts/game-state';
import type { Store } from '../../shared/store';
import { clearSave, createMemorySaveStorage, loadSave, writeSave } from '../save';
import type { SavedProgress, SaveStorage } from '../save';

interface RefugeDeps {
  sections: readonly SectionData[];
  snapshot: Store<GameSnapshot>;
  bus: EventBus;
  storage?: SaveStorage;
}

/** No signal dependency: walking into a refuge always saves immediately. */
export function createRefugeController({ sections, snapshot, bus, storage = createMemorySaveStorage() }: RefugeDeps) {
  const first = sections[0];
  if (!first) throw new Error('Refuges need at least one section');
  const known = new Set(sections.flatMap((section) => section.refuge ? [section.refuge.id] : []));
  const loaded = loadSave(storage);
  // A changed level must not resume at a deleted checkpoint or invent a refill history.
  const usable = loaded && loaded.visitedRefugeIds.every((id) => known.has(id)) &&
    (loaded.refugeId === null || known.has(loaded.refugeId));
  let progress: SavedProgress = usable ? loaded : {
    v: 1, refugeId: null, emberAvailable: true, visitedRefugeIds: [],
  };
  let activeRefugeId: string | null = null;
  const resumeSection = sections.find((section) => section.refuge?.id === progress.refugeId) ?? first;
  const initial = snapshot.get();
  snapshot.set({ ...initial, sectionId: resumeSection.id, inRefuge: false,
    ember: { available: progress.emberAvailable, active: false, progress01: 0, canAssist: false } });

  // P6 spends the ember through the shared snapshot; persist that change even between refuges.
  const unsubscribe = snapshot.subscribe((next) => {
    if (next.ember.available === progress.emberAvailable) return;
    progress = { ...progress, emberAvailable: next.ember.available };
    writeSave(storage, progress);
  });

  return {
    spawn: { ...resumeSection.spawn },
    getProgress: (): SavedProgress => ({ ...progress, visitedRefugeIds: [...progress.visitedRefugeIds] }),
    update(position: { x: number; y: number }): void {
      const section = sections.find(({ refuge }) => refuge &&
        Math.abs(position.x - refuge.x) <= refuge.width / 2 &&
        Math.abs(position.y - refuge.y) <= refuge.height / 2);
      const refuge = section?.refuge ?? null;
      if ((refuge?.id ?? null) === activeRefugeId) return;
      activeRefugeId = refuge?.id ?? null;
      const current = snapshot.get();
      if (!refuge) {
        if (current.inRefuge) snapshot.set({ ...current, inRefuge: false });
        return;
      }
      const firstVisit = !progress.visitedRefugeIds.includes(refuge.id);
      const gained = firstVisit && !current.ember.available;
      progress = {
        v: 1, refugeId: refuge.id, emberAvailable: firstVisit || current.ember.available,
        visitedRefugeIds: firstVisit ? [...progress.visitedRefugeIds, refuge.id] : progress.visitedRefugeIds,
      };
      snapshot.set({ ...current, inRefuge: true,
        ember: { ...current.ember, available: progress.emberAvailable } });
      writeSave(storage, progress);
      bus.emit({ type: 'refuge_enter', refugeId: refuge.id, firstVisit });
      bus.emit({ type: 'checkpoint_saved', refugeId: refuge.id });
      if (gained) bus.emit({ type: 'ember_gained' });
    },
    /** P4.5 calls this on finish, so the next player starts fresh. */
    clear(): void { clearSave(storage); },
    destroy(): void { unsubscribe(); },
  };
}
