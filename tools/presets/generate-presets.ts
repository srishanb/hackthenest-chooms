/**
 * Writes the built-in presets to public/recordings/presets/ (npm run presets).
 * Deterministic: running it twice gives byte-identical files.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildPresets } from './build-presets';

const outDir = fileURLToPath(new URL('../../public/recordings/presets/', import.meta.url));
const { presets, manifest } = await buildPresets();
mkdirSync(outDir, { recursive: true });
for (const preset of presets) writeFileSync(`${outDir}${preset.file}`, preset.text);
writeFileSync(`${outDir}manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${presets.length} presets to ${outDir}`);
