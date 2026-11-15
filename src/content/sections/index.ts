/** Tutorial course: familiar first jumps, then safe previews of movement, ice and fixed wind. */
import type { SectionData } from '../../shared/contracts/content';

export const SECTIONS: readonly SectionData[] = [
  {
    id: 'tutorial-basics', lesson: 'basics', spawn: { x: 480, y: 460 }, refuge: null, finish: null,
    platforms: [
      { id: 'floor', x: 480, y: 500, width: 960, height: 24, type: 'static' },
      { id: 'first-hop', x: 350, y: 395, width: 260, height: 20, type: 'static' },
      { id: 'launch-ledge', x: 620, y: 290, width: 260, height: 20, type: 'static' },
    ],
  },
  {
    id: 'tutorial-moving', lesson: 'moving', spawn: { x: 620, y: 250 }, refuge: null, finish: null,
    platforms: [
      { id: 'moving-entry', x: 620, y: 290, width: 260, height: 20, type: 'static' },
      { id: 'gentle-shuttle', x: 440, y: 185, width: 220, height: 20, type: 'moving', motion: { axis: 'x', distance: 70, periodMs: 4000 } },
      { id: 'moving-exit', x: 300, y: 80, width: 260, height: 20, type: 'static' },
    ],
  },
  {
    id: 'tutorial-ice', lesson: 'slippery', spawn: { x: 300, y: 40 }, refuge: null, finish: null,
    platforms: [
      { id: 'ice-entry', x: 300, y: 80, width: 260, height: 20, type: 'static' },
      { id: 'ice-shelf', x: 580, y: -25, width: 280, height: 20, type: 'slippery' },
      { id: 'ice-exit', x: 740, y: -130, width: 220, height: 20, type: 'static' },
    ],
  },
  {
    id: 'tutorial-wind', lesson: 'wind', spawn: { x: 740, y: -170 }, refuge: null, finish: null,
    wind: [{ x: 480, y: -250, width: 960, height: 260, accelerationX: 95, periodMs: 3600 }],
    platforms: [
      { id: 'wind-entry', x: 740, y: -130, width: 220, height: 20, type: 'static' },
      { id: 'wind-hop', x: 500, y: -235, width: 280, height: 20, type: 'static' },
      { id: 'wind-exit', x: 300, y: -340, width: 260, height: 20, type: 'static' },
    ],
  },
  {
    id: 'tutorial-finish', lesson: 'finish', spawn: { x: 300, y: -380 }, refuge: null,
    finish: { x: 560, y: -490, width: 180, height: 80 },
    platforms: [
      { id: 'finish-entry', x: 300, y: -340, width: 260, height: 20, type: 'static' },
      { id: 'finish-ledge', x: 560, y: -445, width: 260, height: 20, type: 'static' },
    ],
  },
];
