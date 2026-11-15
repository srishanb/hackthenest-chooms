/** Keep reminders tutorial-only, camera-stable, and accurate after key remapping. */
import { expect, it } from 'vitest';
import type { SectionData } from '../../../shared/contracts/content';
import { DEFAULT_SETTINGS } from '../../../shared/contracts/settings';
import { controlKeys, reminderPosition, showWorldTutorial, worldTransform } from './layout';
const tutorial: SectionData = { id: 'custom-tutorial', spawn: { x: 480, y: 460 }, refuge: null, finish: null,
  stage: { kind: 'tutorial', finalPlatformId: 'floor', snow01: 0, wind01: 0 },
  platforms: [{ id: 'floor', x: 480, y: 500, width: 960, height: 24, type: 'static' }] };
it('shows controls only in the actual tutorial region during play or recovery', () => {
  for (const phase of ['playing', 'ember'] as const) expect(showWorldTutorial({ phase, sectionId: tutorial.id }, [tutorial])).toBe(true);
  for (const phase of ['menu', 'paused', 'finished', 'calibrating'] as const) expect(showWorldTutorial({ phase, sectionId: tutorial.id }, [tutorial])).toBe(false);
  expect(showWorldTutorial({ phase: 'playing', sectionId: 'normal' }, [tutorial])).toBe(false);
  expect(showWorldTutorial({ phase: 'playing', sectionId: tutorial.id }, [])).toBe(false);
});
it('keeps the reminder at the same screen position through jumps and camera scrolling', () => {
  const view = { scrollX: 10, scrollY: 200, width: 960, height: 540 };
  expect(worldTransform(view, 1920)).toBe('translate(-20px, -400px) scale(2)');
  expect(worldTransform({ ...view, scrollY: 300 }, 1920)).toBe('translate(-20px, -600px) scale(2)');
  const moved = { ...view, scrollY: -600, scrollX: 50 };
  expect(reminderPosition(view).y - view.scrollY).toBe(120);
  expect(reminderPosition(moved).y - moved.scrollY).toBe(120);
  expect(reminderPosition(moved).x - moved.scrollX).toBe(24);
});
it('uses current key mappings and keeps the fixed ember pickup/place control', () => {
  expect(controlKeys(DEFAULT_SETTINGS.keys)).toEqual(['← / →', 'Space', 'E', 'R', 'Esc']);
  expect(controlKeys({ ...DEFAULT_SETTINGS.keys, recover: 'KeyT', jump: 'KeyJ' })).toEqual(['← / →', 'J', 'E', 'T', 'Esc']);
});
