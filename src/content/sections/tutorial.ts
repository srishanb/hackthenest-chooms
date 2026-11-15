/** The original ten physical tutorial ledges, kept in one stage with per-ledge lessons. */
import type { SectionData } from '../../shared/contracts/content';

export const TUTORIAL_STAGE: SectionData = {
  id: 'tutorial', lesson: 'basics', spawn: { x: 480, y: 460 }, refuge: null, finish: null,
  stage: { kind: 'tutorial', finalPlatformId: 'finish-ledge', snow01: 0, wind01: 0 },
  wind: [{ x: 480, y: -250, width: 960, height: 260, accelerationX: 95, periodMs: 3600, fadePx: 80 }],
  platforms: [
    { id: 'floor', x: 480, y: 500, width: 960, height: 24, type: 'static', lesson: 'basics' },
    { id: 'first-hop', x: 350, y: 395, width: 260, height: 20, type: 'static' },
    { id: 'launch-ledge', x: 620, y: 290, width: 260, height: 20, type: 'static', lesson: 'moving' },
    { id: 'gentle-shuttle', x: 440, y: 185, width: 220, height: 20, type: 'moving', motion: { axis: 'x', distance: 70, periodMs: 4000 } },
    { id: 'moving-exit', x: 300, y: 80, width: 260, height: 20, type: 'static', lesson: 'slippery' },
    { id: 'ice-shelf', x: 580, y: -25, width: 280, height: 20, type: 'slippery', ice01: 0.7 },
    { id: 'ice-exit', x: 740, y: -130, width: 220, height: 20, type: 'static', lesson: 'wind' },
    { id: 'wind-hop', x: 500, y: -235, width: 280, height: 20, type: 'static' },
    { id: 'wind-exit', x: 300, y: -340, width: 260, height: 20, type: 'static', lesson: 'finish' },
    { id: 'finish-ledge', x: 560, y: -445, width: 260, height: 20, type: 'static' },
  ],
};
