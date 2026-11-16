/**
 * One pixel size and one grid for all gameplay art (Decision D-34).
 *
 * The snap helper is checked directly, and a guard scans the game lane's source so a new fractional
 * scale (a sprite drawn at some size other than `pixelScale`) cannot slip in unnoticed.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FOREST_CONFIG } from '../../config/forest.config';
import { PIXEL_GRID, snapInside, snapToGrid } from '../forest/pixel-grid-snap';
import { leafPose } from '../forest/pixel-particles';

describe('snapToGrid', () => {
  it('rounds to the nearest multiple of the pixel size', () => {
    expect(PIXEL_GRID).toBe(FOREST_CONFIG.pixelScale);
    expect([0, 0.9, 1, 1.1, 2.9, 3, 3.2, 101.5].map((v) => snapToGrid(v))).toEqual([0, 0, 2, 2, 2, 4, 4, 102]);
    expect([-0.9, -1.1, -3.2].map((v) => snapToGrid(v))).toEqual([0, -2, -4]);
    expect(Object.is(snapToGrid(-0.4), 0)).toBe(true);
    expect(snapToGrid(13, 4)).toBe(12);
    expect(snapToGrid(19, 4)).toBe(20);
  });
  it('lands every value on the grid and moves it by at most half a step', () => {
    for (let v = -50; v <= 50; v += 0.37) {
      const s = snapToGrid(v);
      expect(s % PIXEL_GRID === 0).toBe(true);
      expect(Math.abs(s - v)).toBeLessThanOrEqual(PIXEL_GRID / 2 + 1e-9);
    }
  });
  it('passes non-finite values through and ignores a bad step', () => {
    expect(snapToGrid(Number.NaN)).toBeNaN();
    expect(snapToGrid(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
    expect(snapToGrid(3.3, 0)).toBe(3.3);
  });
  it('snapInside keeps a snapped scroll within the camera bounds', () => {
    // The floor bound of a camera can be an odd number: the snapped scroll must not round past it.
    expect(snapInside(509.6, 0, 509)).toBe(508);
    expect(snapInside(-0.9, -1, 100)).toBe(0);
    expect(snapInside(50.2, 0, 509)).toBe(50);
    expect(snapInside(5, 3, 3)).toBe(3);
  });
});

describe('leaves turn by fixed drawn poses, never by free rotation', () => {
  it('maps any angle to one of three shapes and a flip', () => {
    expect(leafPose(0)).toEqual({ frame: 0, flipY: false });
    expect(leafPose(Math.PI)).toEqual({ frame: 0, flipY: false });
    expect(leafPose(Math.PI / 2)).toEqual({ frame: 2, flipY: false });
    expect(leafPose(Math.PI / 4)).toEqual({ frame: 1, flipY: true });
    expect(leafPose(-Math.PI / 4)).toEqual({ frame: 1, flipY: false });
    expect(leafPose(Number.NaN)).toEqual({ frame: 0, flipY: false });
  });
});

/**
 * Calls that may scale art by something other than `pixelScale`, with the reason each is allowed.
 * Key: `<file under src/game>|<argument text>`.
 */
const ALLOWED: Record<string, string> = {
  'effects/darkness.ts|radiusPx / CLEAR_RADIUS': 'A soft radial gradient (the darkness sheet), not pixel art: its size follows the light radius.',
  'forest/ruby-view.ts|C.characterScale': 'Legacy Ruby sprite view, used by no scene (createCandleView replaced it).',
  'forest/atmosphere.ts|GUST_SCALE': 'Wind gust frames are drawn with 8 texture px per art pixel; GUST_SCALE = pixelScale / 8 draws one art pixel as pixelScale px.',
  'backdrop/waterfall-view.ts|tileScale': 'The generated backdrop passes its own whole tile scale; that folder is aligned by its own owner.',
  'forest/candle-lighting.ts|extent * 2, extent * 2': 'A soft vignette gradient stretched past the screen corners, not pixel art.',
  'forest/candle-lighting.ts|C.candleGlowRadiusPx * 2, C.candleGlowRadiusPx * 2': 'A soft glow gradient around the candle, not pixel art.',
  'forest/corruption-screen.ts|scene.cameras.main.width, scene.cameras.main.height': 'A faint full-screen texture overlay during corruption (alpha at most 0.12), not scenery art.',
};

/** Arguments that mean exactly the one pixel size, or a whole multiple of it. */
const PIXEL_SCALE = /^(C\.pixelScale|FOREST_CONFIG\.pixelScale|PIXEL_GRID)(\s*\*\s*\d+)?$/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

/** Every `call(` in `text` with its argument text (up to the matching parenthesis). */
function calls(text: string, name: string): string[] {
  const found: string[] = [];
  let at = text.indexOf(`.${name}(`);
  while (at >= 0) {
    let depth = 0, i = at + name.length + 1;
    const start = i + 1;
    for (; i < text.length; i++) {
      if (text[i] === '(') depth++;
      else if (text[i] === ')' && --depth === 0) break;
    }
    found.push(text.slice(start, i).trim());
    at = text.indexOf(`.${name}(`, i);
  }
  return found;
}

describe('guard: every sprite in the game lane is drawn at the one pixel size', () => {
  const root = 'src/game';
  const files = sourceFiles(root);
  it('finds the game source', () => expect(files.length).toBeGreaterThan(50));
  it('has no setScale, setTileScale or setDisplaySize at another size unless allowlisted with a reason', () => {
    const offending: string[] = [];
    const used = new Set<string>();
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      const short = relative(root, file).split('\\').join('/');
      for (const name of ['setScale', 'setTileScale', 'setDisplaySize']) {
        for (const arg of calls(text, name)) {
          if (name !== 'setDisplaySize' && PIXEL_SCALE.test(arg)) continue;
          const key = `${short}|${arg}`;
          if (ALLOWED[key]) { used.add(key); continue; }
          offending.push(`${short}: .${name}(${arg})`);
        }
      }
    }
    expect(offending, 'Draw art at FOREST_CONFIG.pixelScale; pick or crop a different sprite instead of scaling it').toEqual([]);
    // An allowlist entry whose call is gone should be removed, so the list stays honest.
    expect(Object.keys(ALLOWED).filter((key) => !used.has(key))).toEqual([]);
  });
  it('rotates no art freely (setRotation / setAngle break square pixels)', () => {
    const rotating = files.filter((file) => /\.(setRotation|setAngle)\(/.test(readFileSync(file, 'utf8')));
    expect(rotating.map((file) => relative(root, file))).toEqual([]);
  });
});
