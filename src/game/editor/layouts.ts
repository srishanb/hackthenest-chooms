/** Validated authored-stage overrides. Normal play reads saved layouts; tests read session drafts. */
import type { SectionData } from '../../shared/contracts/content';
import type { SaveStorage } from '../save';
import { loadSections } from '../world/section-loader';
export const STAGE_LAYOUT_KEY = 'lighten.stage-layouts.v1';
export const STAGE_DRAFT_KEY = 'lighten.stage-draft.v1';
export function validateLayouts(value: unknown, originals: readonly SectionData[]): SectionData[] {
  if (!Array.isArray(value) || value.length !== originals.length || value.some((stage, index) => stage?.id !== originals[index]?.id)) throw Error('Stage list must match the original stages.');
  loadSections(value as SectionData[], 960);
  return structuredClone(value as SectionData[]);
}
export function readLayouts(storage: SaveStorage | undefined, key: string, originals: readonly SectionData[]): SectionData[] {
  try { const raw = storage?.getItem(key); if (raw) return validateLayouts(JSON.parse(raw), originals); } catch { /* Invalid saved edits never prevent play. */ }
  return structuredClone(originals) as SectionData[];
}
export function writeLayouts(storage: SaveStorage | undefined, key: string, stages: SectionData[], originals: readonly SectionData[]): void {
  if (!storage) throw Error('Browser storage is unavailable.');
  const validated = validateLayouts(stages, originals);
  storage.setItem(key, JSON.stringify(validated));
}
