---
name: play-verify
description: "Run the real Lighten Up game in headless Chromium and look at it: start a dev server, take screenshots at chosen seconds (optionally with the route bot climbing), read the dev readout (frame rate, height, fuel, shaken, corruption, ledge and object counts) and catch console or page errors; or screenshot a dev gallery page (candle faces, close-ups, portraits, backdrop). Use it whenever a change touches what the game draws, how it moves or how fast it runs, to confirm a fix in the real page rather than only in tests, to compare frame rate before and after, or when asked to 'play it', 'take a screenshot', 'smoke test', 'check it renders', 'check the fps'. Not for unit tests (npm run check) or for frame-level WebGL inspection (use the webgl-inspection tool role)."
---

# Play and verify the game in a headless browser

Type checks and unit tests do not show whether the game draws, starts, or keeps its frame rate.
This skill runs the real page and gives you pictures and numbers. Read the screenshots: a black
canvas, a missing HUD or a frozen candle is a failure even when every test passes.

## 1. Start a dev server (and stop it afterwards)

The port comes from `PORT` in the worktree's `.env.local` (`scripts/wt.sh new` writes one per
worktree; `vite.config.ts` reads it, default 5173, `strictPort` so a busy port fails instead of moving).
Without `.env.local`, pick a free port yourself:

```bash
npx vite --port 5288 --strictPort > /tmp/vite.log 2>&1 &   # or: npm run dev, which uses .env.local
```

Wait until `curl -s -o /dev/null http://localhost:<port>/` succeeds. **Always stop the server when
you are done** (`kill <pid>`, or `pkill -f "vite --port <port>"`), even after a failure: AGENTS.md
forbids leaving long-running servers behind, and a stale server on the port makes the next run fail.

## 2. Smoke run of the game

```bash
node .claude/skills/play-verify/scripts/smoke.cjs --port 5288 --query "?bot=1&seed=42" --seconds 3,10 --name before
```

It opens the page at 1280×720 with `deviceScaleFactor` 1, waits for `#game canvas`, saves
`<name>-menu.png`, presses Enter to start a run, then at each second mark saves `<name>-<t>s.png`
and prints one line: the UI phase (`#ui` `data-phase`: menu, playing, paused, finished...) and the
game canvas's `dataset`. Errors from the console and the page come last. Exit code 1 means no canvas
or a page error. Screenshots go to `--out`, else `PLAY_VERIFY_OUT`, else `_agents_workspace/shots/`
(ignored by git). `--no-start` stays on the menu. Then **read the screenshots** with the Read tool.

The dev readout (development builds only, written every frame for automated checks, never read by the game):

| Key | Meaning | Written by |
|---|---|---|
| `forestFps` | Phaser's measured frame rate (`game.loop.actualFps`) | `src/game/forest/forest-world.ts` |
| `forestCorruption` | How corrupted the forest looks, 0 to 1 | same |
| `endlessHeightPx`, `endlessFuel`, `endlessShaken`, `endlessCorruption` | Height climbed, candle fuel, how shaken the candle is, corruption | `src/game/scenes/endless-scene.ts` |
| `endlessLedges`, `endlessObjects`, `endlessSeed`, `endlessMover` | Live ledges, scene objects, the run's seed, the first moving ledge on screen | same |

A production build (`npm run build`, `vite preview`) strips this readout (`import.meta.env.DEV` is
false), and the dev-only URL switches below do nothing there. Use the dev server for checks; use a
production build only to confirm the built game loads.

## 3. URL switches (from `docs/GAME_ONLY.md` and `src/main.ts`)

| Query | Effect | Dev only |
|---|---|---|
| `?seed=1234` | One particular endless climb; the same number gives the same ledges | no |
| `?climb=classic` | The authored five-stage climb | no |
| `?bot=1` | A bot climbs along the generator's route; never saves a best height | yes |
| `?startChunk=4` | Start higher up (0 to 500); never saves a best height | yes |
| `?candleSeed=7` | Pick the candle | yes |
| `?fuel=0.05` | First run starts nearly out of fuel | yes |
| `?shaken=0.9` | First run starts with a shaken candle | yes |

Combine them: `?bot=1&seed=42&startChunk=10` shows the night-time view with a moving climb.

## 4. Gallery pages

```bash
node .claude/skills/play-verify/scripts/gallery.cjs --port 5288 --page src/game/__tests__/candle-faces.html
```

It waits for `window.galleryReady === true`, prints `#note` if the page has one, and saves a
full-page `<name>.png` (default viewport 1920×580; `--query` passes the page's own switches).
Galleries in `src/game/__tests__/`: `candle-faces.html` (every mood on the hero),
`candle-close-up.html` (the portrait close-up), `candle-gallery.html`, `portrait-gallery.html`,
and on branches that have the generated backdrop, `backdrop-gallery.html`
(`?seed=`, `?heights=0,3.5,7`, `?zoom=2`, `?layer=1`). List the folder to see what exists on yours.

## 5. Comparing before and after fairly

Headless Chromium here renders WebGL in software, so its frame rate (about 20 to 30 fps for the
endless climb) says nothing about a player's machine. It is only useful **compared with itself**:

1. Same build mode (dev server both times), same port, same viewport, same query (fix `seed`,
   `candleSeed` and `startChunk`; `bot=1` makes the movement repeatable), same second marks.
2. Run each side at least twice and compare ranges, not one number; the first run after a server
   start is slower while Vite compiles.
3. Nothing else heavy running at the same time (one browser at a time).
4. Report `forestFps` and `endlessObjects` from both sides, with the screenshots.

## 6. Where Playwright comes from

Playwright is not in `package.json`, on purpose (it is a dev tool, not a game dependency). The cloud
environment has it installed globally (`npm root -g`, version 1.63 at the time of writing) with
Chromium under `/opt/pw-browsers`; the scripts load it from there. `deviceScaleFactor` is 1 because
these screenshots are for agents: a 2× image costs four times the context for no extra information.

### Without Playwright

On a machine without it, either install it outside the repo (`npm install -g playwright` and
`npx playwright install chromium`, never into `package.json` without the integrator), or use the
`perf-profiling` tool role from `.claude/skills/lighten-up-orchestrator/references/tools.md` (Chrome
DevTools MCP: `new_page`, `take_screenshot`, `evaluate_script` reading
`document.querySelector('#game canvas').dataset`). If neither is available, say plainly that the
visual check was not done.
