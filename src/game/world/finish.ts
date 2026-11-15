/**
 * Finish and altitude: where the climb ends and how far along the player is.
 *
 * The runtime wins through stage-progress landing events. Area helpers remain for old draft
 * fixtures; they cannot complete the live game. Altitude targets the last stage's final ledge.
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

/** Height climbed: first spawn is 0 and final stage ledge is 1. Legacy drafts may supply an area. */
export function altitude01(sections: readonly SectionData[], y: number): number {
  const start = sections[0]?.spawn.y;
  const last = sections.at(-1);
  const finalPlatform = last?.platforms.find((platform) => platform.id === last.stage?.finalPlatformId);
  const finish = finalPlatform ?? findFinish(sections);
  if (start === undefined || !finish) return 0;
  const span = start - finish.y;
  if (!(span > 0)) return 0;
  return Math.min(Math.max((start - y) / span, 0), 1);
}
