/**
 * Keeps the desktop app up to date. Runs in Electron's main process only: the game window itself
 * stays offline (main.cjs blocks every outside request from it).
 *
 * What happens, a few seconds after the window opens:
 *   1. The app asks GitHub for the repository's list of releases (one small request).
 *   2. update-feed.cjs picks the newest release of THIS app that is newer than the running one.
 *   3. Windows and Linux (AppImage): the updater library (electron-updater) downloads it in the
 *      background and installs it when the game is closed. The window title says when it is ready.
 *      macOS: the app is not signed with an Apple Developer ID, and macOS refuses self-installing
 *      updates from unsigned apps, so the app only says a new version exists and offers its page.
 * No update, no network, or any error: the game simply runs as it is. Nothing here can block play.
 *
 * To switch it off: start the app with `--no-update`, or set LIGHTEN_NO_UPDATE=1.
 * APIs checked against electron@45.3.2 (electron.d.ts) and electron-updater@6.8.11 (AppUpdater.d.ts).
 */
const { app, dialog, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { RELEASES_API, canSelfInstall, newestUpdate } = require('./update-feed.cjs');

/** Wait this long after the window opens, so the check never slows the start. */
const CHECK_DELAY_MS = 3000;
/** Give up on GitHub's answer after this long. */
const CHECK_TIMEOUT_MS = 15000;
/** The log is cut back to its last part when it grows past this many bytes. */
const LOG_MAX_BYTES = 200_000;

/** One line into `update.log` in the app's data folder (and the console), for "why did it not update?". */
function log(line) {
  const text = `${new Date().toISOString()} ${typeof line === 'string' ? line : line?.message ?? String(line)}`;
  console.log(text);
  try {
    const file = path.join(app.getPath('userData'), 'update.log');
    if (fs.existsSync(file) && fs.statSync(file).size > LOG_MAX_BYTES) fs.writeFileSync(file, fs.readFileSync(file, 'utf8').slice(-LOG_MAX_BYTES / 2));
    fs.appendFileSync(file, text + '\n');
  } catch { /* A log that cannot be written must never stop the game. */ }
}

/** Why updates are off, or null when they are on. */
function updatesOff() {
  if (process.env.LIGHTEN_NO_UPDATE === '1' || process.argv.includes('--no-update')) return 'switched off by the player';
  if (!app.isPackaged) return 'this is not a packaged app';
  if (process.platform === 'linux' && !process.env.APPIMAGE) return 'on Linux only the AppImage can update itself';
  return null;
}

/** The update to move to, or null. LIGHTEN_UPDATE_FEED (tests only) names a download folder directly. */
async function findUpdate() {
  const testFeed = process.env.LIGHTEN_UPDATE_FEED;
  if (testFeed) return { version: 'from the test feed', tag: '', feedUrl: testFeed, pageUrl: testFeed, selfInstall: canSelfInstall(process.platform) };
  // Its own session: the default one belongs to the game window and refuses the network.
  const response = await session.fromPartition('lighten-update-check', { cache: false }).fetch(RELEASES_API, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
  return newestUpdate(await response.json(), process.platform, app.getVersion());
}

/** macOS: say that a new version exists and offer its page. Shown once per start. */
async function offerDownload(update, onStatus) {
  onStatus(`version ${update.version} is available`);
  const { response } = await dialog.showMessageBox({
    type: 'info',
    message: `Lighten Up ${update.version} is available`,
    detail: 'This Mac build cannot install updates by itself. Open the download page to get the new version.',
    buttons: ['Open the download page', 'Later'],
    defaultId: 0,
    cancelId: 1,
  });
  if (response === 0) await shell.openExternal(update.pageUrl);
}

/** Windows and Linux: download in the background, install when the game is closed. */
function selfInstall(update, onStatus, done) {
  const { autoUpdater } = require('electron-updater');
  autoUpdater.logger = { info: log, warn: log, error: log, debug: () => {} };
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  // A plain download folder: the release's own files (the channel file and the installer).
  autoUpdater.setFeedURL({ provider: 'generic', url: update.feedUrl });
  autoUpdater.on('update-not-available', () => done('the feed has nothing newer'));
  autoUpdater.on('update-downloaded', (event) => {
    onStatus(`update ${event.version} is ready and installs when you close the game`);
    done(`downloaded ${event.version}`);
  });
  autoUpdater.on('error', (error) => done(`updater error: ${error?.message ?? error}`));
  autoUpdater.checkForUpdates().catch((error) => done(`check failed: ${error?.message ?? error}`));
}

/**
 * Start the update check. `onStatus(text)` is called with a short note for the window title.
 * Returns at once; everything happens later and in the background.
 */
function startUpdates(onStatus) {
  let finished = false;
  const done = (outcome) => {
    if (finished) return;
    finished = true;
    log(`Update check finished: ${outcome}`);
    // Tests only: close the app once the check is over, so an install-on-quit can be observed.
    if (process.env.LIGHTEN_QUIT_AFTER_UPDATE_CHECK === '1') app.quit();
  };
  const off = updatesOff();
  if (off) { done(`updates are off (${off})`); return; }
  setTimeout(async () => {
    try {
      const update = await findUpdate();
      if (!update) return done(`version ${app.getVersion()} is the newest`);
      log(`Found ${update.version} at ${update.feedUrl}`);
      if (update.selfInstall) selfInstall(update, onStatus, done);
      else { await offerDownload(update, onStatus); done(`offered ${update.version} for download`); }
    } catch (error) {
      done(`could not check: ${error?.message ?? error}`);
    }
  }, CHECK_DELAY_MS);
}

module.exports = { startUpdates };
