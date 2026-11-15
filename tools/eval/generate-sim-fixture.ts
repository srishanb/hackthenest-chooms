/**
 * Generates `recordings/sim-fixture.jsonl`: a 30 s synthetic recording with scripted
 * clench, alpha boost, and noisy-pin segments for headless evaluation.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { makeSequence } from '../../src/signal/__tests__/fixtures/make-fixture';
import { createHeader, serializeRecording } from '../../src/signal/sources/recording-format';

const frames = makeSequence({
  startMs: 0,
  durationMs: 30_000,
  hz: 12,
  frame: (_index, tMs) => {
    if (tMs >= 6_000 && tMs < 12_000) {
      return {
        bands: { beta: 3.5 },
        spectrumOptions: { bands: { beta: 3.5 }, broadbandNoise: 0.8 },
      };
    }
    if (tMs >= 18_000 && tMs < 25_000) {
      return {
        bands: { alpha: 4.5 },
        spectrumOptions: { bands: { alpha: 4.5 } },
      };
    }
    if (tMs >= 25_000 && tMs < 27_000) {
      return {
        contactGood01: 0.3,
        spectrumOptions: { mains50HzSpike: 5.0 },
      };
    }
    return {};
  },
});

const header = createHeader('SIMULATED', null, new Date('2026-11-14T22:00:00.000Z'));
const output = serializeRecording({ header, frames });
const outPath = resolve(process.cwd(), 'recordings/sim-fixture.jsonl');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, output, 'utf8');
console.log(`Wrote ${frames.length} frames to ${outPath}`);
