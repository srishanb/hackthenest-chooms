/** The colour grade bakes its config into GLSL once; a bad number would break the shader silently. */
import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ Filters: { Controller: class {} }, Renderer: { WebGL: { RenderNodes: { BaseFilterShader: class {} }, WebGLRenderer: class {} } } }));

describe('colour grade shader', () => {
  it('writes every config number into the shader as a finite float', async () => {
    const { COLOR_GRADE_FRAGMENT } = await import('../forest/color-grade');
    expect(COLOR_GRADE_FRAGMENT).not.toMatch(/NaN|undefined|Infinity/);
    expect(COLOR_GRADE_FRAGMENT).toContain('gl_FragColor');
    // Alpha passes through untouched so transparent overlays stay transparent.
    expect(COLOR_GRADE_FRAGMENT).toContain('source.a');
  });
});
