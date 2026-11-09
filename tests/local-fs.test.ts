import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Lets a test pretend the destination is on another drive.
const fsControl = vi.hoisted(() => ({ renameFailsWith: null as string | null, rmFailsWith: null as string | null }));
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    rename: async (from: string, to: string) => {
      if (fsControl.renameFailsWith) {
        throw Object.assign(new Error(`${fsControl.renameFailsWith}: simulated`), { code: fsControl.renameFailsWith });
      }
      return actual.rename(from, to);
    },
    rm: async (...args: Parameters<typeof actual.rm>) => {
      if (fsControl.rmFailsWith) {
        throw Object.assign(new Error(`${fsControl.rmFailsWith}: simulated`), { code: fsControl.rmFailsWith });
      }
      return actual.rm(...args);
    }
  };
});

const { copyLocalEntry, createLocalDirectory, isInside, moveLocalEntry, renameLocalEntry, samePath } = await import(
  '../src/main/local-fs.js'
);

const caseInsensitive = process.platform === 'win32' || process.platform === 'darwin';
let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'zerog-fs-'));
  fsControl.renameFailsWith = null;
});
afterEach(() => {
  fsControl.renameFailsWith = null;
  fsControl.rmFailsWith = null;
  rmSync(root, { recursive: true, force: true });
});

describe('renameLocalEntry', () => {
  it('renames within the folder', async () => {
    writeFileSync(join(root, 'a.txt'), 'x');
    await renameLocalEntry(join(root, 'a.txt'), join(root, 'b.txt'));
    expect(readdirSync(root)).toEqual(['b.txt']);
  });

  it('allows a case-only rename', async () => {
    writeFileSync(join(root, 'readme.md'), 'x');
    await renameLocalEntry(join(root, 'readme.md'), join(root, 'README.md'));
    expect(readdirSync(root)).toEqual(['README.md']);
  });

  it('refuses to overwrite a different entry', async () => {
    writeFileSync(join(root, 'a.txt'), 'a');
    writeFileSync(join(root, 'b.txt'), 'b');
    await expect(renameLocalEntry(join(root, 'a.txt'), join(root, 'b.txt'))).rejects.toThrow(/already exists/);
    expect(readFileSync(join(root, 'b.txt'), 'utf8')).toBe('b');
  });

  it('refuses names that would move the entry elsewhere', async () => {
    mkdirSync(join(root, 'sub'));
    writeFileSync(join(root, 'sub', 'a.txt'), 'x');
    await expect(renameLocalEntry(join(root, 'sub', 'a.txt'), join(root, 'sub', '..', 'a.txt'))).rejects.toThrow(
      /only change the name/
    );
    expect(existsSync(join(root, 'sub', 'a.txt'))).toBe(true);
  });

  it.runIf(process.platform === 'win32')('refuses names Windows cannot hold', async () => {
    writeFileSync(join(root, 'a.txt'), 'x');
    await expect(renameLocalEntry(join(root, 'a.txt'), join(root, 'what?.txt'))).rejects.toThrow(/cannot contain/);
    await expect(renameLocalEntry(join(root, 'a.txt'), join(root, 'CON'))).rejects.toThrow(/reserved/);
  });
});

describe('createLocalDirectory', () => {
  it('creates a folder and refuses reserved names', async () => {
    await createLocalDirectory(join(root, 'New Folder'));
    expect(statSync(join(root, 'New Folder')).isDirectory()).toBe(true);
    await expect(createLocalDirectory(join(root, '..'))).rejects.toThrow();
  });
});

