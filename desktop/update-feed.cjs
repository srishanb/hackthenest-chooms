/**
 * Which release should this app update to? Pure functions, no Electron and no network.
 *
 * Why this exists: the repository holds releases of two games. The EEG game's releases have tags
 * like `demo-ready`; this app's are `game-only-v<version>`. The updater library's own GitHub
 * lookup would pick whichever release the repository marks as "Latest", which is the EEG game.
 * So the app reads the list of releases itself, keeps only its own, and hands the newest one to
 * the updater as a plain download folder (a "generic" feed).
 */

/** The GitHub repository whose releases carry this app. */
const REPO = 'srishanb/lighten-up';
/** Releases of this app are tagged with this prefix followed by the version. */
const TAG_PREFIX = 'game-only-v';
/** The public list of releases (newest first). No sign-in is needed for a public repository. */
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases?per_page=100`;

/** "1.2.3" becomes [1, 2, 3]; anything else (including pre-release suffixes) is null. */
function parseVersion(text) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(text ?? '').trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** Negative when `a` is older than `b`, 0 when equal, positive when newer. */
function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

/**
 * The file the updater library reads to learn about a version, per platform. The packager writes
 * these names (electron-builder: latest.yml, latest-mac.yml, latest-linux.yml).
 */
function channelFile(platform) {
  if (platform === 'win32') return 'latest.yml';
  if (platform === 'darwin') return 'latest-mac.yml';
  return 'latest-linux.yml';
}

/**
 * True when this platform can install an update by itself. macOS only installs updates for apps
 * signed with an Apple Developer ID, and this app is not, so on a Mac it can only point at the download.
 */
function canSelfInstall(platform) {
  return platform === 'win32' || platform === 'linux';
}

/** Does this release carry something for `platform`? */
function hasBuildFor(release, platform) {
  const names = (Array.isArray(release.assets) ? release.assets : []).map((asset) => String(asset?.name ?? ''));
  if (canSelfInstall(platform)) return names.includes(channelFile(platform));
  if (platform === 'darwin') return names.some((name) => name.toLowerCase().endsWith('.dmg'));
  return false;
}

/**
 * The newest release of this app that is newer than `currentVersion` and has a build for `platform`,
 * or null when there is none (or the list is not what GitHub normally sends).
 *
 * `releases` is the parsed JSON of RELEASES_API. Drafts are skipped. The "pre-release" mark is
 * ignored on purpose: every release of this app carries it, so that none of them replaces the
 * EEG game as the repository's latest release.
 */
function newestUpdate(releases, platform, currentVersion) {
  const current = parseVersion(currentVersion);
  if (!Array.isArray(releases) || !current) return null;
  let best = null;
  for (const release of releases) {
    if (!release || release.draft || typeof release.tag_name !== 'string' || !release.tag_name.startsWith(TAG_PREFIX)) continue;
    const version = parseVersion(release.tag_name.slice(TAG_PREFIX.length));
    if (!version || compareVersions(version, current) <= 0 || !hasBuildFor(release, platform)) continue;
    if (!best || compareVersions(version, best.parts) > 0) best = { parts: version, tag: release.tag_name };
  }
  if (!best) return null;
  return {
    version: best.parts.join('.'),
    tag: best.tag,
    /** The folder the updater library downloads from: it holds the channel file and the installer. */
    feedUrl: `https://github.com/${REPO}/releases/download/${best.tag}`,
    /** The page a person can open to download by hand. */
    pageUrl: `https://github.com/${REPO}/releases/tag/${best.tag}`,
    selfInstall: canSelfInstall(platform),
  };
}

module.exports = { REPO, TAG_PREFIX, RELEASES_API, parseVersion, compareVersions, channelFile, canSelfInstall, newestUpdate };
