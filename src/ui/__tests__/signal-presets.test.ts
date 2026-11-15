/** The Settings > Signal wording follows the framing rules: composure language, no mood or medical claims, no scores. */
import { describe, expect, it } from 'vitest';
import { STRINGS } from '../strings';

describe('Settings > Signal wording', () => {
  it('has no emotion, stress, medical or percentage wording', () => {
    const keys = Object.keys(STRINGS).filter((key) => key.startsWith('signal.'));
    expect(keys.length).toBeGreaterThan(10);
    for (const key of keys) expect(STRINGS[key as keyof typeof STRINGS], key).not.toMatch(/emotion|stress|anxi|diagnos|therap|medical|health|\d+\s*%/i);
  });
  it('says that muscle activity is part of the signal', () => {
    expect(STRINGS['signal.hint']).toMatch(/muscle activity/i);
  });
});
