import { constants } from 'node:fs';
import { access, cp, lstat, mkdir, readdir, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, normalize, relative, resolve } from 'node:path';
import type { DirectoryListing, FileEntry, SearchHit } from '../shared/types.js';
import { assertEntryName } from '../shared/entry-name.js';
import { sortEntries } from '../shared/files.js';

/** Windows and macOS file systems ignore case by default. */
const CASE_INSENSITIVE = process.platform === 'win32' || process.platform === 'darwin';

/** Do two resolved paths name the same location? */
export function samePath(a: string, b: string): boolean {
  return CASE_INSENSITIVE ? a.toLowerCase() === b.toLowerCase() : a === b;
}

/** Is `child` strictly inside `parent`? Both must already be resolved. */
export function isInside(child: string, parent: string): boolean {
  const rel = CASE_INSENSITIVE ? relative(parent.toLowerCase(), child.toLowerCase()) : relative(parent, child);
  return Boolean(rel) && !rel.startsWith('..') && !isAbsolute(rel);
}

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null ? (error as NodeJS.ErrnoException).code : undefined;
}

export function resolveLocalPath(input: unknown): string {
  if (typeof input !== 'string' || !input) throw new Error('A filesystem path is required.');
  if (input.includes('\0')) throw new Error('That path is not valid.');
  if (input.length > 4096) throw new Error('That path is too long.');
  const expanded =
    input === '~' || input.startsWith('~/') || input.startsWith('~\\')
      ? join(homedir(), input.slice(1))
      : input;
  if (!isAbsolute(expanded)) throw new Error('Only absolute paths can be browsed.');
  return resolve(normalize(expanded));
}

export function localHome(): string {
  return homedir();
}

/**
 * Roots the user can jump to from the pane drive picker.
 *
 * Windows: A–Z letters that respond within a short timeout (skips empty optical
 * trays that would otherwise hang). Non-Windows: just `/`.
 */
export async function listLocalDrives(): Promise<string[]> {
  if (process.platform !== 'win32') return ['/'];

  const probe = async (root: string): Promise<string | null> => {
    const ok = await Promise.race([
      access(root, constants.F_OK)
        .then(() => true)
        .catch(() => false),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 250);
      })
    ]);
    return ok ? root : null;
  };

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const found = await Promise.all([...letters].map((letter) => probe(`${letter}:\\`)));
  return found.filter((root): root is string => Boolean(root));
}

export async function listLocalDirectory(path?: string): Promise<DirectoryListing> {
  const target = path ? resolveLocalPath(path) : homedir();
  await access(target, constants.R_OK);
  const dirents = await readdir(target, { withFileTypes: true });
  const entries = await Promise.all(
    dirents.map(async (dirent): Promise<FileEntry> => {
      const full = join(target, dirent.name);
      try {
        const info = await lstat(full);
        return {
          name: dirent.name,
          kind: info.isSymbolicLink() ? 'symlink' : info.isDirectory() ? 'directory' : 'file',
          size: info.size,
          modified: info.mtime.toISOString()
        };
      } catch {
        return {
          name: dirent.name,
          kind: dirent.isSymbolicLink() ? 'symlink' : dirent.isDirectory() ? 'directory' : 'file',
          size: 0
        };
      }
    })
  );
  return { path: target, entries: sortEntries(entries) };
}

/**
 * Index names under a root to a limited depth for voice navigation.
 * Skips permission errors; caps total hits so huge trees stay snappy.
 */
export async function searchLocalShallow(
  path: string,
  maxDepth = 2,
  limit = 800
): Promise<SearchHit[]> {
  const root = resolveLocalPath(path);
  const depthCap = Math.max(0, Math.min(4, Math.floor(maxDepth)));
  const hits: SearchHit[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (hits.length >= limit || depth > depthCap) return;
    let dirents;
    try {
      dirents = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const dirent of dirents) {
      if (hits.length >= limit) return;
      if (dirent.name === '.' || dirent.name === '..') continue;
      const full = join(dir, dirent.name);
      let kind: FileEntry['kind'] = dirent.isDirectory()
        ? 'directory'
        : dirent.isSymbolicLink()
          ? 'symlink'
          : 'file';
      try {
        const info = await lstat(full);
        kind = info.isSymbolicLink() ? 'symlink' : info.isDirectory() ? 'directory' : 'file';
      } catch {
        /* keep dirent kind */
      }
      hits.push({
        path: full,
        name: dirent.name,
        kind,
        relative: relative(root, full) || dirent.name
      });
      if ((kind === 'directory' || kind === 'symlink') && depth < depthCap) {
        await walk(full, depth + 1);
      }
    }
  }

  await walk(root, 0);
  return hits;
}

export async function createLocalDirectory(path: string): Promise<void> {
  const target = resolveLocalPath(path);
  assertEntryName(basename(target), process.platform);
  await mkdir(target);
}

