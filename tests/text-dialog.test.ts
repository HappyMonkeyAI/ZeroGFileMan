import { describe, expect, it } from 'vitest';
import { resolveTextDialog, templateChoice } from '../src/shared/text-dialog.js';
import { entryNameProblem } from '../src/shared/entry-name.js';

describe('resolveTextDialog', () => {
  it('confirms the trimmed value', () => {
    expect(resolveTextDialog('  Reports  ')).toEqual({ kind: 'confirm', value: 'Reports' });
  });

  it('treats empty or whitespace input as cancel', () => {
    expect(resolveTextDialog('')).toEqual({ kind: 'cancel' });
    expect(resolveTextDialog('   ')).toEqual({ kind: 'cancel' });
  });

  it('keeps the dialog open with the validation problem', () => {
    const outcome = resolveTextDialog('a/b', (value) => entryNameProblem(value, 'win32'));
    expect(outcome).toEqual({ kind: 'invalid', problem: 'Names cannot contain / or \\.' });
  });

  it('validates the trimmed value, not the raw input', () => {
    const outcome = resolveTextDialog('  CON  ', (value) => entryNameProblem(value, 'win32'));
    expect(outcome).toEqual({ kind: 'invalid', problem: 'That name is reserved by Windows.' });
  });

  it('confirms when validation passes', () => {
    expect(resolveTextDialog('notes.txt', (value) => entryNameProblem(value, 'posix'))).toEqual({
      kind: 'confirm',
      value: 'notes.txt'
    });
  });
});

describe('templateChoice', () => {
  it('maps a 1-based choice to an index', () => {
    expect(templateChoice('1', 10)).toBe(0);
    expect(templateChoice(' 10 ', 10)).toBe(9);
  });

  it('rejects out-of-range and non-numeric input', () => {
    expect(templateChoice('0', 10)).toBeNull();
    expect(templateChoice('11', 10)).toBeNull();
    expect(templateChoice('abc', 10)).toBeNull();
    expect(templateChoice('2.5', 10)).toBeNull();
    expect(templateChoice('', 10)).toBeNull();
    expect(templateChoice('-1', 10)).toBeNull();
  });
});
