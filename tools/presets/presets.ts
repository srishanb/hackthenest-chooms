/**
 * Built-in replay presets, produced by the official PiEEG simulator.
 *
 * Why: the demo must work with no board and no network, and the same way every time. Each preset is a
 * timeline of simulator events (`triggerSimEvent`: alpha, clench, blink, noisy_pin) played into the
 * vendored `pieeg.js` through its own `connectSimulator()`, and every frame is what its `onBandPowers`,
 * `getContactQuality` and `getStats` report. Nothing is hand-drawn. A virtual clock and a seeded random
 * source (simulate.ts) make the files byte-identical on every run. Presets are plain recordings plus a
 * `baselines` line, so they replay through the real pipeline.
 */
import { SIGNAL_CONFIG } from '../../src/config/signal.config';
import type { Baselines } from '../../src/shared/contracts/signal-internal';
import { intensityV2 } from '../../src/signal/algorithms/intensity-v2';
import { durationMs, serializePreset } from '../../src/signal/presets/preset-file';
import { calibrateBaseline } from '../../src/signal/stages/calibration';
import { runSimulation, type SimEvent } from './simulate';
import { PRESET_DEFINITIONS } from './timelines';

const CREATED = new Date('2026-11-15T00:00:00.000Z');
const WINDOW_MS = 8000;

async function windowFeature(events: readonly SimEvent[], pick: 'active' | 'resting'): Promise<number[]> {
  const frames = await runSimulation({ durationMs: WINDOW_MS, seed: 7, events });
  return frames.slice(Math.floor(frames.length / 4)).map((frame) => intensityV2.extract(frame, SIGNAL_CONFIG)[pick]);
}

/**
 * The calibration every built-in preset carries: the same two steps a player does (relaxed vs jaw clench,
 * eyes open vs eyes closed) on the same simulator, scored by the same `calibrateBaseline`.
 */
export async function presetBaselines(): Promise<Baselines> {
  const active = calibrateBaseline(await windowFeature([], 'active'), await windowFeature([{ atMs: 0, type: 'clench', value: WINDOW_MS }], 'active'), 'active');
  const resting = calibrateBaseline(await windowFeature([], 'resting'), await windowFeature([{ atMs: 0, type: 'alpha', value: true }], 'resting'), 'resting');
  if (!active.ok || !resting.ok) throw new Error(`reference calibration failed: ${active.reasonKey ?? ''} ${resting.reasonKey ?? ''}`);
  return { active: active.baseline, resting: resting.baseline };
}

export interface BuiltPresets {
  manifest: { presets: Array<{ id: string; label: string; description: string; durationMs: number }> };
  files: Record<string, string>;
}

export async function buildPresets(): Promise<BuiltPresets> {
  const baselines = await presetBaselines();
  const manifest: BuiltPresets['manifest'] = { presets: [] };
  const files: Record<string, string> = {};
  for (const definition of PRESET_DEFINITIONS) {
    const frames = await runSimulation(definition.timeline);
    files[`${definition.id}.jsonl`] = serializePreset(frames, baselines, intensityV2.id, CREATED);
    manifest.presets.push({ id: definition.id, label: definition.label, description: definition.description, durationMs: Math.round(durationMs(frames)) });
  }
  files['manifest.json'] = `${JSON.stringify(manifest, null, 2)}\n`;
  return { manifest, files };
}
