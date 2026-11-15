/** Game cue mapping and bounded one-shot lifecycle, without speakers or real timers. */
import { describe, expect, it, vi } from 'vitest';
import type { GameEvent } from '../../shared/contracts/events';
import { sfxForEvent } from '../sfx-map';
import { createSfxPlayer } from '../sfx';

function makeNode() {
  return { buffer: null, frequency: { value: 0 }, onended: null as (() => void) | null,
    connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
}
function fakeAudio() {
  const nodes: Array<ReturnType<typeof makeNode>> = [];
  function node() { const item = makeNode(); nodes.push(item); return item; }
  const raw = { currentTime: 10, state: 'running', createBufferSource: node, createOscillator: node,
    createGain: () => ({ gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }) };
  return { raw, context: raw as unknown as AudioContext, nodes, output: {} as GainNode };
}

describe('game SFX mapping', () => {
  it('maps each supported moment and distinguishes big landing at the configured boundary', () => {
    const cases: Array<[GameEvent, string]> = [
      [{ type: 'jump', charge01: 0.5 }, 'jump'],
      [{ type: 'land', platformId: 'p', fallHeightPx: 299 }, 'land'],
      [{ type: 'land', platformId: 'p', fallHeightPx: 300 }, 'landHard'],
      [{ type: 'refuge_enter', refugeId: 'r', firstVisit: true }, 'refuge'],
      [{ type: 'checkpoint_saved', refugeId: 'r' }, 'save'],
      [{ type: 'ember_gained' }, 'emberGained'], [{ type: 'ember_requested' }, 'emberRequested'],
      [{ type: 'ember_returned', via: 'assist' }, 'emberReturned'], [{ type: 'ember_cancelled' }, 'emberCancelled'],
      [{ type: 'finish' }, 'finish'], [{ type: 'wax_collected', id: 'w', x: 0, y: 0, collected: 1, total: 2 }, 'wax'],
    ];
    for (const [event, expected] of cases) expect(sfxForEvent(event, 300)).toBe(expected);
    expect(sfxForEvent({ type: 'land', platformId: 'p', fallHeightPx: 300 }, 400)).toBe('land');
  });
  it('ignores non-cue events', () => {
    for (const event of [{ type: 'pause' }, { type: 'resume' }, { type: 'signal_lost' },
      { type: 'narrator_line', lineId: 'line' }] as GameEvent[]) expect(sfxForEvent(event, 300)).toBeNull();
  });
});

describe('SFX playback', () => {
  it('loads local clips and coalesces same-file bursts without losing later cues', async () => {
    const fake = fakeAudio(), load = vi.fn(async () => ({} as AudioBuffer));
    const player = createSfxPlayer(fake.context, fake.output,
      { emberRequested: 'assets/audio/ember/test.mp3', emberReturned: 'assets/audio/ember/test.mp3' }, load, () => false);
    await player.ready;
    expect(player.play('emberRequested')).toBe(true);
    expect(player.play('emberReturned')).toBe(false);
    fake.raw.currentTime += 0.1; expect(player.play('emberReturned')).toBe(true);
    expect(fake.nodes).toHaveLength(2); player.dispose();
    expect(fake.nodes.every((node) => node.stop.mock.calls.length === 1)).toBe(true);
  });
  it('does not play while paused or before audio unlock and cleans voices on stop', async () => {
    const fake = fakeAudio(); let paused = true;
    const player = createSfxPlayer(fake.context, fake.output, { jump: 'assets/audio/jump.ogg' }, async () => ({} as AudioBuffer), () => paused);
    await player.ready; expect(player.play('jump')).toBe(false);
    paused = false; fake.raw.state = 'suspended'; expect(player.play('jump')).toBe(false);
    fake.raw.state = 'running'; expect(player.play('jump')).toBe(true);
    expect(player.getVoiceCount()).toBe(1); player.stop(); expect(player.getVoiceCount()).toBe(0);
    player.dispose(); expect(player.play('jump')).toBe(false);
  });
  it('uses a short fallback tone and caps overlapping voices', async () => {
    const fake = fakeAudio(), player = createSfxPlayer(fake.context, fake.output, { jump: null }, async () => null, () => false);
    await player.ready;
    for (let n = 0; n < 8; n++) player.play('jump');
    expect(player.getVoiceCount()).toBe(4);
    expect(fake.nodes[0]!.stop).toHaveBeenCalledWith(10.11);
    expect(fake.nodes[0]!.stop).toHaveBeenCalledTimes(2); // Scheduled end and bounded-voice replacement.
    fake.nodes.at(-1)!.onended?.(); expect(player.getVoiceCount()).toBe(3);
    player.dispose(); expect(player.getVoiceCount()).toBe(0);
  });
  it('cannot revive disposed voices after asynchronous preload', async () => {
    const fake = fakeAudio(); let resolve!: (buffer: AudioBuffer | null) => void;
    const player = createSfxPlayer(fake.context, fake.output, { jump: 'assets/audio/jump.ogg' },
      () => new Promise((done) => { resolve = done; }), () => false);
    player.dispose(); resolve({} as AudioBuffer); await player.ready;
    expect(player.play('jump')).toBe(false); expect(fake.nodes).toHaveLength(0);
  });
});
