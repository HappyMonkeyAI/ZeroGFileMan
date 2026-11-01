import { describe, expect, it } from 'vitest';
import { nextSortState, sortEntriesBy } from '../src/shared/listing-sort.js';
import type { FileEntry } from '../src/shared/types.js';

const sample: FileEntry[] = [
  { name: 'z.txt', kind: 'file', size: 30, modified: '2024-01-03T00:00:00.000Z' },
  { name: 'docs', kind: 'directory', size: 0, modified: '2024-01-01T00:00:00.000Z' },
  { name: 'a.txt', kind: 'file', size: 10, modified: '2024-01-02T00:00:00.000Z' },
  { name: 'b.txt', kind: 'file', size: 20, modified: '2024-01-04T00:00:00.000Z' }
];

describe('listing sort', () => {
  it('keeps directories first when sorting by name', () => {
    expect(sortEntriesBy(sample, 'name', 'asc').map((e) => e.name)).toEqual([
      'docs',
      'a.txt',
      'b.txt',
      'z.txt'
    ]);
  });

  it('sorts files by size while folders stay first', () => {
    expect(sortEntriesBy(sample, 'size', 'desc').map((e) => e.name)).toEqual([
      'docs',
      'z.txt',
      'b.txt',
      'a.txt'
    ]);
  });

  it('sorts by modified ascending', () => {
    expect(sortEntriesBy(sample, 'modified', 'asc').map((e) => e.name)).toEqual([
      'docs',
      'a.txt',
      'z.txt',
      'b.txt'
    ]);
  });

  it('cycles sort direction on the same key', () => {
    expect(nextSortState('name', 'asc', 'name')).toEqual({ sortKey: 'name', sortDir: 'desc' });
    expect(nextSortState('name', 'desc', 'size')).toEqual({ sortKey: 'size', sortDir: 'asc' });
  });
});
