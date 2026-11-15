/** Height-based environmental blending previews the next biome before its first ledge. No signal input. */
import type { SectionData } from '../../shared/contracts/content';
import { STAGES_CONFIG } from '../../config/stages.config';

export function stageWeatherAt(sections: readonly SectionData[], y: number): { snow01: number; wind01: number } {
  let snow01 = 0; let wind01 = 0;
  for (const section of sections) {
    if (!section.stage) continue;
    const firstY = Math.max(...section.platforms.map((platform) => platform.y));
    const t = Math.min(1, Math.max(0, (firstY + STAGES_CONFIG.previewPx - y) / STAGES_CONFIG.blendSpanPx));
    const blend = t * t * (3 - 2 * t);
    snow01 += (section.stage.snow01 - snow01) * blend;
    wind01 += (section.stage.wind01 - wind01) * blend;
  }
  return { snow01, wind01 };
}

/** Tutorial hints follow height; mechanics stay in the shared world when falling back. */
export function lessonAt(sections: readonly SectionData[], y: number): string | undefined {
  let lesson: string | undefined;
  for (const section of sections) for (const platform of section.platforms) {
    if (platform.y >= y && platform.lesson) lesson = platform.lesson;
  }
  return lesson;
}
