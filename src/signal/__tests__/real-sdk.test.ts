/**
 * Integration test against the REAL vendored SDK (public/vendor/pieeg.js), not a fake.
 *
 * Why: the unit tests use a fake SDK, which cannot catch a wrong member name or a changed
 * shape after someone updates the vendored file. The SDK is a plain script,
 * so it runs in Node when evaluated as a plain script, and its simulator needs no Bluetooth. Takes a few seconds of real time.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SIGNAL_CONFIG } from '../../config/signal.config';
import type { BandFrame } from '../../shared/contracts/signal-internal';
import { createPiEEGAdapter } from '../sources/pieeg-adapter';
import type { PiEEGConstructor } from '../vendor/pieeg-types';

/** Run the vendored file the way a <script> tag does: as a plain script that sets `window.PiEEG`. */
function loadSdk(): PiEEGConstructor {
  const scope: { PiEEG?: PiEEGConstructor } = {};
  const source = readFileSync(new URL('../../../public/vendor/pieeg.js', import.meta.url), 'utf8');
  new Function('window', source)(scope);
  if (!scope.PiEEG) throw new Error('pieeg.js did not define PiEEG');
  return scope.PiEEG;
}
const PiEEG = loadSdk();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const alphaShare = (f: BandFrame) => f.bands.alpha / (f.bands.theta + f.bands.alpha + f.bands.beta);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('real PiEEG simulator through our adapter', () => {
  it('delivers about 12 frames a second with a spectrum, and the alpha boost raises the alpha share', async () => {
    const frames: BandFrame[] = [];
    const adapter = createPiEEGAdapter(SIGNAL_CONFIG, { onFrame: (f) => frames.push(f), onError: (e) => { throw e; }, onDisconnect: () => {} }, PiEEG);
    await adapter.connect('simulator');
    try {
      await sleep(2500);
      const before = frames.length;
      expect(before).toBeGreaterThan(15); // about 12 Hz after the first FFT window fills
      expect(before).toBeLessThan(45);

      const baseline = mean(frames.slice(-12).map(alphaShare));
      const first = frames[0];
      expect(first?.source).toBe('SIMULATED');
      expect(first?.spectrum?.freqsHz.length).toBeGreaterThan(10);
      expect(first?.contactGood01).toBeGreaterThan(0.5);

      adapter.triggerSimEvent('alpha', true);
      await sleep(3500);
      const boosted = mean(frames.slice(-12).map(alphaShare));
      expect(boosted).toBeGreaterThan(baseline * 1.2);
    } finally {
      adapter.disconnect();
    }
  }, 15_000);
});
