// Drag-and-drop planning for moving/copying entries between panes and
// folders. Pure path logic only; the actual work goes through the same
// copyLocalEntry/moveLocalEntry IPC that F5/F6 use.

import { isWindowsPath, parentLocal } from './files.js';

export const DRAG_MIME = 'application/x-zerog-fileman';

export type DropMode = 'copy' | 'move';

export type DropMods = { ctrl: boolean; shift: boolean };

export type PlannedDrop = { path: string; mode: DropMode };

export function encodeDragPayload(paths: string[]): string {
  return JSON.stringify({ paths });
}

export function decodeDragPayload(raw: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const paths = (parsed as { paths?: unknown }).paths;
    if (!Array.isArray(paths) || !paths.length) return null;
    if (!paths.every((p) => typeof p === 'string' && p.length > 0)) return null;
    return paths as string[];
  } catch {
    return null;
  }
}

function normalize(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, '') || path;
  return isWindowsPath(path) ? trimmed.toLowerCase() : trimmed;
}

export function sameLocation(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

/** Is `child` strictly inside `parent`? */
export function isInsideLocation(child: string, parent: string): boolean {
  const c = normalize(child);
  const p = normalize(parent);
  if (c === p) return false;
  const prefix = p.endsWith('/') || p.endsWith('\\') ? p : `${p}${isWindowsPath(parent) ? '\\' : '/'}`;
  return c.startsWith(prefix);
}

/** Volume key for Explorer's same-drive rule; POSIX volumes are unknown (''). */
function volumeKey(path: string): string {
  const drive = /^([A-Za-z]):/.exec(path);
  if (drive) return drive[1]!.toLowerCase();
  const unc = /^\\\\([^\\/]+)[\\/]([^\\/]+)/.exec(path);
  if (unc) return `\\\\${unc[1]!.toLowerCase()}\\${unc[2]!.toLowerCase()}`;
  return '';
}

/** Ctrl forces copy, Shift forces move; otherwise move within a volume, copy across. */
export function dropMode(mods: DropMods, sourcePath: string, targetDir: string): DropMode {
  if (mods.ctrl) return 'copy';
  if (mods.shift) return 'move';
  const from = volumeKey(sourcePath);
  const to = volumeKey(targetDir);
  if (from && to && from !== to) return 'copy';
  return 'move';
}

/**
 * Decide what a drop does. Skips no-ops (move onto its own folder) and
 * impossible drops (a folder onto itself or its own descendant); copying
 * into the same folder stays allowed and gets a "(n)" name from main.
 */
export function planDrop(
  paths: string[],
  targetDir: string,
  mods: DropMods
): { items: PlannedDrop[]; skipped: number } {
  const items: PlannedDrop[] = [];
  let skipped = 0;
  for (const path of paths) {
    if (sameLocation(path, targetDir) || isInsideLocation(targetDir, path)) {
      skipped += 1;
      continue;
    }
    const mode = dropMode(mods, path, targetDir);
    if (mode === 'move' && sameLocation(parentLocal(path), targetDir)) {
      skipped += 1;
      continue;
    }
    items.push({ path, mode });
  }
  return { items, skipped };
}
