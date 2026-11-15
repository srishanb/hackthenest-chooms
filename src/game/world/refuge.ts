/** Refuges are rest areas only: no automatic saves, return points or ember refills. */
import type { SectionData } from '../../shared/contracts/content';
import type { EventBus } from '../../shared/contracts/events';
import type { GameSnapshot } from '../../shared/contracts/game-state';
import type { Store } from '../../shared/store';

export function createRefugeController({ sections, snapshot, bus }: {
  sections: readonly SectionData[]; snapshot: Store<GameSnapshot>; bus: EventBus;
}) {
  let active: string | null = null;
  const visited = new Set<string>();
  return {
    update(position: { x: number; y: number }): void {
      const refuge = sections.find(({ refuge }) => refuge &&
        Math.abs(position.x - refuge.x) <= refuge.width / 2 &&
        Math.abs(position.y - refuge.y) <= refuge.height / 2)?.refuge;
      const id = refuge?.id ?? null;
      if (id === active) return;
      active = id;
      snapshot.set({ ...snapshot.get(), inRefuge: id !== null });
      if (id) {
        const firstVisit = !visited.has(id); visited.add(id);
        bus.emit({ type: 'refuge_enter', refugeId: id, firstVisit });
      }
    },
  };
}
