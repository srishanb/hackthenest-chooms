/**
 * What the UI may ask of the signal lane: connect, calibrate, switch mode, read diagnostics.
 *
 * Why separate from composure.ts: the game only ever gets a `ComposureReader`. Control and
 * diagnostics are for the calibration screens and the debug overlay, never for gameplay.
 *
 * FROZEN after P0. Only the integrator changes this file.
 */
import type { ComposureReader, InputSourceKind, SignalMode } from './composure';

/** The two baselines are calibrated separately (feature spec, BCI-2). */
export type CalibrationStep = 'active' | 'resting';

export interface CalibrationResult {
  step: CalibrationStep;
  ok: boolean;
  /** A key into src/ui/strings.ts explaining a failure, never display text. */
  reasonKey?: string;
}

/** Numbers for the debug overlay only. Nothing in gameplay may depend on these. */
export interface SignalDiagnostics {
  /** Raw feature values before normalisation, by name (for example `active`, `resting`). */
  features: Record<string, number>;
  /** Thresholds currently in force, by name, so the overlay can show them beside the values. */
  thresholds: Record<string, number>;
  /** Fraction of channels with good contact, 0 to 1, or null when the source cannot tell. */
  contactGood01: number | null;
  /** Fraction of packets lost, 0 to 1, or null when the source cannot tell. */
  packetLoss01: number | null;
}

export interface SignalControl {
  /** Must be called from a click handler for LIVE_EEG (Web Bluetooth needs a user gesture). */
  connect(kind: InputSourceKind): Promise<void>;
  disconnect(): void;
  setMode(mode: SignalMode): void;
  /** Runs one calibration step for its configured duration and resolves with the outcome. */
  calibrate(step: CalibrationStep): Promise<CalibrationResult>;
}

/** One replayable preset: shipped with the game (built-in) or saved in this browser. */
export interface PresetInfo {
  id: string;
  label: string;
  /** Plain description. May say that muscle activity is part of the signal; never claims a mood or a medical reading. */
  description: string;
  durationMs: number;
  builtIn: boolean;
}

/** Where the signal comes from right now. A preset replays through the same pipeline as live data. */
export type SourceChoice = { kind: 'sim' } | { kind: 'live' } | { kind: 'preset'; id: string };

/** Choose, save, import, export and delete replay presets at runtime. Never reloads the page or touches the game. */
export interface SignalPresets {
  list(): Promise<PresetInfo[]>;
  getSelection(): SourceChoice;
  getLoop(): boolean;
  setLoop(loop: boolean): void;
  /** Switch source. `live` must be called from a click (Web Bluetooth). Rejects with a readable error; the old source keeps running then. */
  select(choice: SourceChoice): Promise<void>;
  /** Save the last minute or so of this session's signal as a named preset in browser storage. Throws a readable error. */
  saveCurrent(label: string): PresetInfo;
  /** Save a recording file's text as a named preset. Throws a readable error for a bad file. */
  importText(label: string, jsonl: string): PresetInfo;
  /** The preset as a .jsonl file's text, for download. */
  exportText(id: string): Promise<string>;
  /** Delete a saved preset (built-in presets cannot be deleted). */
  remove(id: string): void;
  /** Called after the selection, loop flag or saved list changes. */
  subscribe(listener: () => void): () => void;
}

/** What `createSignal()` returns to the composition root. */
export interface SignalHandle {
  reader: ComposureReader;
  control: SignalControl;
  getDiagnostics(): SignalDiagnostics;
  /** Everything recorded since page load as JSONL (header, frame, state, event lines), for download and `?source=replay`. */
  exportRecording(): string;
  presets: SignalPresets;
}
