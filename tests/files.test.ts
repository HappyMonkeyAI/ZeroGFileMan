import { describe, expect, it } from 'vitest';
import { breadcrumbSegments, joinLocal, parentLocal, sortEntries } from '../src/shared/files.js';
import type { FileEntry } from '../src/shared/types.js';

describe('path helpers', () => {
  it('joins and parents Windows paths', () => {
    const joined = joinLocal('C:\\Users\\steph', 'Documents');
    expect(joined).toBe('C:\\Users\\steph\\Documents');
    expect(parentLocal(joined)).toBe('C:\\Users\\steph');
    expect(parentLocal('C:\\Users')).toBe('C:\\');
  });

  it('builds breadcrumbs', () => {
    const crumbs = breadcrumbSegments('C:\\Users\\steph\\Documents');
    expect(crumbs[0]).toEqual({ label: 'C:', path: 'C:\\' });
    expect(crumbs.at(-1)?.path).toBe('C:\\Users\\steph\\Documents');
  });

  it('sorts directories first', () => {
    const entries: FileEntry[] = [
      { name: 'b.txt', kind: 'file', size: 1 },
      { name: 'a', kind: 'directory', size: 0 }
    ];
    expect(sortEntries(entries).map((e) => e.name)).toEqual(['a', 'b.txt']);
  });
});
