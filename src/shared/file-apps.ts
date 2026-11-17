// File-type associations: which program opens which extension.
//
// Pure decision logic shared by the renderer (defaults, menus, settings) and
// main (detection). Launches themselves go through main's safe spawner; the
// `{file}` token in an argument list is replaced with the clicked file path.

export type AppLaunch = {
  command: string;
  /** Argument template; `{file}` is replaced with the file path at launch. */
  args: string[];
  cwd?: string;
};

export type FileAppKind = 'builtin' | 'detected' | 'custom';

export type FileApp = {
  id: string;
  name: string;
  kind: FileAppKind;
  /** Normalized extensions (`.md`); empty for builtins that open anything. */
  extensions: string[];
  launch?: AppLaunch;
  detail?: string;
};

/** A user-added program, stored in local prefs. */
export type CustomApp = {
  id: string;
  name: string;
  command: string;
  args: string;
  extensions: string[];
};

export type FileAppPrefs = {
  /** Development-store folder to scan; empty means the default location. */
  appsRoot: string;
  /** Normalized extension → app id. Missing/empty means system default. */
  defaults: Record<string, string>;
  customApps: CustomApp[];
};

/** An app found by scanning the development store (main process). */
export type DetectedApp = {
  id: string;
  name: string;
  version: string;
  extensions: string[];
  launch: AppLaunch;
  source: 'unpacked' | 'portable' | 'dev' | 'manifest';
  projectDir: string;
};

export const DEFAULT_FILE_APP_PREFS: FileAppPrefs = { appsRoot: '', defaults: {}, customApps: [] };

export const BUILTIN_FILE_APPS: FileApp[] = [
  { id: 'notepad', name: 'Notepad', kind: 'builtin', extensions: [] },
  { id: 'cursor', name: 'Cursor', kind: 'builtin', extensions: [] }
];

export const OPEN_APP_COMMAND_PREFIX = 'item:open-app:';

const APP_ID_PATTERN = /^[a-z0-9:._-]{1,120}$/i;
const EXTENSION_PATTERN = /^[a-z0-9]{1,16}$/;

/** `MD`, `.Md`, `md` → `.md`; anything else → null. */
export function normalizeExtension(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().replace(/^\./, '').toLowerCase();
  return EXTENSION_PATTERN.test(value) ? `.${value}` : null;
}

/** Comma/space/semicolon separated extension list, normalized and deduped. */
export function parseExtensionList(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  const seen = new Set<string>();
  for (const part of raw.split(/[,;\s]+/)) {
    const ext = normalizeExtension(part);
    if (ext) seen.add(ext);
  }
  return [...seen];
}

/** The extension a file name carries; dotfiles like `.env` have none. */
export function fileExtension(name: string): string | null {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return null;
  return normalizeExtension(name.slice(dot + 1));
}

/** Split an argument template on whitespace, honoring double quotes. */
export function parseArgsTemplate(raw: string): string[] {
  const args: string[] = [];
  let current = '';
  let quoted = false;
  let has = false;
  for (const ch of raw) {
    if (ch === '"') {
      quoted = !quoted;
      has = true;
    } else if (!quoted && /\s/.test(ch)) {
      if (has) args.push(current);
      current = '';
      has = false;
    } else {
      current += ch;
      has = true;
    }
  }
  if (has) args.push(current);
  return args;
}

/** Substitute the clicked file path into every `{file}` occurrence. */
export function resolveAppArgs(args: readonly string[], filePath: string): string[] {
  return args.map((arg) => arg.split('{file}').join(filePath));
}

/** Executable shape check per platform; POSIX executables need no extension. */
export function appCommandProblem(command: string, platform: string): string | null {
  if (!command) return 'App executable not found.';
  if (platform === 'win32' && !/\.(exe|com|cmd|bat)$/i.test(command)) {
    return 'The app must be an executable file.';
  }
  return null;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'app';
}

function parseCustomApp(raw: unknown, index: number): CustomApp | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const name = typeof source.name === 'string' ? source.name.trim() : '';
  const command = typeof source.command === 'string' ? source.command.trim() : '';
  const extensions = parseExtensionList(Array.isArray(source.extensions) ? source.extensions.join(',') : source.extensions);
  if (!name || name.length > 80 || !command || command.length > 2048 || !extensions.length) return null;
  const id =
    typeof source.id === 'string' && APP_ID_PATTERN.test(source.id) && source.id.startsWith('custom:')
      ? source.id
      : `custom:${slug(name)}-${index + 1}`;
  return {
    id,
    name,
    command,
    args: typeof source.args === 'string' ? source.args : '{file}',
    extensions
  };
}

/** Validate stored prefs; bad entries fall away instead of breaking launch. */
export function parseFileAppPrefs(raw: unknown): FileAppPrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_FILE_APP_PREFS, defaults: {}, customApps: [] };
  const source = raw as Record<string, unknown>;
  const appsRoot = typeof source.appsRoot === 'string' ? source.appsRoot.trim() : '';
  const defaults: Record<string, string> = {};
  if (source.defaults && typeof source.defaults === 'object') {
    for (const [key, value] of Object.entries(source.defaults as Record<string, unknown>)) {
      const ext = normalizeExtension(key);
      if (ext && typeof value === 'string' && value && APP_ID_PATTERN.test(value)) defaults[ext] = value;
    }
  }
  const customApps: CustomApp[] = [];
  if (Array.isArray(source.customApps)) {
    for (const [index, entry] of source.customApps.slice(0, 32).entries()) {
      const app = parseCustomApp(entry, index);
      if (app && !customApps.some((existing) => existing.id === app.id)) customApps.push(app);
    }
  }
  return { appsRoot, defaults, customApps };
}

