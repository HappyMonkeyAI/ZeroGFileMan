import { describe, expect, it } from 'vitest';
import {
  defaultLabelForPath,
  isFavoritePath,
  normalizeFavorites,
  removeFavoritePath,
  renameFavoritePath,
  upsertFavorite
} from '../src/shared/favorites.js';

describe('favorites', () => {
  it('normalizes and dedupes paths case-insensitively', () => {
    const list = normalizeFavorites([
      { path: 'C:\\Users\\a', label: 'Home' },
      { path: 'c:\\users\\a', label: 'Dup' },
      { path: 'C:\\Users\\a\\Documents', label: '' },
      null,
      { path: '' }
    ]);
    expect(list).toEqual([
      { path: 'C:\\Users\\a', label: 'Home' },
      { path: 'C:\\Users\\a\\Documents', label: 'Documents' }
    ]);
  });

  it('upserts to front and caps length', () => {
    let list = upsertFavorite([], 'C:\\a', 'A', 2);
    list = upsertFavorite(list, 'C:\\b', 'B', 2);
    list = upsertFavorite(list, 'C:\\c', 'C', 2);
    expect(list).toEqual([
      { path: 'C:\\c', label: 'C' },
      { path: 'C:\\b', label: 'B' }
    ]);
    list = upsertFavorite(list, 'C:\\b', 'Bee', 2);
    expect(list[0]).toEqual({ path: 'C:\\b', label: 'Bee' });
  });

  it('removes and detects membership', () => {
    const list = [
      { path: 'C:\\a', label: 'A' },
      { path: 'C:\\b', label: 'B' }
    ];
    expect(isFavoritePath(list, 'c:\\a')).toBe(true);
    expect(removeFavoritePath(list, 'C:\\a')).toEqual([{ path: 'C:\\b', label: 'B' }]);
  });

  it('renames without reordering and ignores blank labels', () => {
    const list = [
      { path: 'C:\\a', label: 'A' },
      { path: 'C:\\b', label: 'B' }
    ];
    expect(renameFavoritePath(list, 'c:\\B', 'Bee')).toEqual([
      list[0],
      { path: 'C:\\b', label: 'Bee' }
    ]);
    expect(renameFavoritePath(list, 'C:\\a', '  ')).toEqual(list);
  });

  it('labels Home / Documents / development', () => {
    expect(defaultLabelForPath('C:\\Users\\steph', 'C:\\Users\\steph')).toBe('Home');
    expect(defaultLabelForPath('C:\\Users\\steph\\Documents', 'C:\\Users\\steph')).toBe('Documents');
    expect(defaultLabelForPath('C:\\Users\\steph\\Documents\\development', 'C:\\Users\\steph')).toBe(
      'development'
    );
  });

  it('keeps POSIX paths that differ only by case distinct', () => {
    const list = upsertFavorite([], '/home/user/docs', 'lower');
    const both = upsertFavorite(list, '/home/user/Docs', 'upper');
    expect(both.map((f) => f.path)).toEqual(['/home/user/Docs', '/home/user/docs']);
    expect(isFavoritePath(both, '/home/user/DOCS')).toBe(false);
    expect(removeFavoritePath(both, '/home/user/docs').map((f) => f.path)).toEqual(['/home/user/Docs']);
    const renamed = renameFavoritePath(both, '/home/user/Docs', 'renamed');
    expect(renamed.find((f) => f.path === '/home/user/Docs')?.label).toBe('renamed');
    expect(renamed.find((f) => f.path === '/home/user/docs')?.label).toBe('lower');
    const deduped = normalizeFavorites([
      { path: '/home/user/docs', label: 'a' },
      { path: '/home/user/Docs', label: 'b' }
    ]);
    expect(deduped).toHaveLength(2);
  });

  it('still dedupes Windows paths case-insensitively', () => {
    const list = upsertFavorite([], 'C:\\Docs', 'first');
    const next = upsertFavorite(list, 'c:\\docs', 'second');
    expect(next).toHaveLength(1);
    expect(next[0].label).toBe('second');
    expect(isFavoritePath(next, 'C:\\DOCS')).toBe(true);
    expect(defaultLabelForPath('c:\\users\\steph', 'C:\\Users\\steph')).toBe('Home');
  });
});
