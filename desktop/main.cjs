/**
 * Lighten Up (game-only) desktop app: Electron's main process. Packaging only: the game is the
 * unchanged Vite build, copied into ./dist by copy-game.cjs.
 *
 * Why an app:// scheme instead of file://: the game fetches some files by absolute paths
 * (/assets/...), which under file:// would point at the disk root. The scheme is registered as
 * standard and secure, and everything it serves comes from the packaged files.
 *
 * The game window never reaches the network: every request that is not the app's own scheme is
 * cancelled. The one thing that does use the network is the update check in updater.cjs, which
 * runs here in the main process, in its own session, and can be switched off (`--no-update`).
 * Based on the EEG game's wrapper (branch claude/baseline-exe), without its Bluetooth parts.
 * APIs checked against electron@45.3.2's electron.d.ts.
 */
const { app, BrowserWindow, net, protocol, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { startUpdates } = require('./updater.cjs');

const SCHEME = 'app';
const HOST = 'lighten';
const DIST = path.join(__dirname, 'dist');
const DIST_URL = pathToFileURL(DIST + path.sep).toString();
const TITLE = 'Lighten Up';
const ICON = path.join(__dirname, 'icons', 'icon.png');

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

/** Map app://lighten/<path> to a file inside dist/, refusing anything that escapes it. */
function serveFromDist(request) {
  const url = new URL(request.url);
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.normalize(path.join(DIST, relative));
  if (!file.startsWith(DIST + path.sep) && file !== DIST) return new Response('Not found', { status: 404 });
  return net.fetch(pathToFileURL(file).toString());
}

/** @type {BrowserWindow | null} */
let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 760, backgroundColor: '#05060a', title: `${TITLE} ${app.getVersion()}`, autoHideMenuBar: true,
    // The candle in its circle (drawn by tools/desktop/make-icon.ts). macOS takes the icon from the app bundle instead.
    icon: process.platform === 'darwin' ? undefined : ICON,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  mainWindow = win;
  win.on('closed', () => { mainWindow = null; });
  // The title belongs to the app (version, update notes), not to the page.
  win.on('page-title-updated', (event) => event.preventDefault());
  // Links never open inside the game window or reach the network.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (!url.startsWith(`${SCHEME}://`)) event.preventDefault(); });
  win.loadURL(`${SCHEME}://${HOST}/index.html`);
  if (process.env.LIGHTEN_SMOKE === '1') runSmokeCheck(win);
  return win;
}

/** Developer check (LIGHTEN_SMOKE=1): look at the loaded game from inside the page, print the result, quit. */
function runSmokeCheck(win) {
  const report = (result, code) => {
    console.log('SMOKE ' + JSON.stringify(result));
    if (process.env.LIGHTEN_SMOKE_OUT) fs.writeFileSync(process.env.LIGHTEN_SMOKE_OUT, JSON.stringify(result));
    app.exit(code);
  };
  win.webContents.on('did-fail-load', (_event, code, description, url) => report({ failed: { code, description, url } }, 1));
  win.webContents.once('did-finish-load', async () => {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const result = await win.webContents.executeJavaScript(`(async () => {
      const reach = async (url) => { try { const r = await fetch(url); return r.ok ? 'reached' : 'HTTP ' + r.status; } catch (e) { return 'blocked'; } };
      return {
        canvas: !!document.querySelector('canvas'),
        menu: (document.querySelector('.launch-screen')?.innerText ?? '').includes('PLAY'),
        secure: window.isSecureContext,
        ownFile: await reach('/index.html'),
        outside: await reach('https://example.com/'),
      };
    })()`);
    result.version = app.getVersion();
    report(result, result.canvas && result.menu && result.ownFile === 'reached' && result.outside === 'blocked' ? 0 : 1);
  });
}

// One window only: a second start brings the first one forward.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    protocol.handle(SCHEME, serveFromDist);
    // No runtime network for the game: anything that is not the app's own scheme is cancelled.
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      // file: is allowed only inside dist/, which is how the app:// handler reads the packaged files.
      const allowed = details.url.startsWith(`${SCHEME}://`) || details.url.startsWith(DIST_URL) || details.url.startsWith('devtools://') ||
        details.url.startsWith('data:') || details.url.startsWith('blob:');
      callback({ cancel: !allowed });
    });
    createWindow();
    startUpdates((note) => { if (mainWindow) mainWindow.setTitle(`${TITLE} ${app.getVersion()} (${note})`); });
  });

  app.on('window-all-closed', () => app.quit());
}
