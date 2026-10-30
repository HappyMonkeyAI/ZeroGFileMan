import { describe, expect, it } from 'vitest';
import { fuzzyMatchEntries, fuzzyMatchHits, parseActionCommand } from '../src/shared/fuzzy-path.js';
import type { FileEntry, SearchHit } from '../src/shared/types.js';

const entries: FileEntry[] = [
  { name: 'Project One', kind: 'directory', size: 0 },
  { name: 'project-two', kind: 'directory', size: 0 },
  { name: 'readme.md', kind: 'file', size: 12 },
  { name: 'zerogfileman', kind: 'directory', size: 0 }
];

describe('fuzzyMatchEntries', () => {
  it('ranks exact and prefix matches highest', () => {
    const matches = fuzzyMatchEntries(entries, 'Project One');
    expect(matches[0]?.item.name).toBe('Project One');
    expect(matches[0]?.score).toBeGreaterThanOrEqual(90);
  });

  it('finds substring matches', () => {
    const matches = fuzzyMatchEntries(entries, 'fileman');
    expect(matches.some((m) => m.item.name === 'zerogfileman')).toBe(true);
  });
});

describe('fuzzyMatchHits', () => {
  it('matches nested relative paths', () => {
    const hits: SearchHit[] = [
      {
        path: 'C:\\dev\\zerogfileman\\src',
        name: 'src',
        kind: 'directory',
        relative: 'zerogfileman\\src'
      },
      {
        path: 'C:\\dev\\other',
        name: 'other',
        kind: 'directory',
        relative: 'other'
      }
    ];
    const matches = fuzzyMatchHits(hits, 'zerogfileman');
    expect(matches[0]?.item.name).toBe('src');
  });
});

describe('parseActionCommand', () => {
  it('detects copy path before generic copy', () => {
    expect(parseActionCommand('copy path')?.id).toBe('copy-path');
  });

  it('detects open in notepad', () => {
    expect(parseActionCommand('Open this in Notepad')?.id).toBe('open-notepad');
  });

  it('detects delete with confirm path', () => {
    expect(parseActionCommand('delete')?.id).toBe('delete');
  });

  it('detects terminal here', () => {
    expect(parseActionCommand('open terminal here')?.id).toBe('open-terminal');
  });

  it('returns unknown for free text', () => {
    expect(parseActionCommand('do a barrel roll')?.id).toBe('unknown');
  });
});
