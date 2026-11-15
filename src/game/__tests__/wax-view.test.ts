/** View creation and replenishment must never flash every candidate or draw two collectibles. */
import type { Scene } from 'phaser';
import { expect, it } from 'vitest';
import { createEventBus } from '../../shared/bus';
import { createWaxView } from '../wax/view';
import type { createWaxRewards } from '../wax/rewards';

it('starts hidden and shows only the single active drop as the active location changes', () => {
  const marks: Array<{ visible: boolean }> = [];
  const addMark = () => {
    const mark = { visible: true, setDepth() { return this; }, setVisible(value: boolean) { this.visible = value; return this; },
      setAlpha() { return this; }, setPosition() { return this; }, destroy() {} };
    marks.push(mark); return mark;
  };
  const scene = { add: { circle: addMark, ellipse: addMark } } as unknown as Scene;
  let active: string | null = 'a';
  const wax = { drops: [{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 300, y: 100 }],
    isSuppressed: () => false, isActive: (id: string) => id === active } as ReturnType<typeof createWaxRewards>;
  const view = createWaxView(scene, wax, createEventBus());
  expect(marks.filter((mark) => mark.visible)).toHaveLength(0);
  for (const id of ['a', null, 'b', 'a']) {
    active = id; view.update(16, true, false);
    // Each drop has three drawing parts, but there is at most one visible drop.
    expect(marks.filter((mark) => mark.visible)).toHaveLength(id ? 3 : 0);
  }
  view.destroy();
});
