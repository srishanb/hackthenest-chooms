/** Play again: the finish screen shows only when finished, and Enter restarts exactly once. */
import { describe, expect, it } from 'vitest';
import { finishScreenVisible, restartsOnKey } from '../components/finish-screen/finish-screen-state';

const enter = { code: 'Enter', repeat: false, phase: 'finished' as const, focusOnControl: false };

describe('finish screen', () => {
  it('shows only in the finished phase', () => {
    expect(finishScreenVisible('finished')).toBe(true);
    for (const phase of ['menu', 'playing', 'paused', 'ember', 'calibrating'] as const) expect(finishScreenVisible(phase)).toBe(false);
  });

  it('Enter and keypad Enter restart when finished', () => {
    expect(restartsOnKey(enter)).toBe(true);
    expect(restartsOnKey({ ...enter, code: 'NumpadEnter' })).toBe(true);
  });

  it('never restarts mid-climb, on a held key, or when a focused button handles Enter itself', () => {
    expect(restartsOnKey({ ...enter, phase: 'playing' })).toBe(false);
    expect(restartsOnKey({ ...enter, repeat: true })).toBe(false);
    expect(restartsOnKey({ ...enter, focusOnControl: true })).toBe(false);
  });

  it('other keys do nothing (Space stays the jump key)', () => {
    expect(restartsOnKey({ ...enter, code: 'Space' })).toBe(false);
    expect(restartsOnKey({ ...enter, code: 'KeyR' })).toBe(false);
  });
});
