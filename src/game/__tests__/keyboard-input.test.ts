/** Alternate keys are equivalent and short taps survive render/physics boundaries. */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../shared/contracts/settings';
import { GAME_CONFIG } from '../../config/game.config';
import { createKeyboardInput } from '../keyboard-input';
import { createPlayer, stepPlayer } from '../player/movement';

describe('game keyboard input', () => {
  it.each(['KeyA', 'ArrowLeft'])('%s moves left', (code) => {
    const input = createKeyboardInput(() => DEFAULT_SETTINGS.keys);
    expect(input.keyDown(code)).toBe(true);
    expect(input.read()).toEqual({ left: true, right: false, jump: false });
    input.keyUp(code);
    expect(input.read().left).toBe(false);
  });

  it.each(['KeyD', 'ArrowRight'])('%s moves right', (code) => {
    const input = createKeyboardInput(() => DEFAULT_SETTINGS.keys);
    input.keyDown(code);
    expect(input.read()).toEqual({ left: false, right: true, jump: false });
  });

  it.each(['Space', 'ArrowUp'])('%s can charge and release a jump', (code) => {
    const input = createKeyboardInput(() => DEFAULT_SETTINGS.keys);
    input.keyDown(code);
    expect(input.read().jump).toBe(true);
    expect(input.read().jump).toBe(true);
    input.keyUp(code);
    expect(input.read().jump).toBe(false);
  });

  it('does not release a jump when one of two held jump aliases is released', () => {
    const input = createKeyboardInput(() => DEFAULT_SETTINGS.keys);
    input.keyDown('Space');
    input.keyDown('ArrowUp');
    input.read();
    input.keyUp('Space');
    expect(input.read().jump).toBe(true);
    input.keyUp('ArrowUp');
    expect(input.read().jump).toBe(false);
  });

  it('preserves a tap shorter than a render frame and actually launches the player', () => {
    const input = createKeyboardInput(() => DEFAULT_SETTINGS.keys);
    input.keyDown('ArrowUp');
    input.keyUp('ArrowUp');
    const platforms = [{ id: 'floor', x: 480, y: 500, width: 960, height: 24 }];
    const initial = { ...createPlayer(480, 470), grounded: true, platformId: 'floor', jumpLatch: false };
    const dt = 1000 / GAME_CONFIG.stepHz;
    const charging = stepPlayer(initial, input.read(), platforms, 960, GAME_CONFIG, dt);
    expect(charging.state.charging).toBe(true);
    const launched = stepPlayer(charging.state, input.read(), platforms, 960, GAME_CONFIG, dt);
    expect(launched.events.jumped).not.toBeNull();
    expect(launched.state.vy).toBeLessThan(0);
  });

  it('keeps repeat events from queuing extra launches and clears held keys on blur/pause', () => {
    const input = createKeyboardInput(() => DEFAULT_SETTINGS.keys);
    input.keyDown('Space'); input.keyDown('Space'); input.keyDown('Space');
    expect(input.read().jump).toBe(true);
    input.keyUp('Space');
    expect(input.read().jump).toBe(false);
    input.keyDown('KeyD'); input.keyDown('ArrowUp');
    input.clear();
    expect(input.read()).toEqual({ left: false, right: false, jump: false });
  });

  it('honors live custom bindings and resolves alias conflicts in favor of explicit remaps', () => {
    let keys = { ...DEFAULT_SETTINGS.keys, left: 'KeyD', jump: 'KeyJ' };
    const input = createKeyboardInput(() => keys);
    input.keyDown('KeyD');
    expect(input.read()).toEqual({ left: true, right: false, jump: false });
    input.keyDown('KeyJ');
    expect(input.read().jump).toBe(true);
    input.clear();
    keys = { ...keys, left: 'KeyQ' };
    input.keyDown('KeyQ');
    expect(input.read().left).toBe(true);
    expect(input.keyDown('KeyX')).toBe(false);
  });
});
