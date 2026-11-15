/**
 * Builds the built-in preset files (JSONL text plus manifest) from the timelines.
 *
 * Why baselines are written into each file: a preset replays through the real pipeline, which is
 * not valid until it has a calibration. The generator runs the same two calibration steps a player
 * would (relaxed vs jaw clench, eyes open vs eyes closed) on the same simulator, with the same
 * `calibrateBaseline`, and stores the result in the header. Nothing here sets a ComposureState.
 */
import { SIGNAL_CONFIG } from '../../src/config/signal.config';
import type { BandFrame, Baselines } from '../../src/shared/contracts/signal-internal';
import { intensityV2 } from '../../src/signal/algorithms/intensity-v2';
import type { PresetManifest } from '../../src/signal/presets/preset-types';
import { calibrateBaseline } from '../../src/signal/stages/calibration';
import { createHeader, serializeRecording } from '../../src/signal/sources/recording-format';
import { runSimulation, type SimEvent } from './simulate';
import { PRESET_DEFINITIONS } from './timelines';

/** A fixed date keeps the files byte-identical between runs. */
const CREATED_AT = new Date('2026-11-15T00:00:00.000Z');
const WINDOW_MS = 8000;

async function windowFeatures(events: readonly SimEvent[], pick: 'active' | 'resting'): Promise<number[]> {
  const frames = await runSimulation({ durationMs: WINDOW_MS, seed: 7, events });
  return frames.slice(Math.floor(frames.length / 4)).map((frame) => intensityV2.extract(frame, SIGNAL_CONFIG)[pick]);
}

/** The reference calibration every built-in preset shares. */
export async function referenceBaselines(): Promise<Baselines> {
  const active = calibrateBaseline(
    await windowFeatures([], 'active'),
    await windowFeatures([{ atMs: 0, type: 'clench', value: WINDOW_MS }], 'active'),
    'active',
  );
  const resting = calibrateBaseline(
    await windowFeatures([], 'resting'),
    await windowFeatures([{ atMs: 0, type: 'alpha', value: true }], 'resting'),
    'resting',
  );
  if (!active.ok || !resting.ok) throw new Error(`reference calibration failed: ${active.reasonKey ?? ''} ${resting.reasonKey ?? ''}`);
  return { active: active.baseline, resting: resting.baseline };
}

export interface BuiltPreset {
  id: string;
  file: string;
  text: string;
}

export async function buildPresets(): Promise<{ presets: BuiltPreset[]; manifest: PresetManifest }> {
  const baselines = await referenceBaselines();
  const presets: BuiltPreset[] = [];
  const manifest: PresetManifest = { version: 1, presets: [] };
  for (const definition of PRESET_DEFINITIONS) {
    const frames: BandFrame[] = await runSimulation(definition.timeline);
    const header = { ...createHeader('SIMULATED', 'intensity-v2', CREATED_AT), baselines };
    const file = `${definition.id}.jsonl`;
    presets.push({ id: definition.id, file, text: serializeRecording({ header, frames }) });
    manifest.presets.push({ id: definition.id, label: definition.label, description: definition.description, durationMs: definition.timeline.durationMs, file });
  }
  return { presets, manifest };
}
