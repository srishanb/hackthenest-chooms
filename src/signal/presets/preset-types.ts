/**
 * Shapes shared by the preset library, store and generator.
 *
 * Why a manifest: built-in presets are plain .jsonl files under public/recordings/presets/, so they
 * ship in the build and work offline. The manifest lists them with a label and description for Settings.
 */
export interface PresetManifestEntry {
  id: string;
  label: string;
  description: string;
  durationMs: number;
  /** File name under /recordings/presets/. */
  file: string;
}

export interface PresetManifest {
  version: 1;
  presets: PresetManifestEntry[];
}

/** A saved preset as kept in browser storage. */
export interface SavedPreset {
  id: string;
  label: string;
  durationMs: number;
  createdAt: string;
  /** The .jsonl recording text. */
  text: string;
}
