/**
 * Preset controller: the runtime source switch behind Settings > Signal.
 *
 * Why: choosing "Simulator", "Live board" or a replay preset must not reload the page or reset the climb.
 * This module only decides which source feeds the pipeline; frames always go through the same pipeline
 * as live data (it never writes a ComposureState). A preset's frames are moved onto the current clock so
 * the pipeline never sees time go backwards, and its baselines are applied, then the previous baselines
 * come back when you leave the preset.
 */
import type { PresetInfo, SignalPresets, SourceChoice } from '../../shared/contracts/signal-api';
import type { BandFrame, Baselines } from '../../shared/contracts/signal-internal';
import type { KeyValueStorage } from '../../shared/safe-storage';
import { compactFrames, durationMs, parsePreset, serializePreset, shiftFrames, type PresetData } from './preset-file';
import { cleanLabel, createPresetStore } from './preset-store';

export const PRESET_BASE_URL = `${import.meta.env.BASE_URL}recordings/presets`;
/** Saved presets keep the newest minute of signal. */
export const SAVE_KEEP_MS = 60_000;
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,40}$/;

export interface PresetControllerDeps {
  fetchText: (url: string) => Promise<string>;
  storage: KeyValueStorage | undefined;
  now: () => number;
  /** Starts the simulator, the live board, or a replay of `frames` (calls `onEnd` after the last one). Rejects on failure. */
  startSim: () => Promise<void>;
  startLive: () => Promise<void>;
  startFrames: (frames: BandFrame[], onEnd: () => void) => Promise<void>;
  exportRecording: () => string;
  getBaselines: () => Baselines;
  setBaselines: (baselines: Baselines) => void;
  algo: string | null;
  initial: SourceChoice;
}

interface ManifestEntry {
  id: string;
  label: string;
  description: string;
  durationMs: number;
}

function parseManifest(text: string): ManifestEntry[] {
  const parsed: unknown = JSON.parse(text);
  const list = typeof parsed === 'object' && parsed !== null ? (parsed as { presets?: unknown }).presets : null;
  if (!Array.isArray(list)) return [];
  return list.filter((entry): entry is ManifestEntry =>
    typeof entry === 'object' && entry !== null && ID_PATTERN.test(String((entry as ManifestEntry).id)) &&
    typeof (entry as ManifestEntry).label === 'string' && typeof (entry as ManifestEntry).description === 'string' &&
    typeof (entry as ManifestEntry).durationMs === 'number');
}

export function createPresetController(deps: PresetControllerDeps): SignalPresets {
  const store = createPresetStore(deps.storage);
  const listeners = new Set<() => void>();
  let selection: SourceChoice = deps.initial;
  let loop = true;
  let manifest: ManifestEntry[] | null = null;
  /** Bumped on every successful switch so an old replay's end callback can tell it is out of date. */
  let generation = 0;
  /** Bumped on every select() call, before any await, so a superseded choice can bail out. */
  let requested = 0;
  let savedBaselines: Baselines | null = null;

  const notify = (): void => listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('[signal] preset subscriber threw', error);
    }
  });

  async function builtIn(): Promise<ManifestEntry[]> {
    if (manifest) return manifest;
    try {
      manifest = parseManifest(await deps.fetchText(`${PRESET_BASE_URL}/manifest.json`));
    } catch {
      return []; // no manifest (for example an old build): saved presets still work; try again next time
    }
    return manifest;
  }

  async function load(id: string): Promise<PresetData> {
    const saved = store.get(id);
    if (saved) return parsePreset(saved.jsonl);
    const entry = (await builtIn()).find((item) => item.id === id);
    if (!entry) throw new Error('That preset is not available.');
    return parsePreset(await deps.fetchText(`${PRESET_BASE_URL}/${entry.id}.jsonl`));
  }

  function leavePreset(): void {
    if (savedBaselines) deps.setBaselines(savedBaselines);
    savedBaselines = null;
  }

  async function playPreset(id: string, isStale: () => boolean): Promise<void> {
    const preset = await load(id);
    if (isStale()) return;
    // Set only once this preset is playing: a failed switch must leave the current preset's loop alive.
    let mine = -1;
    const first = preset.frames[0]!;
    const span = durationMs(preset.frames) + (preset.frames.length > 1 ? durationMs(preset.frames) / (preset.frames.length - 1) : 0);
    const startAt = deps.now();
    let pass = 0;
    const begin = (): Promise<void> => {
      const frames = shiftFrames(preset.frames, startAt - first.t + pass * span);
      return deps.startFrames(frames, () => {
        if (mine !== generation || !loop) return;
        pass += 1;
        void begin().catch((error) => console.error('[signal] preset loop failed', error));
      });
    };
    const before = deps.getBaselines();
    if (preset.baselines) deps.setBaselines({ active: preset.baselines.active ?? before.active, resting: preset.baselines.resting ?? before.resting });
    try {
      await begin();
    } catch (error) {
      deps.setBaselines(before);
      throw error;
    }
    mine = ++generation;
    savedBaselines ??= before;
  }

  const info = (entry: ManifestEntry, isBuiltIn: boolean): PresetInfo => ({ id: entry.id, label: entry.label, description: entry.description, durationMs: entry.durationMs, builtIn: isBuiltIn });

  function saveFrames(label: string, frames: BandFrame[], baselines: Baselines | null): PresetInfo {
    const name = cleanLabel(label);
    const compact = compactFrames(frames, SAVE_KEEP_MS);
    if (compact.length < 12) throw new Error('There is not enough signal yet. Let it run for a few seconds first.');
    const saved = store.add(name, serializePreset(compact, baselines, deps.algo), durationMs(compact));
    notify();
    return info({ id: saved.id, label: saved.label, description: 'Saved in this browser.', durationMs: saved.durationMs }, false);
  }

  return {
    async list() {
      const savedInfo = store.list().map((item) => info({ id: item.id, label: item.label, description: 'Saved in this browser.', durationMs: item.durationMs }, false));
      return [...(await builtIn()).map((entry) => info(entry, true)), ...savedInfo];
    },
    getSelection: () => selection,
    getLoop: () => loop,
    setLoop(next) {
      loop = next;
      notify();
    },
    select(choice) {
      // No await before startLive(): the Bluetooth picker must open inside the click that called us.
      const request = ++requested;
      const isStale = (): boolean => request !== requested;
      const start = choice.kind === 'live' ? deps.startLive() : choice.kind === 'sim' ? deps.startSim() : playPreset(choice.id, isStale);
      return start.then(() => {
        if (isStale()) return;
        if (choice.kind !== 'preset') {
          generation += 1;
          leavePreset();
        }
        selection = choice;
        notify();
      });
    },
    saveCurrent(label) {
      const recording = parsePreset(deps.exportRecording());
      return saveFrames(label, recording.frames, deps.getBaselines());
    },
    importText(label, jsonl) {
      const data = parsePreset(jsonl);
      return saveFrames(label, data.frames, data.baselines);
    },
    async exportText(id) {
      const saved = store.get(id);
      if (saved) return saved.jsonl;
      const entry = (await builtIn()).find((item) => item.id === id);
      if (!entry) throw new Error('That preset is not available.');
      return deps.fetchText(`${PRESET_BASE_URL}/${entry.id}.jsonl`);
    },
    remove(id) {
      store.remove(id);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
