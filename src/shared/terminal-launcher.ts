/** Preference for what the Terminal button opens. */

export type TerminalLauncher = 'system' | 'zerogterm' | 'custom';

export type TerminalPrefs = {
  launcher: TerminalLauncher;
  /** Used when launcher is `custom`. Supports `{path}` for the directory. */
  customCommand: string;
};

export const DEFAULT_TERMINAL_PREFS: TerminalPrefs = {
  launcher: 'system',
  customCommand: ''
};

const LAUNCHERS: TerminalLauncher[] = ['system', 'zerogterm', 'custom'];

export function isTerminalLauncher(value: unknown): value is TerminalLauncher {
  return typeof value === 'string' && (LAUNCHERS as string[]).includes(value);
}

export function parseTerminalPrefs(raw: unknown): TerminalPrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_TERMINAL_PREFS };
  const source = raw as Partial<TerminalPrefs>;
  return {
    launcher: isTerminalLauncher(source.launcher) ? source.launcher : DEFAULT_TERMINAL_PREFS.launcher,
    customCommand:
      typeof source.customCommand === 'string' ? source.customCommand.trim() : DEFAULT_TERMINAL_PREFS.customCommand
  };
}

/**
 * Expand a custom launch template.
 * `{path}` → absolute directory; otherwise the path is appended as a final argument.
 */
export function expandCustomTerminalCommand(template: string, absolutePath: string): string[] {
  const trimmed = template.trim();
  if (!trimmed) throw new Error('Custom terminal command is empty.');
  // Split the user's template first, then substitute: the path is data and must
  // stay one argument even when it contains spaces or quotes.
  const tokens = splitCommandLine(trimmed);
  if (trimmed.includes('{path}')) {
    return tokens.map((token) => token.split('{path}').join(absolutePath));
  }
  return [...tokens, absolutePath];
}

/** Minimal Windows/POSIX-ish split that respects double quotes. */
export function splitCommandLine(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && /\s/.test(ch)) {
      if (current) {
        parts.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }
  if (current) parts.push(current);
  if (!parts.length) throw new Error('Custom terminal command is empty.');
  return parts;
}
