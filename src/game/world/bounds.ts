/**
 * Which section a height belongs to, derived from the platforms (no extra field in the data).
 *
 * Why: sections share one world. Section i runs from its lowest platform up to the lowest platform
 * of section i+1. Only `GameSnapshot.sectionId` uses this (the per-section look and narration);
 * refuges and the finish use their own areas.
 */
import type { SectionData } from '../../shared/contracts/content';

/** The largest platform centre y of a section (y grows downward, so this is its lowest platform). */
export function lowestPlatformY(section: SectionData): number {
  return Math.max(...section.platforms.map((platform) => platform.y));
}

/** The id of the section at world height `y`, or null when there are no sections. Below everything reads section 1. */
export function sectionAt(sections: readonly SectionData[], y: number): string | null {
  let current: SectionData | undefined = sections[0];
  for (const section of sections) {
    if (y <= lowestPlatformY(section)) current = section;
  }
  return current?.id ?? null;
}
