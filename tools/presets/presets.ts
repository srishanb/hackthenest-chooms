/**
 * Built-in replay presets, recorded from the real PiEEG simulator.
 *
 * Why: the demo must work with no board and no network, and the same way every time. Each preset is a
 * scripted run of the actual vendored SDK simulator (public/vendor/pieeg.js: its FFT, filters and band
 * powers) on a virtual clock with a seeded random source, so the frames are the SDK's own and a rebuild is
 * byte-identical. The script uses only the simulator's own events: alpha boost (a relaxed, eyes-closed
 * stand-in), jaw clench (muscle activity, which is part of the signal) and noisy pin. One field is scripted:
 * the poor-contact preset sets the contact fraction, because the simulator cannot report poor contact itself.
 * Presets are plain recordings plus a `baselines` line, so they replay through the real pipeline.
 */
import { SIGNAL_CONFIG } from '../../src/config/signal.config';
import type { Baselines } from '../../src/shared/contracts/signal-internal';
import { intensityV2 } from '../../src/signal/algorithms/intensity-v2';
import { compactFrames, durationMs, serializePreset } from '../../src/signal/presets/preset-file';
import { calibrateBaseline } from '../../src/signal/stages/calibration';
import { startVirtualSimulator, type VirtualSimulator } from './sdk-sim';

const DURATION_S = 60;
/** Frames before the SDK's FFT window and filters have settled are dropped. */
const WARMUP_MS = 3000;
const CREATED = new Date('2026-11-15T00:00:00.000Z');
const SEED = 20261114;

interface PresetSpec {
  id: string;
  label: string;
  description: string;
  /** Called once per second of the preset (0 to 59), before that second runs. */
  script: (sim: VirtualSimulator, second: number) => void;
  /** Overrides the contact fraction the SDK reported (see poor-contact). Everything else stays the SDK's own. */
  contactGood01?: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
/** Jaw clench for `fraction` of the next second (0 is none, 1 is continuous). */
const clench = (sim: VirtualSimulator, fraction: number): void => {
  if (fraction > 0.02) sim.trigger('clench', Math.round(1100 * clamp01(fraction)));
};

export const PRESET_SPECS: readonly PresetSpec[] = [
  {
    id: 'calm-climb',
    label: 'Calm climb',
    description: 'A steady, low-activity signal for a full minute: the simulator with its alpha boost on and no muscle activity.',
    script: (sim, s) => { if (s === 0) sim.trigger('alpha', true); },
  },
  {
    id: 'rising-tension',
    label: 'Rising tension',
    description: 'The signal tightens slowly from low to high activity over a minute, with jaw clenching growing from none to continuous. Muscle activity is part of this signal.',
    script: (sim, s) => clench(sim, s / (DURATION_S - 1)),
  },
  {
    id: 'jaw-clench-bursts',
    label: 'Jaw clench bursts',
    description: 'Four-second bursts of jaw clenching with rests between. Muscle activity is a large part of this signal.',
    script: (sim, s) => { if (s % 10 === 0) sim.trigger('clench', 4000); },
  },
  {
    id: 'mixed-climb',
    label: 'Mixed climb',
    description: 'Low activity for twenty seconds, then rising tension, then settling again: the whole range in one run.',
    script: (sim, s) => {
      if (s === 0) sim.trigger('alpha', true);
      if (s === 20) sim.trigger('alpha', false);
      if (s >= 20 && s < 40) clench(sim, (s - 20) / 19);
      if (s >= 40 && s < 50) clench(sim, 1 - (s - 40) / 10);
      if (s === 50) sim.trigger('alpha', true);
    },
  },
  {
    id: 'poor-contact',
    label: 'Poor contact',
    description: 'Poor electrode contact: signal quality is low for the whole run, so the effects ease back to neutral instead of reacting.',
    script: (sim, s) => { if (s === 0) sim.trigger('noisy_pin', 3); },
    // The SDK simulator can only spoil one of sixteen pins, and its 1-40 Hz band-pass removes the mains noise, so it
    // always reports good contact. The frames are the SDK's own; only the contact fraction is set, to 5 of 16 pins.
    contactGood01: 5 / 16,
  },
];

async function recordPreset(spec: PresetSpec) {
  const sim = await startVirtualSimulator(SEED);
  sim.advance(WARMUP_MS);
  const startAt = sim.now();
  for (let second = 0; second < DURATION_S; second += 1) {
    spec.script(sim, second);
    sim.advance(1000);
  }
  sim.stop();
  const frames = compactFrames(sim.frames.filter((frame) => frame.t >= startAt), DURATION_S * 1000);
  return spec.contactGood01 === undefined ? frames : frames.map((frame) => ({ ...frame, contactGood01: spec.contactGood01 ?? null }));
}

/** Baselines measured from the same simulator, the way the calibration screens measure them: relaxed (low) against clench (high), and eyes-open against alpha boost for resting. */
export async function presetBaselines(): Promise<Baselines> {
  const sim = await startVirtualSimulator(SEED + 1);
  const window = (): typeof sim.frames => { const from = sim.frames.length; sim.advance(6000); return sim.frames.slice(from); };
  sim.advance(WARMUP_MS);
  const relaxed = window();
  sim.trigger('alpha', true);
  sim.advance(4000);
  const boosted = window();
  sim.trigger('alpha', false);
  sim.advance(4000);
  sim.trigger('clench', 8000);
  sim.advance(1500);
  const clenched = window();
  sim.stop();
  const active = (frames: typeof relaxed): number[] => frames.map((frame) => intensityV2.extract(frame, SIGNAL_CONFIG).active);
  const resting = (frames: typeof relaxed): number[] => frames.map((frame) => intensityV2.extract(frame, SIGNAL_CONFIG).resting);
  const activeOutcome = calibrateBaseline(active(relaxed), active(clenched), 'active');
  const restingOutcome = calibrateBaseline(resting(relaxed), resting(boosted), 'resting');
  if (!activeOutcome.baseline || !restingOutcome.baseline) throw new Error(`preset baselines failed: ${activeOutcome.reasonKey ?? ''} ${restingOutcome.reasonKey ?? ''}`);
  return { active: activeOutcome.baseline, resting: restingOutcome.baseline };
}

export interface BuiltPresets {
  manifest: { presets: Array<{ id: string; label: string; description: string; durationMs: number }> };
  files: Record<string, string>;
}

export async function buildPresets(specs: readonly PresetSpec[] = PRESET_SPECS): Promise<BuiltPresets> {
  const baselines = await presetBaselines();
  const manifest: BuiltPresets['manifest'] = { presets: [] };
  const files: Record<string, string> = {};
  for (const spec of specs) {
    const frames = await recordPreset(spec);
    files[`${spec.id}.jsonl`] = serializePreset(frames, baselines, intensityV2.id, CREATED);
    manifest.presets.push({ id: spec.id, label: spec.label, description: spec.description, durationMs: Math.round(durationMs(frames)) });
  }
  files['manifest.json'] = `${JSON.stringify(manifest, null, 2)}\n`;
  return { manifest, files };
}
