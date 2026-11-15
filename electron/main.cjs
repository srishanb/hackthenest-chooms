/**
 * Lighten Up desktop app (Electron main process). Packaging only: the game itself is the
 * unchanged Vite build in dist/.
 *
 * Why an app:// scheme instead of file://: the game fetches recordings and art by absolute
 * paths (/recordings/..., /assets/...), which under file:// would point at the disk root. The
 * scheme is registered as standard + secure, so it is also a secure context, which Web
 * Bluetooth requires. Everything is served from the packaged files; nothing uses the network.
 *
 * Web Bluetooth (the PiEEG Octopus 16): navigator.bluetooth.requestDevice() in the page
 * fires 'select-bluetooth-device' here, repeatedly while scanning. Without a handler Electron
 * cancels every request. We collect devices for a few seconds: one board found is picked,
 * several open a chooser, none (or Cancel) cancels the request so the page gets a readable
 * error. The request itself still starts from the player's click on "Connect Octopus 16".
 * APIs checked against electron@45.3.2's electron.d.ts.
 */
const { app, BrowserWindow, dialog, net, protocol, session } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const SCHEME = 'app';
const HOST = 'lighten';
const DIST = path.join(__dirname, '..', 'dist');
const DIST_URL = pathToFileURL(DIST + path.sep).toString();
/** Scan this long before choosing, so several nearby boards can all show up. */
const SCAN_MS = 4000;
/** Give up if no board appears at all. */
const GIVE_UP_MS = 20000;

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

/** One Bluetooth request at a time: collect devices, then pick, ask, or cancel. */
function handleBluetooth(win) {
  let pending = null;
  win.webContents.on('select-bluetooth-device', (event, devices, callback) => {
    event.preventDefault();
    if (!pending) {
      pending = { callback, devices: [], started: Date.now(), timer: null, done: false };
      const finish = async () => {
        const request = pending;
        if (!request || request.done) return;
        if (request.devices.length === 0 && Date.now() - request.started < GIVE_UP_MS) {
          request.timer = setTimeout(finish, 1000);
          return;
        }
        request.done = true;
        pending = null;
        if (request.devices.length === 0) return request.callback('');
        if (request.devices.length === 1) return request.callback(request.devices[0].deviceId);
        const names = request.devices.map((d) => d.deviceName || d.deviceId);
        const { response } = await dialog.showMessageBox(win, {
          type: 'question', title: 'Choose your board', message: 'Several boards are nearby. Which one is yours?',
          buttons: [...names, 'Cancel'], cancelId: names.length, noLink: true,
        });
        request.callback(response < names.length ? request.devices[response].deviceId : '');
      };
      pending.timer = setTimeout(finish, SCAN_MS);
    }
    pending.callback = callback;
    pending.devices = devices;
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 760, backgroundColor: '#05060a', title: 'Lighten Up', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  handleBluetooth(win);
  // Links never open inside the game window or reach the network.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (!url.startsWith(`${SCHEME}://`)) event.preventDefault(); });
  const query = process.env.LIGHTEN_SMOKE_QUERY || '';
  win.loadURL(`${SCHEME}://${HOST}/index.html${query}`);
  if (process.env.LIGHTEN_SMOKE) runSmokeCheck(win);
}

/** Developer check (LIGHTEN_SMOKE=1): exercise the packaged paths from inside the page, print, quit. */
function runSmokeCheck(win) {
  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    if (process.env.LIGHTEN_SMOKE_OUT) require('node:fs').writeFileSync(process.env.LIGHTEN_SMOKE_OUT, JSON.stringify({ failed: { code, desc, url } }));
  });
  win.webContents.once('did-finish-load', async () => {
    await new Promise((r) => setTimeout(r, 4000));
    const result = await win.webContents.executeJavaScript(`(async () => {
      const ok = async (u) => { try { const r = await fetch(u); return r.ok ? (await r.arrayBuffer()).byteLength : 'HTTP ' + r.status; } catch (e) { return 'ERR ' + e.message; } };
      await document.fonts.ready;
      return {
        title: document.title, secure: window.isSecureContext, canvas: !!document.querySelector('canvas'),
        bluetooth: typeof navigator.bluetooth?.requestDevice,
        badge: document.querySelector('[data-component="source-badge"]')?.innerText,
        presetsManifest: await ok('/recordings/presets/manifest.json'),
        presetFile: await ok('recordings/presets/calm-climb.jsonl'),
        narratorMp3: await ok(${JSON.stringify('/' + (process.env.LIGHTEN_SMOKE_MP3 || ''))}),
        fontsLoaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
        external: await ok('https://example.com/'),
      };
    })()`);
    console.log('SMOKE ' + JSON.stringify(result));
    if (process.env.LIGHTEN_SMOKE_OUT) require('node:fs').writeFileSync(process.env.LIGHTEN_SMOKE_OUT, JSON.stringify(result));
    app.quit();
  });
}

app.whenReady().then(() => {
  protocol.handle(SCHEME, serveFromDist);
  const ses = session.defaultSession;
  // Only the game's own pages may use Bluetooth; everything else is refused.
  ses.setPermissionCheckHandler((_wc, permission, origin) => permission !== 'bluetooth' || origin.startsWith(`${SCHEME}://`));
  // Windows may ask to pair: confirm simple pairing; a PIN prompt is declined (the board needs none).
  ses.setBluetoothPairingHandler((details, callback) => {
    callback(details.pairingKind === 'confirm' ? { confirmed: true } : { confirmed: false });
  });
  // No runtime network: anything that is not the app's own scheme or a devtools URL is blocked.
  ses.webRequest.onBeforeRequest((details, callback) => {
    // file: is allowed only inside dist/, which is how the app:// handler reads the packaged files.
    const allowed = details.url.startsWith(`${SCHEME}://`) || details.url.startsWith(DIST_URL) || details.url.startsWith('devtools://') ||
      details.url.startsWith('data:') || details.url.startsWith('blob:');
    callback({ cancel: !allowed });
  });
  createWindow();
});

app.on('window-all-closed', () => app.quit());
