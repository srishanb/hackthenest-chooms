/** Landing progression is ordered and one-shot, including recovery, pauses and new runs. */
import { describe, expect, it } from 'vitest';
import { createEventBus } from '../../shared/bus';
import type { SectionData, StageKind } from '../../shared/contracts/content';
import { INITIAL_GAME_SNAPSHOT } from '../../shared/contracts/game-state';
import { createStore } from '../../shared/store';
import { createStageProgress } from '../world/stage-progress';
import { createPhaseController } from '../world/phase-controller';
import { stageWeatherAt } from '../world/stage-weather';
import { altitude01 } from '../world/finish';
import { GAME_CONFIG } from '../../config/game.config';
import { createPlayer, stepPlayer } from '../player/movement';

const kinds: StageKind[] = ['tutorial', 'normal', 'snow', 'windy', 'snow-windy'];
const sections: SectionData[] = kinds.map((kind, index) => ({ id: kind,
  stage: { kind, finalPlatformId: `${kind}-last`, snow01: index === 2 || index === 4 ? 1 : 0, wind01: index >= 3 ? 1 : 0 },
  platforms: [{ id: `${kind}-last`, x: 480, y: 500 - index * 1200, width: 200, height: 20, type: 'static' }],
  spawn: { x: 480, y: 460 - index * 1200 }, refuge: null, finish: null,
}));

function setup(resume?: string) {
  const snapshot = createStore({ ...INITIAL_GAME_SNAPSHOT }); const bus = createEventBus();
  const completed: string[] = []; let finishes = 0;
  bus.on('stage_completed', (event) => completed.push(event.stageId));
  bus.on('finish', () => finishes++);
  const progress = createStageProgress(sections, snapshot, bus, resume);
  const phase = createPhaseController(bus, snapshot, () => {});
  const land = (id: string) => { if (progress.land(id)) phase.finish(); };
  return { snapshot, bus, progress, phase, completed, finishes: () => finishes, land };
}

describe('stage progression', () => {
  it('requires the active final platform and ignores ordinary or future ledges', () => {
    const game = setup(); game.land('normal-last'); game.land('ordinary');
    expect(game.completed).toEqual([]);
    game.land('tutorial-last'); game.land('tutorial-last');
    expect(game.completed).toEqual(['tutorial']);
    expect(game.snapshot.get().stage).toEqual({ id: 'normal', index: 1, total: 5, completed: 1 });
    expect(game.phase.isRunning()).toBe(true);
  });

  it('wins once on the fifth final landing and resumes a fresh ordered run', () => {
    const game = setup();
    for (const stage of sections) { game.land(stage.stage!.finalPlatformId); game.land(stage.stage!.finalPlatformId); }
    expect(game.completed).toEqual(kinds);
    expect(game.finishes()).toBe(1);
    expect(game.phase.isRunning()).toBe(false);
    expect(game.snapshot.get().stage?.completed).toBe(5);
    game.progress.reset(); game.snapshot.set({ ...game.snapshot.get(), phase: 'playing' });
    game.land('tutorial-last');
    expect(game.snapshot.get().stage?.completed).toBe(1);
  });

  it('pause, recovery and earlier-platform landings cannot advance or reset progress', () => {
    const game = setup(); game.land('tutorial-last');
    for (const phase of ['paused', 'ember', 'menu'] as const) {
      game.snapshot.set({ ...game.snapshot.get(), phase }); game.land('normal-last');
    }
    game.snapshot.set({ ...game.snapshot.get(), phase: 'playing' }); game.land('tutorial-last');
    expect(game.completed).toEqual(['tutorial']);
    game.land('normal-last'); expect(game.completed).toEqual(['tutorial', 'normal']);
  });

  it('resumes at the manual ember stage without automatically winning there', () => {
    const game = setup('snow-windy-last');
    expect(game.snapshot.get().stage?.completed).toBe(4);
    expect(game.finishes()).toBe(0);
    game.land('snow-windy-last'); expect(game.finishes()).toBe(1);
  });

  it('altitude follows the last ledge when there is no finish box', () => {
    expect(altitude01(sections, 460)).toBe(0);
    expect(altitude01(sections, sections.at(-1)!.platforms[0]!.y)).toBe(1);
  });

  it('passing upward through the last ledge does not win; the later descending landing does', () => {
    const game = setup('snow-windy-last');
    const platform = sections.at(-1)!.platforms[0]!;
    let player = { ...createPlayer(platform.x, platform.y + 30), vy: -500 };
    let sawAbove = false;
    for (let step = 0; step < 240 && game.phase.isRunning(); step++) {
      const out = stepPlayer(player, { left: false, right: false, jump: false }, [platform], 960, GAME_CONFIG, 1000 / 120);
      player = out.state;
      if (player.vy < 0) expect(game.finishes()).toBe(0);
      if (player.y + GAME_CONFIG.player.height / 2 < platform.y - platform.height / 2) sawAbove = true;
      if (out.events.landed) game.land(out.events.landed.platformId);
    }
    expect(sawAbove).toBe(true);
    expect(player.grounded).toBe(true);
    expect(game.finishes()).toBe(1);
  });

  it('blends snow continuously before the snow stage and fades it on the way to wind', () => {
    const firstSnow = sections[2]!.platforms[0]!.y;
    const before = stageWeatherAt(sections, firstSnow + 241).snow01;
    const entering = stageWeatherAt(sections, firstSnow + 100).snow01;
    const inside = stageWeatherAt(sections, firstSnow - 200).snow01;
    expect(before).toBe(0); expect(entering).toBeGreaterThan(0); expect(entering).toBeLessThan(inside);
    expect(inside).toBe(1);
    expect(Math.abs(stageWeatherAt(sections, firstSnow).snow01 - stageWeatherAt(sections, firstSnow + 0.01).snow01)).toBeLessThan(0.001);
    expect(stageWeatherAt(sections, sections[3]!.platforms[0]!.y - 200)).toEqual({ snow01: 0, wind01: 1 });
  });
});