describe('moveLocalEntry', () => {
  it('moves into another folder', async () => {
    mkdirSync(join(root, 'dest'));
    writeFileSync(join(root, 'a.txt'), 'x');
    const moved = await moveLocalEntry(join(root, 'a.txt'), join(root, 'dest'));
    expect(moved).toBe(join(root, 'dest', 'a.txt'));
    expect(existsSync(join(root, 'a.txt'))).toBe(false);
  });

  it('falls back to copy + remove across drives (EXDEV)', async () => {
    mkdirSync(join(root, 'src', 'nested'), { recursive: true });
    mkdirSync(join(root, 'dest'));
    writeFileSync(join(root, 'src', 'nested', 'deep.txt'), 'payload');
    const old = new Date('2020-01-02T03:04:05Z');
    utimesSync(join(root, 'src', 'nested', 'deep.txt'), old, old);

    fsControl.renameFailsWith = 'EXDEV';
    const moved = await moveLocalEntry(join(root, 'src'), join(root, 'dest'));

    expect(moved).toBe(join(root, 'dest', 'src'));
    expect(readFileSync(join(moved, 'nested', 'deep.txt'), 'utf8')).toBe('payload');
    expect(statSync(join(moved, 'nested', 'deep.txt')).mtime.getTime()).toBe(old.getTime());
    expect(existsSync(join(root, 'src'))).toBe(false);
  });

  it('treats an original that vanished after the copy as a completed move', async () => {
    mkdirSync(join(root, 'dest'));
    writeFileSync(join(root, 'a.txt'), 'x');
    fsControl.renameFailsWith = 'EXDEV';
    fsControl.rmFailsWith = 'ENOENT';
    await expect(moveLocalEntry(join(root, 'a.txt'), join(root, 'dest'))).resolves.toBe(join(root, 'dest', 'a.txt'));
  });

  it('says the copy is in place when the original cannot be removed', async () => {
    mkdirSync(join(root, 'dest'));
    writeFileSync(join(root, 'a.txt'), 'x');
    fsControl.renameFailsWith = 'EXDEV';
    fsControl.rmFailsWith = 'EBUSY';
    await expect(moveLocalEntry(join(root, 'a.txt'), join(root, 'dest'))).rejects.toThrow(
      /Copied to .*but the original could not be removed/
    );
    expect(existsSync(join(root, 'dest', 'a.txt'))).toBe(true);
  });

  it('does not copy on other rename errors', async () => {
    mkdirSync(join(root, 'dest'));
    writeFileSync(join(root, 'a.txt'), 'x');
    fsControl.renameFailsWith = 'EPERM';
    await expect(moveLocalEntry(join(root, 'a.txt'), join(root, 'dest'))).rejects.toThrow(/EPERM/);
    expect(readdirSync(join(root, 'dest'))).toEqual([]);
    expect(existsSync(join(root, 'a.txt'))).toBe(true);
  });

  it('refuses to move a folder into itself, whatever the case', async () => {
    mkdirSync(join(root, 'Folder', 'child'), { recursive: true });
    await expect(moveLocalEntry(join(root, 'Folder'), join(root, 'Folder', 'child'))).rejects.toThrow(/into itself/);
    if (caseInsensitive) {
      await expect(moveLocalEntry(join(root, 'Folder'), join(root, 'FOLDER', 'child'))).rejects.toThrow(/into itself/);
    }
  });
});

describe('copyLocalEntry', () => {
  it('copies beside an existing name without overwriting', async () => {
    writeFileSync(join(root, 'a.txt'), 'x');
    const copied = await copyLocalEntry(join(root, 'a.txt'), root);
    expect(copied).toBe(join(root, 'a (1).txt'));
  });

  it('refuses to copy a folder into itself', async () => {
    mkdirSync(join(root, 'Folder', 'child'), { recursive: true });
    await expect(copyLocalEntry(join(root, 'Folder'), join(root, 'Folder', 'child'))).rejects.toThrow(/into itself/);
  });
});

describe('path helpers', () => {
  it('compares paths with the platform’s case rules', () => {
    expect(samePath(join(root, 'A'), join(root, 'a'))).toBe(caseInsensitive);
    expect(isInside(join(root, 'a', 'b'), join(root, 'a'))).toBe(true);
    expect(isInside(join(root, 'a'), join(root, 'a'))).toBe(false);
    expect(isInside(join(root, 'ab'), join(root, 'a'))).toBe(false);
  });
});
