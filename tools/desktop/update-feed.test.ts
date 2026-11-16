/** The desktop app's update choice: only its own releases, only newer ones, only ones with a build for this platform. */
import { describe, expect, it } from 'vitest';
import { RELEASES_API, TAG_PREFIX, canSelfInstall, channelFile, compareVersions, newestUpdate, parseVersion } from '../../desktop/update-feed.cjs';

/** A release as GitHub's API lists it (only the fields the app reads). */
const release = (tag: string, assets: string[], extra: Record<string, unknown> = {}) =>
  ({ tag_name: tag, draft: false, prerelease: true, assets: assets.map((name) => ({ name })), ...extra });
const WIN = ['Lighten-Up-Game-Only-Setup-0.3.0.exe', 'latest.yml'];
const LINUX = ['Lighten-Up-Game-Only-0.3.0.AppImage', 'latest-linux.yml'];
const MAC = ['Lighten-Up-Game-Only-0.3.0-arm64.dmg'];

describe('versions', () => {
  it('reads plain x.y.z and nothing else', () => {
    expect(parseVersion('1.20.3')).toEqual([1, 20, 3]);
    expect(parseVersion(' 0.2.0 ')).toEqual([0, 2, 0]);
    for (const bad of ['1.2', '1.2.3-beta', 'v1.2.3', '', 'latest', null, undefined, '1.2.3.4']) expect(parseVersion(bad)).toBeNull();
  });
  it('compares by number, not by text', () => {
    expect(compareVersions([0, 10, 0], [0, 9, 9])).toBeGreaterThan(0);
    expect(compareVersions([1, 0, 0], [1, 0, 0])).toBe(0);
    expect(compareVersions([0, 2, 0], [0, 2, 1])).toBeLessThan(0);
  });
});

describe('which release to update to', () => {
  it('ignores the other game\'s releases, older versions and drafts', () => {
    const list = [
      release('demo-ready', ['lighten-up-final.zip'], { prerelease: false }),
      release('v0.1.0-alpha', ['Lighten-Up-Setup-0.1.0-alpha-x64.exe', 'latest.yml']),
      release(`${TAG_PREFIX}0.1.0`, ['lighten-up-game-only-v0.1.0.zip']),
      release(`${TAG_PREFIX}0.2.0`, [...WIN, ...LINUX, ...MAC]),
      release(`${TAG_PREFIX}9.9.9`, [...WIN, ...LINUX, ...MAC], { draft: true }),
    ];
    expect(newestUpdate(list, 'win32', '0.2.0')).toBeNull();
    expect(newestUpdate(list, 'win32', '0.1.5')).toMatchObject({ version: '0.2.0', tag: `${TAG_PREFIX}0.2.0`, selfInstall: true });
  });
  it('takes the highest version, whatever order the list is in', () => {
    const list = [release(`${TAG_PREFIX}0.3.0`, WIN), release(`${TAG_PREFIX}0.10.0`, WIN), release(`${TAG_PREFIX}0.9.0`, WIN)];
    expect(newestUpdate(list, 'win32', '0.2.0')?.version).toBe('0.10.0');
    expect(newestUpdate([...list].reverse(), 'win32', '0.2.0')?.version).toBe('0.10.0');
  });
  it('skips a release that has no build for this platform yet', () => {
    const list = [release(`${TAG_PREFIX}0.4.0`, ['lighten-up-game-only-v0.4.0.zip', ...MAC]), release(`${TAG_PREFIX}0.3.0`, [...WIN, ...LINUX])];
    // 0.4.0 is still uploading its Windows and Linux builds: stay on 0.3.0 for now.
    expect(newestUpdate(list, 'win32', '0.2.0')?.version).toBe('0.3.0');
    expect(newestUpdate(list, 'linux', '0.2.0')?.version).toBe('0.3.0');
    expect(newestUpdate(list, 'darwin', '0.2.0')?.version).toBe('0.4.0');
    // An installer without its channel file is not enough: the updater could not read it.
    expect(newestUpdate([release(`${TAG_PREFIX}0.5.0`, ['Lighten-Up-Game-Only-Setup-0.5.0.exe'])], 'win32', '0.2.0')).toBeNull();
  });
  it('gives the updater the release\'s own download folder, and a page for people', () => {
    const update = newestUpdate([release(`${TAG_PREFIX}0.3.0`, LINUX)], 'linux', '0.2.0')!;
    expect(update.feedUrl).toBe('https://github.com/srishanb/lighten-up/releases/download/game-only-v0.3.0');
    expect(update.pageUrl).toBe('https://github.com/srishanb/lighten-up/releases/tag/game-only-v0.3.0');
  });
  it('a Mac is only told about the update: it cannot install it by itself', () => {
    expect(canSelfInstall('darwin')).toBe(false);
    expect(newestUpdate([release(`${TAG_PREFIX}0.3.0`, MAC)], 'darwin', '0.2.0')).toMatchObject({ version: '0.3.0', selfInstall: false });
  });
  it('never throws on an answer that is not a list of releases', () => {
    for (const bad of [null, undefined, {}, 'rate limited', [null, 5, {}, { tag_name: 7 }, { tag_name: `${TAG_PREFIX}x.y.z` }, { tag_name: `${TAG_PREFIX}1.0.0` }]]) {
      expect(newestUpdate(bad, 'win32', '0.2.0')).toBeNull();
    }
    expect(newestUpdate([release(`${TAG_PREFIX}0.3.0`, WIN)], 'win32', 'not a version')).toBeNull();
  });
  it('names the channel file the packager writes for each platform', () => {
    expect(channelFile('win32')).toBe('latest.yml');
    expect(channelFile('linux')).toBe('latest-linux.yml');
    expect(channelFile('darwin')).toBe('latest-mac.yml');
    expect(RELEASES_API).toBe('https://api.github.com/repos/srishanb/lighten-up/releases?per_page=100');
  });
});
