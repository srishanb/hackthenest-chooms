/** Three-stage music routing, fallback and cleanup without real speakers. */
import { expect, it, vi } from 'vitest';
import { metalPosition, soundtrackPosition, startWorldSoundtrack } from '../world-soundtrack';
it('keeps normal calm, adds transition before metal and reaches metal only at full corruption', () => {
  expect(soundtrackPosition(0.2)).toBe(0);
  expect(soundtrackPosition(0.55)).toBeGreaterThan(0);
  expect(metalPosition(0.55)).toBe(0);
  expect(metalPosition(0.825)).toBeCloseTo(0.5);
  expect(metalPosition(1)).toBe(1);
});
it('routes Insistent under transition, fully replaces it with metal, and stops every source', () => {
  const gains: Array<{ gain: { value: number; setTargetAtTime: ReturnType<typeof vi.fn> }; disconnect: ReturnType<typeof vi.fn> }> = [];
  const sources: Array<{ stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];
  const context = { currentTime: 0,
    createGain() { const node = { gain: { value: 0, setTargetAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }; gains.push(node); return node; },
    createBufferSource() { const source = { buffer: null, loop: false, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn() }; sources.push(source); return source; },
  } as unknown as AudioContext;
  const buffer = {} as AudioBuffer, output = {} as GainNode;
  const music = startWorldSoundtrack(context, { quiet: output, tense: output }, { quiet: buffer, tense: buffer, transition: buffer, metal: buffer });
  music.update(0.55);
  expect(gains[0]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, expect.any(Number));
  expect(gains[2]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(expect.any(Number), 0, expect.any(Number));
  music.update(1);
  expect(gains[1]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, expect.any(Number));
  expect(gains[2]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, expect.any(Number));
  expect(sources).toHaveLength(4);
  music.stop(); for (const source of sources) expect(source.stop).toHaveBeenCalledOnce();
});
