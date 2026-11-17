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
