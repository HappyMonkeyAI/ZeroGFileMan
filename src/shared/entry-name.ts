// What may be typed as a new file or folder name.
//
// The renderer checks first so the user gets a clear message at the prompt;
// main checks again because a name that smuggles in a separator (`..\x`)
// would otherwise turn a rename into a move somewhere else.

const WINDOWS_FORBIDDEN = /[<>:"|?*]/;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f]/;
const MAX_NAME_LENGTH = 255;

/** Why `name` cannot be used as an entry name, or null when it is fine. */
export function entryNameProblem(name: string, platform: NodeJS.Platform | string): string | null {
  if (!name || !name.trim()) return 'Enter a name.';
  if (name !== name.trim()) return 'Names cannot start or end with a space.';
  if (name === '.' || name === '..') return 'That name is reserved.';
  if (/[\\/]/.test(name)) return 'Names cannot contain / or \\.';
  if (CONTROL_CHARS.test(name)) return 'Names cannot contain control characters.';
  if (name.length > MAX_NAME_LENGTH) return `Names can be at most ${MAX_NAME_LENGTH} characters.`;
  if (platform === 'win32') {
    if (WINDOWS_FORBIDDEN.test(name)) return 'Names cannot contain < > : " | ? *';
    if (name.endsWith('.')) return 'Windows names cannot end with a dot.';
    if (WINDOWS_RESERVED.test(name)) return 'That name is reserved by Windows.';
  }
  return null;
}

/** Throw with the reason when `name` is not usable. */
export function assertEntryName(name: string, platform: NodeJS.Platform | string): void {
  const problem = entryNameProblem(name, platform);
  if (problem) throw new Error(problem);
}
