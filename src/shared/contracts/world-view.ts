/** Camera coordinates published after rendering, so world-aligned UI scrolls with the scenery. */
export interface WorldViewSnapshot {
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
}
