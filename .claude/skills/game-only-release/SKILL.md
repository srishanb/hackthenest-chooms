---
name: game-only-release
description: "Cut, publish and check a release of the Lighten Up game-only desktop app (Windows, Linux, macOS), and answer how to code-sign it. Covers the release notes file in docs/releases/, the desktop/package.json version, the release-game-only workflow (tag, pre-release, installers, the self-update check), the rehearsal run, how installed apps update, what to check afterwards, and signing (Windows via Azure Trusted Signing or a certificate, macOS via an Apple Developer ID and notarisation, and the GitHub secrets each needs). Use it whenever someone says release, ship a new version, publish, cut v0.x, bump the version, update the desktop app, installers, auto-update, sign, signing, SmartScreen, Gatekeeper or notarise. Not for building or testing the web game itself (npm run build, play-verify)."
---

# Releasing the game-only desktop app

The game-only edition ships as a GitHub **pre-release** with the zipped web game and desktop
installers. A release is not built by hand: a person adds a **notes file**, and the workflow
`.github/workflows/release-game-only.yml` does the rest. Sources for everything here:
`docs/GAME_ONLY.md` ("Desktop app", "Releases"), `desktop/README.md`, the workflow file, and the
earlier notes in `docs/releases/`.

## What the workflow does

It runs on pushes to the `game-only` branch that touch `docs/releases/game-only-v*.md`,
`.github/workflows/release-game-only.yml` or `desktop/**` (never on `main`, whose copy of the
file is inert).

1. **web:** finds the lowest-numbered notes file with no release yet (`sort -V`; one release per run),
   builds the game, creates the tag `game-only-v<version>` at that commit and publishes a pre-release
   with `lighten-up-game-only-v<version>.zip` and the notes file as its text.
2. **desktop:** on Windows, Linux and macOS, wraps that same zip in the Electron app with
   `npm run dist -- -c.extraMetadata.version=<version>` and attaches the installers (`.exe`,
   `.exe.blockmap`, `.AppImage`, two `.dmg`), then the updater's channel files (`latest*.yml`) last,
   so an installed app never sees a release whose installer is still uploading. On Linux it also starts
   the packaged app once (`LIGHTEN_SMOKE=1`).
3. **verify:** builds an older Linux copy (version 0.0.1) and requires it to update itself to the new
   release, first through the app's own GitHub lookup, then (if GitHub's request limit refused it)
   straight from the release's download folder; and checks that the app's own release picker
   (`desktop/update-feed.cjs`) chooses this tag for win32, linux and darwin.

A release that already exists is left alone: editing an old notes file changes nothing.
**Tags are never moved or deleted** (AGENTS.md rule one): a fix is a new version with its own notes file.

**Rehearsal:** when the workflow file or `desktop/` changes and no notes file is waiting, the desktop
job still packages the app on all three systems as version 0.0.0 and attaches nothing. Use it to prove a
workflow or app change works before spending a version number on it.

## Cut a release

Work in your own worktree on a branch from `game-only`: `BASE_BRANCH=game-only scripts/wt.sh new <agent> <task>`
(and `BASE_BRANCH=game-only scripts/wt.sh sync` later, which merges; never rebase).

1. **Pick the version.** Next patch or minor after the newest `docs/releases/game-only-v*.md`
   (`gh release list` shows what exists). Never reuse a number.
2. **Raise `"version"` in `desktop/package.json`** to the same number. The workflow does not read it (the
   tag sets the version through `extraMetadata`), but local `npm run dist` builds take their name from it,
   and keeping it equal to the latest release avoids confusion.
3. **Write `docs/releases/game-only-v<version>.md`** in the shape of the earlier ones (read
   `game-only-v0.2.1.md`): what is new in plain words; "Getting it" (Windows and Linux update by
   themselves, macOS downloads the `.dmg`, new installs); the download table with the exact file names
   (`Lighten-Up-Game-Only-Setup-<v>.exe`, `Lighten-Up-Game-Only-<v>.AppImage`,
   `Lighten-Up-Game-Only-<v>-arm64.dmg`, `Lighten-Up-Game-Only-<v>-x64.dmg`,
   `lighten-up-game-only-v<v>.zip`) and the first-start warnings while the builds are unsigned;
   "State of this build" (what was verified, and honestly what was not); and the closing line that it is
   a game, not a medical or wellness tool, with no health claims. Run the `ethos-check` skill on it.
4. `npm run check` and `npm run build` pass.
5. Commit (`chore(release): game-only v<version>`), push your branch with its name, open a pull request
   **into `game-only`**. The release starts when the notes file lands on `game-only`.
6. To bring it to `main`: a pull request from `game-only` into `main` (the repo allows squash merges only);
   after it merges, merge `origin/main` back into `game-only` so the two do not drift.

## After the release: check it

```bash
gh run list --workflow release-game-only.yml --limit 3      # all three jobs green?
gh run view <run-id> --log-failed                           # if not
gh release view game-only-v<version>                        # pre-release, notes, assets
```

- Assets: the zip, `.exe` and `.exe.blockmap`, `.AppImage`, both `.dmg`, and the channel files
  (`latest.yml` for Windows, `latest-linux.yml` for Linux).
- The verify job said "Updated through the app's own lookup" or "Updated from the release's folder".
- It is marked pre-release, so the EEG game's release stays "Latest".
- Not checked by the workflow, and worth saying so in the notes: the Windows installer and update on a
  real Windows machine, the macOS build on a Mac, and any of it by a person.

