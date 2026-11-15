/** Loopback-only Vite authoring endpoint. Credentials stay in gh; gameplay never calls GitHub. */
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import type { IncomingHttpHeaders } from 'node:http';
import type { Plugin } from 'vite';
import { DEFAULT_SECTIONS } from '../../src/content/sections/defaults';
import { validateLayouts } from '../../src/game/editor/layouts';
import { githubRunner, LAYOUT_FILE, publishLayouts } from './publish';
export const PUBLISH_PATH = '/__stage-editor/publish';
export function isLocalRequest(req: { headers: IncomingHttpHeaders; socket: { remoteAddress?: string } }): boolean {
  try {
    const host = new URL(`http://${req.headers.host}`);
    return ['localhost', '127.0.0.1', '[::1]'].includes(host.hostname) &&
      ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') &&
      req.headers.origin === host.origin;
  } catch { return false; }
}
export async function readBody(req: AsyncIterable<Uint8Array | string>): Promise<unknown> {
  let bytes = 0; const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk); bytes += buffer.length;
    if (bytes > 1_000_000) throw new Error('Layout exceeds the 1 MB limit.');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function stagePublisher(): Plugin {
  return { name: 'stage-editor-publisher', apply: 'serve', configureServer(server) {
    const token = randomUUID(); let busy = false;
    const root = server.config.root;
    const expectedBlob = execFileSync('git', ['hash-object', LAYOUT_FILE], { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
    const run = githubRunner(root);
    server.middlewares.use(PUBLISH_PATH, (req, res) => {
      const reply = (code: number, body: unknown) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };
      // GET has no side effects. The browser's same-origin policy protects this token.
      if (req.method === 'GET') {
        const local = isLocalRequest({ headers: { ...req.headers, origin: `http://${req.headers.host}` }, socket: req.socket });
        reply(local ? 200 : 403, local ? { token } : { error: 'Open the editor on localhost.' }); return;
      }
      if (req.method !== 'POST') { reply(405, { error: 'Method not allowed.' }); return; }
      if (!isLocalRequest(req) || req.headers['x-stage-editor-token'] !== token || req.headers['content-type'] !== 'application/json') {
        reply(403, { error: 'Open the editor on localhost and reload before publishing.' }); return;
      }
      if (busy) { reply(409, { error: 'Another layout is publishing. Wait for it to finish.' }); return; }
      busy = true;
      void (async () => {
        let stages;
        try { stages = validateLayouts(await readBody(req), DEFAULT_SECTIONS); }
        catch { reply(400, { error: 'Invalid layout. Check platform geometry, stage order, and final ledges.' }); return; }
        try { reply(200, { url: await publishLayouts(stages, expectedBlob, run, randomUUID()) }); }
        catch (error) {
          const message = error instanceof Error && /^(The team layout changed|This layout is already published)/.test(error.message)
            ? error.message : 'GitHub publication failed. Check gh auth status and repository write access, then retry. No success has been recorded; a branch or PR may exist if the connection failed midway.';
          reply(409, { error: message });
        }
      })().catch(() => { if (!res.writableEnded) reply(500, { error: 'Could not publish the layout.' }); }).finally(() => { busy = false; });
    });
  } };
}
