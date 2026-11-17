import { parseVersion } from '../shared/update.js';

export type UpdateSettings = {
  checkOnStartup: boolean;
  skippedVersion: string;
};

const STORAGE_KEY = 'zerogfileman.updates';

export const DEFAULT_UPDATE_SETTINGS: UpdateSettings = {
  checkOnStartup: true,
  skippedVersion: ''
};

function parseSkippedVersion(value: unknown): string {
  if (typeof value !== 'string') return '';
  const version = value.trim().replace(/^v/, '');
  return version && parseVersion(version) ? version : '';
}

export function parseUpdateSettings(raw: unknown): UpdateSettings {
  const source = raw && typeof raw === 'object' ? (raw as Partial<UpdateSettings>) : {};
  return {
    checkOnStartup: typeof source.checkOnStartup === 'boolean' ? source.checkOnStartup : DEFAULT_UPDATE_SETTINGS.checkOnStartup,
    skippedVersion: parseSkippedVersion(source.skippedVersion)
  };
}

export function loadStoredUpdateSettings(): UpdateSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_UPDATE_SETTINGS };
    return parseUpdateSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_UPDATE_SETTINGS };
  }
}

export function storeUpdateSettings(settings: UpdateSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parseUpdateSettings(settings)));
  } catch {
    /* ignore quota / private mode */
  }
}
