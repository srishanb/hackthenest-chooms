/**
 * The preset library: built-in presets (shipped files) plus saved ones (browser storage).
 *
 * Why here and not in the UI: Settings only sees `PresetControl`. Loading, validating and storing
 * a recording is signal-lane work, and nothing here touches the network except fetching our own
 * static files from /recordings/presets/, which are part of the build.
 */
import type { PresetInfo } from '../../shared/contracts/signal-api';
import { parseRecording, type Recording } from '../sources/recording-format';
import type { PresetManifest, PresetManifestEntry } from './preset-types';
import type { PresetStore } from './preset-store';

/** Relative to the page (Vite base './'), so the build works from any folder and offline. */
export const BUILT_IN_DIR = `${import.meta.env.BASE_URL}recordings/presets/`;
const MAX_LABEL_LENGTH = 40;
/** Saved presets are about 0.6 MB each; four keeps browser storage small. Delete one to add another. */
export const MAX_SAVED_PRESETS = 4;

export interface PresetLibrary {
  list(): Promise<PresetInfo[]>;
  /** The parsed recording for a preset id. Throws a readable error when it is missing or invalid. */
  load(id: string): Promise<Recording>;
  loadText(id: string): Promise<string>;
  /** Validate and store a recording's text as a saved preset. */
  add(name: string, jsonl: string): Promise<PresetInfo>;
  remove(id: string): Promise<void>;
}

export const cleanLabel = (name: string): string => name.replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL_LENGTH);

export function durationOf(recording: Recording): number {
  const last = recording.frames.at(-1);
  return last ? last.t : 0;
}

export function createPresetLibrary(deps: { fetchText: (url: string) => Promise<string>; store: PresetStore; now?: () => Date }): PresetLibrary {
  const now = deps.now ?? (() => new Date());
  let manifest: Promise<PresetManifestEntry[]> | null = null;

  function builtIns(): Promise<PresetManifestEntry[]> {
    manifest ??= deps
      .fetchText(`${BUILT_IN_DIR}manifest.json`)
      .then((text) => (JSON.parse(text) as PresetManifest).presets)
      .catch((error: unknown) => {
        console.warn('[signal] no built-in presets', error);
        return [];
      });
    return manifest;
  }

  async function saved(): Promise<PresetInfo[]> {
    try {
      const all = await deps.store.list();
      return all
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((p) => ({ id: p.id, label: p.label, description: '', durationMs: p.durationMs, builtIn: false }));
    } catch (error) {
      console.warn('[signal] could not read saved presets', error);
      return [];
    }
  }

  async function loadText(id: string): Promise<string> {
    const entry = (await builtIns()).find((item) => item.id === id);
    if (entry) return deps.fetchText(`${BUILT_IN_DIR}${entry.file}`);
    const stored = await deps.store.get(id);
    if (!stored) throw new Error(`preset "${id}" was not found`);
    return stored.text;
  }

  return {
    async list() {
      const built = (await builtIns()).map((e) => ({ id: e.id, label: e.label, description: e.description, durationMs: e.durationMs, builtIn: true }));
      return [...built, ...(await saved())];
    },
    loadText,
    async load(id) {
      return parseRecording(await loadText(id));
    },
    async add(name, jsonl) {
      const recording = parseRecording(jsonl);
      if (recording.frames.length === 0) throw new Error('recording has no frames');
      if ((await saved()).length >= MAX_SAVED_PRESETS) throw new Error('preset.limit');
      const label = cleanLabel(name) || 'Saved preset';
      const createdAt = now();
      const id = `saved-${createdAt.getTime().toString(36)}-${Math.floor(Math.random() * 1296).toString(36)}`;
      const durationMs = durationOf(recording);
      await deps.store.put({ id, label, durationMs, createdAt: createdAt.toISOString(), text: jsonl });
      return { id, label, description: '', durationMs, builtIn: false };
    },
    async remove(id) {
      if ((await builtIns()).some((entry) => entry.id === id)) throw new Error('built-in presets cannot be deleted');
      await deps.store.delete(id);
    },
  };
}
