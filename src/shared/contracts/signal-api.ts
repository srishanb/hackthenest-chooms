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

/** Which input feeds the pipeline right now. A preset is a recording replayed through the same pipeline as live data. */
export type InputSelection = { kind: 'SIMULATED' } | { kind: 'LIVE_EEG' } | { kind: 'REPLAY'; presetId: string };

/** A replayable recording shown in Settings. Built-in presets ship in the build; saved ones live in this browser only. */
export interface PresetInfo {
  id: string;
  label: string;
  description: string;
  durationMs: number;
  builtIn: boolean;
}

/** Runtime input switching and the preset library. Used by the Settings signal section. */
export interface PresetControl {
  /** Built-in presets first, then saved ones. Never rejects: a failed storage read just hides the saved ones. */
  list(): Promise<PresetInfo[]>;
  getSelection(): InputSelection;
  /** Switch input without reloading or touching the game. `LIVE_EEG` must be called from a click handler. */
  select(selection: InputSelection): Promise<void>;
  getLoop(): boolean;
  setLoop(loop: boolean): void;
  /** Save the frames from the current live or simulated input as a named preset. Rejects when there is too little data. */
  saveCurrent(name: string): Promise<PresetInfo>;
  /** Add a preset from the text of a .jsonl recording. Rejects when it is not a valid recording. */
  importText(name: string, jsonl: string): Promise<PresetInfo>;
  /** The .jsonl text of a preset, for export. */
  exportText(id: string): Promise<string>;
  /** Delete a saved preset. Built-in presets cannot be deleted. */
  remove(id: string): Promise<void>;
  /** Called after the selection, loop flag or library changes. Returns an unsubscribe function. */
  onChange(listener: () => void): () => void;
}

/** What `createSignal()` returns to the composition root. */
export interface SignalHandle {
  reader: ComposureReader;
  control: SignalControl;
  getDiagnostics(): SignalDiagnostics;
  presets: PresetControl;
  /** Everything recorded since page load as JSONL (header, frame, state, event lines), for download and `?source=replay`. */
  exportRecording(): string;
}
