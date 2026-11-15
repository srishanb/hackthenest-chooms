/**
 * Vite (dev server and build) and Vitest (tests) configuration.
 *
 * - The dev server uses the PORT from .env.local, which scripts/wt.sh sets per worktree so
 *   parallel agents never collide. strictPort makes a clash an error instead of a silent move.
 * - base './' makes the build work from any folder or static host.
 * - loadEnv is called with '' so it can see PORT. Nothing from the environment is passed to
 *   the browser bundle here; only variables prefixed VITE_ ever are, and keys must never use it.
 */
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.PORT) || 5173;

  return {
    base: './',
    // Phaser is one large library (about 1.4 MB minified); it is loaded from disk, so the size warning is noise.
    build: { chunkSizeWarningLimit: 2000 },
    server: { port, strictPort: true },
    preview: { port, strictPort: true },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
    },
  };
});