/** File templates for the "New File" dialog. */
export const FILE_TEMPLATES: Record<string, { ext: string; content: string }> = {
  'Text Document': { ext: '.txt', content: '' },
  'Markdown': { ext: '.md', content: '# New Document\n\n' },
  'JSON': { ext: '.json', content: '{\n  \n}\n' },
  'JavaScript': { ext: '.js', content: '// New JavaScript file\n' },
  'TypeScript': { ext: '.ts', content: '// New TypeScript file\n' },
  'HTML': { ext: '.html', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>New Document</title>\n</head>\n<body>\n  \n</body>\n</html>\n' },
  'CSS': { ext: '.css', content: '/* New stylesheet */\n' },
  'Python': { ext: '.py', content: '#!/usr/bin/env python3\n# New Python file\n' },
  'Shell Script': { ext: '.sh', content: '#!/bin/bash\n# New shell script\n' },
  'XML': { ext: '.xml', content: '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  \n</root>\n' }
};

export async function createLocalFile(path: string, content: string = ''): Promise<void> {
  const target = resolveLocalPath(path);
  assertEntryName(basename(target), process.platform);
  // Check if file already exists
  const exists = await access(target, constants.F_OK)
    .then(() => true)
    .catch(() => false);
  if (exists) throw new Error('A file with that name already exists here.');
  await writeFile(target, content, 'utf8');
}

/** Rename within the same folder. Moving elsewhere goes through moveLocalEntry. */
export async function renameLocalEntry(from: string, to: string): Promise<void> {
  const source = resolveLocalPath(from);
  const destination = resolveLocalPath(to);
  if (!samePath(dirname(source), dirname(destination))) {
    throw new Error('Rename can only change the name; use move to change folder.');
  }
  assertEntryName(basename(destination), process.platform);
  if (source === destination) return;
  // On a case-insensitive disk, "readme.md" → "README.md" finds the source
  // itself at the destination; that is not a clash.
  if (!samePath(source, destination)) {
    const clash = await lstat(destination).then(
      () => true,
      () => false
    );
    if (clash) throw new Error('Something with that name already exists here.');
  }
  await rename(source, destination);
}

export async function removeLocalEntry(path: string, kind: FileEntry['kind']): Promise<void> {
  const target = resolveLocalPath(path);
  if (samePath(target, resolve(homedir()))) throw new Error('Refusing to delete the home directory.');
  if (kind === 'directory') await rmdir(target);
  else await rm(target, { force: false });
}

async function uniqueDestination(toDir: string, name: string): Promise<string> {
  const destDir = resolveLocalPath(toDir);
  let candidate = join(destDir, name);
  if (
    !(await lstat(candidate).then(
      () => true,
      () => false
    ))
  ) {
    return candidate;
  }
  const stem = name.replace(/(\.[^.]+)?$/, '');
  const ext = name.slice(stem.length);
  for (let i = 1; i < 1000; i += 1) {
    candidate = join(destDir, `${stem} (${i})${ext}`);
    const exists = await lstat(candidate).then(
      () => true,
      () => false
    );
    if (!exists) return candidate;
  }
  throw new Error('Could not find a free name for the copy.');
}

/** Copy a file or directory into toDir; returns the new absolute path. */
export async function copyLocalEntry(from: string, toDir: string): Promise<string> {
  const source = resolveLocalPath(from);
  const name = basename(source);
  const targetDir = resolveLocalPath(toDir);
  if (samePath(targetDir, source) || isInside(targetDir, source)) {
    throw new Error('Cannot copy a folder into itself.');
  }
  const destination = await uniqueDestination(targetDir, name);
  await cp(source, destination, { recursive: true, errorOnExist: true, force: false });
  return destination;
}

/**
 * Move into another directory; returns the new absolute path.
 *
 * A rename cannot cross volumes (C: → D:, a network share), so on EXDEV the
 * entry is copied and the original removed only once the copy has succeeded.
 */
export async function moveLocalEntry(from: string, toDir: string): Promise<string> {
  const source = resolveLocalPath(from);
  const name = basename(source);
  const targetDir = resolveLocalPath(toDir);
  if (samePath(targetDir, source) || isInside(targetDir, source)) {
    throw new Error('Cannot move a folder into itself.');
  }
  const destination = await uniqueDestination(targetDir, name);
  try {
    await rename(source, destination);
    return destination;
  } catch (error) {
    if (errorCode(error) !== 'EXDEV') throw error;
  }

  await cp(source, destination, {
    recursive: true,
    errorOnExist: true,
    force: false,
    preserveTimestamps: true
  });
  try {
    await rm(source, { recursive: true, force: false });
  } catch (error) {
    // Already gone (removed by something else): the move still completed.
    if (errorCode(error) === 'ENOENT') return destination;
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Copied to ${destination}, but the original could not be removed: ${reason}`);
  }
  return destination;
}
