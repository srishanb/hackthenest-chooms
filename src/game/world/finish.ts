/**
 * Finish and altitude: where the climb ends and how far along the player is.
 *
 * Why pure: the scene only asks "is the body in the finish?" and "how high is it?", so both are
 * unit-testable with plain section data. A body is "in" an area when its centre is inside it.
 */
import type { AreaData, SectionData } from '../../shared/contracts/content';

export function bodyInArea(x: number, y: number, area: AreaData): boolean {
  return Math.abs(x - area.x) <= area.width / 2 && Math.abs(y - area.y) <= area.height / 2;
}

/** The finish zone of the last section that has one, or null. */
export function findFinish(sections: readonly SectionData[]): AreaData | null {
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    const finish = sections[i]?.finish;
    if (finish) return finish;
  }
  return null;
}

/** The refuge the body is inside, or null. */
export function refugeAt(sections: readonly SectionData[], x: number, y: number): string | null {
  for (const section of sections) {
    if (section.refuge && bodyInArea(x, y, section.refuge)) return section.refuge.id;
  }
  return null;
}

/** Height climbed: section 1's spawn is 0, the finish centre is 1. Clamped; 0 when there is no finish. */
export function altitude01(sections: readonly SectionData[], y: number): number {
  const start = sections[0]?.spawn.y;
  const finish = findFinish(sections);
  if (start === undefined || !finish) return 0;
  const span = start - finish.y;
  if (!(span > 0)) return 0;
  return Math.min(Math.max((start - y) / span, 0), 1);
}
