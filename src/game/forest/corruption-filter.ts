/** Restrained Phaser4 adaptation of bktGlitch line offsets/mirrored sampling/RGB split.
 * Original bktGlitch1.3.2: Jan Vorisek (@odditica), 2022; game-use credit in CREDITS.
 * Replaces GameMaker bindings/noise texture with deterministic hash noise, removes jumble/flash behavior.
 */
import * as Phaser from 'phaser';
import { CORRUPTION_SCREEN_CONFIG as C } from '../../config/corruption-screen.config';
const FRAGMENT = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform float corruption;
uniform float clock;
uniform vec2 resolution;
varying vec2 outTexCoord;
#pragma phaserTemplate(fragmentHeader)
float noise(vec2 p) { return fract(sin(dot(p,vec2(12.9898,78.233))) * 43758.5453); }
// bktGlitch's mirrored address mode prevents sampling outside the captured scene.
vec2 mirror(vec2 p) { return abs(fract(p * 0.5 + 0.5) * 2.0 - 1.0); }
void main() {
  vec2 uv = outTexCoord;
  float band = floor(uv.y * resolution.y / 8.0);
  float wave = sin(band * 0.73 + clock * 1.4);
  float offset = wave * corruption * ${C.shiftMaxPx.toFixed(2)} / resolution.x;
  vec2 at = uv + vec2(offset,0.0);
  float split = corruption * ${C.channelMaxPx.toFixed(2)} / resolution.x;
  vec4 center = texture2D(uMainSampler, mirror(at));
  vec3 color = vec3(texture2D(uMainSampler,mirror(at+vec2(split,0.0))).r,
    center.g,texture2D(uMainSampler,mirror(at-vec2(split,0.0))).b);
  float grain = noise(floor(uv * resolution / 2.0) + floor(clock * 3.0));
  color *= 1.0 - grain * corruption * ${C.noiseMax.toFixed(3)};
  color += vec3(0.65, 0.35, 0.8) * grain * corruption * ${C.darkGrainMax.toFixed(3)};
  gl_FragColor = vec4(color,center.a);
}`;
class CorruptionController extends Phaser.Filters.Controller {
  amount = 0; seconds = 0;
  constructor(camera: Phaser.Cameras.Scene2D.Camera) { super(camera, 'LightenCorruption'); }
}
class CorruptionNode extends Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader {
  constructor(manager: Phaser.Renderer.WebGL.RenderNodes.RenderNodeManager) {
    super('LightenCorruption', manager, undefined, FRAGMENT);
  }
  override setupUniforms(controller: CorruptionController): void {
    this.programManager.setUniform('corruption', controller.amount);
    this.programManager.setUniform('clock', controller.seconds);
    this.programManager.setUniform('resolution', [controller.camera.width, controller.camera.height]);
  }
}
export function createCorruptionFilter(scene: Phaser.Scene) {
  const renderer = scene.game.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return null;
  renderer.renderNodes.addNodeConstructor('LightenCorruption', CorruptionNode);
  const controller = new CorruptionController(scene.cameras.main);
  controller.active = false;
  scene.cameras.main.filters.internal.add(controller);
  return controller;
}
