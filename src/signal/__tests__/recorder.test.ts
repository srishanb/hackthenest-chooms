import { describe, expect, it } from 'vitest';
import type { ComposureState } from '../../shared/contracts/composure';
import { createRecorder } from '../recorder';
import { parseRecording } from '../sources/recording-format';
import { makeFrame, makeSequence } from './fixtures/make-fixture';

const sampleState = (t: number): ComposureState => ({
  intensity: 0.42,
  resting: 0.68,
  restingActive: true,
  quality: 0.95,
  valid: true,
  sampleAgeMs: 12,
  held: false,
  mode: 'adaptive',
  calibrated: true,
  source: 'SIMULATED',
  algo: 'intensity-v1',
  t,
});

describe('recorder', () => {
  it('records frames, states, and events to JSONL and round-trips frames via parseRecording', () => {
    const fixedDate = new Date('2026-11-14T22:00:00.000Z');
    const recorder = createRecorder({ source: 'SIMULATED', algo: 'intensity-v1', createdAt: fixedDate });

    const frames = makeSequence({ durationMs: 500, hz: 12 });
    for (const frame of frames) {
      recorder.recordFrame(frame);
      recorder.recordState(sampleState(frame.t));
    }
    recorder.recordEvent({ type: 'calibration_result', ok: true }, 250);

    expect(recorder.counts()).toEqual({ frames: frames.length, states: frames.length, events: 1 });

    const jsonl = recorder.toJSONL();
    const parsed = parseRecording(jsonl);
    expect(parsed.header).toEqual({
      type: 'header',
      format: 'lighten-up-recording',
      version: 1,
      createdAt: '2026-11-14T22:00:00.000Z',
      source: 'SIMULATED',
      algo: 'intensity-v1',
    });
    expect(parsed.frames).toHaveLength(frames.length);
    expect(parsed.frames[0]?.bands).toEqual(frames[0]?.bands);

    const lines = jsonl.trim().split('\n').map((line) => JSON.parse(line) as { type: string });
    expect(lines.some((line) => line.type === 'state')).toBe(true);
    expect(lines.some((line) => line.type === 'event')).toBe(true);
  });

  it('strips unexpected fields such as raw samples from recorded frames', () => {
    const recorder = createRecorder({ source: 'SIMULATED', algo: 'intensity-v1' });
    const frameWithExtra = {
      ...makeFrame({ t: 100 }),
      rawSamples: [1, 2, 3, 4],
      playerName: 'should-not-exist',
    };
    recorder.recordFrame(frameWithExtra);

    const jsonl = recorder.toJSONL();
    expect(jsonl).not.toContain('rawSamples');
    expect(jsonl).not.toContain('playerName');
  });

  it('resets counts and buffered lines on clear()', () => {
    const recorder = createRecorder({ source: 'REPLAY', algo: null });
    recorder.recordFrame(makeFrame({ t: 0 }));
    recorder.recordState(sampleState(0));
    recorder.recordEvent({ type: 'pause' }, 0);
    recorder.clear();

    expect(recorder.counts()).toEqual({ frames: 0, states: 0, events: 0 });
    const parsed = parseRecording(recorder.toJSONL());
    expect(parsed.frames).toEqual([]);
  });
});
