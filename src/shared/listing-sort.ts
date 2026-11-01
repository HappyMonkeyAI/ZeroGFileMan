import type { FileEntry } from './types.js';

export type ListingSortKey = 'name' | 'size' | 'modified';
export type ListingSortDir = 'asc' | 'desc';

export const LISTING_SORT_KEYS: ListingSortKey[] = ['name', 'size', 'modified'];

export const DEFAULT_SORT_KEY: ListingSortKey = 'name';
export const DEFAULT_SORT_DIR: ListingSortDir = 'asc';

export function isListingSortKey(value: unknown): value is ListingSortKey {
  return typeof value === 'string' && (LISTING_SORT_KEYS as string[]).includes(value);
}

export function isListingSortDir(value: unknown): value is ListingSortDir {
  return value === 'asc' || value === 'desc';
}

function folderRank(entry: FileEntry): number {
  return entry.kind === 'directory' || entry.kind === 'symlink' ? 0 : 1;
}

function compareName(a: FileEntry, b: FileEntry): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

function compareSize(a: FileEntry, b: FileEntry): number {
  return a.size - b.size;
}

function compareModified(a: FileEntry, b: FileEntry): number {
  const am = a.modified ?? '';
  const bm = b.modified ?? '';
  if (am === bm) return 0;
  return am < bm ? -1 : 1;
}

/** Directories first, then by key/dir. Name is the tie-breaker. */
export function sortEntriesBy(
  entries: FileEntry[],
  key: ListingSortKey = DEFAULT_SORT_KEY,
  dir: ListingSortDir = DEFAULT_SORT_DIR
): FileEntry[] {
  const sign = dir === 'asc' ? 1 : -1;
  const compare =
    key === 'size' ? compareSize : key === 'modified' ? compareModified : compareName;
  return [...entries].sort((a, b) => {
    const rank = folderRank(a) - folderRank(b);
    if (rank !== 0) return rank;
    const primary = compare(a, b);
    if (primary !== 0) return primary * sign;
    return compareName(a, b) * sign;
  });
}

/** Click cycle: same key flips direction; new key starts asc. */
export function nextSortState(
  currentKey: ListingSortKey,
  currentDir: ListingSortDir,
  clicked: ListingSortKey
): { sortKey: ListingSortKey; sortDir: ListingSortDir } {
  if (clicked === currentKey) {
    return { sortKey: currentKey, sortDir: currentDir === 'asc' ? 'desc' : 'asc' };
  }
  return { sortKey: clicked, sortDir: 'asc' };
}
