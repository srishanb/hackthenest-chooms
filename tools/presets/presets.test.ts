import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SIGNAL_CONFIG } from '../../src/config/signal.config';
import type { ComposureState } from '../../src/shared/contracts/composure';
import { resolveAlgorithm } from '../../src/signal/algorithms/registry';
import { createPipeline } from '../../src/signal/pipeline';
import { parseRecording } from '../../src/signal/sources/recording-format';
import { buildPresets } from './build-presets';

const dir = new URL('../../public/recordings/presets/', import.meta.url);

/** Replays a committed preset through the real pipeline with its own calibration; returns the state about every 500 ms. */
function replay(id: string): ComposureState[] {
  const recording = parseRecording(readFileSync(new URL(`${id}.jsonl`, dir), 'utf8'));
  const pipeline = createPipeline({ config: SIGNAL_CONFIG, entry: resolveAlgorithm('intensity-v2', 'intensity-v2'), initialMode: 'adaptive', initialSource: 'REPLAY' });
  pipeline.setBaselines(recording.header.baselines!);
  return recording.frames.map((frame) => pipeline.process({ ...frame, source: 'REPLAY' }, frame.t));
}
const between = (states: ComposureState[], fromS: number, toS: number) => states.slice(fromS * 12, toS * 12);
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

describe('built-in presets: generation', () => {
  it('is deterministic and matches the committed files', async () => {
    const first = await buildPresets();
    const second = await buildPresets();
    expect(second.presets.map((p) => p.text)).toEqual(first.presets.map((p) => p.text));
    for (const preset of first.presets) expect(readFileSync(new URL(preset.file, dir), 'utf8'), `${preset.id} is stale: run npm run presets`).toBe(preset.text);
    expect(JSON.parse(readFileSync(new URL('manifest.json', dir), 'utf8'))).toEqual(first.manifest);
  }, 30_000);

  it('lists the five presets with ids, labels, descriptions and durations', async () => {
    const { manifest } = await buildPresets();
    expect(manifest.presets.map((p) => p.id)).toEqual(['calm-climb', 'rising-tension', 'jaw-clench-bursts', 'mixed-climb', 'noisy-pin']);
    for (const entry of manifest.presets) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.durationMs).toBeGreaterThanOrEqual(45_000);
      expect(`${entry.label} ${entry.description}`).not.toMatch(/emotion|stress/i);
    }
  }, 30_000);
});

describe('built-in presets: trend through intensity-v2', () => {
  it('calm climb stays calm: low intensity, resting reached, always valid', () => {
    const states = replay('calm-climb');
    expect(Math.max(...between(states, 8, 45).map((s) => s.intensity))).toBeLessThan(0.2);
    expect(mean(between(states, 8, 45).map((s) => s.resting))).toBeGreaterThan(0.8);
    expect(between(states, 0, 45).every((s) => s.valid)).toBe(true);
  });

  it('rising tension rises: calm start, high finish', () => {
    const states = replay('rising-tension');
    expect(mean(between(states, 5, 11).map((s) => s.intensity))).toBeLessThan(0.15);
    expect(mean(between(states, 38, 45).map((s) => s.intensity))).toBeGreaterThan(0.75);
  });

  it('jaw clench bursts show up as swings, then ease back', () => {
    const states = replay('jaw-clench-bursts');
    const values = between(states, 6, 45).map((s) => s.intensity);
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.25);
    expect(between(states, 6, 45).every((s) => s.valid)).toBe(true);
  });

  it('mixed climb goes calm, tense, then recovers with the ember available again', () => {
    const states = replay('mixed-climb');
    expect(mean(between(states, 8, 16).map((s) => s.intensity))).toBeLessThan(0.1);
    expect(mean(between(states, 26, 34).map((s) => s.intensity))).toBeGreaterThan(0.7);
    expect(mean(between(states, 50, 60).map((s) => s.intensity))).toBeLessThan(0.1);
    expect(mean(between(states, 50, 60).map((s) => s.resting))).toBeGreaterThan(0.8);
  });

  it('noisy pin: the simulator reports contact as good, so the reading stays valid, and recovers when the pin is fixed', () => {
    const states = replay('noisy-pin');
    expect(between(states, 4, 45).every((s) => s.valid)).toBe(true);
    expect(mean(between(states, 38, 45).map((s) => s.intensity))).toBeLessThan(0.15);
    expect(mean(between(states, 38, 45).map((s) => s.resting))).toBeGreaterThan(0.8);
  });
});
