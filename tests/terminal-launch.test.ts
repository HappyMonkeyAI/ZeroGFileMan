import { beforeEach, describe, expect, it, vi } from 'vitest';

const spawned: Array<{ command: string; args: readonly string[]; cwd?: string }> = [];

vi.mock('../src/main/safe-spawn.js', () => ({
  spawnDetached: (command: string, args: readonly string[], options: { cwd?: string } = {}) => {
    spawned.push({ command, args, cwd: options.cwd });
  }
}));
// Pretend nothing is installed, so the launcher reaches its PATH fallbacks.
vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
  existsSync: () => false
}));

const { openTerminalForPath } = await import('../src/main/terminal-launch.js');

const DIR = process.platform === 'win32' ? 'C:\\My Projects\\a&b' : '/home/me/My Projects/a&b';

describe('openTerminalForPath', () => {
  beforeEach(() => {
    spawned.length = 0;
  });

  it('keeps a custom-command path as one argument', () => {
    openTerminalForPath({ path: DIR, launcher: 'custom', customCommand: 'wt.exe -d {path}' });
    expect(spawned).toEqual([{ command: 'wt.exe', args: ['-d', DIR], cwd: DIR }]);
  });

  it('passes the ZeroG Term CLI fallback the path as one argument', () => {
    openTerminalForPath({ path: DIR, launcher: 'zerogterm' });
    expect(spawned).toHaveLength(1);
    expect(spawned[0].args).toEqual(['--cwd', DIR]);
  });

  it('rejects relative paths before launching anything', () => {
    expect(() =>
      openTerminalForPath({ path: 'relative/dir', launcher: 'custom', customCommand: 'x' })
    ).toThrow(/absolute/);
    expect(spawned).toEqual([]);
  });
});
