import { describe, expect, it } from 'vitest';
import { assertEntryName, entryNameProblem } from '../src/shared/entry-name.js';

describe('entryNameProblem', () => {
  it('accepts ordinary names, including dots and unicode', () => {
    for (const name of ['notes.md', '.gitignore', 'Report (final) v2.docx', 'résumé', 'a&b', '100%']) {
      expect(entryNameProblem(name, 'win32')).toBeNull();
      expect(entryNameProblem(name, 'linux')).toBeNull();
    }
  });

  it('refuses anything that would escape the folder', () => {
    expect(entryNameProblem('..', 'linux')).toMatch(/reserved/);
    expect(entryNameProblem('.', 'linux')).toMatch(/reserved/);
    expect(entryNameProblem('..\\x', 'win32')).toMatch(/\/ or \\/);
    expect(entryNameProblem('a/b', 'linux')).toMatch(/\/ or \\/);
  });

  it('refuses empty, padded, control-character and overlong names', () => {
    expect(entryNameProblem('', 'linux')).toBe('Enter a name.');
    expect(entryNameProblem('   ', 'linux')).toBe('Enter a name.');
    expect(entryNameProblem(' x', 'linux')).toMatch(/space/);
    expect(entryNameProblem('a\u0007b', 'linux')).toMatch(/control/);
    expect(entryNameProblem('x'.repeat(256), 'linux')).toMatch(/255/);
  });

  it('applies Windows-only rules only on Windows', () => {
    expect(entryNameProblem('what?.txt', 'win32')).toMatch(/cannot contain/);
    expect(entryNameProblem('what?.txt', 'linux')).toBeNull();
    expect(entryNameProblem('draft.', 'win32')).toMatch(/dot/);
    expect(entryNameProblem('CON', 'win32')).toMatch(/reserved by Windows/);
    expect(entryNameProblem('nul.txt', 'win32')).toMatch(/reserved by Windows/);
    expect(entryNameProblem('console.log', 'win32')).toBeNull();
  });

  it('assertEntryName throws the same reason', () => {
    expect(() => assertEntryName('a/b', 'linux')).toThrow('Names cannot contain / or \\.');
    expect(() => assertEntryName('ok', 'linux')).not.toThrow();
  });
});
