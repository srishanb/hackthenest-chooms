/** Edge recovery stays local, descending-only and subordinate to ordinary one-way landings. */
import { expect, it } from 'vitest';
import { GAME_CONFIG } from '../../config/game.config';
import { createPlayer, stepPlayer } from '../player/movement';
import { findSupport } from '../player/collide';

const dt = 1000 / GAME_CONFIG.stepHz;
const idle = { left: false, right: false, jump: false };
const ledge = { id: 'edge', x: 400, y: 200, width: 160, height: 16 };

it('catches a three-pixel near miss on either side, lands once and remains supported', () => {
  for (const type of ['static', 'slippery', 'moving']) for (const side of [-1, 1]) for (const wind of [0, 95]) {
    const platform = { ...ledge, type, ice01: 1 };
    const state = { ...createPlayer(400 + side * 95, 172), vy: 300 };
    const caught = stepPlayer(state, idle, [platform], 960, GAME_CONFIG, dt, { windAccelerationX: wind });
    expect(caught.events.landed?.platformId).toBe('edge');
    expect(caught.state.y).toBe(174);
    expect(findSupport([platform], caught.state.x, 24, 192)?.id).toBe('edge');
    const standing = stepPlayer(caught.state, idle, [platform], 960, GAME_CONFIG, dt);
    expect(standing.state.grounded).toBe(true);
    expect(standing.events.landed).toBeNull();
  }
});

it('never catches outside the reach, below an already passed ledge, or while ascending', () => {
  const states = [
    { ...createPlayer(497, 172), vy: 300 }, // five-pixel horizontal gap
    { ...createPlayer(495, 176), vy: 300 }, // feet already below the top
    { ...createPlayer(495, 172), vy: -300 },
  ];
  for (const state of states) expect(stepPlayer(state, idle, [ledge], 960, GAME_CONFIG, dt).events.landed).toBeNull();
});

it('does not pull a player back onto a platform they just walked off', () => {
  const state = { ...createPlayer(491, 174), grounded: true, platformId: 'edge' };
  const next = stepPlayer(state, { ...idle, right: true }, [ledge], 960, GAME_CONFIG, dt);
  expect(next.state.grounded).toBe(false);
  expect(next.events.landed).toBeNull();
});

it('prefers a normal landing over any nearby edge catch and preserves normal landing state', () => {
  const normal = { ...ledge, id: 'normal', x: 600, y: 201 };
  const state = { ...createPlayer(519, 172), vy: 600 };
  const nearEdge = { ...ledge, x: 424 }; // near miss on its right edge
  const withEdge = stepPlayer(state, idle, [nearEdge, normal], 960, GAME_CONFIG, dt);
  const withoutEdge = stepPlayer(state, idle, [normal], 960, GAME_CONFIG, dt);
  expect(withEdge).toEqual(withoutEdge);
  expect(withEdge.events.landed?.platformId).toBe('normal');
});
