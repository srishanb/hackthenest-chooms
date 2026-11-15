import { describe, expect, it } from 'vitest';
import { appendLabels, summariseCheckpoint, CHECKPOINT_PLAN } from './checkpoint';

describe('checkpoint', () => {
  it('plan is eyes open then closed, twice, 15 s each', () => {
    expect(CHECKPOINT_PLAN.map((s) => s.label)).toEqual(['eyes_open', 'eyes_closed', 'eyes_open', 'eyes_closed']);
    expect(CHECKPOINT_PLAN.every((s) => s.ms === 15_000)).toBe(true);
  });

  it('passes when eyes-closed alpha share is well above eyes-open', () => {
    const result = summariseCheckpoint([
      { label: 'eyes_open', value: 0.25 },
      { label: 'eyes_open', value: 0.27 },
      { label: 'eyes_closed', value: 0.9 },
      { label: 'eyes_closed', value: 0.95 },
    ]);
    expect(result.ratio).toBeGreaterThan(3);
    expect(result.pass).toBe(true);
  });

  it('fails on a flat signal and gives a null ratio when a side is empty', () => {
    expect(summariseCheckpoint([{ label: 'eyes_open', value: 0.3 }, { label: 'eyes_closed', value: 0.31 }]).pass).toBe(false);
    expect(summariseCheckpoint([{ label: 'eyes_open', value: 0.3 }]).ratio).toBeNull();
  });

  it('appends one label line per mark after the existing lines', () => {
    const text = appendLabels('{"type":"header"}\n', [{ t: 10, label: 'eyes_open' }, { t: 20, label: 'end' }]);
    expect(text.trim().split('\n').map((l) => JSON.parse(l) as object)).toEqual([{ type: 'header' }, { type: 'label', t: 10, label: 'eyes_open' }, { type: 'label', t: 20, label: 'end' }]);
  });
});