export function customFileApp(app: CustomApp): FileApp {
  return {
    id: app.id,
    name: app.name,
    kind: 'custom',
    extensions: app.extensions,
    launch: { command: app.command, args: parseArgsTemplate(app.args) },
    detail: 'Custom'
  };
}

export function detectedFileApp(app: DetectedApp): FileApp {
  return {
    id: app.id,
    name: app.name,
    kind: 'detected',
    extensions: app.extensions,
    launch: app.launch,
    detail: `${app.version ? `v${app.version} · ` : ''}${app.source}`
  };
}

export function allFileApps(detected: readonly FileApp[], prefs: FileAppPrefs): FileApp[] {
  return [...BUILTIN_FILE_APPS, ...detected, ...prefs.customApps.map(customFileApp)];
}

/** Detected and custom apps that declare this extension. */
export function appsForExtension(ext: string, detected: readonly FileApp[], prefs: FileAppPrefs): FileApp[] {
  return [...detected, ...prefs.customApps.map(customFileApp)].filter((app) => app.extensions.includes(ext));
}

/** Every extension with a detected/custom app or a stored default, sorted. */
export function extensionOptions(detected: readonly FileApp[], prefs: FileAppPrefs): string[] {
  const seen = new Set<string>(Object.keys(prefs.defaults));
  for (const app of [...detected, ...prefs.customApps.map(customFileApp)]) {
    for (const ext of app.extensions) seen.add(ext);
  }
  return [...seen].sort();
}

/** The configured default app for a file, or null for the system default. */
export function resolveDefaultApp(fileName: string, detected: readonly FileApp[], prefs: FileAppPrefs): FileApp | null {
  const ext = fileExtension(fileName);
  if (!ext) return null;
  const id = prefs.defaults[ext];
  if (!id) return null;
  return allFileApps(detected, prefs).find((app) => app.id === id) ?? null;
}

/** Extensions an electron-builder package declares via build.fileAssociations. */
export function packageAssociations(pkg: unknown): string[] {
  if (!pkg || typeof pkg !== 'object') return [];
  const build = (pkg as Record<string, unknown>).build;
  if (!build || typeof build !== 'object') return [];
  const list = (build as Record<string, unknown>).fileAssociations;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const ext = (entry as Record<string, unknown>).ext;
    for (const value of Array.isArray(ext) ? ext : [ext]) {
      const normalized = normalizeExtension(value);
      if (normalized) seen.add(normalized);
    }
  }
  return [...seen];
}

export function packageAppName(pkg: unknown): string {
  if (!pkg || typeof pkg !== 'object') return '';
  const source = pkg as Record<string, unknown>;
  const build = source.build;
  const productName =
    build && typeof build === 'object' ? (build as Record<string, unknown>).productName : undefined;
  if (typeof productName === 'string' && productName.trim()) return productName.trim();
  return typeof source.name === 'string' ? source.name.trim() : '';
}

/** A native (non-Electron) app's zerogapp.json manifest, validated. */
export type ZerogAppManifest = {
  name: string;
  version: string;
  extensions: string[];
  launch: AppLaunch;
};

export function zerogAppManifest(raw: unknown): ZerogAppManifest | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const name = typeof source.name === 'string' ? source.name.trim() : '';
  if (!name || name.length > 80) return null;
  const version = typeof source.version === 'string' ? source.version.trim() : '';
  const extensions = parseExtensionList(
    Array.isArray(source.extensions) ? source.extensions.join(',') : source.extensions
  );
  if (!extensions.length) return null;
  const launchRaw = source.launch;
  if (!launchRaw || typeof launchRaw !== 'object') return null;
  const launchSource = launchRaw as Record<string, unknown>;
  const command = typeof launchSource.command === 'string' ? launchSource.command.trim() : '';
  if (!command || command.length > 2048) return null;
  const args = Array.isArray(launchSource.args)
    ? launchSource.args
        .filter((arg): arg is string => typeof arg === 'string' && arg.length <= 2048 && !/[\0\r\n]/.test(arg))
        .slice(0, 32)
    : [];
  const cwd = typeof launchSource.cwd === 'string' && launchSource.cwd.trim() ? launchSource.cwd.trim() : undefined;
  return {
    name,
    version,
    extensions,
    launch: { command, args: args.length ? args : ['{file}'], ...(cwd ? { cwd } : {}) }
  };
}

/** Best launchable exe among build artifacts: portable over installer-free, newest version first. */
export function pickPortableExe(names: readonly string[]): string | null {
  const candidates = names.filter(
    (name) => /\.exe$/i.test(name) && !/setup/i.test(name) && !/\.blockmap$/i.test(name)
  );
  if (!candidates.length) return null;
  const version = (name: string): number[] => {
    const match = name.match(/(\d+)\.(\d+)\.(\d+)/);
    return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [0, 0, 0];
  };
  const score = (name: string): number[] => [...(/portable/i.test(name) ? [1] : [0]), ...version(name)];
  return [...candidates].sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    for (let i = 0; i < sa.length; i += 1) {
      if (sa[i] !== sb[i]) return sb[i] - sa[i];
    }
    return b.localeCompare(a);
  })[0];
}
