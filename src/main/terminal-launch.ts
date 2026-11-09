import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { expandCustomTerminalCommand, type TerminalLauncher } from '../shared/terminal-launcher.js';
import { resolveLocalPath } from './local-fs.js';
import { spawnDetached } from './safe-spawn.js';

export type OpenTerminalRequest = {
  path: unknown;
  launcher?: unknown;
  customCommand?: unknown;
};

/** Cold-start fallback for ZeroG Term: the directory also travels in the child env. */
function cwdEnv(absolutePath: string): Record<string, string> {
  return { ZEROG_OPEN_CWD: absolutePath };
}

export function openSystemTerminal(absolutePath: string): void {
  if (process.platform === 'win32') {
    // Without Windows Terminal, PowerShell starts in the directory via cwd, so
    // the path is never part of a command line.
    spawnDetached('wt.exe', ['-d', absolutePath], {
      onError: () => spawnDetached('powershell.exe', ['-NoExit'], { cwd: absolutePath })
    });
    return;
  }
  if (process.platform === 'darwin') {
    spawnDetached('open', ['-a', 'Terminal', absolutePath]);
    return;
  }
  spawnDetached('x-terminal-emulator', ['--working-directory', absolutePath], { cwd: absolutePath });
}

function packagedZeroGTermPaths(): string[] {
  const home = homedir();
  const localApp = process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local');
  const exeName = 'ZeroG Terminal.exe';
  return [
    join(localApp, 'Programs', 'ZeroG Terminal', exeName),
    join(localApp, 'Programs', 'zerogterm', exeName),
    join(home, 'AppData', 'Local', 'Programs', 'ZeroG Terminal', exeName)
  ];
}

/** Launch ZeroG Term; prefers an installed exe, then a local checkout, then PATH CLI. */
export function openZeroGTerm(absolutePath: string): void {
  // Prefer --cwd so a running Term (single-instance) receives the path on argv;
  // ZEROG_OPEN_CWD remains as a cold-start fallback in the child env.
  const cwdArgs = ['--cwd', absolutePath];
  for (const exe of packagedZeroGTermPaths()) {
    if (existsSync(exe)) {
      spawnDetached(exe, cwdArgs, { cwd: absolutePath, env: cwdEnv(absolutePath) });
      return;
    }
  }

  const devRoot = join(homedir(), 'Documents', 'development', 'zerogterm');
  if (existsSync(join(devRoot, 'package.json'))) {
    const electronCmd = process.platform === 'win32' ? 'electron.cmd' : 'electron';
    spawnDetached(electronCmd, ['.', ...cwdArgs], { cwd: devRoot, env: cwdEnv(absolutePath) });
    return;
  }

  const cli = process.platform === 'win32' ? 'zerogterm.cmd' : 'zerogterm';
  spawnDetached(cli, cwdArgs, { cwd: absolutePath, env: cwdEnv(absolutePath) });
}

export function openCustomTerminal(absolutePath: string, customCommand: string): void {
  const [command, ...args] = expandCustomTerminalCommand(customCommand, absolutePath);
  spawnDetached(command, args, { cwd: absolutePath, env: cwdEnv(absolutePath) });
}

export function openTerminalForPath(request: OpenTerminalRequest): void {
  const target = resolveLocalPath(request.path);
  const launcher = (
    typeof request.launcher === 'string' ? request.launcher.trim().toLowerCase() : 'system'
  ) as TerminalLauncher;
  const custom = typeof request.customCommand === 'string' ? request.customCommand.trim() : '';

  if (launcher === 'zerogterm') {
    openZeroGTerm(target);
    return;
  }
  if (launcher === 'custom') {
    openCustomTerminal(target, custom);
    return;
  }
  openSystemTerminal(target);
}
