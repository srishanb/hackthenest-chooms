---
name: ethos-check
description: "Check a Lighten Up diff, branch or pull request against the binding rules in AGENTS.md (the game's ethos) with concrete commands: composure framing (no 'emotion', no 'stress' in player text, no medical or therapeutic claims), the candle's composure never touching movement or physics, no network use on the demo path, no secrets or VITE_-prefixed keys, no generative-AI art, images or music and a CREDITS.md row with licence and human-made evidence for every new asset, none of the 'stays off' features, and no rewriting of git history. Use it before marking work ready, when reviewing someone else's change, when QA runs, or when asked 'does this break the rules', 'ethos check', 'is this allowed', 'check the assets'. These are the only two reasons besides a broken build that hold a pull request here. Not for type checks, tests or visual checks (npm run check, play-verify)."
---

# Ethos check: the binding rules as commands

A pull request in this repo is held for only two reasons (Decision D-22): it breaks something, or it
goes against the ethos, meaning the binding rules in `AGENTS.md` and rule one (never delete git history).
This skill turns the ethos half into checks you can run. Each check says **why** the rule exists, so
you can judge a case the grep does not cover. A grep hit is a question, not a verdict: read the line.

## Set up

Compare against the branch the work will merge into. New work goes to `game-only` (see `docs/GAME_ONLY.md`):

```bash
git fetch origin --prune
BASE=origin/game-only            # or origin/main for a change aimed at main
git diff --stat "$BASE"...HEAD   # what changed
ADDED() { git diff -U0 "$BASE"...HEAD -- "$@" | grep -E '^\+[^+]'; }   # only the added lines
```

Checking only **added lines** keeps the known, legitimate exceptions listed below from being
reported again on every change. Use the whole-tree form only for an audit.

## 1. Composure framing (AGENTS.md rule 1)

