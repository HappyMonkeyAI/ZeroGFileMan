/** Pure favorites list helpers (persist shape shared with main). */

export type Favorite = {
  path: string;
  label: string;
};

const MAX_FAVORITES = 24;

export function defaultLabelForPath(path: string, home: string): string {
  const norm = path.replace(/[/\\]+$/, '');
  const homeNorm = home.replace(/[/\\]+$/, '');
  if (norm.toLowerCase() === homeNorm.toLowerCase()) return 'Home';
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
    if (!path || seen.has(path.toLowerCase())) continue;
    const label =
      typeof (raw as Favorite).label === 'string' && (raw as Favorite).label.trim()
        ? (raw as Favorite).label.trim()
        : path.split(/[/\\]/).filter(Boolean).pop() ?? path;
    seen.add(path.toLowerCase());
    out.push({ path, label });
    if (out.length >= max) break;
  }
  return out;
}

export function upsertFavorite(list: Favorite[], path: string, label: string, max = MAX_FAVORITES): Favorite[] {
  const next = list.filter((f) => f.path.toLowerCase() !== path.toLowerCase());
  next.unshift({ path, label });
  return next.slice(0, max);
}

export function removeFavoritePath(list: Favorite[], path: string): Favorite[] {
  return list.filter((f) => f.path.toLowerCase() !== path.toLowerCase());
}

export function isFavoritePath(list: Favorite[], path: string): boolean {
  return list.some((f) => f.path.toLowerCase() === path.toLowerCase());
}
