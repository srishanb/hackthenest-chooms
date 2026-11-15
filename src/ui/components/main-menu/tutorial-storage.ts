/** Remember tutorial completion independently of checkpoint saves and tolerate blocked storage. */
export const TUTORIAL_STORAGE_KEY = 'lighten.tutorial.v1';

export function hasSeenTutorial(storage?: Pick<Storage, 'getItem'>): boolean {
  try { return storage?.getItem(TUTORIAL_STORAGE_KEY) === 'seen'; }
  catch { return false; }
}

export function rememberTutorial(storage?: Pick<Storage, 'setItem'>): void {
  try { storage?.setItem(TUTORIAL_STORAGE_KEY, 'seen'); }
  catch { /* Still allow play; show the tutorial again next session when persistence is blocked. */ }
}
