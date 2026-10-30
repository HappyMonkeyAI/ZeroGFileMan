export type ThemeId = 'dark' | 'light' | 'nord' | 'dracula';

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  kind: 'dark' | 'light';
};

export const THEME_DEFINITIONS: ThemeDefinition[] = [
  { id: 'dark', label: 'Deck (Pro Commander)', kind: 'dark' },
  { id: 'light', label: 'Light', kind: 'light' },
  { id: 'nord', label: 'Nord', kind: 'dark' },
  { id: 'dracula', label: 'Dracula', kind: 'dark' }
];

export const DEFAULT_THEME: ThemeId = 'dark';

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_DEFINITIONS.some((t) => t.id === value);
}

export function applyTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id;
  document.documentElement.style.colorScheme = THEME_DEFINITIONS.find((t) => t.id === id)?.kind ?? 'dark';
}

const STORAGE_KEY = 'zerogfileman.theme';

export function loadStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isThemeId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

export function storeTheme(id: ThemeId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