**Why:** the signal (on `main`, the candle's composure from play) is not a reading of the player's
mind. "Emotion", "stress" or a health claim would promise accuracy and meaning the game does not
have. The game-only edition adds that a candle mood is a reaction to the game, never a reading of the player.

```bash
ADDED src/ui src/content src/audio README.md docs/DEVPOST.md 'docs/releases/*.md' \
  | grep -niE '\b(emotion|emotional|stress|stressed|anxi|therap|mindful|meditat|diagnos|medical|wellness|heal(s|ing)?\b|mood of the player|your mood)'
```

- Player-facing text lives in `src/ui/strings.ts` (and narrator lines in `src/content/narrator/`);
  look there first.
- `stress` may appear in code only as an alias for tension, never in UI text, captions, README,
  release notes or Devpost copy.
- Known legitimate hits (negations, keep them): "not a medical device" in `README.md` and
  `docs/DEVPOST.md`; "not a medical or wellness tool" in `docs/releases/game-only-v*.md`; the
  header comment of `src/ui/strings.ts`; "never a medical or emotion metric" comments in
  `src/signal/`.
- Say openly that muscle activity is part of the EEG signal wherever the EEG signal is described.

## 2. Composure never touches controls or physics (rules 2 and 7)

**Why:** a player must be able to learn the controls; if a sensor or a mood could change jump
strength, every mistake would feel like the game cheating. Signal and composure change only
light, fog, music, fuel burn and the look of the forest.

```bash
npx vitest run src/shared/__tests__/lane-boundaries.test.ts   # fails if src/game/player imports
                                                              # contracts/composure, signal-api or signal-internal
ADDED src/game/player src/config/game.config.ts | grep -niE 'composure|signal|shaken|corruption|effects'
ADDED src/game | grep -nE '(gravity|jump(Strength|Speed|Velocity)?|friction|walkSpeed|airControl|maxSpeed)\w*\s*[*+-]?=.*(composure|shaken|signal|corruption|calm|tension)'
```

The second and third greps should print nothing. A hit means a composure or signal value feeds
movement: hold the change. Also read any new row in `src/config/effects.config.ts`: every effect needs
a cap, a smoothing time constant and a written never-rule.

## 3. Nothing on the demo path uses the network (rule 3)

**Why:** the demo runs with the Wi-Fi off, and the game must never depend on a server. Libraries
come from the lockfile, assets are files in the repo.

```bash
SRC=(src index.html ':!*.test.ts' ':!**/__tests__/**')   # tests may mention localhost URLs
ADDED "${SRC[@]}" | grep -nwE 'fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon'
ADDED "${SRC[@]}" | grep -nE "https?://|wss?://|import\(\s*['\"\`]https?:"
ADDED package.json   # a new runtime dependency is a shared-file change: say why in the PR
node tools/pipeline/build.mjs --fast   # builds dist/ and audits it: the page, styles and scripts load nothing from the internet
```

Known, legitimate exceptions (all checked on 16 Nov 2026):

| Where | What | Why it is allowed |
|---|---|---|
| `src/audio/loader.ts` | `fetch` of `assets/audio/...` | Same-origin, allowlisted local paths only |
| `src/signal/index.ts` | `fetch` of a recording | Same-origin `?source=replay` files |
| `src/ui/components/stage-editor/publish-layout.ts` | `fetch('./__stage-editor/publish')` | Dev-server-only authoring action (`tools/editor/server.ts`, `apply: 'serve'`) |
| `src/audio/*.ts`, `public/vendor/pieeg.js` | `https://` in comments | Documentation links, nothing is loaded |
| `src/ui/icons.ts` | `http://www.w3.org/2000/svg` | SVG namespace, not a request |
| `desktop/updater.cjs` | Asks GitHub for the release list once at start | The desktop app's update check, outside the game window, switchable off with `--no-update`; asked for by Srishan on 16 Nov 2026 (`docs/GAME_ONLY.md`, "Desktop app") |
| `desktop/main.cjs` | `net.fetch` of a local file; `LIGHTEN_SMOKE` test reaching `example.com` | Serving the packaged game; the smoke test expects the outside request to be **blocked** |
| `tools/narrator/build.mjs` | ElevenLabs API | Dev time, makes narrator clips that are then committed as files |
| `scripts/`, `.mcp.json` | Git, npm and MCP servers | Developer tools, never part of the game |

Anything new outside this table needs a reason in the PR body and the owner's agreement.

## 4. Secrets (rule 4)

**Why:** a committed key is public forever (history is never rewritten here), and Vite ships every
`VITE_`-prefixed variable to the browser.

```bash
git diff --name-only "$BASE"...HEAD | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example$'   # must print nothing
ADDED . | grep -nE 'import\.meta\.env\.VITE_|VITE_[A-Z_]*(KEY|TOKEN|SECRET)'
ADDED . | grep -nE 'sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|xox[abp]-|-----BEGIN [A-Z ]*PRIVATE KEY|(api[_-]?key|token|secret|password)["'\'' ]*[:=] *["'\''][A-Za-z0-9_\-]{16,}'
```

Known legitimate hits: the `VITE_` warnings in `vite.config.ts`, `.env.example`, `AGENTS.md` and
docs; `'xi-api-key': secret` in `tools/narrator/build.mjs` (a header name, the value is read from
`.env.local`). If a real key was committed, **stop and tell Srishan**: the fix is revoking the key,
never rewriting history.

## 5. Art, images and music (rule 5, Decision D-29)

**Why:** the team uses only human-made work, credited, with proof. No generative AI is used to make,
extend, upscale, recolour or clean up art, images, textures, sprites, models or music, and no asset
made with it is imported. The single exception is narrator speech made with ElevenLabs, with a stock
or designed voice, never a clone or imitation of a real person.

```bash
git diff --name-only --diff-filter=A "$BASE"...HEAD -- public/assets src/ui/theme/fonts desktop/icons
```

For every new file listed:

1. `CREDITS.md` names it (by path, file name or its pack's folder) with author, licence and source.
2. The licence evidence exists: a file under `public/assets/licenses/` or `docs/licenses/`, or the
   item page cited in `public/assets/licenses/source-evidence.md`.
3. Human-made evidence is recorded: the page's no-AI disclosure, the author's statement, or a
   publish date before mid-2022. **No evidence, no import.**
4. Art drawn by code (the candle, `desktop/icons/icon.png` from `tools/desktop/make-icon.ts`) needs
   no CREDITS row, but the PR must say it is drawn by code.
5. A new narrator clip under `public/assets/audio/` must come from `tools/narrator/` (ElevenLabs,
   stock or designed voice). Any other generated audio is not allowed.

Tests already pin some rows (`src/game/__tests__/wildlife.test.ts`, `tools/audio/tense-scaling.test.ts`).
Words to look for in PR text, commit messages and asset notes: `midjourney`, `stable diffusion`,
`dall-e`, `firefly`, `suno`, `udio`, `generated with`, `AI upscale`.

## 6. Things that stay off (rule 7, `docs/PLAN.md` "Considered, not scheduled")

**Why:** each would turn an uncertain reading into a judgment of the player.

- A narrator that judges the player or grows cruel: read every new line in `src/content/narrator/`
  and `src/ui/strings.ts`. A line may react to what happened in the game, never to who the player is.
- A percentage, ranking or leaderboard of composure:
  `ADDED src | grep -niE 'leaderboard|rank|percent|score' ` and read each hit. Known legitimate:
  the fuel percentage in the HUD (`src/ui/components/hud/hud.ts`, fuel is a game resource), the
  personal best height ("a personal record, never a ranking", `src/shared/contracts/game-state.ts`),
  and the EEG signal-quality percentage (`qualityPercent` in `src/ui/components/hud/hud-state.ts`, a property of the board's signal, not of the player).
- Therapeutic or training claims: covered by the words in check 1.

## 7. Git history is never rewritten (rule one)

**Why:** history is the team's audit trail. Hooks, a workflow and a watcher enforce it; the check
here is that nothing tries to weaken them.

```bash
git diff --name-only "$BASE"...HEAD -- .githooks scripts/hooks .claude/settings.json .codex .agents .github/workflows/history-guard.yml
git merge-base --is-ancestor "origin/$(git branch --show-current)" HEAD 2>/dev/null && echo "branch only moves forward" || echo "no remote branch yet, or it would need a force push"
```

A change to the guard files needs Srishan's merge, so flag it. Never suggest `--force`, a rebase,
`--no-verify` or deleting a branch as a fix; a rejected push is fixed by `git fetch` and `git merge`.

## Report

Write one line per check: **pass**, **hold** (with file:line, the rule and the evidence) or
**not checked** (and why). Only a hold on checks 1 to 7 or a failing `npm run check` / `npm run build`
should stop a merge; everything else is advice.
