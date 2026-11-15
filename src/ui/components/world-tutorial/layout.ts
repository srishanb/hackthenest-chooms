/** One control reminder stays steady in the camera view, only inside the tutorial stage. */
import type { SectionData } from '../../../shared/contracts/content';
import type { GameSnapshot } from '../../../shared/contracts/game-state';
import type { KeyBindings } from '../../../shared/contracts/settings';
import type { WorldViewSnapshot } from '../../../shared/contracts/world-view';
export function showWorldTutorial(snapshot: Pick<GameSnapshot, 'sectionId' | 'phase'>, sections: readonly SectionData[]): boolean {
  return ['playing', 'ember'].includes(snapshot.phase) && sections.some(section => section.id === snapshot.sectionId && section.stage?.kind === 'tutorial');
}
export function worldTransform(view: WorldViewSnapshot, canvasWidth: number): string {
  const scale = canvasWidth / view.width;
  return `translate(${-view.scrollX * scale}px, ${-view.scrollY * scale}px) scale(${scale})`;
}
export function reminderPosition(view: WorldViewSnapshot): { x: number; y: number } {
  // Cancel camera scrolling in the projection. Jump motion never enters this calculation.
  // Aligned to the HUD grid: 2u edge, below the 3u Controls button plus a 1u gap (1u = 10 game px).
  return { x: view.scrollX + 20, y: view.scrollY + 60 };
}
export function keyLabel(code: string): string {
  const labels: Record<string, string> = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'Space', Escape: 'Esc', Backquote: '`' };
  return labels[code] ?? code.replace(/^Key|^Digit/, '');
}
export function controlKeys(keys: KeyBindings): string[] {
  return [`${keyLabel(keys.left)} / ${keyLabel(keys.right)}`, keyLabel(keys.jump), 'E', keyLabel(keys.recover), keyLabel(keys.pause)];
}
