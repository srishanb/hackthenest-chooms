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

/** What `createSignal()` returns to the composition root. */
export interface SignalHandle {
  reader: ComposureReader;
  control: SignalControl;
  getDiagnostics(): SignalDiagnostics;
}
