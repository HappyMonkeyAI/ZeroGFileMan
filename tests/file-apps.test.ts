import { describe, expect, it } from 'vitest';
import {
  allFileApps,
  appsForExtension,
  BUILTIN_FILE_APPS,
  customFileApp,
  detectedFileApp,
  extensionOptions,
  fileExtension,
  normalizeExtension,
  packageAppName,
  packageAssociations,
  parseArgsTemplate,
  parseExtensionList,
  parseFileAppPrefs,
  pickPortableExe,
  resolveAppArgs,
  resolveDefaultApp,
  type CustomApp,
  type DetectedApp,
  type FileAppPrefs
} from '../src/shared/file-apps.js';
import { buildContextMenu, parseContextMenuTarget } from '../src/shared/context-menu.js';

const detected: DetectedApp = {
  id: 'detected:markdown-viewer',
  name: 'Markdown Viewer',
  version: '0.2.3',
  extensions: ['.md', '.markdown'],
  launch: { command: 'C:\\dev\\markdown-viewer\\dist\\win-unpacked\\Markdown Viewer.exe', args: ['{file}'] },
  source: 'unpacked',
  projectDir: 'C:\\dev\\markdown-viewer'
};

const custom: CustomApp = {
  id: 'custom:my-editor',
  name: 'My Editor',
  command: 'C:\\Apps\\editor.exe',
  args: '--open "{file}"',
  extensions: ['.txt', '.md']
};

const prefs: FileAppPrefs = {
  appsRoot: '',
  defaults: { '.md': 'detected:markdown-viewer' },
  customApps: [custom]
};

const detectedApps = [detectedFileApp(detected)];

describe('normalizeExtension', () => {
  it('normalizes case and leading dot', () => {
    expect(normalizeExtension('MD')).toBe('.md');
    expect(normalizeExtension('.Markdown')).toBe('.markdown');
    expect(normalizeExtension('  md  ')).toBe('.md');
  });

  it('rejects junk', () => {
    expect(normalizeExtension('')).toBeNull();
    expect(normalizeExtension('m d')).toBeNull();
    expect(normalizeExtension('exe/../bat')).toBeNull();
    expect(normalizeExtension(42)).toBeNull();
    expect(normalizeExtension('a'.repeat(17))).toBeNull();
  });
});

describe('parseExtensionList', () => {
  it('splits on commas, spaces and semicolons, deduping', () => {
    expect(parseExtensionList('md, markdown; MD .txt')).toEqual(['.md', '.markdown', '.txt']);
  });

  it('returns empty for non-strings', () => {
    expect(parseExtensionList(undefined)).toEqual([]);
  });
});

describe('fileExtension', () => {
  it('reads the last extension', () => {
    expect(fileExtension('notes.md')).toBe('.md');
    expect(fileExtension('archive.tar.gz')).toBe('.gz');
    expect(fileExtension('README.MDOWN')).toBe('.mdown');
  });

  it('treats dotfiles and extensionless names as none', () => {
    expect(fileExtension('.env')).toBeNull();
    expect(fileExtension('Makefile')).toBeNull();
    expect(fileExtension('trailing.')).toBeNull();
  });
});

describe('parseArgsTemplate / resolveAppArgs', () => {
  it('splits on whitespace honoring quotes', () => {
    expect(parseArgsTemplate('--open "{file}" --mode view')).toEqual(['--open', '{file}', '--mode', 'view']);
    expect(parseArgsTemplate('')).toEqual([]);
    expect(parseArgsTemplate('""')).toEqual(['']);
  });

  it('substitutes {file} everywhere it appears', () => {
    expect(resolveAppArgs(['--file={file}', '{file}'], 'C:\\a b\\n.md')).toEqual([
      '--file=C:\\a b\\n.md',
      'C:\\a b\\n.md'
    ]);
  });
});

describe('parseFileAppPrefs', () => {
  it('returns defaults for garbage', () => {
    expect(parseFileAppPrefs(null)).toEqual({ appsRoot: '', defaults: {}, customApps: [] });
    expect(parseFileAppPrefs('nope')).toEqual({ appsRoot: '', defaults: {}, customApps: [] });
  });

  it('keeps valid entries and normalizes keys', () => {
    const parsed = parseFileAppPrefs({
      appsRoot: ' C:\\dev ',
      defaults: { MD: 'detected:markdown-viewer', '.txt': '' },
      customApps: [custom]
    });
    expect(parsed.appsRoot).toBe('C:\\dev');
    expect(parsed.defaults).toEqual({ '.md': 'detected:markdown-viewer' });
    expect(parsed.customApps).toHaveLength(1);
    expect(parsed.customApps[0].id).toBe('custom:my-editor');
  });

  it('drops invalid custom apps and bad default ids', () => {
    const parsed = parseFileAppPrefs({
      defaults: { '.md': 'bad id!' },
      customApps: [{ name: '', command: 'x.exe', extensions: ['md'] }, { name: 'No Ext', command: 'x.exe', extensions: [] }]
    });
    expect(parsed.defaults).toEqual({});
    expect(parsed.customApps).toEqual([]);
  });

  it('regenerates missing custom ids and dedupes', () => {
    const parsed = parseFileAppPrefs({
      customApps: [
        { name: 'My Editor', command: 'a.exe', extensions: ['txt'] },
        { id: 'custom:my-editor-1', name: 'Other', command: 'b.exe', extensions: ['log'] }
      ]
    });
    expect(parsed.customApps).toHaveLength(1);
    expect(parsed.customApps[0].id).toBe('custom:my-editor-1');
  });
});

