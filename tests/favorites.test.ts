import { describe, expect, it } from 'vitest';
import {
  defaultLabelForPath,
  isFavoritePath,
  normalizeFavorites,
  removeFavoritePath,
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

  it('labels Home / Documents / development', () => {
    expect(defaultLabelForPath('C:\\Users\\steph', 'C:\\Users\\steph')).toBe('Home');
    expect(defaultLabelForPath('C:\\Users\\steph\\Documents', 'C:\\Users\\steph')).toBe('Documents');
    expect(defaultLabelForPath('C:\\Users\\steph\\Documents\\development', 'C:\\Users\\steph')).toBe(
      'development'
    );
  });
});
