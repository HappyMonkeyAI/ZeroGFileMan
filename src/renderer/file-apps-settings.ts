import { DEFAULT_FILE_APP_PREFS, parseFileAppPrefs, type FileAppPrefs } from '../shared/file-apps.js';

const STORAGE_KEY = 'zerogfileman.fileApps';

export function loadStoredFileAppPrefs(): FileAppPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FILE_APP_PREFS, defaults: {}, customApps: [] };
    return parseFileAppPrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_FILE_APP_PREFS, defaults: {}, customApps: [] };
  }
}

export function storeFileAppPrefs(prefs: FileAppPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parseFileAppPrefs(prefs)));
  } catch {
    /* ignore */
  }
}
