import type { FileEntry } from './types.js';

export function sortEntries(entries: FileEntry[]): FileEntry[] {
  return [...entries].sort((a, b) => {
    const rank = (entry: FileEntry) => (entry.kind === 'directory' ? 0 : 1);
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

export function isHiddenName(name: string): boolean {
  return name.startsWith('.');
}

export function isWindowsPath(path: string): boolean {
  return /^[A-Za-z]:/.test(path) || path.startsWith('\\\\') || path.includes('\\');
}

export function joinLocal(dir: string, name: string): string {
  const separator = isWindowsPath(dir) ? '\\' : '/';
  const base = dir.replace(/[\\/]+$/, '');
  return `${base}${separator}${name}`;
}

export function parentLocal(path: string): string {
  const windows = isWindowsPath(path);
  const trimmed = path.replace(/[\\/]+$/, '');
  const cut = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  if (cut < 0) return path;
  if (!windows) return cut === 0 ? '/' : trimmed.slice(0, cut);
  const head = trimmed.slice(0, cut);
  return /^[A-Za-z]:$/.test(head) ? `${head}\\` : head || '\\';
}

export function baseName(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

/** Breadcrumb segments for a local absolute path (clickable ancestors). */
export function breadcrumbSegments(path: string): { label: string; path: string }[] {
  const windows = isWindowsPath(path);
  const sep = windows ? '\\' : '/';
  const normalized = path.replace(/[\\/]+$/, '') || path;
  const parts = normalized.split(/[\\/]/).filter(Boolean);
  if (!parts.length) return [{ label: path, path }];

  const segments: { label: string; path: string }[] = [];
  if (windows && /^[A-Za-z]:$/.test(parts[0])) {
    let current = `${parts[0]}\\`;
    segments.push({ label: parts[0], path: current });
    for (let i = 1; i < parts.length; i += 1) {
      current = joinLocal(current, parts[i]);
      segments.push({ label: parts[i], path: current });
    }
    return segments;
  }

  if (!windows) {
    let current = '/';
    segments.push({ label: '/', path: '/' });
    for (const part of parts) {
      current = current === '/' ? `/${part}` : `${current}${sep}${part}`;
      segments.push({ label: part, path: current });
    }
    return segments;
  }

  let current = '';
  for (const part of parts) {
    current = current ? joinLocal(current, part) : part;
    segments.push({ label: part, path: current });
  }
  return segments;
}

export function formatSize(entry: FileEntry): string {
  if (entry.kind === 'directory') return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = entry.size;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

export function formatModified(value?: string): string {
  if (!value) return '';
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!iso) return value;
  const [, year, month, day, hour, minute] = iso;
  return `${year}-${month}-${day} ${hour}:${minute}`;
}
