/**
 * Built-in replay presets, built deterministically from the simulator's own spectrum model.
 *
 * Why: the demo must work with no board and no network, and the same way every time. Each preset is a
 * timeline of "tension level" 0..1 turned into band powers shaped like the PiEEG simulator's output (the
 * same `makeSequence` builder as recordings/sim-fixture.jsonl): calm raises alpha, tension raises 13-30 Hz
 * power and broadband noise (jaw clench is muscle activity, which is part of this signal), and poor contact
 * lowers the contact fraction and adds a mains spike. Presets are plain recordings plus a `baselines` line,
 * so they replay through the real pipeline. Nothing here is random.
 */
import { SIGNAL_CONFIG } from '../../src/config/signal.config';
import { intensityV2 } from '../../src/signal/algorithms/intensity-v2';
import { compactFrames, durationMs, serializePreset } from '../../src/signal/presets/preset-file';
import { makeFrame, makeSequence, type FrameOptions } from '../../src/signal/__tests__/fixtures/make-fixture';
import type { Baselines } from '../../src/shared/contracts/signal-internal';

const DURATION_MS = 60_000;
const HZ = 12;
const SPECTRUM = { dfHz: 1, maxHz: 64 } as const;
const CREATED = new Date('2026-11-15T00:00:00.000Z');

interface PresetSpec {
  id: string;
  label: string;
  description: string;
  /** Tension level 0..1 at a time (seconds into the preset). */
  level: (seconds: number) => number;
  contactGood01?: number;
  mains50HzSpike?: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const lerp = (a: number, b: number, k: number): number => a + (b - a) * clamp01(k);

export const PRESET_SPECS: readonly PresetSpec[] = [
  { id: 'calm-climb', label: 'Calm climb', description: 'A steady, low-activity signal for a full minute: high alpha, little 13-30 Hz power.', level: () => 0.05 },
  { id: 'rising-tension', label: 'Rising tension', description: 'The signal tightens slowly from low to high activity over a minute. Muscle activity is part of this signal.', level: (s) => s / 60 },
  { id: 'jaw-clench-bursts', label: 'Jaw clench bursts', description: 'Four-second bursts of jaw clenching with rests between. Muscle activity is a large part of this signal.', level: (s) => (s % 10 < 4 ? 1 : 0.1) },
  {
    id: 'mixed-climb',
    label: 'Mixed climb',
    description: 'Low activity for twenty seconds, then rising tension, then settling again: the whole range in one run.',
    level: (s) => (s < 20 ? 0.05 : s < 40 ? lerp(0.05, 1, (s - 20) / 20) : lerp(1, 0.1, (s - 40) / 20)),
  },
  {
    id: 'poor-contact',
    label: 'Poor contact',
    description: 'A noisy electrode: signal quality drops, so the effects ease back to neutral instead of reacting.',
    level: () => 0.3,
    contactGood01: 0.3,
    mains50HzSpike: 5,
  },
];

/** A small repeating wobble so the replay looks alive, but is the same every time. */
const wobble = (index: number): number => 1 + 0.04 * Math.sin(index * 0.7) + 0.03 * Math.sin(index * 1.9);

function frameFor(level: number, index: number, spec?: PresetSpec): FrameOptions {
  const w = wobble(index);
  const bands = { alpha: (1 + 3.5 * (1 - level)) * w, beta: (1 + 2.5 * level) * w };
  const options: FrameOptions = { bands, spectrumOptions: { ...SPECTRUM, bands, broadbandNoise: 0.8 * level } };
  if (spec?.contactGood01 !== undefined) options.contactGood01 = spec.contactGood01;
  if (spec?.mains50HzSpike !== undefined) options.spectrumOptions = { ...options.spectrumOptions, mains50HzSpike: spec.mains50HzSpike };
  return options;
}

/** Baselines on the scale of these presets: the calm frame is 0, the fully tense frame is 1. */
export function presetBaselines(): Baselines {
  const config = SIGNAL_CONFIG;
  const calm = intensityV2.extract(makeFrame(frameFor(0, 0)), config);
  const tense = intensityV2.extract(makeFrame(frameFor(1, 0)), config);
  const rest = intensityV2.extract(makeFrame({ bands: { alpha: 4.5 }, spectrumOptions: SPECTRUM }), config);
  const open = intensityV2.extract(makeFrame({ spectrumOptions: SPECTRUM }), config);
  return { active: { low: calm.active, high: tense.active }, resting: { low: open.resting, high: rest.resting } };
}

export interface BuiltPresets {
  manifest: { presets: Array<{ id: string; label: string; description: string; durationMs: number }> };
  files: Record<string, string>;
}

export function buildPresets(): BuiltPresets {
  const baselines = presetBaselines();
  const manifest: BuiltPresets['manifest'] = { presets: [] };
  const files: Record<string, string> = {};
  for (const spec of PRESET_SPECS) {
    const raw = makeSequence({ durationMs: DURATION_MS, hz: HZ, frame: (index, tMs) => frameFor(spec.level(tMs / 1000), index, spec) });
    const frames = compactFrames(raw, DURATION_MS);
    files[`${spec.id}.jsonl`] = serializePreset(frames, baselines, intensityV2.id, CREATED);
    manifest.presets.push({ id: spec.id, label: spec.label, description: spec.description, durationMs: Math.round(durationMs(frames)) });
  }
  files['manifest.json'] = `${JSON.stringify(manifest, null, 2)}\n`;
  return { manifest, files };
}
