import { describe, expect, it } from 'vitest';
import {
  expandCustomTerminalCommand,
  parseTerminalPrefs,
  splitCommandLine
} from '../src/shared/terminal-launcher.js';

describe('terminal-launcher', () => {
  it('parses prefs with fallbacks', () => {
    expect(parseTerminalPrefs(null)).toEqual({ launcher: 'system', customCommand: '' });
    expect(parseTerminalPrefs({ launcher: 'zerogterm', customCommand: ' wt -d {path} ' })).toEqual({
      launcher: 'zerogterm',
      customCommand: 'wt -d {path}'
    });
  });

  it('splits quoted command lines', () => {
    expect(splitCommandLine('wt.exe -d "C:\\My Dir"')).toEqual(['wt.exe', '-d', 'C:\\My Dir']);
  });

  it('expands {path} or appends the directory', () => {
    expect(expandCustomTerminalCommand('wt.exe -d {path}', 'C:\\work')).toEqual([
      'wt.exe',
      '-d',
      'C:\\work'
    ]);
    expect(expandCustomTerminalCommand('"C:\\Apps\\Term.exe"', 'C:\\work')).toEqual([
      'C:\\Apps\\Term.exe',
      'C:\\work'
    ]);
  });

  it('keeps a substituted path as a single argument', () => {
    expect(expandCustomTerminalCommand('wt.exe -d {path}', 'C:\\My Projects\\a&b')).toEqual([
      'wt.exe',
      '-d',
      'C:\\My Projects\\a&b'
    ]);
    expect(expandCustomTerminalCommand('term --dir={path} --new', 'C:\\My Dir')).toEqual([
      'term',
      '--dir=C:\\My Dir',
      '--new'
    ]);
  });
});
