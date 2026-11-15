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
});
