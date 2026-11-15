import { describe, expect, it, vi } from 'vitest';
import type { BandFrame } from '../../shared/contracts/signal-internal';
import { createPresetController, PRESET_BASE_URL, type PresetControllerDeps } from '../presets/controller';
import { serializePreset } from '../presets/preset-file';
import { makeSequence } from './fixtures/make-fixture';

const presetText = serializePreset(makeSequence({ durationMs: 2000, frame: () => ({ spectrum: null }) }), null, null);
const manifest = JSON.stringify({
  presets: ['a', 'b'].map((id) => ({ id, label: id, description: 'test preset', durationMs: 2000 })),
});

function harness(overrides: Partial<PresetControllerDeps> = {}) {
  const ends: Array<() => void> = [];
  const startFrames = vi.fn(async (_frames: BandFrame[], onEnd: () => void) => {
    ends.push(onEnd);
  });
  const fetchText = vi.fn(async (url: string) => (url === `${PRESET_BASE_URL}/manifest.json` ? manifest : presetText));
  const deps: PresetControllerDeps = {
    fetchText,
    storage: undefined,
    now: () => 0,
    startSim: vi.fn(async () => {}),
    startLive: vi.fn(async () => {}),
    startFrames,
    exportRecording: () => '',
    getBaselines: () => ({ active: null, resting: null }),
    setBaselines: vi.fn(),
    algo: null,
    initial: { kind: 'sim' },
    ...overrides,
  };
  return { controller: createPresetController(deps), deps, startFrames, fetchText, ends };
}

describe('preset controller', () => {
  it('a throwing subscriber does not stop later subscribers', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { controller } = harness();
    const second = vi.fn();
    controller.subscribe(() => {
      throw new Error('boom');
    });
    controller.subscribe(second);
    expect(() => controller.setLoop(false)).not.toThrow();
    expect(second).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('a slow preset load that was superseded by the simulator does not take over', async () => {
    let release: (text: string) => void = () => {};
    const fetchText = vi.fn((url: string) =>
      url === `${PRESET_BASE_URL}/manifest.json` ? Promise.resolve(manifest) : new Promise<string>((resolve) => (release = resolve)));
    const { controller, deps, startFrames } = harness({ fetchText });
    const slow = controller.select({ kind: 'preset', id: 'a' });
    await vi.waitFor(() => expect(fetchText).toHaveBeenCalledTimes(2));
    await controller.select({ kind: 'sim' });
    release(presetText);
    await slow;
    expect(startFrames).not.toHaveBeenCalled();
    expect(deps.setBaselines).not.toHaveBeenCalled();
    expect(controller.getSelection()).toEqual({ kind: 'sim' });
  });

  it('a failed switch leaves the playing preset looping', async () => {
    let failNext = false;
    const ends: Array<() => void> = [];
    const startFrames = vi.fn(async (_frames: BandFrame[], onEnd: () => void) => {
      if (failNext) {
        failNext = false;
        throw new Error('could not start');
      }
      ends.push(onEnd);
    });
    const startLive = vi.fn(async () => {
      throw new Error('picker cancelled');
    });
    const { controller } = harness({ startFrames, startLive });
    await controller.select({ kind: 'preset', id: 'a' });
    expect(startFrames).toHaveBeenCalledTimes(1);

    failNext = true;
    await expect(controller.select({ kind: 'preset', id: 'b' })).rejects.toThrow('could not start');
    ends[0]!();
    expect(startFrames).toHaveBeenCalledTimes(3); // the failed b, then a's next pass

    await expect(controller.select({ kind: 'live' })).rejects.toThrow('picker cancelled');
    ends[1]!();
    expect(startFrames).toHaveBeenCalledTimes(4);
    expect(controller.getSelection()).toEqual({ kind: 'preset', id: 'a' });
  });
});
