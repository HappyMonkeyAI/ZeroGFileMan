import {
  DEFAULT_TERMINAL_PREFS,
  parseTerminalPrefs,
  type TerminalPrefs
} from '../shared/terminal-launcher.js';

const STORAGE_KEY = 'zerogfileman.terminal';

export function loadStoredTerminalPrefs(): TerminalPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TERMINAL_PREFS };
    return parseTerminalPrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_TERMINAL_PREFS };
  }
}

export function storeTerminalPrefs(prefs: TerminalPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parseTerminalPrefs(prefs)));
  } catch {
    /* ignore */
  }
}
