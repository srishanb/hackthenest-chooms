/** Writes the built-in presets to public/recordings/presets/. Run with `npm run presets:build`. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildPresets } from './presets';

const outDir = resolve(process.cwd(), 'public/recordings/presets');
mkdirSync(outDir, { recursive: true });
const { files } = buildPresets();
for (const [name, text] of Object.entries(files)) writeFileSync(resolve(outDir, name), text, 'utf8');
console.log(`Wrote ${Object.keys(files).length} files to ${outDir}`);
