/** Types for update-feed.cjs, so the TypeScript test can import it. */
export const REPO: string;
export const TAG_PREFIX: string;
export const RELEASES_API: string;
export type Version = [number, number, number];
export function parseVersion(text: unknown): Version | null;
export function compareVersions(a: Version, b: Version): number;
export function channelFile(platform: string): string;
export function canSelfInstall(platform: string): boolean;
export interface Update {
  version: string;
  tag: string;
  feedUrl: string;
  pageUrl: string;
  selfInstall: boolean;
}
export function newestUpdate(releases: unknown, platform: string, currentVersion: string): Update | null;
