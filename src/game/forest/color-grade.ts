/**
 * Whole-screen colour grade: one cheap shader pass on the main camera that gives every scene
 * one consistent mood (cool shadows, warm highlights, a little contrast, soft corners).
 *
 * Why a camera filter: tinting each sprite separately can't make shadows cool and highlights
 * warm at once. A grade works on the final picture, the way film and most 2D games do it.
 * It follows the same pattern as corruption-filter.ts. The numbers are fixed in
 * src/config/color-grade.config.ts and baked into the shader once, so per frame it is one
 * full-screen draw with no uniforms to upload.
 *
 * Visual only: it never reads the signal and never touches controls or physics. On the canvas
 * renderer (no WebGL) it does nothing.
 */
import * as Phaser from 'phaser';
import { COLOR_GRADE_CONFIG as C } from '../../config/color-grade.config';

const NODE = 'LightenColorGrade';
const vec3 = (rgb: readonly number[]): string => `vec3(${rgb.map((v) => v.toFixed(3)).join(', ')})`;

/** Exported for tests: the GLSL source with the config numbers written in. */
export const COLOR_GRADE_FRAGMENT = `
precision mediump float;
uniform sampler2D uMainSampler;
varying vec2 outTexCoord;
#pragma phaserTemplate(fragmentHeader)
void main() {
  vec4 source = texture2D(uMainSampler, outTexCoord);
  vec3 color = source.rgb;
  color = (color - 0.5) * ${C.contrast.toFixed(3)} + 0.5;
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luma), color, ${C.saturation.toFixed(3)});
  color += ${vec3(C.shadowTint)} * (1.0 - smoothstep(0.0, 0.5, luma)) * ${C.shadowAmount.toFixed(3)};
  color += ${vec3(C.highlightTint)} * smoothstep(0.5, 1.0, luma) * ${C.highlightAmount.toFixed(3)};
  float edge = length((outTexCoord - 0.5) * 2.0) / 1.41421;
  color *= 1.0 - smoothstep(${C.vignetteInner.toFixed(3)}, ${C.vignetteOuter.toFixed(3)}, edge) * ${C.vignetteStrength.toFixed(3)};
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), source.a);
}`;

class ColorGradeController extends Phaser.Filters.Controller {
  constructor(camera: Phaser.Cameras.Scene2D.Camera) { super(camera, NODE); }
}

class ColorGradeNode extends Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader {
  constructor(manager: Phaser.Renderer.WebGL.RenderNodes.RenderNodeManager) {
    super(NODE, manager, undefined, COLOR_GRADE_FRAGMENT);
  }
}

/** Add the grade to the scene's main camera. Returns null when it is off or WebGL is unavailable. */
export function createColorGrade(scene: Phaser.Scene): ColorGradeController | null {
  if (!C.enabled) return null;
  const renderer = scene.game.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return null;
  // Phaser throws if the same node is registered twice (a second scene or a scene restart).
  if (!renderer.renderNodes.hasNode(NODE)) renderer.renderNodes.addNodeConstructor(NODE, ColorGradeNode);
  const controller = new ColorGradeController(scene.cameras.main);
  scene.cameras.main.filters.internal.add(controller);
  return controller;
}