describe('association resolution', () => {
  it('resolves the configured default app', () => {
    expect(resolveDefaultApp('notes.md', detectedApps, prefs)?.id).toBe('detected:markdown-viewer');
    expect(resolveDefaultApp('notes.txt', detectedApps, prefs)).toBeNull();
    expect(resolveDefaultApp('.env', detectedApps, prefs)).toBeNull();
  });

  it('resolves builtin and custom defaults', () => {
    const withBuiltins: FileAppPrefs = { ...prefs, defaults: { '.md': 'notepad', '.txt': 'custom:my-editor' } };
    expect(resolveDefaultApp('a.md', detectedApps, withBuiltins)?.kind).toBe('builtin');
    const txt = resolveDefaultApp('a.txt', detectedApps, withBuiltins);
    expect(txt?.kind).toBe('custom');
    expect(txt?.launch).toEqual({ command: 'C:\\Apps\\editor.exe', args: ['--open', '{file}'] });
  });

  it('falls back to system default when the app is gone', () => {
    expect(resolveDefaultApp('a.md', [], prefs)).toBeNull();
  });

  it('lists apps and extensions for the settings grid', () => {
    expect(appsForExtension('.md', detectedApps, prefs).map((app) => app.id)).toEqual([
      'detected:markdown-viewer',
      'custom:my-editor'
    ]);
    expect(extensionOptions(detectedApps, prefs)).toEqual(['.markdown', '.md', '.txt']);
    expect(allFileApps(detectedApps, prefs).slice(0, 2)).toEqual(BUILTIN_FILE_APPS);
  });

  it('describes detected apps for the settings list', () => {
    expect(detectedFileApp(detected).detail).toBe('v0.2.3 · unpacked');
    expect(customFileApp(custom).detail).toBe('Custom');
  });
});

describe('package detection helpers', () => {
  it('reads electron-builder fileAssociations', () => {
    expect(
      packageAssociations({ build: { fileAssociations: [{ ext: 'md' }, { ext: ['markdown', 'MD'] }, { ext: 3 }, null] } })
    ).toEqual(['.md', '.markdown']);
    expect(packageAssociations({})).toEqual([]);
    expect(packageAssociations(null)).toEqual([]);
  });

  it('prefers productName over package name', () => {
    expect(packageAppName({ name: 'markdown-viewer', build: { productName: 'Markdown Viewer' } })).toBe('Markdown Viewer');
    expect(packageAppName({ name: 'markdown-viewer' })).toBe('markdown-viewer');
    expect(packageAppName(undefined)).toBe('');
  });

  it('picks the newest portable exe and skips installers', () => {
    expect(
      pickPortableExe([
        'Markdown Viewer Setup 0.2.3.exe',
        'MarkdownViewer-0.2.2-portable.exe',
        'MarkdownViewer-0.2.3-portable.exe',
        'latest.yml'
      ])
    ).toBe('MarkdownViewer-0.2.3-portable.exe');
    expect(pickPortableExe(['SomeApp-1.0.0.exe', 'SomeApp Setup 9.9.9.exe'])).toBe('SomeApp-1.0.0.exe');
    expect(pickPortableExe(['latest.yml', 'app.exe.blockmap'])).toBeNull();
  });
});

describe('context menu open-with entries', () => {
  const target = {
    kind: 'file' as const,
    canPaste: false,
    canTransfer: true,
    openWith: [{ label: 'Markdown Viewer', appId: 'detected:markdown-viewer' }]
  };

  it('adds Open with items for files only', () => {
    const labels = buildContextMenu(target, 'win32').map((entry) => (entry.type === 'item' ? entry.label : '|'));
    expect(labels).toContain('Open with Markdown Viewer');
    const command = buildContextMenu(target, 'win32').find(
      (entry) => entry.type === 'item' && entry.label === 'Open with Markdown Viewer'
    );
    expect(command && command.type === 'item' && command.command).toBe('item:open-app:detected:markdown-viewer');
    const folder = buildContextMenu({ ...target, kind: 'directory' }, 'win32');
    expect(folder.some((entry) => entry.type === 'item' && entry.label.startsWith('Open with Markdown'))).toBe(false);
  });

  it('validates untrusted openWith payloads', () => {
    expect(parseContextMenuTarget(target).openWith).toEqual(target.openWith);
    expect(parseContextMenuTarget({ kind: 'file', canPaste: false, canTransfer: false }).openWith).toBeUndefined();
    expect(() => parseContextMenuTarget({ ...target, openWith: 'nope' })).toThrow();
    expect(() => parseContextMenuTarget({ ...target, openWith: [{ label: 'x', appId: 'bad id!' }] })).toThrow();
    expect(() =>
      parseContextMenuTarget({ ...target, openWith: Array.from({ length: 13 }, () => ({ label: 'x', appId: 'a' })) })
    ).toThrow();
  });
});
