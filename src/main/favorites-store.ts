import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import {
  defaultLabelForPath,
  normalizeFavorites,
  removeFavoritePath,
  upsertFavorite,
  type Favorite
} from '../shared/favorites.js';
import { localHome, resolveLocalPath } from './local-fs.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function storeFile(): string {
  return join(app.getPath('userData'), 'favorites.json');
}

async function readStore(): Promise<Favorite[] | null> {
  try {
    const raw = JSON.parse(await readFile(storeFile(), 'utf8')) as unknown;
    return normalizeFavorites(raw);
  } catch {
    return null;
  }
}

async function writeStore(items: Favorite[]): Promise<Favorite[]> {
  const normalized = normalizeFavorites(items);
  const dir = app.getPath('userData');
  await mkdir(dir, { recursive: true });
  await writeFile(storeFile(), JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

async function seedDefaults(): Promise<Favorite[]> {
  const home = localHome();
  const candidates = [
    home,
    join(home, 'Documents'),
    join(home, 'Documents', 'development')
  ];
  const seeded: Favorite[] = [];
  for (const path of candidates) {
    if (!(await pathExists(path))) continue;
    seeded.push({ path, label: defaultLabelForPath(path, home) });
  }
  return writeStore(seeded.length ? seeded : [{ path: home, label: 'Home' }]);
}

export async function listFavorites(): Promise<Favorite[]> {
  const existing = await readStore();
  // null = missing file → seed; [] = user cleared all → keep empty
  if (existing) return existing;
  return seedDefaults();
}

export async function addFavorite(path: unknown, label?: unknown): Promise<Favorite[]> {
  const resolved = resolveLocalPath(path);
  if (!(await pathExists(resolved))) {
    throw new Error('Favorite path does not exist.');
  }
  const home = localHome();
  const labelText =
    typeof label === 'string' && label.trim()
      ? label.trim()
      : defaultLabelForPath(resolved, home);
  const current = await listFavorites();
  return writeStore(upsertFavorite(current, resolved, labelText));
}

export async function removeFavorite(path: unknown): Promise<Favorite[]> {
  const resolved = resolveLocalPath(path);
  const current = await listFavorites();
  return writeStore(removeFavoritePath(current, resolved));
}
