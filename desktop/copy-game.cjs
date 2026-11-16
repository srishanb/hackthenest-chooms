/**
 * Copies the built game (../dist, made by `npm run build` in the repository root) into this
 * folder, where the packager and `electron .` look for it. The game itself is not changed.
 */
const fs = require('node:fs');
const path = require('node:path');

const from = path.join(__dirname, '..', 'dist');
const to = path.join(__dirname, 'dist');
if (!fs.existsSync(path.join(from, 'index.html'))) {
  console.error('No built game found in ../dist. Run `npm run build` in the repository root first.');
  process.exit(1);
}
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log(`Copied the built game into ${to}`);
