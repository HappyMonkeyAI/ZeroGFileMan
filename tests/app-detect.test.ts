import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { detectLocalApps } from '../src/main/app-detect.js';

let root: string;

async function project(name: string, pkg: unknown, files: string[] = []): Promise<string> {
  const dir = join(root, name);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'package.json'), JSON.stringify(pkg));
  for (const file of files) {
    const target = join(dir, file);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, 'x');
  }
  return dir;
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'zerog-apps-'));
  await project(
    'markdown-viewer',
    {
      name: 'markdown-viewer',
      version: '0.2.3',
      build: { productName: 'Markdown Viewer', fileAssociations: [{ ext: 'md' }, { ext: 'markdown' }] }
    },
    ['dist/win-unpacked/Markdown Viewer.exe', 'dist/MarkdownViewer-0.2.3-portable.exe']
  );
  await project(
    'portable-only',
    { name: 'portable-only', version: '1.2.3', build: { fileAssociations: [{ ext: ['log'] }] } },
    ['dist/PortableOnly-1.2.3-portable.exe']
  );
  await project('no-associations', { name: 'no-associations', build: {} });
  await project('no-launcher', { name: 'no-launcher', build: { fileAssociations: [{ ext: 'xyz' }] } });
  await mkdir(join(root, 'not-a-project'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('detectLocalApps', () => {
  it('finds projects with associations and prefers the unpacked exe', async () => {
    const apps = await detectLocalApps(root);
    expect(apps.map((app) => app.id)).toEqual(['detected:markdown-viewer', 'detected:portable-only']);
    const viewer = apps[0];
    expect(viewer.name).toBe('Markdown Viewer');
    expect(viewer.version).toBe('0.2.3');
    expect(viewer.extensions).toEqual(['.md', '.markdown']);
    expect(viewer.source).toBe('unpacked');
    expect(viewer.launch.command).toBe(join(root, 'markdown-viewer', 'dist', 'win-unpacked', 'Markdown Viewer.exe'));
    expect(viewer.launch.args).toEqual(['{file}']);
  });

  it('falls back to a portable artifact', async () => {
    const apps = await detectLocalApps(root);
    const portable = apps[1];
    expect(portable.source).toBe('portable');
    expect(portable.launch.command).toBe(join(root, 'portable-only', 'dist', 'PortableOnly-1.2.3-portable.exe'));
    expect(portable.extensions).toEqual(['.log']);
  });

  it('returns empty for a missing root', async () => {
    expect(await detectLocalApps(join(root, 'does-not-exist'))).toEqual([]);
  });
});

describe('detectLocalApps — zerogapp.json manifests', () => {
  let manifestRoot: string;

  async function manifestProject(name: string, manifest: unknown, files: string[] = []): Promise<void> {
    const dir = join(manifestRoot, name);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'zerogapp.json'), JSON.stringify(manifest));
    for (const file of files) {
      const target = join(dir, file);
      await mkdir(join(target, '..'), { recursive: true });
      await writeFile(target, 'x');
    }
  }

  beforeAll(async () => {
    manifestRoot = await mkdtemp(join(tmpdir(), 'zerog-manifest-'));
    await manifestProject(
      'zerogedit',
      {
        name: 'ZeroG Edit',
        version: '0.1.0',
        extensions: ['txt', 'md'],
        launch: { command: 'target/release/zerogedit.exe', args: ['{file}'] }
      },
      ['target/release/zerogedit.exe']
    );
    await manifestProject('no-exe', {
      name: 'No Exe',
      version: '1.0.0',
      extensions: ['xyz'],
      launch: { command: 'target/release/noexe.exe' }
    });
    await manifestProject('bad-manifest', { name: 'Bad', extensions: [], launch: { command: 'x.exe' } }, ['x.exe']);
    await manifestProject('absolute', {
      name: 'Absolute App',
      version: '2.0.0',
      extensions: ['.wav'],
      launch: { command: join(manifestRoot, 'zerogedit', 'target', 'release', 'zerogedit.exe') }
    });
  });

  afterAll(async () => {
    await rm(manifestRoot, { recursive: true, force: true });
  });

  it('detects native apps via zerogapp.json and resolves relative commands', async () => {
    const apps = await detectLocalApps(manifestRoot);
    expect(apps.map((app) => app.id)).toEqual(['detected:absolute', 'detected:zerogedit']);
    const edit = apps[1];
    expect(edit.name).toBe('ZeroG Edit');
    expect(edit.version).toBe('0.1.0');
    expect(edit.extensions).toEqual(['.txt', '.md']);
    expect(edit.source).toBe('manifest');
    expect(edit.launch.command).toBe(join(manifestRoot, 'zerogedit', 'target', 'release', 'zerogedit.exe'));
    expect(edit.launch.args).toEqual(['{file}']);
  });

  it('defaults args to {file} and keeps absolute commands', async () => {
    const apps = await detectLocalApps(manifestRoot);
    const absolute = apps[0];
    expect(absolute.launch.args).toEqual(['{file}']);
    expect(absolute.launch.command).toBe(join(manifestRoot, 'zerogedit', 'target', 'release', 'zerogedit.exe'));
    expect(absolute.extensions).toEqual(['.wav']);
  });

  it('package.json associations win when both exist', async () => {
    const bothRoot = await mkdtemp(join(tmpdir(), 'zerog-both-'));
    try {
      const dir = join(bothRoot, 'both');
      await mkdir(join(dir, 'dist', 'win-unpacked'), { recursive: true });
      await writeFile(join(dir, 'dist', 'win-unpacked', 'Both Electron.exe'), 'x');
      await writeFile(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'both', version: '9.9.9', build: { productName: 'Both Electron', fileAssociations: [{ ext: 'md' }] } })
      );
      await writeFile(
        join(dir, 'zerogapp.json'),
        JSON.stringify({ name: 'Both Native', version: '0.1.0', extensions: ['txt'], launch: { command: 'dist/win-unpacked/Both Electron.exe' } })
      );
      const apps = await detectLocalApps(bothRoot);
      expect(apps).toHaveLength(1);
      expect(apps[0].name).toBe('Both Electron');
      expect(apps[0].source).toBe('unpacked');
    } finally {
      await rm(bothRoot, { recursive: true, force: true });
    }
  });
});
