/** Ruby animation follows existing state only. No body, velocity, timing or camera changes. */
import type { Scene } from 'phaser';
import { FOREST_CONFIG as C } from '../../config/forest.config';
import type { PlayerState } from '../player/types';
import { RUBY_FRAMES } from './textures';

export function createRubyView(scene: Scene, bodyHeight: number) {
  for (const [state, frames] of Object.entries(RUBY_FRAMES)) {
    const key = `forest-ruby-${state}`;
    if (!scene.anims.exists(key)) scene.anims.create({ key,
      frames: scene.anims.generateFrameNumbers(key, { start: 0, end: frames - 1 }),
      frameRate: state === 'land' ? 18 : state === 'run' ? 14 : 9, repeat: state === 'land' ? 0 : -1 });
  }
  const sprite = scene.add.sprite(0, 0, 'forest-ruby-idle').setDepth(210)
    .setOrigin(0.5, C.characterFrame.feetY / C.characterFrame.height).setScale(C.characterScale);
  let wasGrounded = false, landedMs = 0, facingLeft = false;
  return {
    update(state: PlayerState, deltaMs: number, paused: boolean) {
      sprite.setPosition(state.x, state.y + bodyHeight / 2);
      if (state.vx < -1) facingLeft = true;
      else if (state.vx > 1) facingLeft = false;
      sprite.setFlipX(facingLeft);
      if (!wasGrounded && state.grounded) landedMs = 180;
      wasGrounded = state.grounded;
      if (!paused) landedMs = Math.max(0, landedMs - deltaMs);
      const pose = state.charging ? 'charge' : !state.grounded ? (state.vy < 0 ? 'rise' : 'fall')
        : landedMs > 0 ? 'land' : Math.abs(state.vx) > 1 ? 'run' : 'idle';
      sprite.play(`forest-ruby-${pose}`, true);
      if (paused) sprite.anims.pause(); else sprite.anims.resume();
    },
  };
}
