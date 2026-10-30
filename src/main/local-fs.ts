import { constants } from 'node:fs';
import { access, cp, lstat, mkdir, readdir, rename, rm, rmdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';
import type { DirectoryListing, FileEntry, SearchHit } from '../shared/types.js';
import { sortEntries } from '../shared/files.js';

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
  await mkdir(resolveLocalPath(path));
}

export async function renameLocalEntry(from: string, to: string): Promise<void> {
  const source = resolveLocalPath(from);
  const destination = resolveLocalPath(to);
  const clash = await lstat(destination).then(
    () => true,
    () => false
  );
  if (clash) throw new Error('Something with that name already exists here.');
  await rename(source, destination);
}

export async function removeLocalEntry(path: string, kind: FileEntry['kind']): Promise<void> {
  const target = resolveLocalPath(path);
  if (target === resolve(homedir())) throw new Error('Refusing to delete the home directory.');
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
  const destination = await uniqueDestination(toDir, name);
  if (resolve(dirname(destination)) === source || destination.startsWith(source + sep)) {
    throw new Error('Cannot copy a folder into itself.');
  }
  await cp(source, destination, { recursive: true, errorOnExist: true, force: false });
  return destination;
}

/** Move (rename into another directory); returns the new absolute path. */
export async function moveLocalEntry(from: string, toDir: string): Promise<string> {
  const source = resolveLocalPath(from);
  const name = basename(source);
  const destination = await uniqueDestination(toDir, name);
  if (resolve(toDir) === source || destination.startsWith(source + sep)) {
    throw new Error('Cannot move a folder into itself.');
  }
  await rename(source, destination);
  return destination;
}
