/** Pure favorites list helpers (persist shape shared with main). */

import { isWindowsPath } from './files.js';

export type Favorite = {
  path: string;
  label: string;
};

const MAX_FAVORITES = 24;

// Case-insensitive only where the filesystem is (Windows); POSIX paths that
// differ by case are distinct directories.
function pathKey(path: string): string {
  return isWindowsPath(path) ? path.toLowerCase() : path;
}

export function defaultLabelForPath(path: string, home: string): string {
  const norm = path.replace(/[/\\]+$/, '');
  const homeNorm = home.replace(/[/\\]+$/, '');
  if (pathKey(norm) === pathKey(homeNorm)) return 'Home';
  const base = norm.split(/[/\\]/).filter(Boolean).pop() ?? norm;
  if (/^documents$/i.test(base)) return 'Documents';
  if (/^development$/i.test(base)) return 'development';
  return base;
}

export function normalizeFavorites(input: unknown, max = MAX_FAVORITES): Favorite[] {
  if (!Array.isArray(input)) return [];
  const out: Favorite[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const path = typeof (raw as Favorite).path === 'string' ? (raw as Favorite).path.trim() : '';
    if (!path || seen.has(pathKey(path))) continue;
    const label =
      typeof (raw as Favorite).label === 'string' && (raw as Favorite).label.trim()
        ? (raw as Favorite).label.trim()
        : path.split(/[/\\]/).filter(Boolean).pop() ?? path;
    seen.add(pathKey(path));
    out.push({ path, label });
    if (out.length >= max) break;
  }
  return out;
}

export function upsertFavorite(list: Favorite[], path: string, label: string, max = MAX_FAVORITES): Favorite[] {
  const next = list.filter((f) => pathKey(f.path) !== pathKey(path));
  next.unshift({ path, label });
  return next.slice(0, max);
}

export function removeFavoritePath(list: Favorite[], path: string): Favorite[] {
  return list.filter((f) => pathKey(f.path) !== pathKey(path));
}

export function renameFavoritePath(list: Favorite[], path: string, label: string): Favorite[] {
  const nextLabel = label.trim();
  if (!nextLabel) return list;
  return list.map((favorite) =>
    pathKey(favorite.path) === pathKey(path) ? { ...favorite, label: nextLabel } : favorite
  );
}

export function isFavoritePath(list: Favorite[], path: string): boolean {
  return list.some((f) => pathKey(f.path) === pathKey(path));
}