## How installed apps update

The app asks GitHub for this repository's releases a few seconds after start (the only network use,
outside the game window; `--no-update` or `LIGHTEN_NO_UPDATE=1` switches it off) and keeps only
`game-only-v*` releases newer than itself with a build for its system.

- **Windows and Linux (AppImage):** downloaded in the background, installed when the game closes; the
  window title says when one is ready.
- **macOS:** announces the new version and offers the download page. It cannot replace itself while
  unsigned (see Signing).
- `update.log` in the app's data folder records what happened. `desktop/README.md` ("Test hooks")
  shows how to test an update locally without publishing (`LIGHTEN_UPDATE_FEED`).

## Signing

Today nothing is signed (`desktop/README.md`, "Not signed"): Windows SmartScreen and macOS Gatekeeper
warn on first start, and macOS cannot update itself. Signing needs paid accounts that only the owner can
open. Option and variable names below were checked against the pinned **electron-builder 26.18.0**
(`desktop/node_modules/app-builder-lib/out/options/winOptions.d.ts`, `macOptions.d.ts`, and its
`process.env` reads); anything else is marked unverified.

### Windows, choice A: Azure Trusted Signing

The owner creates a Trusted Signing account and certificate profile in Azure, and an Entra ID app
registration allowed to sign with it. Then in `desktop/package.json`, under `build.win`:

```json
"azureSignOptions": {
  "publisherName": "<exact publisher name on the certificate>",
  "endpoint": "https://<region>.codesigning.azure.net/",
  "certificateProfileName": "<profile>",
  "codeSigningAccountName": "<account>"
}
```

`publisherName`, `endpoint`, `certificateProfileName` and `codeSigningAccountName` are required fields
of `WindowsAzureSigningConfiguration`; `fileDigest`, `timestampRfc3161` and `timestampDigest` are optional.
electron-builder installs the `TrustedSigning` PowerShell module and runs `Invoke-TrustedSigning` on the
Windows runner. It authenticates through Microsoft's `EnvironmentCredential`, which reads
`AZURE_TENANT_ID`, `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` (these names come from Microsoft's
documentation that electron-builder links to, not from the pinned source: **unverified here**). The
endpoint URL format and Azure's eligibility rules are also **unverified here**; take them from the Azure portal.

### Windows, choice B: a code-signing certificate (`.pfx`)

Read from the environment by electron-builder: `WIN_CSC_LINK` (or `CSC_LINK`) and `WIN_CSC_KEY_PASSWORD`
(or `CSC_KEY_PASSWORD`). `CSC_LINK` may be an `https://` URL, the file's base64 text, or a file path.
`signtoolOptions` in `build.win` holds the rest (`certificateSubjectName`, `certificateSha1`,
`publisherName`, timestamp servers). Do not use `signtoolOptions` and `azureSignOptions` together. Many
certificate vendors now deliver keys only on hardware tokens or in cloud HSMs, which a GitHub runner
cannot use with a `.pfx`; check the vendor before buying (**unverified here**).

**Windows update check:** once signed, `publisherName` is written into the app's update config and
`verifyUpdateCodeSignature` (default `true`) makes every later update prove the same publisher. Apps
installed unsigned have no publisher name and accept the first signed update (checked in
`electron-updater`'s `NsisUpdater.verifySignature`). Never change the publisher name afterwards, or
signed installs stop updating.

### macOS: Apple Developer ID and notarisation

Needs a paid Apple Developer Program membership and a "Developer ID Application" certificate exported as
`.p12`.

- Signing: `CSC_LINK` (the `.p12` as base64, URL or path) and `CSC_KEY_PASSWORD`. In `build.mac`, remove
  `"identity": "-"` (which forces ad-hoc signing) and `"hardenedRuntime": false`.
- Notarisation: set `"notarize": true` in `build.mac` and one of these sets, as `macOptions.d.ts` lists them:
  1. `APPLE_API_KEY` (file path to the App Store Connect `.p8` key), `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`
     (recommended by electron-builder);
  2. `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`;
  3. `APPLE_KEYCHAIN`, `APPLE_KEYCHAIN_PROFILE`.
- Self-update on macOS also needs a `zip` target next to `dmg` in `build.mac.target` (electron-updater's
  `MacUpdater` stops with `ERR_UPDATER_ZIP_FILE_NOT_FOUND` without one), the workflow's attach step to
  upload `*.zip` and `latest-mac.yml`, and `canSelfInstall` in `desktop/update-feed.cjs` plus
  `desktop/updater.cjs` to allow `darwin`. That is a code change in `desktop/`: plan it, test it in a rehearsal.

### Wiring secrets into the workflow

Store each value as a GitHub Actions secret (repository Settings, Secrets and variables, Actions; the owner
does this). In the "Package the app" step of the `desktop` job, pass them as `env:`, for example
`CSC_LINK: ${{ secrets.MAC_CERT_P12_BASE64 }}` on macOS only (`if: runner.os == 'macOS'` or a per-OS
step). The secret names are free to choose; the environment variable names on the left are fixed by
electron-builder. For the API-key route, write the `.p8` secret to a file in the step and set
`APPLE_API_KEY` to that path. Never put a key in `desktop/package.json`, the workflow file or a notes file
(AGENTS.md rule 4), and a signing change is a change to `.github/` and `desktop/`: integrator review.
